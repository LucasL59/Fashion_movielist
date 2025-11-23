import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { resetPassword } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { showToast } = useToast()

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!token) {
      setError('重設連結無效，請重新申請。')
      return
    }

    if (!form.password || !form.confirmPassword) {
      setError('請填寫所有欄位')
      return
    }

    if (form.password.length < 6) {
      setError('新密碼至少需要 6 個字元')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('確認密碼不一致')
      return
    }

    try {
      setError('')
      setLoading(true)
      await resetPassword(token, form.password)
      setSuccess(true)
      showToast('密碼已更新，請重新登入', 'success')

      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      console.error('重設密碼失敗:', err)
      setError(err.response?.data?.message || '重設密碼失敗或連結已失效')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">連結無效或已過期</h2>
          <p className="text-gray-600 mb-6">請返回登入頁並重新申請忘記密碼。</p>
          <Link to="/login" className="btn btn-primary inline-flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> 返回登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-10%] w-[520px] h-[520px] bg-primary-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-25%] left-[-5%] w-[460px] h-[460px] bg-indigo-200/30 rounded-full blur-[120px]" />

      <div className="max-w-md w-full relative z-10">
        <div className="card bg-white/85 backdrop-blur-xl border-white/50 shadow-2xl">
          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">密碼已更新</h2>
              <p className="text-gray-600">您可以使用新的密碼重新登入系統。</p>
              <p className="text-sm text-gray-400">即將自動跳轉到登入頁面...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-primary-600 font-semibold mb-1 tracking-[0.3em]">RESET</p>
                <h1 className="text-2xl font-bold text-gray-900">重設密碼</h1>
                <p className="text-sm text-gray-500 mt-2">請設定新的登入密碼並妥善保管。</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-5">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    新密碼
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      className="input pl-11"
                      placeholder="至少 6 個字元"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    確認新密碼
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="input pl-11"
                      placeholder="再次輸入新密碼"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full mt-4">
                  {loading ? '更新中...' : '更新密碼'}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm text-gray-500 hover:text-primary-600 inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> 返回登入
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
