/**
 * Email 服務
 * 
 * 處理各種 Email 通知
 */

import { sendEmail } from '../config/graphClient.js';
import { supabase } from '../config/supabase.js';

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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📽️ 新的影片清單已上傳</h1>
            </div>
            <div class="content">
              <p>親愛的 ${customer.name || '客戶'}，您好：</p>
              <p>我們剛剛上傳了新的影片清單：<strong>${batchName}</strong></p>
              <p>請點擊下方按鈕查看並選擇您想要的影片：</p>
              <div style="text-align: center;">
                <a href="${frontendUrl}/movies" class="button">查看影片清單</a>
              </div>
              <p>如有任何問題，請隨時與我們聯繫。</p>
              <p>祝您觀影愉快！</p>
            </div>
            <div class="footer">
              <p>此為系統自動發送的郵件，請勿直接回覆。</p>
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
    
    if (!adminEmail) {
      console.warn('未設定管理員 Email，跳過通知');
      return;
    }
    
    // 查詢批次資訊
    const { data: batch } = await supabase
      .from('batches')
      .select('name')
      .eq('id', batchId)
      .single();
    
    // 建立影片清單 HTML
    const videoListHtml = videos.map((video, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">${index + 1}</td>
        <td style="padding: 12px;">${video.title}</td>
        <td style="padding: 12px;">${video.title_en || '-'}</td>
        <td style="padding: 12px;">${video.duration ? video.duration + ' 分鐘' : '-'}</td>
        <td style="padding: 12px;">${video.rating || '-'}</td>
      </tr>
    `).join('');
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 15px; border-left: 4px solid #059669; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; background-color: white; margin: 20px 0; }
          th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ 客戶已提交影片選擇</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <p><strong>客戶名稱：</strong>${customerName}</p>
              <p><strong>客戶 Email：</strong>${customerEmail}</p>
              <p><strong>批次名稱：</strong>${batch?.name || '未知批次'}</p>
              <p><strong>選擇數量：</strong>${videos.length} 部影片</p>
              <p><strong>提交時間：</strong>${new Date().toLocaleString('zh-TW')}</p>
            </div>
            
            <h2>選擇的影片清單：</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>片名</th>
                  <th>英文片名</th>
                  <th>片長</th>
                  <th>級別</th>
                </tr>
              </thead>
              <tbody>
                ${videoListHtml}
              </tbody>
            </table>
            
            <p>請盡快為客戶準備所選影片。</p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的郵件。</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({
      to: adminEmail,
      subject: `客戶影片選擇通知 - ${customerName}`,
      body: emailBody
    });
    
    console.log(`✅ 已發送通知給管理員: ${adminEmail}`);
    
  } catch (error) {
    console.error('通知管理員錯誤:', error);
    throw error;
  }
}

