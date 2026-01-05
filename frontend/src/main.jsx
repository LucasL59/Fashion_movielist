/**
 * 應用程式入口文件
 * 
 * Fashion MovieList System v3.3.0
 * - 移除調試代碼
 * - 添加 401 自動處理
 * - 添加 Session 防護機制
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 版本資訊
const BUILD_INFO = {
  version: '3.3.0',
  buildTime: '2026-01-05T18:00:00+08:00',
  description: 'Production build with session protection'
};

// 生產環境簡潔日誌
if (import.meta.env.DEV) {
  console.log('🚀 Fashion MovieList System', BUILD_INFO);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
