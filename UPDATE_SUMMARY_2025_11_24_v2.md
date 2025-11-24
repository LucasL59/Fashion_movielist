# 更新摘要 - 月份選擇差異追蹤功能

> **版本：** v2.2.0  
> **發布日期：** 2025-11-24  
> **類型：** 功能增強

## 📦 概述

此次更新為「每月影片選擇系統」新增了**月份選擇差異追蹤功能**，讓客戶在選擇本月影片時能夠：

1. 自動檢視上個月已選擇的影片清單
2. 清楚區分哪些影片將保留、下架或新增
3. 在提交前透過確認視窗檢視完整異動內容
4. 管理員收到的郵件通知包含詳細的月份差異摘要

## 🎯 解決的問題

### 問題背景

在原有系統中，客戶每月選片時無法得知：
- 上個月選了哪些影片
- 本月的選擇與上月有何差異
- 哪些影片需要下架、哪些是新增的

管理員收到的通知郵件也只列出本月選擇，無法了解客戶的換片需求。

### 解決方案

系統現在會：
1. **自動載入上月資料**：當客戶進入選片頁時，自動查詢並顯示上個月的選擇
2. **視覺化差異**：使用不同顏色與圖示標示保留、下架、新增的影片
3. **確認機制**：送出前彈出詳細的異動確認視窗
4. **完整記錄**：郵件通知包含上月vs本月的完整比對

## 🔧 技術實作

### 後端變更

#### 1. 新增 API 端點

**`GET /api/selections/previous/:currentBatchId`**

```javascript
// 功能：根據當前批次自動計算上一個月的批次與選擇
// 回傳：previousBatch, previousSelection, previousVideos
```

**檔案位置：** `backend/src/routes/selections.js`

**關鍵邏輯：**
- 從當前批次的 `month` 欄位計算上一個月（YYYY-MM 格式）
- 查詢該月份的活躍批次
- 取得用戶在該批次的選擇記錄與影片詳情

#### 2. 擴充選擇提交端點

修改 `POST /api/selections` 以自動計算並附加上月差異資訊給郵件服務。

**檔案位置：** `backend/src/routes/selections.js`

#### 3. 郵件模板增強

更新 `notifyAdminCustomerSelection` 函數，新增參數與模板內容。

**檔案位置：** `backend/src/services/emailService.js`

**新增內容：**
- 異動摘要卡片（琥珀色背景）
- 本月選擇清單（為新增影片加上「新增」標籤）
- 上月選擇清單（標示「已下架」或「保留」）

### 前端變更

#### 1. 狀態管理

新增 state 變數：

```javascript
const [previousSelection, setPreviousSelection] = useState(null)
const [previousVideos, setPreviousVideos] = useState([])
const [previousVideoIds, setPreviousVideoIds] = useState([])
const [loadingPrevious, setLoadingPrevious] = useState(false)
const [showConfirmModal, setShowConfirmModal] = useState(false)
```

**檔案位置：** `frontend/src/pages/MovieSelection.jsx`

#### 2. 資料載入流程

- 批次載入完成後，並行呼叫 `getPreviousSelection(batch.id)`
- 若有上月選擇，自動預選在本月清單中仍存在的影片
- 儲存上月資料用於 UI 顯示

#### 3. UI 組件新增

**上月片單區塊：**
- 位置：頁面頂部，月份選擇器上方
- 樣式：琥珀色主題，玻璃材質效果
- 功能：
  - 顯示所有上月已選影片
  - 可點擊取消（若在本月清單中）
  - 不在本月清單的顯示「已無法選」標記

**確認 Modal：**
- 觸發：點擊「提交選擇」時（僅當有上月選擇時）
- 內容：
  - 異動摘要卡片（上月/本月總數、下架/新增/保留）
  - 將下架的影片列表（紅色主題）
  - 新增的影片列表（綠色主題）
  - 保留的影片說明（灰色主題）
- 操作：
  - 返回修改：關閉 Modal
  - 確認送出：執行提交

#### 4. API 客戶端擴充

新增函數：

```javascript
export async function getPreviousSelection(currentBatchId)
```

**檔案位置：** `frontend/src/lib/api.js`

## 📊 資料流程

