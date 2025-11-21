# 專案檔案總覽

本文件提供專案中所有檔案的完整列表和說明。

## 📁 專案結構

```
Fashion_movielist/
├── 📄 README.md                          # 專案主要說明文件
├── 📄 QUICK_START.md                     # 5-10分鐘快速開始指南
├── 📄 DEPLOYMENT.md                      # 雲端部署完整指南
├── 📄 ENV_SETUP_GUIDE.md                 # 環境變數設定詳細說明
├── 📄 PROJECT_SUMMARY.md                 # 專案技術總結
├── 📄 PROJECT_FILES_OVERVIEW.md          # 檔案總覽（本文件）
├── 📄 CHECKLIST.md                       # 專案完成檢查清單
├── 📄 .gitignore                         # Git 忽略檔案配置
├── 📄 UIP片單金隆11月.xlsx               # Excel 範例檔案
│
├── 📁 frontend/                          # React 前端應用
│   ├── 📁 public/
│   │   └── 📄 vite.svg                   # Vite Logo
│   │
│   ├── 📁 src/
│   │   ├── 📁 components/                # React 組件
│   │   │   ├── 📄 Layout.jsx             # 主佈局組件（導航欄、頁尾）
│   │   │   └── 📄 MovieCard.jsx          # 影片卡片組件
│   │   │
│   │   ├── 📁 contexts/                  # React Context
│   │   │   └── 📄 AuthContext.jsx        # 認證狀態管理
│   │   │
│   │   ├── 📁 lib/                       # 工具庫
│   │   │   ├── 📄 supabase.js            # Supabase 客戶端
│   │   │   └── 📄 api.js                 # API 請求封裝
│   │   │
│   │   ├── 📁 pages/                     # 頁面組件
│   │   │   ├── 📄 Login.jsx              # 登入頁面
│   │   │   ├── 📄 Register.jsx           # 註冊頁面
│   │   │   ├── 📄 AdminDashboard.jsx     # 管理員儀表板
│   │   │   ├── 📄 CustomerDashboard.jsx  # 客戶儀表板
│   │   │   ├── 📄 MovieSelection.jsx     # 影片選擇頁面
│   │   │   └── 📄 Settings.jsx           # 設定頁面
│   │   │
│   │   ├── 📄 App.jsx                    # 主應用組件
│   │   ├── 📄 main.jsx                   # 應用入口
│   │   └── 📄 index.css                  # 全域樣式
│   │
│   ├── 📄 index.html                     # HTML 入口
│   ├── 📄 package.json                   # 前端依賴配置
│   ├── 📄 vite.config.js                 # Vite 配置
│   ├── 📄 tailwind.config.js             # Tailwind CSS 配置
│   ├── 📄 postcss.config.js              # PostCSS 配置
│   ├── 📄 .eslintrc.cjs                  # ESLint 配置
│   ├── 📄 .env.example                   # 環境變數範例
│   └── 📄 vercel.json                    # Vercel 部署配置
│
├── 📁 backend/                           # Node.js 後端 API
│   ├── 📁 src/
│   │   ├── 📁 config/                    # 配置文件
│   │   │   ├── 📄 supabase.js            # Supabase 連接配置
│   │   │   └── 📄 graphClient.js         # Microsoft Graph API 配置
│   │   │
│   │   ├── 📁 routes/                    # API 路由
│   │   │   ├── 📄 upload.js              # Excel 上傳路由
│   │   │   ├── 📄 videos.js              # 影片查詢路由
│   │   │   ├── 📄 selections.js          # 選擇管理路由
│   │   │   └── 📄 reminders.js           # 提醒管理路由
│   │   │
│   │   ├── 📁 services/                  # 業務邏輯服務
│   │   │   ├── 📄 excelService.js        # Excel 解析與圖片提取
│   │   │   ├── 📄 emailService.js        # Email 通知服務
│   │   │   └── 📄 reminderService.js     # 提醒排程服務
│   │   │
│   │   ├── 📁 utils/                     # 工具函數
│   │   │   └── 📄 README.md              # 工具函數說明
│   │   │
│   │   └── 📄 server.js                  # Express 伺服器入口
│   │
│   ├── 📄 package.json                   # 後端依賴配置
│   ├── 📄 .env.example                   # 環境變數範例
│   ├── 📄 Dockerfile                     # Docker 容器配置
│   ├── 📄 .dockerignore                  # Docker 忽略檔案
│   └── 📄 render.yaml                    # Render 部署配置
│
└── 📁 database/                          # 資料庫相關
    ├── 📄 schema.sql                     # 完整資料庫結構 SQL
    └── 📄 README.md                      # 資料庫設定指南
```

