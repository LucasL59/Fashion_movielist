/**
 * 影片選擇頁面 - Modern Refined
 * 
 * 顯示影片清單並允許客戶選擇，支援月份選擇
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, CheckCircle, AlertCircle, Loader, ShoppingCart, Calendar, Grid, List as ListIcon, Filter, Send } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import Select from '../components/Select'
import BrandTransition from '../components/BrandTransition'
import { getLatestVideos, getAvailableMonths, submitSelection } from '../lib/api'
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
  
  // 分頁設定
  const PAGE_SIZE = 12 // Increased for grid layout
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllPages, setShowAllPages] = useState(false)
  
  useEffect(() => {
    loadMonths()
  }, [])
  
  useEffect(() => {
    if (selectedMonth) {
      loadVideosByMonth(selectedMonth)
    }
  }, [selectedMonth])
  
  // 載入當月已選擇的影片
  useEffect(() => {
    if (batch && user) {
      loadPreviousSelection()
    }
  }, [batch, user])
  
  async function loadPreviousSelection() {
    try {
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
    } catch (error) {
      console.error('載入之前的選擇失敗:', error)
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
  
  async function handleSubmit() {
    if (!batch) return
    
    try {
      setSubmitting(true)
      
      await submitSelection({ 
        userId: user.id,
        batchId: batch.id, 
        videoIds: selectedIds,
        customerName: user.name || user.email, // Fallback to email if name is missing
        customerEmail: user.email
      })
      
      showToast('影片選擇已提交成功！', 'success')
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

  return (
    <div className="space-y-8 pb-24">
      <BrandTransition isVisible={loading || loadingMonths} />
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
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {displayedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleToggle(video.id)}
                  className={`group relative bg-white rounded-2xl p-4 flex gap-4 transition-all duration-200 hover:shadow-md cursor-pointer border ${
                    selectedIds.includes(video.id)
                      ? 'border-primary-500 ring-1 ring-primary-500 bg-primary-50/10'
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
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{video.title}</h3>
                        <p className="text-sm text-gray-500">{video.title_en}</p>
                      </div>
                      {selectedIds.includes(video.id) && (
                        <div className="bg-primary-500 text-white rounded-full p-1">
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
              ))}
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
                onClick={handleSubmit}
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
    </div>
  )
}
