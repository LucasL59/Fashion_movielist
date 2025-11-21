/**
 * Supabase 客戶端配置
 * 
 * 提供 Supabase 資料庫和儲存服務的連接
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 驗證必要的環境變數
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('缺少必要的 Supabase 環境變數');
}

// 建立 Supabase 客戶端（使用 Service Role Key 以獲得完整權限）
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 建立用於前端的 Anon Key 客戶端（權限受限）
export const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * 測試 Supabase 連接
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase 連接成功');
    return true;
  } catch (error) {
    console.error('❌ Supabase 連接失敗:', error.message);
    return false;
  }
}

