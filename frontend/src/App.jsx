/**
 * 主應用組件
 * 
 * 負責路由配置和全局狀態管理
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'

// 頁面組件
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import CustomerDashboard from './pages/CustomerDashboard'
import MovieSelection from './pages/MovieSelection'
import Settings from './pages/Settings'
import UserManagement from './pages/UserManagement'
import VideoManagement from './pages/VideoManagement'
import SelectionHistory from './pages/SelectionHistory'
import UploadManagement from './pages/UploadManagement'
import MailManagement from './pages/MailManagement'

// 佈局組件
import Layout from './components/Layout'

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
      
      {/* 受保護的路由 */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            {(user?.role === 'admin' || user?.role === 'uploader') ? <AdminDashboard /> : <CustomerDashboard />}
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
            <MovieSelection />
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
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * 主應用組件
 */
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App

