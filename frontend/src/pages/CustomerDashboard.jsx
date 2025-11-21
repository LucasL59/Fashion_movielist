/**
 * 客戶儀表板
 *
 * 顯示歡迎訊息、最新上傳狀態與快速連結
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, History, Settings, Bell, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getCustomerDashboardStatus } from '../lib/api'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [status, setStatus] = useState({
    latestBatch: null,
    hasSelection: false,
    selection: null,
    totalVideos: 0,
    hasNewBatch: false,
  })
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [statusError, setStatusError] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadStatus()
    }
  }, [user])

  async function loadStatus() {
    try {
      setLoadingStatus(true)
      setStatusError('')
      const response = await getCustomerDashboardStatus(user.id)
      setStatus(response.data || {})
    } catch (error) {
      console.error('載入儀表板狀態失敗:', error)
      setStatusError('無法取得最新狀態，請稍後再試')
    } finally {
      setLoadingStatus(false)
    }
  }

  function formatDateTime(value) {
    if (!value) return '—'
    return new Date(value).toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const latestBatch = status?.latestBatch
  const hasSelection = status?.hasSelection
  const hasNewBatch = status?.hasNewBatch
  const selection = status?.selection

  return (
    <div className="space-y-8">
      {/* 歡迎與狀態 */}
      <div className="card bg-primary-50 border-primary-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-primary-600 font-medium">最新狀態</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              歡迎回來，{user?.name || '使用者'}！
            </h1>
            <p className="text-gray-600 mt-2">
              {latestBatch ? `目前正開放 ${latestBatch.name || '本月'} 的影片清單` : '目前尚未上傳新的影片清單'}
            </p>
          </div>
          {hasNewBatch && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-primary-700 shadow-sm">
              <Bell className="h-5 w-5" />
              <span className="font-medium">有新的影片清單等待您選擇</span>
            </div>
          )}
        </div>

        {loadingStatus && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="spinner w-4 h-4 border-t-primary-500"></div>
            正在同步最新資料...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-primary-100 bg-white p-4">
            <p className="text-sm text-gray-500">本月清單狀態</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary-50 text-primary-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {latestBatch ? '已上傳' : '尚未上傳'}
                </p>
                <p className="text-sm text-gray-500">
                  {latestBatch ? `更新於 ${formatDateTime(latestBatch.created_at)}` : '等待管理員上傳'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-white p-4">
            <p className="text-sm text-gray-500">我的選擇狀態</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={`p-3 rounded-full ${hasSelection ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {hasSelection ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {hasSelection ? '已提交' : latestBatch ? '等待提交' : '尚未開放'}
                </p>
                <p className="text-sm text-gray-500">
                  {hasSelection
                    ? `共選擇 ${selection?.video_ids?.length || 0} 部影片`
                    : latestBatch
                      ? '完成選擇後才會寄出通知'
                      : '請等待新的清單'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-white p-4">
            <p className="text-sm text-gray-500">清單資訊</p>
            <div className="mt-3">
              <p className="font-semibold text-gray-900 text-lg">
                {status?.totalVideos || 0} 部影片
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {latestBatch ? '可立即進入「選擇影片」頁面操作' : '等待上傳後即可操作'}
              </p>
            </div>
          </div>
        </div>

        {statusError && (
          <div className="mt-6 bg-white border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">狀態提醒</p>
              <p className="text-sm text-red-600">{statusError}</p>
            </div>
          </div>
        )}
      </div>

      {/* 快速連結 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/movies"
          className="card hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
              <Film className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">選擇影片</h3>
              <p className="text-sm text-gray-600">
                {hasSelection ? '可重新調整本月選擇' : '立即挑選您想看的影片'}
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/history"
          className="card hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <History className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">選擇記錄</h3>
              <p className="text-sm text-gray-600">查看過往送出的影片清單</p>
            </div>
          </div>
        </Link>

        <Link
          to="/settings"
          className="card hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">設定</h3>
              <p className="text-sm text-gray-600">更新個人資料與提醒設定</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 使用說明 */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">使用說明</h2>
        <ol className="space-y-3 text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </span>
            <span>點擊「選擇影片」查看最新的影片清單</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </span>
            <span>點擊影片卡片選擇您想要的影片（可多選）</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </span>
            <span>點擊「提交選擇」按鈕完成選擇</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              4
            </span>
            <span>系統會自動發送 Email 通知管理員</span>
          </li>
        </ol>
      </div>
    </div>
  )
}

