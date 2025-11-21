/**
 * 上傳路由
 * 
 * 處理管理員上傳 Excel 影片清單
 */

import express from 'express';
import { parseExcelAndUpload } from '../services/excelService.js';
import { notifyCustomersNewList } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/upload
 * 
 * 上傳 Excel 檔案並解析影片清單
 */
router.post('/', async (req, res) => {
  try {
    // 檢查是否有上傳檔案
    if (!req.files || !req.files.file) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '請上傳 Excel 檔案' 
      });
    }
    
    const file = req.files.file;
    
    // 驗證檔案類型
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '只接受 Excel 檔案格式 (.xlsx, .xls)' 
      });
    }
    
    // 獲取上傳者資訊（從請求中）
    const uploaderId = req.body.userId || 'admin';
    
    // 從檔案名稱提取月份（例如: "UIP片單金隆11月.xlsx" -> "2024-11"）
    const fileName = file.name;
    let extractedMonth = null;
    
    // 嘗試從檔案名稱提取月份
    // 支援格式: "XX月", "11月", "2024-11", "202411" 等
    const monthPatterns = [
      /(\d{4})[年\-]?(\d{1,2})月?/,  // 2024年11月, 2024-11, 202411
      /(\d{1,2})月/,                  // 11月
    ];
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    for (const pattern of monthPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        if (match[2]) {
          // 有年份和月份
          const year = match[1];
          const month = String(match[2]).padStart(2, '0');
          extractedMonth = `${year}-${month}`;
        } else {
          // 只有月份，使用當前年份
          const month = String(match[1]).padStart(2, '0');
          extractedMonth = `${currentYear}-${month}`;
        }
        break;
      }
    }
    
    // 如果無法提取月份，使用當前月份
    if (!extractedMonth) {
      extractedMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    }
    
    const batchName = req.body.batchName || `${extractedMonth} 影片清單`;
    
    console.log(`📤 開始處理上傳: ${file.name}`);
    console.log(`📅 識別月份: ${extractedMonth}`);
    
    // 解析 Excel 並上傳到 Supabase
    const result = await parseExcelAndUpload(file, uploaderId, batchName, extractedMonth);
    
    console.log(`✅ 上傳成功: ${result.videoCount} 部影片`);
    
    // 發送通知給所有客戶
    try {
      await notifyCustomersNewList(result.batchId, batchName);
      console.log('📧 已發送通知給所有客戶');
    } catch (emailError) {
      console.error('發送通知失敗:', emailError);
      // 即使通知失敗，上傳仍然成功
    }
    
    res.json({
      success: true,
      message: '影片清單上傳成功',
      data: {
        batchId: result.batchId,
        batchName: result.batchName,
        videoCount: result.videoCount,
        uploadedAt: result.uploadedAt
      }
    });
    
  } catch (error) {
    console.error('上傳處理錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '上傳處理失敗'
    });
  }
});

export default router;

