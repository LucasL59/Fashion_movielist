# 部署監控指南 - 客戶清單 API 修復

> **部署時間**：2026-01-02  
> **Git Commit**：`fb16e96`  
> **GitHub 推送**：✅ 成功

---

## ✅ Git 推送完成

代碼已成功推送到 GitHub main 分支：

```bash
To https://github.com/LucasL59/Fashion_movielist.git
   c938914..fb16e96  main -> main
```

**修改的檔案**：
- ✏️ `backend/src/routes/customerList.js`
- ✏️ `frontend/src/lib/api.js`
- ✏️ `frontend/src/pages/MovieSelection.jsx`
- 📄 `FIX_CUSTOMER_LIST_API_FORMAT.md`
- 📄 `QUICK_TEST_GUIDE_FIX.md`

**變更統計**：
- 5 個檔案修改
- 545 行新增
- 8 行刪除

---

## 🚀 自動部署流程

### Vercel（前端）自動部署

Vercel 應該會自動偵測到 GitHub 推送並開始部署前端。

#### 監控步驟

1. **前往 Vercel Dashboard**
   - 訪問：https://vercel.com/dashboard
   - 找到您的 Fashion_movielist 專案

2. **查看部署狀態**
   - 點擊專案進入詳情頁
   - 查看「Deployments」標籤
   - 應該會看到最新的部署正在進行中

3. **部署狀態指示**
   - 🟡 **Building** - 正在建置中（約 2-5 分鐘）
   - 🟢 **Ready** - 部署成功
   - 🔴 **Error** - 部署失敗

4. **檢查點**
   ```
   預期建置時間：2-5 分鐘
   建置命令：npm run build
   輸出目錄：dist/
   Node 版本：18.x 或更高
   ```

#### 部署完成後

訪問您的前端網址（例如：`https://your-app.vercel.app`），確認：
- ✅ 頁面可正常載入
- ✅ 管理員可進入「選擇影片」分頁
- ✅ F12 控制台無錯誤

---

### Render（後端）自動部署

Render 也應該會自動偵測到 GitHub 推送並開始部署後端。

#### 監控步驟

1. **前往 Render Dashboard**
   - 訪問：https://dashboard.render.com
   - 找到您的 Fashion_movielist 後端服務

2. **查看部署狀態**
   - 點擊服務進入詳情頁
   - 查看「Events」或「Logs」標籤
   - 應該會看到新的 Deploy 事件

3. **部署狀態指示**
   - 🟡 **Building** - 正在建置中（約 3-8 分鐘）
   - 🟡 **Deploying** - 正在部署
   - 🟢 **Live** - 部署成功並上線
   - 🔴 **Deploy failed** - 部署失敗

4. **檢查點**
   ```
   預期建置時間：3-8 分鐘
   建置命令：npm install
   啟動命令：npm start
   Node 版本：18.x 或更高
   ```

#### 部署完成後

測試您的後端 API（例如：`https://your-backend.onrender.com`）：

```bash
# 測試健康檢查
curl https://your-backend.onrender.com/health

# 測試 API（需要 token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/customer-list/USER_ID
```

確認響應格式：
```json
{
  "success": true,
  "data": {
    "items": [...],
    "videoIds": [...]
  },
  "count": 0
}
```

---

## 🔍 部署監控檢查清單

### 步驟 1：確認 GitHub 推送（✅ 已完成）

- [x] 代碼已推送到 GitHub
- [x] Commit hash: `fb16e96`
- [x] 分支：main

### 步驟 2：監控 Vercel 部署（約 2-5 分鐘）

- [ ] 前往 Vercel Dashboard
- [ ] 確認新的部署已開始
- [ ] 等待建置完成
- [ ] 檢查部署狀態為「Ready」
- [ ] 訪問前端網址測試

### 步驟 3：監控 Render 部署（約 3-8 分鐘）

- [ ] 前往 Render Dashboard
- [ ] 確認新的部署已開始
- [ ] 等待建置和部署完成
- [ ] 檢查服務狀態為「Live」
- [ ] 測試後端 API

### 步驟 4：完整功能測試（部署完成後）

- [ ] 使用管理員帳號登入
- [ ] 進入「選擇影片」分頁
- [ ] 確認頁面正常顯示
- [ ] F12 檢查無錯誤訊息
- [ ] 測試選擇影片功能
- [ ] 測試提交變更功能

