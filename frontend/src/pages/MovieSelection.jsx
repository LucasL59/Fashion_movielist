/**
 * 影片選擇頁面 - 累積清單模式
 * 
 * 支援跨月選擇、累積清單管理、明確提交
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Film, CheckCircle, Loader, ShoppingCart, Calendar, Grid, List as ListIcon, Send, X, AlertTriangle } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import Select from '../components/Select'
import BrandTransition from '../components/BrandTransition'
import { 
  getAvailableMonths, 
  getVideosByMonth,
  getCustomerList,
  updateCustomerList,
  submitCustomerList
} from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function MovieSelection() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  // 當前月份影片
  const [batch, setBatch] = useState(null)
  const [monthlyVideos, setMonthlyVideos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 月份選擇
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMonths, setLoadingMonths] = useState(true)
  
  // 客戶累積清單
  const [customerList, setCustomerList] = useState([])
  const [customerVideoIds, setCustomerVideoIds] = useState(new Set())
  const [loadingCustomerList, setLoadingCustomerList] = useState(false)
  
  // 待處理變更（未提交）
  const [pendingChanges, setPendingChanges] = useState({
    add: new Set(),
    remove: new Set()
  })
  
  // 提交狀態
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // 視圖模式
  const [viewMode, setViewMode] = useState('grid')
  const [ownedViewMode, setOwnedViewMode] = useState('grid')
  
  // 分頁
  const PAGE_SIZE = 12
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllPages, setShowAllPages] = useState(false)

  // 計算當前選擇的 ID（累積清單 + 待處理新增 - 待處理移除）
  const currentSelectedIds = useMemo(() => {
    if (!customerVideoIds) return new Set()
    const ids = new Set(customerVideoIds)
    pendingChanges.add.forEach(id => ids.add(id))
    pendingChanges.remove.forEach(id => ids.delete(id))
    return ids
  }, [customerVideoIds, pendingChanges])

  // 檢查是否有未提交的變更
  const hasPendingChanges = useMemo(() => {
    return pendingChanges.add.size > 0 || pendingChanges.remove.size > 0
  }, [pendingChanges])

  // 計算差異用於顯示
  const changesForDisplay = useMemo(() => {
    const safeMonthlyVideos = Array.isArray(monthlyVideos) ? monthlyVideos : []
    const safeCustomerList = Array.isArray(customerList) ? customerList : []
    
    const addedVideos = safeMonthlyVideos.filter(v => pendingChanges.add.has(v.id))
    const removedVideos = safeCustomerList.filter(v => pendingChanges.remove.has(v.id))
    
    return {
      added: addedVideos,
      removed: removedVideos,
      addedCount: addedVideos.length,
      removedCount: removedVideos.length
    }
  }, [monthlyVideos, customerList, pendingChanges])

  // 載入月份列表
  useEffect(() => {
    loadMonths()
  }, [])

  // 載入客戶累積清單
  useEffect(() => {
    if (user) {
      loadCustomerList()
    }
  }, [user])

  // 載入選定月份的影片
  useEffect(() => {
    if (selectedMonth) {
      loadVideosBySelectedMonth(selectedMonth)
    }
  }, [selectedMonth])

  // 頁面卸載前提示
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasPendingChanges) {
        e.preventDefault()
        e.returnValue = '您有未保存的變更，確定要離開嗎？'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasPendingChanges])

  async function loadMonths() {
    try {
      setLoadingMonths(true)
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
      console.error('❌ 載入月份列表失敗:', error)
      showToast('載入月份列表失敗', 'error')
    } finally {
      setLoadingMonths(false)
    }
  }

  async function loadCustomerList() {
    if (!user?.id) return
    
    try {
      setLoadingCustomerList(true)
      const response = await getCustomerList(user.id)
      
      // 確保 response 和 response.data 存在
      if (!response || typeof response !== 'object') {
        console.error('⚠️ getCustomerList 返回了無效的響應:', response)
        setCustomerList([])
        setCustomerVideoIds(new Set())
        return
      }

      if (response.success && response.data && Array.isArray(response.data)) {
        setCustomerList(response.data)
        const videoIds = new Set(response.data.map(v => v.id))
        setCustomerVideoIds(videoIds)
        console.log(`✅ 已載入客戶清單: ${response.data.length} 部影片`)
      } else {
        // 沒有資料或格式不正確，初始化為空陣列
        setCustomerList([])
        setCustomerVideoIds(new Set())
        console.log('ℹ️ 客戶尚未建立清單（響應格式不符或無數據）')
      }
    } catch (error) {
      console.error('❌ 載入客戶清單失敗:', error)
      // 初始化為空陣列，避免 undefined 錯誤
      setCustomerList([])
      setCustomerVideoIds(new Set())
      // 只在非 404 錯誤時顯示 toast
      if (error.response?.status !== 404) {
        showToast('載入您的影片清單失敗', 'error')
      }
    } finally {
      setLoadingCustomerList(false)
    }
  }

  async function loadVideosBySelectedMonth(month) {
    try {
      setLoading(true)
      console.log(`🔍 載入 ${month} 的影片...`)
      
      const response = await getVideosByMonth(month)
      
      if (response.success) {
        setBatch(response.data.batch)
        const videos = response.data.videos || []
        setMonthlyVideos(videos)
        setCurrentPage(1)
        setShowAllPages(false)
        
        console.log(`✅ 已載入 ${videos.length} 部影片`)
      }
    } catch (error) {
      console.error('❌ 載入影片失敗:', error)
      showToast('載入影片清單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle(videoId) {
    if (submitting) return
    
    const isInCustomerList = customerVideoIds.has(videoId)
    const isInPendingAdd = pendingChanges.add.has(videoId)
    const isInPendingRemove = pendingChanges.remove.has(videoId)
    
    setPendingChanges(prev => {
      const newAdd = new Set(prev.add)
      const newRemove = new Set(prev.remove)
      
      if (isInCustomerList) {
        // 已在累積清單中
        if (isInPendingRemove) {
          // 取消移除 = 恢復
          newRemove.delete(videoId)
        } else {
          // 標記為移除
          newRemove.add(videoId)
        }
      } else {
        // 不在累積清單中
        if (isInPendingAdd) {
          // 取消新增
          newAdd.delete(videoId)
        } else {
          // 標記為新增
          newAdd.add(videoId)
        }
      }
      
      return { add: newAdd, remove: newRemove }
    })
  }

  function handleSubmitClick() {
    if (!hasPendingChanges) {
      showToast('沒有需要提交的變更', 'info')
      return
    }
    setShowConfirmModal(true)
  }

  async function handleSubmit() {
    if (!user?.id) return
    
    try {
      setSubmitting(true)
      setShowConfirmModal(false)
      
      const addVideoIds = Array.from(pendingChanges.add)
      const removeVideoIds = Array.from(pendingChanges.remove)
      
      console.log(`📤 提交變更: 新增 ${addVideoIds.length} 部，移除 ${removeVideoIds.length} 部`)
      
      // 1. 更新客戶清單
      await updateCustomerList(user.id, {
        addVideoIds,
        removeVideoIds,
        month: selectedMonth
      })
      
      // 2. 提交清單（記錄歷史快照）
      const addedVideosDetails = (changesForDisplay?.added || []).map(v => ({
        id: v.id,
        title: v.title,
        title_en: v.title_en
      }))
      
      const removedVideosDetails = (changesForDisplay?.removed || []).map(v => ({
        id: v.id,
        title: v.title,
        title_en: v.title_en
      }))
      
      await submitCustomerList(user.id, {
        addedVideos: addedVideosDetails,
        removedVideos: removedVideosDetails
      })
      
      showToast('影片清單已成功提交！', 'success')
      
      // 3. 重新載入客戶清單
      await loadCustomerList()
      
      // 4. 清空待處理變更
      setPendingChanges({ add: new Set(), remove: new Set() })
      
    } catch (error) {
      console.error('❌ 提交失敗:', error)
      showToast('提交失敗，請稍後再試', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${month}月`
  }

  // 分頁邏輯
  const totalPages = Math.ceil((monthlyVideos?.length || 0) / PAGE_SIZE)
  const displayedVideos = showAllPages 
    ? (monthlyVideos || []) 
    : (monthlyVideos || []).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  if (loadingMonths) {
    return <BrandTransition isVisible={true} />
  }

  return (
    <div className="space-y-8 pb-24">
      <BrandTransition isVisible={loading} />
      
      {/* 客戶累積清單區塊 */}
      {Array.isArray(customerList) && customerList.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-blue-200/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">目前的影片清單</h3>
                <p className="text-sm text-gray-500">
                  共 {currentSelectedIds.size} 部影片 · 點擊可取消選擇
                </p>
              </div>
            </div>
            
            {/* 視圖切換 */}
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center flex-shrink-0">
              <button
                onClick={() => setOwnedViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  ownedViewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOwnedViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  ownedViewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {ownedViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {(customerList || []).map((video) => {
                const isSelected = currentSelectedIds.has(video.id)
                const isPendingRemove = pendingChanges.remove.has(video.id)
                
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggle(video.id)}
                    className={`relative bg-white rounded-xl overflow-hidden transition-all duration-200 border-2 cursor-pointer hover:shadow-lg ${
                      isSelected && !isPendingRemove
                        ? 'border-blue-400 shadow-md'
                        : 'border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="aspect-[2/3] bg-gray-100 overflow-hidden relative">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Film className="h-8 w-8" />
                        </div>
                      )}
                      
                      {isSelected && !isPendingRemove ? (
                        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="bg-blue-500 text-white rounded-full p-1.5">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="bg-red-500 text-white rounded-full p-1.5">
                            <X className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2">
                      <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{video.title}</h4>
                      {video.title_en && (
                        <p className="text-xs text-gray-500 line-clamp-1">{video.title_en}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(customerList || []).map((video) => {
                const isSelected = currentSelectedIds.has(video.id)
                const isPendingRemove = pendingChanges.remove.has(video.id)
                
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggle(video.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                      isSelected && !isPendingRemove
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 border-2 border-transparent opacity-60'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${isSelected && !isPendingRemove ? 'text-blue-500' : 'text-red-500'}`}>
                      {isSelected && !isPendingRemove ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{video.title}</h4>
                      {video.title_en && (
                        <p className="text-sm text-gray-500">{video.title_en}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 月份選擇 */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">選擇月份</h3>
              <p className="text-sm text-gray-500">從任何月份選擇影片加入您的清單</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableMonths.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedMonth === month
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {formatMonth(month)}
            </button>
          ))}
        </div>
      </div>

      {/* 當前月份影片清單 */}
      {batch && (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{batch.name}</h2>
              <p className="text-gray-500 mt-1">
                共 {(monthlyVideos || []).length} 部影片 · 已選擇 {currentSelectedIds.size} 部
              </p>
            </div>
            
            {/* 視圖切換 */}
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 影片列表 */}
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            : "space-y-2"
          }>
            {displayedVideos.map((video) => {
              const isSelected = currentSelectedIds.has(video.id)
              const isAlreadyOwned = customerVideoIds.has(video.id)
              const isPendingAdd = pendingChanges.add.has(video.id)
              
              return viewMode === 'grid' ? (
                <MovieCard
                  key={video.id}
                  video={video}
                  isSelected={isSelected}
                  isAlreadyOwned={isAlreadyOwned}
                  onToggle={handleToggle}
                  disabled={submitting}
                />
              ) : (
                <div
                  key={video.id}
                  onClick={() => handleToggle(video.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-300'}`}>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{video.title}</h4>
                    {video.title_en && (
                      <p className="text-sm text-gray-500">{video.title_en}</p>
                    )}
                  </div>
                  {isAlreadyOwned && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">已擁有</span>
                  )}
                  {isPendingAdd && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">新增</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 分頁 */}
          {totalPages > 1 && !showAllPages && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {pageNumbers.map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === num
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setShowAllPages(true)}
                className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
              >
                顯示全部
              </button>
            </div>
          )}
        </div>
      )}

      {/* 懸浮提交按鈕 */}
      {hasPendingChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader className="h-6 w-6 animate-spin" />
                處理中...
              </>
            ) : (
              <>
                <Send className="h-6 w-6" />
                提交變更 ({changesForDisplay.addedCount + changesForDisplay.removedCount})
              </>
            )}
          </button>
        </div>
      )}

      {/* 懸浮計數器 */}
      {(hasPendingChanges || currentSelectedIds.size > 0) && (
        <div className="fixed bottom-24 right-6 bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200 z-40">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{currentSelectedIds.size}</div>
            <div className="text-sm text-gray-500">已選擇影片</div>
            {hasPendingChanges && (
              <div className="mt-2 text-xs text-orange-600 flex items-center gap-1 justify-center">
                <AlertTriangle className="h-3 w-3" />
                有未保存的變更
              </div>
            )}
          </div>
        </div>
      )}

      {/* 確認 Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">確認提交變更</h3>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {/* 新增的影片 */}
              {changesForDisplay.addedCount > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-3">
                    ✅ 新增 {changesForDisplay.addedCount} 部影片
                  </h4>
                  <div className="space-y-2">
                    {(changesForDisplay?.added || []).map(v => (
                      <div key={v.id} className="text-sm text-gray-700 bg-green-50 p-2 rounded">
                        {v.title} {v.title_en ? `(${v.title_en})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 移除的影片 */}
              {changesForDisplay.removedCount > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-3">
                    ❌ 移除 {changesForDisplay.removedCount} 部影片
                  </h4>
                  <div className="space-y-2">
                    {(changesForDisplay?.removed || []).map(v => (
                      <div key={v.id} className="text-sm text-gray-700 bg-red-50 p-2 rounded">
                        {v.title} {v.title_en ? `(${v.title_en})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  提交後，您的影片清單將更新為 <strong className="text-blue-600">{currentSelectedIds.size} 部影片</strong>。
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? '處理中...' : '確認提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
