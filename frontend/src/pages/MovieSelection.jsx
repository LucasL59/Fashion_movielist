/**
 * 影片選擇頁面 - Modern Refined
 * 
 * 顯示影片清單並允許客戶選擇，支援月份選擇
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, CheckCircle, AlertCircle, Loader, ShoppingCart, Calendar, Grid, List as ListIcon, Filter, Send, History, X } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import Select from '../components/Select'
import BrandTransition from '../components/BrandTransition'
import { getLatestVideos, getAvailableMonths, submitSelection, getPreviousSelection, getCurrentOwnedVideos } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function MovieSelection() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [batch, setBatch] = useState(null)
  const [videos, setVideos] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // 月份選擇相關
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMonths, setLoadingMonths] = useState(true)
  
  const [viewMode, setViewMode] = useState('grid')
  
  // 目前擁有的片單相關
  const [ownedVideos, setOwnedVideos] = useState([])
  const [ownedVideoIds, setOwnedVideoIds] = useState([])
  const [loadingOwned, setLoadingOwned] = useState(false)
  const [ownedViewMode, setOwnedViewMode] = useState('grid') // grid 或 list
  
  // 上月選擇相關（用於郵件通知差異計算）
  const [previousSelection, setPreviousSelection] = useState(null)
  const [previousVideos, setPreviousVideos] = useState([])
  const [previousVideoIds, setPreviousVideoIds] = useState([])
  
  // 分頁設定
  const PAGE_SIZE = 12 // Increased for grid layout
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllPages, setShowAllPages] = useState(false)
  
  // 確認 Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  useEffect(() => {
    loadMonths()
  }, [])
  
  useEffect(() => {
    if (selectedMonth) {
      loadVideosByMonth(selectedMonth)
    }
  }, [selectedMonth])
  
  // 載入當月已選擇的影片與目前擁有的片單
  useEffect(() => {
    if (batch && user) {
      loadCurrentAndOwnedSelection()
    }
  }, [batch, user])
  
  async function loadCurrentAndOwnedSelection() {
    try {
      // 載入當月已選擇的影片
      const { data, error } = await supabase
        .from('selections')
        .select('video_ids')
        .eq('user_id', user.id)
        .eq('batch_id', batch.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data && data.video_ids) {
        setSelectedIds(data.video_ids)
      }
      
      // 載入目前擁有的所有片單
      await loadOwnedVideos()
      
      // 載入上月選擇（用於郵件通知差異）
      await loadPreviousMonthSelection()
    } catch (error) {
      console.error('載入選擇失敗:', error)
    }
  }
  
  async function loadOwnedVideos() {
    if (!user || !user.id) return
    
    try {
      setLoadingOwned(true)
      const response = await getCurrentOwnedVideos(user.id)
      
      if (response.success && response.data) {
        const { ownedVideos: owned, ownedVideoIds: ownedIds } = response.data
        
        if (owned && owned.length > 0) {
          setOwnedVideos(owned)
          setOwnedVideoIds(ownedIds)
          
          // 預選目前擁有的影片
          setSelectedIds(prev => {
            const combined = [...new Set([...prev, ...ownedIds])]
            return combined
          })
          
          console.log(`📋 載入目前擁有: ${owned.length} 部影片`)
        }
      }
    } catch (error) {
      console.error('載入擁有影片失敗:', error)
    } finally {
      setLoadingOwned(false)
    }
  }
  
  async function loadPreviousMonthSelection() {
    if (!batch || !batch.id) return
    
    try {
      const response = await getPreviousSelection(batch.id)
      
      if (response.success && response.data) {
        const { previousSelection: prevSel, previousVideos: prevVids } = response.data
        
        if (prevSel && prevVids && prevVids.length > 0) {
          setPreviousSelection(prevSel)
          setPreviousVideos(prevVids)
          setPreviousVideoIds(prevSel.video_ids || [])
        }
      }
    } catch (error) {
      console.error('載入上月選擇失敗:', error)
    }
  }
  
  async function loadMonths() {
    try {
      setLoadingMonths(true)
      const response = await getAvailableMonths()
      const months = response.data || []
      setAvailableMonths(months)
      
      const currentMonth = new Date().toISOString().slice(0, 7)
      if (months.includes(currentMonth)) {
        setSelectedMonth(currentMonth)
      } else if (months.length > 0) {
        setSelectedMonth(months[0])
      } else {
        loadVideos()
      }
    } catch (error) {
      console.error('載入月份列表失敗:', error)
      loadVideos()
    } finally {
      setLoadingMonths(false)
    }
  }
  
  async function loadVideos() {
    try {
      setLoading(true)
      const response = await getLatestVideos()
      setBatch(response.data.batch)
      setVideos(response.data.videos || [])
      setSelectedIds([])
      setCurrentPage(1)
      setShowAllPages(false)
    } catch (error) {
      console.error('載入影片失敗:', error)
      showToast('載入影片清單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  async function loadVideosByMonth(month) {
    try {
      setLoading(true)
      const { getVideosByMonth } = await import('../lib/api')
      let response;
      
      if (getVideosByMonth) {
        response = await getVideosByMonth(month)
      } else {
         response = await getLatestVideos()
      }
      
      setBatch(response.data.batch)
      setVideos(response.data.videos || [])
      
      // 清空資料
      setPreviousSelection(null)
      setPreviousVideos([])
      setPreviousVideoIds([])
      setOwnedVideos([])
      setOwnedVideoIds([])
      
      setSelectedIds([])
      setCurrentPage(1)
      setShowAllPages(false)
    } catch (error) {
      console.error('載入特定月份影片失敗:', error)
      showToast('載入影片清單失敗', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  function handleToggle(videoId) {
    if (submitting) return
    
    setSelectedIds(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId)
      } else {
        return [...prev, videoId]
      }
    })
  }
  
  function handleSubmitClick() {
    // 若有目前擁有的片單，先顯示確認 Modal
    if (ownedVideos.length > 0) {
      setShowConfirmModal(true)
    } else {
      handleSubmit()
    }
  }
  
  async function handleSubmit() {
    if (!batch) return
    
    try {
      setSubmitting(true)
      setShowConfirmModal(false)
      
      await submitSelection({ 
        userId: user.id,
        batchId: batch.id, 
        videoIds: selectedIds,
        customerName: user.name || user.email, // Fallback to email if name is missing
        customerEmail: user.email
      })
      
      showToast('影片選擇已提交成功！', 'success')
      
      // 重新載入擁有的片單
      await loadOwnedVideos()
    } catch (error) {
      console.error('提交選擇失敗:', error)
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
  const totalPages = Math.ceil(videos.length / PAGE_SIZE)
  const displayedVideos = showAllPages 
    ? videos 
    : videos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  // 計算差異
  const currentVideoIds = videos.map(v => v.id)
  const removedVideos = ownedVideos.filter(v => !selectedIds.includes(v.id))
  const addedVideos = videos.filter(v => selectedIds.includes(v.id) && !ownedVideoIds.includes(v.id))
  const keptVideos = ownedVideos.filter(v => selectedIds.includes(v.id))

  return (
    <div className="space-y-8 pb-24">
      <BrandTransition isVisible={loading || loadingMonths} />
      
      {/* 目前擁有的片單區塊 */}
      {ownedVideos.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border-2 border-blue-200/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">目前擁有的片單</h3>
                <p className="text-sm text-gray-500">共 {ownedVideos.length} 部影片 · 點擊可取消下架</p>
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
              {ownedVideos.map((video) => {
                const isStillSelected = selectedIds.includes(video.id)
                
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggle(video.id)}
                    className={`relative bg-white rounded-xl overflow-hidden transition-all duration-200 border-2 cursor-pointer hover:shadow-lg ${
                      isStillSelected
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
                      
                      {isStillSelected ? (
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
              {ownedVideos.map((video) => {
                const isStillSelected = selectedIds.includes(video.id)
                
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggle(video.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isStillSelected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="m-auto h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                      {video.title_en && (
                        <div className="text-xs text-gray-500">{video.title_en}</div>
                      )}
                    </div>
                    {isStillSelected ? (
                      <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {/* 說明提示 */}
      {ownedVideos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg flex-shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">選片說明</h4>
            <p className="text-sm text-blue-700">
              標示為 <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">已擁有</span> 的影片表示您已經選過，不需要重複選擇。若要下架這些影片，請在上方「目前擁有的片單」區塊中取消勾選。
            </p>
          </div>
        </div>
      )}
      
      {/* 頂部控制列 - Glass Panel */}
      <div className="sticky top-24 z-30 glass-panel rounded-2xl p-4 mb-8 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* 左側：月份選擇 */}
          <div className="flex items-center gap-3">
            <div className="w-[200px]">
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={availableMonths.map(month => ({ value: month, label: formatMonth(month) }))}
                placeholder="選擇月份"
              />
            </div>
            
            <div className="hidden md:block h-8 w-px bg-gray-200 mx-2"></div>
            
            <div className="flex items-center text-sm text-gray-500">
              <Filter className="h-4 w-4 mr-2" />
              <span>共 {videos.length} 部影片</span>
            </div>
          </div>

          {/* 右側：視圖切換與分頁 */}
          <div className="flex items-center gap-3 justify-end w-full md:w-auto">
            {/* 分頁按鈕 */}
            {totalPages > 1 && (
              <div className="flex bg-gray-100/80 p-1 rounded-xl items-center mr-2 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page)
                      setShowAllPages(false)
                    }}
                    className={`min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                      currentPage === page && !showAllPages
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                    onClick={() => setShowAllPages(!showAllPages)}
                    className={`px-3 h-8 rounded-lg text-xs font-medium transition-all ml-1 whitespace-nowrap ${
                      showAllPages
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    全部
                </button>
              </div>
            )}

            {/* 視圖切換 */}
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <ListIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 影片列表內容 */}
      {!loading && (!batch || videos.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-gray-100 p-6 rounded-full mb-6">
            <Film className="h-12 w-12 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">暫無影片</h2>
          <p className="text-gray-500 max-w-md">
            {selectedMonth ? `${formatMonth(selectedMonth)}目前沒有可供選擇的影片。` : '請稍後再回來查看。'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {displayedVideos.map((video) => (
                <MovieCard
                  key={video.id}
                  video={video}
                  isSelected={selectedIds.includes(video.id)}
                  onToggle={handleToggle}
                  isAlreadyOwned={ownedVideoIds.includes(video.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {displayedVideos.map((video) => {
                const isOwned = ownedVideoIds.includes(video.id)
                const isSelected = selectedIds.includes(video.id)
                
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggle(video.id)}
                    className={`group relative bg-white rounded-2xl p-4 flex gap-4 transition-all duration-200 hover:shadow-md cursor-pointer border ${
                      isSelected
                        ? isOwned
                          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10'
                          : 'border-primary-500 ring-1 ring-primary-500 bg-primary-50/10'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="w-24 h-36 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Film className="m-auto h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900">{video.title}</h3>
                            {isOwned && isSelected && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                已擁有
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{video.title_en}</p>
                        </div>
                        {isSelected && (
                          <div className={`rounded-full p-1 ${
                            isOwned ? 'bg-blue-500 text-white' : 'bg-primary-500 text-white'
                          }`}>
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{video.description}</p>
                      <div className="mt-auto pt-3 flex gap-3 text-xs text-gray-500">
                        {video.duration && <span>{video.duration} 分鐘</span>}
                        {video.rating && <span>{video.rating}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {createPortal(
        <div className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 py-3 px-4 transition-transform duration-300 z-[100] ${
          selectedIds.length > 0 ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 text-primary-700 p-2 rounded-lg">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">已選擇</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedIds.length} <span className="text-base font-normal text-gray-500">部影片</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIds([])}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 sm:hidden"
              >
                清除
              </button>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setSelectedIds([])}
                className="hidden sm:block btn-ghost text-sm"
              >
                清除全部
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={submitting || selectedIds.length === 0}
                className="btn-primary flex-1 sm:flex-none w-full sm:w-auto px-8 py-3 text-base shadow-lg shadow-primary-500/25"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="h-5 w-5 animate-spin" />
                    處理中...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    提交選擇
                    <Send className="h-5 w-5 ml-2" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 確認 Modal */}
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity animate-fade-in" 
            onClick={() => setShowConfirmModal(false)}
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <div 
            className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all border border-gray-100 animate-fade-in max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold leading-6 text-gray-900">
                  確認影片選擇異動
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none p-1 rounded-full hover:bg-gray-100"
                  onClick={() => setShowConfirmModal(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* 異動摘要 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">異動摘要</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700">{ownedVideos.length}</div>
                    <div className="text-xs text-gray-500">目前擁有</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedIds.length}</div>
                    <div className="text-xs text-gray-500">更新後總數</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{removedVideos.length}</div>
                    <div className="text-xs text-gray-500">將下架</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{addedVideos.length}</div>
                    <div className="text-xs text-gray-500">新增</div>
                  </div>
                </div>
              </div>
              
              {/* 將下架的影片 */}
              {removedVideos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    將下架的影片 ({removedVideos.length} 部)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {removedVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="m-auto h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                          {video.title_en && (
                            <div className="text-xs text-gray-500">{video.title_en}</div>
                          )}
                        </div>
                        <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 新增的影片 */}
              {addedVideos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    新增的影片 ({addedVideos.length} 部)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {addedVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="m-auto h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                          {video.title_en && (
                            <div className="text-xs text-gray-500">{video.title_en}</div>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 保留的影片 */}
              {keptVideos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    保留的影片 ({keptVideos.length} 部)
                  </h4>
                  <div className="space-y-2">
                    {keptVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="m-auto h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{video.title}</div>
                          {video.title_en && (
                            <div className="text-xs text-gray-500">{video.title_en}</div>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 按鈕 */}
              <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="btn-ghost px-6 py-2"
                  disabled={submitting}
                >
                  返回修改
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      處理中...
                    </>
                  ) : (
                    <>
                      確認送出
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
