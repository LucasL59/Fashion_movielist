/**
 * 儀表板狀態路由
 *
 * 提供前端儀表板所需的統計資訊
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getTaiwanMonthBoundary } from '../utils/timezone.js';

const router = express.Router();

/**
 * GET /api/dashboard/customer/:userId
 *
 * 提供客戶儀表板需要的最新批次與選擇狀態
 * 
 * 注意：現在使用 customer_current_list 表（累積清單）而非 selections 表（批次選擇）
 */
router.get('/customer/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 取得最新啟用中的批次
    const { data: latestBatch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (batchError && batchError.code !== 'PGRST116') {
      throw batchError;
    }

    let totalVideos = 0;
    let customerListCount = 0;

    if (latestBatch) {
      // 計算該批次的影片總數
      const { count, error: countError } = await supabase
        .from('videos')
        .select('*', { head: true, count: 'exact' })
        .eq('batch_id', latestBatch.id);

      if (countError) throw countError;
      totalVideos = count || 0;
    }

    // 查詢客戶當前的累積清單（不限批次）
    const { count: listCount, error: listError } = await supabase
      .from('customer_current_list')
      .select('*', { head: true, count: 'exact' })
      .eq('customer_id', userId);

    if (listError) throw listError;
    customerListCount = listCount || 0;

    // 查詢最後一次提交記錄（從 selection_history）
    const { data: lastSubmission, error: historyError } = await supabase
      .from('selection_history')
      .select('*')
      .eq('customer_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (historyError && historyError.code !== 'PGRST116') {
      throw historyError;
    }

    // hasSelection 表示客戶是否有累積清單
    const hasSelection = customerListCount > 0;
    
    // v3 架構：判斷是否有新批次需要客戶處理
    // 邏輯：只要有批次存在就顯示提示（因為上傳者可能會多次更新同月份清單）
    const hasNewBatch = Boolean(latestBatch);

    res.json({
      success: true,
      data: {
        latestBatch: latestBatch || null,
        totalVideos,
        hasSelection,
        selection: lastSubmission ? {
          video_ids: lastSubmission.video_ids || [],
          created_at: lastSubmission.snapshot_date,
          total_count: lastSubmission.total_count || 0,
        } : null,
        customerListCount,
        hasNewBatch,
      },
    });
  } catch (error) {
    console.error('取得客戶儀表板狀態失敗:', error);
    res.status(500).json({
      error: 'DashboardError',
      message: error.message || '無法取得儀表板狀態',
    });
  }
});

/**
 * GET /api/dashboard/admin/overview
 *
 * 提供管理員/上傳者需要的當月上傳與選擇概況
 * 支持按月份篩選客戶提交記錄（優先）或按批次 ID（向後兼容）
 */
