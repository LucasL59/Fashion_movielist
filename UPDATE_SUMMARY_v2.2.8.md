# 更新摘要 v2.2.8

**發布日期**: 2025-11-25  
**版本號**: v2.2.8  
**類型**: Bug 修復 + 環境變數更新

---

## 📋 更新內容

### 🐛 Bug 修復

#### 1. 修正「已擁有」標記顯示邏輯
**問題描述**:  
在當前月份的影片清單中，已經擁有的影片沒有正確顯示「已擁有」標記，導致用戶無法清楚識別哪些影片是重複的。

**修復內容**:
- ✅ 修改 `MovieCard.jsx`：無論影片是否被選中，只要 `isAlreadyOwned` 為 `true`，就在右上角顯示藍色「已擁有」標籤
- ✅ 在 Grid 視圖和 List 視圖中都同步顯示「已擁有」標記
- ✅ 已擁有且被選中的影片會顯示藍色邊框和藍色選中圖示

**影響範圍**:
- `frontend/src/components/MovieCard.jsx`
- `frontend/src/pages/MovieSelection.jsx`

**視覺效果**:
- 已擁有的影片：藍色邊框 + 藍色「已擁有」標籤
- 新選擇的影片：紫色邊框 + 紫色選中圖示

---

#### 2. 優化郵件收件人邏輯與調試
**問題描述**:  
用戶反映郵件通知仍然發送到硬編碼的舊郵箱，缺乏調試資訊來追蹤收件人邏輯。

**修復內容**:
- ✅ 在 `getAdminRecipients` 函數中添加詳細日誌，追蹤管理員查詢過程
- ✅ 在 `notifyAdminCustomerSelection` 函數中添加收件人合併過程的日誌
- ✅ 修正 `getStaffRecipients` 函數，只查詢 `admin` 和 `uploader` 角色（之前會查詢所有用戶）
- ✅ 優化日誌輸出格式，使用 emoji 標記方便快速定位

**影響範圍**:
- `backend/src/services/emailService.js`

**調試日誌關鍵字**:
```
🔍 [getAdminRecipients] 開始查詢管理員
📊 [getAdminRecipients] 查詢到的管理員
✅ [getAdminRecipients] 過濾後的管理員郵箱
📤 [notifyAdminCustomerSelection] 上傳者資料
👥 [notifyAdminCustomerSelection] 管理員收件人
📧 [notifyAdminCustomerSelection] 郵件規則收件人
✉️ [notifyAdminCustomerSelection] 最終收件人列表
```

**郵件收件人邏輯**:
```
1. 查詢批次的上傳者 → 排除上傳者本人
2. 查詢所有管理員 (role='admin')
3. 查詢郵件規則 (event_type='selection_submitted')
4. 合併去重 → 得到最終收件人列表
5. 如果都沒有 → fallback 到環境變數 ADMIN_EMAIL
```

---

### 🔧 環境變數更新

#### ADMIN_EMAIL 更新
**舊值**: `lucas@fas.com.tw`  
**新值**: `support@fas.com.tw`

**更新位置**: Render Backend Service 環境變數

**更新步驟**: 請參閱 [RENDER_ENV_UPDATE_GUIDE.md](./RENDER_ENV_UPDATE_GUIDE.md)

**注意事項**:
- 這個環境變數只是 fallback 機制
- 系統會優先使用資料庫中 `role='admin'` 的用戶郵箱
- 只有在資料庫中沒有管理員時才會使用環境變數

---

### ✨ 新增功能

#### SelectionDiffSection 通用組件
**用途**:  
用於在管理員選擇摘要和選擇歷史頁面中顯示影片差異（新增/移除）。

**特點**:
- 可配置標題和高亮顏色（綠色/紅色）
- 顯示影片縮圖、標題和英文標題
- 空狀態提示
- 響應式設計

**使用位置**:
- `frontend/src/pages/AdminSelectionSummary.jsx`
- `frontend/src/pages/SelectionHistory.jsx`

---

## 🚀 部署狀態

### 前端 (Vercel)
- ✅ 已推送到 GitHub
- ✅ Vercel 自動部署中
- 📍 URL: https://fashion-movielist.vercel.app

### 後端 (Render)
- ✅ 已推送到 GitHub
- ✅ Render 自動部署中
- ⚠️ **需要手動更新環境變數 ADMIN_EMAIL**