```
1. 客戶登入 → 進入選片頁
                ↓
2. 載入本月批次與影片
                ↓
3. 呼叫 API 取得上月選擇 ← 自動計算上一個月
                ↓
4. 若有上月資料 → 顯示「上月已選片單」區塊
                ↓
5. 預選上月中在本月仍存在的影片
                ↓
6. 客戶修改選擇（取消/新增）
                ↓
7. 點擊「提交選擇」→ 顯示確認 Modal
                ↓
8. 確認送出 → API 計算差異 → 發送郵件（含差異）
                ↓
9. 管理員收到郵件 ← 包含完整異動摘要
```

## 🎨 UI/UX 改進

### 色彩主題

- **上月區塊**：琥珀色（Amber）系列 - 區別於本月的主色
- **差異標示**：
  - 下架：紅色（Red）
  - 新增：綠色（Green）
  - 保留：灰色（Gray）

### 視覺層次

1. 上月片單區塊（頂部，琥珀色邊框）
2. 月份選擇器與控制列（sticky，玻璃效果）
3. 本月影片清單（主要內容區）
4. 浮動選擇 Bar（底部固定）
5. 確認 Modal（最高層級）

### 互動設計

- 可點擊的影片：指標圖示 + hover 陰影
- 不可點擊的影片：禁止指標 + 半透明
- 已選擇：勾選圖示 + 邊框高亮
- 已取消：X 圖示 + 半透明遮罩

## 📝 檔案變更清單

### 後端

- ✅ `backend/src/routes/selections.js` - 新增上月選擇 API + 差異計算
- ✅ `backend/src/services/emailService.js` - 郵件模板擴充

### 前端

- ✅ `frontend/src/pages/MovieSelection.jsx` - 主要 UI 實作
- ✅ `frontend/src/lib/api.js` - API 客戶端擴充

### 文件

- ✅ `MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md` - 完整實作說明
- ✅ `TESTING_MONTHLY_DIFF.md` - 測試指南與檢查清單
- ✅ `README.md` - 更新功能描述
- ✅ `UPDATE_SUMMARY_2025_11_24_v2.md` - 本文件

## 🧪 測試建議

### 基本測試

1. **首次選擇**：新客戶或無上月記錄
2. **查看上月**：有上月選擇記錄的客戶
3. **部分下架**：取消部分上月影片
4. **新增影片**：選擇本月新片
5. **確認送出**：檢視 Modal 與郵件內容

### 進階測試

1. **多次提交**：同月份多次修改選擇
2. **月份切換**：切換不同月份觀察行為
3. **響應式**：不同螢幕尺寸測試
4. **效能**：大量影片的載入與互動速度

詳細測試案例請參考 [TESTING_MONTHLY_DIFF.md](TESTING_MONTHLY_DIFF.md)

## 🚀 部署注意事項

### 資料庫

- ✅ 無需修改 schema（使用現有 `batches.month` 欄位）
- ✅ 確保所有批次都有正確的 `month` 值（YYYY-MM 格式）

### 環境變數

- ✅ 無需新增環境變數

### 相依套件

- ✅ 無需安裝新套件

### 向後相容

- ✅ 完全相容舊版本
- ✅ 若客戶無上月選擇，行為與原版相同
- ✅ 郵件模板向後相容（無上月資料時不顯示差異區塊）

## 📈 預期效益

### 對客戶

- ✅ 清楚掌握每月影片異動
- ✅ 避免遺漏或誤操作
- ✅ 送出前二次確認，減少錯誤

### 對管理員

- ✅ 一眼看出客戶的換片需求
- ✅ 郵件通知包含完整異動資訊
- ✅ 減少與客戶確認的溝通成本

### 對系統維護

- ✅ 程式碼結構清晰，易於維護
- ✅ 完整的文件與測試指南
- ✅ 無副作用，不影響既有功能

## 🔮 未來擴展可能

1. **批次比較工具**：允許比較任意兩個月份的差異
2. **選擇歷史視覺化**：圖表呈現每月選擇趨勢
3. **智慧推薦**：根據歷史選擇推薦影片
4. **匯出報表**：管理員可匯出月份異動統計

## 📞 支援資訊

如有問題或建議，請參考：

- 📖 完整實作說明：[MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md](MONTHLY_SELECTION_DIFF_IMPLEMENTATION.md)
- 🧪 測試指南：[TESTING_MONTHLY_DIFF.md](TESTING_MONTHLY_DIFF.md)
- 📚 專案說明：[README.md](README.md)

---

**版本：** v2.2.0  
**發布日期：** 2025-11-24  
**維護者：** 開發團隊

