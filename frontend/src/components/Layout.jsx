/**
 * 佈局組件
 * 
 * 提供導航欄和頁面容器 - Modern Refined
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, LogOut, Settings, Upload, Users, Edit, Mail } from 'lucide-react'
import Modal from './Modal'
import { PrivacyPolicy, TermsOfService } from './LegalDocs'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeModal, setActiveModal] = useState(null)
  
  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  const NavLink = ({ to, icon: Icon, children }) => {
    const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/')
    
    return (
      <Link
        to={to}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
          isActive 
            ? 'bg-gray-900 text-white shadow-md' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {Icon && <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-gray-300' : 'text-gray-500'}`} />}
        {children}
      </Link>
    )
  }
  
  const supportSubject = user 
    ? `[${user.name || user.email}] - MVI影片選擇系統問題 - `
    : 'MVI影片選擇系統問題 - '

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 導航欄 - Glass Effect */}
      <nav className="sticky top-0 z-50 w-full glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center group">
                <div className="bg-primary-600 rounded-xl p-1.5 shadow-lg shadow-primary-600/20 transition-transform group-hover:scale-105 group-hover:rotate-3">
                  <Film className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-lg font-display font-bold text-gray-900 tracking-tight">
                  MVI Select
                </span>
              </Link>
              
              {/* Desktop Nav */}
              <div className="hidden md:flex items-center space-x-2">
                {(user?.role === 'admin' || user?.role === 'uploader') ? (
                  <>
                    <NavLink to="/admin" icon={Upload}>上傳管理</NavLink>
                    <NavLink to="/videos" icon={Edit}>影片管理</NavLink>
                    {user?.role === 'admin' && (
                      <>
                        <NavLink to="/users" icon={Users}>用戶管理</NavLink>
                        <NavLink to="/mail" icon={Mail}>郵件管理</NavLink>
                      </>
                    )}
                  </>
                ) : (
                  <NavLink to="/movies" icon={Film}>選擇影片</NavLink>
                )}
                
                {(user?.role === 'admin' || user?.role === 'uploader') && (
                  <NavLink to="/movies" icon={Film}>選擇影片</NavLink>
                )}
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <span className="hidden sm:block text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {user?.name || user?.email}
              </span>
              
              <Link
                to="/settings"
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                title="設定"
              >
                <Settings className="h-5 w-5" />
              </Link>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="登出"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 主內容 */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      
      {/* 頁尾 */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm font-bold text-gray-900">
                MVI 影片選擇系統
              </p>
              <p className="text-xs text-gray-500 mt-1">
                飛訊資訊科技有限公司 © 2025 Fashion Info Tech Co., Ltd.
              </p>
              <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                <p>TEL (886) 2 2717-6333 &nbsp;|&nbsp; FAX (886) 2 2717-2218</p>
                <p>台北市松山區南京東路4段1號7F</p>
              </div>
            </div>
            <div className="flex space-x-6 text-xs text-gray-400">
              <button 
                onClick={() => setActiveModal('privacy')} 
                className="hover:text-gray-600 transition-colors"
              >
                隱私政策
              </button>
              <button 
                onClick={() => setActiveModal('terms')} 
                className="hover:text-gray-600 transition-colors"
              >
                使用條款
              </button>
              <a 
                href={`mailto:support@fas.com.tw?subject=${encodeURIComponent(supportSubject)}`}
                className="hover:text-gray-600 transition-colors"
              >
                支援
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'privacy' ? '隱私權保護政策' : '使用條款'}
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveModal(null)}
          >
            關閉
          </button>
        }
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
          {activeModal === 'privacy' && <PrivacyPolicy />}
          {activeModal === 'terms' && <TermsOfService />}
        </div>
      </Modal>
    </div>
  )
}

