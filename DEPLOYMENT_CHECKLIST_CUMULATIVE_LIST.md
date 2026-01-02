# 累積清單模式部署檢查清單

## 部署狀態

✅ **代碼已推送到 GitHub** (Commit: 323578f)
- Backend 更新：customerList API、upload 邏輯、videos API
- Frontend 更新：MovieSelection.jsx 完整重構
- Database 遷移：已透過 Supabase MCP 執行

## 自動部署

### Frontend (Vercel)
- ✅ 代碼已推送，Vercel 應自動偵測並部署
- 查看部署狀態：https://vercel.com/
- 預期 URL：https://fashion-movielist.vercel.app/

### Backend (Render)
- ✅ 代碼已推送，Render 應自動偵測並部署
- 查看部署狀態：https://render.com/
- 等待部署完成（通常需要 3-5 分鐘）

## 功能測試清單

### 1. 上傳功能測試
- [ ] 使用上傳者帳號登入
- [ ] 上傳測試用 Excel 文件（例如：2025-09、2025-10）
- [ ] 確認上傳成功並收到通知
- [ ] 確認批次的 `month` 和 `is_latest` 欄位正確設置

### 2. 客戶累積清單功能測試
- [ ] 使用客戶帳號登入
- [ ] 確認可以看到「目前的影片清單」區塊（如果之前有選擇）
- [ ] 確認可以看到「選擇月份」區塊，顯示所有可選月份
- [ ] 選擇當前月份，確認影片清單正確載入

### 3. 跨月選擇功能測試
- [ ] 從 2025-09 月份選擇一些影片（例如：5 部）
- [ ] 切換到 2025-10 月份
- [ ] 再選擇一些影片（例如：3 部）
- [ ] 確認「目前的影片清單」顯示 8 部影片（累積）

### 4. 提交功能測試
- [ ] 點擊「提交變更」按鈕
- [ ] 確認彈出確認 Modal，顯示：
   - 新增的影片列表
   - 移除的影片列表（如果有）
   - 總影片數
- [ ] 點擊「確認提交」
- [ ] 確認提示「影片清單已成功提交！」
- [ ] 確認頁面重新載入客戶清單

### 5. 取消選擇功能測試
- [ ] 在「目前的影片清單」區塊，點擊一部已選的影片
- [ ] 確認該影片顯示紅色叉號（標記為待移除）
- [ ] 再次點擊，確認恢復藍色勾號（取消移除）
- [ ] 提交變更，確認移除生效

### 6. 未保存提示測試
- [ ] 進行一些選擇但不提交
- [ ] 嘗試關閉瀏覽器頁面
- [ ] 確認出現「您有未保存的變更，確定要離開嗎？」提示

### 7. 懸浮 UI 元素測試
- [ ] 確認有未保存變更時，右下角顯示「提交變更」懸浮按鈕
- [ ] 確認右下角顯示「已選擇影片」計數器
- [ ] 確認計數器上顯示「有未保存的變更」警告（橙色）

### 8. 管理員功能測試
- [ ] 使用管理員帳號登入
- [ ] 進入「影片管理」頁面，確認可以看到所有批次
- [ ] 檢查批次是否顯示正確的月份
- [ ] 進入「已選清單」頁面，確認可以看到客戶選擇摘要

## 已知問題和解決方案

### 問題 1：舊資料遷移
**症狀**：如果之前已有 `selections` 表的資料
**解決方案**：遷移腳本已自動將最新的 selections 資料遷移到 customer_current_list

### 問題 2：Toast 訊息語言
**症狀**：訊息可能顯示為英文
**檢查**：前端代碼中的 `showToast` 調用應該都使用繁體中文

### 問題 3：React Error #31
**症狀**：控制台出現 "Objects are not valid as a React child"
**解決方案**：已在重構中修復，確保所有數據正確序列化

## 資料庫驗證

如需驗證資料庫狀態，可透過 Supabase Dashboard 執行以下查詢：

```sql
-- 檢查批次月份設置
SELECT id, name, month, is_latest, status, created_at 
FROM batches 
ORDER BY month DESC, created_at DESC;

-- 檢查客戶累積清單
SELECT c.customer_id, p.name, p.email, COUNT(*) as video_count
FROM customer_current_list c
JOIN profiles p ON p.id = c.customer_id
GROUP BY c.customer_id, p.name, p.email;

-- 檢查選擇歷史
SELECT h.customer_id, p.name, h.total_count, h.added_count, h.removed_count, h.created_at
FROM selection_history h
JOIN profiles p ON p.id = h.customer_id
ORDER BY h.created_at DESC
LIMIT 10;
```

## 回滾計劃

如果出現嚴重問題需要回滾：

### 資料庫回滾
```sql
-- 刪除新表
DROP TABLE IF EXISTS customer_video_list CASCADE;
DROP TABLE IF EXISTS selection_history CASCADE;

-- 移除新欄位
ALTER TABLE batches DROP COLUMN IF EXISTS month;
ALTER TABLE batches DROP COLUMN IF EXISTS is_latest;
```

### 代碼回滾
```bash
# 回滾到之前的穩定版本
git reset --hard 5d9fa06
git push origin main --force  # 需謹慎使用
```

## 成功標準

- ✅ 客戶可以從任何歷史月份選擇影片
- ✅ 客戶的清單持續累積，不受批次限制
- ✅ 上傳順序不影響月份歸屬
- ✅ 切換頁面前有未保存提示
- ✅ 所有原有 UI/UX 完整保留
- ✅ 管理員可查看所有客戶的累積清單

## 支援資訊

- Backend API 日誌：Render Dashboard > Logs
- Frontend 錯誤：瀏覽器 F12 Console
- 資料庫查詢：Supabase Dashboard > SQL Editor
- 遷移腳本：`database/migration_customer_list.sql`
