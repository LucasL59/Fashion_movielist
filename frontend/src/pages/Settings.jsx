/**
 * 設定頁面
 * 
 * 管理用戶設定和提醒通知
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Bell, CheckCircle, AlertCircle } from 'lucide-react'
import { setReminderSchedule, sendReminderNow } from '../lib/api'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState('')
  
  // 提醒設定
  const [reminderDay, setReminderDay] = useState('1')
  const [reminderHour, setReminderHour] = useState('9')
  const [reminderMessage, setReminderMessage] = useState('請記得上傳本月的影片清單')
  const [reminderEmail, setReminderEmail] = useState(user?.email || '')
  const [settingReminder, setSettingReminder] = useState(false)
  const [reminderSuccess, setReminderSuccess] = useState(false)
  const [reminderError, setReminderError] = useState('')
  
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
  
  async function handleSetReminder(e) {
    e.preventDefault()
    
    // 建立 cron 表達式：分 時 日 月 週
    const cronSchedule = `0 ${reminderHour} ${reminderDay} * *`
    
    try {
      setSettingReminder(true)
      setReminderError('')
      await setReminderSchedule({
        cronSchedule,
        message: reminderMessage,
        targetEmail: reminderEmail,
      })
      setReminderSuccess(true)
      
      setTimeout(() => {
        setReminderSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('設定提醒失敗:', error)
      setReminderError('設定提醒失敗，請稍後再試')
    } finally {
      setSettingReminder(false)
    }
  }
  
  async function handleTestReminder() {
    try {
      await sendReminderNow({
        message: reminderMessage,
        targetEmail: reminderEmail,
      })
      alert('測試提醒已發送！請檢查您的 Email。')
    } catch (error) {
      console.error('發送測試提醒失敗:', error)
      alert('發送測試提醒失敗')
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
              value={user?.role === 'admin' ? '管理員' : '客戶'}
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
      
      {/* 提醒設定（僅管理員可見，uploader 不可見） */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">提醒通知設定</h2>
          </div>
          
          {reminderSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">提醒設定已更新</p>
            </div>
          )}
          
          {reminderError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{reminderError}</p>
            </div>
          )}
          
          <form onSubmit={handleSetReminder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="reminder-day" className="block text-sm font-medium text-gray-700 mb-2">
                  每月幾號
                </label>
                <select
                  id="reminder-day"
                  value={reminderDay}
                  onChange={(e) => setReminderDay(e.target.value)}
                  className="select"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day} 號
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="reminder-hour" className="block text-sm font-medium text-gray-700 mb-2">
                  幾點
                </label>
                <select
                  id="reminder-hour"
                  value={reminderHour}
                  onChange={(e) => setReminderHour(e.target.value)}
                  className="select"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="reminder-message" className="block text-sm font-medium text-gray-700 mb-2">
                提醒訊息
              </label>
              <textarea
                id="reminder-message"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="input"
                rows={3}
                placeholder="提醒內容"
              />
            </div>
            
            <div>
              <label htmlFor="reminder-email" className="block text-sm font-medium text-gray-700 mb-2">
                接收 Email
              </label>
              <input
                id="reminder-email"
                type="email"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                className="input"
                placeholder="接收提醒的 Email"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={settingReminder}
                className="btn btn-primary"
              >
                {settingReminder ? '設定中...' : '儲存設定'}
              </button>
              
              <button
                type="button"
                onClick={handleTestReminder}
                className="btn btn-outline"
              >
                發送測試提醒
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

