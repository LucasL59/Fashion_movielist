/**
 * Email 服務
 * 
 * 處理各種 Email 通知
 */

import { sendEmail } from '../config/graphClient.js';
import { supabase } from '../config/supabase.js';
import { formatTaiwanDateTime, getTaiwanYear } from '../utils/timezone.js';

const MAIL_EVENT_TYPES = {
  SELECTION_SUBMITTED: 'selection_submitted',
  BATCH_UPLOADED: 'batch_uploaded',
};

/**
 * 檢查郵件通知是否啟用
 * @param {string} eventType - 事件類型
 * @returns {Promise<boolean>} - 是否啟用
 */
async function isMailNotificationEnabled(eventType) {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'mail_notifications')
      .maybeSingle();

    if (error) {
      console.warn('讀取郵件通知設定失敗，預設為啟用:', error.message);
      return true; // 預設啟用
    }

    if (!data || !data.value) {
      console.warn('找不到郵件通知設定，預設為啟用');
      return true; // 預設啟用
    }

    const eventSettings = data.value[eventType];
    return eventSettings?.enabled !== false; // 只有明確設為 false 才停用
  } catch (error) {
    console.error('檢查郵件通知設定時發生錯誤:', error);
    return true; // 發生錯誤時預設啟用，避免影響正常功能
  }
}

async function getMailRecipientsByEvent(eventType) {
  try {
    const { data, error } = await supabase
      .from('mail_rules')
      .select('recipient_email')
      .eq('event_type', eventType);

    if (error) throw error;
    return (data || [])
      .map((rule) => rule.recipient_email)
      .filter(Boolean);
  } catch (error) {
    console.error(`取得郵件規則失敗 (${eventType}):`, error);
    return [];
  }
}

