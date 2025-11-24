import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, CheckCircle, AlertCircle, ShieldCheck, ScrollText } from 'lucide-react'
import { changePassword, getOperationLogRetentionSetting, updateOperationLogRetention } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const { showToast } = useToast()
  
  // 操作紀錄保留設定（僅管理員）
  const [logRetentionDayInput, setLogRetentionDayInput] = useState('90')
  const [logRetentionLoading, setLogRetentionLoading] = useState(false)
  const [logRetentionSaving, setLogRetentionSaving] = useState(false)
  const [logRetentionError, setLogRetentionError] = useState('')
  const [logRetentionSuccess, setLogRetentionSuccess] = useState(false)
  const [lastCleanupAt, setLastCleanupAt] = useState(null)
  const [deletedLogsInfo, setDeletedLogsInfo] = useState(null)

  // 密碼設定
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  useEffect(() => {
    if (user?.role === 'admin') {
      loadOperationLogRetention()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  async function loadOperationLogRetention() {
    try {
      setLogRetentionLoading(true)
      setLogRetentionError('')
      const response = await getOperationLogRetentionSetting()
      const retentionDays = response?.data?.retentionDays ?? 90
      setLogRetentionDayInput(retentionDays.toString())
      setLastCleanupAt(response?.data?.lastCleanupAt || response?.data?.updatedAt || null)
    } catch (error) {
      console.error('載入操作紀錄設定失敗:', error)
      setLogRetentionError('無法載入操作紀錄設定，請稍後再試')
    } finally {
      setLogRetentionLoading(false)
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    
    if (!name) {
      setUpdateError('請輸入姓名')
      return
    }

    try {
      setUpdating(true)
      setUpdateError('')
      await updateProfile({ name })
      setUpdateSuccess(true)
      
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('更新失敗:', error)
      setUpdateError('更新失敗，請稍後再試')
    } finally {
      setUpdating(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('請填寫所有欄位')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密碼至少需要 6 個字元')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('確認密碼不一致')
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordError('')
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess(true)
      showToast('密碼已更新', 'success')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })

      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      console.error('修改密碼失敗:', error)
      setPasswordError(error.response?.data?.message || '修改密碼失敗，請稍後再試')
    } finally {
      setPasswordLoading(false)
    }
  }
  
  async function handleSaveLogRetention(e) {
    e.preventDefault()
    const parsedDays = parseInt(logRetentionDayInput, 10)
    if (Number.isNaN(parsedDays)) {
      setLogRetentionError('請輸入數字天數')
      return
    }
    try {
      setLogRetentionSaving(true)
      setLogRetentionError('')
      const response = await updateOperationLogRetention({ retentionDays: parsedDays })
      setLastCleanupAt(response?.data?.lastCleanupAt || null)
      setDeletedLogsInfo(response?.data?.deletedLogs ?? null)
      setLogRetentionSuccess(true)
      setTimeout(() => setLogRetentionSuccess(false), 3000)
    } catch (error) {
      console.error('更新操作紀錄保留天數失敗:', error)
      const message = error.response?.data?.message || '更新失敗，請稍後再試'
      setLogRetentionError(message)
    } finally {
      setLogRetentionSaving(false)
    }
  }

  function formatDateTime(value) {
    if (!value) return '—'
    try {
      return new Intl.DateTimeFormat('zh-TW', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    } catch (_error) {
      return value
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-600 mt-2">管理您的帳號和通知設定</p>
      </div>
      
      {/* 個人資料 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">個人資料</h2>
        </div>
        
        {updateSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">個人資料已更新</p>
          </div>
        )}
        
        {updateError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{updateError}</p>
          </div>
        )}
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              姓名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="您的姓名"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                className="input pl-10 bg-gray-50"
                disabled
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email 無法更改</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              角色
            </label>
            <input
              type="text"
              value={
                user?.role === 'admin' ? '管理員' : 
                user?.role === 'uploader' ? '上傳者' : '客戶'
              }
              className="input bg-gray-50"
              disabled
            />
          </div>
          
          <button
            type="submit"
            disabled={updating}
            className="btn btn-primary"
          >
            {updating ? '更新中...' : '更新資料'}
          </button>
        </form>
      </div>

      {/* 密碼設定 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">安全性與密碼</h2>
        </div>

        {passwordSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-700">密碼已更新</p>
          </div>
        )}

        {passwordError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{passwordError}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目前密碼</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="input"
              placeholder="輸入目前密碼"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="input"
                placeholder="至少 6 個字元"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="input"
                placeholder="再次輸入新密碼"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
            {passwordLoading ? '更新中...' : '更新密碼'}
          </button>
        </form>
      </div>

      {/* 操作紀錄保留設定（僅管理員） */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <ScrollText className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">操作紀錄保留天數</h2>
          </div>

          {logRetentionSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-800">設定已更新，並立即清理逾期紀錄</p>
            </div>
          )}

          {logRetentionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{logRetentionError}</p>
            </div>
          )}

          <form onSubmit={handleSaveLogRetention} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                保留天數（7-365 天）
              </label>
              <input
                type="number"
                min={7}
                max={365}
                value={logRetentionDayInput}
                onChange={(e) => setLogRetentionDayInput(e.target.value)}
                className="input max-w-xs"
                disabled={logRetentionLoading || logRetentionSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                系統會自動刪除超過保留天數的操作紀錄，建議與資安需求同步。
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
              <div>
                <p className="text-gray-500 text-xs">上次清理時間</p>
                <p className="font-medium text-gray-900">{formatDateTime(lastCleanupAt)}</p>
              </div>
              {deletedLogsInfo !== null && (
                <div>
                  <p className="text-gray-500 text-xs">最近一次刪除筆數</p>
                  <p className="font-medium text-gray-900">{deletedLogsInfo} 筆</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={logRetentionSaving || logRetentionLoading}
              >
                {logRetentionSaving ? '儲存中...' : '儲存設定'}
              </button>
              <button
                type="button"
                onClick={loadOperationLogRetention}
                className="btn btn-outline"
                disabled={logRetentionLoading || logRetentionSaving}
              >
                重新載入
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

