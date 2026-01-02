/**
 * 客戶清單路由
 * 
 * 處理客戶當前擁有的影片清單（重構後的核心 API）
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { recordOperationLog } from '../services/operationLogService.js';

const router = express.Router();

/**
 * GET /api/customer-list/:customerId
 * 
 * 獲取客戶當前擁有的完整清單
 */
router.get('/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const currentUserId = authProfile?.id || authUser?.id;
    
    // 權限檢查：只能查詢自己的，或者管理員/上傳者可以查詢所有
    if (currentUserId !== customerId && 
        authProfile?.role !== 'admin' && 
        authProfile?.role !== 'uploader') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限查詢此用戶的資料' 
      });
    }
    
    console.log(`🔍 [customer-list] 查詢客戶清單: ${customerId}`);
    
    // 查詢客戶當前清單（包含影片和批次資訊）
    const { data: listItems, error: listError } = await supabase
      .from('customer_current_list')
      .select(`
        *,
        videos:video_id (*),
        batches:added_from_batch_id (id, name, month, created_at)
      `)
      .eq('customer_id', customerId)
      .order('added_at', { ascending: false });
    
    if (listError) throw listError;
    
    console.log(`✅ [customer-list] 找到 ${listItems?.length || 0} 筆記錄`);
    
    // 按月份分組
    const groupedByMonth = {};
    const videoIds = [];
    
    if (listItems && listItems.length > 0) {
      listItems.forEach(item => {
        const month = item.added_from_month || 'unknown';
        if (!groupedByMonth[month]) {
          groupedByMonth[month] = [];
        }
        groupedByMonth[month].push(item);
        videoIds.push(item.video_id);
      });
    }
    
    res.json({
      success: true,
      data: {
        items: listItems || [],
        videoIds: videoIds,
        groupedByMonth: groupedByMonth,
        totalCount: listItems?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ [customer-list] 查詢失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '查詢客戶清單失敗'
    });
  }
});

/**
 * POST /api/customer-list/:customerId/update
 * 
 * 更新客戶清單（新增或移除影片）
 * 不會發送通知，只更新資料庫
 */
router.post('/:customerId/update', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { addVideoIds, removeVideoIds, batchId, month, skipHistory } = req.body;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const currentUserId = authProfile?.id || authUser?.id;
    
    // 權限檢查
    if (currentUserId !== customerId && authProfile?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限修改此用戶的清單' 
      });
    }
    
    console.log(`📝 [customer-list] 更新客戶清單: ${customerId}`);
    console.log(`  - 新增: ${addVideoIds?.length || 0} 部`);
    console.log(`  - 移除: ${removeVideoIds?.length || 0} 部`);
    
    // 移除影片
    if (removeVideoIds && removeVideoIds.length > 0) {
      const { error: removeError } = await supabase
        .from('customer_current_list')
        .delete()
        .eq('customer_id', customerId)
        .in('video_id', removeVideoIds);
      
      if (removeError) throw removeError;
      console.log(`✅ [customer-list] 已移除 ${removeVideoIds.length} 部影片`);
    }
    
    // 新增影片
    if (addVideoIds && addVideoIds.length > 0) {
      const videosToAdd = addVideoIds.map(videoId => ({
        customer_id: customerId,
        video_id: videoId,
        added_from_batch_id: batchId || null,
        added_from_month: month || null,
        added_at: new Date().toISOString()
      }));
      
      const { error: addError } = await supabase
        .from('customer_current_list')
        .upsert(videosToAdd, { 
          onConflict: 'customer_id,video_id',
          ignoreDuplicates: false 
        });
      
      if (addError) throw addError;
      console.log(`✅ [customer-list] 已新增 ${addVideoIds.length} 部影片`);
    }
    
    // 記錄操作日誌（如果不是自動保存）
    if (!skipHistory) {
      await recordOperationLog({
        req,
        action: 'customer_list.update',
        resourceType: 'customer_list',
        resourceId: customerId,
        description: `更新客戶清單：新增 ${addVideoIds?.length || 0} 部，移除 ${removeVideoIds?.length || 0} 部`,
        metadata: {
          customerId,
          addCount: addVideoIds?.length || 0,
          removeCount: removeVideoIds?.length || 0,
          month
        }
      });
    }
    
    res.json({
      success: true,
      message: '清單更新成功',
      data: {
        addedCount: addVideoIds?.length || 0,
        removedCount: removeVideoIds?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ [customer-list] 更新失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '更新客戶清單失敗'
    });
  }
});

/**
 * POST /api/customer-list/:customerId/submit
 * 
 * 客戶提交清單（記錄歷史快照並發送通知）
 */
