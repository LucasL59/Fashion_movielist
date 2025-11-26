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
 * @param {string} options.fromName - 寄件人顯示名稱（選填）
 */
export async function sendEmail({ to, subject, body, from, fromName }) {
  const client = await getGraphClient();
  const displayName = fromName || process.env.SENDER_NAME || 'MVI 影片清單系統';

  const aliasEmail = from || process.env.SENDER_EMAIL || process.env.ADMIN_EMAIL;
  const principalEmail =
    process.env.SENDER_PRINCIPAL_EMAIL || process.env.ADMIN_EMAIL || aliasEmail;

  if (!principalEmail) {
    throw new Error('未設定有效的寄件人帳號 (SENDER_PRINCIPAL_EMAIL 或 ADMIN_EMAIL)');
  }

  const buildMessage = (fromAddress) => ({
    message: {
      subject,
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
      ],
      from: {
        emailAddress: {
          address: fromAddress,
          name: displayName
        }
      }
    },
    saveToSentItems: 'true'
  });

  const sendThrough = async (mailboxAddress, fromAddress) => {
    await client.api(`/users/${mailboxAddress}/sendMail`).post(buildMessage(fromAddress));
    console.log(`✅ Email 已發送至 ${to} (寄件人: ${displayName} <${fromAddress}>)`);
  };

  try {
    await sendThrough(principalEmail, aliasEmail);
    return { success: true };
  } catch (error) {
    const shouldFallback =
      !from && process.env.ADMIN_EMAIL && principalEmail !== process.env.ADMIN_EMAIL;

    if (shouldFallback) {
      console.warn(
        `⚠️ 使用 ${principalEmail} 發送失敗，嘗試使用 ${process.env.ADMIN_EMAIL}`
      );

      try {
        await sendThrough(process.env.ADMIN_EMAIL, process.env.ADMIN_EMAIL);
        return { success: true };
      } catch (fallbackError) {
        console.error('使用備用帳號發送失敗:', fallbackError);
        throw new Error(`發送 Email 失敗: ${fallbackError.message}`);
      }
    }

    console.error('發送 Email 失敗:', error);
    throw new Error(`發送 Email 失敗: ${error.message}`);
  }
}

