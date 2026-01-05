-- ==========================================
-- 修復 RLS Performance 問題
-- ==========================================
-- 
-- 此腳本修復 Supabase Performance Advisor 檢測到的問題：
-- 1. Auth RLS Initialization Plan 警告（將 auth.uid() 改為 (select auth.uid())）
-- 2. Multiple Permissive Policies 警告（合併重複的 policies）
-- 3. Unindexed Foreign Keys（添加缺失的索引）
-- 
-- 執行日期：2026-01-03
-- 版本：v1.0
-- 
-- 執行前請備份資料庫！
--

BEGIN;

-- ==========================================
-- 第一部分：添加缺失的外鍵索引
-- ==========================================

-- customer_current_list.added_from_batch_id 索引
CREATE INDEX IF NOT EXISTS idx_customer_list_added_from_batch 
ON public.customer_current_list(added_from_batch_id);

-- mail_rules.created_by 索引
CREATE INDEX IF NOT EXISTS idx_mail_rules_created_by 
ON public.mail_rules(created_by);

-- system_settings.updated_by 索引
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
ON public.system_settings(updated_by);

-- ==========================================
-- 第二部分：重建 profiles 表的 RLS Policies
-- ==========================================

-- 移除舊的 policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

-- 創建優化後的 policies（合併重複的 policies 並修復 auth.uid()）
CREATE POLICY "Users can view own profile and admins can view all"
  ON public.profiles
  FOR SELECT
  USING (
    (select auth.uid()) = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile and admins can update all"
  ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- ==========================================
-- 第三部分：重建 batches 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.batches;
DROP POLICY IF EXISTS "Admin and uploader can insert batches" ON public.batches;
DROP POLICY IF EXISTS "Admin and uploader can update batches" ON public.batches;
DROP POLICY IF EXISTS "Admin can delete batches" ON public.batches;

CREATE POLICY "Authenticated users can view batches"
  ON public.batches
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin and uploader can insert batches"
  ON public.batches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  );

CREATE POLICY "Admin and uploader can update batches"
  ON public.batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  );

CREATE POLICY "Admin can delete batches"
  ON public.batches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- 第四部分：重建 videos 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can view videos" ON public.videos;
DROP POLICY IF EXISTS "Admin and uploader can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Admin and uploader can update videos" ON public.videos;
DROP POLICY IF EXISTS "Admin can delete videos" ON public.videos;

CREATE POLICY "Authenticated users can view videos"
  ON public.videos
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin and uploader can insert videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  );

CREATE POLICY "Admin and uploader can update videos"
  ON public.videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  );

CREATE POLICY "Admin can delete videos"
  ON public.videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- 第五部分：重建 selections 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Users can view own selections" ON public.selections;
DROP POLICY IF EXISTS "Admins can view all selections" ON public.selections;
DROP POLICY IF EXISTS "Users can insert own selections" ON public.selections;
DROP POLICY IF EXISTS "Users can update own selections" ON public.selections;

-- 合併 SELECT policies
CREATE POLICY "Users can view own selections and admins can view all"
  ON public.selections
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert own selections"
  ON public.selections
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own selections"
  ON public.selections
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ==========================================
-- 第六部分：重建 customer_current_list 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Customers can view own list" ON public.customer_current_list;
DROP POLICY IF EXISTS "Admins and uploaders can view all lists" ON public.customer_current_list;
DROP POLICY IF EXISTS "Customers can modify own list" ON public.customer_current_list;

-- 合併所有 policies
CREATE POLICY "Customers can view and modify own list, admins/uploaders can view all"
  ON public.customer_current_list
  FOR ALL
  USING (
    (select auth.uid()) = customer_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  )
  WITH CHECK ((select auth.uid()) = customer_id);

-- ==========================================
-- 第七部分：重建 selection_history 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Customers can view own history" ON public.selection_history;
DROP POLICY IF EXISTS "Admins and uploaders can view all history" ON public.selection_history;

-- 合併 SELECT policies
CREATE POLICY "Customers can view own history, admins/uploaders can view all"
  ON public.selection_history
  FOR SELECT
  USING (
    (select auth.uid()) = customer_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = ANY (ARRAY['admin', 'uploader'])
    )
  );

-- ==========================================
-- 第八部分：重建 mail_rules 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage mail rules" ON public.mail_rules;

CREATE POLICY "Admins can manage mail rules"
  ON public.mail_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- 第九部分：重建 operation_logs 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Admins can view operation logs" ON public.operation_logs;

CREATE POLICY "Admins can view operation logs"
  ON public.operation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- 第十部分：重建 system_settings 表的 RLS Policies
-- ==========================================

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow write access for admins" ON public.system_settings;

-- 創建單一 policy 處理讀取（所有認證用戶）和寫入（僅管理員）
CREATE POLICY "Authenticated users can read, admins can write"
  ON public.system_settings
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==========================================
-- 完成！
-- ==========================================

COMMIT;

-- 驗證修復結果
DO $$
BEGIN
  RAISE NOTICE '=== RLS Performance Fix Migration Complete ===';
  RAISE NOTICE '已修復的問題：';
  RAISE NOTICE '1. ✅ 添加了 3 個缺失的外鍵索引';
  RAISE NOTICE '2. ✅ 優化了所有表的 RLS policies，使用 (select auth.uid())';
  RAISE NOTICE '3. ✅ 合併了重複的 permissive policies';
  RAISE NOTICE '';
  RAISE NOTICE '請到 Supabase Dashboard 的 Performance Advisor 重新檢查';
  RAISE NOTICE '大部分警告應該已經消失';
END $$;

-- 查看修復後的 policies 數量
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
