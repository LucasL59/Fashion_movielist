/**
 * 選擇路由
 * 
 * 處理客戶的影片選擇
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { notifyAdminCustomerSelection } from '../services/emailService.js';
import { requireAuth } from '../middleware/auth.js';
import { recordOperationLog } from '../services/operationLogService.js';

const router = express.Router();

/**
 * POST /api/selections
 * 
 * 客戶提交影片選擇
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { batchId, videoIds } = req.body;
    const customerNameInput = req.body.customerName;
    const customerEmailInput = req.body.customerEmail;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;
    
    // 驗證必要欄位
    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: '請先登入後再提交選擇' 
      });
    }

    if (!batchId || !videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '缺少必要欄位或格式錯誤' 
      });
    }
    
    if (videoIds.length === 0) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '請至少選擇一部影片' 
      });
    }

    const finalCustomerName = customerNameInput || authProfile?.name || authUser?.user_metadata?.name || authUser?.email || customerEmailInput;
    const finalCustomerEmail = customerEmailInput || authProfile?.email || authUser?.email;
    
    // 檢查是否已經提交過選擇
    const { data: existingSelection } = await supabase
      .from('selections')
      .select('id')
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .single();
    
    let result;
    
    if (existingSelection) {
      // 更新現有選擇
      const { data, error } = await supabase
        .from('selections')
        .update({ 
          video_ids: videoIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSelection.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      
      console.log(`📝 更新選擇: 用戶 ${userId}, ${videoIds.length} 部影片`);
    } else {
      // 建立新選擇
      const { data, error } = await supabase
        .from('selections')
        .insert({
          user_id: userId,
          batch_id: batchId,
          video_ids: videoIds
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      
      console.log(`✅ 新增選擇: 用戶 ${userId}, ${videoIds.length} 部影片`);
    }
    
    // 獲取選擇的影片詳細資訊
    const { data: selectedVideos } = await supabase
      .from('videos')
      .select('*')
      .in('id', videoIds);
    
    // 獲取當前批次資訊以計算上月差異
    const { data: currentBatch } = await supabase
      .from('batches')
      .select('month')
      .eq('id', batchId)
      .single();
    
    let previousVideos = [];
    let previousVideoIds = [];
    
    if (currentBatch && currentBatch.month) {
      // 計算上一個月份
      const [year, month] = currentBatch.month.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      
      // 查找上月批次
      const { data: previousBatches } = await supabase
        .from('batches')
        .select('id')
        .eq('month', prevMonth)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (previousBatches && previousBatches.length > 0) {
        // 查找用戶上月選擇
        const { data: previousSelection } = await supabase
          .from('selections')
          .select('video_ids')
          .eq('user_id', userId)
          .eq('batch_id', previousBatches[0].id)
          .maybeSingle();
        
        if (previousSelection && previousSelection.video_ids) {
          previousVideoIds = previousSelection.video_ids;
          
          // 獲取上月影片詳情
          const { data: prevVids } = await supabase
            .from('videos')
            .select('*')
            .in('id', previousVideoIds);
          
          previousVideos = prevVids || [];
        }
      }
    }
    
    // 發送通知給管理員（包含差異資訊）
    try {
      await notifyAdminCustomerSelection({
        customerName: finalCustomerName || userId,
        customerEmail: finalCustomerEmail || 'unknown@example.com',
        batchId,
        videos: selectedVideos || [],
        previousVideos: previousVideos,
        previousVideoIds: previousVideoIds
      });
      console.log('📧 已發送通知給管理員');
    } catch (emailError) {
      console.error('發送通知失敗:', emailError);
      // 即使通知失敗，選擇仍然成功
    }
    
    await recordOperationLog({
      req,
      action: 'selections.submit',
      resourceType: 'selection',
      resourceId: result.id,
      description: `${finalCustomerName || '使用者'}${existingSelection ? '更新' : '提交'}影片選擇`,
      metadata: {
        batchId,
        videoCount: videoIds.length,
        videoIds,
        isUpdate: Boolean(existingSelection)
      }
    })

    res.json({
      success: true,
      message: '影片選擇已提交',
      data: {
        selectionId: result.id,
        videoCount: videoIds.length
      }
    });
    
  } catch (error) {
    console.error('提交選擇錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '提交選擇失敗'
    });
  }
});

/**
 * GET /api/selections/user/:userId
 * 
 * 獲取特定用戶的所有選擇
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: selections, error } = await supabase
      .from('selections')
      .select('*, batches(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: selections || []
    });
    
  } catch (error) {
    console.error('查詢用戶選擇錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢用戶選擇失敗'
    });
  }
});

/**
 * GET /api/selections/batch/:batchId
 * 
 * 獲取特定批次的所有選擇（管理員用）
 */
