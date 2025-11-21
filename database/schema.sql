-- ==========================================
-- 每月影片選擇系統 - 資料庫結構
-- ==========================================
-- 
-- 此 SQL 腳本用於在 Supabase 中建立所需的資料表和政策
-- 
-- 執行順序：
-- 1. 在 Supabase Dashboard 中開啟 SQL Editor
-- 2. 複製並貼上此腳本
-- 3. 執行腳本
--

-- ==========================================
-- 1. 建立 Profiles 表（用戶資料）
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 啟用 RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles 政策：用戶可以讀取自己的資料
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Profiles 政策：用戶可以更新自己的資料
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Profiles 政策：管理員可以查看所有用戶
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 2. 建立 Batches 表（批次/上傳記錄）
-- ==========================================

CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_batches_uploader ON public.batches(uploader_id);
CREATE INDEX IF NOT EXISTS idx_batches_created ON public.batches(created_at DESC);

-- 啟用 RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Batches 政策：所有已認證用戶可以讀取
CREATE POLICY "Authenticated users can view batches"
  ON public.batches
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Batches 政策：只有管理員可以新增
CREATE POLICY "Admins can insert batches"
  ON public.batches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Batches 政策：只有管理員可以更新
CREATE POLICY "Admins can update batches"
  ON public.batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 3. 建立 Videos 表（影片資料）
-- ==========================================

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  director TEXT,
  actor_male TEXT,
  actor_female TEXT,
  duration INTEGER, -- 片長（分鐘）
  rating TEXT, -- 級別
  language TEXT, -- 發音
  subtitle TEXT, -- 字幕
  thumbnail_url TEXT, -- 縮圖 URL
  row_number INTEGER, -- Excel 中的行號
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_videos_batch ON public.videos(batch_id);
CREATE INDEX IF NOT EXISTS idx_videos_title ON public.videos(title);

-- 啟用 RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Videos 政策：所有已認證用戶可以讀取
CREATE POLICY "Authenticated users can view videos"
  ON public.videos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Videos 政策：只有管理員可以新增
CREATE POLICY "Admins can insert videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Videos 政策：只有管理員可以更新
CREATE POLICY "Admins can update videos"
  ON public.videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Videos 政策：只有管理員可以刪除
CREATE POLICY "Admins can delete videos"
  ON public.videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 4. 建立 Selections 表（客戶選擇）
-- ==========================================

CREATE TABLE IF NOT EXISTS public.selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  video_ids UUID[] NOT NULL, -- 選擇的影片 ID 陣列
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, batch_id) -- 每個用戶對每個批次只能有一個選擇
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_selections_user ON public.selections(user_id);
CREATE INDEX IF NOT EXISTS idx_selections_batch ON public.selections(batch_id);

-- 啟用 RLS
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;

-- Selections 政策：用戶可以讀取自己的選擇
CREATE POLICY "Users can view own selections"
  ON public.selections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Selections 政策：用戶可以新增自己的選擇
CREATE POLICY "Users can insert own selections"
  ON public.selections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Selections 政策：用戶可以更新自己的選擇
CREATE POLICY "Users can update own selections"
  ON public.selections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Selections 政策：管理員可以查看所有選擇
CREATE POLICY "Admins can view all selections"
  ON public.selections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 5. 建立 Mail Rules 表（郵件通知設定）
-- ==========================================

CREATE TABLE IF NOT EXISTS public.mail_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('selection_submitted', 'batch_uploaded')),
  recipient_name TEXT,
  recipient_email TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_rules_event ON public.mail_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_mail_rules_recipient ON public.mail_rules(recipient_email);

ALTER TABLE public.mail_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mail rules"
  ON public.mail_rules
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
-- 6. 建立觸發器（自動更新 updated_at）
-- ==========================================

-- 建立觸發器函數
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為各表建立觸發器
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_selections_updated_at
  BEFORE UPDATE ON public.selections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- 7. 建立 Storage Bucket（影片縮圖）
-- ==========================================

-- 注意：此操作需要在 Supabase Dashboard 的 Storage 頁面手動建立
-- 或使用以下 SQL（需要適當權限）

INSERT INTO storage.buckets (id, name, public)
VALUES ('movie-thumbnails', 'movie-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 政策：所有人可以讀取
CREATE POLICY "Public can view thumbnails"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'movie-thumbnails');

-- Storage 政策：只有管理員可以上傳
CREATE POLICY "Admins can upload thumbnails"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'movie-thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage 政策：只有管理員可以刪除
CREATE POLICY "Admins can delete thumbnails"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'movie-thumbnails' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 8. 建立註冊時自動建立 Profile 的觸發器
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 9. 建立視圖（方便查詢）
-- ==========================================

-- 批次統計視圖
CREATE OR REPLACE VIEW public.batch_stats AS
SELECT 
  b.id,
  b.name,
  b.status,
  b.created_at,
  COUNT(DISTINCT v.id) as video_count,
  COUNT(DISTINCT s.id) as selection_count,
  p.name as uploader_name
FROM public.batches b
LEFT JOIN public.videos v ON b.id = v.batch_id
LEFT JOIN public.selections s ON b.id = s.batch_id
LEFT JOIN public.profiles p ON b.uploader_id = p.id
GROUP BY b.id, b.name, b.status, b.created_at, p.name;

-- ==========================================
-- 完成！
-- ==========================================

-- 驗證表是否建立成功
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('profiles', 'batches', 'videos', 'selections', 'mail_rules')
ORDER BY table_name;

