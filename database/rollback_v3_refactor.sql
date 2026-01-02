-- ==========================================
-- 影片選擇系統重構 - 回滾腳本 v3.0
-- ==========================================
-- 
-- 警告：執行此腳本將回滾到舊的資料庫結構
-- 請確保您真的需要回滾，並已備份新系統的資料
-- 
-- ==========================================

-- ==========================================
-- 第一部分：刪除新建立的觸發器和函數
-- ==========================================

-- 刪除觸發器
DROP TRIGGER IF EXISTS trigger_update_batch_is_latest ON public.batches;

-- 刪除函數
DROP FUNCTION IF EXISTS update_batch_is_latest();
DROP FUNCTION IF EXISTS calculate_video_diff(UUID[], UUID[]);
DROP FUNCTION IF EXISTS get_customer_video_ids(UUID);

-- ==========================================
-- 第二部分：刪除新建立的視圖
-- ==========================================

DROP VIEW IF EXISTS public.customer_list_summary;
DROP VIEW IF EXISTS public.monthly_batch_summary;

-- ==========================================
-- 第三部分：刪除新建立的表
-- ==========================================

-- 刪除 selection_history 表
DROP TABLE IF EXISTS public.selection_history CASCADE;

-- 刪除 customer_current_list 表
DROP TABLE IF EXISTS public.customer_current_list CASCADE;

-- ==========================================
-- 第四部分：還原 batches 表的變更
-- ==========================================

-- 刪除新增的索引
DROP INDEX IF EXISTS unique_active_batch_per_month;
DROP INDEX IF EXISTS idx_batches_month;

-- 移除新增的欄位
ALTER TABLE public.batches 
DROP COLUMN IF EXISTS is_latest;

-- 注意：month 欄位在舊版本中已存在，所以不刪除

-- ==========================================
-- 完成回滾
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '回滾完成！';
  RAISE NOTICE '注意：舊的 selections 表仍然保留';
  RAISE NOTICE '您可以繼續使用舊系統';
END $$;
