/**
 * 應用程式入口文件
 * Build: 2026-01-05T17:16:00+08:00 v3.2.4 - Force rebuild for API fix
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Version stamp to force new bundle generation - v3.2.6 DEBUG
const BUILD_INFO = {
  version: '3.2.6',
  buildTime: '2026-01-05T17:30:00+08:00',
  commit: 'debug: add detailed logging to diagnose 401 errors',
  description: 'Add console logs to track token acquisition and API requests',
  rebuild: 'force-vercel-rebuild-v3.2.6'
};

// Log build info in production
console.log('🚀 Fashion MovieList System v3.2.6 - DEBUG BUILD', BUILD_INFO);
console.log('📅 構建時間:', BUILD_INFO.buildTime);
console.log('🔄 如果您看到舊版本號，請清除瀏覽器快取 (Ctrl+Shift+Delete)');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
