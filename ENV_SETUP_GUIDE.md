# 環境變數設定完整指南

本指南詳細說明如何獲取和設定所有必要的環境變數。

## 目錄

1. [Supabase 設定](#supabase-設定)
2. [Azure AD 設定](#azure-ad-設定)
3. [環境變數配置](#環境變數配置)
4. [驗證設定](#驗證設定)

---

## Supabase 設定

### 步驟 1：建立 Supabase 專案

1. 前往 https://supabase.com
2. 點擊「Start your project」或「New Project」
3. 選擇您的組織（或建立新組織）
4. 填寫專案資訊：
   - **Name**: `movie-selection-system`（或您喜歡的名稱）
   - **Database Password**: 設定一個強密碼（請記住此密碼）
   - **Region**: 選擇離您最近的區域（例如：Singapore）
   - **Pricing Plan**: 選擇 Free 或 Pro
5. 點擊「Create new project」
6. 等待專案建立完成（約 2-3 分鐘）

### 步驟 2：執行資料庫腳本

1. 在 Supabase Dashboard 左側選單，點擊「SQL Editor」
2. 點擊右上角「New Query」
3. 開啟本專案的 `database/schema.sql` 檔案
4. 複製全部內容並貼到 SQL Editor
5. 點擊「Run」或按 `Ctrl+Enter` 執行
6. 確認執行成功（應該看到綠色的成功訊息）

### 步驟 3：建立 Storage Bucket

1. 在左側選單點擊「Storage」
2. 點擊「Create a new bucket」
3. 填寫資訊：
   - **Name**: `movie-thumbnails`（必須是這個名稱）
   - **Public bucket**: ✅ 勾選（讓圖片可以公開存取）
4. 點擊「Create bucket」

### 步驟 4：獲取 API 金鑰

1. 在左側選單點擊「Settings」（齒輪圖示）
2. 點擊「API」
3. 您會看到以下資訊：

#### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
複製此 URL，這是您的 `SUPABASE_URL`

#### API Keys

**anon public**（公開金鑰）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
這是您的 `SUPABASE_ANON_KEY`（用於前端）

**service_role**（服務金鑰）
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
點擊眼睛圖示顯示，這是您的 `SUPABASE_SERVICE_KEY`（用於後端）

⚠️ **重要**: `service_role` 金鑰擁有完整權限，請妥善保管，不要提交到 Git！

---

## Azure AD 設定

### 步驟 1：註冊 Azure AD 應用程式

1. 前往 https://portal.azure.com
2. 登入您的 Microsoft 帳號
3. 在搜尋欄輸入「Azure Active Directory」並點擊
4. 在左側選單點擊「App registrations」
5. 點擊「+ New registration」

### 步驟 2：填寫應用程式資訊

1. **Name**: `Movie Selection System`
2. **Supported account types**: 
   - 選擇「Accounts in this organizational directory only」
   - 或選擇「Accounts in any organizational directory」（如果需要多租戶）
3. **Redirect URI**: 暫時留空
4. 點擊「Register」

### 步驟 3：獲取 Client ID 和 Tenant ID

註冊完成後，您會看到「Overview」頁面：

**Application (client) ID**
```
12345678-1234-1234-1234-123456789abc
```
這是您的 `AZURE_CLIENT_ID`

**Directory (tenant) ID**
```
87654321-4321-4321-4321-cba987654321
```
這是您的 `AZURE_TENANT_ID`

### 步驟 4：建立 Client Secret

1. 在左側選單點擊「Certificates & secrets」
2. 點擊「Client secrets」標籤
3. 點擊「+ New client secret」
4. 填寫：
   - **Description**: `Movie Selection API Key`
   - **Expires**: 選擇適當的期限（建議 24 months）
5. 點擊「Add」
6. **立即複製 Value 欄位的值**（這是唯一一次可以看到完整值）

```
abcdefghijklmnopqrstuvwxyz123456789
```
這是您的 `AZURE_CLIENT_SECRET`

⚠️ **重要**: 離開此頁面後將無法再次查看完整的 Secret！

### 步驟 5：設定 API 權限

1. 在左側選單點擊「API permissions」
2. 點擊「+ Add a permission」
3. 選擇「Microsoft Graph」
4. 選擇「Application permissions」（不是 Delegated）
5. 在搜尋框輸入「Mail」
6. 展開「Mail」並勾選「Mail.Send」
7. 點擊「Add permissions」
8. **重要**: 點擊「Grant admin consent for [Your Organization]」
9. 確認授權（需要管理員權限）

您應該看到「Mail.Send」權限的狀態變成綠色勾勾 ✅

### 步驟 6：驗證設定

在「API permissions」頁面，確認您看到：

| API / Permissions name | Type | Admin consent |
|------------------------|------|---------------|
| Microsoft Graph / Mail.Send | Application | ✅ Granted |

---

## 環境變數配置

### 後端環境變數 (`backend/.env`)

建立 `backend/.env` 檔案並填入以下內容：

```env
# ==================== 伺服器配置 ====================
PORT=3000
NODE_ENV=development

# ==================== Supabase 配置 ====================
# 從 Supabase Dashboard → Settings → API 獲取
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==================== Azure AD 配置 ====================
# 從 Azure Portal → App registrations → Your App 獲取
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
AZURE_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456789
AZURE_TENANT_ID=87654321-4321-4321-4321-cba987654321

# ==================== 管理員配置 ====================
# 您的管理員 Email（用於接收通知和發送郵件）
ADMIN_EMAIL=your-email@example.com

# ==================== CORS 配置 ====================
# 前端 URL（開發環境）
FRONTEND_URL=http://localhost:5173

# ==================== 提醒配置 ====================
# Cron 格式：分 時 日 月 週
# 預設：每月 1 號早上 9:00
REMINDER_CRON_SCHEDULE=0 9 1 * *
```

### 前端環境變數 (`frontend/.env`)

建立 `frontend/.env` 檔案並填入以下內容：

```env
# ==================== Supabase 配置 ====================
# 從 Supabase Dashboard → Settings → API 獲取
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==================== API 配置 ====================
# 後端 API URL（開發環境）
VITE_API_URL=http://localhost:3000
```

### Cron 排程格式說明

```
 ┌───────────── 分鐘 (0 - 59)
 │ ┌───────────── 小時 (0 - 23)
 │ │ ┌───────────── 日期 (1 - 31)
 │ │ │ ┌───────────── 月份 (1 - 12)
 │ │ │ │ ┌───────────── 星期 (0 - 7) (0 和 7 都是星期日)
 │ │ │ │ │
 * * * * *
```

**常用範例**:
- `0 9 1 * *` - 每月 1 號早上 9:00
- `0 10 15 * *` - 每月 15 號早上 10:00
- `0 8 * * 1` - 每週一早上 8:00
- `30 14 * * *` - 每天下午 2:30

---

## 驗證設定

### 1. 驗證 Supabase 連接

在後端目錄執行：

```bash
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_KEY'
);
supabase.from('profiles').select('count').then(console.log);
"
```

如果成功，您會看到類似的輸出：
```json
{ data: [{ count: 0 }], error: null }
```

### 2. 驗證 Azure AD 設定

在後端目錄執行：

```bash
cd backend
npm install
npm run dev
```

檢查終端輸出，應該看到：
```
🚀 伺服器運行於 http://localhost:3000
📝 環境: development
⏰ 提醒排程器已初始化
```

如果沒有錯誤訊息，表示 Azure AD 設定正確。

### 3. 測試 API 端點

開啟瀏覽器或使用 curl：

```bash
curl http://localhost:3000/health
```

應該返回：
```json
{
  "status": "ok",
  "timestamp": "2024-11-21T...",
  "service": "Movie Selection API"
}
```

### 4. 測試前端連接

```bash
cd frontend
npm install
npm run dev
```

開啟瀏覽器訪問 http://localhost:5173

如果看到登入頁面，表示前端設定正確。

---

## 常見問題

### Q: Supabase 連接失敗？

**檢查項目**:
1. URL 格式是否正確（應該是 `https://xxxxx.supabase.co`）
2. 金鑰是否完整複製（沒有多餘空格）
3. 是否使用了正確的金鑰（後端用 service_role，前端用 anon）

### Q: Azure AD 認證失敗？

**檢查項目**:
1. Client ID 和 Tenant ID 是否正確
2. Client Secret 是否正確（注意不是 Secret ID）
3. API 權限是否已授予管理員同意
4. 是否選擇了「Application permissions」而非「Delegated permissions」

### Q: Email 無法發送？

**檢查項目**:
1. Azure AD 權限是否包含 `Mail.Send`
2. 管理員同意是否已授予
3. ADMIN_EMAIL 是否是有效的 Microsoft 365 帳號
4. 檢查後端日誌中的錯誤訊息

### Q: 圖片無法顯示？

**檢查項目**:
1. Storage bucket 名稱是否為 `movie-thumbnails`
2. Bucket 是否設為 Public
3. Storage 政策是否正確執行
4. 檢查瀏覽器控制台的網路請求

---

## 安全性提醒

### ⚠️ 絕對不要做的事

1. **不要提交 `.env` 檔案到 Git**
   - 已在 `.gitignore` 中排除
   - 確認執行 `git status` 時看不到 `.env`

2. **不要在前端使用 `service_role` 金鑰**
   - 前端只能使用 `anon` 金鑰
   - `service_role` 擁有完整權限，只能在後端使用

3. **不要在公開場合分享金鑰**
   - 不要貼在論壇、聊天室
   - 不要截圖包含金鑰的畫面

### ✅ 建議做的事

1. **定期更新 Client Secret**
   - 設定提醒在到期前更新
   - 更新後記得更新環境變數

2. **使用環境變數管理工具**
   - 開發環境：`.env` 檔案
   - 生產環境：平台的環境變數設定（Vercel, Render）

3. **備份重要資訊**
   - 將金鑰安全地儲存在密碼管理器
   - 記錄金鑰的建立日期和用途

---

## 生產環境設定

### Vercel（前端）

1. 前往 Vercel Dashboard
2. 選擇您的專案
3. 點擊「Settings」→「Environment Variables」
4. 添加以下變數：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`（設為您的後端 URL）

### Render（後端）

1. 前往 Render Dashboard
2. 選擇您的服務
3. 點擊「Environment」
4. 添加所有後端環境變數
5. 記得將 `NODE_ENV` 設為 `production`
6. 將 `FRONTEND_URL` 設為您的 Vercel URL

---

## 取得協助

如果您在設定過程中遇到問題：

1. **檢查官方文件**
   - [Supabase 文件](https://supabase.com/docs)
   - [Azure AD 文件](https://docs.microsoft.com/azure/active-directory/)

2. **查看錯誤日誌**
   - 後端終端輸出
   - 瀏覽器控制台
   - Supabase Dashboard 日誌

3. **參考本專案的其他文件**
   - `QUICK_START.md` - 快速開始
   - `DEPLOYMENT.md` - 部署指南
   - `README.md` - 專案說明

祝您設定順利！🚀

