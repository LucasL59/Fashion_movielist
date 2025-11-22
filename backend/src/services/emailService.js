/**
 * Email 服務
 * 
 * 處理各種 Email 通知
 */

import { sendEmail } from '../config/graphClient.js';
import { supabase } from '../config/supabase.js';

const MAIL_EVENT_TYPES = {
  SELECTION_SUBMITTED: 'selection_submitted',
  BATCH_UPLOADED: 'batch_uploaded',
};

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
      .select('id, email, name');

    if (error) throw error;
    return (data || [])
      .filter((profile) => profile.email)
      .filter((profile) => !excludeIds.includes(profile.id));
  } catch (error) {
    console.error('取得內部收件人失敗:', error);
    return [];
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
 * 通知所有客戶有新的影片清單
 * 
 * @param {string} batchId - 批次 ID
 * @param {string} batchName - 批次名稱
 */
export async function notifyCustomersNewList(batchId, batchName) {
  try {
    // 查詢所有客戶
    const { data: customers, error } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('role', 'customer');
    
    if (error) throw error;
    
    if (!customers || customers.length === 0) {
      console.log('沒有客戶需要通知');
      return;
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
                <p>最新的影片清單 <strong>${batchName}</strong> 已上線，歡迎登入系統挑選本月想要播放的片單。</p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${frontendUrl}/movies" class="button">立即挑選影片</a>
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
        subject: `新的影片清單已上傳 - ${batchName}`,
        body: emailBody
      });
    });
    
    await Promise.all(emailPromises);
    console.log(`✅ 已發送通知給 ${customers.length} 位客戶`);

    // 通知內部訂閱者（預設 + 自訂）
    const { data: batch } = await supabase
      .from('batches')
      .select('id, uploader_id')
      .eq('id', batchId)
      .maybeSingle();

    const uploaderProfile = await getUploaderByBatch(batch);
    const defaultStaff = await getStaffRecipients(
      uploaderProfile?.id ? [uploaderProfile.id] : []
    );
    const internalRecipients = mergeRecipients(
      defaultStaff.map((staff) => staff.email),
      await getMailRecipientsByEvent(MAIL_EVENT_TYPES.BATCH_UPLOADED)
    );

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
                <p><strong>清單名稱：</strong>${batchName}</p>
                <p><strong>影片數量：</strong>${videoCount || 0} 部</p>
                <p><strong>通知時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
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
            subject: `新影片清單已上線 - ${batchName}`,
            body: internalBody,
          })
        )
      );
    }
    
  } catch (error) {
    console.error('通知客戶錯誤:', error);
    throw error;
  }
}

/**
 * 通知管理員客戶的選擇
 * 
 * @param {Object} options - 選項
 * @param {string} options.customerName - 客戶名稱
 * @param {string} options.customerEmail - 客戶 Email
 * @param {string} options.batchId - 批次 ID
 * @param {Array} options.videos - 選擇的影片陣列
 */
export async function notifyAdminCustomerSelection({ customerName, customerEmail, batchId, videos }) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    // 查詢批次資訊
    const { data: batch } = await supabase
      .from('batches')
      .select('id, name, uploader_id')
      .eq('id', batchId)
      .maybeSingle();

    const uploaderProfile = await getUploaderByBatch(batch);

    const recipients = mergeRecipients(
      adminEmail ? [adminEmail] : [],
      uploaderProfile?.email,
      await getMailRecipientsByEvent(MAIL_EVENT_TYPES.SELECTION_SUBMITTED)
    );

    if (recipients.length === 0) {
      console.warn('找不到任何選擇通知收件人，已跳過寄信');
      return;
    }
    
    // 建立影片清單 HTML - 質感優化版 (無圖片)
    const videoListHtml = videos.map((video, index) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 16px 12px; color: #999; font-size: 14px;">${String(index + 1).padStart(2, '0')}</td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 700; font-size: 15px; color: #333; margin-bottom: 4px;">${video.title}</div>
          <div style="font-size: 13px; color: #888;">${video.title_en || ''}</div>
        </td>
        <td style="padding: 16px 12px; color: #666; font-size: 14px; white-space: nowrap;">
          ${video.duration ? `${video.duration} 分鐘` : '-'}
        </td>
        <td style="padding: 16px 12px; white-space: nowrap;">
          <span style="background: #f5f5f5; color: #666; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${video.rating || '普遍級'}
          </span>
        </td>
      </tr>
    `).join('');
    
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
            <h1>影片選擇確認通知</h1>
          </div>
          <div class="content">
            <p style="margin-bottom: 24px; font-size: 15px; line-height: 1.6;">
              親愛的管理員，客戶 <strong>${customerName}</strong> 已經完成了本期的影片挑選，詳細清單如下：
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
                <span class="label">批次名稱</span>
                <span class="value">${batch?.name || '未知批次'}</span>
              </div>
              <div class="summary-item">
                <span class="label">選擇數量</span>
                <span class="value" style="color: #d93025;">${videos.length} 部影片</span>
              </div>
              <div class="summary-item">
                <span class="label">提交時間</span>
                <span class="value">${new Date().toLocaleString('zh-TW')}</span>
              </div>
            </div>
            
            <div class="section-title">已選影片清單</div>
            
            <table>
              <thead>
                <tr>
                  <th width="40">#</th>
                  <th>影片資訊</th>
                  <th width="80">片長</th>
                  <th width="80">分級</th>
                </tr>
              </thead>
              <tbody>
                ${videoListHtml}
              </tbody>
            </table>
            
            <p style="margin-top: 32px; font-size: 14px; color: #666; line-height: 1.6;">
              ※ 本郵件為系統自動發送，請依照此清單協助客戶進行後續影片安排。如需與客戶聯繫，請直接回覆此郵件。
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MVI 影片選擇系統 | Fashion Info Tech Co., Ltd.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await Promise.all(
      recipients.map((email) =>
        sendEmail({
          to: email,
          subject: `[影片選擇通知] ${customerName} - ${batch?.name || '新選擇'}`,
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

