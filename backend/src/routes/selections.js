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
    
    // 驗證權限：只能查詢自己的或管理員可查詢所有
    if (currentUserId !== userId && authProfile?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限查詢此用戶資料' 
      });
    }
    
    // 獲取該用戶所有的選擇記錄
    const { data: allSelections, error: selectionsError } = await supabase
      .from('selections')
      .select('video_ids, batch_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (selectionsError) throw selectionsError;
    
    if (!allSelections || allSelections.length === 0) {
      return res.json({
        success: true,
        data: {
          ownedVideoIds: [],
          ownedVideos: [],
          totalSelections: 0
        }
      });
    }
    
    // 收集所有選擇過的影片 ID（去重）
    const allVideoIds = new Set();
    allSelections.forEach(selection => {
      if (selection.video_ids && Array.isArray(selection.video_ids)) {
        selection.video_ids.forEach(id => allVideoIds.add(id));
      }
    });
    
    const ownedVideoIds = Array.from(allVideoIds);
    
    if (ownedVideoIds.length === 0) {
      return res.json({
        success: true,
        data: {
          ownedVideoIds: [],
          ownedVideos: [],
          totalSelections: allSelections.length
        }
      });
    }
    
    // 獲取這些影片的詳細資訊
    const { data: ownedVideos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .in('id', ownedVideoIds);
    
    if (videosError) throw videosError;
    
    console.log(`✅ 用戶 ${userId} 目前擁有 ${ownedVideoIds.length} 部影片`);
    
    res.json({
      success: true,
      data: {
        ownedVideoIds: ownedVideoIds,
        ownedVideos: ownedVideos || [],
        totalSelections: allSelections.length
      }
    });
    
  } catch (error) {
    console.error('查詢用戶擁有影片錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢失敗'
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
 * GET /api/selections/monthly-summary
 * 
 * 管理員查看指定月份所有客戶的選擇摘要與異動
 * 包含本月選擇、上月選擇、新增/下架/保留的影片
 */
router.get('/monthly-summary', requireAuth, async (req, res) => {
  try {
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    
    // 檢查是否為管理員
    if (authProfile?.role !== 'admin' && authUser?.user_metadata?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '此功能僅限管理員使用' 
      });
    }
    
    const { month } = req.query;
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '請提供有效的月份格式 (YYYY-MM)' 
      });
    }
    
    console.log(`📊 管理員查詢月份摘要: ${month}`);
    
    // 計算上一個月份
    const [year, monthNum] = month.split('-').map(Number);
    const prevDate = new Date(year, monthNum - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    // 查找當前月份的批次
    const { data: currentBatches, error: currentBatchError } = await supabase
      .from('batches')
      .select('*')
      .eq('month', month)
      .order('created_at', { ascending: false });
    
    if (currentBatchError) throw currentBatchError;
    
    // 查找上一個月份的批次
    const { data: previousBatches, error: prevBatchError } = await supabase
      .from('batches')
      .select('*')
      .eq('month', prevMonth)
      .order('created_at', { ascending: false });
    
    if (prevBatchError) throw prevBatchError;
    
    const currentBatch = currentBatches && currentBatches.length > 0 ? currentBatches[0] : null;
    const previousBatch = previousBatches && previousBatches.length > 0 ? previousBatches[0] : null;
    
    // 獲取所有客戶
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'customer')
      .order('name', { ascending: true });
    
    if (customersError) throw customersError;
    
    if (!customers || customers.length === 0) {
      return res.json({
        success: true,
        data: {
          month,
          prevMonth,
          currentBatch,
          previousBatch,
          summaries: []
        }
      });
    }
    
    // 批次獲取當前月份的所有選擇
    let currentSelections = [];
    if (currentBatch) {
      const { data, error } = await supabase
        .from('selections')
        .select('user_id, video_ids, created_at')
        .eq('batch_id', currentBatch.id);
      
      if (error) throw error;
      currentSelections = data || [];
    }
    
    // 批次獲取上一個月份的所有選擇
    let previousSelections = [];
    if (previousBatch) {
      const { data, error } = await supabase
        .from('selections')
        .select('user_id, video_ids, created_at')
        .eq('batch_id', previousBatch.id);
      
      if (error) throw error;
      previousSelections = data || [];
    }
    
    // 建立選擇的 Map 以便快速查找
    const currentSelectionsMap = new Map();
    currentSelections.forEach(sel => {
      currentSelectionsMap.set(sel.user_id, sel);
    });
    
    const previousSelectionsMap = new Map();
    previousSelections.forEach(sel => {
      previousSelectionsMap.set(sel.user_id, sel);
    });
    
    // 獲取所有涉及的影片 ID
    const allVideoIds = new Set();
    currentSelections.forEach(sel => {
      (sel.video_ids || []).forEach(id => allVideoIds.add(id));
    });
    previousSelections.forEach(sel => {
      (sel.video_ids || []).forEach(id => allVideoIds.add(id));
    });
    
    // 批次獲取所有影片詳情
    let videosMap = new Map();
    if (allVideoIds.size > 0) {
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id, title, title_en, thumbnail_url')
        .in('id', Array.from(allVideoIds));
      
      if (videosError) throw videosError;
      
      (videos || []).forEach(video => {
        videosMap.set(video.id, video);
      });
    }
    
    // 為每個客戶組合摘要資料
    const summaries = customers.map(customer => {
      const currentSelection = currentSelectionsMap.get(customer.id);
      const previousSelection = previousSelectionsMap.get(customer.id);
      
      const currentVideoIds = currentSelection?.video_ids || [];
      const previousVideoIds = previousSelection?.video_ids || [];
      
      // 計算差異
      const addedIds = currentVideoIds.filter(id => !previousVideoIds.includes(id));
      const removedIds = previousVideoIds.filter(id => !currentVideoIds.includes(id));
      const keptIds = currentVideoIds.filter(id => previousVideoIds.includes(id));
      
      // 組合影片詳情
      const currentVideos = currentVideoIds.map(id => videosMap.get(id)).filter(Boolean);
      const previousVideos = previousVideoIds.map(id => videosMap.get(id)).filter(Boolean);
      const addedVideos = addedIds.map(id => videosMap.get(id)).filter(Boolean);
      const removedVideos = removedIds.map(id => videosMap.get(id)).filter(Boolean);
      const keptVideos = keptIds.map(id => videosMap.get(id)).filter(Boolean);
      
      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        },
        currentSelection: currentSelection ? {
          videoCount: currentVideoIds.length,
          submittedAt: currentSelection.created_at,
          videos: currentVideos
        } : null,
        previousSelection: previousSelection ? {
          videoCount: previousVideoIds.length,
          submittedAt: previousSelection.created_at,
          videos: previousVideos
        } : null,
        diff: {
          added: addedVideos,
          removed: removedVideos,
          kept: keptVideos,
          addedCount: addedVideos.length,
          removedCount: removedVideos.length,
          keptCount: keptVideos.length
        }
      };
    });
    
    console.log(`✅ 已生成 ${summaries.length} 位客戶的摘要`);
    
    res.json({
      success: true,
      data: {
        month,
        prevMonth,
        currentBatch,
        previousBatch,
        summaries
      }
    });
    
  } catch (error) {
    console.error('查詢月份摘要錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '查詢月份摘要失敗'
    });
  }
});

export default router;

