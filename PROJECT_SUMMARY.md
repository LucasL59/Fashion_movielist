# 專案總結

## 專案概述

**每月影片選擇系統** 是一個完整的全端 Web 應用程式，讓管理員可以上傳包含嵌入圖片的 Excel 影片清單，客戶可以登入選擇想要的影片，系統會自動透過 Email 通知相關人員。

## 技術架構

### 前端
- **框架**: React 18 + Vite
- **UI**: Tailwind CSS + 自定義組件
- **路由**: React Router v6
- **狀態管理**: React Context API
- **HTTP 客戶端**: Axios
- **圖示**: Lucide React

### 後端
- **框架**: Node.js + Express
- **Excel 處理**: ExcelJS（支援嵌入圖片提取）
- **檔案上傳**: express-fileupload
- **排程**: node-cron
- **安全性**: Helmet, CORS

### 資料庫與服務
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **檔案儲存**: Supabase Storage
- **Email**: Microsoft Graph API (Azure AD)

## 核心功能

### 1. 用戶認證系統
- 註冊/登入功能
- 角色管理（管理員/客戶）
- Email 驗證
- 個人資料管理

### 2. 管理員功能
- **上傳影片清單**
  - 支援 Excel (.xlsx, .xls) 格式
  - 自動提取嵌入的影片圖片
  - 上傳圖片到 Supabase Storage
  - 解析影片資訊（片名、導演、演員等）
  - 自動發送通知給所有客戶

- **查看客戶選擇**
  - 顯示所有批次列表
  - 查看每個批次的客戶選擇
  - 統計選擇數量

- **提醒通知設定**
  - 設定每月固定時間提醒
  - 自定義提醒訊息
  - 測試提醒功能

### 3. 客戶功能
- **瀏覽影片清單**
  - 網格式卡片顯示
  - 顯示影片圖片、片名、簡介等
  - 響應式設計

- **選擇影片**
  - 多選功能
  - 即時顯示已選數量
  - 視覺化選中狀態

- **提交選擇**
  - 一鍵提交
  - 自動發送 Email 給管理員
  - 成功提示

### 4. 自動化通知
- **新清單通知**
  - 管理員上傳後自動發送
  - 發送給所有註冊客戶
  - 包含查看連結

- **選擇通知**
  - 客戶提交後自動發送
  - 發送給管理員
  - 包含完整選擇清單

- **定期提醒**
  - 可設定每月固定時間
  - 提醒管理員上傳清單
  - Cron 排程執行

## 專案結構

```
Fashion_movielist/
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # UI 組件
│   │   │   ├── Layout.jsx
│   │   │   └── MovieCard.jsx
│   │   ├── contexts/        # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── lib/            # 工具庫
│   │   │   ├── supabase.js
│   │   │   └── api.js
│   │   ├── pages/          # 頁面組件
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── CustomerDashboard.jsx
│   │   │   ├── MovieSelection.jsx
│   │   │   └── Settings.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json          # Vercel 部署配置
│
├── backend/                 # Node.js 後端
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   │   ├── supabase.js
│   │   │   └── graphClient.js
│   │   ├── routes/         # API 路由
│   │   │   ├── upload.js
│   │   │   ├── videos.js
│   │   │   ├── selections.js
│   │   │   └── reminders.js
│   │   ├── services/       # 業務邏輯
│   │   │   ├── excelService.js
│   │   │   ├── emailService.js
│   │   │   └── reminderService.js
│   │   └── server.js       # 伺服器入口
│   ├── package.json
│   ├── Dockerfile          # Docker 配置
│   ├── render.yaml         # Render 部署配置
│   └── .env.example        # 環境變數範例
│
├── database/               # 資料庫
│   ├── schema.sql         # 資料庫結構
│   └── README.md          # 資料庫文件
│
├── README.md              # 專案說明
├── QUICK_START.md         # 快速開始指南
├── DEPLOYMENT.md          # 部署指南
├── PROJECT_SUMMARY.md     # 專案總結（本文件）
└── .gitignore
```

## 資料庫結構

### profiles（用戶資料）
- 儲存用戶基本資訊
- 關聯到 Supabase Auth
- 角色管理（admin/customer）

### batches（批次記錄）
- 追蹤每次上傳
- 記錄上傳者和時間
- 狀態管理（active/archived）

### videos（影片資料）
- 完整的影片資訊
- 關聯到批次
- 包含縮圖 URL

### selections（客戶選擇）
- 記錄客戶的選擇
- 使用 UUID 陣列儲存影片 ID
- 支援更新選擇

## API 端點

### 認證相關
- `POST /api/auth/register` - 註冊
- `POST /api/auth/login` - 登入

