# 儀表板資料顯示修正 - v3.0.7

> **修正日期**：2026-01-05  
> **版本**：v3.0.7  
> **Commit**: d73317f  
> **狀態**：✅ 已修正，正在部署

## 🔍 問題描述

所有儀表板都無法正確顯示客戶選擇資料：

### 問題 1：客戶儀表板的選擇記錄顯示空白 ❌
- 明明客戶已經選擇了影片
- 但選擇歷史頁面顯示空白
- 無法查看自己的歷史選擇記錄

### 問題 2：管理員儀表板顯示所有客戶「待提交」❌
- 客戶已經正確選擇並提交
- 但管理員儀表板顯示「尚未選擇」或「待提交」
- 本月選擇進度顯示 0%

### 問題 3：已選清單分頁看不到任何資料 ❌
- 管理員無法查看客戶的選擇清單
- 所有客戶都顯示空白或無資料
- 無法管理和追蹤客戶選擇

## 🎯 根本原因

**所有儀表板仍在查詢舊的 v2 資料表**，而 v3 重構後資料存儲在新表中：

### 舊架構（v2）- 按批次記錄
```
selections 表（按月批次記錄）
├── user_id
├── batch_id (關聯特定批次)
├── video_ids
└── created_at
```

### 新架構（v3）- 累積清單模式 ✅
```
customer_current_list 表（累積清單）
├── customer_id
├── video_id
├── added_from_month
└── added_at

selection_history 表（歷史快照）
├── customer_id
├── video_ids
├── added_videos (JSON)
├── removed_videos (JSON)
├── snapshot_date
└── month
```

## ✅ 解決方案

### 修正 1：客戶選擇歷史頁面

**文件**：`frontend/src/pages/SelectionHistory.jsx`

#### 修正前 ❌
```javascript
// 查詢舊的 selections 表
const { data: selectionsData } = await supabase
  .from('selections')
  .select(`
    *,
    batches:batch_id (id, name, month, created_at)
  `)
  .eq('user_id', user.id)
```

#### 修正後 ✅
```javascript
// 查詢新的 selection_history 表
const { data: selectionsData } = await supabase
  .from('selection_history')
  .select('*')
  .eq('customer_id', user.id)
  .order('snapshot_date', { ascending: false })

// selection_history 已包含影片詳情（JSON 格式），直接使用
const currentVideos = selection.current_videos || []
const addedVideos = selection.added_videos || []
const removedVideos = selection.removed_videos || []
```

**優點**：
- ✅ 直接使用快照中的影片詳情，無需額外查詢
- ✅ 支援顯示新增/移除的影片
- ✅ 歷史記錄完整且準確

### 修正 2：管理員儀表板概覽

**文件**：`backend/src/routes/dashboard.js`

#### 修正前 ❌
```javascript
// 查詢舊的 selections 表（按批次）
const { data: selectionRows } = await supabase
  .from('selections')
  .select('user_id, video_ids, created_at')
  .eq('batch_id', targetBatch.id);
```

#### 修正後 ✅
```javascript
// 查詢新的 customer_current_list 表（累積清單）
const { data: currentListRows } = await supabase
  .from('customer_current_list')
  .select('customer_id, video_id')
  .not('video_id', 'is', null);

// 統計每個客戶的影片數量
const customerVideoCount = new Map();
currentListRows.forEach((row) => {
  const count = customerVideoCount.get(row.customer_id) || 0;
  customerVideoCount.set(row.customer_id, count + 1);
});

// 查詢最後提交時間（從 selection_history）
const { data: lastSubmissions } = await supabase
  .from('selection_history')
  .select('customer_id, snapshot_date')
  .order('snapshot_date', { ascending: false });

// 組合資料
selectionDetails = customers.map((customer) => {
  const videoCount = customerVideoCount.get(customer.id) || 0;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    status: videoCount > 0 ? 'submitted' : 'pending',
    videoCount: videoCount,
    submittedAt: lastSubmissionMap.get(customer.id),
  };
});
```

**優點**：
- ✅ 顯示客戶的累積清單，而非特定批次
- ✅ 準確反映客戶的實際選擇狀態
- ✅ 提交時間來自歷史記錄

### 修正 3：管理員已選片單摘要 API

**文件**：`backend/src/routes/selections.js` - `/monthly-summary` 端點

#### 修正前 ❌
```javascript
// 查詢 selections 表（按批次）
const { data: currentSelections } = await supabase
  .from('selections')
  .select('user_id, video_ids, created_at')
  .eq('batch_id', currentBatch.id);
```

#### 修正後 ✅
```javascript
// 1. 獲取所有客戶的當前累積清單
const { data: currentListData } = await supabase
  .from('customer_current_list')
  .select(`
    customer_id,
    video_id,
    added_at,
    videos:video_id (id, title, title_en, thumbnail_url)
  `);

// 2. 獲取當前月份的選擇歷史快照（用於比對差異）
const { data: currentSelections } = await supabase
  .from('selection_history')
  .select('customer_id, video_ids, added_videos, removed_videos, snapshot_date, month')
  .eq('month', month)
  .order('snapshot_date', { ascending: false });

// 3. 如果有歷史快照，直接使用快照中的差異資訊
if (currentSelection) {
  addedVideos = currentSelection.added_videos || [];
  removedVideos = currentSelection.removed_videos || [];
} else {
  // 沒有快照時，手動計算差異
  const addedIds = currentVideoIds.filter(id => !previousVideoIds.includes(id));
  const removedIds = previousVideoIds.filter(id => !currentVideoIds.includes(id));
  addedVideos = addedIds.map(id => videosMap.get(id)).filter(Boolean);
  removedVideos = removedIds.map(id => videosMap.get(id)).filter(Boolean);
}
```

