# 操作紀錄 (Operation Log) 功能實作文件

> 版本：2025-11  
> 撰寫者：Cascade AI 助手  
> 適用範圍：Fashion_movielist 專案（Node.js + Supabase + React）

---

## 1. 功能目標與摘要

1. **提供僅限管理員使用的操作紀錄檢視頁面**，可即時追蹤登入、登出、角色變更、影片/郵件設定等敏感行為。
2. **統一後端紀錄接口**，所有路由透過 `recordOperationLog` 服務寫入 `operation_logs` 表。
3. **支援操作類別過濾、關鍵字搜尋、日期篩選、分頁、前端本地重新整理**。
4. **新增系統設定「操作紀錄保留天數」**，讓管理員可設定自動清除舊紀錄的天數，並立即執行清理。
5. **前端 UI 提供「清單 / 卡片」雙視圖 + 摺疊詳細內容**，兼顧快速瀏覽與深入調查。

---

## 2. 資料庫 Schema

### 2.1 `operation_logs` 資料表（`database/schema.sql`）
| 欄位 | 說明 |
| --- | --- |
| `id` (UUID) | 主鍵。
| `actor_id/name/email/role` | 操作者資訊，從 `profiles` 或 `authUser` 取得。
| `target_user_id/name/email` | 目標使用者（若有）。
| `action` | 操作代碼（如 `auth.login`）。
| `resource_type/resource_id` | 相關資源（目前預留）。
| `description` | 人類可讀描述。
| `metadata` | JSONB，存放補充資料（如刪除筆數）。
| `ip_address` / `user_agent` | 來源資訊。
| `created_at` | 自動時間戳記。

> 伴隨建立索引與 RLS（僅管理員可讀）。

### 2.2 `system_settings` 資料表
| 欄位 | 說明 |
| --- | --- |
| `key` | 設定代碼，本功能使用 `operation_logs`。
| `value` | JSONB，包含 `retentionDays`、`lastCleanupAt`。
| `updated_at`、`updated_by` | 追蹤最後更新者。

> 若表不存在，後端會回退至預設值（90 天）並從 `operation_logs` 內最新設定紀錄推測先前的保留天數。

---

## 3. 後端實作

### 3.1 服務層：`backend/src/services/operationLogService.js`
- `recordOperationLog`：統一寫入函式，負責解析操作者、目標、請求上下文（IP、UA）。
- `recordOperationBatch`：供批次寫入（目前未大量使用）。
- 若缺少 `actor` 資訊（無法判斷操作者），直接略過以避免垃圾資料。

### 3.2 路由

| 路由 | 檔案 | 功能摘要 |
| --- | --- | --- |
| `GET /api/operation-logs` | `backend/src/routes/operationLogs.js` | 分頁、篩選、搜尋操作紀錄。
| `GET /api/operation-logs/actions` | 同上 | 回傳所有可選操作類別（預設 + 實際存在）。
| `POST /api/operation-logs/events` | 同上 | 提供前端（例如登入）直接記錄事件。
| `GET /api/system-settings/operation-logs` | `backend/src/routes/systemSettings.js` | 取得保留天數設定，若 `system_settings` 缺少會回退。
| `PUT /api/system-settings/operation-logs` | 同上 | 驗證 7–365 天，更新設定並立即清除逾期紀錄，紀錄 `settings.operation_log_retention` 日誌。
| `PUT /api/users/:id/role` | `backend/src/routes/users.js` | 更新用戶角色並記錄 `users.role_change` 日誌。
| 其他 | `routes/auth.js`, `videos.js`, `mail.js`, `selections.js`, `upload.js` 等 | 關鍵動作完成後呼叫 `recordOperationLog`。

### 3.3 Middleware 與 Server
- `backend/src/middleware/auth.js`：統一 `requireAuth`、`requireAdmin`，並提供 `req.authUser`、`req.authUserProfile` 給 log 服務使用。
- `backend/src/server.js`：掛載 `/api/operation-logs`、`/api/users`、`/api/system-settings` 等路由。

### 3.4 保留天數清理邏輯
1. 管理員於前端設定頁更新保留天數（7–365 天）。
2. 後端 `saveOperationLogSetting` upsert 至 `system_settings`，若資料表不存在則跳過持久化但仍回傳。
3. 立即呼叫 `cleanupOperationLogs`，刪除 `created_at < now - retentionDays` 的紀錄，並在 metadata 記錄刪除筆數。
4. 透過 `recordOperationLog` 留下 `settings.operation_log_retention` 行為紀錄。

---

## 4. 前端實作

