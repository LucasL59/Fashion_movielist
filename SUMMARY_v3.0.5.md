# v3.0.5 修正總結

## 🎯 問題

客戶帳號在進行以下操作時出現 401 錯誤：
- 載入影片清單
- 提交影片選擇

## 🔍 根本原因

前端 `api.js` 中的 `getAccessToken()` 函數使用了**不可靠的方式**從 localStorage 獲取 Supabase access token，導致認證失敗。

## ✅ 解決方案

修改 `frontend/src/lib/api.js`，改用 **Supabase SDK 的 `getSession()` 方法**直接獲取最新的 access token。

### 修正前（有問題）

```javascript
function getAccessToken() {
  const authKey = Object.keys(localStorage).find((key) => key.includes('auth-token'))
  const raw = localStorage.getItem(authKey)
  // ... 複雜的解析邏輯
}
```

### 修正後（正確）

```javascript
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
```

## 📋 修改檔案

✅ `frontend/src/lib/api.js` - 唯一需要修改的檔案

## 🚀 部署步驟

```bash
# 1. Git 提交
git add frontend/src/lib/api.js FIX_401_AUTH_ERRORS.md QUICK_DEPLOY_FIX.md README.md
git commit -m "fix(auth): 修正 API token 獲取方式，解決 401 錯誤"
git push origin main

# 2. Vercel 會自動部署（1-3 分鐘）

# 3. 測試
# - 客戶登入
# - 進入影片選擇頁面
# - 選擇並提交影片
# - 確認 Render LOG 不再出現 401 錯誤
```

## 📚 相關文檔

- [FIX_401_AUTH_ERRORS.md](FIX_401_AUTH_ERRORS.md) - 詳細技術說明
- [QUICK_DEPLOY_FIX.md](QUICK_DEPLOY_FIX.md) - 快速部署指南

## ✅ 預期結果

### 修正前（LOG）
```
::1 - - [05/Jan/2026:02:02:46 +0000] "GET /api/customer-list/... HTTP/1.1" 401 55
::1 - - [05/Jan/2026:02:03:52 +0000] "POST /api/customer-list/.../update HTTP/1.1" 401 55
```

### 修正後（LOG）
```
🔍 [customer-list] 查詢客戶清單: ...
✅ [customer-list] 找到 15 筆記錄
::1 - - [05/Jan/2026:10:00:00 +0000] "GET /api/customer-list/... HTTP/1.1" 200 5432

📝 [customer-list] 更新客戶清單: ...
✅ [customer-list] 已新增 3 部影片
::1 - - [05/Jan/2026:10:00:10 +0000] "POST /api/customer-list/.../update HTTP/1.1" 200 123
```

## 🎉 完成

修正完成後，客戶可以：
- ✅ 正常載入自己的影片清單
- ✅ 選擇或取消影片
- ✅ 提交選擇並發送通知
- ✅ 不再看到任何 401 錯誤

---

**版本**：v3.0.5  
**日期**：2026-01-05  
**狀態**：✅ 已修正，待部署
