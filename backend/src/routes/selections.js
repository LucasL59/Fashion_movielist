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
 * GET /api/selections/previous/:currentBatchId
 * 
 * 獲取用戶在上一個月批次的選擇
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

export default router;

