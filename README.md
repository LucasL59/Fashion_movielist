# 每月影片選擇系統 (Monthly Movie Selection System)

> **版本**：v2.1.2 ｜ **最後更新**：2025-11-24 ｜ **狀態**：✅ 可部署、可測試

## 🔰 專案簡介

MVI Select 是一套 React + Node.js + Supabase 打造的「每月影片選擇」平台。管理員可上傳含圖片的 Excel 片單、設定提醒與操作紀錄；上傳者專注於更新片單；客戶則能線上選片並即時通知相關人員。

## ⚙️ 技術架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 前端 | React 18 + Vite + Tailwind CSS + Shadcn UI | 提供 Apple 風格 UI、BrandTransition 動畫與 Context-based 權限控管 |
| 後端 | Node.js + Express | 整合 Supabase、Microsoft Graph、排程 cron |
| 資料庫 | Supabase (PostgreSQL) + Supabase Storage | RLS 權限、operation_logs、system_settings、影片/批次/選擇資料 |
| 認證 | Supabase Auth | 支援 email/password、管理員稽核操作 |
| Email | Microsoft Graph API | 客戶提交選片、批次上傳、提醒通知 |

## 🌟 核心功能

### 三層權限

| 角色 | 核心能力 |
|------|----------|
| **Admin** | 上傳/刪除批次、管理用戶、設定提醒、查看操作紀錄 |
| **Uploader** | 上傳/編輯影片、查看選片狀態 |
| **Customer** | 瀏覽片單、選片、提交清單 |

### 自動化 / 進階功能

- Excel 圖片解析 + Supabase Storage 儲存
- 檔案名稱月份識別 + 月份選擇器（自動解析 `YYYY-MM / 11月 / 202411` 等格式並提供月份切換）
- 每月提醒設定（UI 自動同步、預設通知上傳者 + 自訂 Email）
- PostgREST + cron 排程寄送提醒，以及補發通知 API
- Operation Logs：記錄登入/登出、角色變更、郵件設定等，並具保留天數自動清理
- 操作歷史 / 選擇歷史：客戶可查看所有批次的提交紀錄
- 完整影片編輯流程：Admin/Uploader 可即時更新影片資訊與封面
- BrandTransition + Glassmorphism UI，確保登入/登出體驗與主要頁面動線一致

## 🆕 2025-11-24 更新重點

> 完整說明請見 [UPDATE_SUMMARY_2025_11_24.md](UPDATE_SUMMARY_2025_11_24.md)

- **角色顯示與導覽強化**：Settings、Layout 與 `/movies` 路由現可正確區分 Admin / Uploader / Customer，並阻擋上傳者誤入客戶頁面。
- **Uploader Dashboard 上線**：提供專屬首頁、上傳與選擇狀態視覺化、快速操作入口，以及「補發上傳通知」按鈕。
- **通知 API 擴充**：新增 `POST /api/mail-rules/notifications/upload`，讓 Admin/Uploader 能在客戶未收信時立即重送郵件，並同步寫入 Operation Logs。
- **管理儀表板 + UI 優化**：Admin Dashboard 支援月份切換；全站輸入元件改為 compact 風格並統一樣式；Operation Logs、Select 元件修正 warning。
- **提醒設定重構**：Mail Management 頁移入提醒設定，支援即時開關、預設通知上傳者、額外 Email 去重，並將設定持久化在 `system_settings`。
- **使用者 CRUD 強化**：UserManagement 支援新增/刪除帳號，後端新增相對應 API，且所有動作皆記錄於 Operation Logs。
- **🎯 月份選擇差異追蹤（v2.2.0）**：客戶選片時自動顯示上月已選清單，送出前彈出確認視窗清楚呈現異動（下架/新增/保留），郵件通知也包含完整差異摘要。詳見 [MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md](MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md)。
- **🔧 上傳月份識別優化（v2.2.1）**：修正上傳時月份誤判問題，系統現優先從批次名稱提取月份，其次檔名，最後才使用系統日期。支援多種月份格式（如「10月」、「2024-10」等）。詳見 [UPLOAD_MONTH_EXTRACTION_FIX.md](UPLOAD_MONTH_EXTRACTION_FIX.md)。

> ✅ 另可參考 [NEW_FEATURES_SUMMARY.md](NEW_FEATURES_SUMMARY.md)、[UI_IMPROVEMENTS_SUMMARY.md](UI_IMPROVEMENTS_SUMMARY.md)、[DESIGN_REFINEMENT_SUMMARY.md](DESIGN_REFINEMENT_SUMMARY.md) 與 [OPTIMIZATION_LOG_2025_11.md](OPTIMIZATION_LOG_2025_11.md) 了解版本 2.0~2.1.2 的完整變更與設計理念。

