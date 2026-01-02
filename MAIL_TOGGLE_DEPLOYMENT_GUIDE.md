# 郵件通知開關功能部署指南

> **版本**：v3.0.1  
> **建立日期**：2026-01-03  
> **功能說明**：為郵件管理頁面新增「客戶提交影片選擇」和「新影片清單上傳」的郵件通知開關功能

---

## 📋 功能概述

此更新為系統新增了郵件通知的全局開關管理功能，讓管理員可以靈活控制自動郵件的發送：

### 新增功能

1. **客戶提交影片選擇通知開關**
   - 控制當客戶提交影片選擇時，是否自動發送通知給管理員和上傳者
   - 停用後不影響手動補發通知功能

2. **新影片清單上傳通知開關**
   - 控制當新影片清單上傳時，是否自動發送通知給所有客戶和相關人員
   - 停用後不影響手動補發通知功能

### 技術實現

- **資料庫**：新增 `system_settings` 表儲存郵件通知開關設定
- **後端**：
  - 修改 `emailService.js` 在發送郵件前檢查開關狀態
  - 新增 API 路由 `/api/system-settings/mail-notifications` 管理開關設定
- **前端**：
  - 在 `MailManagement.jsx` 頁面頂部新增開關 UI
  - 使用 toggle switch 組件提供直觀的開關控制

---

## 🚀 部署步驟

### 步驟 1：確認代碼已推送到 GitHub

✅ **已完成**：代碼已成功推送到 GitHub main 分支

提交記錄：
- `feat: Add mail notification toggle feature`
- `docs: Update README with mail notification toggle feature`

### 步驟 2：執行資料庫遷移

在 Supabase Dashboard 的 SQL Editor 中執行遷移腳本：

1. 登入您的 Supabase Dashboard
2. 點擊左側選單的「SQL Editor」
3. 點擊「New Query」
4. 複製 `database/migration_mail_toggles.sql` 的內容並貼上
5. 點擊「Run」執行腳本

**遷移腳本功能**：
- 建立 `system_settings` 表（如果尚未存在）
- 初始化郵件通知開關設定（預設都啟用）
- 建立必要的索引和 RLS 政策
- 設定自動更新時間戳記的觸發器

### 步驟 3：Vercel 前端部署

Vercel 應該會自動偵測到 GitHub 的更新並觸發部署。

**驗證部署**：
1. 前往 Vercel Dashboard
2. 檢查最新的部署狀態
3. 確認部署成功完成

**如果需要手動部署**：
```bash
cd frontend
npm run build
# 使用 Vercel CLI 部署
vercel --prod
```

### 步驟 4：Render 後端部署

Render 應該會自動偵測到 GitHub 的更新並觸發部署。

**驗證部署**：
1. 前往 Render Dashboard
2. 檢查服務的部署歷史
3. 確認最新的部署成功完成

**如果需要手動觸發部署**：
1. 在 Render Dashboard 中找到您的服務
2. 點擊「Manual Deploy」
3. 選擇「Deploy latest commit」

### 步驟 5：測試功能

部署完成後，請進行以下測試：

1. **登入系統**
   - 使用管理員帳號登入系統

2. **訪問郵件管理頁面**
   - 導航至「郵件通知管理」頁面
   - 確認頁面頂部顯示「郵件通知開關」卡片

3. **測試開關功能**
   - 嘗試切換「客戶提交影片選擇通知」開關
   - 嘗試切換「新影片清單上傳通知」開關
   - 確認每次切換後都會顯示成功提示訊息

4. **驗證開關效果**
   - 停用「新影片清單上傳通知」
   - 上傳一個新的影片清單
   - 確認系統沒有發送自動郵件通知
   - 重新啟用開關，再次測試

5. **檢查操作日誌**
   - 訪問「操作紀錄」頁面
   - 確認開關變更有被記錄

---

## 🔍 故障排除

### 問題 1：資料庫遷移失敗

**錯誤訊息**：`relation "system_settings" already exists`

**解決方案**：
- 表已存在，可以跳過此步驟
- 或執行以下 SQL 確保表結構正確：
  ```sql
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS key TEXT PRIMARY KEY;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS value JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ```

### 問題 2：開關無法切換

**症狀**：點擊開關後沒有反應或顯示錯誤

**檢查項目**：
1. 確認已執行資料庫遷移
2. 檢查瀏覽器控制台是否有錯誤訊息
3. 確認後端 API 路由正常運作（檢查 Render 日誌）
4. 驗證管理員權限是否正確

### 問題 3：郵件仍然發送

**症狀**：停用開關後系統仍然發送郵件

**檢查項目**：
1. 確認後端代碼已更新（檢查 Render 部署版本）
2. 檢查 Render 日誌中的郵件發送記錄
3. 確認 `emailService.js` 的開關檢查邏輯正確執行

---

## 📝 功能使用說明

### 管理員操作指南

1. **訪問郵件管理頁面**
   - 登入系統後，點擊側邊欄的「郵件通知管理」

2. **查看當前開關狀態**
   - 頁面頂部的「郵件通知開關」卡片會顯示兩個開關的當前狀態
   - 綠色 = 已啟用，灰色 = 已停用

3. **切換開關**
   - 點擊開關即可切換狀態
   - 系統會自動保存並顯示成功訊息
   - 不需要額外的「儲存」按鈕

4. **開關說明**
   - **客戶提交影片選擇通知**：控制客戶提交選擇時的自動郵件
   - **新影片清單上傳通知**：控制上傳新清單時的自動郵件

5. **補發通知**
   - 即使停用自動郵件，您仍可以使用「補發通知」功能手動發送郵件
   - 補發功能不受開關影響

### 開關使用場景

**建議啟用的情況**：
- 正常業務運作時
- 需要及時通知相關人員時

**建議停用的情況**：
- 系統維護期間
- 測試上傳功能時
- 批量上傳多個批次時（避免發送過多郵件）
- 臨時需要暫停通知時

---

## 🔐 安全性說明

- 只有管理員可以訪問和修改郵件通知開關
- 所有開關變更都會記錄在操作日誌中
- 開關設定儲存在資料庫中，不會因伺服器重啟而遺失
- RLS 政策確保只有管理員可以讀取和修改系統設定

---

## 📚 相關文件

- [README.md](README.md) - 專案主要文件
- [database/migration_mail_toggles.sql](database/migration_mail_toggles.sql) - 資料庫遷移腳本
- [backend/src/services/emailService.js](backend/src/services/emailService.js) - 郵件服務實現
- [backend/src/routes/systemSettings.js](backend/src/routes/systemSettings.js) - 系統設定 API
- [frontend/src/pages/MailManagement.jsx](frontend/src/pages/MailManagement.jsx) - 郵件管理頁面

---

## ✅ 部署檢查清單

請確認以下項目都已完成：

- [x] 代碼已推送到 GitHub
- [ ] Supabase 資料庫遷移已執行
- [ ] Vercel 前端部署成功
- [ ] Render 後端部署成功
- [ ] 開關功能測試通過
- [ ] 郵件發送測試通過
- [ ] 操作日誌記錄正常

---

## 🎉 完成！

恭喜！郵件通知開關功能已成功部署。

如有任何問題或需要協助，請聯繫系統管理員。
