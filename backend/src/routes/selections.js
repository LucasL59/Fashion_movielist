/**
 * 選擇路由
 * 
 * 處理客戶的影片選擇
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { notifyAdminCustomerSelection } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/selections
 * 
 * 客戶提交影片選擇
 */
router.post('/', async (req, res) => {
  try {
    const { userId, batchId, videoIds, customerName, customerEmail } = req.body;
    
    // 驗證必要欄位
    if (!userId || !batchId || !videoIds || !Array.isArray(videoIds)) {
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
    
    // 發送通知給管理員
    try {
      await notifyAdminCustomerSelection({
        customerName: customerName || userId,
        customerEmail: customerEmail || 'unknown@example.com',
        batchId,
        videos: selectedVideos || []
      });
      console.log('📧 已發送通知給管理員');
    } catch (emailError) {
      console.error('發送通知失敗:', emailError);
      // 即使通知失敗，選擇仍然成功
    }
    
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

export default router;

