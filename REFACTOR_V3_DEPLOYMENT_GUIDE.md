# 影片選擇系統 v3.0 重構部署指南

> **版本**：v3.0  
> **重構日期**：2026-01-02  
> **重要性**：🔴 重大架構變更，需謹慎執行

## 📋 總覽

本次重構從根本上改變了影片選擇系統的架構：

### 核心變更

- ✅ 從「批次綁定選擇」改為「客戶清單管理」
- ✅ 支援跨月份影片選擇
- ✅ 每月唯一批次機制
- ✅ 完整的歷史追蹤系統
- ✅ 待處理變更 LocalStorage 保存

### 影響範圍

- 🗄️ **資料庫**：3 個新表、多個觸發器、索引和視圖
- 🔌 **後端**：1 個新路由、多個現有路由修改
- 🎨 **前端**：核心頁面重構、新 API 整合

---

## ⚠️ 注意事項與風險

### 🚨 重要警告

1. **資料不可逆**：遷移後無法直接回滾到舊架構
2. **停機時間**：預估需要 30-60 分鐘完整停機
3. **測試必要**：必須在測試環境完整驗證後才能上生產

### 風險評估

| 風險項目 | 風險等級 | 影響 | 緩解措施 |
|---------|---------|------|---------|
| 資料遷移失敗 | 高 | 用戶資料丟失 | 完整備份、分步驗證 |
| API 不相容 | 中 | 前端錯誤 | 保留舊 API 向後相容 |
| 效能下降 | 低 | 查詢變慢 | 充分索引、監控效能 |
| 業務邏輯錯誤 | 中 | 選擇邏輯不正確 | 完整測試、灰度發布 |

---

## 🔄 部署流程

### 階段一：準備與備份（部署前 1 天）

#### 1. 環境檢查

```bash
# 確認當前版本
cd Fashion_movielist
git status
git log -1

# 確認環境變數
cd backend
cat .env | grep -E "SUPABASE|AZURE"

# 確認服務運行狀態
curl http://localhost:3000/health
curl http://localhost:5173
```

#### 2. 完整備份

**資料庫備份（Supabase Dashboard）**

1. 登入 Supabase Dashboard
2. 進入 Settings → Database
3. 點擊「Create backup」
4. 下載備份檔案到本地
5. 記錄備份時間：`_____________`

**代碼備份**

```bash
# 建立備份分支
git checkout -b backup/v2-before-refactor
git push origin backup/v2-before-refactor

# 匯出當前 package.json
cp backend/package.json backend/package.json.backup
cp frontend/package.json frontend/package.json.backup
```

#### 3. 測試環境準備

```bash
# 複製環境變數
cp backend/.env backend/.env.production.backup
cp backend/.env backend/.env.test

# 修改測試環境資料庫連線
nano backend/.env.test
# 將 SUPABASE_URL 改為測試環境
```

### 階段二：測試環境部署（部署前 1 天）

#### 1. 執行資料庫遷移

```sql
-- 在測試環境的 Supabase SQL Editor 中執行
-- 複製 database/migration_v3_refactor.sql 的完整內容並執行

-- 驗證遷移結果
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('customer_current_list', 'selection_history', 'batches')
ORDER BY table_name, ordinal_position;

-- 檢查資料遷移
SELECT 
  (SELECT COUNT(*) FROM selections) as old_selections_count,
  (SELECT COUNT(*) FROM customer_current_list) as new_list_count,
  (SELECT COUNT(*) FROM selection_history) as history_count;
```

#### 2. 部署後端代碼

```bash
# 切換到測試分支
git checkout -b feature/refactor-v3

# 安裝依賴
cd backend
npm install

# 啟動後端
npm run dev

# 驗證新 API
curl http://localhost:3000/health
curl -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  http://localhost:3000/api/videos/months
```

#### 3. 部署前端代碼

```bash
cd frontend
npm install
npm run dev

# 在瀏覽器中測試
# http://localhost:5173
```

#### 4. 執行完整測試（參見測試計畫章節）

### 階段三：生產環境部署（D-Day）

#### 預部署檢查清單

