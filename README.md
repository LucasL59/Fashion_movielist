# 每月影片選擇系統 (Monthly Movie Selection System)

## 專案簡介

這是一個基於 React + Node.js 的影片選擇系統，讓管理員可以上傳每月的影片清單（Excel 格式），客戶可以登入選擇想要的影片，系統會自動透過 Email 通知相關人員。

## 技術架構

### 前端
- **框架**: React 18 (Vite)
- **UI 框架**: Tailwind CSS + Shadcn UI
- **狀態管理**: React Context + Hooks
- **路由**: React Router v6
- **HTTP 客戶端**: Axios

### 後端
- **框架**: Node.js + Express
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **檔案儲存**: Supabase Storage
- **Email 服務**: Microsoft Graph API
- **Excel 處理**: exceljs

## 功能特色

### 三層權限架構 ⭐ 新增

#### 管理員 (Admin)
- ✅ 上傳包含嵌入圖片的 Excel 影片清單
- ✅ 編輯和刪除批次
- ✅ 查看所有客戶的選擇狀態
- ✅ 查看歷史上傳記錄
- ✅ 設定每月提醒通知
- ✅ 管理所有用戶角色

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
- ✅ 提交選擇清單
- ✅ 接收新清單上傳通知

### 自動化功能
- 管理員上傳清單後，自動發送 Email 通知所有客戶
- 客戶提交選擇後，自動發送 Email 給管理員
- 支援設定每月固定日期提醒管理員上傳清單

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

## Excel 格式要求

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

## API 端點

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

## 授權

此專案為私有專案，僅供內部使用。

## 專案文件

本專案提供完整的文件說明：

| 文件 | 說明 | 適合對象 |
|------|------|----------|
| [README.md](README.md) | 專案主要說明（本文件） | 所有人 |
| [PERMISSION_SYSTEM_UPDATE.md](PERMISSION_SYSTEM_UPDATE.md) | ⭐ 權限系統更新說明 | 所有人 |
| [QUICK_START.md](QUICK_START.md) | 5-10分鐘快速開始指南 | 開發者 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 雲端部署完整指南 | 部署人員 |
| [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) | 環境變數設定詳細說明 | 設定人員 |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | 專案技術總結 | 技術人員 |
| [PROJECT_FILES_OVERVIEW.md](PROJECT_FILES_OVERVIEW.md) | 檔案結構總覽 | 所有人 |
| [CHECKLIST.md](CHECKLIST.md) | 專案完成檢查清單 | 測試人員 |
| [database/README.md](database/README.md) | 資料庫設定指南 | 資料庫管理員 |

## 快速連結

- 📚 [快速開始](QUICK_START.md) - 立即開始使用
- 🚀 [部署指南](DEPLOYMENT.md) - 部署到雲端
- ⚙️ [環境設定](ENV_SETUP_GUIDE.md) - 設定環境變數
- 📊 [技術總結](PROJECT_SUMMARY.md) - 了解技術細節
- 📁 [檔案總覽](PROJECT_FILES_OVERVIEW.md) - 查看專案結構
- ✅ [檢查清單](CHECKLIST.md) - 確認完成度

## 專案狀態

**版本**: 2.0.0  
**狀態**: ✅ 已完成並可部署  
**最後更新**: 2024年11月21日  
**程式碼行數**: ~6,000 行  
**文件字數**: ~25,000 字

### 版本更新記錄

#### v2.0.0 (2024-11-21)
- ✨ 新增三層權限架構（admin/uploader/customer）
- ✨ 新增用戶管理頁面
- ✨ 新增批次刪除功能
- 🔒 強化 RLS 安全政策
- 📝 完整的權限系統文件

#### v1.0.0 (2024-11)
- 🎉 初始版本發布
- ✨ 基本上傳和選擇功能
- ✨ Email 通知系統
- ✨ Excel 圖片提取

## 聯絡資訊

如有問題，請聯繫專案管理員。

