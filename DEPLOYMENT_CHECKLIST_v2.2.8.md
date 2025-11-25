# 部署檢查清單 v2.2.8

## 📋 版本資訊
- **版本號**: v2.2.8
- **日期**: 2025-11-25
- **類型**: Bug 修復 + 環境變數更新

## 🔧 環境變數更新

### Render Backend 環境變數
需要在 Render Dashboard 中更新以下環境變數：

```
ADMIN_EMAIL=support@fas.com.tw
```

**更新步驟：**
1. 登入 Render Dashboard
2. 進入 Backend Service
3. 點擊 "Environment" 標籤
4. 找到 `ADMIN_EMAIL` 並修改為 `support@fas.com.tw`
5. 點擊 "Save Changes"

## 🐛 Bug 修復

### 1. 郵件收件人邏輯優化
**問題**: 郵件通知收件人邏輯不清晰，缺乏調試資訊
**修復**:
- ✅ 在 `getAdminRecipients` 添加詳細日誌
- ✅ 在 `notifyAdminCustomerSelection` 添加收件人追蹤日誌
- ✅ 修正 `getStaffRecipients` 只查詢 admin 和 uploader 角色

**影響檔案**:
- `backend/src/services/emailService.js`

### 2. 「已擁有」標記顯示
**問題**: 在當前月份清單中，已擁有的影片沒有正確顯示「已擁有」標記
**修復**:
- ✅ 修改 `MovieCard.jsx`：無論是否選中，只要 `isAlreadyOwned` 為 true，就顯示藍色標籤
- ✅ 在 List 視圖也同步顯示「已擁有」標籤

**影響檔案**:
- `frontend/src/components/MovieCard.jsx`
- `frontend/src/pages/MovieSelection.jsx`

## 📝 技術細節

### 郵件收件人邏輯流程
```
1. 查詢批次的上傳者 (getUploaderByBatch)
   └─> 排除上傳者本人

2. 查詢所有管理員 (getAdminRecipients)
   └─> 從 profiles 表查詢 role='admin'
   └─> 如果沒有，fallback 到環境變數 ADMIN_EMAIL

3. 查詢郵件規則 (getMailRecipientsByEvent)
   └─> 從 mail_rules 表查詢 event_type='selection_submitted'

4. 合併收件人 (mergeRecipients)
   └─> 去重後得到最終收件人列表
   └─> 包含：管理員 + 上傳者 + 郵件規則收件人
```

### 調試日誌關鍵字
部署後，在 Render 日誌中搜尋以下關鍵字來追蹤郵件發送：
- `[getAdminRecipients]` - 管理員查詢過程
- `[notifyAdminCustomerSelection]` - 收件人合併過程
- `最終收件人列表` - 最終的收件人清單

## 🚀 部署步驟

### 1. 前端部署 (Vercel)
```bash
git add -A
git commit -m "fix: 修正已擁有標記顯示與郵件收件人邏輯 (v2.2.8)"
git push origin main
```
Vercel 會自動部署

### 2. 後端部署 (Render)
```bash
# 推送到 main 分支會自動觸發 Render 部署
git push origin main
```

### 3. 環境變數更新
在 Render Dashboard 手動更新 `ADMIN_EMAIL` 為 `support@fas.com.tw`

### 4. 驗證部署
- ✅ 檢查 Vercel 部署狀態
- ✅ 檢查 Render 部署狀態
- ✅ 測試用戶選擇影片並提交
- ✅ 檢查 Render 日誌中的收件人列表
- ✅ 確認郵件發送到正確的收件人

## 📊 預期結果

### 郵件收件人
客戶提交選擇後，郵件應發送給：
1. 所有 `role='admin'` 的用戶
2. 所有 `role='uploader'` 的用戶（除了本次上傳批次的上傳者）
3. `mail_rules` 表中設定的額外收件人
4. 如果以上都沒有，fallback 到 `support@fas.com.tw`

### 視覺效果
- 在「目前擁有的片單」中，所有影片都可以取消選擇
- 在「當前月份清單」中，已擁有的影片會顯示藍色邊框和「已擁有」標籤
- 提交確認 Modal 正確顯示：新增、移除、保留的影片

## ⚠️ 注意事項

1. **環境變數更新後需要重啟服務**
   - Render 會在更新環境變數後自動重啟

2. **測試建議**
   - 使用測試帳號提交選擇
   - 檢查 Render 日誌確認收件人列表
   - 確認郵件內容正確顯示差異資訊

3. **回滾計畫**
   - 如果有問題，可以在 Render Dashboard 回滾到上一個部署
   - 前端可以在 Vercel Dashboard 回滾

## 📚 相關文檔
- [MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md](./MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md)
- [TESTING_MONTHLY_DIFF.md](./TESTING_MONTHLY_DIFF.md)
- [UPDATE_SUMMARY_2025_11_24_v2.md](./UPDATE_SUMMARY_2025_11_24_v2.md)

