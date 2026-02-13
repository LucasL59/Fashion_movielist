/**
 * 提醒服務
 * 
 * 處理定期提醒通知
 */

import cron from 'node-cron';
import { sendEmail } from '../config/graphClient.js';
import { supabase } from '../config/supabase.js';

let reminderJob = null;
const SETTING_KEY = 'reminder_config';

const DEFAULT_CONFIG = {
  enabled: false,
  cronSchedule: '0 9 1 * *', // 預設每月 1 號早上 9 點
  message: '請記得上傳本月的影片清單',
  recipientType: 'uploader', // 'uploader' | 'custom'
  extraEmails: []
};

/**
 * 從資料庫載入設定
 */
async function loadReminderConfig() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();
      
    if (error && error.code !== '42P01') { // 忽略 table 不存在錯誤
      console.warn('讀取提醒設定失敗:', error.message);
    }

    return { ...DEFAULT_CONFIG, ...(data?.value || {}) };
  } catch (error) {
    console.warn('載入提醒設定時發生錯誤:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 儲存設定到資料庫
 */
async function saveReminderConfig(config) {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: SETTING_KEY,
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('儲存提醒設定失敗:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('儲存提醒設定時發生錯誤:', error);
    // 這裡不 throw，以免影響記憶體中的排程更新
  }
}

/**
 * 初始化提醒排程器
 */
export async function initializeReminderScheduler() {
  const config = await loadReminderConfig();
  
  applySchedule(config);
  console.log('⏰ 提醒排程器已初始化');
}

function applySchedule(config) {
  // 停止現有排程
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
  }

  if (!config.enabled) {
    console.log('⏸️ 提醒功能目前設定為停用 (您可於管理介面啟用)');
    return;
  }

  // 驗證 cron 格式
  if (!cron.validate(config.cronSchedule)) {
    console.error('❌ 無效的 cron 排程格式:', config.cronSchedule);
    return;
  }

  // 建立排程任務（使用台灣時區，確保排程時間對應台灣當地時間）
  reminderJob = cron.schedule(config.cronSchedule, async () => {
    console.log('⏰ 執行提醒任務...');
    await executeReminder(config);
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log(`✅ 提醒排程已啟用: ${config.cronSchedule} (Asia/Taipei)`);
}

/**
 * 執行提醒發送邏輯
 */
async function executeReminder(config) {
  // 決定收件人
  let recipients = new Set();

  if (config.extraEmails && Array.isArray(config.extraEmails)) {
    config.extraEmails.forEach(email => recipients.add(email));
  }

  if (config.recipientType === 'uploader') {
    // 找出所有的 uploader
    const { data: uploaders } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'uploader');
      
    if (uploaders) {
      uploaders.forEach(u => {
        if (u.email) recipients.add(u.email);
      });
    }
  }
  
  // 如果沒有設定收件人，回退到環境變數 Admin
  if (recipients.size === 0 && process.env.ADMIN_EMAIL) {
    recipients.add(process.env.ADMIN_EMAIL);
  }

  const recipientList = Array.from(recipients);
  if (recipientList.length === 0) {
    console.warn('⚠️ 無法執行提醒：沒有有效的收件人');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
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
            <p><strong>${config.message || '請記得上傳本月的影片清單'}</strong></p>
            <p>請點擊下方按鈕前往上傳頁面：</p>
            <div style="text-align: center;">
              <a href="${frontendUrl}/admin" class="button">前往上傳頁面</a>
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

  // 逐一發送
  for (const email of recipientList) {
    try {
      await sendEmail({
        to: email,
        subject: '每月提醒：上傳影片清單',
        body: emailBody
      });
      console.log(`✅ 提醒已發送至: ${email}`);
    } catch (err) {
      console.error(`❌ 發送提醒至 ${email} 失敗:`, err);
    }
  }
}

/**
 * 取得目前設定
 */
export async function getReminderConfig() {
  return await loadReminderConfig();
}

/**
 * 更新提醒排程設定
 */
export async function updateReminderSchedule(newConfig) {
  const currentConfig = await loadReminderConfig();
  const config = { ...currentConfig, ...newConfig };
  
  // 驗證 cron 格式
  if (config.enabled && !cron.validate(config.cronSchedule)) {
    throw new Error('無效的 cron 排程格式');
  }
  
  await saveReminderConfig(config);
  applySchedule(config);
  
  return config;
}

/**
 * 立即發送提醒 (測試用)
 */
export async function sendReminderNow(message, targetEmail) {
  const config = {
    message,
    extraEmails: targetEmail ? [targetEmail] : [],
    recipientType: 'custom' // 強制使用傳入的 email
  };
  await executeReminder(config);
}

