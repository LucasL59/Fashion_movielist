# 系統更新摘要 - 2025-11-24

本文件記錄了 2025 年 11 月 24 日進行的系統更新與修復，主要針對角色權限顯示、上傳者體驗優化以及系統管理功能的增強。

## 1. 角色權限與顯示邏輯修正

### 1.1 個人設定頁面 (Settings) 角色顯示修復
- **問題**：原先邏輯僅判斷 Admin，導致 Uploader（上傳者）在個人資料頁面被錯誤顯示為「客戶」。
- **修正**：更新 `Settings.jsx` 中的顯示邏輯，現在能正確區分並顯示「管理員」、「上傳者」與「客戶」。

### 1.2 導航列 (Layout) 權限隔離
- **問題**：上傳者在導航列中同時看到管理功能與屬於客戶的「選擇影片」連結。
- **修正**：
  - 在 `Layout.jsx` 中移除上傳者視角下的「選擇影片」連結。
  - 確保上傳者只能訪問「上傳管理」與「影片管理」。
  - 管理員保留所有連結的訪問權限以便測試。

### 1.3 路由保護增強
- **修正**：在 `App.jsx` 中加強 `/movies` 路由保護，若上傳者嘗試訪問該路徑，將自動重導向至管理首頁。

## 2. 新增上傳者儀表板 (Uploader Dashboard)

為了提升上傳者的工作效率，我們建立了專屬的儀表板介面。

### 2.1 功能特色
- **專屬首頁**：登入後直接進入上傳者專屬儀表板 (`UploaderDashboard.jsx`)，而非與管理員共用介面。
- **狀態可視化**：
  - **本月上傳狀態**：
    - 🟢 **綠色**：本月已上傳影片清單。
    - 🔴 **紅色**：本月尚未上傳。
  - **選擇進度概覽**：
    - 🟢 **綠色**：所有客戶皆已完成選擇。
    - 🔴 **紅色**：尚有客戶未提交選擇。
- **快速操作**：整合「上傳新清單」與「影片管理」的快速入口。

### 2.2 補發通知功能
- 在儀表板中新增「補發上傳通知」功能。
- 允許上傳者在客戶未收到信件時，手動觸發系統重新發送 Email 通知給所有客戶。

## 3. 後端 API 更新

### 3.1 補發通知 API
- **新增路由**：`POST /api/mail-rules/notifications/upload`
- **權限**：開放給 `admin` 與 `uploader` 角色。
- **功能**：呼叫 `emailService.notifyCustomersNewList` 重新發送指定批次的通知信。
- **紀錄**：所有補發操作皆會寫入系統操作紀錄 (Operation Logs)。

### 3.2 權限中介軟體調整
- 修改 `backend/src/routes/mail.js`，將原本全域的 `requireAdmin` 改為依路由個別設定，以支援上傳者使用特定郵件功能。

## 4. 檔案變更清單

### 前端
- `src/pages/Settings.jsx`: 修正角色顯示邏輯。
- `src/components/Layout.jsx`: 修正導航列顯示邏輯。
- `src/App.jsx`: 更新路由配置與儀表板分流。
- `src/pages/UploaderDashboard.jsx`: **[新增]** 上傳者儀表板。
- `src/lib/api.js`: 新增 `resendUploadNotification` 函數。

### 後端
- `src/routes/mail.js`: 新增補發通知路由，調整權限設定。


## 6. 第二階段更新 (UI 優化與功能增強)

### 6.1 管理儀表板 (Admin Dashboard) 優化
- **月份篩選**：新增下拉式選單，允許管理員查看過往月份（批次）的客戶選擇明細，不再僅限於最新批次。
- **資料結構調整**：後端 `/api/dashboard/admin/overview` 新增 `batchId` 參數支援，並回傳所有批次列表供前端選擇。

