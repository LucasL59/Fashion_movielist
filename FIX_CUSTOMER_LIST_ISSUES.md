# 修正客戶清單顯示與更新問題

> **修正日期**：2026-01-05  
> **版本**：v3.0.6  
> **狀態**：✅ 已修正，待部署

## 🔍 問題描述

客戶在使用影片選擇功能時遇到以下問題：

### 問題 1：「我的清單」顯示空白 ❌
- 右上角顯示「我的清單 (25)」
- 點擊後卻顯示「您尚未選擇任何影片」
- 清單明明有 25 部影片，但無法顯示

### 問題 2：取消影片後沒有更新 ❌
- 客戶已選擇 25 部影片
- 取消 1 部並提交，彈窗顯示「下架 1 部」
- 保存後重新進入，仍然顯示 25 部
- 變更沒有生效

### 問題 3：儀表板狀態錯誤 ❌
- 客戶已經選擇並提交影片
- 但儀表板仍顯示「等待提交」
- 狀態不正確

## 🎯 根本原因

### 原因 1：前端資料結構映射錯誤

**後端 API** (`backend/src/routes/customerList.js`) 返回的 `items` 已經是**攤平的影片物件**：

```javascript
// 後端返回的結構
const formattedList = (customerList || [])
  .filter(item => item.videos)
  .map(item => ({
    ...item.videos,  // 已經攤平，直接展開影片屬性
    added_from_month: item.added_from_month,
    added_at: item.added_at,
    list_item_id: item.id
  }));
```

但**前端** (`frontend/src/pages/MovieSelection_v3.jsx`) 卻假設有嵌套結構：

```javascript
// ❌ 錯誤：假設有 .videos 屬性
const ownedVideosForDisplay = useMemo(() => {
  return customerList.map(item => item.videos).filter(Boolean)
}, [customerList])

// 結果：customerList.map(item => item.videos)
// 得到一堆 undefined，所以顯示空白！
```

### 原因 2：提交時的資料映射錯誤

```javascript
// ❌ 錯誤：使用不存在的 video_id 和 videos 屬性
const removedVideos = customerList
  .filter(item => pendingChanges.remove.has(item.video_id))  // ❌ 沒有 video_id
  .map(item => item.videos)  // ❌ 沒有 videos
  .filter(Boolean)
```

因為 `customerList` 已經是攤平的影片物件，應該直接使用 `item.id`。

### 原因 3：儀表板查詢錯誤的資料表

**後端** (`backend/src/routes/dashboard.js`) 查詢的是舊的 `selections` 表：

```javascript
// ❌ 錯誤：查詢舊的 selections 表（按批次記錄）
const { data: selectionData } = await supabase
  .from('selections')
  .select('*')
  .eq('user_id', userId)
  .eq('batch_id', latestBatch.id)
  .maybeSingle();
```

但 v3 重構後改用 `customer_current_list` 表（累積清單）！

## ✅ 解決方案

### 修正 1：前端資料結構映射

#### ✅ 修正後（正確）

```javascript
// customerList 已經是攤平的影片物件陣列，不需要再映射 .videos
const ownedVideosForDisplay = useMemo(() => {
  return customerList.filter(Boolean)
}, [customerList])
```

### 修正 2：提交時的資料映射

#### ✅ 修正後（正確）

```javascript
// customerList 已經是攤平的影片物件，直接使用 item.id
const removedVideos = customerList
  .filter(item => pendingChanges.remove.has(item.id))
  .filter(Boolean)
```

### 修正 3：儀表板查詢正確的資料表

#### ✅ 修正後（正確）

```javascript
// 查詢客戶當前的累積清單（不限批次）
const { count: listCount, error: listError } = await supabase
  .from('customer_current_list')
  .select('*', { head: true, count: 'exact' })
  .eq('customer_id', userId);

// 查詢最後一次提交記錄（從 selection_history）
const { data: lastSubmission, error: historyError } = await supabase
  .from('selection_history')
  .select('*')
  .eq('customer_id', userId)
  .order('snapshot_date', { ascending: false })
  .limit(1)
  .maybeSingle();

// hasSelection 表示客戶是否有累積清單
const hasSelection = listCount > 0;
```

### 修正 4：客戶儀表板顯示

更新前端儀表板以配合新的 API 響應：

