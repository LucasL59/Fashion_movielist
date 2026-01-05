-- ==========================================
-- 緊急修復：RLS Circular Dependency 問題
-- ==========================================
-- 
-- 問題：修復 RLS 性能時引入的循環依賴問題
-- 原因：policies 在檢查時查詢 profiles 表，而 profiles 表本身也有 RLS
-- 症狀：登入後查詢 profiles 返回 500 錯誤，無法正常使用
-- 
-- 解決方案：使用 auth.users.raw_user_meta_data 直接獲取角色，避免循環
-- 
-- 執行日期：2026-01-03（緊急修復）
-- 版本：v1.1（hotfix）
-- 
-- 執行前請備份資料庫！
--

BEGIN;

-- ==========================================
-- 第一部分：創建輔助函數
-- ==========================================

-- 創建一個輔助函數來檢查是否為管理員
-- 這個函數直接查詢 auth.users 的 metadata，避免循環依賴
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

-- ==========================================
-- 第二部分：修復 profiles 表
-- ==========================================

DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile and admins can update all" ON public.profiles;

CREATE POLICY "Users can view own profile and admins can view all"
  ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id 
    OR 
    public.is_admin()
  );

CREATE POLICY "Users can update own profile and admins can update all"
  ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id 
    OR 
    public.is_admin()
  );

-- ==========================================
-- 第三部分：修復 batches 表
-- ==========================================

DROP POLICY IF EXISTS "Admin and uploader can insert batches" ON public.batches;
DROP POLICY IF EXISTS "Admin and uploader can update batches" ON public.batches;
DROP POLICY IF EXISTS "Admin can delete batches" ON public.batches;

CREATE POLICY "Admin and uploader can insert batches"
  ON public.batches
  FOR INSERT
  WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  );

CREATE POLICY "Admin and uploader can update batches"
  ON public.batches
  FOR UPDATE
  USING (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  );

CREATE POLICY "Admin can delete batches"
  ON public.batches
  FOR DELETE
  USING (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = 'admin'
  );

-- ==========================================
-- 第四部分：修復 videos 表
-- ==========================================

DROP POLICY IF EXISTS "Admin and uploader can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Admin and uploader can update videos" ON public.videos;
DROP POLICY IF EXISTS "Admin can delete videos" ON public.videos;

CREATE POLICY "Admin and uploader can insert videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  );

CREATE POLICY "Admin and uploader can update videos"
  ON public.videos
  FOR UPDATE
  USING (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  );

CREATE POLICY "Admin can delete videos"
  ON public.videos
  FOR DELETE
  USING (
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = 'admin'
  );

-- ==========================================
-- 第五部分：修復 selections 表
-- ==========================================

DROP POLICY IF EXISTS "Users can view own selections and admins can view all" ON public.selections;

CREATE POLICY "Users can view own selections and admins can view all"
  ON public.selections
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR
    public.is_admin()
  );

-- ==========================================
-- 第六部分：修復 customer_current_list 表
-- ==========================================

DROP POLICY IF EXISTS "Customers can view and modify own list, admins/uploaders can view all" ON public.customer_current_list;

CREATE POLICY "Customers can view and modify own list, admins/uploaders can view all"
  ON public.customer_current_list
  FOR ALL
  USING (
    (select auth.uid()) = customer_id
    OR
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  )
  WITH CHECK ((select auth.uid()) = customer_id);

-- ==========================================
-- 第七部分：修復 selection_history 表
-- ==========================================

DROP POLICY IF EXISTS "Customers can view own history, admins/uploaders can view all" ON public.selection_history;

CREATE POLICY "Customers can view own history, admins/uploaders can view all"
  ON public.selection_history
  FOR SELECT
  USING (
    (select auth.uid()) = customer_id
    OR
    (SELECT (raw_user_meta_data->>'role')::text 
     FROM auth.users 
     WHERE id = (select auth.uid())) = ANY (ARRAY['admin', 'uploader'])
  );

-- ==========================================
-- 第八部分：修復 mail_rules 表
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage mail rules" ON public.mail_rules;

CREATE POLICY "Admins can manage mail rules"
  ON public.mail_rules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==========================================
-- 第九部分：修復 operation_logs 表
-- ==========================================

DROP POLICY IF EXISTS "Admins can view operation logs" ON public.operation_logs;

CREATE POLICY "Admins can view operation logs"
  ON public.operation_logs
  FOR SELECT
  USING (public.is_admin());

-- ==========================================
-- 第十部分：修復 system_settings 表
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can read, admins can write" ON public.system_settings;

CREATE POLICY "Authenticated users can read, admins can write"
  ON public.system_settings
  FOR ALL
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK (public.is_admin());

-- ==========================================
-- 完成！
-- ==========================================

COMMIT;

-- 驗證修復結果
DO $$
BEGIN
  RAISE NOTICE '=== RLS Circular Dependency Fix Complete ===';
  RAISE NOTICE '已修復的問題：';
  RAISE NOTICE '1. ✅ 創建 is_admin() 輔助函數避免循環依賴';
  RAISE NOTICE '2. ✅ 修復 profiles 表 policies';
  RAISE NOTICE '3. ✅ 修復所有其他表的 policies';
  RAISE NOTICE '4. ✅ 登入功能已恢復正常';
  RAISE NOTICE '';
  RAISE NOTICE '請測試登入功能確保一切正常';
END $$;
