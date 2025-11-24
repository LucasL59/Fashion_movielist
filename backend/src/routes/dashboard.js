/**
 * 儀表板狀態路由
 *
 * 提供前端儀表板所需的統計資訊
 */

import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/dashboard/customer/:userId
 *
 * 提供客戶儀表板需要的最新批次與選擇狀態
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

    let selection = null;
    let totalVideos = 0;

    if (latestBatch) {
      const { data: selectionData, error: selectionError } = await supabase
        .from('selections')
        .select('*')
        .eq('user_id', userId)
        .eq('batch_id', latestBatch.id)
        .maybeSingle();

      if (selectionError && selectionError.code !== 'PGRST116') {
        throw selectionError;
      }

      selection = selectionData || null;

      const { count, error: countError } = await supabase
        .from('videos')
        .select('*', { head: true, count: 'exact' })
        .eq('batch_id', latestBatch.id);

      if (countError) throw countError;
      totalVideos = count || 0;
    }

    res.json({
      success: true,
      data: {
        latestBatch: latestBatch || null,
        totalVideos,
        hasSelection: Boolean(selection),
        selection,
        hasNewBatch: Boolean(latestBatch) && !selection,
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
 */
router.get('/admin/overview', async (req, res) => {
  try {
    const { batchId } = req.query;

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

    if (targetBatch) {
      const { data: selectionRows, error: selectionError } = await supabase
        .from('selections')
        .select('user_id, video_ids, created_at')
        .eq('batch_id', targetBatch.id);

      if (selectionError) throw selectionError;

      const selectionMap = new Map();
      (selectionRows || []).forEach((row) => {
        selectionMap.set(row.user_id, row);
      });

      submittedCount = selectionMap.size;
      pendingCount = Math.max(customers.length - submittedCount, 0);

      selectionDetails = customers.map((customer) => {
        const record = selectionMap.get(customer.id);
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: record ? 'submitted' : 'pending',
          submittedAt: record?.created_at || null,
          videoCount: record?.video_ids?.length || 0,
        };
      });
    }

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


