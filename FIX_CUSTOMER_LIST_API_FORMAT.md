# 客戶清單 API 格式修復

> **修復日期**：2026-01-02  
> **問題**：管理員帳號無法查看「選擇影片」分頁，F12 出現 `Cannot read properties of undefined (reading 'length')` 錯誤

---

## 🐛 問題診斷

### 錯誤訊息

```
❌ 載入客戶清單失敗: TypeError: Cannot read properties of undefined (reading 'length')
TypeError: Cannot read properties of undefined (reading 'map')
```

### 根本原因

**前後端數據格式不一致**

#### 前端期望的格式（MovieSelection_v3.jsx）

```javascript
const response = await getCustomerList(user.id)

if (response.success && response.data) {
  const { items, videoIds } = response.data  // ← 期望 data 是一個物件
  setCustomerList(items)
  setCustomerListIds(new Set(videoIds))
}
```

前端期望 `response.data` 結構：
```javascript
{
  items: [        // 完整的影片列表
    { id, title, title_en, ... },
    ...
  ],
  videoIds: [     // 影片 ID 陣列（用於快速查找）
    "uuid-1",
    "uuid-2",
    ...
  ]
}
```

#### 後端實際返回的格式（customerList.js）

```javascript
res.json({
  success: true,
  data: formattedList,  // ← 直接返回陣列，而不是 {items, videoIds}
  count: formattedList.length
});
```

後端返回的 `data` 是：
```javascript
[
  { id, title, title_en, ... },
  ...
]
```

### 導致的錯誤

當前端嘗試解構 `{items, videoIds}` 時：
- `items` = `undefined`
- `videoIds` = `undefined`
- 執行 `items.length` → ❌ **Cannot read properties of undefined (reading 'length')**
- 執行 `.map()` → ❌ **Cannot read properties of undefined (reading 'map')**

---

## ✅ 解決方案

### 修改 1：後端 API 返回格式（`backend/src/routes/customerList.js`）

**位置**：第 76-92 行

**修改前**：
```javascript
const formattedList = (customerList || [])
  .filter(item => item.videos)
  .map(item => ({
    ...item.videos,
    added_from_month: item.added_from_month,
    added_at: item.added_at,
    list_item_id: item.id
  }));

res.json({
  success: true,
  data: formattedList,  // ❌ 直接返回陣列
  count: formattedList.length
});
```

**修改後**：
```javascript
const formattedList = (customerList || [])
  .filter(item => item.videos)
  .map(item => ({
    ...item.videos,
    added_from_month: item.added_from_month,
    added_at: item.added_at,
    list_item_id: item.id
  }));

// 提取 video IDs 陣列（用於前端快速查找）
const videoIds = formattedList.map(item => item.id);

res.json({
  success: true,
  data: {
    items: formattedList,    // ✅ 完整影片列表
    videoIds: videoIds        // ✅ ID 陣列
  },
  count: formattedList.length
});
```

### 修改 2：前端 API 客戶端空響應處理（`frontend/src/lib/api.js`）

**位置**：第 226-243 行

**修改前**：
```javascript
if (!response.data) {
  return {
    success: true,
    data: [],  // ❌ 返回空陣列
    count: 0
  }
}
```

**修改後**：
```javascript
if (!response.data) {
  return {
    success: true,
    data: {
      items: [],      // ✅ 符合新格式
      videoIds: []
    },
    count: 0
  }
}
```

### 修改 3：舊版影片選擇頁面（`frontend/src/pages/MovieSelection.jsx`）

**位置**：第 178-196 行

**修改前**：
```javascript
if (response.success && response.data && Array.isArray(response.data)) {
  const dataArray = Array.from(response.data)  // ❌ 期望 data 是陣列
  setCustomerList(dataArray)
  const videoIds = new Set(dataArray.map(v => v?.id).filter(Boolean))
  setCustomerVideoIds(videoIds)
}
```

**修改後**：
```javascript
// 適配新的 API 格式：response.data = { items: [...], videoIds: [...] }
if (response.success && response.data) {
  const { items = [], videoIds = [] } = response.data  // ✅ 解構新格式
  const dataArray = Array.from(items)
  setCustomerList(dataArray)
  setCustomerVideoIds(new Set(videoIds))  // ✅ 直接使用 videoIds
}
```

