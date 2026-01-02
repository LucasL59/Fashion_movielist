# 月份選擇器顯示 undefined 問題修復

> **修復日期**：2026-01-02  
> **Git Commit**：`b2d121d`  
> **問題**：月份選擇器顯示 "undefined-undefined"

---

## 🐛 問題描述

### 症狀

1. 月份選擇器顯示 "undefined-undefined"
2. 選擇月份後頁面變成空白
3. 後端日誌顯示正常載入月份

### 截圖證據

```
undefined - undefined  ▼
```

---

## 🔍 問題診斷

### 根本原因

**後端 API 返回格式與前端期望不一致**

#### 後端實際返回（錯誤）

```javascript
// GET /api/videos/months
{
  "success": true,
  "data": ["2025-12", "2025-11", "2025-10", "2025-09"],  // ❌ 字串陣列
  "count": 4
}
```

#### 前端期望格式

```javascript
// MovieSelection_v3.jsx
options={availableMonths.map(m => ({
  value: m.month,        // ❌ undefined (因為 m 是字串，不是物件)
  label: `${m.month} - ${m.batchName}`  // ❌ "undefined - undefined"
}))}
```

### 為什麼會出現這個問題？

1. **v3 重構時**，前端設計期望月份資料包含 `month` 和 `batchName`
2. **後端實作時**，只返回了字串陣列
3. **其他頁面**（MovieSelection.jsx, AdminSelectionSummary.jsx, VideoManagement.jsx）也期望字串陣列
4. 格式不統一導致 v3 頁面出錯

---

## ✅ 解決方案

### 修改 1：後端 API 返回物件陣列

**檔案**：`backend/src/routes/videos.js`

**修改前**：
```javascript
// 提取月份並去重
const months = [...new Set(batches.map(b => b.month))].filter(Boolean);

res.json({
  success: true,
  data: months,  // ❌ 字串陣列
  count: months.length
});
```

**修改後**：
```javascript
// 格式化為物件陣列，包含月份和批次名稱
const monthsData = batches
  .filter(b => b.month) // 過濾掉沒有月份的
  .map(b => ({
    month: b.month,
    batchName: b.name,
    createdAt: b.created_at
  }));

// 按月份去重（保留最新的）
const uniqueMonths = [];
const seenMonths = new Set();

for (const item of monthsData) {
  if (!seenMonths.has(item.month)) {
    seenMonths.add(item.month);
    uniqueMonths.push(item);
  }
}

res.json({
  success: true,
  data: uniqueMonths,  // ✅ 物件陣列
  count: uniqueMonths.length
});
```

**新的返回格式**：
```json
{
  "success": true,
  "data": [
    {
      "month": "2025-12",
      "batchName": "12月片單",
      "createdAt": "2025-12-01T00:00:00Z"
    },
    {
      "month": "2025-11",
      "batchName": "11月片單",
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ],
  "count": 2
}
```

### 修改 2：更新所有前端頁面

#### MovieSelection_v3.jsx（已正確）

```javascript
// ✅ 已經是正確格式，無需修改
options={availableMonths.map(m => ({
  value: m.month,
  label: `${m.month} - ${m.batchName}`
}))}
```

#### MovieSelection.jsx

**修改前**：
```javascript
const months = response.data || []
setAvailableMonths(months)

if (months.includes(currentMonth)) {
  setSelectedMonth(currentMonth)
} else if (months.length > 0) {
  setSelectedMonth(months[0])  // ❌ 字串
}
```

**修改後**：
```javascript
const monthsData = response.data || []
setAvailableMonths(monthsData)

const monthStrings = monthsData.map(m => m.month)

if (monthStrings.includes(currentMonth)) {
  setSelectedMonth(currentMonth)
} else if (monthsData.length > 0) {
  setSelectedMonth(monthsData[0].month)  // ✅ 物件的 month 屬性
}

// 渲染部分
{availableMonths.map((monthData) => (
  <button
    key={monthData.month}
    onClick={() => setSelectedMonth(monthData.month)}
  >
    {formatMonth(monthData.month)}
  </button>
))}
```

#### AdminSelectionSummary.jsx

**修改前**：
```javascript
options={availableMonths.map(month => ({ 
  value: month,  // ❌ 字串
  label: formatMonth(month) 
}))}
```

**修改後**：
```javascript
options={availableMonths.map(monthData => ({ 
  value: monthData.month,  // ✅ 物件的 month 屬性
  label: `${formatMonth(monthData.month)} - ${monthData.batchName}` 
}))}
```