router.get('/admin/overview', requireAuth, requireRoles(['admin', 'uploader']), async (req, res) => {
  try {
    const { batchId, month } = req.query; // month 格式: YYYY-MM

    // 取得所有批次列表供選單使用
    const { data: allBatches, error: allBatchesError } = await supabase
      .from('batches')
      .select('id, name, created_at, status')
      .order('created_at', { ascending: false });
      
    if (allBatchesError) throw allBatchesError;

    let targetBatch = null;

    if (batchId) {
      // 如果有指定 batchId，查詢該批次
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle();
      
      if (error) throw error;
      targetBatch = data;
    } else {
      // 否則找最新的 active 批次（預設行為）
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      targetBatch = data;
      
      // 如果沒有 active 批次，但有歷史批次，則取最新的歷史批次
      if (!targetBatch && allBatches?.length > 0) {
        targetBatch = allBatches[0];
      }
    }

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .order('created_at', { ascending: true });

    if (usersError) throw usersError;

    const customers = users.filter((user) => user.role === 'customer');
    let selectionDetails = [];
    let submittedCount = 0;
    let pendingCount = customers.length;
    let uploaderProfile = null;

    if (targetBatch?.uploader_id) {
      const { data: uploaderData, error: uploaderError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', targetBatch.uploader_id)
        .maybeSingle();

      if (uploaderError && uploaderError.code !== 'PGRST116') {
        throw uploaderError;
      }

      uploaderProfile = uploaderData || null;
    }

    // 如果有指定月份，按月份篩選提交記錄
    if (month) {
      console.log(`📅 按月份篩選: ${month}`);
      
      // 使用台灣時區（UTC+8）計算月份邊界
      const { start: monthStartUTC, end: monthEndUTC } = getTaiwanMonthBoundary(month);
      
      const { data: monthlySubmissions, error: monthlyError } = await supabase
        .from('selection_history')
        .select('customer_id, snapshot_date, total_count')
        .gte('snapshot_date', monthStartUTC)
        .lt('snapshot_date', monthEndUTC)
        .order('snapshot_date', { ascending: false });

      if (monthlyError) throw monthlyError;

      console.log(`📊 找到 ${monthlySubmissions?.length || 0} 筆 ${month} 的提交記錄`);

      // 為每個客戶找最後一次提交
      const customerSubmissionMap = new Map();
      (monthlySubmissions || []).forEach((record) => {
        if (!customerSubmissionMap.has(record.customer_id)) {
          customerSubmissionMap.set(record.customer_id, {
            submittedAt: record.snapshot_date,
            videoCount: record.total_count || 0
          });
        }
      });

      submittedCount = customerSubmissionMap.size;
      pendingCount = Math.max(customers.length - submittedCount, 0);

      selectionDetails = customers.map((customer) => {
        const submission = customerSubmissionMap.get(customer.id);
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: submission ? 'submitted' : 'pending',
          submittedAt: submission?.submittedAt || null,
          videoCount: submission?.videoCount || 0,
        };
      });
    } else if (targetBatch) {
      // 使用 customer_current_list 表（累積清單）而非 selections 表（按批次）
      const { data: currentListRows, error: listError } = await supabase
        .from('customer_current_list')
        .select('customer_id, video_id')
        .not('video_id', 'is', null);

      if (listError) throw listError;

      // 統計每個客戶的影片數量
      const customerVideoCount = new Map();
      (currentListRows || []).forEach((row) => {
        const count = customerVideoCount.get(row.customer_id) || 0;
        customerVideoCount.set(row.customer_id, count + 1);
      });

      // 查詢最後提交時間（從 selection_history）
      const { data: lastSubmissions, error: historyError } = await supabase
        .from('selection_history')
        .select('customer_id, snapshot_date')
        .order('snapshot_date', { ascending: false });

      if (historyError) throw historyError;

      const lastSubmissionMap = new Map();
      (lastSubmissions || []).forEach((row) => {
        if (!lastSubmissionMap.has(row.customer_id)) {
          lastSubmissionMap.set(row.customer_id, row.snapshot_date);
        }
      });

      submittedCount = customerVideoCount.size;
      pendingCount = Math.max(customers.length - submittedCount, 0);

      selectionDetails = customers.map((customer) => {
        const videoCount = customerVideoCount.get(customer.id) || 0;
        const lastSubmitted = lastSubmissionMap.get(customer.id);
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: videoCount > 0 ? 'submitted' : 'pending',
          submittedAt: lastSubmitted || null,
          videoCount: videoCount,
        };
      });
    }

    // 查詢所有有提交記錄的月份（用於前端月份選擇器）
    const { data: allSubmissions, error: allSubmissionsError } = await supabase
      .from('selection_history')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (allSubmissionsError) {
      console.error('⚠️ 查詢提交月份失敗:', allSubmissionsError);
    }

    // 提取唯一的月份列表（使用台灣時區歸類月份）
    // 手動計算 UTC+8 偏移後提取 YYYY-MM，不依賴 toLocaleString
    const TAIWAN_OFFSET = 8 * 60 * 60 * 1000;
    const availableMonths = [];
    const seenMonths = new Set();
    (allSubmissions || []).forEach((record) => {
      const utcDate = new Date(record.snapshot_date);
      const twDate = new Date(utcDate.getTime() + TAIWAN_OFFSET);
      const year = twDate.getUTCFullYear();
      const month = String(twDate.getUTCMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      if (!seenMonths.has(monthStr)) {
        seenMonths.add(monthStr);
        availableMonths.push(monthStr);
      }
    });

    console.log(`📅 可用月份: ${availableMonths.join(', ')}`);

    res.json({
      success: true,
      data: {
        latestBatch: targetBatch || null, // 前端欄位名稱維持 latestBatch 以減少修改，實際代表 currentSelectedBatch
        allBatches: allBatches || [],
        uploader: uploaderProfile,
        totalCustomers: customers.length,
        submittedCount,
        pendingCount,
        selectionDetails,
        availableMonths, // 新增：可用的月份列表
      },
    });
  } catch (error) {
    console.error('取得管理儀表板狀態失敗:', error);
    res.status(500).json({
      error: 'DashboardError',
      message: error.message || '無法取得儀表板概況',
    });
  }
});

export default router;