**優點**：
- ✅ 顯示客戶的累積清單
- ✅ 利用 `selection_history` 中已計算好的差異資訊
- ✅ 支援跨月份的完整歷史追蹤
- ✅ 減少重複計算，提升性能

## 📝 修改檔案清單

### 前端修改
- ✅ `frontend/src/pages/SelectionHistory.jsx`
  - 第 42-54 行：改查詢 `selection_history` 表
  - 第 56-96 行：處理 `selection_history` 的資料結構

### 後端修改
- ✅ `backend/src/routes/dashboard.js`
  - 第 175-200 行：管理員儀表板概覽改查詢 `customer_current_list`
  
- ✅ `backend/src/routes/selections.js`
  - 第 570-592 行：已選片單摘要 API 改查詢 `customer_current_list`
  - 第 594-603 行：建立客戶選擇的 Map（使用 `customer_id`）
  - 第 629-673 行：組合摘要資料，使用 `customer_current_list` 和 `selection_history`

## 🧪 測試計畫

### 1. 測試客戶選擇歷史

**步驟**：
1. 客戶登入
2. 進入「選擇歷史」頁面
3. 查看歷史記錄

**預期結果**：
- ✅ 應顯示所有歷史選擇記錄
- ✅ 每條記錄應顯示日期、影片數量
- ✅ 展開後應顯示影片詳情
- ✅ 應正確顯示新增/移除的影片

### 2. 測試管理員儀表板概覽

**步驟**：
1. 管理員登入
2. 查看管理員儀表板
3. 檢查「本月選擇進度」
4. 檢查「客戶選擇明細」

**預期結果**：
- ✅ 「本月選擇進度」應正確顯示已提交/待提交數量
- ✅ 已選擇的客戶應顯示「已提交」而非「待提交」
- ✅ 應顯示正確的影片數量
- ✅ 應顯示最後提交時間

### 3. 測試已選片單總覽

**步驟**：
1. 管理員登入
2. 進入「已選片單總覽」頁面
3. 選擇當前月份
4. 查看各客戶的選擇清單

**預期結果**：
- ✅ 應顯示所有客戶的累積清單
- ✅ 應正確顯示每個客戶選擇的影片
- ✅ 展開客戶應顯示新增/移除/保留的影片
- ✅ 影片數量應正確

## 🚀 部署步驟

### 1️⃣ Git 提交（已完成 ✅）

```bash
Commit: d73317f
Message: "fix: dashboard data display using new v3 tables"
Files changed: 3 files, 153 insertions(+), 90 deletions(-)
```

### 2️⃣ 等待部署（2-5 分鐘）

- **Vercel（前端）**：自動部署，1-3 分鐘
- **Render（後端）**：自動部署，2-5 分鐘

### 3️⃣ 測試（部署完成後）

執行上述測試計畫，確認所有儀表板資料顯示正確。

## 📊 預期效果

### 修正前 ❌

**客戶選擇歷史**：
- 顯示空白或無資料 ❌

**管理員儀表板**：
- 所有客戶顯示「待提交」❌
- 本月選擇進度 0% ❌

**已選片單總覽**：
- 所有客戶顯示空白 ❌

### 修正後 ✅

**客戶選擇歷史**：
- 顯示完整歷史記錄 ✅
- 正確顯示影片詳情 ✅

**管理員儀表板**：
- 正確顯示「已提交」狀態 ✅
- 本月選擇進度準確 ✅

**已選片單總覽**：
- 顯示所有客戶的累積清單 ✅
- 正確顯示新增/移除/保留的影片 ✅

## 💡 架構說明

### v3 累積清單模式的優勢

1. **持續更新**：客戶的清單隨時保持最新狀態
2. **跨月份選擇**：不受批次限制，可以從任何月份選擇影片
3. **歷史追蹤**：`selection_history` 保存每次提交的完整快照
4. **性能優化**：差異資訊已在提交時計算並保存，無需重複計算

### 為什麼不再使用 `selections` 表？

`selections` 表是按批次記錄的設計，每個月一條記錄。這不符合 v3 的累積清單概念：

- ❌ 無法反映客戶的真實累積清單
- ❌ 無法支援跨月份選擇
- ❌ 歷史記錄不完整（只有每月的快照）
- ❌ 需要複雜的查詢來獲取客戶的完整清單

v3 使用 `customer_current_list` + `selection_history` 的組合：

- ✅ `customer_current_list`：客戶當前的完整清單（實時）
- ✅ `selection_history`：每次提交的歷史快照（審計）
- ✅ 清晰、高效、易於維護

## ⚠️ 重要提醒

1. **不要再修改 `selections` 表**：這個表已經過時，所有新功能應使用 `customer_current_list` 和 `selection_history`
2. **未來開發**：所有儀表板和報表都應查詢新表
3. **資料遷移**：如果需要，可以將舊的 `selections` 資料遷移到新表（但目前系統已正常運作，不是必要）

## 📞 後續支援

如果部署後仍有問題，請檢查：

1. **瀏覽器快取**：清除快取或使用無痕模式
2. **Vercel 部署**：確認前端部署成功
3. **Render 部署**：確認後端部署成功，LOG 中應顯示新的 commit `d73317f`
4. **資料庫**：確認 `customer_current_list` 和 `selection_history` 表有資料

需要協助請提供：
- 瀏覽器開發者工具的 Network 和 Console 截圖
- Render 的完整 LOG
- 具體的操作步驟和錯誤訊息

---

**修正完成日期**：2026-01-05  
**版本**：v3.0.7  
**Commit**: d73317f  
**狀態**：✅ 已推送，等待部署
