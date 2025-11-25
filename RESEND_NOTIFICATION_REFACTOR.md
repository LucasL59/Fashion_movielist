# 補發通知功能重構總結

> **實作日期**: 2025-11-25  
> **版本**: v2.2.3  
> **狀態**: ✅ 已完成

## 📋 需求說明

### 原有問題
1. 補發通知功能分散在多個頁面（上傳管理、上傳者儀表板、郵件管理）
2. 只能批次補發給所有使用者，無法針對個別使用者
3. 補發時會發送兩種郵件，容易混淆

### 新需求
1. 移除上傳管理頁面和郵件管理頁面的批次補發按鈕
2. 在郵件管理頁面新增獨立的「補發通知」卡片
3. 列出所有使用者，可針對個別使用者補發通知
4. 統一使用「新的影片清單已上傳」郵件模板

## 🔧 實作內容

### 1. 移除舊的補發按鈕

#### `frontend/src/pages/UploadManagement.jsx`
**移除內容**:
- 「補發上傳通知」按鈕（位於批次列表標題旁）
- 相關的 imports: `Mail`, `resendUploadNotification`, `Select`
- 相關的 state: `resendModalOpen`, `selectedResendBatch`, `sendingNotification`
- 相關的函式: `handleOpenResendModal`, `handleResendNotification`
- 補發通知 Modal

#### `frontend/src/pages/MailManagement.jsx`
**移除內容**:
- 「新影片清單上傳」卡片的「補發通知」按鈕
- 相關的 imports: `Send`, `resendUploadNotification`, `getBatches`
- 相關的 state: `resendModalOpen`, `batches`, `selectedResendBatch`, `sendingNotification`, `loadingBatches`
- 相關的函式: `handleOpenResendModal`, `handleResendNotification`
- 補發通知 Modal

### 2. 新增補發通知卡片

#### `frontend/src/pages/MailManagement.jsx`

**新增 imports**:
```javascript
import { Send, User, Loader } from 'lucide-react'
import { getBatches } from '../lib/api'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
```

**新增 state**:
```javascript
const [allUsers, setAllUsers] = useState([])
const [batches, setBatches] = useState([])
const [selectedBatch, setSelectedBatch] = useState('')
const [loadingUsers, setLoadingUsers] = useState(false)
const [sendingTo, setSendingTo] = useState(null) // 正在發送給哪個使用者
```

**新增函式**:
```javascript
async function loadUsersAndBatches() {
  // 載入所有使用者
  const { data: usersData } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .order('role', { ascending: true })
    .order('name', { ascending: true })
  
  setAllUsers(usersData || [])
  
  // 載入批次清單
  const batchesResponse = await getBatches()
  setBatches(batchesResponse.data || [])
  
  // 預設選擇最新批次
  if (batchesResponse.data && batchesResponse.data.length > 0) {
    setSelectedBatch(batchesResponse.data[0].id)
  }
}

async function handleResendToUser(userId) {
  const user = allUsers.find(u => u.id === userId)
  const batch = batches.find(b => b.id === selectedBatch)
  
  // 呼叫後端 API 發送單一使用者通知
  await api.post('/api/mail-rules/notifications/resend-to-user', {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    batchId: batch.id,
    batchName: batch.name
  })
  
  showToast(`已成功發送通知給 ${user.name}`, 'success')
}
```

**新增 UI 卡片**:
- 位置：在「每月上傳提醒」之後、郵件規則之前
- 包含：
  - 批次選擇器（下拉選單）
  - 所有使用者列表（可滾動）
  - 每個使用者旁邊有「補發通知」按鈕
  - 使用者依角色分類顯示（管理員、上傳者、客戶）
  - 顯示使用者名稱、Email、角色標籤

### 3. 新增後端 API

#### `backend/src/routes/mail.js`

**新增端點**: `POST /api/mail-rules/notifications/resend-to-user`

**權限**: `requireAuth` + `requireAdmin`

**功能**:
- 接收參數：`userId`, `userEmail`, `userName`, `batchId`, `batchName`
- 發送「新的影片清單已上傳」郵件給指定使用者
- 記錄操作到 operation logs（action: `mail.resend_to_user`）
- 回傳成功訊息

**實作重點**:
```javascript
router.post('/notifications/resend-to-user', requireAuth, requireAdmin, async (req, res) => {
  const { userId, userEmail, userName, batchId, batchName } = req.body;
  
  // 發送「新的影片清單已上傳」郵件
  const emailBody = `...` // 使用客戶通知模板
  
  await sendEmail({
    to: userEmail,
    subject: `新的影片清單已上傳 - ${batchName}`,
    body: emailBody
  });
  
  // 記錄操作
  await recordOperationLog({
    req,
    action: 'mail.resend_to_user',
    resourceType: 'batch',
    resourceId: batchId,
    description: `${req.authUserProfile?.name} 補發批次「${batchName}」的通知給 ${userName}`,
    metadata: { batchId, batchName, targetUserId: userId, targetUserEmail: userEmail, targetUserName: userName }
  });
  
  res.json({ success: true, message: '通知已成功發送' });
});
```

