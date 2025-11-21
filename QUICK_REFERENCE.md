# 🚀 快速參考卡片

## 📋 權限快查表

| 功能 | Admin | Uploader | Customer |
|------|:-----:|:--------:|:--------:|
| 瀏覽影片 | ✅ | ✅ | ✅ |
| 選擇影片 | ✅ | ✅ | ✅ |
| 上傳清單 | ✅ | ✅ | ❌ |
| 編輯影片 | ✅ | ✅ | ❌ |
| **刪除批次** | ✅ | ❌ | ❌ |
| 查看所有選擇 | ✅ | ✅ | ❌ |
| **設定提醒** | ✅ | ❌ | ❌ |
| **管理用戶** | ✅ | ❌ | ❌ |

## 🔗 頁面路由

| 路由 | 權限 | 說明 |
|------|------|------|
| `/` | 所有人 | 首頁 |
| `/login` | 未登入 | 登入頁面 |
| `/register` | 未登入 | 註冊頁面 |
| `/admin` | Admin + Uploader | 上傳管理 |
| `/movies` | 已登入 | 影片清單 |
| `/settings` | 已登入 | 設定頁面 |
| **`/users`** | **Admin only** | **用戶管理** ⭐ |

## 🎯 常用操作

### 變更用戶角色（Admin）
```
1. 登入為 Admin
2. 點擊「用戶管理」
3. 選擇新角色
4. 自動儲存
```

### 刪除批次（Admin）
```
1. 前往「上傳管理」
2. 找到批次
3. 點擊垃圾桶圖示
4. 確認刪除
```

### 上傳清單（Admin/Uploader）
```
1. 前往「上傳管理」
2. 拖曳或選擇 Excel
3. 等待上傳完成
4. 系統自動通知客戶
```

### 選擇影片（Customer）
```
1. 前往「影片清單」
2. 點擊「加入清單」
3. 點擊「提交選擇」
4. 系統自動通知 Admin
```

## 📧 Email 通知

| 事件 | 收件人 | 內容 |
|------|--------|------|
| 上傳新清單 | 所有客戶 | 新清單可供選擇 |
| 客戶提交選擇 | Admin | 客戶選擇清單 |
| 每月提醒 | Admin | 提醒上傳清單 |

## 🔧 環境變數

### 後端 (backend/.env)
```env
# Supabase
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key

# Azure AD
AZURE_CLIENT_ID=your_id
AZURE_CLIENT_SECRET=your_secret  # ⚠️ 使用 Value 不是 Secret ID
AZURE_TENANT_ID=your_tenant

# Email
ADMIN_EMAIL=admin@example.com
```

### 前端 (frontend/.env)
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_API_URL=http://localhost:3000
```

## 🗄️ 資料庫表格

| 表格 | 說明 | 關鍵欄位 |
|------|------|----------|
| `profiles` | 用戶資料 | id, name, email, **role** |
| `batches` | 批次記錄 | id, name, created_at |
| `videos` | 影片資料 | id, title, thumbnail_url, batch_id |
| `selections` | 選擇記錄 | id, user_id, batch_id, video_ids |

## 🚀 啟動命令

```bash
# 後端
cd backend
npm run dev

# 前端
cd frontend
npm run dev

# 同時啟動（需要兩個終端）
```

## 📱 預設埠號

- 前端: http://localhost:5173
- 後端: http://localhost:3000

## 🔒 安全檢查清單

- [ ] 至少有一個 Admin 帳號
- [ ] Azure AD Client Secret 使用 Value（不是 Secret ID）
- [ ] Supabase RLS 政策已啟用
- [ ] 環境變數已正確設定
- [ ] .env 檔案不在 Git 版本控制中

## 🐛 快速除錯

### 登入後看不到正確選單
```
1. 檢查資料庫 role 欄位
2. 清除瀏覽器快取
3. 重新登入
```

### 無法上傳 Excel
```
1. 檢查檔案格式（.xlsx）
2. 檢查後端 console 錯誤
3. 確認 Supabase Storage 已設定
```

### Email 沒有發送
```
1. 檢查 Azure AD 設定
2. 查看後端 console
3. 確認 Client Secret 正確
4. 檢查垃圾郵件
```

### 權限錯誤
```
1. 確認 Supabase RLS 政策
2. 檢查用戶 role
3. 查看瀏覽器 F12 Network
```

## 📚 文件導航

### 新手入門
1. [START_HERE.md](START_HERE.md) - 從這裡開始
2. [QUICK_START.md](QUICK_START.md) - 快速開始
3. [README.md](README.md) - 專案說明

### v2.0 更新
1. [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) - 更新總結
2. [ANSWERS_TO_YOUR_QUESTIONS.md](ANSWERS_TO_YOUR_QUESTIONS.md) - 問題解答
3. [PERMISSION_SYSTEM_UPDATE.md](PERMISSION_SYSTEM_UPDATE.md) - 權限系統

### 測試與部署
1. [TESTING_NEW_FEATURES.md](TESTING_NEW_FEATURES.md) - 測試指南
2. [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
3. [CHECKLIST.md](CHECKLIST.md) - 檢查清單

### 技術文件
1. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 技術總結
2. [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) - 環境設定
3. [database/README.md](database/README.md) - 資料庫

## 💡 小技巧

### 設定第一個 Admin
```sql
-- 在 Supabase SQL Editor 執行
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

### 查看所有用戶角色
```sql
SELECT name, email, role, created_at 
FROM profiles 
ORDER BY created_at DESC;
```

### 清除測試資料
```sql
-- ⚠️ 小心使用！會刪除所有資料
DELETE FROM selections;
DELETE FROM videos;
DELETE FROM batches;
```

## 🎨 系統名稱與品牌

- **系統名稱**: MVI影片選擇系統
- **公司名稱**: 飛訊資訊
- **版本**: v2.0.0
- **更新日期**: 2024-11-21

## 📞 支援資源

| 問題類型 | 參考文件 |
|---------|---------|
| 如何使用？ | [QUICK_START.md](QUICK_START.md) |
| 權限問題？ | [PERMISSION_SYSTEM_UPDATE.md](PERMISSION_SYSTEM_UPDATE.md) |
| 測試問題？ | [TESTING_NEW_FEATURES.md](TESTING_NEW_FEATURES.md) |
| 部署問題？ | [DEPLOYMENT.md](DEPLOYMENT.md) |
| 技術細節？ | [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) |

---

**快速參考版本**: 1.0  
**最後更新**: 2024-11-21

**提示**: 將此文件加入書籤，隨時查閱！ 📌

