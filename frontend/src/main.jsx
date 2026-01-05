/**
 * 應用程式入口文件
 * Build: 2026-01-05T17:16:00+08:00 v3.2.4 - Force rebuild for API fix
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Version stamp to force new bundle generation - v3.2.4 CRITICAL FIX
const BUILD_INFO = {
  version: '3.2.4',
  buildTime: '2026-01-05T17:18:00+08:00',
  commit: 'hotfix: correct getAdminDashboardOverview API signature',
  description: 'Fix 401 errors - month parameter correction',
  rebuild: 'force-cache-clear-2026-01-05'
};

// Log build info in production
console.log('🚀 Fashion MovieList System v3.2.4', BUILD_INFO);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
