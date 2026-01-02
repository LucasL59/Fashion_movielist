-- ==========================================
-- 影片選擇系統重構 - 資料庫遷移腳本 v3.0
-- ==========================================
-- 
-- 執行此腳本前請先備份資料庫！
-- 
-- 執行順序：
-- 1. 備份現有資料
-- 2. 在 Supabase Dashboard 的 SQL Editor 中執行此腳本
-- 3. 驗證資料遷移結果
-- 4. 部署新的後端和前端代碼
--
-- ==========================================

-- ==========================================
-- 第一部分：修改 batches 表
-- ==========================================

-- 1. 新增 is_latest 欄位
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- 2. 確保所有現有批次都有 month 欄位（如果沒有的話）
-- 這個欄位在之前的版本中可能已經存在
ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS month TEXT;

-- 3. 為沒有 month 的批次填充預設值
UPDATE public.batches 
SET month = TO_CHAR(created_at, 'YYYY-MM')
WHERE month IS NULL OR month = '';

-- 4. 標記每個月份的最新批次
-- 先將所有設為 false
UPDATE public.batches SET is_latest = false;

-- 然後標記每個月份最新的那個
WITH latest_batches AS (
  SELECT DISTINCT ON (month) 
    id,
    month,
    created_at
  FROM public.batches
  WHERE status = 'active'
  ORDER BY month, created_at DESC
)
UPDATE public.batches
SET is_latest = true
WHERE id IN (SELECT id FROM latest_batches);

-- 5. 建立部分唯一索引（每月只能有一個 active 批次）
-- 注意：這會防止同一月份有多個 active 批次
-- 如果現在有衝突，需要先手動處理
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_batch_per_month 
ON public.batches (month) 
WHERE status = 'active';

-- 6. 建立 month 欄位索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_batches_month ON public.batches(month);

-- ==========================================
-- 第二部分：建立 customer_current_list 表
-- ==========================================

-- 客戶當前清單表（取代原有的 selections 邏輯）
CREATE TABLE IF NOT EXISTS public.customer_current_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_from_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  added_from_month TEXT,  -- 記錄從哪個月份的批次加入 (YYYY-MM 格式)
  
  -- 每個客戶每部影片只能有一筆記錄
  CONSTRAINT unique_customer_video UNIQUE(customer_id, video_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_customer_list_customer ON public.customer_current_list(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_list_video ON public.customer_current_list(video_id);
CREATE INDEX IF NOT EXISTS idx_customer_list_month ON public.customer_current_list(added_from_month);
CREATE INDEX IF NOT EXISTS idx_customer_list_added_at ON public.customer_current_list(added_at DESC);

-- 啟用 RLS
ALTER TABLE public.customer_current_list ENABLE ROW LEVEL SECURITY;

-- RLS 政策：客戶可以查看自己的清單
CREATE POLICY "Customers can view own list"
  ON public.customer_current_list
  FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS 政策：客戶可以修改自己的清單
CREATE POLICY "Customers can modify own list"
  ON public.customer_current_list
  FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- RLS 政策：管理員和上傳者可以查看所有清單
CREATE POLICY "Admins and uploaders can view all lists"
  ON public.customer_current_list
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'uploader')
    )
  );

-- ==========================================
-- 第三部分：建立 selection_history 表
-- ==========================================