---

## 📝 測試建議

### 1. 測試「已擁有」標記顯示
**步驟**:
1. 使用客戶帳號登入
2. 進入「選擇影片」頁面
3. 確認「目前擁有的片單」區塊中的影片都可以取消選擇
4. 確認當前月份清單中，已擁有的影片顯示藍色邊框和「已擁有」標籤
5. 嘗試點擊已擁有的影片，應該會提示先從「目前擁有的片單」中取消

**預期結果**:
- 已擁有的影片有明顯的視覺區別（藍色）
- 新選擇的影片使用紫色
- Toast 提示清晰易懂

### 2. 測試郵件收件人邏輯
**步驟**:
1. 使用客戶帳號選擇影片並提交
2. 前往 Render Dashboard > Logs
3. 搜尋 `[notifyAdminCustomerSelection]`
4. 查看「最終收件人列表」

**預期結果**:
- 日誌中清楚顯示收件人查詢過程
- 最終收件人列表包含所有管理員和上傳者
- 郵件成功發送到正確的收件人

### 3. 測試環境變數 Fallback
**步驟**:
1. 在 Supabase 中暫時移除所有管理員角色
2. 提交影片選擇
3. 檢查 Render Logs

**預期結果**:
- 日誌顯示「沒有找到管理員，使用環境變數 ADMIN_EMAIL」
- 郵件發送到 `support@fas.com.tw`

---

## 🔍 故障排除

### 問題 1: 「已擁有」標記沒有顯示
**檢查項目**:
1. 清除瀏覽器快取並重新整理
2. 確認 Vercel 部署成功
3. 在開發者工具 Console 中查看是否有錯誤

### 問題 2: 郵件發送到錯誤的收件人
**檢查項目**:
1. 在 Supabase 中查詢 `profiles` 表的管理員設定
2. 檢查 `mail_rules` 表的郵件規則
3. 查看 Render Logs 中的「最終收件人列表」
4. 確認環境變數 `ADMIN_EMAIL` 已更新

### 問題 3: 部署失敗
**檢查項目**:
1. 查看 Vercel/Render 的部署日誌
2. 確認沒有 linter 錯誤
3. 確認所有依賴都已正確安裝

---

## 📚 相關文檔

- [部署檢查清單](./DEPLOYMENT_CHECKLIST_v2.2.8.md)
- [Render 環境變數更新指南](./RENDER_ENV_UPDATE_GUIDE.md)
- [月份選擇差異實作](./MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md)
- [測試案例](./TESTING_MONTHLY_DIFF.md)

---

## 📊 變更統計

```
9 files changed, 567 insertions(+), 316 deletions(-)
```

**修改的檔案**:
- `backend/src/services/emailService.js` - 郵件服務優化
- `backend/src/routes/selections.js` - 選擇路由調試日誌
- `frontend/src/components/MovieCard.jsx` - 已擁有標記顯示
- `frontend/src/pages/MovieSelection.jsx` - 選擇頁面邏輯
- `frontend/src/pages/AdminSelectionSummary.jsx` - 使用新組件
- `frontend/src/pages/SelectionHistory.jsx` - 使用新組件

**新增的檔案**:
- `frontend/src/components/SelectionDiffSection.jsx` - 通用差異組件
- `DEPLOYMENT_CHECKLIST_v2.2.8.md` - 部署檢查清單
- `RENDER_ENV_UPDATE_GUIDE.md` - 環境變數更新指南
- `UPDATE_SUMMARY_v2.2.8.md` - 本文檔

---

## ✅ 完成檢查清單

- [x] 代碼修改完成
- [x] Git 提交完成
- [x] 推送到 GitHub
- [x] Vercel 自動部署觸發
- [x] Render 自動部署觸發
- [ ] **待辦**: 在 Render Dashboard 更新 `ADMIN_EMAIL` 環境變數
- [ ] **待辦**: 測試「已擁有」標記顯示
- [ ] **待辦**: 測試郵件收件人邏輯
- [ ] **待辦**: 確認部署成功

---

## 📞 聯絡資訊

如有任何問題或需要協助，請：
1. 查看 Render Logs 中的錯誤訊息
2. 檢查相關文檔的故障排除章節
3. 確認資料庫設定是否正確

