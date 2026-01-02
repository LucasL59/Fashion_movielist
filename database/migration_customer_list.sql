-- ==========================================
-- 累積影片清單系統 - 資料庫遷移腳本
-- ==========================================
-- 
-- 此腳本用於將系統從批次綁定模式遷移到客戶累積清單模式
-- 
-- 執行方式：
-- 1. 在 Supabase Dashboard 中開啟 SQL Editor
-- 2. 複製並貼上此腳本
-- 3. 執行腳本
--
-- 注意：此遷移是向後兼容的，不會刪除現有資料

-- ==========================================
-- 1. 為 batches 表新增月份相關欄位
-- ==========================================

-- 新增 month 欄位（YYYY-MM 格式）
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS month TEXT;

-- 新增 is_latest 欄位（標記是否為該月最新批次）
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- 為 month 欄位建立索引
CREATE INDEX IF NOT EXISTS idx_batches_month 
ON public.batches(month);

-- 為 month + status 建立複合索引（用於快速查詢活躍月份）
CREATE INDEX IF NOT EXISTS idx_batches_month_status 
ON public.batches(month, status) 
WHERE status = 'active';

-- 確保每個月只有一個 active + is_latest 批次
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_batch_per_month 
ON public.batches (month) 
WHERE (status = 'active' AND is_latest = true);