## 功能特色

### 三層權限架構 ⭐ 新增

#### 管理員 (Admin)
- ✅ 上傳包含嵌入圖片的 Excel 影片清單
- ✅ 編輯和刪除批次
- ✅ 查看所有客戶的選擇狀態
- ✅ 查看歷史上傳記錄
- ✅ 設定每月提醒通知
- ✅ 管理所有用戶角色
- ✅ 查看系統操作紀錄（Audit Log）

#### 上傳者 (Uploader) ⭐ 新增
- ✅ 上傳包含嵌入圖片的 Excel 影片清單
- ✅ 編輯影片資訊
- ✅ 查看所有客戶的選擇狀態
- ❌ 無法刪除批次
- ❌ 無法設定提醒通知
- ❌ 無法管理用戶

#### 客戶 (Customer)
- ✅ 瀏覽當月可選擇的影片清單（含圖片）
- ✅ 選擇想要的影片
- ✅ 自動檢視上月已選片單，可比對異動
- ✅ 提交前確認下架與新增清單
- ✅ 提交選擇清單
- ✅ 接收新清單上傳通知

### 自動化功能
- 管理員上傳清單後，自動發送 Email 通知所有客戶
- 客戶提交選擇後，自動發送 Email 給管理員（含上月比對差異）
- 支援設定每月固定日期提醒管理員上傳清單
- 自動追蹤與計算月份間的影片異動

## 專案結構

```
Fashion_movielist/
├── frontend/                 # React 前端應用
│   ├── src/
│   │   ├── components/      # 可重用組件
│   │   ├── pages/          # 頁面組件
│   │   ├── contexts/       # React Context
│   │   ├── lib/            # 工具函數
│   │   └── App.jsx         # 主應用組件
│   ├── public/             # 靜態資源
│   └── package.json
│
├── backend/                 # Node.js 後端 API
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 業務邏輯
│   │   ├── utils/          # 工具函數
│   │   └── server.js       # 伺服器入口
│   ├── .env.example        # 環境變數範例
│   └── package.json
│
├── database/               # 資料庫相關
│   └── schema.sql         # Supabase 資料庫結構
│
└── README.md              # 專案說明文件
```

## 環境設定

### 前置需求
- Node.js 18+ 
- npm 或 yarn
- Supabase 帳號
- Azure AD 應用程式（用於 Microsoft Graph API）

### 安裝步驟

1. **Clone 專案**
```bash
cd Fashion_movielist
```

2. **安裝後端依賴**
```bash
cd backend
npm install
```

3. **設定後端環境變數**
```bash
cp .env.example .env
# 編輯 .env 填入以下資訊：
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - AZURE_CLIENT_ID
# - AZURE_CLIENT_SECRET
# - AZURE_TENANT_ID
# - ADMIN_EMAIL
```

4. **設定 Supabase 資料庫**
- 登入 Supabase Dashboard
- 執行 `database/schema.sql` 中的 SQL 指令

5. **安裝前端依賴**
```bash
cd ../frontend
npm install
```

6. **設定前端環境變數**
```bash
# 在 frontend/.env 中設定：
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_API_URL=http://localhost:3000
```

### Azure AD Client Secret 提醒

請確保 `.env` 中 `AZURE_CLIENT_SECRET` 填入 **Client Secret Value**（通常包含 `~`），不要填入 Secret ID。若忘記複製 Value，需要在 Azure Portal 重新建立新的 Secret。詳細步驟請見 [AZURE_AD_SETUP_FIX.md](AZURE_AD_SETUP_FIX.md)。

## 開發模式

### 啟動後端
```bash
cd backend
npm run dev
# 後端將在 http://localhost:3000 運行
```

### 啟動前端
```bash
cd frontend
npm run dev
# 前端將在 http://localhost:5173 運行
```

## 部署

### 前端部署（Vercel）
```bash
cd frontend
npm run build
# 使用 Vercel CLI 或連接 GitHub 自動部署
```

### 後端部署（Render）
- 連接 GitHub repository
- 設定環境變數
- 選擇 Node.js 環境
- 設定啟動命令: `npm start`

## 🧩 主要功能與檔案

### 影片批次與月份流程

