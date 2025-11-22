/**
 * 登入頁面 - Modern Refined
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, Mail, Lock, AlertCircle, Loader } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl mb-6 shadow-xl shadow-primary-500/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Film className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight mb-2">MVI Select</h1>
          <p className="text-sm text-gray-500 font-medium">飛訊資訊科技有限公司</p>
        </div>
        
        {/* 登入表單 */}
        <div className="card backdrop-blur-xl bg-white/80 border-white/50">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900">歡迎回來</h2>
            <p className="text-sm text-gray-500 mt-1">請輸入您的帳號密碼以繼續</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            
            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                密碼
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-11"
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
              className="btn btn-primary w-full btn-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  登入中...
                </>
              ) : (
                '登入'
              )}
            </button>
          </form>
          
          {/* 註冊連結 */}
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500">
              還沒有帳號？{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline decoration-2 underline-offset-2 transition-all">
                立即註冊
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

