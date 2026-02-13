/**
 * 主伺服器入口文件
 * 
 * 負責初始化 Express 應用、設定中間件、註冊路由
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

// 載入環境變數
dotenv.config();

// 導入路由
import uploadRoutes from './routes/upload.js';
import videoRoutes from './routes/videos.js';
import selectionRoutes from './routes/selections.js';
import customerListRoutes from './routes/customerList.js';
import reminderRoutes from './routes/reminders.js';
import dashboardRoutes from './routes/dashboard.js';
import mailRoutes from './routes/mail.js';
import authRoutes from './routes/auth.js';
import operationLogRoutes from './routes/operationLogs.js';
import userRoutes from './routes/users.js';
import systemSettingsRoutes from './routes/systemSettings.js';

// 導入服務
import { initializeReminderScheduler } from './services/reminderService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中間件設定 ====================

// 安全性中間件
app.use(helmet());

// CORS 設定
const defaultOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultOrigin)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOriginPatterns = (process.env.ALLOWED_ORIGIN_PATTERNS || '')
  .split(',')
  .map((pattern) => pattern.trim())
  .filter(Boolean)
  .map((pattern) => {
    try {
      return new RegExp(pattern)
    } catch (error) {
      console.warn(`⚠️ 無法解析 CORS 通配規則：${pattern}`, error.message)
      return null
    }
  })
  .filter(Boolean)

// 預設允許目前 Vercel 專案產生的動態網域
allowedOriginPatterns.push(/^https:\/\/fashion-movielist-[a-z0-9-]+\.vercel\.app$/i)

function isOriginAllowed(origin) {
  if (!origin) return true // Server-to-server or same-origin
  if (allowedOrigins.includes(origin)) return true
  return allowedOriginPatterns.some((regex) => regex.test(origin))
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true)
      }
      console.warn(`🚫 CORS 阻擋來源: ${origin}`)
      return callback(new Error('CORS: 此來源未被允許'))
    },
    credentials: true,
  })
)

// 日誌中間件
app.use(morgan('combined'));

// Body 解析中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 檔案上傳中間件
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// ==================== 路由註冊 ====================

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Movie Selection API'
  });
});

// API 路由
app.use('/api/upload', uploadRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/selections', selectionRoutes);
app.use('/api/customer-list', customerListRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mail-rules', mailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/operation-logs', operationLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/customer-list', customerListRoutes);

// ==================== 錯誤處理 ====================

// 404 處理
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `路由 ${req.originalUrl} 不存在`
  });
});

// 全局錯誤處理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || '伺服器內部錯誤';
  
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== Keep-alive 機制 ====================

/**
 * 防止 Render 免費方案休眠（15 分鐘無流量後會自動停機）
 * 
 * 每 14 分鐘透過外部 URL ping 自己的 /health 端點
 * 僅在生產環境且有外部 URL 時啟用
 */
function startKeepAlive() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  
  if (process.env.NODE_ENV !== 'production' || !externalUrl) {
    console.log('ℹ️ Keep-alive 未啟用（非生產環境或未設定 RENDER_EXTERNAL_URL）');
    return;
  }
  
  const INTERVAL_MS = 14 * 60 * 1000; // 14 分鐘
  
  setInterval(async () => {
    try {
      const response = await fetch(`${externalUrl}/health`);
      if (response.ok) {
        console.log(`🏓 Keep-alive ping 成功 (${response.status})`);
      } else {
        console.warn(`⚠️ Keep-alive ping 異常: HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Keep-alive ping 失敗:', error.message);
    }
  }, INTERVAL_MS);
  
  console.log(`🏓 Keep-alive 已啟用：每 14 分鐘 ping ${externalUrl}/health`);
}

// ==================== 啟動伺服器 ====================

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
  console.log(`📝 環境: ${process.env.NODE_ENV || 'development'}`);
  
  // 初始化提醒排程器
  initializeReminderScheduler();
  
  // 啟動 Keep-alive（防止 Render 休眠）
  startKeepAlive();
});

export default app;

