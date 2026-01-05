# 🚨 緊急修復：RLS 循環依賴問題

**問題嚴重性**：🔴 **CRITICAL** - 系統無法登入  
**修復時間**：2026-01-03  
**影響範圍**：所有用戶  
**修復狀態**：✅ **已修復**

---

## 📋 問題概述

在修復 RLS 性能問題後（v3.0.4），系統出現**循環依賴**問題，導致：
- ❌ 登入後查詢 profiles 表返回 **500 錯誤**
- ❌ 用戶無法正常使用系統
- ❌ 所有功能都被阻斷

---

## 🔍 根本原因分析

### 問題代碼（錯誤的 Policy）

```sql
-- ❌ 錯誤：在 profiles 表的 policy 中查詢 profiles 表本身
CREATE POLICY "Users can view own profile and admins can view all"
  ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles p  -- ⚠️ 這裡造成循環！
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );
```

### 循環依賴流程

1. 用戶登入後查詢 `profiles` 表
2. RLS policy 需要檢查用戶是否為管理員
3. 要檢查是否為管理員，需要查詢 `profiles` 表（EXISTS 子查詢）
4. 但查詢 `profiles` 表又需要通過 RLS policy...
5. **無限循環** → **500 錯誤** ❌

---

## ✅ 修復方案

### 核心思路

**不查詢 profiles 表，而是直接從 auth.users 讀取角色資訊**

### 修復代碼

```sql
-- ✅ 正確：創建輔助函數，直接查詢 auth.users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (raw_user_meta_data->>'role')::text = 'admin' 
     FROM auth.users 
     WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ 使用輔助函數，避免循環
CREATE POLICY "Users can view own profile and admins can view all"
  ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id 
    OR 
    public.is_admin()  -- ✅ 不會造成循環！
  );
```

---

## 🔧 已修復的表

以下所有表的 policies 已修復：

| 表名 | 修復的 Policies | 狀態 |
|------|----------------|------|
| `profiles` | SELECT, UPDATE | ✅ |
| `batches` | INSERT, UPDATE, DELETE | ✅ |
| `videos` | INSERT, UPDATE, DELETE | ✅ |
| `selections` | SELECT | ✅ |
| `customer_current_list` | ALL | ✅ |
| `selection_history` | SELECT | ✅ |
| `mail_rules` | ALL | ✅ |
| `operation_logs` | SELECT | ✅ |
| `system_settings` | ALL | ✅ |

---

## 📊 修復前後對比

### 修復前（錯誤）

```sql
-- ❌ 會造成循環依賴
EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin'
)
```

### 修復後（正確）

```sql
-- ✅ 方法 1：使用輔助函數
public.is_admin()

-- ✅ 方法 2：直接查詢 auth.users
(SELECT (raw_user_meta_data->>'role')::text 
 FROM auth.users 
 WHERE id = auth.uid()) = 'admin'
```

---

## 🧪 驗證結果

### SQL 測試
```sql
-- ✅ 查詢成功，無錯誤
SELECT id, name, email, role 
FROM public.profiles 
WHERE id = '3d3a9f09-01a9-4cd5-9149-2fcb16299b4a';

-- 結果
-- id: 3d3a9f09-01a9-4cd5-9149-2fcb16299b4a
-- name: FASsupport
-- email: support@fas.com.tw
-- role: admin
```

### 功能測試
- ✅ 登入功能恢復正常
- ✅ 查詢 profiles 無錯誤
- ✅ 所有權限檢查正常工作

---

## 📂 相關文件

| 文件 | 說明 |
|------|------|
| [migration_fix_rls_circular_dependency.sql](database/migration_fix_rls_circular_dependency.sql) | 完整修復腳本 |
| [RLS_PERFORMANCE_FIX_SUMMARY.md](RLS_PERFORMANCE_FIX_SUMMARY.md) | 原始性能優化文檔 |
| [EMERGENCY_FIX_CIRCULAR_DEPENDENCY.md](EMERGENCY_FIX_CIRCULAR_DEPENDENCY.md)（本文件） | 緊急修復說明 |

---

## 📝 學到的教訓

### ❌ 不要做的事

1. **不要在 RLS policy 中查詢被保護的表本身**
   - 這會造成循環依賴
   - 導致 500 錯誤

2. **不要假設所有優化都是安全的**
   - 必須充分測試
   - 特別是涉及安全和權限的修改

### ✅ 應該做的事

1. **使用輔助函數封裝複雜邏輯**
   - `is_admin()` 函數避免循環
   - 更易維護和測試

2. **直接查詢 auth.users 而非 public 表**
   - `auth.users` 不受 RLS 影響
   - 更安全、更快速

3. **立即測試關鍵功能**
   - 特別是登入/認證
   - 在部署前必須驗證

---

## 🚀 後續行動

### 立即執行（已完成）
- ✅ 識別問題根源
- ✅ 創建修復腳本
- ✅ 應用修復
- ✅ 驗證修復結果

### 短期（建議）
- ⚪ 在測試環境重現問題
- ⚪ 建立自動化測試防止類似問題
- ⚪ 文檔化 RLS policy 最佳實踐

### 長期（持續）
- ⚪ 定期檢查 RLS policies
- ⚪ 監控 500 錯誤
- ⚪ 建立完善的測試流程

---

## ⚠️ 重要提醒

### 對於未來的 RLS Policy 修改

1. **絕對不要**在 policy 中查詢被保護的表本身
2. **優先使用** `auth.users.raw_user_meta_data` 獲取角色
3. **創建輔助函數**封裝複雜的權限檢查
4. **充分測試**所有修改，特別是登入流程

### RLS Policy 最佳實踐

```sql
-- ✅ 好的做法：使用輔助函數
CREATE FUNCTION check_role(role_name text) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT (raw_user_meta_data->>'role')::text = role_name
          FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ 好的做法：直接查詢 auth.users
USING (
  (SELECT (raw_user_meta_data->>'role')::text 
   FROM auth.users 
   WHERE id = auth.uid()) = 'admin'
)

-- ❌ 壞的做法：查詢被保護的表
USING (
  EXISTS (SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin')
)
```

---

## 📞 技術支援

如有任何問題：
1. 查看本文檔的修復腳本
2. 參考 RLS 最佳實踐
3. 聯繫系統管理員

---

**修復完成時間**：2026-01-03  
**系統狀態**：✅ **正常運行**  
**下次檢查**：定期監控錯誤日誌

---

## 🎯 總結

- **問題**：RLS policy 循環依賴導致無法登入
- **原因**：在 profiles policy 中查詢 profiles 表本身
- **解決**：使用輔助函數直接查詢 auth.users
- **結果**：系統恢復正常，登入功能完全正常
- **預防**：建立 RLS policy 最佳實踐，避免類似問題

**系統現已完全恢復正常運行！** ✅
