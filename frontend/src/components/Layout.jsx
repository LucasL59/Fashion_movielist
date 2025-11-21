/**
 * 佈局組件
 * 
 * 提供導航欄和頁面容器
 */

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, LogOut, Settings, Upload, List, Users, Edit, Mail } from 'lucide-react'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  
  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導航欄 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo 和主導航 */}
            <div className="flex">
              <Link to="/" className="flex items-center">
                <Film className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  MVI影片選擇系統
                </span>
              </Link>
              
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {(user?.role === 'admin' || user?.role === 'uploader') ? (
                  <>
                    <Link
                      to="/admin"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      上傳管理
                    </Link>
                    <Link
                      to="/videos"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      影片管理
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        to="/users"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        用戶管理
                      </Link>
                    )}
                    {user?.role === 'admin' && (
                      <Link
                        to="/mail"
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        郵件管理
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    to="/movies"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <Film className="h-4 w-4 mr-2" />
                    選擇影片
                  </Link>
                )}
                
                {/* 所有用戶都能看到的選擇影片連結 */}
                {(user?.role === 'admin' || user?.role === 'uploader') && (
                  <Link
                    to="/movies"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <Film className="h-4 w-4 mr-2" />
                    選擇影片
                  </Link>
                )}
              </div>
            </div>
            
            {/* 用戶選單 */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.name || user?.email}
              </span>
              
              <Link
                to="/settings"
                className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                title="設定"
              >
                <Settings className="h-5 w-5" />
              </Link>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="登出"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 主內容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* 頁尾 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-gray-900">
              MVI影片選擇系統
            </p>
            <p className="text-xs text-gray-600">
              飛訊資訊科技有限公司 2025 © Fashion Info Tech Co., Ltd. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

