/**
 * 客戶清單總覽頁面（v3 累積清單架構）
 * 
 * 顯示所有客戶的當前累積清單
 * 不再按月份劃分，每個客戶維護一份持續更新的清單
 */

import { useState, useEffect } from 'react'
import {
  Calendar,
  Film,
  Search,
  Loader,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  PlusCircle,
  MinusCircle,
  CheckCircle
} from 'lucide-react'
import { getMonthlySelectionSummary, getAvailableMonths } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import Select from '../components/Select'
import SelectionDiffSection from '../components/SelectionDiffSection'

export default function AdminSelectionSummary() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCustomers, setExpandedCustomers] = useState(new Set())
  
  useEffect(() => {
    loadMonths()
  }, [])
  
  useEffect(() => {
    if (selectedMonth) {
      loadSummary()
    }
  }, [selectedMonth])
  
  async function loadMonths() {
    try {
      const response = await getAvailableMonths()
      const monthsData = response.data || []
      setAvailableMonths(monthsData)
      
      // 預設選擇當前月份
      const currentMonth = new Date().toISOString().slice(0, 7)
      const monthStrings = monthsData.map(m => m.month)
      
      if (monthStrings.includes(currentMonth)) {
        setSelectedMonth(currentMonth)
      } else if (monthsData.length > 0) {
        setSelectedMonth(monthsData[0].month)
      }
    } catch (error) {
      console.error('載入月份列表失敗:', error)
      showToast('載入月份列表失敗', 'error')
    }
  }
  
  async function loadSummary() {
    try {
      setLoading(true)
      const response = await getMonthlySelectionSummary(selectedMonth)
      
      // v3 API 返回 customerLists 而非 summaries
      if (response.data.customerLists) {
        // 轉換為舊格式以保持前端兼容，同時添加變更追蹤
        setSummaryData({
          ...response.data,
          summaries: response.data.customerLists.map(list => ({
            customer: list.customer,
            currentSelection: list.currentList.videoCount > 0 ? {
              videoCount: list.currentList.videoCount,
              submittedAt: list.lastUpdate,
              videos: list.currentList.videos
            } : null,
            previousSelection: null,
            diff: {
              // 使用最後一次變更記錄中的新增/移除影片
              added: list.lastChange?.addedVideos || [],
              removed: list.lastChange?.removedVideos || [],
              kept: list.currentList.videos || [],
              addedCount: list.lastChange?.addedCount || 0,
              removedCount: list.lastChange?.removedCount || 0,
              keptCount: list.currentList.videoCount
            },
            // 添加最後變更的完整資訊
            lastChange: list.lastChange
          }))
        })
      } else {
        setSummaryData(response.data)
      }
    } catch (error) {
      console.error('載入清單失敗:', error)
      showToast('載入清單失敗，請稍後再試', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${month}月`
  }

  function formatDateTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  function toggleExpand(customerId) {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }
  
  // 篩選客戶
  const filteredSummaries = summaryData?.summaries?.filter(summary => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      summary.customer.name?.toLowerCase().includes(term) ||
      summary.customer.email?.toLowerCase().includes(term)
    )
  }) || []
  
  // 統計資訊
  const totalCustomers = summaryData?.summaries?.length || 0
  const submittedCount = summaryData?.summaries?.filter(s => s.currentSelection)?.length || 0
  const pendingCount = totalCustomers - submittedCount
  
  return (
    <div className="space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">客戶清單總覽</h1>
        <p className="text-gray-600 mt-2">查看所有客戶的當前累積清單（v3 架構：不再按月份劃分）</p>
      </div>
      
      {/* 控制列 */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* 月份選擇 */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="w-48">
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={availableMonths.map(monthData => ({ 
                  value: monthData.month, 
                  label: `${formatMonth(monthData.month)} - ${monthData.batchName}` 
                }))}
                placeholder="選擇月份"
                disabled={loading}
              />
            </div>
          </div>
          
          {/* 搜尋 */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋客戶名稱或 Email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* 統計卡片 */}
        {summaryData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalCustomers}</div>
              <div className="text-sm text-gray-500">總客戶數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{submittedCount}</div>
              <div className="text-sm text-gray-500">已提交</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <div className="text-sm text-gray-500">待提交</div>
            </div>
          </div>
        )}
      </div>
      
      {/* 載入中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader className="h-12 w-12 text-primary-600 animate-spin" />
        </div>
      )}
      
      {/* 無資料 */}
      {!loading && (!summaryData || filteredSummaries.length === 0) && (
        <div className="card text-center py-12">
          <Film className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {searchTerm ? '找不到符合的客戶' : '尚無選擇資料'}
          </h2>
          <p className="text-gray-600">
            {searchTerm 
              ? '請嘗試其他搜尋關鍵字' 
              : `${formatMonth(selectedMonth)}目前沒有客戶提交選擇`}
          </p>
        </div>
      )}
      
      {/* 客戶清單 */}
      {!loading && summaryData && filteredSummaries.length > 0 && (
        <div className="space-y-4">
          {filteredSummaries.map((summary) => {
            const isExpanded = expandedCustomers.has(summary.customer.id)
            const hasPrevious = summary.previousSelection !== null
            const hasCurrent = summary.currentSelection !== null
            
            return (
              <div key={summary.customer.id} className="card">
                {/* 客戶標題列 */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-6 p-6 rounded-2xl transition-colors"
                  onClick={() => toggleExpand(summary.customer.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* 客戶資訊 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900">
                        {summary.customer.name || summary.customer.email}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {summary.customer.email}
                      </p>
                    </div>
                    
                    {/* 狀態標籤 */}
                    <div className="flex items-center gap-2">
                      {hasCurrent ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                          已提交
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-amber-50 text-amber-700">
                          <AlertCircle className="h-4 w-4" />
                          待提交
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 展開按鈕 */}
                  <button className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {/* 展開內容 */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                    {hasCurrent ? (
                      <>
                          <div className="rounded-2xl border border-gray-100 bg-white/70 p-5 space-y-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{summary.customer.email}</p>
                              <h4 className="text-xl font-semibold text-gray-900">
                                當前累積清單
                              </h4>
                              {summary.lastChange && (
                                <p className="text-sm text-gray-500">
                                  最後更新：{formatDateTime(summary.lastChange.date)}
                                </p>
                              )}
                            </div>
                            <div className="grid w-full gap-3 md:max-w-xl md:grid-cols-3">
                              <StatCard
                                icon={Layers}
                                label="目前擁有"
                                value={`${summary.currentSelection.videoCount || 0} 部`}
                              />
                              <StatCard
                                icon={PlusCircle}
                                accent="green"
                                label="最近新增"
                                value={`${summary.diff?.addedCount || 0} 部`}
                              />
                              <StatCard
                                icon={MinusCircle}
                                accent="red"
                                label="最近移除"
                                value={`${summary.diff?.removedCount || 0} 部`}
                              />
                            </div>
                          </div>
                          {summary.currentSelection.submittedAt && (
                            <p className="text-xs text-gray-500">
                              最後更新：{formatDateTime(summary.currentSelection.submittedAt)}
                            </p>
                          )}
                        </div>
                        
                        {/* 最近變更詳情 */}
                        {summary.lastChange && (summary.diff.addedCount > 0 || summary.diff.removedCount > 0) && (
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
                            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Film className="h-5 w-5 text-blue-600" />
                              最近一次變更明細
                              <span className="text-sm text-gray-500 font-normal">
                                ({formatDateTime(summary.lastChange.date)})
                              </span>
                            </h5>
                            <div className="grid gap-4 md:grid-cols-2">
                              {summary.diff.addedCount > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
                                    <PlusCircle className="h-4 w-4" />
                                    新增 {summary.diff.addedCount} 部影片
                                  </p>
                                  <div className="space-y-1">
                                    {summary.diff.added.slice(0, 5).map((video, idx) => (
                                      <div key={idx} className="text-sm text-gray-700 pl-5">
                                        • {video.title || video.title_en || '未知影片'}
                                      </div>
                                    ))}
                                    {summary.diff.added.length > 5 && (
                                      <div className="text-sm text-gray-500 pl-5">
                                        ...還有 {summary.diff.added.length - 5} 部
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {summary.diff.removedCount > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                                    <MinusCircle className="h-4 w-4" />
                                    移除 {summary.diff.removedCount} 部影片
                                  </p>
                                  <div className="space-y-1">
                                    {summary.diff.removed.slice(0, 5).map((video, idx) => (
                                      <div key={idx} className="text-sm text-gray-700 pl-5">
                                        • {video.title || video.title_en || '未知影片'}
                                      </div>
                                    ))}
                                    {summary.diff.removed.length > 5 && (
                                      <div className="text-sm text-gray-500 pl-5">
                                        ...還有 {summary.diff.removed.length - 5} 部
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                                <Film className="h-4 w-4" />
                              </span>
                              當月擁有的片單
                            </h5>
                            <span className="text-sm text-gray-500">
                              共 {summary.currentSelection.videoCount || 0} 部
                            </span>
                          </div>
                          {summary.currentSelection.videos?.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                              {summary.currentSelection.videos.map((video) => (
                                <div
                                  key={video.id}
                                  className="group relative aspect-[2/3] rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                >
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt={video.title} className="h-full w-full rounded-2xl object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Film className="h-8 w-8 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from黑/80 to-transparent p-3">
                                    <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
                                    {video.title_en && (
                                      <p className="text-xs text-white/70 line-clamp-1">{video.title_en}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
                              此月份尚未選擇任何影片
                            </div>
                          )}
                        </div>
                        <div className="grid gap-6 lg:grid-cols-2">
                          <SelectionDiffSection
                            title="本月新增的片單"
                            highlightColor="green"
                            videos={summary.diff?.added || []}
                            emptyText="本月未新增影片"
                          />
                          <SelectionDiffSection
                            title="本月下架的片單"
                            highlightColor="red"
                            videos={summary.diff?.removed || []}
                            emptyText="本月沒有下架影片"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>此客戶尚未提交 {formatMonth(selectedMonth)} 的片單</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent = 'primary' }) {
  const accentStyles = {
    primary: 'text-primary-600',
    green: 'text-green-600',
    red: 'text-red-600'
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`rounded-full bg-gray-50 p-2 shadow-sm ${accentStyles[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}




