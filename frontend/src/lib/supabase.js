/**
 * Supabase 客戶端配置
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 環境變數')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

