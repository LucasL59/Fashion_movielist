# 修正 401 認證錯誤問題

> **修正日期**：2026-01-05  
> **版本**：v3.0.5  
> **狀態**：✅ 已修正，待部署

## 🔍 問題描述

根據 Render 的 LOG 記錄，客戶帳號在進行以下操作時會出現 401 Unauthorized 錯誤：

1. **載入客戶清單時**（`GET /api/customer-list/:customerId`）
2. **提交影片選擇時**（`POST /api/customer-list/:customerId/update`）
3. **記錄操作事件時**（`POST /api/operation-logs/events`）

### LOG 錯誤範例

```
2026-01-05T02:02:46.619886072Z ::1 - - [05/Jan/2026:02:02:46 +0000] "GET /api/customer-list/0bd76066-3866-4af6-8ce8-f591f999b65b HTTP/1.1" 401 55
2026-01-05T02:03:52.676138739Z ::1 - - [05/Jan/2026:02:03:52 +0000] "POST /api/customer-list/0bd76066-3866-4af6-8ce8-f591f999b65b/update HTTP/1.1" 401 55
2026-01-05T02:02:14.485417115Z ::1 - - [05/Jan/2026:02:02:14 +0000] "POST /api/operation-logs/events HTTP/1.1" 401 61
```

## 🎯 問題根源

### 核心問題：前端無法正確獲取 Supabase Access Token

在 `frontend/src/lib/api.js` 中，`getAccessToken()` 函數使用了**不可靠的方式**從 localStorage 獲取 token：

#### ❌ 修正前的程式碼（有問題）

```javascript
function getAccessToken() {
  if (typeof window === 'undefined') return null

  const authKey = Object.keys(localStorage).find((key) => key.includes('auth-token')) || 'supabase.auth.token'
  const raw = localStorage.getItem(authKey)

  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return (
      parsed?.currentSession?.access_token ||
      parsed?.session?.access_token ||
      parsed?.access_token ||
      null
    )
  } catch (error) {
    return null
  }
}
```

#### 問題分析

1. **Key 查找不可靠**：試圖查找包含 'auth-token' 的 key，但 Supabase 的實際 key 格式可能是 `sb-<project-ref>-auth-token`，不一定能匹配。
2. **資料結構假設錯誤**：假設 localStorage 中的資料結構包含 `currentSession` 或 `session` 屬性，但實際結構可能不同。
3. **無法處理 Token 刷新**：當 access token 過期時，無法自動獲取新的 token。
4. **同步操作**：在請求攔截器中同步執行，可能在 token 尚未載入時就發送請求。

### 為什麼其他 API 能正常運作？

- `GET /api/dashboard/customer/:customerId` - 200 ✅
- `GET /api/videos/months` - 200 ✅
- `GET /api/videos/by-month/:month` - 200 ✅

這些 API 能正常運作，可能是因為：
1. 在 token 已經載入後才調用
2. 或者這些端點沒有使用 `requireAuth` 中間件（但實際上 dashboard API 也需要認證）

實際上，問題是**間歇性的**。當 localStorage 中的 key 恰好能被找到時，API 就能正常運作。但當找不到或資料結構不符時，就會返回 401 錯誤。

## ✅ 解決方案

### 修正：使用 Supabase SDK 的官方方法獲取 Session

#### ✅ 修正後的程式碼（正確）

```javascript
import { supabase } from './supabase'

/**
 * 從 Supabase 獲取當前的 access token
 * 使用 Supabase SDK 的 getSession() 方法，確保獲取到最新且有效的 token
 */
async function getAccessToken() {
  if (typeof window === 'undefined') return null

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('⚠️ 獲取 Supabase session 失敗:', error.message)
      return null
    }
    
    return session?.access_token || null
  } catch (error) {
    console.error('❌ 獲取 access token 時發生錯誤:', error)
    return null
  }
}

// 請求攔截器（添加認證 token 和禁用緩存）
api.interceptors.request.use(async (config) => {
  // 從 Supabase 獲取最新的 access token
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // 禁用緩存以避免 304 Not Modified 問題
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'
  
  return config
})
```