### 6.2 提醒通知設定重構
- **位置遷移**：將提醒設定從「個人設定 (Settings)」頁面遷移至「郵件管理 (Mail Management)」頁面，使功能分類更直觀。
- **功能增強**：
  - **開關控制**：新增啟用/停用開關，可暫時關閉提醒而不需刪除設定。
  - **設定持久化**：改用資料庫 (`system_settings` 表) 儲存設定，解決伺服器重啟後設定遺失的問題。
  - **靈活收件人**：
    - 支援「自動通知所有上傳者」選項。
    - 支援添加額外的 Email 收件人清單。
- **介面優化**：使用更現代化的卡片式設計，整合開關與詳細設定。

### 6.3 系統優化與 UI 改進
- **後端初始化修正**：
  - 修正 `server.js` 中重複呼叫提醒排程器初始化日誌的問題。
  - 優化提醒服務啟動日誌，明確顯示目前提醒功能是「啟用」或「停用」狀態。
- **前端樣式重構 (UI Polish)**：
  - **Compact Design**：全面調整輸入框 (`input`)、下拉選單 (`select`) 與按鈕 (`btn`) 的樣式。
    - 減少內距 (Padding) 與高度，使其更緊湊精緻。
    - 調整圓角為 `rounded-xl`，視覺更俐落。
    - 統一字體大小為 `text-sm`。
  - **佈局優化**：
    - `AdminDashboard.jsx`: 優化標題列與篩選器的響應式排列。
    - `OperationLogs.jsx`: 修復列表渲染 Key Warning。

### 6.4 用戶管理與系統完善
- **新增使用者功能**：
  - 於 `UserManagement` 頁面新增「新增使用者」按鈕與 Modal。
  - 允許管理員直接輸入姓名、Email、密碼與角色來建立帳號 (Admin API)。
  - 自動處理 Profile 建立與權限設定。
- **操作紀錄整合**：
  - **建立使用者**：記錄 `users.create`，包含操作者與新用戶資訊。
  - **提醒設定**：記錄 `settings.reminder_schedule`，包含啟用狀態與排程設定。
- **元件樣式修復**：
  - `Select.jsx`: 修正下拉選單的 padding 與字體，使其完全符合新的 Compact UI 規範。

### 6.5 提醒通知與系統日誌優化
- **提醒設定優化**：
  - **防呆機制**：添加額外 Email 時，自動偵測是否已存在於預設通知對象（上傳者）或額外清單中，避免重複發送。
  - **即時開關**：將提醒功能的啟用/停用改為即時生效 (Immediate Toggle)，解決「關閉後未儲存」的問題，並優化操作體驗。
  - **UI 狀態**：停用時將設定區域變灰並鎖定，但保留儲存按鈕以供修改時間與訊息。
- **操作日誌擴充**：
  - 新增 `settings.reminder_schedule` (提醒排程設定) 與 `users.create` (建立使用者) 等操作類別標籤，確保日誌顯示完整資訊。

### 6.6 刪除使用者與系統修復
- **刪除使用者功能**：
  - 新增管理員刪除使用者權限。
  - 後端新增 `DELETE /api/users/:id` 路由，並整合 Supabase Admin API 與操作日誌。
  - 前端 `UserManagement` 頁面新增刪除按鈕與確認視窗。
- **錯誤修復**：
  - `MailManagement.jsx`: 修復 `loadReminderSettings` 未定義導致的頁面崩潰錯誤。
  - `OperationLogs.jsx`: 修復列表渲染的 `key` 屬性警告，並修正 Card View 的渲染邏輯。
- **資料庫文件更新**：
  - 將 `system_settings` 資料表定義加入 `schema.sql`。

### 檔案變更 (第六階段)
- `backend/src/routes/users.js`: 新增刪除路由。
- `frontend/src/pages/UserManagement.jsx`: 新增刪除 UI。
- `frontend/src/pages/MailManagement.jsx`: 修復函數定義。
- `frontend/src/pages/OperationLogs.jsx`: 修復渲染問題。
- `database/schema.sql`: 更新表結構定義。