router.post('/:customerId/submit', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { changes } = req.body;  // { addedVideos, removedVideos }
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const currentUserId = authProfile?.id || authUser?.id;
    
    // 權限檢查
    if (currentUserId !== customerId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限提交此用戶的清單' 
      });
    }
    
    console.log(`📤 [customer-list] 客戶提交清單: ${customerId}`);
    
    // 獲取當前完整清單
    const { data: currentList, error: listError } = await supabase
      .from('customer_current_list')
      .select('video_id, videos(*)')
      .eq('customer_id', customerId);
    
    if (listError) throw listError;
    
    const videoIds = currentList?.map(item => item.video_id) || [];
    
    // 記錄歷史快照
    const { error: historyError } = await supabase
      .from('selection_history')
      .insert({
        customer_id: customerId,
        snapshot_date: new Date().toISOString(),
        trigger_action: 'submit',
        total_count: videoIds.length,
        added_count: changes?.addedVideos?.length || 0,
        removed_count: changes?.removedVideos?.length || 0,
        video_ids: videoIds,
        added_videos: changes?.addedVideos || [],
        removed_videos: changes?.removedVideos || [],
        metadata: {
          submitted_by: currentUserId,
          submitted_at: new Date().toISOString()
        }
      });
    
    if (historyError) throw historyError;
    
    // 發送通知郵件給管理員
    // TODO: 整合郵件服務
    // await notifyAdminCustomerListUpdate(customerId, currentList, changes);
    
    // 記錄操作日誌
    await recordOperationLog({
      req,
      action: 'customer_list.submit',
      resourceType: 'customer_list',
      resourceId: customerId,
      description: `${authProfile?.name || authUser?.email} 提交影片清單`,
      metadata: {
        customerId,
        totalCount: videoIds.length,
        addedCount: changes?.addedVideos?.length || 0,
        removedCount: changes?.removedVideos?.length || 0
      }
    });
    
    console.log(`✅ [customer-list] 提交成功，已記錄歷史快照`);
    
    res.json({
      success: true,
      message: '清單已提交',
      data: {
        totalCount: videoIds.length,
        historyRecorded: true
      }
    });
    
  } catch (error) {
    console.error('❌ [customer-list] 提交失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '提交清單失敗'
    });
  }
});

/**
 * GET /api/customer-list/:customerId/history
 * 
 * 獲取客戶的提交歷史
 */
router.get('/:customerId/history', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 50 } = req.query;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const currentUserId = authProfile?.id || authUser?.id;
    
    // 權限檢查
    if (currentUserId !== customerId && 
        authProfile?.role !== 'admin' && 
        authProfile?.role !== 'uploader') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: '無權限查詢此用戶的歷史' 
      });
    }
    
    console.log(`📜 [customer-list] 查詢提交歷史: ${customerId}`);
    
    const { data: history, error: historyError } = await supabase
      .from('selection_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('snapshot_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (historyError) throw historyError;
    
    console.log(`✅ [customer-list] 找到 ${history?.length || 0} 筆歷史記錄`);
    
    res.json({
      success: true,
      data: history || []
    });
    
  } catch (error) {
    console.error('❌ [customer-list] 查詢歷史失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '查詢歷史失敗'
    });
  }
});

/**
 * DELETE /api/customer-list/:customerId/clear
 * 
 * 清空客戶的完整清單（管理員功能）
 */
router.delete('/:customerId/clear', requireAuth, requireRoles(['admin']), async (req, res) => {
  try {
    const { customerId } = req.params;
    
    console.log(`🗑️  [customer-list] 清空客戶清單: ${customerId}`);
    
    // 先記錄歷史快照
    const { data: currentList } = await supabase
      .from('customer_current_list')
      .select('video_id')
      .eq('customer_id', customerId);
    
    const videoIds = currentList?.map(item => item.video_id) || [];
    
    if (videoIds.length > 0) {
      // 記錄到歷史
      await supabase
        .from('selection_history')
        .insert({
          customer_id: customerId,
          trigger_action: 'admin_clear',
          total_count: 0,
          removed_count: videoIds.length,
          video_ids: [],
          removed_videos: videoIds,
          metadata: {
            cleared_by: req.authUserProfile?.id,
            cleared_at: new Date().toISOString()
          }
        });
    }
    
    // 刪除所有清單項目
    const { error: deleteError } = await supabase
      .from('customer_current_list')
      .delete()
      .eq('customer_id', customerId);
    
    if (deleteError) throw deleteError;
    
    // 記錄操作日誌
    await recordOperationLog({
      req,
      action: 'customer_list.clear',
      resourceType: 'customer_list',
      resourceId: customerId,
      description: `${req.authUserProfile?.name} 清空了客戶 ${customerId} 的清單`,
      metadata: {
        customerId,
        removedCount: videoIds.length
      }
    });
    
    console.log(`✅ [customer-list] 已清空 ${videoIds.length} 部影片`);
    
    res.json({
      success: true,
      message: '清單已清空',
      data: {
        removedCount: videoIds.length
      }
    });
    
  } catch (error) {
    console.error('❌ [customer-list] 清空失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '清空清單失敗'
    });
  }
});

export default router;