### 影片管理
- `GET /api/videos/latest` - 獲取最新清單
- `GET /api/videos/batch/:batchId` - 獲取特定批次
- `GET /api/videos/batches` - 獲取所有批次
- `POST /api/upload` - 上傳 Excel

### 選擇管理
- `POST /api/selections` - 提交選擇
- `GET /api/selections/user/:userId` - 用戶選擇記錄
- `GET /api/selections/batch/:batchId` - 批次選擇統計

### 提醒管理
- `POST /api/reminders/schedule` - 設定排程
- `POST /api/reminders/send` - 立即發送

## 關鍵技術實現

### 1. Excel 圖片提取

使用 ExcelJS 提取嵌入在 Excel 中的圖片：

```javascript
// 提取圖片
const images = worksheet.getImages()

// 匹配圖片到對應的行
images.forEach((image) => {
  const rowNumber = image.range.tl.row + 1
  // 上傳到 Supabase Storage
})
```

### 2. 圖片上傳到 Supabase

```javascript
const { data } = await supabase.storage
  .from('movie-thumbnails')
  .upload(fileName, imageBuffer, {
    contentType: 'image/jpeg'
  })
```

### 3. Email 通知

使用 Microsoft Graph API 發送 HTML Email：

```javascript
await client
  .api(`/users/${senderEmail}/sendMail`)
  .post({
    message: {
      subject: '...',
      body: { contentType: 'HTML', content: '...' },
      toRecipients: [...]
    }
  })
```

### 4. Cron 排程

```javascript
cron.schedule('0 9 1 * *', async () => {
  await sendReminderEmail()
})
```

## 安全性措施

### Row Level Security (RLS)
- 所有 Supabase 表格啟用 RLS
- 用戶只能存取自己的資料
- 管理員有額外權限

### 認證與授權
- Supabase Auth 處理認證
- JWT Token 驗證
- 角色基礎存取控制

### API 安全
- Helmet 中間件
- CORS 配置
- 環境變數保護敏感資訊

## 部署選項

### 推薦方案（免費）
- **前端**: Vercel
- **後端**: Render
- **資料庫**: Supabase
- **Email**: Microsoft Graph API

### 其他選項
- Railway
- Heroku
- AWS (EC2 + RDS)
- 自建伺服器

## 開發工作流程

### 本地開發
```bash
# 後端
cd backend
npm install
npm run dev

# 前端
cd frontend
npm install
npm run dev
```

### 部署流程
1. 推送到 GitHub
2. Vercel 自動部署前端
3. Render 自動部署後端
4. 檢查健康狀態

## 未來擴展建議

### 功能擴展
1. **進階搜尋與篩選**
   - 按類型、導演、演員篩選
   - 全文搜尋

2. **批次比較**
   - 比較不同批次的差異
   - 追蹤影片變更

3. **統計報表**
   - 客戶選擇偏好分析
   - 熱門影片排行

4. **通知中心**
   - 站內通知系統
   - 推播通知

5. **多語言支援**
   - i18n 國際化
   - 繁中/簡中/英文

### 技術優化
1. **效能優化**
   - 圖片 CDN
   - 資料分頁
   - 快取機制

2. **測試**
   - 單元測試（Jest）
   - E2E 測試（Playwright）
   - API 測試（Supertest）

3. **監控**
   - 錯誤追蹤（Sentry）
   - 效能監控（New Relic）
   - 日誌聚合（Logtail）

4. **CI/CD**
   - GitHub Actions
   - 自動化測試
   - 自動化部署

## 成本估算

### 免費方案（適合小型使用）
- Supabase: 500MB 資料庫
- Render: 750 小時/月
- Vercel: 100GB 頻寬
- **總計**: $0/月

### 付費方案（適合生產環境）
- Supabase Pro: $25/月
- Render Starter: $7/月
- Vercel Pro: $20/月
- **總計**: $52/月

## 學習資源

### 官方文件
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Express](https://expressjs.com)
- [Supabase](https://supabase.com/docs)
- [Microsoft Graph](https://docs.microsoft.com/graph)

### 相關教學
- React Router 路由管理
- Tailwind CSS 樣式設計
- ExcelJS 文件處理
- Supabase Auth 認證系統

## 貢獻指南

### 開發規範
1. 使用 ESLint 進行程式碼檢查
2. 遵循 Airbnb JavaScript Style Guide
3. 撰寫清晰的 commit 訊息
4. 為新功能撰寫測試

### Pull Request 流程
1. Fork 專案
2. 建立功能分支
3. 提交變更
4. 發起 Pull Request
5. 等待審核

## 授權

此專案為私有專案，僅供內部使用。

## 聯絡資訊

如有問題或建議，請聯繫專案管理員。

---

**專案完成日期**: 2024年11月
**版本**: 1.0.0
**狀態**: ✅ 已完成並可部署

