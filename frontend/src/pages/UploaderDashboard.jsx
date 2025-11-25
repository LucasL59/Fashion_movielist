/**
 * 上傳者儀表板
 *
 * 顯示最新上傳狀態、提供補發通知功能與快速連結
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Upload, Film, Bell, Edit, CheckCircle2, AlertCircle, Clock, Mail } from 'lucide-react'
import { getAdminDashboardOverview, resendUploadNotification } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'
import Select from '../components/Select'

export default function UploaderDashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [status, setStatus] = useState({
    latestBatch: null,
    allBatches: [],
    submittedCount: 0,
    pendingCount: 0,
    totalCustomers: 0,
  })
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [statusError, setStatusError] = useState('')
  
  const [notificationModalOpen, setNotificationModalOpen] = useState(false)
  const [sendingNotification, setSendingNotification] = useState(false)
  const [selectedResendBatch, setSelectedResendBatch] = useState('')

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    try {
      setLoadingStatus(true)
      setStatusError('')
      const response = await getAdminDashboardOverview()
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

  function handleOpenNotificationModal() {
    // 預設選擇最新的批次
    if (status.allBatches && status.allBatches.length > 0) {
      setSelectedResendBatch(status.allBatches[0].id)
    } else if (status.latestBatch) {
      setSelectedResendBatch(status.latestBatch.id)
    }
    setNotificationModalOpen(true)
  }

  async function handleResendNotification() {
    if (!selectedResendBatch) {
      showToast('請選擇要補發通知的批次', 'warning')
      return
    }

    const allBatches = status.allBatches || []
    const batch = allBatches.find(b => b.id === selectedResendBatch) || status.latestBatch
    
    if (!batch) {
      showToast('找不到選擇的批次', 'error')
      return
    }

    try {
      setSendingNotification(true)
      const response = await resendUploadNotification(batch.id, batch.name)
      
      const stats = response.data?.notificationStats
      if (stats) {
        showToast(`已成功發送通知 - 客戶: ${stats.customersSent} 位，內部: ${stats.internalSent} 位`, 'success')
        console.log('通知統計:', stats)
      } else {
        showToast('已成功發送通知給所有客戶', 'success')
      }
      
      setNotificationModalOpen(false)
    } catch (error) {
      console.error('發送通知失敗:', error)
      showToast(error.response?.data?.message || '發送通知失敗，請稍後再試', 'error')
    } finally {
      setSendingNotification(false)
    }
  }

  const latestBatch = status?.latestBatch
  const hasBatch = !!latestBatch

  // 狀態判斷邏輯
  const currentDate = new Date()
  const isUploadedThisMonth = latestBatch && (() => {
    const d = new Date(latestBatch.created_at)
    return d.getFullYear() === currentDate.getFullYear() && 
           d.getMonth() === currentDate.getMonth()
  })()
  
  const isSelectionComplete = status.totalCustomers > 0 && status.pendingCount === 0

  function getStatusStyles(isGood) {
    return isGood 
      ? 'bg-green-50 border-green-100' 
      : 'bg-red-50 border-red-100'
  }

  function getIconStyles(isGood) {
    return isGood
      ? 'bg-green-100 text-green-600'
      : 'bg-red-100 text-red-600'
  }

  return (
    <div className="space-y-8">
      {/* 歡迎與狀態 */}
      <div className="card bg-primary-50 border-primary-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-primary-600 font-medium">上傳者專區</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              歡迎回來，{user?.name || '上傳者'}
            </h1>
            <p className="text-gray-600 mt-2">
              {hasBatch 
                ? `目前最新的影片清單為：${latestBatch.name}` 
                : '目前尚未上傳任何影片清單'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/admin" 
              className="btn bg-white text-primary-700 hover:bg-primary-50 border-primary-200 shadow-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              上傳新清單
            </Link>
          </div>
        </div>

        {loadingStatus && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="spinner w-4 h-4 border-t-primary-500"></div>
            正在同步最新資料...
          </div>
        )}

        {statusError && (
          <div className="mt-6 bg-white border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">狀態提醒</p>
              <p className="text-sm text-red-600">{statusError}</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* 最新批次資訊 */}
          <div className={`rounded-2xl border p-4 ${hasBatch ? getStatusStyles(isUploadedThisMonth) : 'bg-red-50 border-red-100'}`}>
            <p className="text-sm text-gray-500">本月上傳狀態</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={`p-3 rounded-full ${hasBatch ? getIconStyles(isUploadedThisMonth) : 'bg-red-100 text-red-600'}`}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {hasBatch ? latestBatch.name : '尚未上傳'}
                </p>
                <p className="text-sm text-gray-500">
                  {hasBatch 
                    ? `上傳於 ${formatDateTime(latestBatch.created_at)}`
                    : '請盡快上傳本月清單'}
                </p>
              </div>
            </div>
          </div>

          {/* 選擇進度概覽 */}
          <div className={`rounded-2xl border p-4 ${getStatusStyles(isSelectionComplete)}`}>
            <p className="text-sm text-gray-500">選擇進度概覽</p>
            <div className="mt-3 flex items-center gap-3">
              <div className={`p-3 rounded-full ${getIconStyles(isSelectionComplete)}`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {status.submittedCount} / {status.totalCustomers} 位客戶
                </p>
                <p className="text-sm text-gray-500">
                  {isSelectionComplete ? '所有客戶已完成選擇' : '尚有客戶未完成選擇'}
                </p>
              </div>
            </div>
          </div>

          {/* 通知管理 - 保持白色背景 */}
          <div className="rounded-2xl border border-primary-100 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">通知管理</p>
              <p className="font-semibold text-gray-900 mt-1">補發上傳通知</p>
              <p className="text-xs text-gray-400 mt-1">若客戶未收到信件可使用</p>
            </div>
            <button 
              onClick={handleOpenNotificationModal}
              className="p-3 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
              title="補發通知"
              disabled={!hasBatch}
            >
              <Mail className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 快速連結 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/admin"
          className="card hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
              <Upload className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">上傳管理</h3>
              <p className="text-sm text-gray-600">上傳新的 Excel 影片清單</p>
            </div>
          </div>
        </Link>

        <Link
          to="/videos"
          className="card hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Edit className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">影片管理</h3>
              <p className="text-sm text-gray-600">編輯影片資訊或縮圖</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 確認對話框 */}
      <Modal
        isOpen={notificationModalOpen}
        onClose={() => !sendingNotification && setNotificationModalOpen(false)}
        title="確認補發通知"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setNotificationModalOpen(false)}
              disabled={sendingNotification}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResendNotification}
              disabled={sendingNotification || !selectedResendBatch}
            >
              {sendingNotification ? '發送中...' : '確認發送'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-bold mb-1">請注意</p>
              <p>這將會發送 Email 通知給所有「客戶」角色的使用者。</p>
              <p className="mt-1">通常僅在客戶反應未收到通知，或系統初次發送失敗時使用。</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇要補發通知的批次
            </label>
            <Select
              value={selectedResendBatch}
              onChange={(e) => setSelectedResendBatch(e.target.value)}
              options={[
                { value: '', label: '請選擇批次' },
                ...(status.allBatches || []).map((batch) => ({
                  value: batch.id,
                  label: `${batch.name} (${new Date(batch.created_at).toLocaleDateString('zh-TW')})`
                }))
              ]}
              disabled={sendingNotification}
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 提示：預設為最新批次，您也可以選擇前一個月的批次進行補發
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
