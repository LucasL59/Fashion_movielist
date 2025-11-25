/**
 * 管理員已選片單摘要頁面
 * 
 * 顯示指定月份所有客戶的選擇清單與異動
 */

import { useState, useEffect } from 'react'
import { Calendar, Film, Search, Loader, AlertCircle, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, CheckCircle, X } from 'lucide-react'
import { getMonthlySelectionSummary, getAvailableMonths } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import Select from '../components/Select'

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
      const months = response.data || []
      setAvailableMonths(months)
      
      // 預設選擇當前月份
      const currentMonth = new Date().toISOString().slice(0, 7)
      if (months.includes(currentMonth)) {
        setSelectedMonth(currentMonth)
      } else if (months.length > 0) {
        setSelectedMonth(months[0])
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
      setSummaryData(response.data)
    } catch (error) {
      console.error('載入摘要失敗:', error)
      showToast('載入摘要失敗，請稍後再試', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${month}月`
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
        <h1 className="text-3xl font-bold text-gray-900">已選片單總覽</h1>
        <p className="text-gray-600 mt-2">查看各客戶的月份選擇與異動明細</p>
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
                options={availableMonths.map(month => ({ 
                  value: month, 
                  label: formatMonth(month) 
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
                    
                    {/* 數量摘要 */}
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                      {hasPrevious && (
                        <div className="text-center">
                          <div className="font-semibold text-gray-700">
                            {summary.previousSelection.videoCount}
                          </div>
                          <div className="text-xs text-gray-500">上月</div>
                        </div>
                      )}
                      {hasCurrent && (
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">
                            {summary.currentSelection.videoCount}
                          </div>
                          <div className="text-xs text-gray-500">本月</div>
                        </div>
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
                    {/* 異動摘要 */}
                    {hasPrevious && hasCurrent && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          異動摘要
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-xl font-bold">{summary.diff.removedCount}</span>
                            </div>
                            <div className="text-xs text-gray-600">下架</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-xl font-bold">{summary.diff.addedCount}</span>
                            </div>
                            <div className="text-xs text-gray-600">新增</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                              <Minus className="h-4 w-4" />
                              <span className="text-xl font-bold">{summary.diff.keptCount}</span>
                            </div>
                            <div className="text-xs text-gray-600">保留</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 本月選擇 */}
                    {hasCurrent && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                          本月選擇 ({summary.currentSelection.videoCount} 部)
                          {summary.currentSelection.submittedAt && (
                            <span className="text-xs text-gray-500 font-normal ml-2">
                              提交於 {new Date(summary.currentSelection.submittedAt).toLocaleString('zh-TW')}
                            </span>
                          )}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {summary.currentSelection.videos.map((video, index) => {
                            const isAdded = summary.diff.added.some(v => v.id === video.id)
                            return (
                              <div 
                                key={video.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border ${
                                  isAdded 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="text-sm text-gray-500 font-medium w-8">
                                  {index + 1}.
                                </div>
                                <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                                  {video.title_en && (
                                    <div className="text-xs text-gray-500">{video.title_en}</div>
                                  )}
                                </div>
                                {isAdded && (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full flex-shrink-0">
                                    新增
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* 上月選擇 */}
                    {hasPrevious && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          上月選擇 ({summary.previousSelection.videoCount} 部)
                          {summary.previousSelection.submittedAt && (
                            <span className="text-xs text-gray-500 font-normal ml-2">
                              提交於 {new Date(summary.previousSelection.submittedAt).toLocaleString('zh-TW')}
                            </span>
                          )}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {summary.previousSelection.videos.map((video, index) => {
                            const isRemoved = summary.diff.removed.some(v => v.id === video.id)
                            const isKept = summary.diff.kept.some(v => v.id === video.id)
                            return (
                              <div 
                                key={video.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border ${
                                  isRemoved 
                                    ? 'bg-red-50 border-red-200' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="text-sm text-gray-500 font-medium w-8">
                                  {index + 1}.
                                </div>
                                <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Film className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                                  {video.title_en && (
                                    <div className="text-xs text-gray-500">{video.title_en}</div>
                                  )}
                                </div>
                                {isRemoved && (
                                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1">
                                    <X className="h-3 w-3" />
                                    已下架
                                  </span>
                                )}
                                {isKept && (
                                  <span className="text-xs bg-gray-500 text-white px-2 py-1 rounded-full flex-shrink-0">
                                    保留
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* 無選擇提示 */}
                    {!hasCurrent && !hasPrevious && (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>此客戶尚未提交任何選擇</p>
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