router.get('/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const { data: selections, error } = await supabase
      .from('selections')
      .select('*, profiles(name, email)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: selections || []
    });
    
  } catch (error) {
    console.error('查詢批次選擇錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢批次選擇失敗'
    });
  }
});

/**
 * GET /api/selections/current-owned/:userId
 * 
 * 獲取用戶目前擁有的所有影片（累積所有歷史選擇）
 */
router.get('/current-owned/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const currentUserId = authProfile?.id || authUser?.id;
    
    console.log('🔍 [current-owned] 收到請求:', { userId, currentUserId });
    
    // 權限檢查：只能查詢自己的，或者管理員可以查詢所有
    if (currentUserId !== userId && authProfile?.role !== 'admin' && authProfile?.role !== 'uploader') {
      console.log('❌ [current-owned] 權限不足');
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限查詢此用戶的資料' 
      });
    }
    
    // 獲取該用戶所有的選擇記錄
    const { data: selections, error: selectionsError } = await supabase
      .from('selections')
      .select('video_ids')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (selectionsError) throw selectionsError;
    
    console.log(`📊 [current-owned] 找到 ${selections?.length || 0} 筆選擇記錄`);
    
    if (!selections || selections.length === 0) {
      console.log('ℹ️ [current-owned] 用戶沒有任何選擇記錄');
      return res.json({
        success: true,
        data: {
          ownedVideos: [],
          ownedVideoIds: []
        }
      });
    }
    
    // 合併所有選擇的影片 ID（去重）
    const allVideoIds = new Set();
    selections.forEach(selection => {
      if (selection.video_ids && Array.isArray(selection.video_ids)) {
        console.log(`  - 選擇記錄包含 ${selection.video_ids.length} 部影片`);
        selection.video_ids.forEach(id => allVideoIds.add(id));
      }
    });
    
    const uniqueVideoIds = Array.from(allVideoIds);
    
    console.log(`🎬 [current-owned] 去重後共 ${uniqueVideoIds.length} 部影片`);
    console.log(`📝 [current-owned] 影片 IDs:`, uniqueVideoIds);
    
    if (uniqueVideoIds.length === 0) {
      console.log('⚠️ [current-owned] 去重後沒有影片');
      return res.json({
        success: true,
        data: {
          ownedVideos: [],
          ownedVideoIds: []
        }
      });
    }
    
    // 獲取這些影片的詳細資訊
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .in('id', uniqueVideoIds);
    
    if (videosError) throw videosError;
    
    console.log(`✅ [current-owned] 成功獲取 ${videos?.length || 0} 部影片詳情`);
    
    res.json({
      success: true,
      data: {
        ownedVideos: videos || [],
        ownedVideoIds: uniqueVideoIds
      }
    });
    
  } catch (error) {
    console.error('❌ [current-owned] 獲取擁有影片失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取擁有影片失敗'
    });
  }
});

/**
 * GET /api/selections/previous/:currentBatchId
 * 
 * 獲取用戶在上一個月批次的選擇（保留用於郵件通知）
 * 根據當前批次的月份，找出上一個月的批次與該用戶的選擇
 */
