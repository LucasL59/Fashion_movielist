/**
 * 登入頁面
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn } = useAuth()
  const navigate = useNavigate()
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email || !password) {
      setError('請填寫所有欄位')
      return
    }
    
    try {
      setError('')
      setLoading(true)
      await signIn(email, password)
      navigate('/')
    } catch (error) {
      console.error('登入失敗:', error)
      setError('登入失敗，請檢查您的帳號密碼')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg">
            <Film className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MVI影片選擇系統</h1>
          <p className="text-sm text-gray-600 mb-1">飛訊資訊科技有限公司</p>
          <p className="text-gray-500">登入您的帳號</p>
        </div>
        
        {/* 登入表單 */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            
            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密碼
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            
            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  登入中...
                </span>
              ) : (
                '登入'
              )}
            </button>
          </form>
          
          {/* 註冊連結 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              還沒有帳號？{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                立即註冊
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

