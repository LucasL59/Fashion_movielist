/**
 * 管理員儀表板
 * 
 * 上傳影片清單、查看客戶選擇
 */

import { useState, useEffect } from 'react'
import { AlertCircle, BarChart3, Clock, RefreshCw, Upload } from 'lucide-react'
import { getAdminDashboardOverview } from '../lib/api'

export default function AdminDashboard() {
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [overview, setOverview] = useState({
    latestBatch: null,
    uploader: null,
    totalCustomers: 0,
    submittedCount: 0,
    pendingCount: 0,
    selectionDetails: [],
  })
  
  useEffect(() => {
    loadDashboardOverview()
  }, [])
  
  async function loadDashboardOverview() {
    try {
      setOverviewLoading(true)
      setOverviewError('')
      const response = await getAdminDashboardOverview()
      setOverview(response.data || {})
    } catch (error) {
      console.error('載入概況失敗:', error)
      setOverviewError('無法取得儀表板概況，請稍後再試')
    } finally {
      setOverviewLoading(false)
    }
  }
  
  const latestBatch = overview?.latestBatch
  const totalCustomers = overview?.totalCustomers || 0
  const submittedCount = overview?.submittedCount || 0
  const pendingCount = overview?.pendingCount ?? Math.max(totalCustomers - submittedCount, 0)
  const completionRate = totalCustomers ? Math.round((submittedCount / totalCustomers) * 100) : 0

  return (
    <div className="space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理員儀表板</h1>
        <p className="text-gray-600 mt-2">上傳影片清單並查看客戶選擇</p>
      </div>

      {/* 概況卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-6 w-6 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">最新影片清單</p>
              <p className="text-lg font-semibold text-gray-900">
                {latestBatch ? latestBatch.name : '尚未上傳'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {latestBatch
              ? `更新於 ${new Date(latestBatch.created_at).toLocaleString('zh-TW')}`
              : '上傳後即可通知所有客戶'}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">本月選擇進度</p>
              <p className="text-lg font-semibold text-gray-900">
                {submittedCount}/{totalCustomers} 位已完成
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-primary-50 overflow-hidden">
            <div
              className="h-2 bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            完成率 {completionRate}%・尚有 {pendingCount} 位待提交
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">最新上傳者</p>
              <p className="text-lg font-semibold text-gray-900">
                {overview?.uploader?.name || '—'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {overview?.uploader?.email || '尚未紀錄上傳者'}
          </p>
          <button
            onClick={loadDashboardOverview}
            className="btn btn-outline mt-4 w-full"
            disabled={overviewLoading}
          >
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
              重新整理
            </span>
          </button>
        </div>
      </div>

      {overviewError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">概況載入失敗</p>
            <p className="text-sm text-red-700">{overviewError}</p>
          </div>
        </div>
      )}

    </div>
  )
}

