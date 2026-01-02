# 跨月份選擇同步修正 (Cross-Month Selection Sync Fix)

> **版本**: v3.0.3  
> **日期**: 2026-01-03  
> **狀態**: ✅ 已完成並部署

## 問題描述

### 核心問題
同一部影片在不同月份的清單中會有不同的 `video.id`（UUID），導致系統無法識別它們是同一部影片。

### 實際案例
```
影片「弟弟」:
- 2025-12 月份: id = 58d76668-61a6-437d-9992-87490dbb5ea1
- 2025-10 月份: id = d54b34bb-e7c8-4228-b6ad-8cb9d211a922
```

### 影響範圍
1. **前端選擇狀態不同步**: 在 2025-11 選擇「弟弟」後，切換到 2025-12 時，該影片不會顯示為已選擇狀態
2. **郵件通知資料不正確**: 郵件中可能顯示重複的影片，或遺漏跨月份選擇的影片

---

## 解決方案

### 核心策略
**使用影片標題 (`video.title`) 作為唯一識別**，因為同一部影片在不同月份的標題是相同的。

---

## 前端修正 (MovieSelection_v3.jsx)

### 1. 新增狀態管理

```javascript
// 新增：影片標題集合（用於跨月份判斷）
const [customerListTitles, setCustomerListTitles] = useState(new Set())

// 新增：待處理變更的影片標題集合
const [pendingChangesTitles, setPendingChangesTitles] = useState({
  add: new Set(),    // 儲存 video.title
  remove: new Set()  // 儲存 video.title
})
```

### 2. 載入客戶清單時建立標題集合

```javascript
async function loadCustomerList() {
  // ... 原有邏輯 ...
  
  // 建立影片標題集合（用於跨月份判斷同一部影片）
  const titles = new Set(items.map(item => item.title))
  setCustomerListTitles(titles)
}
```

### 3. 更新影片點擊邏輯

```javascript
function handleVideoClick(video) {
  const videoId = video.id
  const videoTitle = video.title
  
  // 使用標題判斷是否已擁有（跨月份判斷）
  const isOwnedByTitle = customerListTitles.has(videoTitle) || 
                         pendingChangesTitles.add.has(videoTitle)
  const isPendingRemoveByTitle = pendingChangesTitles.remove.has(videoTitle)
  
  // 同時更新 ID 和標題集合
  if (isOwned && !isPendingRemove) {
    setPendingChanges(prev => ({
      ...prev,
      remove: new Set([...prev.remove, videoId])
    }))
    setPendingChangesTitles(prev => ({
      ...prev,
      remove: new Set([...prev.remove, videoTitle])
    }))
  }
  // ... 其他邏輯類似 ...
}
```

### 4. 更新顯示狀態計算

```javascript
function getVideoDisplayState(video) {
  const videoTitle = video.title
  
  // 使用標題判斷是否已擁有（跨月份判斷）
  const isOwnedByTitle = customerListTitles.has(videoTitle)
  const isPendingAddByTitle = pendingChangesTitles.add.has(videoTitle)
  const isPendingRemoveByTitle = pendingChangesTitles.remove.has(videoTitle)
  
  const isOwned = isOwnedByTitle || isOwnedById
  
  if (isOwned && !isPendingRemoveByTitle) return 'owned'
  if (isOwned && isPendingRemoveByTitle) return 'pending_remove'
  if (!isOwned && isPendingAddByTitle) return 'pending_add'
  return 'available'
}
```

### 5. 更新 LocalStorage 保存邏輯

```javascript
useEffect(() => {
  if (user?.id) {
    const key = `pending-changes-${user.id}`
    const data = {
      add: Array.from(pendingChanges.add),
      remove: Array.from(pendingChanges.remove),
      addTitles: Array.from(pendingChangesTitles.add),      // 新增
      removeTitles: Array.from(pendingChangesTitles.remove), // 新增
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(key, JSON.stringify(data))
  }
}, [pendingChanges, pendingChangesTitles, user])
```

### 6. 更新提交邏輯（使用標題去重）

```javascript
function handleSubmitClick() {
  // 從所有月份的影片中找出待新增的影片
  const allVideos = Object.values(allMonthsVideos).flat()
  const addedVideos = allVideos.filter(v => pendingChanges.add.has(v.id))
  
  // 使用標題去重（同一影片可能出現在多個月份，但只顯示一次）
  const uniqueAddedVideos = Array.from(
    new Map(addedVideos.map(v => [v.title, v])).values()
  )
  
  // ... 其他邏輯 ...
}
```

---

## 後端修正

### 1. 更新 API 調用 (customerList.js)