-- 選擇歷史表（記錄每次提交的完整快照）
CREATE TABLE IF NOT EXISTS public.selection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  trigger_action TEXT DEFAULT 'submit',  -- 'submit', 'auto_save', 'admin_modify', 'legacy_import'
  
  -- 變更摘要
  total_count INTEGER NOT NULL DEFAULT 0,
  added_count INTEGER DEFAULT 0,
  removed_count INTEGER DEFAULT 0,
  
  -- 詳細資料（JSONB 儲存完整快照）
  video_ids UUID[] NOT NULL DEFAULT '{}',  -- 當時的完整清單
  added_videos JSONB DEFAULT '[]'::jsonb,  -- [{ video_id, title, month }]
  removed_videos JSONB DEFAULT '[]'::jsonb,  -- [{ video_id, title, month }]
  
  -- 元數據
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_history_customer ON public.selection_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON public.selection_history(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_history_trigger ON public.selection_history(trigger_action);

-- 啟用 RLS
ALTER TABLE public.selection_history ENABLE ROW LEVEL SECURITY;

-- RLS 政策：客戶可以查看自己的歷史
CREATE POLICY "Customers can view own history"
  ON public.selection_history
  FOR SELECT
  USING (auth.uid() = customer_id);

-- RLS 政策：管理員和上傳者可以查看所有歷史
CREATE POLICY "Admins and uploaders can view all history"
  ON public.selection_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'uploader')
    )
  );

-- ==========================================
-- 第四部分：資料遷移
-- ==========================================

-- 遷移現有的 selections 資料到 customer_current_list
-- 這會將所有歷史選擇合併到每個客戶的當前清單中
INSERT INTO public.customer_current_list (customer_id, video_id, added_from_batch_id, added_from_month, added_at)
SELECT DISTINCT ON (s.user_id, video_id)
  s.user_id AS customer_id,
  unnest(s.video_ids) AS video_id,
  s.batch_id AS added_from_batch_id,
  b.month AS added_from_month,
  s.created_at AS added_at
FROM public.selections s
JOIN public.batches b ON s.batch_id = b.id
ORDER BY s.user_id, video_id, s.created_at DESC  -- 保留最新的記錄
ON CONFLICT (customer_id, video_id) DO NOTHING;  -- 忽略重複

-- 遷移現有的 selections 到 selection_history（保留歷史記錄）
INSERT INTO public.selection_history (
  customer_id, 
  snapshot_date, 
  trigger_action, 
  total_count, 
  video_ids, 
  created_at,
  metadata
)
SELECT 
  s.user_id AS customer_id,
  s.created_at AS snapshot_date,
  'legacy_import' AS trigger_action,
  array_length(s.video_ids, 1) AS total_count,
  s.video_ids,
  s.created_at,
  jsonb_build_object(
    'batch_id', s.batch_id,
    'batch_month', b.month,
    'batch_name', b.name,
    'migrated_from', 'selections_table'
  ) AS metadata
FROM public.selections s
LEFT JOIN public.batches b ON s.batch_id = b.id
ORDER BY s.created_at ASC;

-- ==========================================
-- 第五部分：建立輔助函數
-- ==========================================

-- 函數：取得客戶當前清單的影片 ID 陣列
CREATE OR REPLACE FUNCTION get_customer_video_ids(p_customer_id UUID)
RETURNS UUID[] AS $$
  SELECT array_agg(video_id ORDER BY added_at DESC)
  FROM public.customer_current_list
  WHERE customer_id = p_customer_id;
$$ LANGUAGE sql STABLE;

