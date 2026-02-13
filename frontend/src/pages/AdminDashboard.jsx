/**
 * 管理員儀表板
 * 
 * 上傳影片清單、查看客戶選擇
 */

import { useState, useEffect } from 'react'
import { AlertCircle, BarChart3, Clock, RefreshCw, Upload, CheckCircle2, Clock3, Calendar } from 'lucide-react'
import { getAdminDashboardOverview } from '../lib/api'
import Select from '../components/Select'

export default function AdminDashboard() {
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('') // 改為月份篩選
  const [overview, setOverview] = useState({
    latestBatch: null,
    allBatches: [],
    uploader: null,
    totalCustomers: 0,
    submittedCount: 0,
    pendingCount: 0,
    selectionDetails: [],
    availableMonths: [], // 新增：可用月份列表
  })
  
  useEffect(() => {
    loadDashboardOverview()
  }, [])
  
  async function loadDashboardOverview(month = null) {
    try {
      setOverviewLoading(true)
      setOverviewError('')
      
      // 決定要查詢的月份：優先使用傳入的月份，其次使用已選月份
      const effectiveMonth = month || selectedMonth || null
      const response = await getAdminDashboardOverview(effectiveMonth)
      const data = response.data || {}
      setOverview(data)
      
      // 初次載入：如果尚未選定月份且有可用月份，自動選擇最新月份並重新載入
      if (!selectedMonth && !month && data.availableMonths && data.availableMonths.length > 0) {
        const latestMonth = data.availableMonths[0]
        setSelectedMonth(latestMonth)
        // 使用最新月份重新載入，確保顯示的是該月份的提交狀態（而非累積狀態）
        const monthResponse = await getAdminDashboardOverview(latestMonth)
        const monthData = monthResponse.data || {}
        setOverview(monthData)
      }
    } catch (error) {
      console.error('載入概況失敗:', error)
      setOverviewError('無法取得儀表板概況，請稍後再試')
    } finally {
      setOverviewLoading(false)
    }
  }
  
  function handleMonthChange(e) {
    const newMonth = e.target.value
    setSelectedMonth(newMonth)
    loadDashboardOverview(newMonth)
  }
  
  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${month}月`
  }
  
  const latestBatch = overview?.latestBatch
  const allBatches = overview?.allBatches || []
  const totalCustomers = overview?.totalCustomers || 0
  const submittedCount = overview?.submittedCount || 0
  const pendingCount = overview?.pendingCount ?? Math.max(totalCustomers - submittedCount, 0)
  const completionRate = totalCustomers ? Math.round((submittedCount / totalCustomers) * 100) : 0

  const [statusFilter, setStatusFilter] = useState('all')
  const selectionDetails = overview?.selectionDetails || []

  const filteredDetails = selectionDetails.filter((detail) => {
    if (statusFilter === 'all') return true
    return detail.status === statusFilter
  })

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
              <p className="text-sm text-gray-500 flex items-center gap-2">
                客戶提交狀態
                {selectedMonth && (
                  <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    <Calendar className="h-3 w-3" />
                    {formatMonth(selectedMonth)}
                  </span>
                )}
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {submittedCount}/{totalCustomers} 位已提交
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
            提交率 {completionRate}%・尚有 {pendingCount} 位未提交
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

      {/* 選擇進度明細 */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">客戶清單調整明細</h2>
            <p className="text-sm text-gray-500">查看各客戶的清單狀態與提交情況</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* 月份選擇器 */}
            {overview.availableMonths && overview.availableMonths.length > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div className="w-full sm:w-40">
                  <Select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    options={overview.availableMonths.map((month) => ({
                      value: month,
                      label: formatMonth(month)
                    }))}
                    placeholder="選擇月份"
                    disabled={overviewLoading}
                  />
                </div>
              </div>
            )}

            <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
              {[
                { value: 'all', label: '全部', count: selectionDetails.length },
                { value: 'submitted', label: '已完成', count: submittedCount },
                { value: 'pending', label: '待提交', count: pendingCount },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    statusFilter === filter.value
                      ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`text-xs ${statusFilter === filter.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'} px-1.5 py-0.5 rounded-full`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-[800px] divide-y divide-gray-100 w-full">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase text-gray-500 tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap">客戶名稱</th>
                <th className="px-4 py-3 whitespace-nowrap">Email</th>
                <th className="px-4 py-3 whitespace-nowrap">狀態</th>
                <th className="px-4 py-3 whitespace-nowrap">擁有影片數</th>
                <th className="px-4 py-3 whitespace-nowrap">最後提交</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDetails.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    {statusFilter === 'pending'
                      ? '太棒了！所有客戶都已提交清單。'
                      : '目前沒有符合條件的資料。'}
                  </td>
                </tr>
              )}
              {filteredDetails.map((detail) => (
                <tr key={detail.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{detail.name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{detail.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                        detail.status === 'submitted'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {detail.status === 'submitted' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                      {detail.status === 'submitted' ? '已完成' : '待提交'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">
                    {detail.videoCount || 0} 部
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {detail.submittedAt
                      ? new Date(detail.submittedAt).toLocaleString('zh-TW')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

