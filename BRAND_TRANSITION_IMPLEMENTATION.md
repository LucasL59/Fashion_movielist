# 品牌過場動畫 (Brand Transition) 實作文件

## 1. 功能概述
為了提升系統的品牌識別度與使用者體驗，我們在系統關鍵的載入與轉場時刻（如登入、資料載入）導入了統一的品牌過場動畫。此功能取代了原本單調的 Loading Spinner，提供更具質感的等待體驗。

## 2. 核心元件架構

### 元件位置
`src/components/BrandTransition.jsx`

### 技術實現關鍵
1.  **React Portal**: 
    - 使用 `createPortal(..., document.body)` 將元件直接渲染在 DOM 的最上層。
    - **目的**: 解決父層容器（如 Layout）的 `overflow` 或 `position` 屬性可能導致動畫被切割或無法全螢幕顯示的問題。確保白色背景能完美覆蓋整個視窗。

2.  **高層級 Z-Index**:
    - 設定 `z-index: 9999`。
    - **目的**: 確保過場動畫能覆蓋系統中的所有元素，包括頂部的導航列 (Navbar) 與側邊欄，提供沉浸式的載入體驗。

3.  **動畫效果**:
    - **Logo 呼吸燈**: 結合 CSS `animate-pulse` 與 `blur` 效果。
    - **浮動效果**: 自定義 `animate-float` keyframe，讓 Logo 有輕微的上下浮動感。
    - **進度條**: 漸層色的 Loading Bar。
    - **Tips 輪播**: 每 2.5 秒隨機切換提示文字，並帶有淡入動畫 (`animate-fade-in-up`)。

## 3. 頁面整合細節

### A. 登入頁面 (`Login.jsx`)
- **觸發時機**: 使用者點擊登入後 (`loading`) 以及登入成功跳轉前 (`redirecting`)。
- **佈局調整**: 將原本垂直置中的輸入框改為 `items-start` 並加上 `pt-[10vh]`，讓輸入框位置上移，避免被過場動畫遮擋後的視覺落差，並符合一般登入頁的視覺重心。

### B. 影片選擇頁面 (`MovieSelection.jsx`)
- **觸發時機**: 初始載入影片資料或切換月份時 (`loading || loadingMonths`)。
- **優化處理 (防閃爍)**: 
    - 在 `BrandTransition` 顯示期間，**隱藏**底層的「暫無影片」空狀態。
    - 程式碼邏輯：`!loading && (!batch || videos.length === 0)`
    - **目的**: 避免在資料尚未回來前，使用者透過半透明或動畫縫隙看到「暫無影片」的字樣，造成視覺閃爍。

### C. 影片管理頁面 (`VideoManagement.jsx`)
- **觸發時機**: 同影片選擇頁面。
- **功能擴充**: 
    - 新增了與前台一致的分頁功能（Page Size: 12）。
    - 確保在切換月份或重新載入時，分頁狀態自動重置為第一頁。

### D. 預覽頁面 (`DemoTransition.jsx`)
- **路由**: `/demo-transition`
- **用途**: 開發人員可在此頁面單獨測試動畫效果與排版，無需反覆登入登出。

## 4. 維護與修改指南

### 修改 Logo
預設使用 `/fashion-logo.png`。若需更換，可直接替換 `public` 資料夾下的圖檔，或在呼叫元件時傳入 `logoSrc` prop。

### 修改提示文字 (Tips)
位於 `BrandTransition.jsx` 頂部的 `DEFAULT_TIPS` 常數陣列中。
```javascript
const DEFAULT_TIPS = [
  "登入後，您可以查看最新的時尚影片清單",
  "支援多裝置瀏覽，隨時隨地掌握流行資訊",
  ...
]
```

### 調整顯示時間
元件接受 `minDisplayTime` prop，目前預設邏輯主要由外部的 `loading` 狀態控制。若需強制最短顯示時間，可在 `useEffect` 中調整 `setTimeout` 邏輯。

## 5. 檔案列表
- `frontend/src/components/BrandTransition.jsx` (核心元件)
- `frontend/src/pages/DemoTransition.jsx` (展示頁)
- `frontend/src/pages/Login.jsx` (已整合)
- `frontend/src/pages/MovieSelection.jsx` (已整合)
- `frontend/src/pages/VideoManagement.jsx` (已整合)
- `frontend/src/components/VideoEditModal.jsx` (已優化模態框結構)
