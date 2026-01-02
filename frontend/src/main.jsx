/**
 * 應用程式入口文件
 * Build: 2026-01-02T22:42:00+08:00 v1.0.2 - Force new bundle hash
 * 
 * Deployment Info:
 * - Fixed: TypeError Cannot read properties of undefined
 * - Fixed: Vercel builds cache issue
 * - Fixed: Legacy vercel.json config
 * - Added: Comprehensive null safety checks
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Version stamp to force new bundle generation
const BUILD_INFO = {
  version: '1.0.2.1',
  buildTime: '2026-01-02T23:05:00+08:00',
  commit: 'Add comprehensive debugging logs',
  description: 'Step-by-step logging for loadCustomerList'
};

// Log build info in production
console.log('🚀 Fashion MovieList System', BUILD_INFO);
console.log('📋 Debug Mode: ENABLED - 所有步驟將被記錄');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