## 📄 文件說明

### 根目錄文件

| 檔案 | 用途 | 適合對象 |
|------|------|----------|
| `README.md` | 專案主要說明，包含功能介紹、技術架構、安裝步驟 | 所有人 |
| `QUICK_START.md` | 5-10分鐘快速開始指南，快速在本地運行系統 | 開發者 |
| `DEPLOYMENT.md` | 雲端部署完整指南（Vercel + Render） | 部署人員 |
| `ENV_SETUP_GUIDE.md` | 環境變數設定詳細說明（Supabase + Azure AD） | 設定人員 |
| `PROJECT_SUMMARY.md` | 專案技術總結，包含架構、功能、API 文件 | 技術人員 |
| `CHECKLIST.md` | 專案完成檢查清單，確保所有功能正常 | 測試人員 |
| `PROJECT_FILES_OVERVIEW.md` | 檔案總覽（本文件） | 所有人 |

### 前端檔案

#### 核心配置
- `package.json` - 前端依賴和腳本
- `vite.config.js` - Vite 建置工具配置
- `tailwind.config.js` - Tailwind CSS 樣式配置
- `.eslintrc.cjs` - 程式碼檢查規則
- `vercel.json` - Vercel 部署配置

#### 組件 (`src/components/`)
- `Layout.jsx` - 主佈局，包含導航欄和頁尾
- `MovieCard.jsx` - 影片卡片，顯示影片資訊和選擇狀態

#### Context (`src/contexts/`)
- `AuthContext.jsx` - 認證狀態管理，處理登入/註冊/登出

#### 工具庫 (`src/lib/`)
- `supabase.js` - Supabase 客戶端初始化
- `api.js` - API 請求封裝（Axios）

#### 頁面 (`src/pages/`)
- `Login.jsx` - 登入頁面
- `Register.jsx` - 註冊頁面
- `AdminDashboard.jsx` - 管理員儀表板（上傳、查看選擇）
- `CustomerDashboard.jsx` - 客戶儀表板（歡迎頁面）
- `MovieSelection.jsx` - 影片選擇頁面（主要功能）
- `Settings.jsx` - 設定頁面（個人資料、提醒設定）

### 後端檔案

#### 核心配置
- `package.json` - 後端依賴和腳本
- `server.js` - Express 伺服器入口
- `Dockerfile` - Docker 容器配置
- `render.yaml` - Render 部署配置

#### 配置 (`src/config/`)
- `supabase.js` - Supabase 連接和測試
- `graphClient.js` - Microsoft Graph API 客戶端

#### 路由 (`src/routes/`)
- `upload.js` - Excel 上傳 API
- `videos.js` - 影片查詢 API
- `selections.js` - 選擇管理 API
- `reminders.js` - 提醒管理 API

#### 服務 (`src/services/`)
- `excelService.js` - Excel 解析、圖片提取、資料插入
- `emailService.js` - Email 通知（新清單、客戶選擇）
- `reminderService.js` - Cron 排程、提醒發送

### 資料庫檔案

- `schema.sql` - 完整資料庫結構，包含：
  - 4 個主要表格（profiles, batches, videos, selections）
  - RLS 政策
  - 觸發器
  - Storage Bucket 配置
  - 視圖
- `README.md` - 資料庫設定指南

## 🔑 關鍵檔案詳解

### 1. `backend/src/services/excelService.js`

**最複雜的檔案**，負責：
- 讀取 Excel 檔案
- 提取嵌入的圖片（使用 ExcelJS）
- 匹配圖片到對應的資料行
- 上傳圖片到 Supabase Storage
- 解析影片資訊
- 批次插入資料庫

**關鍵函數**:
```javascript
parseExcelAndUpload(file, uploaderId, batchName)
extractImagesFromWorksheet(worksheet, workbook)
findImageForRow(images, rowNumber)
uploadImageToStorage(image, batchId)
```

### 2. `frontend/src/pages/MovieSelection.jsx`

**核心功能頁面**，實現：
- 影片網格顯示
- 多選功能
- 選擇狀態管理
- 提交選擇
- 成功/錯誤提示