```javascript
// 發送通知
const emailData = {
  customerId,
  customerName,
  customerEmail,
  totalCount: videoIds.length,
  addedVideos,  // 前端已使用標題去重
  removedVideos // 前端已處理
};

await notifyAdminCustomerSelection(emailData);
```

### 2. 重構郵件服務 (emailService.js)

#### 更新函數簽名
```javascript
/**
 * 通知管理員客戶的選擇
 * 
 * @param {Object} options - 選項
 * @param {string} options.customerId - 客戶 ID
 * @param {string} options.customerName - 客戶名稱
 * @param {string} options.customerEmail - 客戶 Email
 * @param {number} options.totalCount - 當前清單總數
 * @param {Array} options.addedVideos - 新增的影片陣列（前端已去重）
 * @param {Array} options.removedVideos - 移除的影片陣列
 */
export async function notifyAdminCustomerSelection({ 
  customerId, 
  customerName, 
  customerEmail, 
  totalCount, 
  addedVideos = [], 
  removedVideos = [] 
}) {
  // ... 實作 ...
}
```

#### 簡化郵件模板
- **移除**: 複雜的 `video.id` 差異計算邏輯
- **新增**: 直接使用前端傳來的 `addedVideos` 和 `removedVideos`
- **優化**: 分別顯示「新增影片」和「移除影片」兩個清單

```javascript
// 建立新增影片清單 HTML
let addedSectionHtml = '';
if (addedVideos.length > 0) {
  const addedListHtml = addedVideos.map((video, index) => {
    return `
    <tr>
      <td>${String(index + 1).padStart(2, '0')}</td>
      <td>
        ${video.title}
        <span style="background: #10b981;">新增</span>
      </td>
    </tr>
  `;
  }).join('');
  // ... 完整 HTML ...
}

// 建立移除影片清單 HTML
let removedSectionHtml = '';
if (removedVideos.length > 0) {
  // ... 類似邏輯 ...
}
```

---

## 技術細節

### 為什麼使用標題而非 ID？

| 方案 | 優點 | 缺點 |
|------|------|------|
| **使用 video.id** | - 精確唯一<br>- 資料庫主鍵 | - 同一影片在不同月份有不同 ID<br>- 無法跨月份識別 |
| **使用 video.title** ✅ | - 同一影片在所有月份標題相同<br>- 符合業務邏輯<br>- 實現簡單 | - 理論上可能有重複標題<br>（實際上極少發生） |

### 資料流程

```
1. 載入客戶清單
   ↓
2. 建立 customerListTitles (Set)
   ↓
3. 用戶點擊影片
   ↓
4. 使用 title 判斷是否已選擇
   ↓
5. 更新 pendingChanges (ID) 和 pendingChangesTitles (title)
   ↓
6. 提交時使用 title 去重
   ↓
7. 後端接收去重後的清單
   ↓
8. 郵件直接使用前端處理好的資料
```

---

## 測試場景

### 場景 1: 跨月份選擇同步
1. 在 2025-11 選擇「弟弟」
2. 切換到 2025-12
3. **預期**: 「弟弟」自動顯示為已選擇狀態 ✅

### 場景 2: 提交確認顯示正確
1. 從 2025-11 選擇「弟弟」
2. 從 2025-12 選擇「我的企鵝朋友」和「弟弟」
3. 點擊「提交選擇」
4. **預期**: 確認彈窗只顯示「弟弟」和「我的企鵝朋友」各一次 ✅

### 場景 3: 郵件通知正確
1. 客戶提交選擇
2. 管理員收到郵件
3. **預期**: 
   - 新增清單不重複
   - 移除清單正確
   - 總數計算正確 ✅

---

## 相關檔案

### 前端
- `frontend/src/pages/MovieSelection_v3.jsx` - 主要邏輯修改

### 後端
- `backend/src/routes/customerList.js` - API 調用修改
- `backend/src/services/emailService.js` - 郵件服務重構

---

## 版本更新

- **v3.0.2**: 初步實現跨月份選擇（使用 ID，有問題）
- **v3.0.3**: 修正跨月份選擇（使用標題，問題解決） ✅

---

## 後續優化建議

1. **資料庫層面**: 考慮在 `videos` 表增加 `canonical_title` 欄位，用於更精確的跨月份識別
2. **前端體驗**: 在影片卡片上顯示「此影片在多個月份出現」的提示
3. **效能優化**: 使用 `useMemo` 快取標題集合的計算結果

---

## 總結

✅ **問題已解決**: 跨月份選擇狀態現在可以正確同步  
✅ **郵件通知正確**: 使用前端去重後的資料，避免重複顯示  
✅ **代碼簡化**: 移除後端複雜的差異計算邏輯  
✅ **用戶體驗提升**: 選擇流程更直觀，符合業務預期
