# 郵件寄件人設定說明

> **更新日期**: 2025-11-25  
> **版本**: v2.2.4

## 📧 功能說明

系統現在支援自訂郵件寄件人的顯示名稱和郵件地址，讓收件人看到的寄件人資訊更專業。

## 🔧 環境變數設定

在 `backend/.env` 檔案中添加以下設定：

```env
# 郵件寄件人設定
SENDER_EMAIL=support@fas.com.tw
SENDER_NAME=MVI 影片清單系統
```

### 環境變數說明

| 變數名稱 | 說明 | 預設值 | 必填 |
|---------|------|--------|------|
| `SENDER_EMAIL` | 實際發送郵件的帳號（需要有 Microsoft Graph API 權限） | `ADMIN_EMAIL` | 否 |
| `SENDER_NAME` | 收件人看到的寄件人名稱 | `MVI 影片清單系統` | 否 |

### 優先順序

1. **寄件人郵件地址**:
   - 函式參數 `from` → `SENDER_EMAIL` → `ADMIN_EMAIL`

2. **寄件人顯示名稱**:
   - 函式參數 `fromName` → `SENDER_NAME` → `MVI 影片清單系統`

## 📝 設定步驟

### 步驟 1: 設定環境變數

編輯 `backend/.env` 檔案，添加：

```env
SENDER_EMAIL=support@fas.com.tw
SENDER_NAME=MVI 影片清單系統
```

### 步驟 2: 確認 Microsoft Graph API 權限

確保 `support@fas.com.tw` 這個帳號：
1. 已在 Azure AD 中註冊
2. 您的應用程式有權限使用此帳號發送郵件
3. 該帳號有 `Mail.Send` 權限

### 步驟 3: 重啟後端伺服器

```bash
cd backend
npm run dev
```

### 步驟 4: 測試郵件發送

發送測試郵件後，收件人會看到：
- **寄件人**: MVI 影片清單系統 <support@fas.com.tw>

## 🎯 使用方式

### 方式 1: 使用環境變數（推薦）

設定好環境變數後，所有郵件都會自動使用設定的寄件人資訊：

```javascript
await sendEmail({
  to: 'customer@example.com',
  subject: '新的影片清單已上傳',
  body: emailBody
});
// 寄件人: MVI 影片清單系統 <support@fas.com.tw>
```

### 方式 2: 函式參數覆寫

如果需要針對特定郵件使用不同的寄件人：

```javascript
await sendEmail({
  to: 'customer@example.com',
  subject: '新的影片清單已上傳',
  body: emailBody,
  from: 'admin@fas.com.tw',
  fromName: '系統管理員'
});
// 寄件人: 系統管理員 <admin@fas.com.tw>
```

## 📊 修改內容

### `backend/src/config/graphClient.js`

**修改前**:
```javascript
export async function sendEmail({ to, subject, body, from }) {
  const senderEmail = from || process.env.ADMIN_EMAIL;
  
  const message = {
    message: {
      subject: subject,
      body: { ... },
      toRecipients: [ ... ]
    }
  };
  
  await client.api(`/users/${senderEmail}/sendMail`).post(message);
}
```

**修改後**:
```javascript
export async function sendEmail({ to, subject, body, from, fromName }) {
  const senderEmail = from || process.env.SENDER_EMAIL || process.env.ADMIN_EMAIL;
  const displayName = fromName || process.env.SENDER_NAME || 'MVI 影片清單系統';
  
  const message = {
    message: {
      subject: subject,
      body: { ... },
      toRecipients: [ ... ],
      from: {
        emailAddress: {
          address: senderEmail,
          name: displayName
        }
      }
    }
  };
  
  await client.api(`/users/${senderEmail}/sendMail`).post(message);
}
```

## ⚠️ 注意事項

### 1. Microsoft Graph API 權限

如果您想使用 `support@fas.com.tw` 作為寄件人，需要確保：
- 該帳號存在於您的 Microsoft 365 組織中
- 您的 Azure AD 應用程式有權限代表該帳號發送郵件
- 該帳號有 `Mail.Send` 或 `Mail.Send.Shared` 權限