router.get('/previous/:currentBatchId', requireAuth, async (req, res) => {
  try {
    const { currentBatchId } = req.params;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: '請先登入' 
      });
    }
    
    // 獲取當前批次的月份
    const { data: currentBatch, error: batchError } = await supabase
      .from('batches')
      .select('month')
      .eq('id', currentBatchId)
      .single();
    
    if (batchError) {
      if (batchError.code === 'PGRST116') {
        return res.json({
          success: true,
          data: {
            previousBatch: null,
            previousSelection: null,
            previousVideos: []
          }
        });
      }
      throw batchError;
    }
    
    if (!currentBatch || !currentBatch.month) {
      return res.json({
        success: true,
        data: {
          previousBatch: null,
          previousSelection: null,
          previousVideos: []
        }
      });
    }
    
    // 計算上一個月份 (YYYY-MM 格式)
    const [year, month] = currentBatch.month.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1); // month - 2 因為 JS Date 月份從 0 開始
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`🔍 查找上月批次: 當前=${currentBatch.month}, 上月=${prevMonth}`);
    
    // 查找上一個月的批次
    const { data: previousBatches, error: prevBatchError } = await supabase
      .from('batches')
      .select('*')
      .eq('month', prevMonth)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (prevBatchError) throw prevBatchError;
    
    if (!previousBatches || previousBatches.length === 0) {
      console.log('📭 未找到上月批次');
      return res.json({
        success: true,
        data: {
          previousBatch: null,
          previousSelection: null,
          previousVideos: []
        }
      });
    }
    
    const previousBatch = previousBatches[0];
    
    // 查找用戶在上一個月批次的選擇
    const { data: previousSelection, error: selectionError } = await supabase
      .from('selections')
      .select('*')
      .eq('user_id', userId)
      .eq('batch_id', previousBatch.id)
      .maybeSingle();
    
    if (selectionError) throw selectionError;
    
    if (!previousSelection || !previousSelection.video_ids || previousSelection.video_ids.length === 0) {
      console.log('📭 用戶在上月未選擇任何影片');
      return res.json({
        success: true,
        data: {
          previousBatch: previousBatch,
          previousSelection: null,
          previousVideos: []
        }
      });
    }
    
    // 獲取上月選擇的影片詳細資訊
    const { data: previousVideos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .in('id', previousSelection.video_ids);
    
    if (videosError) throw videosError;
    
    console.log(`✅ 找到上月選擇: ${previousVideos?.length || 0} 部影片`);
    
    res.json({
      success: true,
      data: {
        previousBatch: previousBatch,
        previousSelection: previousSelection,
        previousVideos: previousVideos || []
      }
    });
    
  } catch (error) {
    console.error('查詢上月選擇錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢上月選擇失敗'
    });
  }
});

/**
 * GET /api/selections/customer-lists
 * 
 * 管理員/上傳者查看所有客戶的當前累積清單
 * v3 架構：客戶維護一份持續更新的清單，不再按月份劃分
 */
