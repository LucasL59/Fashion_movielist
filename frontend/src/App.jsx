/**
 * 主應用組件
 * 
 * 負責路由配置和全局狀態管理
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { useAuth } from './contexts/AuthContext'

// 頁面組件
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import UploaderDashboard from './pages/UploaderDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import MovieSelection from './pages/MovieSelection_v3'
import Settings from './pages/Settings'
import UserManagement from './pages/UserManagement'
import VideoManagement from './pages/VideoManagement'
import SelectionHistory from './pages/SelectionHistory'
import UploadManagement from './pages/UploadManagement'
import MailManagement from './pages/MailManagement'
import OperationLogs from './pages/OperationLogs'
import ResetPassword from './pages/ResetPassword'
import DemoTransition from './pages/DemoTransition'
import AdminSelectionSummary from './pages/AdminSelectionSummary'

// 佈局組件
import Layout from './components/Layout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * 受保護的路由組件
 */
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }
  
  return children
}

/**
 * 應用路由
 */
function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      {/* 公開路由 */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/demo-transition" element={<DemoTransition />} />
      
      {/* 受保護的路由 */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {user?.role === 'admin' ? (
              <AdminDashboard />
            ) : user?.role === 'uploader' ? (
              <UploaderDashboard />
            ) : (
              <CustomerDashboard />
            )}
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 上傳管理頁 */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <Layout>
            {(user?.role === 'admin' || user?.role === 'uploader') ? (
              <UploadManagement />
            ) : (
              <Navigate to="/" replace />
            )}
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 客戶路由 */}
      <Route path="/movies" element={
        <ProtectedRoute>
          <Layout>
            {user?.role === 'uploader' ? <Navigate to="/admin" replace /> : <MovieSelection />}
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 影片管理頁面（Admin 和 Uploader） */}
      <Route path="/videos" element={
        <ProtectedRoute>
          <Layout>
            {(user?.role === 'admin' || user?.role === 'uploader') ? (
              <VideoManagement />
            ) : (
              <Navigate to="/movies" replace />
            )}
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 選擇歷史頁面 */}
      <Route path="/history" element={
        <ProtectedRoute>
          <Layout>
            <SelectionHistory />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 設定頁面 */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 用戶管理頁面（僅管理員） */}
      <Route path="/users" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <UserManagement />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 郵件管理頁面（僅管理員） */}
      <Route path="/mail" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <MailManagement />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 操作紀錄頁面（僅管理員） */}
      <Route path="/logs" element={
        <ProtectedRoute requiredRole="admin">
          <Layout>
            <OperationLogs />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 客戶清單總覽頁面（管理員和上傳者） */}
      <Route path="/selection-summary" element={
        <ProtectedRoute>
          <Layout>
            {(user?.role === 'admin' || user?.role === 'uploader') ? (
              <AdminSelectionSummary />
            ) : (
              <Navigate to="/" replace />
            )}
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * 後端暖機組件
 * 
 * 在應用啟動時預先 ping 後端 /health 端點，
 * 喚醒可能因 Render 免費方案而休眠的後端服務。
 * 在等待後端回應期間顯示友善的載入畫面。
 */
function BackendWarmup({ children }) {
  const [backendReady, setBackendReady] = useState(false)
  const [warmupMessage, setWarmupMessage] = useState('正在連線至伺服器...')

  useEffect(() => {
    let cancelled = false

    async function warmup() {
      const MAX_RETRIES = 3
      const RETRY_DELAY_MS = 3000
      const TIMEOUT_MS = 15000 // 單次請求超時

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (cancelled) return

          if (attempt > 1) {
            setWarmupMessage(`伺服器啟動中，請稍候...（第 ${attempt} 次嘗試）`)
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

          const response = await fetch(`${API_URL}/health`, {
            signal: controller.signal
          })
          clearTimeout(timeoutId)

          if (response.ok) {
            if (!cancelled) setBackendReady(true)
            return
          }
        } catch (error) {
          console.warn(`後端暖機第 ${attempt} 次嘗試失敗:`, error.message)
        }

        // 如果不是最後一次嘗試，等待後重試
        if (attempt < MAX_RETRIES && !cancelled) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }

      // 即使暖機失敗也讓應用繼續載入（不阻擋使用者）
      if (!cancelled) {
        console.warn('後端暖機超時，繼續載入應用')
        setBackendReady(true)
      }
    }

    warmup()

    return () => { cancelled = true }
  }, [])

  // 後端尚未就緒時顯示載入畫面
  if (!backendReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center space-y-6">
          {/* Logo / 標題 */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-widest">MVI</h1>
            <p className="text-sm text-gray-400 tracking-wider">影片選擇系統</p>
          </div>

          {/* 載入動畫 */}
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* 提示訊息 */}
          <p className="text-sm text-gray-500">{warmupMessage}</p>
        </div>
      </div>
    )
  }

  return children
}

/**
 * 主應用組件
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <BackendWarmup>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BackendWarmup>
      </ToastProvider>
    </Router>
  )
}

export default App

