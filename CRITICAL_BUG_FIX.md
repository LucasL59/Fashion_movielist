# 緊急 Bug 修正報告

## 修正日期
2026-01-03

## 問題描述

### 1. ❌ 嚴重錯誤：`currentSelectedIds is not defined`
**錯誤訊息：**
```
MovieSelection_v3.jsx:413 Uncaught ReferenceError: currentSelectedIds is not defined
    at MovieSelection (MovieSelection_v3.jsx:413:75)
```

**影響範圍：**
- 選擇任何影片後立即報錯
- 頁面變成白色畫面
- 待處理變更卡片無法顯示

**根本原因：**
在修正懸浮卡片時，使用了 `currentSelectedIds.size`，但這個變數從未定義。

### 2. ⚠️ 樣式問題：頁面 padding 不一致
**問題描述：**
影片選擇頁面的標題「影片選擇」與其他分頁的位置不一樣，因為有多餘的 padding。

**根本原因：**
`MovieSelection_v3.jsx` 使用了 `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`，但 `Layout.jsx` 已經提供了 `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10`，造成雙重容器和額外 padding。

---

## 修正內容

### 1. ✅ 新增 `currentSelectedCount` 計算邏輯

**位置：** `frontend/src/pages/MovieSelection_v3.jsx`

**修正前：**
```jsx
// UI 狀態
const [viewMode, setViewMode] = useState('grid')
const [showOwnedSection, setShowOwnedSection] = useState(false)
const [showConfirmModal, setShowConfirmModal] = useState(false)
const [confirmData, setConfirmData] = useState(null)
const [submitting, setSubmitting] = useState(false)
```

**修正後：**
```jsx
// UI 狀態
const [viewMode, setViewMode] = useState('grid')
const [showOwnedSection, setShowOwnedSection] = useState(false)
const [showConfirmModal, setShowConfirmModal] = useState(false)
const [confirmData, setConfirmData] = useState(null)
const [submitting, setSubmitting] = useState(false)

// 計算當前選擇的影片總數
const currentSelectedCount = useMemo(() => {
  return customerListIds.size - pendingChanges.remove.size + pendingChanges.add.size
}, [customerListIds, pendingChanges.add.size, pendingChanges.remove.size])
```

**說明：**
- 使用 `useMemo` 計算當前實際選擇的影片總數
- 公式：原有數量 - 待移除數量 + 待新增數量
- 依賴於 `customerListIds`、`pendingChanges.add.size`、`pendingChanges.remove.size`

### 2. ✅ 導入 `useMemo` Hook

**位置：** `frontend/src/pages/MovieSelection_v3.jsx` 第 11 行

**修正前：**
```jsx
import { useState, useEffect } from 'react'
```

**修正後：**
```jsx
import { useState, useEffect, useMemo } from 'react'
```

### 3. ✅ 修正懸浮卡片的變數引用

**位置：** `frontend/src/pages/MovieSelection_v3.jsx` 第 413 行

**修正前：**
```jsx
<p className="text-sm text-gray-600">
  已選擇 <span className="font-semibold text-primary-600">{currentSelectedIds.size}</span> 部影片
  {pendingChanges.add.size > 0 && <span className="text-green-600"> • 新增 {pendingChanges.add.size}</span>}
  {pendingChanges.remove.size > 0 && <span className="text-red-600"> • 移除 {pendingChanges.remove.size}</span>}
</p>
```

**修正後：**
```jsx
<p className="text-sm text-gray-600">
  已選擇 <span className="font-semibold text-primary-600">{currentSelectedCount}</span> 部影片
  {pendingChanges.add.size > 0 && <span className="text-green-600"> • 新增 {pendingChanges.add.size}</span>}
  {pendingChanges.remove.size > 0 && <span className="text-red-600"> • 移除 {pendingChanges.remove.size}</span>}
</p>
```

### 4. ✅ 移除多餘的容器和 padding

**位置：** `frontend/src/pages/MovieSelection_v3.jsx` 第 368 行

**修正前：**
```jsx
return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* 頁面標題與月份選擇器 */}
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
```

**修正後：**
```jsx
return (
  <div className="space-y-8">
    {/* 頁面標題與月份選擇器 */}
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
```

