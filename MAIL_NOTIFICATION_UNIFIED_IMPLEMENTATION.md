# 郵件通知統一化實作總結

> **實作日期**: 2025-11-25  
> **版本**: v2.2.2  
> **狀態**: ✅ 已完成

## 📋 問題分析

### 原有問題

1. **重複通知問題**: 上傳者點擊「上傳並通知」按鈕後，系統會發送兩次通知給一般使用者：
   - 第一次：`upload.js` 中的 `notifyCustomersNewList` 發送「新的影片清單已上傳」
   - 第二次：同一函式內部再次發送「新影片清單已上線」給內部人員

2. **預設收件人顯示問題**: 郵件管理頁面的「客戶提交影片選擇」卡片中，預設通知對象顯示硬編碼的 `lucas@fas.com.tw`，而非從使用者資料表中動態讀取系統管理員。

3. **缺少補發功能**: 沒有實現補發上傳通知的按鈕與功能。

## 🎯 解決方案

### 1. 後端郵件服務重構

#### `backend/src/services/emailService.js`

**修改內容**:
- 重寫 `notifyCustomersNewList` 函式，統一通知流程
- 一次性查詢批次資訊（包含上傳者）
- 統整收件人（**避免客戶收到重複通知**）：
  - **客戶**：所有 `role='customer'` 的使用者 → 收到「新的影片清單已上傳」
  - **內部人員**：所有管理員與上傳者（排除本次上傳者本人）+ `mail_rules` 中 `batch_uploaded` 的額外收件人 → 收到「新影片清單已上線」
- 去重後統一寄送
- 回傳寄送統計 `{ customersSent, internalSent, totalSent }`

**關鍵變更**:
```javascript
// 新增批次查詢
const { data: batch } = await supabase
  .from('batches')
  .select('id, name, uploader_id')
  .eq('id', batchId)
  .maybeSingle();

// 統一收件人邏輯：內部人員（管理員+上傳者，排除本次上傳者）
const uploaderProfile = await getUploaderByBatch(batch);
const uploaderIdToExclude = uploaderProfile?.id ? [uploaderProfile.id] : [];

// 取得所有非客戶使用者（排除本次上傳者）
const { data: allUsers } = await supabase
  .from('profiles')
  .select('id, email, name, role')
  .order('name', { ascending: true });

const defaultRecipients = (allUsers || [])
  .filter((user) => user.role !== 'customer') // 排除客戶，避免重複通知
  .filter((user) => !uploaderIdToExclude.includes(user.id))
  .filter((user) => user.email);

// 合併郵件管理中的額外收件人
const extraRecipients = await getMailRecipientsByEvent(MAIL_EVENT_TYPES.BATCH_UPLOADED);
const internalRecipients = mergeRecipients(
  defaultRecipients.map((user) => user.email),
  extraRecipients
);

// 回傳統計
return {
  customersSent: customers.length,
  internalSent: internalSentCount,
  totalSent: customers.length + internalSentCount
};
```

#### `backend/src/routes/upload.js`

**修改內容**:
- 移除重複的通知邏輯
- 僅呼叫一次 `notifyCustomersNewList`
- 將通知統計記錄到 operation logs 的 metadata 中
- 在回應中包含通知統計資訊

**關鍵變更**:
```javascript
// 發送統一通知
let notificationStats = null;
try {
  notificationStats = await notifyCustomersNewList(result.batchId, batchName);
  console.log(`📧 通知已發送 - 客戶: ${notificationStats.customersSent} 位，內部: ${notificationStats.internalSent} 位`);
} catch (emailError) {
  console.error('發送通知失敗:', emailError);
}
```

### 2. 新增補發通知 API

#### `backend/src/routes/mail.js`

**新增端點**: `POST /api/mail-rules/notifications/upload`

**權限**: `requireAuth` + `requireRoles(['admin', 'uploader'])`

**功能**:
- 接受可選的 `batchId` 參數
- 若未提供 `batchId`，自動抓取最新的 active 批次
- 呼叫統一的 `notifyCustomersNewList` 發送通知
- 記錄操作到 operation logs（action: `mail.batch_uploaded.resend`）
- 回傳通知統計資訊