**狀態管理**:
```javascript
const [videos, setVideos] = useState([])
const [selectedIds, setSelectedIds] = useState([])
```

### 3. `database/schema.sql`

**資料庫核心**，定義：
- 4 個主要表格
- 完整的 RLS 政策
- 自動觸發器
- Storage 配置

**關鍵表格**:
- `profiles` - 用戶資料
- `batches` - 批次記錄
- `videos` - 影片資料
- `selections` - 客戶選擇

### 4. `backend/src/config/graphClient.js`

**Email 核心**，實現：
- Azure AD 認證
- Access Token 獲取
- Email 發送（HTML 格式）

**關鍵函數**:
```javascript
getAccessToken()
getGraphClient()
sendEmail({ to, subject, body, from })
```

## 📊 檔案統計

### 程式碼檔案
- **前端**: 15 個 JSX/JS 檔案
- **後端**: 11 個 JS 檔案
- **資料庫**: 1 個 SQL 檔案
- **配置**: 10+ 個配置檔案

### 文件檔案
- **說明文件**: 7 個 MD 檔案
- **總字數**: 約 20,000+ 字

### 總行數估算
- **前端程式碼**: ~2,000 行
- **後端程式碼**: ~1,500 行
- **資料庫 SQL**: ~400 行
- **文件**: ~1,500 行
- **總計**: ~5,400 行

## 🎯 檔案使用指南

### 開始使用
1. 閱讀 `README.md` 了解專案
2. 閱讀 `QUICK_START.md` 快速開始
3. 閱讀 `ENV_SETUP_GUIDE.md` 設定環境

### 開發階段
1. 參考 `frontend/src/` 了解前端結構
2. 參考 `backend/src/` 了解後端結構
3. 參考 `database/schema.sql` 了解資料結構

### 部署階段
1. 閱讀 `DEPLOYMENT.md` 部署指南
2. 使用 `vercel.json` 部署前端
3. 使用 `render.yaml` 部署後端

### 測試階段
1. 使用 `CHECKLIST.md` 檢查功能
2. 參考 `PROJECT_SUMMARY.md` 了解 API

## 🔍 快速查找

### 想要...
- **了解專案** → `README.md`
- **快速開始** → `QUICK_START.md`
- **設定環境變數** → `ENV_SETUP_GUIDE.md`
- **部署到雲端** → `DEPLOYMENT.md`
- **了解技術細節** → `PROJECT_SUMMARY.md`
- **檢查完成度** → `CHECKLIST.md`
- **查看檔案結構** → `PROJECT_FILES_OVERVIEW.md`（本文件）

### 想要修改...
- **登入頁面** → `frontend/src/pages/Login.jsx`
- **影片卡片** → `frontend/src/components/MovieCard.jsx`
- **上傳邏輯** → `backend/src/services/excelService.js`
- **Email 模板** → `backend/src/services/emailService.js`
- **資料庫結構** → `database/schema.sql`
- **API 路由** → `backend/src/routes/*.js`

### 想要了解...
- **認證流程** → `frontend/src/contexts/AuthContext.jsx`
- **API 請求** → `frontend/src/lib/api.js`
- **Excel 處理** → `backend/src/services/excelService.js`
- **Email 發送** → `backend/src/services/emailService.js`
- **提醒排程** → `backend/src/services/reminderService.js`

## 📝 檔案命名規範

### 前端
- 組件檔案：`PascalCase.jsx`（如 `MovieCard.jsx`）
- 工具檔案：`camelCase.js`（如 `supabase.js`）
- 樣式檔案：`kebab-case.css`（如 `index.css`）

### 後端
- 路由檔案：`camelCase.js`（如 `upload.js`）
- 服務檔案：`camelCaseService.js`（如 `excelService.js`）
- 配置檔案：`camelCase.js`（如 `supabase.js`）

### 文件
- 說明文件：`SCREAMING_SNAKE_CASE.md`（如 `README.md`）
- 一般文件：`kebab-case.md`（如 `quick-start.md`）

## 🎉 總結

本專案包含：
- ✅ 完整的前後端程式碼
- ✅ 詳細的資料庫結構
- ✅ 完善的部署配置
- ✅ 豐富的說明文件
- ✅ 清晰的檔案組織

**所有檔案都已準備就緒，可以立即開始使用！** 🚀

