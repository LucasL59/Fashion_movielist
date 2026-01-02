/**
 * 影片路由
 * 
 * 處理影片相關的 CRUD 操作
 */

import express from 'express';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { recordOperationLog } from '../services/operationLogService.js';

const router = express.Router();

/**
 * GET /api/videos/latest
 * 
 * 獲取最新批次的影片清單
 */
router.get('/latest', async (req, res) => {
  try {
    console.log(`🔍 [videos/latest] 查詢最新批次`);
    
    // 獲取最新批次（優先使用 is_latest 標記）
    const { data: latestBatch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('status', 'active')
      .eq('is_latest', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (batchError) {
      if (batchError.code === 'PGRST116') {
        // 沒有找到批次
        console.log(`⚠️ [videos/latest] 未找到最新批次`);
        return res.json({
          success: true,
          data: {
            batch: null,
            videos: []
          }
        });
      }
      throw batchError;
    }
    
    // 獲取該批次的影片
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('batch_id', latestBatch.id)
      .order('row_number', { ascending: true });
    
    if (videosError) throw videosError;
    
    console.log(`✅ [videos/latest] 找到批次 ${latestBatch.name}，包含 ${videos.length} 部影片`);
    
    res.json({
      success: true,
      data: {
        batch: latestBatch,
        videos: videos || []
      }
    });
    
  } catch (error) {
    console.error('❌ [videos/latest] 錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取影片清單失敗'
    });
  }
});

/**
 * GET /api/videos/batches
 * 
 * 獲取所有批次列表
 */
router.get('/batches', async (req, res) => {
  try {
    const { data: batches, error } = await supabase
      .from('batches')
      .select('*, videos(count)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: batches
    });
    
  } catch (error) {
    console.error('獲取批次列表失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取批次列表失敗'
    });
  }
});

/**
 * GET /api/videos/by-month/:month
 * 
 * 獲取指定月份的影片清單
 */
router.get('/by-month/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    console.log(`🔍 [videos/by-month] 查詢月份: ${month}`);
    
    // 獲取該月份最新的批次（使用 is_latest 標記）
    const { data: latestBatch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('month', month)
      .eq('status', 'active')
      .eq('is_latest', true)
      .single();
    
    if (batchError) {
      if (batchError.code === 'PGRST116') {
        // 沒有找到該月份的批次
        console.log(`⚠️ [videos/by-month] 未找到 ${month} 的批次`);
        return res.json({
          success: true,
          data: {
            batch: null,
            videos: []
          }
        });
      }
      throw batchError;
    }
    
    // 獲取該批次的影片
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('batch_id', latestBatch.id)
      .order('row_number', { ascending: true });
    
    if (videosError) throw videosError;
    
    console.log(`✅ [videos/by-month] 找到批次 ${latestBatch.name}，包含 ${videos.length} 部影片`);
    
    res.json({
      success: true,
      data: {
        batch: latestBatch,
        videos: videos || []
      }
    });
    
  } catch (error) {
    console.error('❌ [videos/by-month] 錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取影片清單失敗'
    });
  }
});

/**
 * GET /api/videos/months
 * 
 * 獲取所有可用的月份列表
 */
router.get('/months', async (req, res) => {
  try {
    console.log(`🔍 [videos/months] 查詢可用月份`);
    
    // 只返回最新批次的月份
    const { data: batches, error } = await supabase
      .from('batches')
      .select('month, name, created_at')
      .eq('status', 'active')
      .eq('is_latest', true)
      .order('month', { ascending: false });
    
    if (error) throw error;
    
    // 格式化為物件陣列，包含月份和批次名稱
    const monthsData = batches
      .filter(b => b.month) // 過濾掉沒有月份的
      .map(b => ({
        month: b.month,
        batchName: b.name,
        createdAt: b.created_at
      }));
    
    // 按月份去重（保留最新的）
    const uniqueMonths = [];
    const seenMonths = new Set();
    
    for (const item of monthsData) {
      if (!seenMonths.has(item.month)) {
        seenMonths.add(item.month);
        uniqueMonths.push(item);
      }
    }
    
    console.log(`✅ [videos/months] 找到 ${uniqueMonths.length} 個可用月份`);
    
    res.json({
      success: true,
      data: uniqueMonths,
      count: uniqueMonths.length
    });
    
  } catch (error) {
    console.error('❌ [videos/months] 錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取月份列表失敗'
    });
  }
});

/**
 * GET /api/videos/:id
 * 
 * 獲取單一影片詳細資訊
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: '找不到該影片'
        });
      }
      throw error;
    }
    
    res.json({
      success: true,
      data: video
    });
    
  } catch (error) {
    console.error('獲取影片失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '獲取影片失敗'
    });
  }
});

/**
 * PUT /api/videos/:id
 * 
 * 更新影片資訊（admin 和 uploader）
 */
router.put('/:id', requireAuth, requireRoles(['admin', 'uploader']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // 移除不應該被更新的欄位
    delete updates.id;
    delete updates.batch_id;
    delete updates.created_at;
    delete updates.updated_at;
    
    // 如果有上傳新圖片
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail;
      
      // 驗證圖片類型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(thumbnailFile.mimetype)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '只接受圖片檔案 (JPEG, PNG, GIF, WebP)'
        });
      }
      
      // 上傳到 Supabase Storage
      const fileExt = path.extname(thumbnailFile.name);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `thumbnails/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, thumbnailFile.data, {
          contentType: thumbnailFile.mimetype,
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // 獲取公開 URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);
      
      updates.thumbnail_url = publicUrl;
    }
    
    // 更新資料庫
    const { data: video, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    await recordOperationLog({
      req,
      action: 'videos.update',
      resourceType: 'video',
      resourceId: id,
      description: `更新影片：${video.title || id}`,
      metadata: {
        updatedFields: Object.keys(updates),
        hasNewThumbnail: Boolean(req.files && req.files.thumbnail),
      },
    })

    res.json({
      success: true,
      message: '影片資訊已更新',
      data: video
    });
    
  } catch (error) {
    console.error('更新影片失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '更新影片失敗'
    });
  }
});

/**
 * DELETE /api/videos/:id
 * 
 * 刪除影片（僅 admin）
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先獲取影片資訊以刪除圖片
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('thumbnail_url')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // 如果有圖片，從 Storage 刪除
    if (video.thumbnail_url) {
      try {
        const urlPath = new URL(video.thumbnail_url).pathname;
        const filePath = urlPath.split('/videos/')[1];
        if (filePath) {
          await supabase.storage
            .from('videos')
            .remove([filePath]);
        }
      } catch (storageError) {
        console.error('刪除圖片失敗:', storageError);
        // 繼續刪除資料庫記錄
      }
    }
    
    // 刪除資料庫記錄
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      success: true,
      message: '影片已刪除'
    });
    
  } catch (error) {
    console.error('刪除影片失敗:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || '刪除影片失敗'
    });
  }
});

export default router;