**實作重點**:
```javascript
router.post('/notifications/upload', requireAuth, requireRoles(['admin', 'uploader']), async (req, res) => {
  const { batchId } = req.body;
  
  // 查詢或抓取最新批次
  let targetBatch = batchId ? /* 查詢指定批次 */ : /* 查詢最新批次 */;
  
  // 發送統一通知
  const notificationStats = await notifyCustomersNewList(targetBatch.id, targetBatch.name);
  
  // 記錄操作
  await recordOperationLog({
    req,
    action: 'mail.batch_uploaded.resend',
    resourceType: 'batch',
    resourceId: targetBatch.id,
    description: `${req.authUserProfile?.name} 補發批次「${targetBatch.name}」的上傳通知`,
    metadata: { batchId: targetBatch.id, batchName: targetBatch.name, notificationStats }
  });
  
  res.json({ success: true, data: { batchId, batchName, notificationStats } });
});
```

### 3. 修正郵件管理預設收件人

#### `backend/src/routes/mail.js`

**修改內容**:
- 新增 `getAdminProfiles()` 函式，從 `profiles` 表查詢 `role='admin'` 的使用者
- 若無管理員資料，回退到 `ADMIN_EMAIL` 環境變數
- 更新 `buildDefaultRecipients()` 使用動態管理員資料
- 更新 `getDefaultEmails()` 改為 async 函式，動態查詢管理員
- **`batch_uploaded` 預設收件人改為管理員與上傳者（不含客戶，避免重複通知）**

**關鍵變更**:
```javascript
async function getAdminProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('role', 'admin');
  
  if (data && data.length > 0) return data;
  
  // 回退到環境變數
  const envEmails = (process.env.ADMIN_EMAIL || '').split(',').filter(Boolean);
  return envEmails.map((email, index) => ({
    id: `env-admin-${index}`,
    name: '系統管理員',
    email,
    role: 'admin'
  }));
}

async function buildDefaultRecipients(users) {
  const adminProfiles = await getAdminProfiles();
  
  return {
    selection_submitted: [
      ...adminProfiles.map(admin => ({ id: admin.id, name: admin.name, email: admin.email, description: '系統管理員' })),
      { id: 'dynamic-uploader', name: '該批次上傳者', email: '—', description: '實際寄信時會依照批次上傳者自動加入' }
    ],
    batch_uploaded: users
      .filter(user => user.role !== 'customer') // 只顯示管理員與上傳者
      .map(user => ({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        description: user.role === 'admin' ? '系統管理員' : user.role === 'uploader' ? '上傳者' : '其他'
      }))
  };
}
```

#### `frontend/src/pages/MailManagement.jsx`

**修改內容**:
- 更新卡片說明文案，改為「所有系統管理員（依使用者資料）」
- 移除硬編碼的環境變數說明

**修改前**:
```javascript
description: '客戶完成影片挑選後通知相關人員（預設：系統管理員、該批次上傳者）'
// 說明: 系統預設會通知：管理員 Email（環境變數）與該批次的上傳者
```

**修改後**:
```javascript
// 客戶提交影片選擇
description: '客戶完成影片挑選後通知相關人員（預設：所有系統管理員、該批次上傳者）'
// 說明: 系統預設會通知：所有系統管理員（依使用者資料）與該批次的上傳者

// 新影片清單上傳
description: '有新的影片清單上架時通知內部人員（預設：所有管理員與上傳者，實際寄信時會排除本次上傳者本人。客戶會收到另一封專屬通知）'
// 說明: 預設會通知所有管理員與上傳者（排除本次上傳者本人）。客戶會收到另一封「新的影片清單已上傳」通知，無需重複設定。
```

### 4. 前端補發按鈕實作

#### `frontend/src/pages/UploadManagement.jsx`

**新增功能**:
- 新增「補發上傳通知」按鈕（位於批次列表標題旁）
- 新增批次選擇器 Modal，支援選擇當月或前一個月的批次
- 預設選擇最新批次
- 呼叫 `resendUploadNotification` API
- 顯示通知統計（客戶數、內部人員數）

#### `frontend/src/pages/MailManagement.jsx`

**新增功能**:
- 在「新影片清單上傳」卡片標題右側新增「補發通知」按鈕
- 點擊按鈕時載入批次清單並開啟 Modal
- Modal 包含批次選擇器、警告訊息與提示文字
- 呼叫 `resendUploadNotification` API 並顯示統計結果
- 更新說明文案為「所有使用者（排除本次上傳者本人）」