export async function sendWelcomeEmail({ to, name }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const emailBody = `
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: 'Noto Sans TC', 'PingFang TC', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background:#f8f9fb; margin:0; padding:32px 8px; color:#1f2633; }
        .card { max-width:640px; margin:0 auto; background:#fff; border-radius:24px; border:1px solid rgba(15,23,42,0.06); box-shadow: 0 30px 80px rgba(15,23,42,0.08); overflow:hidden; }
        .hero { background:linear-gradient(135deg,#111827,#312e81); padding:40px; color:#fff; text-align:center; }
        .hero h1 { margin:0; font-size:28px; letter-spacing:2px; }
        .content { padding:40px; line-height:1.8; font-size:15px; }
        .button { display:inline-block; margin:24px 0; padding:14px 32px; border-radius:999px; background:#111827; color:#fff !important; text-decoration:none; font-weight:600; letter-spacing:1px; }
        .footer { padding:28px; font-size:12px; color:#94a3b8; text-align:center; background:#f8fafc; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="hero">
          <h1>MVI 影片選擇系統</h1>
          <p style="margin-top:12px; letter-spacing:3px; font-size:13px; opacity:.85;">歡迎加入</p>
        </div>
        <div class="content">
          <p>親愛的 ${name || '使用者'}，您好：</p>
          <p>歡迎加入 <strong>MVI 影片選擇系統</strong>。您可以使用註冊時設定的帳號密碼登入，立即開始管理您的專屬影片清單。</p>
          <p>若您不是此信件的預期收件者，請忽略本郵件或與客服聯繫。</p>
          <a class="button" href="${frontendUrl}/login" target="_blank" rel="noreferrer">前往登入</a>
          <p style="margin-top:32px; font-size:14px; color:#475569;">祝您觀影愉快！<br/>飛訊資訊科技有限公司</p>
        </div>
        <div class="footer">
          MVI 影片選擇系統 · Fashion Info Tech Co., Ltd. · 此信件為系統發送請勿直接回覆
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to, subject: '歡迎加入 MVI 影片選擇系統', body: emailBody })
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`
  const emailBody = `
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: 'Noto Sans TC', 'PingFang TC', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background:#0f172a; margin:0; padding:48px 16px; color:#0f172a; }
        .card { max-width:600px; margin:0 auto; background:linear-gradient(180deg,#ffffff 0%,#e2e8f0 120%); border-radius:28px; box-shadow:0 40px 90px rgba(15,23,42,0.35); overflow:hidden; }
        .header { padding:36px; text-align:center; border-bottom:1px solid rgba(148,163,184,0.2); }
        .header h1 { margin:0; font-size:24px; color:#0f172a; letter-spacing:2px; }
        .content { padding:36px; font-size:15px; line-height:1.8; color:#1e293b; }
        .badge { display:inline-block; padding:8px 16px; border-radius:999px; background:#e2e8f0; letter-spacing:2px; font-size:11px; margin-bottom:16px; color:#475569; }
        .button { display:inline-block; margin:24px 0; padding:14px 32px; border-radius:18px; background:#0f172a; color:#fff !important; text-decoration:none; font-weight:600; box-shadow:0 12px 30px rgba(15,23,42,0.45); }
        .footer { padding:24px; text-align:center; font-size:12px; color:#475569; background:#f8fafc; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">RESET PASSWORD</span>
          <h1>重設您的登入密碼</h1>
        </div>
        <div class="content">
          <p>${name || '親愛的使用者'}，您好：</p>
          <p>我們收到了您重設密碼的需求。請於 60 分鐘內點擊下方按鈕完成密碼重設。</p>
          <a class="button" href="${resetUrl}" target="_blank" rel="noreferrer">立即重設密碼</a>
          <p style="font-size:13px; color:#475569;">若您沒有提出此需求，請忽略本郵件，您的帳號安全不受影響。</p>
          <p style="font-size:13px; color:#94a3b8; margin-top:32px;">此連結為一次性，使用後將立即失效。</p>
        </div>
        <div class="footer">
          MVI 影片選擇系統 · Fashion Info Tech Co., Ltd.<br/>support@fas.com.tw
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail({ to, subject: '密碼重設指示｜MVI 影片選擇系統', body: emailBody })
}

async function getUploaderByBatch(batch) {
  if (!batch?.uploader_id) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('id', batch.uploader_id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('查詢上傳者資料失敗:', error);
    return null;
  }
}

async function getStaffRecipients(excludeIds = []) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .in('role', ['admin', 'uploader']); // 只查詢管理員和上傳者

    if (error) throw error;
    return (data || [])
      .filter((profile) => profile.email)
      .filter((profile) => !excludeIds.includes(profile.id));
  } catch (error) {
    console.error('取得內部收件人失敗:', error);
    return [];
  }
}

async function getAdminRecipients(excludeIds = []) {
  try {
    console.log('🔍 [getAdminRecipients] 開始查詢管理員，排除 ID:', excludeIds);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('role', 'admin');

    if (error) throw error;
    
    console.log('📊 [getAdminRecipients] 查詢到的管理員:', data);

    const admins = (data || [])
      .filter((profile) => profile.email)
      .filter((profile) => !excludeIds.includes(profile.id))
      .map((profile) => profile.email);
    
    console.log('✅ [getAdminRecipients] 過濾後的管理員郵箱:', admins);

    if (admins.length > 0) {
      return admins;
    }

    console.log('⚠️ [getAdminRecipients] 沒有找到管理員，使用環境變數 ADMIN_EMAIL');
    const fallbackEmails = process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean)
      : [];
    
    console.log('📧 [getAdminRecipients] 環境變數郵箱:', fallbackEmails);
    return fallbackEmails;
  } catch (error) {
    console.error('❌ [getAdminRecipients] 查詢管理員失敗，將回退至環境變數:', error);
    return process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean)
      : [];
  }
}

/**
 * 獲取所有管理員和上傳者的郵箱
 * 用於客戶提交影片選擇通知
 */
async function getAdminAndUploaderRecipients(excludeIds = []) {
  try {
    console.log('🔍 [getAdminAndUploaderRecipients] 開始查詢管理員和上傳者');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .in('role', ['admin', 'uploader']);

    if (error) throw error;
    
    console.log('📊 [getAdminAndUploaderRecipients] 查詢結果:', data);

    const recipients = (data || [])
      .filter((profile) => profile.email)
      .filter((profile) => !excludeIds.includes(profile.id))
      .map((profile) => profile.email);
    
    console.log('✅ [getAdminAndUploaderRecipients] 過濾後的郵箱:', recipients);

    if (recipients.length > 0) {
      return recipients;
    }

    // 回退到環境變數
    console.log('⚠️ [getAdminAndUploaderRecipients] 沒有找到收件人，使用環境變數');
    const fallbackEmails = process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL.split(',').map((email) => email.trim()).filter(Boolean)
      : [];
    
    return fallbackEmails;
  } catch (error) {
    console.error('❌ [getAdminAndUploaderRecipients] 查詢失敗:', error);
    return process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL.split(',').map((email) => email.trim()).filter(Boolean)
      : [];
  }
}

function mergeRecipients(...lists) {
  const emails = new Map();
  lists.flat().forEach((recipient) => {
    if (!recipient) return;
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    if (!email) return;
    if (!emails.has(email)) {
      emails.set(email, email);
    }
  });
  return Array.from(emails.values());
}

/**
 * 通知所有客戶有新的影片清單（統一通知入口）
 * 
 * @param {string} batchId - 批次 ID
 * @param {string} batchName - 批次名稱（可選，若無則從資料庫查詢）
 * @returns {Object} 包含寄送統計的物件 { customersSent, internalSent, totalSent }
 */
export async function notifyCustomersNewList(batchId, batchName = null) {
  try {
    // 檢查郵件通知是否啟用
    const isEnabled = await isMailNotificationEnabled(MAIL_EVENT_TYPES.BATCH_UPLOADED);
    if (!isEnabled) {
      console.log('📧 新影片清單上傳通知已停用，跳過發送');
      return { customersSent: 0, internalSent: 0, totalSent: 0, disabled: true };
    }
    // 查詢批次資訊（包含上傳者）
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, name, uploader_id')
      .eq('id', batchId)
      .maybeSingle();

    if (batchError) throw batchError;
    if (!batch) {
      throw new Error('找不到指定的批次');
    }

    const finalBatchName = batchName || batch.name;
    
    // 查詢所有客戶
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('role', 'customer');
    
    if (customersError) throw customersError;
    
    if (!customers || customers.length === 0) {
      console.log('沒有客戶需要通知');
      return { customersSent: 0, internalSent: 0, totalSent: 0 };
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // 發送 Email 給每個客戶
    const emailPromises = customers.map(customer => {
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Noto Sans TC', 'PingFang TC', sans-serif; line-height: 1.8; color: #3f3a36; background-color: #fdf7f2; margin: 0; padding: 0; }
            .container { max-width: 640px; margin: 0 auto; padding: 24px; }
            .card { background: #fff; border-radius: 16px; border: 1px solid #f0e0d6; overflow: hidden; box-shadow: 0 20px 45px rgba(89, 57, 47, 0.12); }
            .header { background-color: #d9b08c; color: #fff; padding: 28px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
            .content { padding: 32px; }
            .button { display: inline-block; background-color: #a6653f; color: #fff !important; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; letter-spacing: 1px; }
            .footer { text-align: center; padding: 24px; font-size: 12px; color: #8c7a71; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>新的影片清單已就緒</h1>
              </div>
              <div class="content">
                <p>親愛的 ${customer.name || '客戶'}，您好：</p>
                <p>最新的影片清單 <strong>${finalBatchName}</strong> 已上線，歡迎登入系統調整您的影片清單。</p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${frontendUrl}/movies" class="button">立即調整清單</a>
                </div>
                <p>如有任何需求或問題，歡迎與我們聯繫，我們會盡快協助。</p>
              </div>
              <div class="footer">
                <p>MVI 影片選擇系統｜飛訊資訊科技有限公司</p>
                <p>此信件為系統通知，請勿直接回覆。</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return sendEmail({
        to: customer.email,
        subject: `新的影片清單已上傳 - ${finalBatchName}`,
        body: emailBody
      });
    });
    
    await Promise.all(emailPromises);
    console.log(`✅ 已發送通知給 ${customers.length} 位客戶`);

    // 通知所有非客戶使用者（管理員、上傳者，排除本次上傳者本人）
    const uploaderProfile = await getUploaderByBatch(batch);
    const uploaderIdToExclude = uploaderProfile?.id ? [uploaderProfile.id] : [];
    
    // 取得所有非客戶使用者（排除本次上傳者）
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .order('name', { ascending: true });
    
    if (usersError) throw usersError;
    
    const defaultRecipients = (allUsers || [])
      .filter((user) => user.role !== 'customer') // 排除客戶，避免重複通知
      .filter((user) => !uploaderIdToExclude.includes(user.id))
      .filter((user) => user.email);
    
    // 合併郵件管理中的額外收件人
    const extraRecipients = await getMailRecipientsByEvent(MAIL_EVENT_TYPES.BATCH_UPLOADED);
    
    const internalRecipients = mergeRecipients(
      defaultRecipients.map((user) => user.email),
      extraRecipients
    );

    let internalSentCount = 0;

    if (internalRecipients.length > 0) {
      const { count: videoCount } = await supabase
        .from('videos')
        .select('*', { head: true, count: 'exact' })
        .eq('batch_id', batchId);

      const internalBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Noto Sans TC', sans-serif; background-color: #f6f1ec; color: #3f3a36; }
            .container { max-width: 640px; margin: 0 auto; padding: 32px; }
            .card { background: #fff; border-radius: 18px; border: 1px solid #ecd9cf; padding: 32px; box-shadow: 0 25px 45px rgba(87, 57, 44, 0.15); }
            .card h1 { margin-top: 0; color: #a6653f; font-size: 22px; letter-spacing: 1px; }
            .info { background: #fdf7f2; border-radius: 12px; padding: 20px; border: 1px dashed #e0c9ba; }
            .info p { margin: 0 0 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <h1>新影片清單通知</h1>
              <div class="info">
                <p><strong>清單名稱：</strong>${finalBatchName}</p>
                <p><strong>影片數量：</strong>${videoCount || 0} 部</p>
                <p><strong>通知時間：</strong>${formatTaiwanDateTime()}</p>
              </div>
              <p style="margin-top: 24px;">此通知僅發送給內部管理人員，提醒最新批次已經完成上傳。</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await Promise.all(
        internalRecipients.map((email) =>
          sendEmail({
            to: email,
            subject: `新影片清單已上線 - ${finalBatchName}`,
            body: internalBody,
          })
        )
      );
      
      internalSentCount = internalRecipients.length;
      console.log(`✅ 已發送內部通知給 ${internalSentCount} 位人員`);
    }
    
    return {
      customersSent: customers.length,
      internalSent: internalSentCount,
      totalSent: customers.length + internalSentCount
    };
    
  } catch (error) {
    console.error('通知客戶錯誤:', error);
    throw error;
  }
}

/**
 * 通知管理員客戶的選擇
 * 
 * @param {Object} options - 選項
 * @param {string} options.customerId - 客戶 ID
 * @param {string} options.customerName - 客戶名稱
 * @param {string} options.customerEmail - 客戶 Email
 * @param {number} options.totalCount - 當前清單總數
 * @param {Array} options.addedVideos - 新增的影片陣列（前端已去重）
 * @param {Array} options.removedVideos - 移除的影片陣列
 */
export async function notifyAdminCustomerSelection({ customerId, customerName, customerEmail, totalCount, addedVideos = [], removedVideos = [] }) {
  try {
    // 檢查郵件通知是否啟用
    const isEnabled = await isMailNotificationEnabled(MAIL_EVENT_TYPES.SELECTION_SUBMITTED);
    if (!isEnabled) {
      console.log('📧 客戶提交影片選擇通知已停用，跳過發送');
      return { disabled: true };
    }

    // 獲取收件人列表（所有管理員 + 所有上傳者 + 郵件規則收件人）
    const adminAndUploaderRecipients = await getAdminAndUploaderRecipients([])
    console.log('👥 [notifyAdminCustomerSelection] 管理員和上傳者收件人:', adminAndUploaderRecipients);
    
    const mailRuleRecipients = await getMailRecipientsByEvent(MAIL_EVENT_TYPES.SELECTION_SUBMITTED);
    console.log('📧 [notifyAdminCustomerSelection] 郵件規則收件人:', mailRuleRecipients);
    
    const recipients = mergeRecipients(
      adminAndUploaderRecipients,
      mailRuleRecipients
    );
    
    console.log('✉️ [notifyAdminCustomerSelection] 最終收件人列表:', recipients);

    if (recipients.length === 0) {
      console.warn('⚠️ [notifyAdminCustomerSelection] 找不到任何選擇通知收件人，已跳過寄信');
      return;
    }
    
    // 前端已處理好新增和移除的影片清單（使用標題去重）
    console.log(`📊 [notifyAdminCustomerSelection] 清單統計: 總數 ${totalCount}, 新增 ${addedVideos.length}, 移除 ${removedVideos.length}`);
    
    // 建立新增影片清單 HTML（包含月份信息）
    let addedSectionHtml = '';
    if (addedVideos.length > 0) {
      const addedListHtml = addedVideos.map((video, index) => {
        // 格式化月份顯示（例如：2025-12 → 2025年12月）
        let monthDisplay = '';
        if (video.month && video.month !== 'Unknown') {
          const [year, month] = video.month.split('-');
          monthDisplay = `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 6px;">${year}年${month}月</span>`;
        }
        
        return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 16px 12px; color: #999; font-size: 14px;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 16px 12px;">
            <div style="font-weight: 700; font-size: 15px; color: #333; margin-bottom: 4px;">
              ${video.title}
              <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">上架</span>
              ${monthDisplay}
            </div>
            <div style="font-size: 13px; color: #888;">${video.title_en || ''}</div>
          </td>
        </tr>
      `;
      }).join('');
      
      addedSectionHtml = `
        <div style="margin-bottom: 24px;">
          <div class="section-title" style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #10b981;">
            ✅ 新上架影片（共 ${addedVideos.length} 部）
            <span style="font-size: 12px; color: #666; font-weight: 400; margin-left: 8px;">（藍色標籤為影片來源月份）</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: 2px solid #f0f0f0;" width="40">#</th>
                <th style="text-align: left; padding: 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: 2px solid #f0f0f0;">影片資訊</th>
              </tr>
            </thead>
            <tbody>
              ${addedListHtml}
            </tbody>
          </table>
        </div>
      `;
    }
    
    // 建立移除影片清單 HTML（包含月份信息）
    let removedSectionHtml = '';
    if (removedVideos.length > 0) {
      const removedListHtml = removedVideos.map((video, index) => {
        // 格式化月份顯示（例如：2025-12 → 2025年12月）
        let monthDisplay = '';
        if (video.month && video.month !== 'Unknown') {
          const [year, month] = video.month.split('-');
          monthDisplay = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 6px;">${year}年${month}月</span>`;
        }
        
        return `
        <tr style="border-bottom: 1px solid #eee; opacity: 0.7;">
          <td style="padding: 16px 12px; color: #999; font-size: 14px;">${String(index + 1).padStart(2, '0')}</td>
          <td style="padding: 16px 12px;">
            <div style="font-weight: 700; font-size: 15px; color: #333; margin-bottom: 4px;">
              ${video.title}
              <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">下架</span>
              ${monthDisplay}
            </div>
            <div style="font-size: 13px; color: #888;">${video.title_en || ''}</div>
          </td>
        </tr>
      `;
      }).join('');
      
      removedSectionHtml = `
        <div style="margin-bottom: 24px;">
          <div class="section-title" style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #ef4444;">
            ❌ 下架影片（共 ${removedVideos.length} 部）
            <span style="font-size: 12px; color: #666; font-weight: 400; margin-left: 8px;">（紅色標籤為影片原本來源月份）</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: 2px solid #f0f0f0;" width="40">#</th>
                <th style="text-align: left; padding: 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: 2px solid #f0f0f0;">影片資訊</th>
              </tr>
            </thead>
            <tbody>
              ${removedListHtml}
            </tbody>
          </table>
        </div>
      `;
    }
    
    // 建立差異摘要 HTML
    let diffSummaryHtml = '';
    if (addedVideos.length > 0 || removedVideos.length > 0) {
      diffSummaryHtml = `
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #fde68a;">
          <div style="font-weight: 700; font-size: 15px; color: #92400e; margin-bottom: 12px;">📊 本次調整摘要</div>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 120px;">
              <div style="font-size: 12px; color: #92400e; margin-bottom: 4px;">目前總數</div>
              <div style="font-size: 24px; font-weight: 700; color: #78350f;">${totalCount}</div>
            </div>
            <div style="flex: 1; min-width: 120px;">
              <div style="font-size: 12px; color: #10b981; margin-bottom: 4px;">新增</div>
              <div style="font-size: 24px; font-weight: 700; color: #10b981;">${addedVideos.length}</div>
            </div>
            <div style="flex: 1; min-width: 120px;">
              <div style="font-size: 12px; color: #dc2626; margin-bottom: 4px;">移除</div>
              <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${removedVideos.length}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 0; color: #333; }
          .container { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
          .header { background: #1a1a1a; padding: 32px; text-align: center; }
          .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 600; letter-spacing: 1px; }
          .content { padding: 40px; }
          .summary-card { background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #eef0f2; }
          .summary-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
          .summary-item:last-child { margin-bottom: 0; }
          .label { color: #888; }
          .value { font-weight: 600; color: #333; }
          .section-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f0; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 12px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; border-bottom: 2px solid #f0f0f0; }
          .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>客戶清單調整通知</h1>
          </div>
          <div class="content">
            <p style="margin-bottom: 24px; font-size: 15px; line-height: 1.6;">
              親愛的管理員，客戶 <strong>${customerName}</strong> 已提交清單調整，詳細內容如下：
            </p>
            
            <div class="summary-card">
              <div class="summary-item">
                <span class="label">客戶名稱</span>
                <span class="value">${customerName}</span>
              </div>
              <div class="summary-item">
                <span class="label">客戶 Email</span>
                <span class="value">${customerEmail}</span>
              </div>
              <div class="summary-item">
                <span class="label">目前清單總數</span>
                <span class="value" style="color: #d93025;">${totalCount} 部影片</span>
              </div>
              <div class="summary-item">
                <span class="label">提交時間</span>
                <span class="value">${formatTaiwanDateTime()}</span>
              </div>
            </div>
            
            ${diffSummaryHtml}
            
            ${addedSectionHtml}
            
            ${removedSectionHtml}
            
            <p style="margin-top: 32px; font-size: 14px; color: #666; line-height: 1.6;">
              ※ 本郵件為系統自動發送，請依照此清單進行影片上架/下架作業。如需與客戶聯繫，請直接回覆此郵件。
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${getTaiwanYear()} MVI 影片選擇系統 | Fashion Info Tech Co., Ltd.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await Promise.all(
      recipients.map((email) =>
        sendEmail({
          to: email,
          subject: `[清單調整通知] ${customerName} 已更新影片清單`,
          body: emailBody,
        })
      )
    );
    
    console.log(`✅ 已發送通知給 ${recipients.length} 位收件人`);
    
  } catch (error) {
    console.error('通知管理員錯誤:', error);
    throw error;
  }
}