router.get('/customer-lists', requireAuth, async (req, res) => {
  try {
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userRole = authProfile?.role || authUser?.user_metadata?.role;
    
    // 檢查是否為管理員或上傳者
    if (userRole !== 'admin' && userRole !== 'uploader') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '此功能僅限管理員和上傳者使用' 
      });
    }
    
    console.log(`📊 管理員查詢客戶清單總覽`);
    
    // 獲取所有客戶
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'customer')
      .order('name', { ascending: true });
    
    if (customersError) throw customersError;
    
    if (!customers || customers.length === 0) {
      console.log('⚠️ 沒有找到任何客戶');
      return res.json({
        success: true,
        data: {
          customerLists: []
        }
      });
    }
    
    console.log(`👥 找到 ${customers.length} 位客戶`);
    
    // 獲取所有客戶的當前累積清單
    console.log('🔍 查詢 customer_current_list...');
    const { data: currentListData, error: currentListError } = await supabase
      .from('customer_current_list')
      .select('customer_id, video_id, added_at');
    
    if (currentListError) {
      console.error('❌ 查詢 customer_current_list 失敗:', currentListError);
      throw currentListError;
    }
    
    console.log(`📊 找到 ${currentListData?.length || 0} 筆累積清單記錄`);

    // 按客戶 ID 分組當前清單
    const currentListMap = new Map();
    (currentListData || []).forEach(item => {
      if (!currentListMap.has(item.customer_id)) {
        currentListMap.set(item.customer_id, []);
      }
      currentListMap.get(item.customer_id).push(item);
    });
    
    console.log(`📋 已為 ${currentListMap.size} 位客戶分組清單資料`);
    
    // 查詢每個客戶的最後一次變更記錄（從 selection_history）
    console.log(`🔍 查詢客戶的變更歷史...`);
    const { data: historyData, error: historyError } = await supabase
      .from('selection_history')
      .select('customer_id, snapshot_date, added_videos, removed_videos, total_count, added_count, removed_count')
      .order('snapshot_date', { ascending: false });
    
    if (historyError) {
      console.error('⚠️ 查詢 selection_history 失敗:', historyError);
    }
    
    // 建立最後變更記錄的 Map（每個客戶只保留最新的一條）
    const lastChangeMap = new Map();
    if (historyData) {
      historyData.forEach(record => {
        if (!lastChangeMap.has(record.customer_id)) {
          lastChangeMap.set(record.customer_id, {
            snapshot_date: record.snapshot_date,
            added_videos: record.added_videos || [],
            removed_videos: record.removed_videos || [],
            total_count: record.total_count || 0,
            added_count: record.added_count || 0,
            removed_count: record.removed_count || 0
          });
        }
      });
      console.log(`✅ 找到 ${lastChangeMap.size} 位客戶的變更記錄`);
    }
    
    // 獲取所有涉及的影片 ID
    const allVideoIds = new Set();
    
    // 從客戶當前清單收集影片 ID
    (currentListData || []).forEach(item => {
      if (item.video_id) {
        allVideoIds.add(item.video_id);
      }
    });
    
    // 從變更歷史收集影片 ID（added_videos 和 removed_videos）
    if (historyData) {
      historyData.forEach(record => {
        // 從 added_videos 收集
        if (Array.isArray(record.added_videos)) {
          record.added_videos.forEach(video => {
            if (video.video_id) {
              allVideoIds.add(video.video_id);
            }
          });
        }
        // 從 removed_videos 收集
        if (Array.isArray(record.removed_videos)) {
          record.removed_videos.forEach(video => {
            if (video.video_id) {
              allVideoIds.add(video.video_id);
            }
          });
        }
      });
    }
    
    // 批次獲取所有影片詳情
    console.log(`🎬 需要查詢 ${allVideoIds.size} 部影片的詳情`);
    let videosMap = new Map();
    if (allVideoIds.size > 0) {
      const videoIdsArray = Array.from(allVideoIds);
      console.log(`📝 影片 IDs:`, videoIdsArray.slice(0, 10), allVideoIds.size > 10 ? '...' : '');
      
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, title, title_en, thumbnail_url')
        .in('id', videoIdsArray);
      
      if (videosError) {
        console.error('❌ 查詢 videos 失敗:', videosError);
        throw videosError;
      }
      
      console.log(`✅ 成功查詢到 ${videos?.length || 0} 部影片`);
      
      (videos || []).forEach(video => {
        videosMap.set(video.id, video);
      });
    }
    
    // 為每個客戶組合清單資料
    console.log(`🔄 開始為 ${customers.length} 位客戶組合清單資料...`);
    const customerLists = customers.map((customer, index) => {
      try {
        const currentList = currentListMap.get(customer.id) || [];
        const currentVideoIds = currentList.map(item => item.video_id).filter(Boolean);
        
        // 組合當前清單的影片詳情（從 videosMap 獲取）
        const videos = currentVideoIds.map(id => videosMap.get(id)).filter(Boolean);
        
        // 獲取最後一次變更記錄
        const lastChange = lastChangeMap.get(customer.id);
        
        // 組合最後變更的詳細資訊
        let lastChangeDetails = null;
        if (lastChange) {
          lastChangeDetails = {
            date: lastChange.snapshot_date,
            addedVideos: lastChange.added_videos || [],
            removedVideos: lastChange.removed_videos || [],
            addedCount: lastChange.added_count || 0,
            removedCount: lastChange.removed_count || 0,
            totalAfterChange: lastChange.total_count || 0
          };
        }
        
        if (index < 5) {
          const changeInfo = lastChange 
            ? `+${lastChange.added_count || 0}/-${lastChange.removed_count || 0}` 
            : '無變更記錄';
          console.log(`  ✓ 客戶 ${index + 1}: ${customer.name} - 目前 ${videos.length} 部，最近變更: ${changeInfo}`);
        }
      
      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        },
          currentList: {
            videoCount: videos.length,
            videos: videos
          },
          lastChange: lastChangeDetails,
          lastUpdate: lastChange?.snapshot_date || (currentList.length > 0 ? currentList[0]?.added_at : null)
        };
      } catch (error) {
        console.error(`❌ 為客戶 ${customer.name} 組合資料時出錯:`, error);
        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          },
          currentList: {
            videoCount: 0,
            videos: []
          },
          lastChange: null,
          lastUpdate: null
        };
      }
    });
    
    console.log(`✅ 已生成 ${customerLists.length} 位客戶的清單資料`);
    
    res.json({
      success: true,
      data: {
        customerLists,
        totalCustomers: customerLists.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌❌❌ 查詢客戶清單錯誤 ❌❌❌');
    console.error('錯誤訊息:', error.message);
    console.error('錯誤堆疊:', error.stack);
    
    if (error.code) {
      console.error('Supabase 錯誤碼:', error.code);
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢客戶清單失敗'
    });
  }
});

// 保留舊的 monthly-summary 端點作為重定向（向後兼容）
router.get('/monthly-summary', requireAuth, async (req, res) => {
  // 重定向到新的 customer-lists 端點
  return res.redirect(308, '/api/selections/customer-lists');
});

/**
 * GET /api/selections/export-changes
 * 
 * 匯出指定月份的客戶清單調整記錄為 Excel
 * 參數: month (YYYY-MM 格式)
 */