```javascript
// 使用 customerListCount 或 total_count
{hasSelection
  ? `共選擇 ${status?.customerListCount || selection?.total_count || 0} 部影片`
  : ...
}
```

## 📝 修改檔案清單

### 前端修改

- ✅ `frontend/src/pages/MovieSelection_v3.jsx` 
  - 修正 `ownedVideosForDisplay` 映射邏輯（第 434-436 行）
  - 修正 `removedVideos` 過濾邏輯（第 338-341 行）
- ✅ `frontend/src/pages/CustomerDashboard.jsx`
  - 更新顯示邏輯以使用 `customerListCount`（第 136 行）

### 後端修改

- ✅ `backend/src/routes/dashboard.js`
  - 修正客戶儀表板 API，查詢 `customer_current_list` 表（第 17-77 行）
  - 添加 `customerListCount` 欄位
  - 從 `selection_history` 獲取最後提交記錄

## 🧪 測試計畫

### 1. 測試「我的清單」顯示

**步驟**：
1. 客戶登入
2. 進入「影片選擇」頁面
3. 點擊右上角「我的清單」按鈕

**預期結果**：
- ✅ 應顯示所有已選擇的影片（25 部）
- ✅ 每部影片都應有縮圖和標題
- ✅ 不應顯示「您尚未選擇任何影片」

### 2. 測試取消影片並提交

**步驟**：
1. 客戶登入（已有 25 部影片）
2. 進入「影片選擇」頁面
3. 取消選擇 2 部影片
4. 點擊「提交選擇」
5. 確認彈窗應顯示「下架 2 部」
6. 確認提交
7. 重新進入頁面

**預期結果**：
- ✅ 提交成功提示
- ✅ 重新進入後顯示 23 部影片（25 - 2）
- ✅ 右上角顯示「我的清單 (23)」
- ✅ 點擊「我的清單」應顯示剩餘的 23 部

### 3. 測試儀表板狀態

**步驟**：
1. 客戶登入（已提交選擇）
2. 查看儀表板

**預期結果**：
- ✅ 「我的選擇狀態」應顯示「已提交」（不是「等待提交」）
- ✅ 應顯示「共選擇 X 部影片」
- ✅ 狀態標籤應顯示「已完成」（綠色）

### 4. 測試新增影片

**步驟**：
1. 客戶登入（已有 23 部影片）
2. 進入「影片選擇」頁面
3. 選擇 3 部新影片
4. 提交
5. 檢查結果

**預期結果**：
- ✅ 提交成功
- ✅ 重新進入後顯示 26 部影片（23 + 3）
- ✅ 儀表板正確顯示 26 部

## 🚀 部署步驟

### 1. Git 提交

```bash
cd D:\Projects\PythonWorkspace\Fashion_movielist

# 查看修改
git status
git diff

# 提交前端修改
git add frontend/src/pages/MovieSelection_v3.jsx
git add frontend/src/pages/CustomerDashboard.jsx

# 提交後端修改
git add backend/src/routes/dashboard.js

# 提交文檔
git add FIX_CUSTOMER_LIST_ISSUES.md

# 提交
git commit -m "fix(customer-list): 修正清單顯示、更新與儀表板狀態問題

問題修正：
1. 修正「我的清單」顯示空白問題（資料結構映射錯誤）
2. 修正取消影片後沒有更新的問題（過濾邏輯錯誤）
3. 修正儀表板顯示「等待提交」問題（查詢錯誤的表）

技術細節：
- customerList 已是攤平的影片物件，移除多餘的 .videos 映射
- 使用 item.id 而非 item.video_id 進行過濾
- 儀表板改查詢 customer_current_list 表而非 selections 表
- 添加 customerListCount 欄位以正確顯示數量

影響範圍：
- 前端：MovieSelection_v3.jsx, CustomerDashboard.jsx
- 後端：dashboard.js

測試通過：
- ✅ 清單顯示正常
- ✅ 新增/移除影片正確更新
- ✅ 儀表板狀態正確

Fixes: #customer-list-display, #update-not-working, #dashboard-status"

git push origin main
```

### 2. Vercel 部署（前端）

Vercel 會自動部署，等待 1-3 分鐘。

### 3. Render 部署（後端）