- [ ] 已完成測試環境完整驗證
- [ ] 已完成資料庫備份
- [ ] 已完成代碼備份
- [ ] 已通知所有用戶系統維護時間
- [ ] 已準備好回滾腳本
- [ ] 團隊成員到位（至少 2 人）
- [ ] 監控工具準備就緒

#### 部署步驟

**1. 停止服務（預估 2 分鐘）**

```bash
# 在 Render/Vercel Dashboard 停止服務
# 或在前端顯示維護頁面
```

**2. 執行資料庫遷移（預估 5-10 分鐘）**

```sql
-- 在生產環境的 Supabase SQL Editor 中執行
-- 複製 database/migration_v3_refactor.sql 的完整內容

-- 立即驗證
SELECT 
  (SELECT COUNT(*) FROM selections) as old_selections,
  (SELECT COUNT(*) FROM customer_current_list) as new_list,
  (SELECT COUNT(*) FROM selection_history) as history;

-- 驗證每個客戶的資料
SELECT 
  p.name,
  p.email,
  COUNT(ccl.id) as current_list_count
FROM profiles p
LEFT JOIN customer_current_list ccl ON p.id = ccl.customer_id
WHERE p.role = 'customer'
GROUP BY p.id, p.name, p.email
ORDER BY p.name;
```

**3. 部署後端（預估 10-15 分鐘）**

```bash
# 方式 A：使用 Render Dashboard
# 1. 進入 Render Dashboard
# 2. 選擇 Backend Service
# 3. 點擊「Manual Deploy」→ 選擇 feature/refactor-v3 分支
# 4. 等待部署完成

# 方式 B：使用 Git 推送（如果已設定自動部署）
git push origin feature/refactor-v3:main

# 驗證部署
curl https://your-backend-url.render.com/health
curl -H "Authorization: Bearer YOUR_PROD_TOKEN" \
  https://your-backend-url.render.com/api/videos/months
```

**4. 部署前端（預估 5-10 分鐘）**

```bash
# 方式 A：使用 Vercel Dashboard
# 1. 進入 Vercel Dashboard
# 2. 選擇 Frontend Project
# 3. 點擊「Deployments」→「Redeploy」
# 4. 選擇 feature/refactor-v3 分支
# 5. 等待部署完成

# 方式 B：使用 Vercel CLI
cd frontend
vercel --prod

# 驗證部署
curl https://your-frontend-url.vercel.app
```

**5. 冒煙測試（預估 10-15 分鐘）**

執行以下關鍵操作：

1. **管理員登入**
   - 上傳新批次（同月份應封存舊批次）
   - 查看客戶清單總覽
   
2. **客戶登入**
   - 查看影片清單
   - 選擇影片（新增/移除）
   - 提交變更
   - 驗證郵件通知
   
3. **資料一致性檢查**
   ```sql
   -- 驗證客戶清單
   SELECT customer_id, COUNT(*) as video_count
   FROM customer_current_list
   GROUP BY customer_id;
   
   -- 驗證歷史記錄
   SELECT COUNT(*) FROM selection_history 
   WHERE trigger_action = 'submit';
   ```

**6. 恢復服務（預估 2 分鐘）**

- 移除維護頁面
- 監控錯誤日誌
- 監控效能指標

### 階段四：後部署監控（部署後 3 天）

#### 第一天（持續監控）

- [ ] 每小時檢查錯誤日誌
- [ ] 監控 API 響應時間
- [ ] 檢查用戶反饋
- [ ] 驗證郵件發送狀況

#### 第二天

- [ ] 檢查資料庫效能
- [ ] 分析慢查詢
- [ ] 驗證備份是否正常

#### 第三天

- [ ] 收集用戶反饋
- [ ] 評估是否需要優化
- [ ] 考慮是否移除舊 `selections` 表

---

## 🧪 測試計畫

### 測試環境準備

1. 建立測試用戶（每種角色至少 2 個）
2. 準備測試資料（至少 3 個月份的批次）
3. 設定測試郵件接收

### 功能測試矩陣

#### 測試場景 A：首次選擇

