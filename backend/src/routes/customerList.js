/**
 * 客戶累積清單路由
 * 
 * 處理客戶的累積影片清單（customer_current_list）
 * 支援跨月選擇、實時更新和歷史記錄
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { notifyAdminCustomerSelection } from '../services/emailService.js';
import { requireAuth } from '../middleware/auth.js';
import { recordOperationLog } from '../services/operationLogService.js';

const router = express.Router();

/**
 * GET /api/customer-list/:customerId
 * 
 * 獲取客戶當前的累積清單
 */
router.get('/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;

    console.log(`🔍 [customer-list] 查詢客戶清單: ${customerId}`);

    // 驗證權限：只能查看自己的清單或管理員可查看所有
    if (userId !== customerId && authProfile?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '您沒有權限查看此清單'
      });
    }

    // 查詢客戶的累積清單，包含影片完整資訊
    const { data: customerList, error } = await supabase
      .from('customer_current_list')
      .select(`
        id,
        video_id,
        added_from_month,
        added_at,
        videos:video_id (
          id,
          title,
          title_en,
          description,
          director,
          actor_male,
          actor_female,
          duration,
          rating,
          language,
          subtitle,
          thumbnail_url,
          row_number,
          batch_id,
          batches:batch_id (
            id,
            name,
            month
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('❌ [customer-list] Supabase 錯誤:', error);
      throw error;
    }

    // 將嵌套的 videos 資料攤平，過濾掉 videos 為 null 的項目
    const formattedList = (customerList || [])
      .filter(item => item.videos) // 過濾掉已刪除的影片
      .map(item => ({
        ...item.videos,
        added_from_month: item.added_from_month,
        added_at: item.added_at,
        list_item_id: item.id
      }));

    // 提取 video IDs 陣列（用於前端快速查找）
    const videoIds = formattedList.map(item => item.id);

    console.log(`✅ [customer-list] 找到 ${formattedList.length} 筆記錄`);

    res.json({
      success: true,
      data: {
        items: formattedList,
        videoIds: videoIds
      },
      count: formattedList.length
    });
  } catch (error) {
    console.error('❌ [customer-list] 錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取客戶清單失敗',
      details: error.message
    });
  }
});

/**
 * POST /api/customer-list/:customerId/update
 * 
 * 更新客戶清單（新增或移除影片）
 * 
 * Body: {
 *   addVideoIds: [uuid],  // 要新增的影片 ID 陣列
 *   removeVideoIds: [uuid],  // 要移除的影片 ID 陣列
 *   month: 'YYYY-MM'  // 新增影片來源月份（可選）
 * }
 */
router.post('/:customerId/update', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    let { addVideoIds = [], removeVideoIds = [], month } = req.body;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;

    // 確保是陣列
    addVideoIds = Array.isArray(addVideoIds) ? addVideoIds : [];
    removeVideoIds = Array.isArray(removeVideoIds) ? removeVideoIds : [];

    console.log(`📝 [customer-list] 更新客戶清單: ${customerId}`);
    console.log(`   - 新增: ${addVideoIds.length} 部`);
    console.log(`   - 移除: ${removeVideoIds.length} 部`);

    // 驗證權限：只能更新自己的清單
    if (userId !== customerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '您沒有權限修改此清單'
      });
    }

    // 移除影片
    if (removeVideoIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('customer_current_list')
        .delete()
        .eq('customer_id', customerId)
        .in('video_id', removeVideoIds);

      if (deleteError) {
        console.error('❌ [customer-list] 移除失敗:', deleteError);
        throw deleteError;
      }

      console.log(`✅ [customer-list] 已移除 ${removeVideoIds.length} 部影片`);
    }

    // 新增影片
    if (addVideoIds.length > 0) {
      // 獲取影片的批次月份（如果未提供 month）
      let effectiveMonth = month;
      
      if (!effectiveMonth && addVideoIds.length > 0) {
        const { data: videoData } = await supabase
          .from('videos')
          .select('batch_id, batches:batch_id(month)')
          .eq('id', addVideoIds[0])
          .single();
        
        if (videoData?.batches?.month) {
          effectiveMonth = videoData.batches.month;
        }
      }

      const itemsToInsert = addVideoIds.map(videoId => ({
        customer_id: customerId,
        video_id: videoId,
        added_from_month: effectiveMonth,
        added_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('customer_current_list')
        .upsert(itemsToInsert, {
          onConflict: 'customer_id,video_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('❌ [customer-list] 新增失敗:', insertError);
        throw insertError;
      }

      console.log(`✅ [customer-list] 已新增 ${addVideoIds.length} 部影片`);
    }

    res.json({
      success: true,
      message: '清單更新成功',
      added: addVideoIds.length,
      removed: removeVideoIds.length
    });
  } catch (error) {
    console.error('❌ [customer-list] 更新錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '更新清單失敗',
      details: error.message
    });
  }
});

/**
 * POST /api/customer-list/:customerId/submit
 * 
 * 提交清單變更（記錄歷史快照並發送通知）
 * 
 * Body: {
 *   addedVideos: [...],  // 新增的影片詳情（含標題等）
 *   removedVideos: [...]  // 移除的影片詳情
 * }
 */
router.post('/:customerId/submit', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { addedVideos = [], removedVideos = [] } = req.body;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;

    console.log(`📤 [customer-list] 客戶提交清單: ${customerId}`);

    // 驗證權限
    if (userId !== customerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '您沒有權限提交此清單'
      });
    }

    // 獲取當前清單所有影片 ID
    const { data: currentList, error: listError } = await supabase
      .from('customer_current_list')
      .select('video_id')
      .eq('customer_id', customerId);

    if (listError) throw listError;

    const videoIds = (currentList || []).map(item => item.video_id);

    // 記錄歷史快照
    const { error: historyError } = await supabase
      .from('selection_history')
      .insert({
        customer_id: customerId,
        video_ids: videoIds,
        added_videos: addedVideos,
        removed_videos: removedVideos,
        total_count: videoIds.length,
        added_count: addedVideos.length,
        removed_count: removedVideos.length,
        trigger_action: 'submit',
        snapshot_date: new Date().toISOString()
      });

    if (historyError) {
      console.error('❌ [customer-list] 歷史記錄失敗:', historyError);
      throw historyError;
    }

    console.log(`✅ [customer-list] 提交成功，已記錄歷史快照`);

    // 發送通知
    try {
      const customerName = authProfile?.name || authUser?.email || '客戶';
      const customerEmail = authProfile?.email || authUser?.email;
      
      // 準備郵件通知資料
      // addedVideos 和 removedVideos 已經是前端處理好的完整影片資料（已去重）
      const emailData = {
        customerId,
        customerName,
        customerEmail,
        totalCount: videoIds.length,
        addedVideos,  // 前端已使用標題去重
        removedVideos // 前端已處理
      };
      
      console.log(`📧 [customer-list] 準備發送通知: 新增 ${addedVideos.length} 部, 移除 ${removedVideos.length} 部`);
      
      await notifyAdminCustomerSelection(emailData);
      
      console.log('📧 [customer-list] 已發送通知');
    } catch (emailError) {
      console.error('⚠️ [customer-list] 發送通知失敗:', emailError);
      // 通知失敗不影響提交
    }

    // 記錄操作日誌
    try {
      await recordOperationLog({
        actorId: userId,
        action: 'submit_selection',
        resourceType: 'customer_list',
        resourceId: customerId,
        description: `提交影片清單：共 ${videoIds.length} 部（新增 ${addedVideos.length} 部，移除 ${removedVideos.length} 部）`,
        metadata: {
          total_count: videoIds.length,
          added_count: addedVideos.length,
          removed_count: removedVideos.length
        }
      });
    } catch (logError) {
      console.error('⚠️ [customer-list] 記錄操作日誌失敗:', logError);
      // 日誌失敗不影響提交
    }

    res.json({
      success: true,
      message: '清單提交成功',
      total: videoIds.length
    });
  } catch (error) {
    console.error('❌ [customer-list] 提交錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '提交清單失敗',
      details: error.message
    });
  }
});

/**
 * GET /api/customer-list/:customerId/history
 * 
 * 獲取客戶的選擇歷史記錄
 */
router.get('/:customerId/history', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 10 } = req.query;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;

    console.log(`📜 [customer-list] 查詢歷史記錄: ${customerId}`);

    // 驗證權限
    if (userId !== customerId && authProfile?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '您沒有權限查看此歷史記錄'
      });
    }

    const { data: history, error } = await supabase
      .from('selection_history')
      .select('*')
      .eq('customer_id', customerId)
      .order('snapshot_date', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    console.log(`✅ [customer-list] 找到 ${history.length} 筆歷史記錄`);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('❌ [customer-list] 歷史查詢錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '獲取歷史記錄失敗',
      details: error.message
    });
  }
});

/**
 * DELETE /api/customer-list/:customerId/clear
 * 
 * 清空客戶的累積清單（慎用）
 */
router.delete('/:customerId/clear', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const authProfile = req.authUserProfile;
    const authUser = req.authUser;
    const userId = authProfile?.id || authUser?.id;

    console.log(`🗑️ [customer-list] 清空客戶清單: ${customerId}`);

    // 只有管理員或客戶自己可以清空
    if (userId !== customerId && authProfile?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '您沒有權限清空此清單'
      });
    }

    const { error } = await supabase
      .from('customer_current_list')
      .delete()
      .eq('customer_id', customerId);

    if (error) throw error;

    console.log(`✅ [customer-list] 清單已清空`);

    res.json({
      success: true,
      message: '清單已清空'
    });
  } catch (error) {
    console.error('❌ [customer-list] 清空錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '清空清單失敗',
      details: error.message
    });
  }
});

export default router;