### 4.1 API Wrapper：`frontend/src/lib/api.js`
- `getOperationLogs`, `getOperationLogActions`, `recordOperationEvent`（既有）。
- 新增 `getOperationLogRetentionSetting`, `updateOperationLogRetention` 供設定頁使用。
- `updateUserRole` 改走後端 API，確保角色變更會產生日誌。

### 4.2 頁面與元件

| 檔案 | 變更摘要 |
| --- | --- |
| `frontend/src/pages/OperationLogs.jsx` | 新增頁面 UI：統計卡片、篩選表單、雙視圖（清單/卡片）切換、每列/卡片可摺疊詳細資訊、metadata 標籤式呈現。設定 `ACTION_LABELS` 提供中英文對照。僅管理員可見。|
| `frontend/src/pages/Settings.jsx` | 增加「操作紀錄保留天數」卡片：載入後端設定、顯示最後清理時間/刪除筆數、允許重新整理與儲存。| 
| `frontend/src/components/Select.jsx` & `frontend/src/index.css` | 強化下拉可滾動、Apple 風格捲軸、保持與其他頁一致。|
| `frontend/src/contexts/AuthContext.jsx` | `signIn` / `signOut` 成功後呼叫 `recordOperationEvent` 以記錄登入/登出。|
| `frontend/src/pages/UserManagement.jsx` | 透過 `updateUserRole` API 變更角色後，自動在後端寫入 `users.role_change` 日誌。|

### 4.3 Operation Logs 頁面主要互動
1. **篩選條件**：操作類別、關鍵字、起訖日期，送出後呼叫 API 重新載入。
2. **視圖切換**：
   - 清單模式：表格顯示主要欄位，按「展開」即顯示詳細 `InfoBlock`。
   - 卡片模式：卡片呈現概覽，按「查看詳細」展開底部詳細資料。
3. **重新整理**：按鈕會呼叫 `loadLogs()` 重新取得最新資料。
4. **統計卡片**：顯示今日產生筆數、總筆數、目前頁數。

---

## 5. 操作紀錄分類（Action Labels）
| 代碼 | 顯示名稱 |
| --- | --- |
| `auth.login` | 登入 |
| `auth.logout` | 登出 |
| `auth.register` | 註冊 |
| `auth.change_password` | 修改密碼 |
| `auth.admin_reset_password` | 管理員重設密碼 |
| `upload.batch_import` | 批次上傳影片 |
| `videos.update` | 編輯影片 |
| `selections.submit` | 客戶送出選片 |
| `mail.recipient.*` | 郵件收件者新增/更新/移除 |
| `users.role_change` | 用戶角色變更 |
| `settings.operation_log_retention` | 操作紀錄保留設定 |

> 前端 `ACTION_LABELS` 支援本地化，可持續擴充，後端 `DEFAULT_ACTIONS` 確保 API 至少回傳一組列表。

---

## 6. 運行與維護建議

1. **資料表遺失時處理**：若新環境尚未套用最新 `schema.sql`，後端會回退到預設值並從操作紀錄推測設定；建議仍儘速套用 schema 以確保設定可持久化。
2. **權限**：所有操作紀錄 API 皆需 `requireAdmin`（除 `POST /events` 只需登入即可，供前端記錄登入/登出）。
3. **性能**：API 預設每頁 20 筆，最多 100；若未來資料量增長，可考慮改用 cursor-based pagination。
4. **監控**：可透過 `settings.operation_log_retention` 行為觀察是否有人調整保留天數，並確認 metadata `deletedLogs` 了解清理成效。
5. **擴充點**：
   - 若要通知被影響使用者，可利用 `target_user_*` 欄位。
   - 可追加匯出 CSV/Excel 需求，後端只需依條件查詢後輸出即可。
   - 若要引入排程（cron job）定期清理，可重用 `cleanupOperationLogs`。

---

## 7. 快速檢查清單

- [ ] `database/schema.sql` 已套用（含 `operation_logs`, `system_settings`）。
- [ ] 後端 `.env` 具備 Supabase Service Key，`server.js` 有註冊 `operationLogs` 與 `systemSettings` 路由。
- [ ] 前端 `.env` 設定 API BASE URL，`OperationLogs` 頁面可列出資料。
- [ ] 管理員能進入設定頁，讀取/更新保留天數。
- [ ] 登入/登出、角色變更等操作於後端成功記錄。
- [ ] UI 可在清單/卡片模式間切換，展開詳細資訊。

---

如需進一步延伸（例如整合通知、導出報表、或在行動裝置最佳化），可依本文件所述介面與架構進行擴充。