---

## ⚠️ 如果部署失敗

### Vercel 部署失敗

**常見原因**：
1. 建置錯誤（語法錯誤、依賴問題）
2. 環境變數未設定
3. Node 版本不相容

**解決步驟**：
1. 在 Vercel Dashboard 查看建置日誌
2. 檢查錯誤訊息
3. 確認環境變數：
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

**快速修復**：
```bash
# 在本地測試建置
cd frontend
npm run build

# 如果本地建置成功，可能是環境變數問題
```

### Render 部署失敗

**常見原因**：
1. 依賴安裝失敗
2. 啟動腳本錯誤
3. 環境變數未設定
4. 資料庫連線問題

**解決步驟**：
1. 在 Render Dashboard 查看部署日誌
2. 檢查「Logs」標籤的錯誤訊息
3. 確認環境變數：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`
   - `EMAIL_FROM`

**快速修復**：
```bash
# 在本地測試啟動
cd backend
npm install
npm start

# 如果本地啟動成功，可能是環境變數或 Render 設定問題
```

---

## 🔄 手動觸發部署

如果自動部署未觸發：

### Vercel 手動部署

1. 前往 Vercel Dashboard
2. 選擇專案
3. 點擊「Deployments」標籤
4. 點擊右上角「Redeploy」按鈕
5. 選擇 main 分支
6. 點擊「Redeploy」

### Render 手動部署

1. 前往 Render Dashboard
2. 選擇服務
3. 點擊右上角「Manual Deploy」
4. 選擇「Deploy latest commit」
5. 點擊「Deploy」

---

## 📊 預期時間軸

| 時間 | 事件 | 狀態 |
|------|------|------|
| T+0 | GitHub 推送 | ✅ 完成 |
| T+1分鐘 | Vercel 開始建置 | ⏳ 等待中 |
| T+1分鐘 | Render 開始建置 | ⏳ 等待中 |
| T+3-5分鐘 | Vercel 部署完成 | ⏳ 進行中 |
| T+5-10分鐘 | Render 部署完成 | ⏳ 進行中 |
| T+10分鐘 | 開始功能測試 | ⏳ 待執行 |
| T+15分鐘 | 所有測試完成 | ⏳ 待完成 |

---

## ✅ 部署完成檢查

部署成功後，請執行以下檢查：

### 前端檢查

```bash
# 訪問前端網址
https://your-app.vercel.app

# 檢查點：
✓ 頁面正常載入
✓ 可以登入
✓ 管理員可進入「選擇影片」分頁
✓ F12 無 API 格式錯誤
```

### 後端檢查

```bash
# 測試健康端點
curl https://your-backend.onrender.com/health

# 預期響應：
{"status":"ok","timestamp":"..."}

# 測試客戶清單 API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-backend.onrender.com/api/customer-list/USER_ID

# 預期響應包含 items 和 videoIds
```

### 完整流程測試

1. 管理員登入 → 選擇影片 → 查看清單 → ✅
2. 客戶登入 → 選擇影片 → 提交 → ✅
3. 檢查郵件通知 → ✅
4. 查看操作日誌 → ✅

---

## 📞 需要協助？

如果遇到部署問題：

1. **檢查部署日誌**
   - Vercel：Dashboard → Project → Deployments → 點擊最新部署 → View Build Logs
   - Render：Dashboard → Service → Logs

2. **檢查環境變數**
   - Vercel：Settings → Environment Variables
   - Render：Environment → Environment Variables

3. **查看錯誤訊息**
   - 複製完整的錯誤訊息
   - 檢查是否有語法錯誤或缺少依賴

4. **回滾選項**
   - Vercel 和 Render 都支援一鍵回滾到先前的部署版本
   - 如果新版本有嚴重問題，可以先回滾再修復

---

**相關文檔**：
- 📄 `FIX_CUSTOMER_LIST_API_FORMAT.md` - 完整修復說明
- 📄 `QUICK_TEST_GUIDE_FIX.md` - 快速測試指南

**Git 記錄**：
- Commit: `fb16e96`
- Branch: `main`
- Files: 5 changed, 545 insertions(+), 8 deletions(-)
