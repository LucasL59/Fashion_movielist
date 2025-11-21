/**
 * 影片選擇頁面
 * 
 * 顯示影片清單並允許客戶選擇，支援月份選擇
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Film, CheckCircle, AlertCircle, Loader, ShoppingCart, Calendar, Grid, List as ListIcon } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import { getLatestVideos, getVideosByMonth, getAvailableMonths, submitSelection } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function MovieSelection() {
  const { user } = useAuth()
  const [batch, setBatch] = useState(null)
  const [videos, setVideos] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  // 月份選擇相關
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMonths, setLoadingMonths] = useState(true)
  
  // 視圖模式：'grid' 或 'list'
  const [viewMode, setViewMode] = useState('grid')
  
  // 分頁設定
  const PAGE_SIZE = 10
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
      // 查詢用戶在當前批次的選擇記錄
      const { data, error } = await supabase
        .from('selections')
        .select('video_ids')
        .eq('user_id', user.id)
        .eq('batch_id', batch.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        // 如果沒有找到記錄，這是正常的
        if (error.code === 'PGRST116') {
          return
        }
        throw error
      }
      
      // 設定已選擇的影片
      if (data && data.video_ids) {
        setSelectedIds(data.video_ids)
      }
    } catch (error) {
      console.error('載入之前的選擇失敗:', error)
      // 不顯示錯誤，因為這不是關鍵功能
    }
  }
  
  async function loadMonths() {
    try {
      setLoadingMonths(true)
      const response = await getAvailableMonths()
      const months = response.data || []
      setAvailableMonths(months)
      
      // 預設選擇當月
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      if (months.includes(currentMonth)) {
        setSelectedMonth(currentMonth)
      } else if (months.length > 0) {
        // 如果當月沒有，選擇最新的月份
        setSelectedMonth(months[0])
      } else {
        // 沒有任何月份，載入最新的
        loadVideos()
      }
    } catch (error) {
      console.error('載入月份列表失敗:', error)
      // 如果載入月份失敗，直接載入最新影片
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
      setError('載入影片清單失敗')
    } finally {
      setLoading(false)
    }
  }
  
  async function loadVideosByMonth(month) {
    try {
      setLoading(true)
      setError('')
      const response = await getVideosByMonth(month)
      setBatch(response.data.batch)
      setVideos(response.data.videos || [])
      // 清除之前的選擇
      setSelectedIds([])
      setCurrentPage(1)
      setShowAllPages(false)
    } catch (error) {
      console.error('載入影片失敗:', error)
      setError('載入影片清單失敗')
    } finally {
      setLoading(false)
    }
  }
  
  function handleToggle(videoId) {
    setSelectedIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    )
    setSuccess(false)
    setError('')
  }
  
  async function handleSubmit() {
    if (selectedIds.length === 0) {
      setError('請至少選擇一部影片')
      return
    }
    
    if (!batch) {
      setError('無法提交：批次資訊不存在')
      return
    }
    
    try {
      setSubmitting(true)
      setError('')
      await submitSelection({
        userId: user.id,
        batchId: batch.id,
        videoIds: selectedIds,
        customerName: user.name,
        customerEmail: user.email,
      })
      setSuccess(true)
      
      // 5 秒後清除成功訊息
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('提交失敗:', error)
      setError(error.response?.data?.message || '提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }
  
  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
  }

  const totalPages = useMemo(() => {
    return Math.ceil(videos.length / PAGE_SIZE)
  }, [videos.length])

  useEffect(() => {
    if (!showAllPages && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages || 1)
    }
  }, [totalPages, showAllPages, currentPage])

  const displayedVideos = useMemo(() => {
    if (showAllPages) {
      return videos
    }
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return videos.slice(startIndex, startIndex + PAGE_SIZE)
  }, [videos, currentPage, showAllPages])

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }, [totalPages])

  const rangeStart = videos.length === 0 ? 0 : (showAllPages ? 1 : (currentPage - 1) * PAGE_SIZE + 1)
  const rangeEnd = showAllPages ? videos.length : Math.min(currentPage * PAGE_SIZE, videos.length)

  function handlePageSelect(pageNumber) {
    setShowAllPages(false)
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleShowAllPages() {
    setShowAllPages((prev) => !prev)
  }
  
  if (loadingMonths || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* 標題與控制列 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">影片選擇</h1>
            <p className="text-gray-600 mt-2">
              {batch ? `${batch.name}` : '請選擇月份查看影片清單'}
            </p>
          </div>
          
          {/* 月份選擇器 */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="select min-w-[150px]"
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* 視圖切換按鈕 */}
        {videos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">顯示模式：</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="大圖模式"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="清單模式"
            >
              <ListIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* 成功訊息 */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-800 font-medium">提交成功！</p>
            <p className="text-sm text-green-700 mt-1">
              您的選擇已經發送給管理員，我們會盡快為您準備影片。
            </p>
          </div>
        </div>
      )}
      
      {/* 影片清單 */}
      {!batch || videos.length === 0 ? (
        <div className="card text-center py-12">
          <Film className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">暫無影片清單</h2>
          <p className="text-gray-600">
            {selectedMonth ? `${formatMonth(selectedMonth)}沒有可選擇的影片` : '目前沒有可選擇的影片'}
          </p>
        </div>
      ) : (
        <>
          {/* 選擇統計 */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-primary-600" />
                <div>
                  <p className="text-sm text-gray-600">已選擇</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {selectedIds.length} <span className="text-base font-normal text-gray-600">部影片</span>
                  </p>
                </div>
              </div>
              
              {selectedIds.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex-shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      提交選擇
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {videos.length > 0 && totalPages > 0 && (
            <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">頁面：</span>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageSelect(page)}
                    className={`px-3 py-1 rounded-lg text-sm border ${
                      currentPage === page && !showAllPages
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-primary-100 text-gray-700 hover:border-primary-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>
                  {videos.length === 0
                    ? '沒有影片'
                    : `顯示第 ${rangeStart}-${rangeEnd} 部，共 ${videos.length} 部`}
                </span>
                {videos.length > PAGE_SIZE && (
                  <button
                    onClick={toggleShowAllPages}
                    className="btn btn-secondary btn-sm"
                  >
                    {showAllPages ? '分頁顯示' : '顯示全部'}
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* 影片顯示 - 大圖模式 */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedVideos.map((video) => (
                <MovieCard
                  key={video.id}
                  video={video}
                  isSelected={selectedIds.includes(video.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
          
          {/* 影片顯示 - 清單模式 */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {displayedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleToggle(video.id)}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${
                    selectedIds.includes(video.id)
                      ? 'ring-2 ring-primary-600 bg-primary-50'
                      : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* 縮圖 */}
                    <div className="flex-shrink-0 w-24 h-36 bg-gray-100 rounded-lg overflow-hidden">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* 資訊 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">
                            {video.title}
                          </h3>
                          {video.title_en && (
                            <p className="text-sm text-gray-500 mb-2">
                              {video.title_en}
                            </p>
                          )}
                          {video.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {video.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {video.director && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                導演: {video.director}
                              </span>
                            )}
                            {video.duration && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                {video.duration}
                              </span>
                            )}
                            {video.rating && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                {video.rating}
                              </span>
                            )}
                            {video.language && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                {video.language}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* 選中標記 */}
                        {selectedIds.includes(video.id) && (
                          <div className="flex-shrink-0">
                            <div className="bg-primary-600 text-white rounded-full p-2">
                              <CheckCircle className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* 浮動提交按鈕（移動端） */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 sm:hidden">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary shadow-lg"
          >
            {submitting ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                提交 ({selectedIds.length})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
