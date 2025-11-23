/**
 * 註冊頁面
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Film, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { registerAccount } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    // 驗證
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('請填寫所有欄位')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('密碼不一致')
      return
    }
    
    if (formData.password.length < 6) {
      setError('密碼至少需要 6 個字元')
      return
    }
    
    try {
      setError('')
      setLoading(true)
      await registerAccount({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      setSuccess(true)
      showToast('註冊成功，請至 Email 查看通知', 'success')
      
      // 3 秒後跳轉到登入頁
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('註冊失敗:', error)
      setError(error.response?.data?.message || error.message || '註冊失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 px-4">
        <div className="max-w-md w-full card text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">註冊成功！</h2>
          <p className="text-gray-600 mb-4">
            請檢查您的 Email 信箱以驗證帳號。
          </p>
          <p className="text-sm text-gray-500">
            即將跳轉到登入頁面...
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg">
            <Film className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MVI影片選擇系統</h1>
          <p className="text-sm text-gray-600 mb-1">飛訊資訊科技有限公司</p>
          <p className="text-gray-500">建立新帳號</p>
        </div>
        
        {/* 註冊表單 */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* 姓名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                姓名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="您的姓名"
                  autoComplete="name"
                  required
                />
              </div>
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="至少 6 個字元"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            
            {/* 確認密碼 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                確認密碼
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="再次輸入密碼"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            
            {/* 註冊按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  註冊中...
                </span>
              ) : (
                '註冊'
              )}
            </button>
          </form>
          
          {/* 登入連結 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              已經有帳號？{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                立即登入
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

