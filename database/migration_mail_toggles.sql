-- ==========================================
-- 郵件通知開關功能 - 資料庫遷移腳本
-- ==========================================
-- 
-- 此腳本建立 system_settings 表並初始化郵件通知開關設定
-- 
-- 執行順序：
-- 1. 在 Supabase Dashboard 的 SQL Editor 中執行此腳本
-- 2. 驗證表格和資料建立成功
-- 3. 部署更新的後端和前端代碼
--
-- ==========================================

-- ==========================================
-- 建立 system_settings 表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON public.system_settings(updated_at DESC);

-- 啟用 RLS (Row Level Security)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS 政策：只有管理員可以讀取和修改系統設定
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 初始化郵件通知開關設定
-- ==========================================

-- 插入預設的郵件通知開關設定（預設都啟用）
INSERT INTO public.system_settings (key, value, updated_at)
VALUES 
  (
    'mail_notifications',
    jsonb_build_object(
      'selection_submitted', jsonb_build_object('enabled', true),
      'batch_uploaded', jsonb_build_object('enabled', true)
    ),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 建立更新觸發器
-- ==========================================

-- 觸發器函數：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 綁定觸發器到 system_settings 表
DROP TRIGGER IF EXISTS trigger_update_system_settings_timestamp ON public.system_settings;
CREATE TRIGGER trigger_update_system_settings_timestamp
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();

-- ==========================================
-- 驗證
-- ==========================================

-- 檢查表格和資料是否建立成功
DO $$
DECLARE
  table_exists BOOLEAN;
  settings_count INTEGER;
BEGIN
  -- 檢查表格是否存在
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'system_settings'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ system_settings 表已成功建立';
    
    -- 檢查設定記錄數
    SELECT COUNT(*) INTO settings_count FROM public.system_settings;
    RAISE NOTICE '✅ 系統設定記錄數：%', settings_count;
    
    -- 顯示郵件通知設定
    RAISE NOTICE '✅ 郵件通知設定已初始化';
  ELSE
    RAISE EXCEPTION '❌ system_settings 表建立失敗';
  END IF;
END $$;

-- 查看目前的郵件通知設定
SELECT 
  key,
  value,
  updated_at
FROM public.system_settings
WHERE key = 'mail_notifications';

-- ==========================================
-- 完成！
-- ==========================================