**說明：**
- 移除 `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
- 改用 `space-y-8` 來控制垂直間距
- 移除 `mb-8`，改用父容器的 `space-y-8`
- 與其他頁面（如 `AdminDashboard.jsx`、`VideoManagement.jsx`）保持一致

---

## 技術細節

### useMemo 的使用
```jsx
const currentSelectedCount = useMemo(() => {
  return customerListIds.size - pendingChanges.remove.size + pendingChanges.add.size
}, [customerListIds, pendingChanges.add.size, pendingChanges.remove.size])
```

**為什麼使用 useMemo？**
1. **性能優化：** 避免每次渲染都重新計算
2. **依賴追蹤：** 只在依賴項變化時重新計算
3. **一致性：** 確保計算結果在同一次渲染中保持一致

### 計算邏輯
- **原有數量：** `customerListIds.size`（客戶當前清單中的影片數量）
- **待移除：** `pendingChanges.remove.size`（標記為移除但尚未提交的影片）
- **待新增：** `pendingChanges.add.size`（標記為新增但尚未提交的影片）
- **當前總數：** `原有數量 - 待移除 + 待新增`

---

## 部署資訊

### Git Commit
```bash
commit 155b6ac
fix: 修正 currentSelectedIds 未定義錯誤和頁面 padding 問題

1. 新增 currentSelectedCount 計算邏輯（使用 useMemo）
2. 修正待處理變更卡片使用正確的變數
3. 移除多餘的容器 padding，與其他頁面保持一致
```

### 受影響檔案
- `frontend/src/pages/MovieSelection_v3.jsx`

### 部署狀態
- ✅ 已推送至 GitHub
- ⏳ Vercel 自動部署中
- 預計 1-2 分鐘完成

---

## 測試建議

### 1. 基本功能測試
1. 登入系統
2. 進入影片選擇頁面
3. 選擇一部影片
4. **預期結果：**
   - ✅ 頁面正常運作，不會報錯
   - ✅ 底部出現懸浮卡片
   - ✅ 顯示「已選擇 X 部影片」

### 2. 計數準確性測試
1. 假設原本有 10 部影片
2. 新增 3 部影片
3. 移除 2 部影片
4. **預期結果：**
   - ✅ 顯示「已選擇 11 部影片」（10 - 2 + 3 = 11）
   - ✅ 顯示「新增 3」
   - ✅ 顯示「移除 2」

### 3. 樣式一致性測試
1. 依序訪問以下頁面：
   - 管理員儀表板
   - 影片管理
   - 影片選擇
2. **預期結果：**
   - ✅ 所有頁面標題的位置一致
   - ✅ 左右 padding 一致
   - ✅ 上下間距一致

---

## 對比其他頁面

### AdminDashboard.jsx
```jsx
return (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">管理員儀表板</h1>
      <p className="text-gray-600 mt-2">上傳影片清單並查看客戶選擇</p>
    </div>
    ...
  </div>
)
```

### VideoManagement.jsx
```jsx
return (
  <div className="space-y-8">
    <BrandTransition isVisible={loadingMonths || loading} />
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">影片管理</h1>
        ...
      </div>
    </div>
    ...
  </div>
)
```

### MovieSelection_v3.jsx（修正後）
```jsx
return (
  <div className="space-y-8">
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Film className="w-8 h-8 text-primary-600" />
          影片選擇
        </h1>
        ...
      </div>
    </div>
    ...
  </div>
)
```

**一致性：**
- ✅ 都使用 `space-y-8` 作為主容器
- ✅ 都沒有額外的 `max-w-7xl` 或 `px-*`（由 Layout 提供）
- ✅ 標題都使用 `text-3xl font-bold text-gray-900`

---

## 經驗教訓

### 1. 變數命名和定義
- ❌ 不要使用未定義的變數
- ✅ 使用前先檢查變數是否已宣告
- ✅ 使用 TypeScript 可以在編譯時捕獲此類錯誤

### 2. 容器和佈局
- ❌ 不要在頁面組件中重複定義容器樣式
- ✅ 檢查 Layout 組件已提供的樣式
- ✅ 保持所有頁面的佈局一致性

### 3. 測試流程
- ❌ 不要只在開發環境測試
- ✅ 部署前在本地環境完整測試
- ✅ 測試所有關鍵功能和邊界情況

---

## 後續改進建議

1. **引入 TypeScript**
   - 可以在編譯時捕獲 `currentSelectedIds is not defined` 這類錯誤
   - 提供更好的代碼提示和自動完成

2. **建立頁面佈局規範**
   - 創建文檔說明頁面組件的標準結構
   - 確保所有開發者遵循相同的佈局模式

3. **增加單元測試**
   - 測試計算邏輯（如 `currentSelectedCount`）
   - 測試組件渲染和狀態變化

4. **Code Review 流程**
   - 在合併前進行代碼審查
   - 檢查是否有未定義的變數
   - 檢查樣式是否與其他頁面一致