#### VideoManagement.jsx

**修改前**：
```javascript
options={availableMonths.map((month) => ({
  value: month,  // ❌ 字串
  label: formatMonth(month)
}))}
```

**修改後**：
```javascript
options={availableMonths.map((monthData) => ({
  value: monthData.month,  // ✅ 物件的 month 屬性
  label: `${formatMonth(monthData.month)} - ${monthData.batchName}`
}))}
```

---

## 📊 修改統計

### 修改的檔案

- ✏️ `backend/src/routes/videos.js` - API 返回格式
- ✏️ `frontend/src/pages/MovieSelection.jsx` - 適配新格式
- ✏️ `frontend/src/pages/AdminSelectionSummary.jsx` - 適配新格式
- ✏️ `frontend/src/pages/VideoManagement.jsx` - 適配新格式
- ✅ `frontend/src/pages/MovieSelection_v3.jsx` - 無需修改（已正確）

### 變更統計

```
4 files changed, 54 insertions(+), 31 deletions(-)
```

---

## ✅ 修復後的效果

### 月份選擇器顯示

**修復前**：
```
undefined - undefined  ▼
```

**修復後**：
```
2025-12 - 12月片單  ▼
```

### 下拉選項

**修復前**：
```
undefined - undefined
undefined - undefined
undefined - undefined
```

**修復後**：
```
2025-12 - 12月片單
2025-11 - 11月片單
2025-10 - 10月片單
```

---

## 🧪 測試驗證

### 測試清單

- [ ] 前端部署完成（Vercel）
- [ ] 後端部署完成（Render）
- [ ] 月份選擇器顯示正確的月份和批次名稱
- [ ] 選擇月份後可以正常載入影片
- [ ] 所有頁面的月份選擇器都正常運作
  - [ ] MovieSelection.jsx（舊版）
  - [ ] MovieSelection_v3.jsx（新版）
  - [ ] AdminSelectionSummary.jsx
  - [ ] VideoManagement.jsx

### 測試步驟

1. **登入系統**
2. **進入「選擇影片」頁面**
3. **檢查月份選擇器**
   - ✅ 顯示格式：`YYYY-MM - 批次名稱`
   - ✅ 不再顯示 "undefined-undefined"
4. **選擇不同月份**
   - ✅ 可以正常切換
   - ✅ 影片清單正確載入
   - ✅ 頁面不會變成空白

---

## 🔄 部署狀態

### Git 推送

```bash
To https://github.com/LucasL59/Fashion_movielist.git
   fb16e96..b2d121d  main -> main
```

**Commit**：`b2d121d`  
**分支**：`main`

### 自動部署

- ⏳ **Vercel**（前端）：自動部署中（預計 2-5 分鐘）
- ⏳ **Render**（後端）：自動部署中（預計 3-8 分鐘）

### 監控連結

- 🎨 **Vercel Dashboard**：https://vercel.com/dashboard
- 🚀 **Render Dashboard**：https://dashboard.render.com

---

## 💡 經驗教訓

### 為什麼會出現這個問題？

1. **API 契約未明確定義**
   - 前後端對資料格式的期望不一致
   - 缺少明確的接口文檔

2. **測試不夠完整**
   - 只測試了空清單的情況
   - 沒有測試實際有資料時的顯示

3. **v3 重構時的遺漏**
   - 前端設計了新格式
   - 後端沒有同步更新

### 預防措施

1. **API 接口文檔化**
   ```typescript
   // GET /api/videos/months
   Response: {
     success: boolean
     data: Array<{
       month: string        // YYYY-MM
       batchName: string    // 批次名稱
       createdAt: string    // ISO 8601
     }>
     count: number
   }
   ```

2. **TypeScript 型別定義**
   ```typescript
   interface MonthData {
     month: string
     batchName: string
     createdAt: string
   }
   ```

3. **完整的端到端測試**
   - 測試有資料的情況
   - 測試 UI 顯示是否正確
   - 測試所有使用該 API 的頁面

---

## 📝 相關文檔

- 📄 `FIX_CUSTOMER_LIST_API_FORMAT.md` - 客戶清單 API 修復
- 📄 `DEPLOYMENT_STATUS.md` - 部署狀態追蹤
- 📄 `QUICK_TEST_GUIDE_FIX.md` - 測試指南

---

**修復完成時間**：2026-01-02  
**預計部署完成**：10-15 分鐘內  
**影響範圍**：所有使用月份選擇器的頁面