- `backend/src/routes/upload.js` 會從上傳 Excel 名稱提取月份並寫入 `batches.month` (`YYYY-MM`)；若不合法則 fallback 為當月。
- `frontend/src/pages/MovieSelection.jsx`、`VideoManagement.jsx` 與 `AdminDashboard.jsx` 內建月份選擇器，可載入歷史批次。
- 客戶可於 `SelectionHistory.jsx` 查看所有提交紀錄與縮圖，管理員/上傳者亦可檢視。
- 影片編輯（`VideoEditModal.jsx` + `videos.js` API）支援文字欄位、封面替換、即時預覽與權限控管。

### Operation Logs（操作紀錄）

### Operation Logs（操作紀錄）

- `public.operation_logs` 表記錄所有敏感操作。
- 後端 `recordOperationEvent` 服務統一寫入。
- 前端 `/operation-logs` 頁面提供卡片/清單雙視圖、篩選、重新整理。
- 管理員可在設定頁調整保留天數（7–365 天），立即觸發清理並於 metadata 紀錄刪除筆數。
- 相關說明請參考 [OPERATION_LOGS_IMPLEMENTATION.md](OPERATION_LOGS_IMPLEMENTATION.md)。

### Mail Management 與提醒設定

- 設定頁面移至 `MailManagement`，開關為即時生效，停用時 UI 會鎖定設定避免誤操作。
- 預設通知對象包含所有上傳者，另可新增額外 Email，系統會自動偵測重複與格式。
- 排程設定（日期、時間、訊息）直接同步至後端 `system_settings`，伺服器重啟不會遺失。
- 透過「補發上傳通知」可重新寄送本月片單提醒給所有客戶。

### UI/UX 設計準則與優化

- v2.1.1 ~ v2.1.2 圍繞 **Apple 風格 + Glassmorphism**：白底、毛玻璃、圓角 12~16px、對比明確與 200ms 過渡。詳細參考 [UI_IMPROVEMENTS_SUMMARY.md](UI_IMPROVEMENTS_SUMMARY.md) 與 [DESIGN_REFINEMENT_SUMMARY.md](DESIGN_REFINEMENT_SUMMARY.md)。
- 按鈕樣式：橘色純色（最新設計）或紫色漸層（早期版本）皆保留統一的 `btn` 原子類別，具備 hover 陰影、active 壓縮、focus ring 與禁用態。
- 輸入框：全白背景、2px 邊框、橘色 focus ring、`rounded-xl`，確保登入/註冊可讀性。
- 影片選擇頁支援 Grid / List 視圖切換、已選狀態記憶與空狀態插圖，並新增浮動選單 Bar 呈現目前選擇。
- Login/BrandTransition 介面採 Split Layout + 毛玻璃卡片；Footer 提供完整公司資訊、法律條款與支援連結。

### 核心共用組件與訊息系統

- `Select.jsx`：自定義下拉選單，提供跨瀏覽器一致 UI、hover/focus 樣式與滾動條優化。
- `ToastContext.jsx`：統一路徑訊息，依成功/錯誤/警告/資訊套用不同底色並具滑入淡出動畫（取代舊 alert）。
- `Modal.jsx`：採用原生 `createPortal`，內建 ESC/背景關閉、focus trap、scroll lock，移除對 headless UI 依賴。
- `emailService.js`：郵件模板改為極簡排版 + 摘要資訊卡，並提供可帶主旨的支援連結。

### 法律文件與頁腳

- `LegalDocs.jsx` 聚合隱私權政策、使用條款並透過 Modal 顯示，避免跳頁；Footer 以中英文公司資訊、支援連結與版權聲明構成。

### Excel 格式要求

上傳的 Excel 檔案必須包含以下欄位：
- 圖片（嵌入式圖片）
- 片名
- 英文片名
- 簡介
- 導演
- 男演員
- 女演員
- 片長
- 級別
- 發音
- 字幕

### API 端點總覽

### 認證相關
- `POST /api/auth/register` - 註冊新用戶
- `POST /api/auth/login` - 用戶登入

### 影片管理
- `GET /api/videos/latest` - 獲取最新影片清單
- `POST /api/upload` - 上傳 Excel 清單（管理員）

### 選擇管理
- `POST /api/select` - 提交影片選擇（客戶）
- `GET /api/selections` - 查看所有選擇（管理員）

### 通知管理
- `POST /api/reminders` - 設定提醒通知
- `POST /api/mail-rules/notifications/upload` - Admin/Uploader 補發最新批次上傳通知（記錄於 Operation Logs）

