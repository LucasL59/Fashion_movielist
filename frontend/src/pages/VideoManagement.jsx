/**
 * 影片管理頁面（Admin 和 Uploader）
 * 
 * 查看和編輯影片清單
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Film, Calendar, Loader, AlertCircle, Edit } from 'lucide-react'
import MovieCard from '../components/MovieCard'
import VideoEditModal from '../components/VideoEditModal'
import BrandTransition from '../components/BrandTransition'
import { getLatestVideos, getVideosByMonth, getAvailableMonths } from '../lib/api'
import Select from '../components/Select'

export default function VideoManagement() {
  const { user } = useAuth()
  const [batch, setBatch] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 分頁設定
  const PAGE_SIZE = 12
  const [currentPage, setCurrentPage] = useState(1)
  const [showAllPages, setShowAllPages] = useState(false)
  
  // 月份選擇相關
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMonths, setLoadingMonths] = useState(true)
  
  // 編輯相關
  const [editingVideo, setEditingVideo] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  useEffect(() => {
    loadMonths()
  }, [])
  
  useEffect(() => {
    if (selectedMonth) {
      loadVideosByMonth(selectedMonth)
    }
  }, [selectedMonth])
  
  async function loadMonths() {
    try {
      setLoadingMonths(true)
      const response = await getAvailableMonths()
      const monthsData = response.data || []
      setAvailableMonths(monthsData)
      
      // 預設選擇當月
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const monthStrings = monthsData.map(m => m.month)
      
      if (monthStrings.includes(currentMonth)) {
        setSelectedMonth(currentMonth)
      } else if (monthsData.length > 0) {
        // 如果當月沒有，選擇最新的月份
        setSelectedMonth(monthsData[0].month)
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
      setCurrentPage(1)
      setShowAllPages(false)
    } catch (error) {
      console.error('載入影片失敗:', error)
      setError('載入影片清單失敗')
    } finally {
      setLoading(false)
    }
  }
  
  function handleEdit(video) {
    setEditingVideo(video)
    setShowEditModal(true)
  }
  
  function handleEditSuccess() {
    // 重新載入影片列表
    if (selectedMonth) {
      loadVideosByMonth(selectedMonth)
    } else {
      loadVideos()
    }
  }
  
  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
  }

  // 分頁邏輯
  const totalPages = Math.ceil(videos.length / PAGE_SIZE)
  const displayedVideos = showAllPages 
    ? videos 
    : videos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
  
  return (
    <div className="space-y-8">
      <BrandTransition isVisible={loadingMonths || loading} />
      {/* 標題與月份選擇器 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">影片管理</h1>
          <p className="text-gray-600 mt-2">
            {batch ? `${batch.name}` : '請選擇月份查看影片清單'}
          </p>
        </div>
        
        {/* 月份選擇器與分頁 */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div className="min-w-[150px]">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  options={availableMonths.map((monthData) => ({
                    value: monthData.month,
                    label: `${formatMonth(monthData.month)} - ${monthData.batchName}`
                  }))}
                  placeholder="選擇月份"
                />
              </div>
            </div>
          )}

          {/* 分頁按鈕 */}
          {totalPages > 1 && (
            <div className="flex bg-gray-100/80 p-1 rounded-xl items-center overflow-x-auto max-w-[250px] sm:max-w-none scrollbar-hide">
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
        </div>
      </div>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* 影片清單 */}
      {!loading && (!batch || videos.length === 0) ? (
        <div className="card text-center py-12">
          <Film className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">暫無影片清單</h2>
          <p className="text-gray-600">
            {selectedMonth ? `${formatMonth(selectedMonth)}沒有影片` : '目前沒有影片'}
          </p>
        </div>
      ) : (
        <>
          {/* 統計資訊 */}
          <div className="card bg-primary-50 border-primary-200">
            <div className="flex items-center gap-3">
              <Film className="h-6 w-6 text-primary-600" />
              <div>
                <p className="text-sm text-gray-600">總影片數</p>
                <p className="text-2xl font-bold text-primary-600">
                  {videos.length} <span className="text-base font-normal text-gray-600">部</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* 影片網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedVideos.map((video) => (
              <MovieCard
                key={video.id}
                video={video}
                showEdit={true}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </>
      )}
      
      {/* 編輯對話框 */}
      {showEditModal && editingVideo && (
        <VideoEditModal
          video={editingVideo}
          onClose={() => {
            setShowEditModal(false)
            setEditingVideo(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