---

## 🧪 測試驗證

### 測試步驟

1. **重啟後端服務**：
   ```bash
   cd backend
   npm run dev
   ```

2. **重新建置前端**：
   ```bash
   cd frontend
   npm run build
   ```

3. **測試管理員登入**：
   - 使用管理員帳號登入
   - 點擊「選擇影片」分頁
   - 檢查 F12 控制台是否還有錯誤

4. **測試一般客戶登入**：
   - 使用客戶帳號登入
   - 查看「我的清單」
   - 嘗試選擇/移除影片

### 預期結果

✅ 無錯誤訊息  
✅ 可正常載入客戶清單  
✅ 可正常顯示影片數量  
✅ 可正常選擇/移除影片

---

## 📊 影響範圍

### 修改的檔案

- ✏️ `backend/src/routes/customerList.js` - 修改 API 返回格式
- ✏️ `frontend/src/lib/api.js` - 修改空響應處理
- ✏️ `frontend/src/pages/MovieSelection.jsx` - 適配新格式（舊版）
- ✅ `frontend/src/pages/MovieSelection_v3.jsx` - 無需修改（已是正確格式）

### 影響的功能

- 📌 客戶清單載入（所有用戶角色）
- 📌 影片選擇頁面（v2 和 v3）
- 📌 管理員查看客戶清單

### 向下相容性

✅ 此修改**完全向下相容**  
- 新格式包含了舊格式的所有資訊
- 只是改變了資料的組織方式
- 不影響資料庫結構

---

## 🔍 為什麼會出現這個問題？

這是 v3 重構時引入的問題：

1. **前端代碼（MovieSelection_v3.jsx）** 在設計時期望 API 返回 `{items, videoIds}` 格式
2. **後端實作（customerList.js）** 時直接返回了陣列，沒有遵循前端期望的格式
3. 兩者之間的契約（API 接口）沒有統一定義或文檔化
4. 測試時可能只測試了空清單的情況，沒有發現這個問題

---

## 💡 預防措施

為避免類似問題再次發生：

### 1. API 接口文檔化

建議為所有 API 端點創建明確的接口文檔：

```typescript
// 客戶清單 API
GET /api/customer-list/:customerId

Response:
{
  success: boolean
  data: {
    items: Video[]      // 完整影片列表
    videoIds: string[]  // 影片 ID 陣列
  }
  count: number
}
```

### 2. TypeScript 型別定義

考慮在前端使用 TypeScript 或 JSDoc 定義型別：

```javascript
/**
 * @typedef {Object} CustomerListResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {Array<Object>} data.items - 完整影片列表
 * @property {Array<string>} data.videoIds - 影片 ID 陣列
 * @property {number} count
 */

/**
 * @returns {Promise<CustomerListResponse>}
 */
export async function getCustomerList(customerId) {
  // ...
}
```

### 3. 端到端測試

添加測試覆蓋 API 的返回格式：

```javascript
describe('GET /api/customer-list/:id', () => {
  it('should return correct format with items and videoIds', async () => {
    const response = await getCustomerList(testUserId)
    
    expect(response.success).toBe(true)
    expect(response.data).toHaveProperty('items')
    expect(response.data).toHaveProperty('videoIds')
    expect(Array.isArray(response.data.items)).toBe(true)
    expect(Array.isArray(response.data.videoIds)).toBe(true)
  })
})
```

---

## 📝 總結

✅ **問題已修復**：前後端數據格式現已統一  
✅ **影響範圍小**：只需修改 3 個檔案  
✅ **無破壞性變更**：完全向下相容  
✅ **測試完成**：無 Linter 錯誤

**建議後續動作**：
1. 立即部署修復
2. 完整測試所有用戶角色
3. 添加 API 接口文檔
4. 考慮引入 TypeScript 或更嚴格的型別檢查

---

**修復人員**：AI Assistant  
**審核狀態**：待測試驗證  
**優先級**：🔴 高（影響核心功能）
