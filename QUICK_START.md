# 快速開始指南

本指南將幫助您在 5-10 分鐘內在本地運行整個系統。

## 步驟 1：安裝依賴

### 前置需求
- Node.js 18+ 
- npm 或 yarn
- Git

### 安裝後端依賴

```bash
cd backend
npm install
```

### 安裝前端依賴

```bash
cd frontend
npm install
```

## 步驟 2：設定 Supabase

### 2.1 建立 Supabase 專案

1. 前往 https://supabase.com
2. 點擊「Start your project」
3. 建立新專案（選擇離您最近的區域）
4. 等待專案建立完成（約 2 分鐘）

### 2.2 執行資料庫腳本

1. 在 Supabase Dashboard 中，點擊左側「SQL Editor」
2. 點擊「New Query」
3. 複製 `database/schema.sql` 的全部內容並貼上
4. 點擊「Run」執行

### 2.3 建立 Storage Bucket

1. 點擊左側「Storage」
2. 點擊「Create a new bucket」
3. 名稱輸入：`movie-thumbnails`
4. 勾選「Public bucket」
5. 點擊「Create bucket」

### 2.4 獲取 API 金鑰

1. 點擊左側「Settings」→「API」
2. 複製以下資訊：
   - **Project URL**
   - **anon public** key
   - **service_role** key（點擊眼睛圖示顯示）

## 步驟 3：設定 Azure AD（Microsoft Graph API）

### 3.1 註冊應用程式

1. 前往 https://portal.azure.com
2. 搜尋「Azure Active Directory」
3. 點擊「App registrations」→「New registration」
4. 填寫：
   - Name: `Movie Selection System`
   - Supported account types: 選擇第一個選項
   - Redirect URI: 留空
5. 點擊「Register」

### 3.2 設定權限

1. 在應用程式頁面，點擊「API permissions」
2. 點擊「Add a permission」
3. 選擇「Microsoft Graph」→「Application permissions」
4. 搜尋並勾選「Mail.Send」
5. 點擊「Add permissions」
6. 點擊「Grant admin consent」（需要管理員權限）

### 3.3 建立 Client Secret

1. 點擊「Certificates & secrets」
2. 點擊「New client secret」
3. 描述：`Movie Selection API`
4. 過期時間：選擇適當的期限
5. 點擊「Add」
6. **立即複製 Secret 的 Value**（之後無法再查看）

### 3.4 獲取必要資訊

在「Overview」頁面複製：
- **Application (client) ID**
- **Directory (tenant) ID**

## 步驟 4：設定環境變數

### 4.1 後端環境變數

在 `backend` 目錄建立 `.env` 檔案：

```bash
cd backend
cp .env.example .env
```

編輯 `.env` 並填入以下資訊：

```env
PORT=3000
NODE_ENV=development

# Supabase（從步驟 2.4 獲取）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Azure AD（從步驟 3.4 獲取）
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id

# Admin Email（您的管理員 Email）
ADMIN_EMAIL=your_email@example.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Reminder Schedule（可選）
REMINDER_CRON_SCHEDULE=0 9 1 * *
```

### 4.2 前端環境變數

在 `frontend` 目錄建立 `.env` 檔案：

```bash
cd frontend
cp .env.example .env
```

編輯 `.env` 並填入：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

## 步驟 5：啟動應用程式

### 5.1 啟動後端

```bash
cd backend
npm run dev
```

您應該看到：
```
🚀 伺服器運行於 http://localhost:3000
📝 環境: development
⏰ 提醒排程器已初始化
```

### 5.2 啟動前端

開啟新的終端機視窗：

```bash
cd frontend
npm run dev
```

您應該看到：
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 步驟 6：測試系統

### 6.1 註冊管理員帳號

1. 開啟瀏覽器訪問 http://localhost:5173
2. 點擊「立即註冊」
3. 填寫資訊並註冊
4. 檢查 Email 信箱驗證（可能在垃圾郵件）

### 6.2 設定管理員權限

由於第一個註冊的用戶預設是 `customer`，需要手動改為 `admin`：

1. 前往 Supabase Dashboard
2. 點擊「Table Editor」→「profiles」
3. 找到您剛註冊的用戶
4. 將 `role` 欄位從 `customer` 改為 `admin`
5. 點擊「Save」

### 6.3 登入並測試上傳

1. 回到應用程式，登出後重新登入
2. 您應該會看到管理員儀表板
3. 準備一個 Excel 檔案（參考 `UIP片單金隆11月.xlsx`）
4. 點擊「選擇檔案」並上傳
5. 等待處理完成

### 6.4 註冊客戶帳號並測試選擇

1. 開啟無痕視窗或另一個瀏覽器
2. 註冊新的客戶帳號
3. 登入後點擊「選擇影片」
4. 選擇幾部影片
5. 點擊「提交選擇」
6. 檢查管理員 Email 是否收到通知

## 常見問題

### Q: 後端啟動失敗？

檢查：
1. `.env` 檔案是否正確填寫
2. Supabase 專案是否正常運行
3. 端口 3000 是否被佔用

### Q: 前端無法連接後端？

檢查：
1. 後端是否正常運行
2. `VITE_API_URL` 是否正確
3. 瀏覽器控制台是否有錯誤訊息

### Q: 上傳 Excel 失敗？

檢查：
1. Excel 檔案格式是否正確
2. 是否包含必要的欄位
3. 後端日誌中的錯誤訊息

### Q: Email 通知沒有收到？

檢查：
1. Azure AD 權限是否正確設定
2. Admin Email 是否正確
3. Email 是否在垃圾郵件中
4. 後端日誌中的錯誤訊息

## 下一步

- 閱讀 [README.md](README.md) 了解完整功能
- 閱讀 [DEPLOYMENT.md](DEPLOYMENT.md) 了解如何部署到雲端
- 查看 [database/README.md](database/README.md) 了解資料庫結構

## 需要幫助？

如果遇到問題：
1. 檢查瀏覽器控制台的錯誤訊息
2. 檢查後端終端機的日誌
3. 查看 Supabase Dashboard 的日誌
4. 參考各服務的官方文件

祝您使用愉快！🎬

