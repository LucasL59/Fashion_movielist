# 資料庫設定指南

## 快速開始

### 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 並登入
2. 點擊「New Project」建立新專案
3. 填寫專案名稱、資料庫密碼、選擇區域
4. 等待專案建立完成（約 2-3 分鐘）

### 2. 執行資料庫結構腳本

1. 在 Supabase Dashboard 中，點擊左側選單的「SQL Editor」
2. 點擊「New Query」
3. 複製 `schema.sql` 的內容並貼上
4. 點擊「Run」執行腳本
5. 確認所有表格都建立成功

### 3. 建立 Storage Bucket

1. 在 Supabase Dashboard 中，點擊左側選單的「Storage」
2. 點擊「Create a new bucket」
3. 輸入名稱：`movie-thumbnails`
4. 勾選「Public bucket」
5. 點擊「Create bucket」

### 4. 獲取 API 金鑰

1. 在 Supabase Dashboard 中，點擊左側選單的「Settings」
2. 點擊「API」
3. 複製以下資訊：
   - **Project URL**: 你的 Supabase URL
   - **anon public**: 用於前端的公開金鑰
   - **service_role**: 用於後端的服務金鑰（請妥善保管）

### 5. 設定環境變數

將獲取的金鑰填入：
- 後端的 `.env` 檔案
- 前端的 `.env` 檔案

## 資料表結構

### profiles（用戶資料）
- `id`: UUID（主鍵，關聯到 auth.users）
- `name`: 用戶名稱
- `email`: Email
- `role`: 角色（admin 或 customer）
- `created_at`: 建立時間
- `updated_at`: 更新時間

### batches（批次/上傳記錄）
- `id`: UUID（主鍵）
- `name`: 批次名稱
- `uploader_id`: 上傳者 ID
- `status`: 狀態（active 或 archived）
- `created_at`: 建立時間
- `updated_at`: 更新時間

### videos（影片資料）
- `id`: UUID（主鍵）
- `batch_id`: 所屬批次 ID
- `title`: 中文片名
- `title_en`: 英文片名
- `description`: 簡介
- `director`: 導演
- `actor_male`: 男演員
- `actor_female`: 女演員
- `duration`: 片長（分鐘）
- `rating`: 級別
- `language`: 發音
- `subtitle`: 字幕
- `thumbnail_url`: 縮圖 URL
- `row_number`: Excel 行號
- `created_at`: 建立時間
- `updated_at`: 更新時間

### selections（客戶選擇）
- `id`: UUID（主鍵）
- `user_id`: 用戶 ID
- `batch_id`: 批次 ID
- `video_ids`: 選擇的影片 ID 陣列
- `created_at`: 建立時間
- `updated_at`: 更新時間

## Row Level Security (RLS) 政策

所有表格都啟用了 RLS，確保資料安全：

- **Profiles**: 用戶只能查看/更新自己的資料；管理員可以查看所有用戶
- **Batches**: 所有已認證用戶可以讀取；只有管理員可以新增/更新
- **Videos**: 所有已認證用戶可以讀取；只有管理員可以新增/更新/刪除
- **Selections**: 用戶只能查看/新增/更新自己的選擇；管理員可以查看所有選擇

## 測試資料庫連接

執行以下 SQL 查詢測試：

```sql
-- 查看所有表格
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 查看 profiles 表結構
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

## 常見問題

### Q: 執行 schema.sql 時出現權限錯誤？
A: 確保你使用的是 Supabase Dashboard 的 SQL Editor，而不是外部工具。

### Q: Storage bucket 建立失敗？
A: 可以在 Supabase Dashboard 的 Storage 頁面手動建立，名稱為 `movie-thumbnails`，並設為 Public。

### Q: RLS 政策導致無法存取資料？
A: 確保你的後端使用 `service_role` 金鑰，前端使用 `anon` 金鑰，並且用戶已正確認證。

## 資料庫維護

### 備份
Supabase 會自動備份資料庫，但建議定期手動匯出重要資料。

### 清理舊資料
```sql
-- 封存 3 個月前的批次
UPDATE batches 
SET status = 'archived' 
WHERE created_at < NOW() - INTERVAL '3 months';

-- 刪除封存批次的影片（會自動刪除相關 selections）
DELETE FROM videos 
WHERE batch_id IN (
  SELECT id FROM batches WHERE status = 'archived'
);
```

### 監控
在 Supabase Dashboard 的「Database」→「Usage」可以查看資料庫使用情況。