## 🔐 授權

此專案為私有專案，僅供內部使用。

## 📚 文件索引

> 如果只需要查找文件，可直接閱讀 [📚_文件索引.md](📚_文件索引.md)。以下為重點節錄：

| 目的 | 推薦閱讀 |
|------|-----------|
| 第一次接觸 | [START_HERE.md](START_HERE.md)、[QUICK_START.md](QUICK_START.md)、[QUICK_REFERENCE.md](QUICK_REFERENCE.md) |
| 了解 v2.0 更新 | [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)、[ANSWERS_TO_YOUR_QUESTIONS.md](ANSWERS_TO_YOUR_QUESTIONS.md)、[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) |
| v2.1 功能與 UI 改版 | [NEW_FEATURES_SUMMARY.md](NEW_FEATURES_SUMMARY.md)、[UI_IMPROVEMENTS_SUMMARY.md](UI_IMPROVEMENTS_SUMMARY.md)、[DESIGN_REFINEMENT_SUMMARY.md](DESIGN_REFINEMENT_SUMMARY.md) |
| 2025-11 優化與調整 | [UPDATE_SUMMARY_2025_11_24.md](UPDATE_SUMMARY_2025_11_24.md)、[OPTIMIZATION_LOG_2025_11.md](OPTIMIZATION_LOG_2025_11.md) |
| 部署與維運 | [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)、[DEPLOYMENT.md](DEPLOYMENT.md)、[ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) |
| 權限與測試 | [PERMISSION_SYSTEM_UPDATE.md](PERMISSION_SYSTEM_UPDATE.md)、[TESTING_NEW_FEATURES.md](TESTING_NEW_FEATURES.md) |
| 部署與設定 | [DEPLOYMENT.md](DEPLOYMENT.md)、[ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)、[AZURE_AD_SETUP_FIX.md](AZURE_AD_SETUP_FIX.md) |
| 資料庫 | [database/README.md](database/README.md)、[database/schema.sql](database/schema.sql) |

更多分類（依角色/目的）請見文件索引。

## 🔄 系統資料重設流程（Supabase）

使用前請務必備份。以下 SQL 可在 Supabase SQL Editor 依序執行：

### 1. 清空 `public` schema
```sql
begin;
truncate table public.operation_logs restart identity cascade;
truncate table public.password_resets restart identity cascade;
truncate table public.mail_rules restart identity cascade;
truncate table public.selections restart identity cascade;
truncate table public.videos restart identity cascade;
truncate table public.batches restart identity cascade;
truncate table public.profiles restart identity cascade;
truncate table public.system_settings restart identity cascade;
commit;
```

### 2. 清空 Supabase Auth
```sql
begin;
delete from auth.identities;
delete from auth.users;
commit;
```

> 若僅移除特定帳號，可在 `where` 子句指定 `id` 或 `email`。

### 3. 重建預設管理員（`support@fas.com.tw / infrasysfas`）

```sql
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '3d3a9f09-01a9-4cd5-9149-2fcb16299b4a',
  '00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','support@fas.com.tw',
  crypt('infrasysfas', gen_salt('bf', 10)),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object(
    'sub', '3d3a9f09-01a9-4cd5-9149-2fcb16299b4a',
    'name', 'FASsupport', 'role', 'admin',
    'email', 'support@fas.com.tw', 'email_verified', true, 'phone_verified', false
  ),
  now(), now()
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  created_at, updated_at
)
values (
  gen_random_uuid(),
  '3d3a9f09-01a9-4cd5-9149-2fcb16299b4a',
  'support@fas.com.tw','email',
  jsonb_build_object('sub','3d3a9f09-01a9-4cd5-9149-2fcb16299b4a','email','support@fas.com.tw'),
  now(), now()
);

insert into public.profiles (id, name, email, role, created_at, updated_at)
values (
  '3d3a9f09-01a9-4cd5-9149-2fcb16299b4a',
  'FASsupport','support@fas.com.tw','admin', now(), now()
);
```

完成後請清除瀏覽器 localStorage 的 `supabase.auth.*` token，再以預設帳號登入。

## 📈 專案狀態與聯絡

- **版本**：v2.0.0 （2025-11-24 更新）
- **程式碼行數**：~6,000 行 ｜ **文件字數**：~25,000 字
- **里程碑**：三層權限、用戶管理、操作紀錄、提醒設定全數完成

如需協助或發現文件錯誤，請與系統管理員聯繫或於文件中標註 TODO。

