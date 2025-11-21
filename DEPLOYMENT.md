# 部署指南

本文件說明如何將影片選擇系統部署到雲端平台。

## 前置準備

### 1. Supabase 設定

1. 前往 [Supabase](https://supabase.com) 建立專案
2. 執行 `database/schema.sql` 中的 SQL 腳本
3. 在 Storage 中建立 `movie-thumbnails` bucket（設為 Public）
4. 記下以下資訊：
   - Project URL
   - Anon Key
   - Service Role Key

### 2. Azure AD 設定（Microsoft Graph API）

1. 前往 [Azure Portal](https://portal.azure.com)
2. 註冊新的應用程式
3. 設定 API 權限：
   - Microsoft Graph → Application permissions
   - Mail.Send
4. 建立 Client Secret
5. 記下以下資訊：
   - Client ID
   - Client Secret
   - Tenant ID

## 部署後端（Render）

### 方法一：使用 Render Dashboard

1. 前往 [Render](https://render.com) 並登入
2. 點擊「New +」→「Web Service」
3. 連接您的 GitHub repository
4. 選擇 `backend` 目錄
5. 設定環境變數：
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   SUPABASE_ANON_KEY=your_anon_key
   AZURE_CLIENT_ID=your_client_id
   AZURE_CLIENT_SECRET=your_client_secret
   AZURE_TENANT_ID=your_tenant_id
   ADMIN_EMAIL=your_admin_email
   FRONTEND_URL=https://your-frontend.vercel.app
   REMINDER_CRON_SCHEDULE=0 9 1 * *
   ```
6. 點擊「Create Web Service」

### 方法二：使用 render.yaml

1. 確保 `backend/render.yaml` 已正確配置
2. 在 Render Dashboard 中選擇「New +」→「Blueprint」
3. 連接 repository 並選擇 `backend/render.yaml`
4. 設定環境變數
5. 部署

### 方法三：使用 Docker

```bash
# 建立 Docker 映像
cd backend
docker build -t movie-selection-api .

# 執行容器
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  movie-selection-api
```

## 部署前端（Vercel）

### 方法一：使用 Vercel CLI

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
cd frontend
vercel

# 設定環境變數
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL

# 生產部署
vercel --prod
```

### 方法二：使用 Vercel Dashboard

1. 前往 [Vercel](https://vercel.com) 並登入
2. 點擊「New Project」
3. 導入您的 GitHub repository
4. 設定：
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 設定環境變數：
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=https://your-backend.onrender.com
   ```
6. 點擊「Deploy」

### 方法三：使用 GitHub Integration

1. 在 Vercel Dashboard 中連接 GitHub
2. 選擇 repository
3. Vercel 會自動偵測 `vercel.json` 配置
4. 設定環境變數
5. 每次 push 到 main branch 都會自動部署

## 部署後檢查

### 1. 測試後端 API

```bash
# 健康檢查
curl https://your-backend.onrender.com/health

# 應該返回：
# {"status":"ok","timestamp":"...","service":"Movie Selection API"}
```

### 2. 測試前端

1. 訪問您的 Vercel URL
2. 嘗試註冊新帳號
3. 檢查 Email 驗證
4. 登入系統

### 3. 測試上傳功能

1. 使用管理員帳號登入
2. 上傳測試 Excel 檔案
3. 檢查是否收到通知 Email
4. 在客戶端查看影片清單

## 環境變數總覽

### 後端環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `NODE_ENV` | 環境模式 | 是 |
| `PORT` | 伺服器端口 | 是 |
| `SUPABASE_URL` | Supabase 專案 URL | 是 |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key | 是 |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | 是 |
| `AZURE_CLIENT_ID` | Azure AD Client ID | 是 |
| `AZURE_CLIENT_SECRET` | Azure AD Client Secret | 是 |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | 是 |
| `ADMIN_EMAIL` | 管理員 Email | 是 |
| `FRONTEND_URL` | 前端 URL | 是 |
| `REMINDER_CRON_SCHEDULE` | 提醒排程（Cron 格式） | 否 |

### 前端環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `VITE_SUPABASE_URL` | Supabase 專案 URL | 是 |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | 是 |
| `VITE_API_URL` | 後端 API URL | 是 |

## 常見問題

### Q: 上傳 Excel 後沒有收到通知 Email？

A: 檢查以下項目：
1. Azure AD 權限是否正確設定
2. ADMIN_EMAIL 是否正確
3. 檢查後端日誌是否有錯誤
4. 確認 Email 沒有被歸類為垃圾郵件

### Q: 圖片無法顯示？

A: 檢查以下項目：
1. Supabase Storage bucket 是否設為 Public
2. Storage 政策是否正確設定
3. 檢查瀏覽器控制台是否有 CORS 錯誤

### Q: 部署後無法登入？

A: 檢查以下項目：
1. Supabase URL 和 Key 是否正確
2. 前端的 VITE_API_URL 是否指向正確的後端 URL
3. 後端的 FRONTEND_URL 是否正確（用於 CORS）

### Q: Render 免費方案會休眠？

A: 是的，Render 免費方案在 15 分鐘無活動後會休眠。解決方案：
1. 升級到付費方案
2. 使用定時 ping 服務（如 UptimeRobot）
3. 接受首次訪問時的冷啟動延遲

## 監控和維護

### 日誌查看

**Render:**
- 在 Render Dashboard 中點擊您的服務
- 查看「Logs」標籤

**Vercel:**
- 在 Vercel Dashboard 中點擊您的專案
- 查看「Deployments」→ 選擇部署 → 「Logs」

### 資料庫備份

Supabase 會自動備份，但建議：
1. 定期匯出重要資料
2. 使用 Supabase CLI 進行本地備份

### 更新部署

**自動部署（推薦）:**
- 將 GitHub repository 連接到 Vercel 和 Render
- 每次 push 到 main branch 會自動部署

**手動部署:**
```bash
# 前端
cd frontend
vercel --prod

# 後端（如果使用 Docker）
docker build -t movie-selection-api .
docker push your-registry/movie-selection-api
```

## 成本估算

### 免費方案

- **Supabase**: 500MB 資料庫 + 1GB 儲存空間
- **Render**: 750 小時/月（單一服務）
- **Vercel**: 100GB 頻寬/月

適合小型使用（2-3 個客戶）。

### 付費方案建議

如果需要更好的效能和穩定性：

- **Supabase Pro**: $25/月
- **Render Starter**: $7/月
- **Vercel Pro**: $20/月

總計約 $52/月。

## 安全性建議

1. **永遠不要提交 `.env` 檔案到 Git**
2. **定期更新依賴套件**
   ```bash
   npm audit
   npm update
   ```
3. **使用強密碼和 2FA**
4. **定期檢查 Supabase 的安全建議**
5. **限制 Azure AD 權限範圍**

## 支援

如有問題，請參考：
- [Supabase 文件](https://supabase.com/docs)
- [Render 文件](https://render.com/docs)
- [Vercel 文件](https://vercel.com/docs)
- [Microsoft Graph API 文件](https://docs.microsoft.com/graph)