router.get('/export-changes', requireAuth, async (req, res) => {
  try {
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userRole = authProfile?.role || authUser?.user_metadata?.role;
    
    // 檢查是否為管理員或上傳者
    if (userRole !== 'admin' && userRole !== 'uploader') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '此功能僅限管理員和上傳者使用' 
      });
    }

    const { month } = req.query; // YYYY-MM 格式
    if (!month) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '請指定月份參數 (month=YYYY-MM)'
      });
    }

    console.log(`📊 匯出 ${month} 的客戶清單調整記錄...`);

    // 計算月份範圍
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 查詢該月份的所有選擇歷史記錄
    const { data: historyRecords, error: historyError } = await supabase
      .from('selection_history')
      .select('*')
      .gte('snapshot_date', startDate.toISOString())
      .lt('snapshot_date', endDate.toISOString())
      .order('snapshot_date', { ascending: false });

    if (historyError) throw historyError;

    // 獲取客戶資料
    const customerIds = [...new Set(historyRecords.map(r => r.customer_id))];
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', customerIds);

    if (customersError) throw customersError;

    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 使用 ExcelJS 建立 Excel 檔案
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    
    // 設定工作簿屬性
    workbook.creator = 'MVI Select System';
    workbook.lastModifiedBy = 'MVI Select System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 建立「調整摘要」工作表
    const summarySheet = workbook.addWorksheet('調整摘要');
    summarySheet.columns = [
      { header: '客戶名稱', key: 'customerName', width: 20 },
      { header: '客戶信箱', key: 'customerEmail', width: 30 },
      { header: '提交時間', key: 'submittedAt', width: 22 },
      { header: '新增數量', key: 'addedCount', width: 12 },
      { header: '移除數量', key: 'removedCount', width: 12 },
      { header: '目前總數', key: 'totalCount', width: 12 }
    ];

    // 設定標題列樣式
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 填入摘要資料
    historyRecords.forEach(record => {
      const customer = customerMap.get(record.customer_id);
      summarySheet.addRow({
        customerName: customer?.name || '未知',
        customerEmail: customer?.email || '未知',
        submittedAt: new Date(record.snapshot_date).toLocaleString('zh-TW'),
        addedCount: record.added_count || 0,
        removedCount: record.removed_count || 0,
        totalCount: record.total_count || 0
      });
    });

    // 建立「新增影片明細」工作表
    const addedSheet = workbook.addWorksheet('新增影片明細');
    addedSheet.columns = [
      { header: '客戶名稱', key: 'customerName', width: 20 },
      { header: '提交時間', key: 'submittedAt', width: 22 },
      { header: '影片名稱', key: 'videoTitle', width: 35 },
      { header: '英文名稱', key: 'videoTitleEn', width: 35 },
      { header: '來源月份', key: 'sourceMonth', width: 15 }
    ];
    
    addedSheet.getRow(1).font = { bold: true };
    addedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    addedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 填入新增影片明細
    historyRecords.forEach(record => {
      const customer = customerMap.get(record.customer_id);
      const addedVideos = record.added_videos || [];
      addedVideos.forEach(video => {
        addedSheet.addRow({
          customerName: customer?.name || '未知',
          submittedAt: new Date(record.snapshot_date).toLocaleString('zh-TW'),
          videoTitle: video.title || '未知',
          videoTitleEn: video.title_en || '',
          sourceMonth: video.month || ''
        });
      });
    });

    // 建立「移除影片明細」工作表
    const removedSheet = workbook.addWorksheet('移除影片明細');
    removedSheet.columns = [
      { header: '客戶名稱', key: 'customerName', width: 20 },
      { header: '提交時間', key: 'submittedAt', width: 22 },
      { header: '影片名稱', key: 'videoTitle', width: 35 },
      { header: '英文名稱', key: 'videoTitleEn', width: 35 },
      { header: '來源月份', key: 'sourceMonth', width: 15 }
    ];
    
    removedSheet.getRow(1).font = { bold: true };
    removedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' }
    };
    removedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 填入移除影片明細
    historyRecords.forEach(record => {
      const customer = customerMap.get(record.customer_id);
      const removedVideos = record.removed_videos || [];
      removedVideos.forEach(video => {
        removedSheet.addRow({
          customerName: customer?.name || '未知',
          submittedAt: new Date(record.snapshot_date).toLocaleString('zh-TW'),
          videoTitle: video.title || '未知',
          videoTitleEn: video.title_en || '',
          sourceMonth: video.month || ''
        });
      });
    });

    // 設定響應標頭
    const filename = `客戶清單調整_${month}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    // 寫入響應
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ 成功匯出 ${month} 的調整記錄，共 ${historyRecords.length} 筆`);

  } catch (error) {
    console.error('❌ 匯出失敗:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: '匯出失敗: ' + error.message
    });
  }
});

export default router;