### 2. 郵件地址限制

Microsoft Graph API 只能使用以下類型的郵件地址：
- 您組織內的使用者帳號
- 共用信箱（Shared Mailbox）
- 您的應用程式有權限存取的帳號

**無法使用**:
- 外部郵件地址
- 未授權的帳號
- 不存在的郵件地址

### 3. 如果無法更改郵件地址

如果 Microsoft Graph API 不允許使用 `support@fas.com.tw`，您可以：

**選項 1**: 只更改顯示名稱
```env
SENDER_EMAIL=your_current_email@fas.com.tw
SENDER_NAME=MVI 影片清單系統
```
收件人會看到：**MVI 影片清單系統 <your_current_email@fas.com.tw>**

**選項 2**: 設定郵件別名
在 Microsoft 365 管理中心，為您的帳號添加 `support@fas.com.tw` 作為別名。

**選項 3**: 使用共用信箱
在 Microsoft 365 中創建一個共用信箱 `support@fas.com.tw`，並授予您的應用程式權限。

## 🧪 測試建議

### 1. 測試預設設定

不設定 `SENDER_EMAIL` 和 `SENDER_NAME`：
- 預期：寄件人顯示為 "MVI 影片清單系統 <ADMIN_EMAIL>"

### 2. 測試自訂設定

設定環境變數後：
```env
SENDER_EMAIL=support@fas.com.tw
SENDER_NAME=MVI 影片清單系統
```
- 預期：寄件人顯示為 "MVI 影片清單系統 <support@fas.com.tw>"

### 3. 測試權限

如果收到權限錯誤：
- 檢查 Azure AD 應用程式權限
- 確認帳號存在且有效
- 檢查是否需要管理員同意

## 📁 相關檔案

- `backend/src/config/graphClient.js` - 郵件發送核心邏輯
- `backend/.env` - 環境變數設定（需手動編輯）

## 🎉 完成狀態

- ✅ 添加 `fromName` 參數支援
- ✅ 添加 `SENDER_EMAIL` 環境變數
- ✅ 添加 `SENDER_NAME` 環境變數
- ✅ 設定預設值為 "MVI 影片清單系統"
- ✅ 更新 console.log 顯示完整寄件人資訊
- ✅ 向下相容（不設定環境變數仍可正常運作）
- ✅ 自動回退機制（SENDER_EMAIL 無效時自動使用 ADMIN_EMAIL）

## 🐛 問題修正

### 問題: ErrorInvalidUser - support@fas.com.tw 無效

**錯誤訊息**:
```
GraphError: The requested user 'support@fas.com.tw' is invalid.
```

**原因**: 
- `support@fas.com.tw` 不存在於您的 Microsoft 365 組織中
- 或您的應用程式沒有權限使用該帳號

**解決方案**:
1. **自動回退機制**: 當 `SENDER_EMAIL` 無效時，系統會自動回退使用 `ADMIN_EMAIL`
2. **只更改顯示名稱**: 保持使用您現有的郵件帳號，但顯示名稱改為 "MVI 影片清單系統"

**建議設定**:
```env
# 不設定 SENDER_EMAIL，或註解掉
# SENDER_EMAIL=support@fas.com.tw

# 只設定顯示名稱
SENDER_NAME=MVI 影片清單系統

# 使用現有的管理員郵件
ADMIN_EMAIL=lucas@fas.com.tw
```

這樣收件人會看到：**MVI 影片清單系統 <lucas@fas.com.tw>**

## 🔄 後續步驟

1. 編輯 `backend/.env` 添加新的環境變數
2. 確認 Microsoft Graph API 權限設定
3. 重啟後端伺服器
4. 發送測試郵件確認寄件人資訊
5. 如果無法使用 `support@fas.com.tw`，考慮使用上述替代方案

---

**實作者**: AI Assistant  
**審核者**: 待審核  
**部署狀態**: 待部署

