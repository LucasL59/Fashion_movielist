# 快速部署指南 - 修正 401 錯誤

> **⏱️ 預計時間**：5-10 分鐘  
> **🎯 目標**：修正客戶清單和操作日誌的 401 認證錯誤

## 📋 檢查清單

- [x] 已修正 `frontend/src/lib/api.js`
- [ ] Commit 並 Push 到 GitHub
- [ ] Vercel 自動部署完成
- [ ] 測試客戶功能
- [ ] 驗證 LOG 無 401 錯誤

## 🚀 快速部署步驟

### 1️⃣ Git 提交與推送

```bash
# 在專案根目錄執行
cd D:\Projects\PythonWorkspace\Fashion_movielist

# 查看修改內容
git status
git diff frontend/src/lib/api.js

# 提交修改
git add frontend/src/lib/api.js FIX_401_AUTH_ERRORS.md QUICK_DEPLOY_FIX.md
git commit -m "fix(auth): 修正 API token 獲取方式，解決 401 錯誤

- 使用 Supabase SDK 的 getSession() 方法替代 localStorage 查找
- 確保每次請求都能獲取最新且有效的 access token
- 請求攔截器改為異步以支援 token 刷新
- 修正客戶清單載入和提交時的認證失敗問題

Fixes: #401-auth-error
Related: customer-list API, operation-logs API"

# 推送到 GitHub
git push origin main
```

### 2️⃣ 等待 Vercel 自動部署

1. 訪問 Vercel Dashboard: https://vercel.com/
2. 找到 `fashion-movielist` 專案
3. 等待部署完成（通常 1-3 分鐘）
4. 查看部署狀態，確保沒有錯誤

#### 如果 Vercel 沒有自動部署

```bash
# 手動觸發部署
cd frontend
vercel --prod
```

### 3️⃣ 快速測試

#### 🧪 測試 1：客戶登入

1. 訪問：https://fashion-movielist.vercel.app/
2. 使用客戶帳號登入
3. ✅ 確認可以成功登入並看到儀表板

#### 🧪 測試 2：載入清單

1. 點擊「影片選擇」或訪問 `/movies`
2. 打開瀏覽器開發者工具（F12）
3. 切換到 Network 標籤
4. 查看 `customer-list` 請求
5. ✅ 確認返回狀態碼為 **200** 而非 401

#### 🧪 測試 3：提交選擇

1. 選擇或取消一些影片
2. 點擊「提交選擇」按鈕
3. 確認彈出確認視窗
4. 點擊「確認提交」
5. 查看 Network 標籤中的 `update` 和 `submit` 請求
6. ✅ 確認兩個請求都返回 **200**
7. ✅ 確認顯示「影片清單已更新！」成功訊息

#### 🧪 測試 4：檢查 Render LOG

1. 訪問 Render Dashboard
2. 進入 `fashion-movielist` 後端服務
3. 查看 Logs 標籤
4. 執行上述操作後，查看 LOG
5. ✅ 確認看到以下成功訊息：

```
🔍 [customer-list] 查詢客戶清單: ...
✅ [customer-list] 找到 X 筆記錄
... 200 ...

📝 [customer-list] 更新客戶清單: ...
✅ [customer-list] 已新增 X 部影片
... 200 ...

📤 [customer-list] 客戶提交清單: ...
✅ [customer-list] 提交成功，已記錄歷史快照
... 200 ...
```

6. ❌ 確認**不再看到** 401 錯誤

## ⚠️ 如果仍有問題

### 問題 1：仍然看到 401 錯誤

**可能原因**：瀏覽器使用了舊的 JS 快取

**解決方法**：
1. 清除瀏覽器快取（Ctrl + Shift + Delete）
2. 或使用無痕模式測試（Ctrl + Shift + N）
3. 或強制重新整理（Ctrl + F5）

### 問題 2：Vercel 部署失敗

**解決方法**：
1. 檢查 Vercel 部署 LOG
2. 確認環境變數正確設定：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`
3. 手動重新部署：
   ```bash
   cd frontend
   vercel --prod
   ```

### 問題 3：後端無法識別 Token

**檢查項目**：
1. Supabase 專案是否正常運作
2. `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY` 環境變數是否正確
3. 後端是否重啟（Render 會自動重啟，但可以手動觸發）

**解決方法**：
```bash
# 在 Render Dashboard 手動重啟服務
# 或更新環境變數後自動重啟
```

## 📊 驗證成功的標誌

### ✅ 前端（瀏覽器開發者工具）

- 所有 `/api/customer-list/*` 請求返回 200
- Request Headers 包含 `Authorization: Bearer eyJ...`
- 沒有出現「載入清單失敗」錯誤訊息
- 提交後顯示「影片清單已更新！」成功訊息

### ✅ 後端（Render LOG）

- 看到 `🔍 [customer-list] 查詢客戶清單` 訊息
- 看到 `✅ [customer-list] 找到 X 筆記錄` 訊息
- 看到 `📝 [customer-list] 更新客戶清單` 訊息
- 看到 `✅ [customer-list] 提交成功` 訊息
- **不再看到** `401 55` 或 `401 61` 錯誤碼

### ✅ 功能測試

- [x] 客戶可以成功登入
- [x] 客戶可以看到自己的累積清單
- [x] 客戶可以選擇/取消影片
- [x] 客戶可以提交選擇
- [x] 管理員收到郵件通知
- [x] 操作日誌正確記錄

## 🎉 完成！

如果所有測試都通過，恭喜您！401 錯誤已經成功修正。

## 📝 後續建議

### 1. 更新 README.md

將以下內容添加到 README.md 的更新記錄中：

```markdown
### v3.0.5 認證系統修正（2026-01-05）🔒

- **修正 401 錯誤**：
  - 使用 Supabase SDK 的 `getSession()` 方法獲取 token
  - 解決客戶清單載入和提交時的認證失敗問題
  - 確保 token 自動刷新，避免過期導致的錯誤
  
- **文檔**：
  - [FIX_401_AUTH_ERRORS.md](FIX_401_AUTH_ERRORS.md) - 詳細修正說明
  - [QUICK_DEPLOY_FIX.md](QUICK_DEPLOY_FIX.md) - 快速部署指南
```

### 2. 標記 Issue（如果有）

如果您在 GitHub 上有追蹤這個問題的 Issue，請：
1. 標記 Issue 為已解決
2. 附上修正的 commit hash
3. 關閉 Issue

### 3. 通知測試人員

如果有其他測試人員，請通知他們：
- 401 錯誤已修正
- 請清除瀏覽器快取後測試
- 確認客戶清單功能正常運作

## 📞 需要協助？

如果遇到任何問題，請檢查：
1. [FIX_401_AUTH_ERRORS.md](FIX_401_AUTH_ERRORS.md) - 詳細的技術說明
2. Vercel 部署 LOG
3. Render 後端 LOG
4. 瀏覽器開發者工具的 Network 和 Console 標籤

---

**文檔版本**：v1.0  
**最後更新**：2026-01-05
