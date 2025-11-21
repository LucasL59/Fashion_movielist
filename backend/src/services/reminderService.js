/**
 * 提醒服務
 * 
 * 處理定期提醒通知
 */

import cron from 'node-cron';
import { sendEmail } from '../config/graphClient.js';

let reminderJob = null;

/**
 * 初始化提醒排程器
 */
export function initializeReminderScheduler() {
  const cronSchedule = process.env.REMINDER_CRON_SCHEDULE || '0 9 1 * *'; // 預設每月 1 號早上 9 點
  const message = '請記得上傳本月的影片清單';
  const targetEmail = process.env.ADMIN_EMAIL;
  
  if (!targetEmail) {
    console.warn('⚠️  未設定管理員 Email，提醒功能將無法使用');
    return;
  }
  
  // 驗證 cron 格式
  if (!cron.validate(cronSchedule)) {
    console.error('❌ 無效的 cron 排程格式:', cronSchedule);
    return;
  }
  
  // 建立排程任務
  reminderJob = cron.schedule(cronSchedule, async () => {
    console.log('⏰ 執行提醒任務...');
    await sendReminderNow(message, targetEmail);
  });
  
  console.log(`✅ 提醒排程已設定: ${cronSchedule}`);
}

/**
 * 更新提醒排程
 * 
 * @param {string} cronSchedule - Cron 排程格式
 * @param {string} message - 提醒訊息
 * @param {string} targetEmail - 目標 Email
 */
export function updateReminderSchedule(cronSchedule, message, targetEmail) {
  // 驗證 cron 格式
  if (!cron.validate(cronSchedule)) {
    throw new Error('無效的 cron 排程格式');
  }
  
  // 停止現有排程
  if (reminderJob) {
    reminderJob.stop();
  }
  
  const email = targetEmail || process.env.ADMIN_EMAIL;
  const msg = message || '請記得上傳本月的影片清單';
  
  // 建立新排程
  reminderJob = cron.schedule(cronSchedule, async () => {
    console.log('⏰ 執行提醒任務...');
    await sendReminderNow(msg, email);
  });
  
  console.log(`✅ 提醒排程已更新: ${cronSchedule}`);
}

/**
 * 立即發送提醒
 * 
 * @param {string} message - 提醒訊息
 * @param {string} targetEmail - 目標 Email
 */
export async function sendReminderNow(message, targetEmail) {
  try {
    const email = targetEmail || process.env.ADMIN_EMAIL;
    const msg = message || '請記得上傳本月的影片清單';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (!email) {
      throw new Error('未設定目標 Email');
    }
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ 每月提醒通知</h1>
          </div>
          <div class="content">
            <p>您好：</p>
            <p><strong>${msg}</strong></p>
            <p>請點擊下方按鈕前往上傳頁面：</p>
            <div style="text-align: center;">
              <a href="${frontendUrl}/admin/upload" class="button">前往上傳頁面</a>
            </div>
            <p>感謝您的配合！</p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的提醒郵件。</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({
      to: email,
      subject: '每月提醒：上傳影片清單',
      body: emailBody
    });
    
    console.log(`✅ 提醒已發送至: ${email}`);
    
  } catch (error) {
    console.error('發送提醒錯誤:', error);
    throw error;
  }
}

