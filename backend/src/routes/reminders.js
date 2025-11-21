/**
 * 提醒路由
 * 
 * 處理提醒通知的設定和觸發
 */

import express from 'express';
import { updateReminderSchedule, sendReminderNow } from '../services/reminderService.js';

const router = express.Router();

/**
 * POST /api/reminders/schedule
 * 
 * 設定提醒排程
 */
router.post('/schedule', async (req, res) => {
  try {
    const { cronSchedule, message, targetEmail } = req.body;
    
    if (!cronSchedule) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: '請提供 cron 排程格式' 
      });
    }
    
    // 更新排程
    updateReminderSchedule(cronSchedule, message, targetEmail);
    
    res.json({
      success: true,
      message: '提醒排程已更新',
      data: {
        cronSchedule,
        message: message || '預設提醒訊息',
        targetEmail: targetEmail || process.env.ADMIN_EMAIL
      }
    });
    
  } catch (error) {
    console.error('設定提醒排程錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '設定提醒排程失敗'
    });
  }
});

/**
 * POST /api/reminders/send
 * 
 * 立即發送提醒（測試用）
 */
router.post('/send', async (req, res) => {
  try {
    const { message, targetEmail } = req.body;
    
    await sendReminderNow(message, targetEmail);
    
    res.json({
      success: true,
      message: '提醒已發送'
    });
    
  } catch (error) {
    console.error('發送提醒錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || '發送提醒失敗'
    });
  }
});

export default router;