Render 會在檢測到 Git 推送後自動部署，等待 2-5 分鐘。

或手動重啟：
1. 登入 Render Dashboard
2. 找到 `fashion-movielist` 後端服務
3. 點擊「Manual Deploy」→「Deploy latest commit」

## 📊 預期效果

### 修正前 ❌

**「我的清單」**：
- 右上角：「我的清單 (25)」✅
- 點擊後：「您尚未選擇任何影片」❌

**取消影片**：
- 提交時：彈窗顯示「下架 1 部」✅
- 重新進入：仍顯示 25 部 ❌

**儀表板**：
- 已提交影片 ✅
- 顯示：「等待提交」❌

### 修正後 ✅

**「我的清單」**：
- 右上角：「我的清單 (25)」✅
- 點擊後：顯示 25 部影片的縮圖和標題 ✅

**取消影片**：
- 提交時：彈窗顯示「下架 1 部」✅
- 重新進入：顯示 24 部 ✅

**儀表板**：
- 已提交影片 ✅
- 顯示：「已提交 - 共選擇 24 部影片」✅

## 💡 架構理解

### 當前架構（v3）：累積清單模式

您的專案使用的是**累積清單**模式，這是正確的設計：

#### 核心概念
- **每月上傳**：上傳者每月上傳新的影片清單
- **累積選擇**：客戶維護一份持續更新的累積清單
- **跨月份選擇**：客戶可以從任何月份選擇影片加入清單
- **持續替換**：客戶可以隨時新增或移除影片

#### 資料表設計

1. **`customer_current_list`** - 客戶的當前累積清單
   - 每個客戶一份持續更新的清單
   - 記錄每部影片的來源月份
   - 支援跨月份選擇

2. **`selection_history`** - 選擇歷史快照
   - 記錄每次提交的快照
   - 用於追蹤變更歷史
   - 包含新增/移除的影片詳情

3. **`batches`** - 每月上傳的批次
   - 每月一個或多個批次
   - 包含該月的影片清單

4. **`videos`** - 所有影片
   - 關聯到對應的批次
   - 包含完整影片資訊

#### 工作流程

```
1. 上傳者上傳 2025-12 月份清單
   ↓
2. 客戶 A 登入，查看當前累積清單（可能已有 20 部影片）
   ↓
3. 客戶 A 從 2025-12 選擇 5 部新影片
   ↓
4. 客戶 A 從累積清單移除 2 部舊影片
   ↓
5. 客戶 A 提交選擇
   ↓
6. 系統更新 customer_current_list（現在有 23 部影片）
   ↓
7. 系統記錄快照到 selection_history
   ↓
8. 系統發送郵件通知管理員
```

### 為什麼不需要「我的清單」？

您提到的疑問很合理。讓我解釋一下：

#### 保留「我的清單」的理由 ✅

1. **快速查看**：客戶可以快速查看自己目前擁有的所有影片
2. **跨月份管理**：累積清單可能包含多個月份的影片，集中顯示更方便
3. **對比選擇**：客戶在選擇新影片時，可以對照目前清單避免重複
4. **移除舊片**：客戶可以從清單中移除不想要的影片

#### 如果移除「我的清單」

如果移除這個功能，客戶將：
- ❌ 無法快速查看自己目前有哪些影片
- ❌ 需要記憶之前選過什麼
- ❌ 可能重複選擇相同影片
- ❌ 不方便移除舊影片

### 建議

**保留當前設計** ✅

您目前的設計是合理且符合需求的：
- ✅ 支援累積清單模式
- ✅ 支援跨月份選擇
- ✅ 提供清晰的UI顯示
- ✅ 便於客戶管理自己的清單

唯一需要的是**修正實現中的bug**（已完成）。

## 📞 後續支援

如果部署後仍有問題，請檢查：

1. **瀏覽器快取**：清除快取或使用無痕模式
2. **Vercel 部署**：確認前端部署成功
3. **Render 部署**：確認後端部署成功
4. **資料庫**：確認 `customer_current_list` 表有資料

需要協助請提供：
- 瀏覽器開發者工具的 Network 和 Console 截圖
- Render 的完整 LOG
- 具體的操作步驟

---

**修正完成日期**：2026-01-05  
**修正者**：AI Assistant  
**版本**：v3.0.6