-- ==========================================
-- 2. 創建客戶累積清單表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.customer_video_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_from_month TEXT,  -- 記錄這部影片是從哪個月份的清單添加的
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保每個客戶不會重複添加同一部影片
  CONSTRAINT unique_customer_video UNIQUE(customer_id, video_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_customer_video_list_customer 
ON public.customer_video_list(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_video_list_video 
ON public.customer_video_list(video_id);

CREATE INDEX IF NOT EXISTS idx_customer_video_list_month 
ON public.customer_video_list(added_from_month);

-- 啟用 RLS
ALTER TABLE public.customer_video_list ENABLE ROW LEVEL SECURITY;

-- RLS 政策：客戶可以查看自己的清單
CREATE POLICY "Customers can view own list"
  ON public.customer_video_list
  FOR SELECT
  USING (
    auth.uid() = customer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS 政策：客戶可以新增到自己的清單
CREATE POLICY "Customers can insert to own list"
  ON public.customer_video_list
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- RLS 政策：客戶可以從自己的清單中移除
CREATE POLICY "Customers can delete from own list"
  ON public.customer_video_list
  FOR DELETE
  USING (auth.uid() = customer_id);

-- RLS 政策：管理員可以查看所有清單
CREATE POLICY "Admins can view all lists"
  ON public.customer_video_list
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 3. 創建選擇歷史表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.selection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_ids UUID[] NOT NULL DEFAULT '{}',  -- 快照：所有影片 ID
  added_videos JSONB DEFAULT '[]'::jsonb,  -- 本次新增的影片詳情
  removed_videos JSONB DEFAULT '[]'::jsonb,  -- 本次移除的影片詳情
  total_count INTEGER NOT NULL DEFAULT 0,  -- 總影片數
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_selection_history_customer 
ON public.selection_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_selection_history_created 
ON public.selection_history(created_at DESC);

-- 啟用 RLS
ALTER TABLE public.selection_history ENABLE ROW LEVEL SECURITY;

-- RLS 政策：客戶可以查看自己的歷史
CREATE POLICY "Customers can view own history"
  ON public.selection_history
  FOR SELECT
  USING (
    auth.uid() = customer_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS 政策：客戶可以新增自己的歷史記錄
CREATE POLICY "Customers can insert own history"
  ON public.selection_history
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- RLS 政策：管理員可以查看所有歷史
CREATE POLICY "Admins can view all history"
  ON public.selection_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 4. 資料遷移：從 selections 遷移到 customer_video_list
-- ==========================================

-- 將現有的 selections 資料遷移到 customer_video_list
-- 注意：這個遷移腳本會將每個客戶最新的選擇作為其累積清單的起點

DO $$
DECLARE
  selection_record RECORD;
  video_id_item UUID;
BEGIN
  -- 遍歷所有最新的 selections 記錄
  FOR selection_record IN 
    SELECT DISTINCT ON (user_id) 
      user_id, 
      video_ids, 
      batch_id,
      created_at
    FROM public.selections
    ORDER BY user_id, created_at DESC
  LOOP
    -- 遍歷該客戶選擇的所有影片
    FOREACH video_id_item IN ARRAY selection_record.video_ids
    LOOP
      -- 插入到 customer_video_list（如果不存在）
      INSERT INTO public.customer_video_list (
        customer_id, 
        video_id, 
        added_from_month,
        added_at
      )
      SELECT 
        selection_record.user_id,
        video_id_item,
        b.month,
        selection_record.created_at
      FROM public.batches b
      WHERE b.id = selection_record.batch_id
      ON CONFLICT (customer_id, video_id) DO NOTHING;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '資料遷移完成：已從 selections 表遷移資料到 customer_video_list';
END $$;

-- ==========================================
-- 5. 推斷並填充 batches.month 欄位
-- ==========================================

-- 從批次名稱中提取月份資訊
-- 支援格式：「2025-10 影片清單」、「202510影片清單」、「10月影片清單」等

DO $$
DECLARE
  batch_record RECORD;
  extracted_month TEXT;
BEGIN
  FOR batch_record IN 
    SELECT id, name, created_at 
    FROM public.batches 
    WHERE month IS NULL
  LOOP
    extracted_month := NULL;
    
    -- 嘗試匹配 YYYY-MM 格式（例如：2025-10）
    IF batch_record.name ~ '\d{4}-\d{2}' THEN
      extracted_month := substring(batch_record.name from '\d{4}-\d{2}');
    
    -- 嘗試匹配 YYYYMM 格式（例如：202510）
    ELSIF batch_record.name ~ '\d{6}' THEN
      extracted_month := substring(batch_record.name from '\d{6}');
      extracted_month := substring(extracted_month from 1 for 4) || '-' || substring(extracted_month from 5 for 2);
    
    -- 嘗試匹配 MM月 格式（例如：10月）
    ELSIF batch_record.name ~ '\d{1,2}月' THEN
      extracted_month := to_char(batch_record.created_at, 'YYYY-') || 
                        lpad(substring(batch_record.name from '\d{1,2}(?=月)'), 2, '0');
    
    -- 如果都無法匹配，使用 created_at 推斷月份
    ELSE
      extracted_month := to_char(batch_record.created_at, 'YYYY-MM');
    END IF;
    
    -- 更新 month 欄位
    UPDATE public.batches 
    SET month = extracted_month 
    WHERE id = batch_record.id;
  END LOOP;
  
  RAISE NOTICE '月份推斷完成：已為所有 batches 填充 month 欄位';
END $$;

-- ==========================================
-- 6. 標記每月最新的批次
-- ==========================================

-- 將所有批次的 is_latest 設為 false
UPDATE public.batches SET is_latest = false;

-- 標記每個月最新的 active 批次為 is_latest = true
WITH latest_batches AS (
  SELECT DISTINCT ON (month) 
    id, 
    month
  FROM public.batches
  WHERE status = 'active' AND month IS NOT NULL
  ORDER BY month, created_at DESC
)
UPDATE public.batches
SET is_latest = true
WHERE id IN (SELECT id FROM latest_batches);

-- ==========================================
-- 7. 驗證遷移結果
-- ==========================================

DO $$
DECLARE
  batch_count INTEGER;
  customer_list_count INTEGER;
  history_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO batch_count FROM public.batches WHERE month IS NOT NULL;
  SELECT COUNT(*) INTO customer_list_count FROM public.customer_video_list;
  SELECT COUNT(*) INTO history_count FROM public.selection_history;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '資料庫遷移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已處理的批次數量: %', batch_count;
  RAISE NOTICE '客戶累積清單記錄數: %', customer_list_count;
  RAISE NOTICE '選擇歷史記錄數: %', history_count;
  RAISE NOTICE '========================================';
END $$;