### 修正的優點

1. **✅ 可靠性**：直接使用 Supabase SDK 的官方 API，不依賴 localStorage 的內部結構。
2. **✅ 自動刷新**：當 token 過期時，Supabase SDK 會自動刷新並返回新的 token。
3. **✅ 一致性**：與 `AuthContext.jsx` 中使用的方法一致，確保認證邏輯統一。
4. **✅ 錯誤處理**：提供清晰的錯誤訊息，便於除錯。
5. **✅ 非同步支援**：請求攔截器改為 async，確保在獲取 token 後才發送請求。

## 📝 修改檔案清單

### 前端修改

- ✅ `frontend/src/lib/api.js` - 修正 `getAccessToken()` 函數和請求攔截器

### 後端無需修改

後端的認證中間件 (`backend/src/middleware/auth.js`) 和相關路由 (`backend/src/routes/customerList.js`) 都是正確的，無需修改。

## 🧪 測試計畫

### 1. 本地測試

```bash
# 前端
cd frontend
npm run dev

# 後端
cd backend
npm run dev
```

#### 測試步驟

1. **登入測試**
   - 使用客戶帳號登入
   - 確認可以成功登入並跳轉至儀表板

2. **載入清單測試**
   - 進入「影片選擇」頁面 (`/movies`)
   - 觀察瀏覽器開發者工具的 Network 標籤
   - 確認 `GET /api/customer-list/:customerId` 返回 200
   - 確認可以看到自己的累積清單

3. **選擇影片測試**
   - 選擇或取消選擇一些影片
   - 點擊「提交選擇」按鈕
   - 確認 `POST /api/customer-list/:customerId/update` 返回 200
   - 確認 `POST /api/customer-list/:customerId/submit` 返回 200
   - 確認提交成功並收到成功訊息

4. **操作日誌測試**
   - 檢查瀏覽器開發者工具的 Network 標籤
   - 確認 `POST /api/operation-logs/events` 不再返回 401 錯誤

5. **Token 刷新測試**
   - 等待 1 小時後（或手動修改 token 過期時間）
   - 再次執行上述操作
   - 確認系統能自動獲取新的 token，不會出現 401 錯誤

### 2. 預期結果

#### ✅ 成功的 LOG

```
2026-01-05T10:00:00Z 🔍 [customer-list] 查詢客戶清單: 0bd76066-3866-4af6-8ce8-f591f999b65b
2026-01-05T10:00:00Z ✅ [customer-list] 找到 15 筆記錄
2026-01-05T10:00:00Z ::1 - - [05/Jan/2026:10:00:00 +0000] "GET /api/customer-list/0bd76066-3866-4af6-8ce8-f591f999b65b HTTP/1.1" 200 5432

2026-01-05T10:00:10Z 📝 [customer-list] 更新客戶清單: 0bd76066-3866-4af6-8ce8-f591f999b65b
2026-01-05T10:00:10Z    - 新增: 3 部
2026-01-05T10:00:10Z    - 移除: 1 部
2026-01-05T10:00:10Z ✅ [customer-list] 已新增 3 部影片
2026-01-05T10:00:10Z ✅ [customer-list] 已移除 1 部影片
2026-01-05T10:00:10Z ::1 - - [05/Jan/2026:10:00:10 +0000] "POST /api/customer-list/0bd76066-3866-4af6-8ce8-f591f999b65b/update HTTP/1.1" 200 123

2026-01-05T10:00:15Z 📤 [customer-list] 客戶提交清單: 0bd76066-3866-4af6-8ce8-f591f999b65b
2026-01-05T10:00:15Z ✅ [customer-list] 提交成功，已記錄歷史快照
2026-01-05T10:00:15Z 📧 [customer-list] 準備發送通知: 新增 3 部, 移除 1 部
2026-01-05T10:00:15Z 📧 [customer-list] 已發送通知
2026-01-05T10:00:15Z ::1 - - [05/Jan/2026:10:00:15 +0000] "POST /api/customer-list/0bd76066-3866-4af6-8ce8-f591f999b65b/submit HTTP/1.1" 200 89
```

