/**
 * 登入頁面 - Modern Refined
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, Mail, Lock, AlertCircle, Loader, ArrowLeft, Clock } from 'lucide-react'
import { requestPasswordReset } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import BrandTransition from '../components/BrandTransition'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  
  // 檢查是否因 Session 過期而跳轉
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true)
      showToast('您的登入已過期，請重新登入', 'warning')
      // 清除 URL 參數
      navigate('/login', { replace: true })
    }
  }, [searchParams, showToast, navigate])
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email || !password) {
      setError('請填寫所有欄位')
      return
    }
    
    try {
      setError('')
      setLoading(true)
      const start = performance.now()
      await signIn(email, password)
      setRedirecting(true)
      setLoading(false)
      const elapsed = performance.now() - start
      const delay = elapsed < 500 ? 500 - elapsed : 150
      setTimeout(() => navigate('/'), delay)
      
    } catch (error) {
      console.error('登入失敗:', error)
      setError('登入失敗，請檢查您的帳號密碼')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleForgotSubmit(e) {
    e.preventDefault()

    if (!resetEmail) {
      setResetMessage('請輸入 Email')
      return
    }

    try {
      setResetLoading(true)
      setResetMessage('')
      await requestPasswordReset(resetEmail)
      setResetMessage('重設連結已寄出，請查看信箱。')
      showToast('已寄出重設密碼郵件', 'success')
    } catch (error) {
      console.error('重設密碼郵件寄送失敗:', error)
      setResetMessage('寄送失敗，請稍後再試')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-[10vh] bg-gray-50 px-4 relative overflow-hidden">
      <BrandTransition isVisible={loading || redirecting} />
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
        
        {/* 表單卡片 */}
        <div className="card backdrop-blur-xl bg-white/80 border-white/50 relative overflow-hidden">
          {forgotMode ? (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-primary-600 font-semibold mb-1">忘記密碼</p>
                <h2 className="text-2xl font-semibold text-gray-900">寄送重設連結</h2>
                <p className="text-sm text-gray-500 mt-1">輸入註冊 Email，我們會寄送重設密碼連結</p>
              </div>

              {resetMessage && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                    註冊 Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="input pl-11"
                      placeholder="your@email.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn btn-primary w-full"
                  >
                    {resetLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="h-5 w-5 animate-spin" />
                        寄送中...
                      </span>
                    ) : (
                      '寄送重設連結'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false)
                      setResetMessage('')
                    }}
                    className="btn btn-outline w-full flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> 返回登入
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900">歡迎回來</h2>
                <p className="text-sm text-gray-500 mt-1">請輸入您的帳號密碼以繼續</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Session 過期提示 */}
                {sessionExpired && !error && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">登入已過期</p>
                      <p className="text-xs text-amber-600 mt-0.5">為了您的帳號安全，請重新登入</p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                    Email
                  </label>
                  <div className="relative груп">
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      密碼
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true)
                        setResetEmail(email)
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      忘記密碼？
                    </button>
                  </div>
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

              <div className="mt-8 text-center border-t border-gray-100 pt-6">
                <p className="text-sm text-gray-500">
                  還沒有帳號？{' '}
                  <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline decoration-2 underline-offset-2 transition-all">
                    立即註冊
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