| 步驟 | 操作 | 預期結果 | 實際結果 | 狀態 |
|-----|------|---------|---------|------|
| 1 | 登入客戶帳號 | 成功登入，顯示影片選擇頁 | | ⬜ |
| 2 | 選擇 2026-01 月份 | 顯示該月可選影片 | | ⬜ |
| 3 | 選擇 5 部影片 | 顯示「待新增」標記 | | ⬜ |
| 4 | 點擊提交 | 顯示確認 Modal | | ⬜ |
| 5 | 確認提交 | 提交成功、發送郵件 | | ⬜ |
| 6 | 檢查資料庫 | customer_current_list 有 5 筆 | | ⬜ |

#### 測試場景 B：跨月份選擇

| 步驟 | 操作 | 預期結果 | 實際結果 | 狀態 |
|-----|------|---------|---------|------|
| 1 | 客戶已擁有 202601 的 5 部影片 | - | | ⬜ |
| 2 | 切換到 202510 月份 | 顯示該月可選影片 | | ⬜ |
| 3 | 選擇 202510 的 3 部影片 | 顯示「待新增」標記 | | ⬜ |
| 4 | 提交 | 成功 | | ⬜ |
| 5 | 檢查「我的清單」 | 共 8 部影片（來自不同月份） | | ⬜ |

#### 測試場景 C：移除影片

| 步驟 | 操作 | 預期結果 | 實際結果 | 狀態 |
|-----|------|---------|---------|------|
| 1 | 客戶已擁有 8 部影片 | - | | ⬜ |
| 2 | 點擊移除 3 部影片 | 顯示「待移除」標記 | | ⬜ |
| 3 | 提交 | 顯示移除確認 | | ⬜ |
| 4 | 確認 | 成功，剩餘 5 部 | | ⬜ |
| 5 | 檢查歷史記錄 | selection_history 記錄正確 | | ⬜ |

#### 測試場景 D：同月批次更新

| 步驟 | 操作 | 預期結果 | 實際結果 | 狀態 |
|-----|------|---------|---------|------|
| 1 | 管理員上傳 202601 批次（影片 A,B,C） | 成功 | | ⬜ |
| 2 | 客戶選擇 A, B | customer_current_list 有 A, B | | ⬜ |
| 3 | 管理員重新上傳 202601（影片 B,C,D） | 成功，舊批次變 archived | | ⬜ |
| 4 | 客戶查看 202601 | 看到新批次 B,C,D | | ⬜ |
| 5 | 客戶查看「我的清單」 | A,B 仍在清單中 | | ⬜ |
| 6 | 影片 A 顯示狀態 | 標記為「已擁有」但不在當月 | | ⬜ |

#### 測試場景 E：未保存變更恢復

| 步驟 | 操作 | 預期結果 | 實際結果 | 狀態 |
|-----|------|---------|---------|------|
| 1 | 客戶選擇 5 部影片（未提交） | 顯示待新增 | | ⬜ |
| 2 | 關閉瀏覽器 | - | | ⬜ |
| 3 | 重新開啟並登入 | 顯示恢復提示 | | ⬜ |
| 4 | 檢查待處理變更 | 5 部影片仍標記為待新增 | | ⬜ |

### 效能測試

```sql
-- 測試查詢效能（應 < 100ms）
EXPLAIN ANALYZE
SELECT * FROM customer_current_list 
WHERE customer_id = 'test-customer-id';

EXPLAIN ANALYZE  
SELECT * FROM videos 
WHERE batch_id IN (
  SELECT id FROM batches WHERE month = '2026-01' AND status = 'active'
);
```

### 整合測試

1. **郵件通知測試**
   - 批次上傳通知
   - 客戶提交通知
   - 確認通知內容正確

2. **權限測試**
   - Admin 可訪問所有功能
   - Uploader 可上傳但不能刪除批次
   - Customer 只能管理自己的清單

3. **並發測試**
   - 多個客戶同時選擇
   - 同時上傳多個批次
   - 驗證資料一致性

---

## 🔙 回滾計畫

### 何時需要回滾？

- 資料遷移後發現大量資料丟失
- 關鍵功能無法使用
- 效能嚴重下降（響應時間 > 5 秒）
- 用戶無法正常選擇影片

### 回滾步驟

**1. 停止新服務**