## 🚀 部署步驟

### 1. 前端部署（Vercel）

```bash
# 確保已經 commit 並 push 到 GitHub
cd frontend
git add .
git commit -m "fix: 修正 API 認證 token 獲取方式，解決 401 錯誤"
git push origin main

# Vercel 會自動部署
# 或手動觸發部署
vercel --prod
```

### 2. 驗證部署

1. 訪問 https://fashion-movielist.vercel.app/
2. 使用客戶帳號登入
3. 進行上述測試步驟
4. 檢查 Render 的 LOG，確認不再有 401 錯誤

### 3. 監控

部署後持續監控 Render LOG，確認：
- ✅ 所有 `/api/customer-list/*` 端點返回 200
- ✅ `/api/operation-logs/events` 返回 200
- ✅ 沒有新的 401 錯誤

## 📊 影響範圍

### 受影響的功能

✅ **已修正**
- 客戶載入累積清單
- 客戶提交影片選擇
- 操作日誌記錄

### 不受影響的功能

✅ **正常運作**
- 用戶登入/登出
- 客戶儀表板
- 影片清單瀏覽
- 月份選擇器
- 管理員功能
- 上傳者功能

## 🔄 版本更新

### 更新 README.md

```markdown
## 🆕 2026-01-05 更新重點

### v3.0.5 認證系統修正 🔒

- **🐛 修正 401 錯誤**：
  - 修正前端 API token 獲取方式，使用 Supabase SDK 的 `getSession()` 方法
  - 解決客戶清單載入和提交時的認證失敗問題
  - 確保所有需要認證的 API 端點都能正確獲取和傳遞 token
  - 支援 token 自動刷新，避免過期導致的 401 錯誤
  
- **🔧 技術改進**：
  - 請求攔截器改為非同步，確保在獲取 token 後才發送請求
  - 統一認證邏輯，與 AuthContext 保持一致
  - 添加詳細的錯誤日誌，便於除錯

- **📝 文檔更新**：
  - 新增 [FIX_401_AUTH_ERRORS.md](FIX_401_AUTH_ERRORS.md) - 認證錯誤修正說明
```

## 💡 技術建議

### 1. 加強 Token 刷新機制

未來可以考慮在 `AuthContext` 中添加主動刷新 token 的機制：

```javascript
useEffect(() => {
  const refreshInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Token 還有效，檢查是否快過期
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      
      // 如果剩餘時間少於 5 分鐘，主動刷新
      if (timeUntilExpiry < 5 * 60 * 1000) {
        await supabase.auth.refreshSession()
      }
    }
  }, 60 * 1000) // 每分鐘檢查一次

  return () => clearInterval(refreshInterval)
}, [])
```

### 2. 添加 Token 過期提醒

可以在 API 攔截器中添加對 401 錯誤的處理，自動提醒用戶重新登入：

```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 過期或無效
      console.warn('⚠️ 認證失效，請重新登入')
      
      // 嘗試刷新 session
      const { error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        // 刷新失敗，導向登入頁
        window.location.href = '/login'
      } else {
        // 刷新成功，重試原請求
        return api.request(error.config)
      }
    }
    return Promise.reject(error)
  }
)
```

### 3. 監控與告警

建議在 Render 設定告警，當出現連續的 401 錯誤時發送通知：

- 設定 LOG 分析規則：監控 "401" 關鍵字
- 設定閾值：5 分鐘內超過 10 次 401 錯誤
- 設定通知管道：Email 或 Slack

## 📞 聯絡資訊

如果部署後仍有問題，請檢查：
1. Vercel 部署是否成功完成
2. 前端是否使用最新版本的程式碼
3. 瀏覽器是否清除了舊的 localStorage 資料
4. Supabase 專案是否正常運作

需要進一步協助，請提供：
- 瀏覽器開發者工具的 Network 標籤截圖
- Render 的完整 LOG
- 重現問題的詳細步驟

---

**修正完成日期**：2026-01-05  
**修正者**：AI Assistant  
**版本**：v3.0.5
