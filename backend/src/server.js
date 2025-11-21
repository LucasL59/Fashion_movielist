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
import reminderRoutes from './routes/reminders.js';
import dashboardRoutes from './routes/dashboard.js';
import mailRoutes from './routes/mail.js';

// 導入服務
import { initializeReminderScheduler } from './services/reminderService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中間件設定 ====================

// 安全性中間件
app.use(helmet());

// CORS 設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

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
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mail-rules', mailRoutes);

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

// ==================== 啟動伺服器 ====================

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
  console.log(`📝 環境: ${process.env.NODE_ENV || 'development'}`);
  
  // 初始化提醒排程器
  initializeReminderScheduler();
  console.log('⏰ 提醒排程器已初始化');
});

export default app;