```bash
# 在 Render/Vercel Dashboard 停止服務
```

**2. 恢復資料庫（最激進）**

```sql
-- 方式 A：執行回滾腳本（保留新資料）
-- 執行 database/rollback_v3_refactor.sql

-- 方式 B：從備份恢復（丟失新資料）
-- 在 Supabase Dashboard 恢復備份
```

**3. 恢復代碼**

```bash
# 回滾到備份分支
git checkout backup/v2-before-refactor
git push origin backup/v2-before-refactor:main -f

# 重新部署
# 使用 Render/Vercel Dashboard 部署舊版本
```

**4. 驗證回滾**

- 測試登入
- 測試影片選擇
- 測試郵件通知
- 檢查資料完整性

### 部分回滾

如果只是前端或後端問題：

```bash
# 只回滾前端
cd frontend
git checkout v2.2.8
vercel --prod

# 只回滾後端
cd backend
git checkout v2.2.8
# 在 Render Dashboard 重新部署
```

---

## 📊 監控指標

### 關鍵指標

1. **API 響應時間**
   - `/api/customer-list/:id` < 200ms
   - `/api/videos/by-month/:month` < 150ms
   
2. **資料庫查詢時間**
   - customer_current_list 查詢 < 50ms
   - 複雜 JOIN 查詢 < 200ms

3. **錯誤率**
   - API 錯誤率 < 0.1%
   - 前端錯誤 < 0.5%

4. **業務指標**
   - 用戶登入成功率 > 99%
   - 提交成功率 > 98%
   - 郵件發送成功率 > 95%

### 監控工具設定

**Supabase Dashboard**
- 啟用 Query Performance Insights
- 設定慢查詢警報（> 1 秒）

**Render Dashboard**
- 監控 CPU 使用率
- 監控記憶體使用率
- 設定錯誤警報

**前端監控（可選）**
- Sentry 錯誤追蹤
- Google Analytics 使用者行為

---

## 📝 檢查清單

### 部署前

- [ ] 已閱讀完整部署指南
- [ ] 已完成測試環境驗證
- [ ] 已完成資料庫備份
- [ ] 已完成代碼備份
- [ ] 已準備回滾腳本
- [ ] 已通知所有用戶
- [ ] 團隊成員就位

### 部署中

- [ ] 已停止服務
- [ ] 已執行資料庫遷移
- [ ] 已驗證資料遷移結果
- [ ] 已部署後端
- [ ] 已部署前端
- [ ] 已執行冒煙測試
- [ ] 已恢復服務

### 部署後

- [ ] 所有冒煙測試通過
- [ ] 監控無異常錯誤
- [ ] 用戶可正常使用
- [ ] 郵件發送正常
- [ ] 已記錄部署時間
- [ ] 已更新版本號

---

## 🆘 問題排查

### 常見問題

**Q1：遷移後客戶清單為空**

```sql
-- 檢查資料是否存在
SELECT COUNT(*) FROM selections;
SELECT COUNT(*) FROM customer_current_list;

-- 重新執行遷移
-- 執行 migration_v3_refactor.sql 中的「資料遷移」部分
```

**Q2：API 返回 500 錯誤**

```bash
# 檢查後端日誌
# Render Dashboard → Logs

# 檢查資料庫連線
psql $DATABASE_URL -c "SELECT 1"
```

**Q3：前端顯示空白頁面**

```bash
# 檢查瀏覽器 Console
# F12 → Console

# 檢查 API 連線
curl https://your-backend-url.render.com/health
```

**Q4：提交後未收到郵件**

```bash
# 檢查 Azure AD 設定
# 確認 AZURE_CLIENT_ID、AZURE_CLIENT_SECRET、AZURE_TENANT_ID

# 檢查後端日誌中的郵件發送記錄
# grep "email" backend.log
```

---

## 📞 支援聯絡

- **技術負責人**：_______________
- **資料庫管理員**：_______________
- **緊急聯絡電話**：_______________

---

**部署記錄**

- 部署日期：_______________
- 部署人員：_______________
- 資料庫備份 ID：_______________
- 部署結果：⬜ 成功 ⬜ 失敗 ⬜ 部分成功
- 備註：_______________________________________________
