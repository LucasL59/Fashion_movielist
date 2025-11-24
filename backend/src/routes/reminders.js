/**
 * 提醒路由
 * 
 * 處理提醒通知的設定和觸發
 */

import express from 'express';
import { updateReminderSchedule, sendReminderNow, getReminderConfig } from '../services/reminderService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { recordOperationLog } from '../services/operationLogService.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

/**
 * GET /api/reminders/settings
 * 
 * 取得目前提醒設定
 */
router.get('/settings', async (req, res) => {
  try {
    const config = await getReminderConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('取得提醒設定錯誤:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: '無法取得提醒設定' 
    });
  }
});

/**
 * POST /api/reminders/schedule
 * 
 * 更新提醒設定
 */
router.post('/schedule', async (req, res) => {
  try {
    // 接收完整的設定物件
    const config = req.body;
    
    // 更新排程
    const updatedConfig = await updateReminderSchedule(config);

    await recordOperationLog({
      req,
      action: 'settings.reminder_schedule',
      resourceType: 'system_settings',
      resourceId: 'reminder_config',
      description: `更新每月提醒排程設定：${config.enabled ? '啟用' : '停用'}`,
      metadata: {
        enabled: config.enabled,
        cronSchedule: config.cronSchedule,
        recipientType: config.recipientType
      }
    });
    
    res.json({
      success: true,
      message: '提醒設定已更新',
      data: updatedConfig
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

