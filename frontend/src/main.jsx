/**
 * 應用程式入口文件
 * Build: 2026-01-05T17:16:00+08:00 v3.2.4 - Force rebuild for API fix
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Version stamp to force new bundle generation - v3.2.8 TOKEN DEBUG
const BUILD_INFO = {
  version: '3.2.8',
  buildTime: '2026-01-05T17:45:00+08:00',
  commit: 'debug: immediate token check on page load',
  description: 'Test Supabase session immediately on app start',
  rebuild: 'force-vercel-rebuild-v3.2.8-token-debug'
};

// Log build info in production
console.log('🚀 Fashion MovieList System v3.2.8 - TOKEN DEBUG', BUILD_INFO);
console.log('📅 構建時間:', BUILD_INFO.buildTime);

// 立即測試 Supabase session
import('./lib/supabase').then(({ supabase }) => {
  console.log('🔍 [DEBUG v3.2.8] 正在檢查 Supabase session...');
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ [DEBUG v3.2.8] getSession 錯誤:', error);
    } else if (!data.session) {
      console.warn('⚠️ [DEBUG v3.2.8] 無 session - 用戶未登入或 token 已過期');
      console.log('💡 [DEBUG v3.2.8] localStorage 中的 auth keys:', 
        Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'))
      );
    } else {
      console.log('✅ [DEBUG v3.2.8] Session 有效!');
      console.log('   - 用戶:', data.session.user.email);
      console.log('   - Token 前20字:', data.session.access_token?.substring(0, 20) + '...');
      console.log('   - 過期時間:', new Date(data.session.expires_at * 1000).toLocaleString());
    }
  });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