-- 函數：計算兩個影片 ID 陣列的差異
CREATE OR REPLACE FUNCTION calculate_video_diff(
  p_old_ids UUID[],
  p_new_ids UUID[]
)
RETURNS TABLE(
  added UUID[],
  removed UUID[],
  kept UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    array_agg(DISTINCT new_id) FILTER (WHERE new_id IS NOT NULL AND NOT (new_id = ANY(p_old_ids))),
    array_agg(DISTINCT old_id) FILTER (WHERE old_id IS NOT NULL AND NOT (old_id = ANY(p_new_ids))),
    array_agg(DISTINCT common_id) FILTER (WHERE common_id IS NOT NULL)
  FROM (
    SELECT unnest(p_new_ids) AS new_id, NULL::uuid AS old_id, NULL::uuid AS common_id
    UNION ALL
    SELECT NULL::uuid AS new_id, unnest(p_old_ids) AS old_id, NULL::uuid AS common_id
    UNION ALL
    SELECT NULL::uuid AS new_id, NULL::uuid AS old_id, unnest(p_new_ids) AS common_id
    WHERE unnest(p_new_ids) = ANY(p_old_ids)
  ) AS diff_data;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- 第六部分：建立視圖
-- ==========================================

-- 視圖：客戶清單摘要（包含影片詳情）
CREATE OR REPLACE VIEW public.customer_list_summary AS
SELECT 
  ccl.customer_id,
  p.name AS customer_name,
  p.email AS customer_email,
  COUNT(ccl.video_id) AS total_videos,
  array_agg(DISTINCT ccl.added_from_month ORDER BY ccl.added_from_month DESC) 
    FILTER (WHERE ccl.added_from_month IS NOT NULL) AS months,
  MAX(ccl.added_at) AS last_updated_at
FROM public.customer_current_list ccl
JOIN public.profiles p ON ccl.customer_id = p.id
GROUP BY ccl.customer_id, p.name, p.email;

-- 視圖：月份批次摘要（含影片數量）
CREATE OR REPLACE VIEW public.monthly_batch_summary AS
SELECT 
  b.month,
  b.id AS batch_id,
  b.name AS batch_name,
  b.status,
  b.is_latest,
  b.created_at,
  COUNT(v.id) AS video_count,
  COUNT(DISTINCT ccl.customer_id) AS customers_selected
FROM public.batches b
LEFT JOIN public.videos v ON b.id = v.batch_id
LEFT JOIN public.customer_current_list ccl ON v.id = ccl.video_id
GROUP BY b.id, b.month, b.name, b.status, b.is_latest, b.created_at
ORDER BY b.month DESC, b.created_at DESC;

-- ==========================================
-- 第七部分：更新觸發器
-- ==========================================

-- 觸發器：自動更新 batches.is_latest
-- 當新批次插入時，自動將同月份的舊批次 is_latest 設為 false
CREATE OR REPLACE FUNCTION update_batch_is_latest()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果新批次是 active，將同月份的其他批次設為非最新
  IF NEW.status = 'active' THEN
    UPDATE public.batches
    SET is_latest = false
    WHERE month = NEW.month 
      AND id != NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_batch_is_latest ON public.batches;
CREATE TRIGGER trigger_update_batch_is_latest
  AFTER INSERT OR UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_is_latest();

-- ==========================================
-- 驗證資料完整性
-- ==========================================

-- 檢查遷移結果
DO $$
DECLARE
  old_selections_count INTEGER;
  new_list_count INTEGER;
  history_count INTEGER;
BEGIN
  -- 統計舊表的記錄數
  SELECT COUNT(*) INTO old_selections_count FROM public.selections;
  
  -- 統計新表的記錄數
  SELECT COUNT(DISTINCT (customer_id, video_id)) INTO new_list_count 
  FROM public.customer_current_list;
  
  -- 統計歷史記錄數
  SELECT COUNT(*) INTO history_count FROM public.selection_history;
  
  RAISE NOTICE '資料遷移完成：';
  RAISE NOTICE '  - 舊 selections 表記錄數：%', old_selections_count;
  RAISE NOTICE '  - 新 customer_current_list 記錄數：%', new_list_count;
  RAISE NOTICE '  - selection_history 記錄數：%', history_count;
END $$;

-- ==========================================
-- 完成！
-- ==========================================

-- 驗證新表是否建立成功
SELECT 
  'customer_current_list' AS table_name,
  COUNT(*) AS record_count
FROM public.customer_current_list
UNION ALL
SELECT 
  'selection_history' AS table_name,
  COUNT(*) AS record_count
FROM public.selection_history
UNION ALL
SELECT 
  'batches (with month)' AS table_name,
  COUNT(*) AS record_count
FROM public.batches
WHERE month IS NOT NULL;

-- 注意事項：
-- 1. 舊的 selections 表暫時保留，驗證無誤後可手動刪除
-- 2. 新系統上線後，請監控資料庫效能
-- 3. 建議在 Supabase Dashboard 中設定自動備份