**關鍵實作**:
```javascript
// 狀態管理
const [resendModalOpen, setResendModalOpen] = useState(false);
const [selectedResendBatch, setSelectedResendBatch] = useState('');
const [sendingNotification, setSendingNotification] = useState(false);

// 開啟 Modal 並預設選擇最新批次
function handleOpenResendModal() {
  if (batches.length > 0) {
    setSelectedResendBatch(batches[0].id);
  }
  setResendModalOpen(true);
}

// 發送通知
async function handleResendNotification() {
  const batch = batches.find(b => b.id === selectedResendBatch);
  const response = await resendUploadNotification(batch.id, batch.name);
  
  const stats = response.data?.notificationStats;
  if (stats) {
    showToast(`已成功發送通知 - 客戶: ${stats.customersSent} 位，內部: ${stats.internalSent} 位`, 'success');
  }
}
```

**UI 元件**:
- 按鈕：位於「批次列表與客戶選擇」標題右側
- Modal：包含警告訊息、批次選擇器（下拉選單）、提示文字
- 選擇器：顯示批次名稱與上傳日期

#### `frontend/src/pages/UploaderDashboard.jsx`

**修改功能**:
- 更新既有的補發通知按鈕，加入批次選擇功能
- 從 `getAdminDashboardOverview` 取得 `allBatches` 清單
- 預設選擇最新批次，可改選前一個月
- 顯示通知統計資訊

**關鍵修改**:
```javascript
// 新增狀態
const [selectedResendBatch, setSelectedResendBatch] = useState('');

// 更新 status 結構以包含 allBatches
const [status, setStatus] = useState({
  latestBatch: null,
  allBatches: [],  // 新增
  submittedCount: 0,
  pendingCount: 0,
  totalCustomers: 0,
});

// 開啟 Modal 時預設選擇
function handleOpenNotificationModal() {
  if (status.allBatches && status.allBatches.length > 0) {
    setSelectedResendBatch(status.allBatches[0].id);
  }
  setNotificationModalOpen(true);
}
```

## 📊 實作效果

### 通知流程優化

**修改前**:
1. 上傳者點擊「上傳並通知」
2. 系統發送「新的影片清單已上傳」給客戶 ❌
3. 系統再發送「新影片清單已上線」給內部人員 ❌
4. **結果**: 客戶收到兩封通知

**修改後**:
1. 上傳者點擊「上傳並通知」
2. 系統統一發送通知：
   - **客戶**收到「新的影片清單已上傳」✅
   - **內部人員**（管理員+上傳者，排除本次上傳者）收到「新影片清單已上線」✅
3. **結果**: 
   - 客戶只收到 1 封通知 ✅
   - 內部人員只收到 1 封通知 ✅
   - 可追蹤統計 ✅

### 補發功能

**新增功能**:
- ✅ Admin 與 Uploader 可在「上傳管理」頁面補發通知
- ✅ Uploader 可在「上傳者儀表板」補發通知
- ✅ **Admin 可在「郵件通知管理」頁面的「新影片清單上傳」卡片補發通知**
- ✅ 支援選擇當月或前一個月的批次
- ✅ 顯示通知統計（客戶數、內部人員數）
- ✅ 記錄到 Operation Logs

### 預設收件人修正

**修改前**:
- 顯示硬編碼的 `lucas@fas.com.tw` ❌
- `batch_uploaded` 顯示所有使用者，導致客戶收到兩封信 ❌

**修改後**:
- 動態從 `profiles` 表查詢 `role='admin'` 的使用者 ✅
- 若無管理員，回退到 `ADMIN_EMAIL` 環境變數 ✅
- 說明文案更新為「所有系統管理員（依使用者資料）」✅
- **`batch_uploaded` 只顯示管理員與上傳者（不含客戶，避免重複通知）** ✅
- 實際寄信時會排除本次上傳者本人 ✅
- 客戶會收到另一封專屬的「新的影片清單已上傳」通知 ✅

## 🧪 測試建議

### 1. 上傳通知測試（重要！）