## 🎯 使用流程

### 補發通知給個別使用者

1. 以 Admin 身份登入
2. 前往「郵件通知管理」頁面
3. 找到「補發上傳通知」卡片
4. 在「選擇批次」下拉選單中選擇要補發的批次
5. 在使用者列表中找到目標使用者
6. 點擊該使用者旁邊的「補發通知」按鈕
7. 系統會發送「新的影片清單已上傳」郵件給該使用者
8. 顯示成功訊息：「已成功發送通知給 [使用者名稱]」

### 使用者列表說明

使用者列表會顯示所有帳號，包含：
- **系統管理員**（紫色標籤）
- **上傳者**（藍色標籤）
- **客戶**（綠色標籤）

每個使用者顯示：
- 使用者名稱
- Email
- 角色標籤
- 補發通知按鈕

## 📊 與原有功能的差異

| 項目 | 原有功能 | 新功能 |
|------|---------|--------|
| 補發位置 | 上傳管理、上傳者儀表板、郵件管理 | 僅郵件管理 |
| 補發對象 | 批次發送給所有使用者 | 針對個別使用者 |
| 郵件類型 | 兩種（客戶+內部） | 統一使用客戶模板 |
| 權限 | Admin + Uploader | 僅 Admin |
| 操作記錄 | `mail.batch_uploaded.resend` | `mail.resend_to_user` |

## 🧪 測試建議

### 1. 基本功能測試

**測試步驟**:
1. 以 Admin 身份登入
2. 前往「郵件通知管理」頁面
3. 確認「補發上傳通知」卡片顯示正常
4. 確認批次選擇器有選項
5. 確認使用者列表顯示所有使用者
6. 選擇一個批次
7. 點擊任一使用者的「補發通知」按鈕
8. 檢查：
   - Toast 顯示成功訊息
   - 該使用者收到「新的影片清單已上傳」郵件
   - Operation Logs 記錄 `mail.resend_to_user`

### 2. 權限測試

**測試步驟**:
1. 以 Uploader 或 Customer 身份嘗試呼叫 API
2. 預期結果：403 Forbidden
3. 確認只有 Admin 可以看到並使用補發功能

### 3. 使用者列表測試

**測試步驟**:
1. 確認使用者列表包含所有角色
2. 確認角色標籤顏色正確：
   - 管理員：紫色
   - 上傳者：藍色
   - 客戶：綠色
3. 確認使用者依角色排序

### 4. 批次選擇測試

**測試步驟**:
1. 確認批次選擇器顯示所有批次
2. 確認批次依日期排序（最新在前）
3. 確認預設選擇最新批次
4. 切換批次後補發通知，確認使用正確的批次名稱

## 📝 相關檔案

### 前端
- `frontend/src/pages/UploadManagement.jsx` - 移除補發按鈕
- `frontend/src/pages/MailManagement.jsx` - 新增補發通知卡片

### 後端
- `backend/src/routes/mail.js` - 新增補發 API 端點

## 🎉 完成狀態

- ✅ 移除上傳管理頁面的補發按鈕
- ✅ 移除郵件管理頁面「新影片清單上傳」卡片的補發按鈕
- ✅ 在郵件管理頁面新增獨立的「補發通知」卡片
- ✅ 列出所有使用者（管理員、上傳者、客戶）
- ✅ 支援針對個別使用者補發通知
- ✅ 統一使用「新的影片清單已上傳」郵件模板
- ✅ 新增後端 API 端點 `/api/mail-rules/notifications/resend-to-user`
- ✅ 記錄操作到 Operation Logs
- ✅ 修正後端缺少 `sendEmail` import 的錯誤
- ✅ 優化 UI：使用者資料水平排列，減少容器高度
- ✅ 所有檔案無 linting 錯誤

## 🐛 問題修正

### 問題 1: 500 Internal Server Error
**原因**: 後端 `mail.js` 缺少 `sendEmail` 函式的 import  
**修正**: 添加 `import { sendEmail } from '../config/graphClient.js'`

### 問題 2: UI 容器過高
**原因**: 使用者資料採用三列垂直排列（名稱、Email、角色標籤）  
**修正**: 
- 改為水平排列：名稱 | Email | 角色標籤 | 按鈕
- 減少 padding 和 icon 大小
- 調整最大高度從 `max-h-96` 到 `max-h-80`
- Email 使用 `truncate` 避免過長
- 角色標籤文字簡化（系統管理員 → 管理員）

## 🔄 後續建議

1. **批次補發功能**: 如果需要一次補發給多個使用者，可以新增「全選」功能
2. **補發歷史**: 可以在 Operation Logs 中新增專門的補發歷史檢視
3. **郵件模板選擇**: 未來可考慮讓管理員選擇要發送的郵件模板
4. **發送統計**: 可以顯示每個批次已補發給哪些使用者

---

**實作者**: AI Assistant  
**審核者**: 待審核  
**部署狀態**: 待部署

