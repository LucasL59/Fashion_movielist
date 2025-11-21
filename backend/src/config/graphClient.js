/**
 * Microsoft Graph API 客戶端配置
 * 
 * 用於發送 Email 通知
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import 'isomorphic-fetch';
import dotenv from 'dotenv';

dotenv.config();

// 驗證必要的環境變數
if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET || !process.env.AZURE_TENANT_ID) {
  console.warn('⚠️  警告: 缺少 Azure AD 環境變數，Email 功能將無法使用');
}

// MSAL 配置
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

/**
 * 獲取 Access Token
 */
async function getAccessToken() {
  try {
    const result = await cca.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });
    
    return result.accessToken;
  } catch (error) {
    console.error('獲取 Access Token 失敗:', error);
    throw new Error('無法獲取 Microsoft Graph API 授權');
  }
}

/**
 * 建立 Graph Client
 */
export async function getGraphClient() {
  const accessToken = await getAccessToken();
  
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

/**
 * 發送 Email
 * 
 * @param {Object} options - Email 選項
 * @param {string} options.to - 收件人 Email
 * @param {string} options.subject - 主旨
 * @param {string} options.body - 內容（HTML 格式）
 * @param {string} options.from - 寄件人 Email（需要有權限）
 */
export async function sendEmail({ to, subject, body, from }) {
  try {
    const client = await getGraphClient();
    const senderEmail = from || process.env.ADMIN_EMAIL;
    
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      },
      saveToSentItems: 'true'
    };
    
    await client
      .api(`/users/${senderEmail}/sendMail`)
      .post(message);
    
    console.log(`✅ Email 已發送至 ${to}`);
    return { success: true };
  } catch (error) {
    console.error('發送 Email 失敗:', error);
    throw new Error(`發送 Email 失敗: ${error.message}`);
  }
}