**測試步驟**:
1. 以 Admin 或 Uploader 身份登入
2. 前往「上傳管理」頁面
3. 上傳 Excel 影片清單
4. 點擊「上傳並發送通知」
5. **檢查客戶帳號**：
   - ✅ 應該只收到 **1 封**「新的影片清單已上傳」郵件
   - ❌ 不應收到「新影片清單已上線」郵件
6. **檢查其他管理員/上傳者帳號**：
   - ✅ 應該只收到 **1 封**「新影片清單已上線」郵件
   - ❌ 不應收到「新的影片清單已上傳」郵件
7. **檢查本次上傳者**：
   - ❌ 不應收到任何通知
8. **檢查 Operation Logs**：
   - ✅ 應記錄通知統計（customersSent, internalSent）

### 2. 補發通知測試

**測試步驟（上傳管理頁）**:
1. 前往「上傳管理」頁面
2. 點擊「補發上傳通知」按鈕
3. 在 Modal 中選擇批次（預設為最新，可改選前一個月）
4. 點擊「確認發送」
5. 檢查：
   - Toast 是否顯示通知統計
   - 客戶是否收到郵件
   - Operation Logs 是否記錄 `mail.batch_uploaded.resend`

**測試步驟（上傳者儀表板）**:
1. 以 Uploader 身份登入
2. 前往「上傳者儀表板」
3. 點擊「補發上傳通知」圖示按鈕
4. 在 Modal 中選擇批次
5. 點擊「確認發送」
6. 檢查同上

### 3. 權限測試

**測試步驟**:
1. 以 Customer 身份嘗試呼叫 `/api/mail-rules/notifications/upload`
2. 預期結果：403 Forbidden
3. 以 Admin 身份呼叫：成功
4. 以 Uploader 身份呼叫：成功

### 4. 預設收件人測試

**測試步驟**:
1. 前往「郵件通知管理」頁面
2. 查看「客戶提交影片選擇」卡片
3. 檢查預設通知對象：
   - 應顯示所有 `role='admin'` 的使用者
   - 不應顯示硬編碼的 Email
4. 查看「新影片清單上傳」卡片
5. 檢查預設通知對象：
   - **應只顯示管理員與上傳者（不含客戶）**
   - 說明文案應為「預設會通知所有管理員與上傳者（排除本次上傳者本人）。客戶會收到另一封『新的影片清單已上傳』通知，無需重複設定。」
6. 點擊「補發通知」按鈕
7. 檢查：
   - Modal 是否正確開啟
   - 批次選擇器是否顯示所有批次
   - 發送後是否顯示統計資訊

## 📝 相關檔案

### 後端
- `backend/src/services/emailService.js` - 郵件服務重構
- `backend/src/routes/upload.js` - 上傳路由調整
- `backend/src/routes/mail.js` - 新增補發 API、修正預設收件人

### 前端
- `frontend/src/pages/MailManagement.jsx` - 更新說明文案
- `frontend/src/pages/UploadManagement.jsx` - 新增補發按鈕與 Modal
- `frontend/src/pages/UploaderDashboard.jsx` - 更新補發功能
- `frontend/src/lib/api.js` - 已有 `resendUploadNotification` API 呼叫

## 🎉 完成狀態

- ✅ 後端郵件服務重構（**避免客戶收到重複通知**）
  - 客戶只收到「新的影片清單已上傳」
  - 內部人員（管理員+上傳者，排除本次上傳者）只收到「新影片清單已上線」
- ✅ 新增補發通知 API 與權限
- ✅ 修正郵件管理預設收件人與說明（batch_uploaded 只顯示管理員與上傳者）
- ✅ 上傳管理頁加入補發通知按鈕
- ✅ 上傳者儀表板更新補發功能
- ✅ **郵件管理頁「新影片清單上傳」卡片加入補發通知按鈕**
- ✅ 所有檔案無 linting 錯誤
- ✅ **已修正客戶收到兩封信的問題**

## 🔄 後續建議

1. **監控通知統計**: 可在 Admin Dashboard 顯示每月通知發送統計
2. **通知歷史**: 考慮在 Operation Logs 中新增專門的通知歷史檢視
3. **批次選擇優化**: 可加入月份篩選，方便快速找到特定月份的批次
4. **通知範本管理**: 未來可考慮將郵件範本獨立管理，支援自訂內容

---

**實作者**: AI Assistant  
**審核者**: 待審核  
**部署狀態**: 待部署

