/**
 * 影片選擇頁面 - v3 重構版本
 * 
 * 核心變更：
 * - 從「批次選擇」改為「客戶清單管理」
 * - 支援從任何月份選擇影片
 * - 待處理變更追蹤
 * - LocalStorage 自動保存
 */

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Film, CheckCircle, AlertCircle, Loader, ShoppingCart, Calendar, 
  Grid, List as ListIcon, Send, History, X, Check, Plus, Minus 
} from 'lucide-react'
import MovieCard_v3 from '../components/MovieCard_v3'
import Select from '../components/Select'
import BrandTransition from '../components/BrandTransition'
import { 
  getVideosByMonth, 
  getAvailableMonths, 
  getCustomerList,
  updateCustomerList,
  submitCustomerList 
} from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function MovieSelection() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  // ==================== 核心狀態 ====================
  
  // 月份相關
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loadingMonths, setLoadingMonths] = useState(true)
  
  // 當前月份的可選影片
  const [currentBatch, setCurrentBatch] = useState(null)
  const [monthlyVideos, setMonthlyVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  
  // 所有月份的影片（用於跨月份查找）
  const [allMonthsVideos, setAllMonthsVideos] = useState({})
  
  // 客戶當前清單
  const [customerList, setCustomerList] = useState([])
  const [customerListIds, setCustomerListIds] = useState(new Set()) // video.id 集合
  const [customerListTitles, setCustomerListTitles] = useState(new Set()) // video.title 集合（用於跨月份判斷）
  const [loadingList, setLoadingList] = useState(false)
  
  // 待處理變更（使用 video.id 作為 key，但判斷時參考 title）
  const [pendingChanges, setPendingChanges] = useState({
    add: new Set(), // 儲存 video.id
    remove: new Set() // 儲存 video.id
  })
  
  // 待處理變更的影片標題集合（用於跨月份判斷）
  const [pendingChangesTitles, setPendingChangesTitles] = useState({
    add: new Set(), // 儲存 video.title
    remove: new Set() // 儲存 video.title
  })
  
  // UI 狀態
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [showOwnedSection, setShowOwnedSection] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 計算當前選擇的影片總數
  const currentSelectedCount = useMemo(() => {
    return customerListIds.size - pendingChanges.remove.size + pendingChanges.add.size
  }, [customerListIds, pendingChanges.add.size, pendingChanges.remove.size])
  
  // ==================== 載入資料 ====================
  
  // 載入可用月份
  useEffect(() => {
    loadMonths()
  }, [])
  
  async function loadMonths() {
    try {
      setLoadingMonths(true)
      const response = await getAvailableMonths()
      
      if (response.success && response.data) {
        setAvailableMonths(response.data)
        
        // 預設選擇最新月份
        if (response.data.length > 0 && !selectedMonth) {
          setSelectedMonth(response.data[0].month)
        }
      }
    } catch (error) {
      console.error('載入月份失敗:', error)
      showToast('載入月份失敗', 'error')
    } finally {
      setLoadingMonths(false)
    }
  }
  
  // 載入客戶當前清單（只需載入一次）
  useEffect(() => {
    if (user?.id) {
      loadCustomerList()
    }
  }, [user])
  
  async function loadCustomerList() {
    if (!user?.id) return
    
    try {
      setLoadingList(true)
      console.log('🔍 載入客戶清單...')
      
      const response = await getCustomerList(user.id)
      
      if (response.success && response.data) {
        const { items, videoIds } = response.data
        setCustomerList(items)
        setCustomerListIds(new Set(videoIds))
        
        // 建立影片標題集合（用於跨月份判斷同一部影片）
        const titles = new Set(items.map(item => item.title))
        setCustomerListTitles(titles)
        
        console.log(`✅ 已載入 ${items.length} 部影片`)
        console.log(`📋 影片標題集合:`, Array.from(titles).slice(0, 5), '...')
      }
    } catch (error) {
      console.error('❌ 載入客戶清單失敗:', error)
      showToast('載入清單失敗', 'error')
    } finally {
      setLoadingList(false)
    }
  }
  
  // 切換月份時載入該月影片
  useEffect(() => {
    if (selectedMonth) {
      loadMonthlyVideos(selectedMonth)
    }
  }, [selectedMonth])
  
  async function loadMonthlyVideos(month) {
    try {
      setLoadingVideos(true)
      console.log(`🔍 載入 ${month} 的影片...`)
      
      const response = await getVideosByMonth(month)
      
      if (response.success && response.data) {
        setCurrentBatch(response.data.batch)
        const videos = response.data.videos || []
        setMonthlyVideos(videos)
        
        // 儲存到所有月份的影片集合中
        setAllMonthsVideos(prev => ({
          ...prev,
          [month]: videos
        }))
        
        console.log(`✅ 已載入 ${response.data.videos?.length || 0} 部影片`)
      }
    } catch (error) {
      console.error('❌ 載入月份影片失敗:', error)
      showToast('載入影片失敗', 'error')
    } finally {
      setLoadingVideos(false)
    }
  }
  
  // ==================== LocalStorage 自動保存 ====================
  
  // 保存待處理變更到 localStorage（同時保存 ID 和標題）
  useEffect(() => {
    if (user?.id) {
      const key = `pending-changes-${user.id}`
      const data = {
        add: Array.from(pendingChanges.add),
        remove: Array.from(pendingChanges.remove),
        addTitles: Array.from(pendingChangesTitles.add),
        removeTitles: Array.from(pendingChangesTitles.remove),
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(key, JSON.stringify(data))
    }
  }, [pendingChanges, pendingChangesTitles, user])
  
  // 頁面載入時恢復待處理變更
  useEffect(() => {
    if (user?.id && customerList.length > 0) {
      const key = `pending-changes-${user.id}`
      const saved = localStorage.getItem(key)
      
      if (saved) {
        try {
          const { add, remove, addTitles = [], removeTitles = [], savedAt } = JSON.parse(saved)
          
          // 檢查是否過期（24小時）
          const savedDate = new Date(savedAt)
          const now = new Date()
          const hoursDiff = (now - savedDate) / (1000 * 60 * 60)
          
          if (hoursDiff < 24 && (add.length > 0 || remove.length > 0)) {
            setPendingChanges({
              add: new Set(add),
              remove: new Set(remove)
            })
            setPendingChangesTitles({
              add: new Set(addTitles),
              remove: new Set(removeTitles)
            })
            // 只在首次載入時顯示提示，不在視窗縮放時觸發
            console.log(`✅ 已恢復 ${add.length} 個新增和 ${remove.length} 個移除的變更`)
          }
        } catch (error) {
          console.error('恢復變更失敗:', error)
        }
      }
    }
  }, [user, customerList.length])
  
  // ==================== 影片點擊邏輯 ====================
  
  function handleVideoClick(video) {
    const videoId = video.id
    const videoTitle = video.title
    
    // 使用標題判斷是否已擁有（跨月份判斷）
    const isOwnedByTitle = customerListTitles.has(videoTitle) || pendingChangesTitles.add.has(videoTitle)
    const isOwnedById = customerListIds.has(videoId)
    const isPendingRemoveByTitle = pendingChangesTitles.remove.has(videoTitle)
    
    // 實際判斷：優先使用標題判斷（跨月份），其次使用 ID
    const isOwned = isOwnedByTitle || isOwnedById
    const isPendingRemove = isPendingRemoveByTitle
    
    if (isOwned && !isPendingRemove) {
      // 已擁有且未標記移除 → 標記為移除
      setPendingChanges(prev => ({
        ...prev,
        remove: new Set([...prev.remove, videoId])
      }))
      setPendingChangesTitles(prev => ({
        ...prev,
        remove: new Set([...prev.remove, videoTitle])
      }))
    } else if (isOwned && isPendingRemove) {
      // 已擁有且已標記移除 → 取消移除
      setPendingChanges(prev => {
        const newRemove = new Set(prev.remove)
        newRemove.delete(videoId)
        return { ...prev, remove: newRemove }
      })
      setPendingChangesTitles(prev => {
        const newRemove = new Set(prev.remove)
        newRemove.delete(videoTitle)
        return { ...prev, remove: newRemove }
      })
    } else if (!isOwned) {
      // 未擁有 → 標記為新增
      setPendingChanges(prev => ({
        ...prev,
        add: new Set([...prev.add, videoId])
      }))
      setPendingChangesTitles(prev => ({
        ...prev,
        add: new Set([...prev.add, videoTitle])
      }))
    } else {
      // 已標記新增 → 取消新增
      setPendingChanges(prev => {
        const newAdd = new Set(prev.add)
        newAdd.delete(videoId)
        return { ...prev, add: newAdd }
      })
      setPendingChangesTitles(prev => {
        const newAdd = new Set(prev.add)
        newAdd.delete(videoTitle)
        return { ...prev, add: newAdd }
      })
    }
  }
  
  // 計算影片的顯示狀態（使用標題判斷，支援跨月份）
  function getVideoDisplayState(video) {
    const videoId = video.id
    const videoTitle = video.title
    
    // 使用標題判斷是否已擁有（跨月份判斷）
    const isOwnedByTitle = customerListTitles.has(videoTitle)
    const isOwnedById = customerListIds.has(videoId)
    const isPendingAddByTitle = pendingChangesTitles.add.has(videoTitle)
    const isPendingRemoveByTitle = pendingChangesTitles.remove.has(videoTitle)
    
    const isOwned = isOwnedByTitle || isOwnedById
    
    if (isOwned && !isPendingRemoveByTitle) return 'owned'
    if (isOwned && isPendingRemoveByTitle) return 'pending_remove'
    if (!isOwned && isPendingAddByTitle) return 'pending_add'
    return 'available'
  }
  
  // ==================== 提交邏輯 ====================
  
  function handleSubmitClick() {
    if (pendingChanges.add.size === 0 && pendingChanges.remove.size === 0) {
      showToast('沒有任何變更需要提交', 'warning')
      return
    }
    
    // 從所有月份的影片中找出待新增的影片
    const allVideos = Object.values(allMonthsVideos).flat()
    const addedVideos = allVideos.filter(v => pendingChanges.add.has(v.id))
    
    // 使用標題去重（同一影片可能出現在多個月份，但只顯示一次）
    const uniqueAddedVideos = Array.from(
      new Map(addedVideos.map(v => [v.title, v])).values()
    )
    
    const removedVideos = customerList
      .filter(item => pendingChanges.remove.has(item.video_id))
      .map(item => item.videos)
      .filter(Boolean)
    
    const currentTotal = customerListIds.size
    const newTotal = currentTotal - pendingChanges.remove.size + pendingChanges.add.size
    
    setConfirmData({
      currentTotal,
      newTotal,
      addedCount: pendingChanges.add.size,
      removedCount: pendingChanges.remove.size,
      addedVideos: uniqueAddedVideos,
      removedVideos
    })
    
    setShowConfirmModal(true)
  }
  
  async function confirmSubmit() {
    try {
      setSubmitting(true)
      console.log('📤 提交客戶清單...')
      
      // 1. 更新客戶清單
      await updateCustomerList(user.id, {
        addVideoIds: Array.from(pendingChanges.add),
        removeVideoIds: Array.from(pendingChanges.remove),
        batchId: currentBatch?.id,
        month: selectedMonth,
        skipHistory: false
      })
      
      // 2. 提交並發送通知
      await submitCustomerList(user.id, {
        addedVideos: confirmData.addedVideos.map(v => ({
          video_id: v.id,
          title: v.title,
          title_en: v.title_en,
          month: selectedMonth
        })),
        removedVideos: confirmData.removedVideos.map(v => ({
          video_id: v.id,
          title: v.title,
          title_en: v.title_en
        }))
      })
      
      // 3. 清空待處理變更
      setPendingChanges({ add: new Set(), remove: new Set() })
      setPendingChangesTitles({ add: new Set(), remove: new Set() })
      
      // 4. 清空 localStorage
      const key = `pending-changes-${user.id}`
      localStorage.removeItem(key)
      
      // 5. 重新載入客戶清單
      await loadCustomerList()
      
      // 6. 關閉 Modal
      setShowConfirmModal(false)
      
      showToast('影片清單已更新！', 'success')
      console.log('✅ 提交成功')
      
    } catch (error) {
      console.error('❌ 提交失敗:', error)
      showToast('提交失敗：' + error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  function cancelChanges() {
    setPendingChanges({ add: new Set(), remove: new Set() })
    setPendingChangesTitles({ add: new Set(), remove: new Set() })
    
    // 清空 localStorage
    if (user?.id) {
      const key = `pending-changes-${user.id}`
      localStorage.removeItem(key)
    }
    
    showToast('已取消所有變更', 'success')
  }
  
  // ==================== 計算屬性 ====================
  
  const hasPendingChanges = pendingChanges.add.size > 0 || pendingChanges.remove.size > 0
  
  const ownedVideosForDisplay = useMemo(() => {
    return customerList.map(item => item.videos).filter(Boolean)
  }, [customerList])
  
  // ==================== 渲染 ====================
  
  if (loadingMonths || loadingList) {
    return (
      <BrandTransition show={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader className="w-12 h-12 text-primary-600 animate-spin mb-4" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </BrandTransition>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* 頁面標題與月份選擇器 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Film className="w-8 h-8 text-primary-600" />
            影片選擇
          </h1>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOwnedSection(!showOwnedSection)}
              className="btn btn-secondary"
            >
              <ShoppingCart className="w-4 h-4" />
              我的清單 ({customerList.length})
            </button>
          </div>
        </div>
        
        {/* 月份選擇器 */}
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={availableMonths.map(m => ({
              value: m.month,
              label: `${m.month} - ${m.batchName}`
            }))}
            placeholder="選擇月份"
            className="w-64"
          />
        </div>
      </div>
      
      {/* 待處理變更摘要 - 使用 Portal 懸浮在視窗底部 */}
      {hasPendingChanges && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full px-4">
          <div className="relative bg-gradient-to-br from-white/80 via-white/70 to-white/60 backdrop-blur-xl border border-white/50 shadow-xl shadow-primary-500/20 rounded-2xl p-4" style={{ backdropFilter: 'blur(20px) saturate(180%)' }}>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    待處理變更
                  </p>
                  <p className="text-sm text-gray-600">
                    已選擇 <span className="font-semibold text-primary-600">{currentSelectedCount}</span> 部影片
                    {pendingChanges.add.size > 0 && <span className="text-green-600"> • 新增 {pendingChanges.add.size}</span>}
                    {pendingChanges.remove.size > 0 && <span className="text-red-600"> • 移除 {pendingChanges.remove.size}</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelChanges}
                  className="btn btn-secondary"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleSubmitClick}
                  disabled={submitting}
                  className="btn btn-primary bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      處理中
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      提交選擇
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 我的影片清單（折疊式） */}
      {showOwnedSection && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              我的影片清單 ({customerList.length} 部)
            </h2>
            <button
              onClick={() => setShowOwnedSection(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {ownedVideosForDisplay.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              您尚未選擇任何影片
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {ownedVideosForDisplay.map(video => (
                <MovieCard_v3
                  key={video.id}
                  video={video}
                  selected={getVideoDisplayState(video) !== 'pending_remove'}
                  onToggle={() => handleVideoClick(video)}
                  displayState={getVideoDisplayState(video)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 當前月份的可選影片 */}
      <div>
        {/* 標題列與視圖切換 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {selectedMonth} 可選影片 ({monthlyVideos.length} 部)
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="網格視圖"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="清單視圖"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {loadingVideos ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : monthlyVideos.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">該月份尚無可選影片</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {monthlyVideos.map(video => (
              <MovieCard_v3
                key={video.id}
                video={video}
                selected={['owned', 'pending_add'].includes(getVideoDisplayState(video))}
                onToggle={() => handleVideoClick(video)}
                displayState={getVideoDisplayState(video)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {monthlyVideos.map(video => {
              const state = getVideoDisplayState(video)
              
              // 狀態樣式
              const getListStateStyles = () => {
                switch (state) {
                  case 'owned':
                    return {
                      bg: 'bg-blue-50 border-blue-300',
                      icon: Check,
                      iconColor: 'text-blue-600',
                      badge: 'bg-blue-500 text-white',
                      badgeText: '已擁有'
                    }
                  case 'pending_add':
                    return {
                      bg: 'bg-green-50 border-green-300',
                      icon: Plus,
                      iconColor: 'text-green-600',
                      badge: 'bg-green-500 text-white',
                      badgeText: '待新增'
                    }
                  case 'pending_remove':
                    return {
                      bg: 'bg-red-50 border-red-300',
                      icon: Minus,
                      iconColor: 'text-red-600',
                      badge: 'bg-red-500 text-white',
                      badgeText: '待移除'
                    }
                  default:
                    return {
                      bg: 'bg-white border-gray-200 hover:border-gray-300',
                      icon: null,
                      iconColor: 'text-gray-300',
                      badge: null,
                      badgeText: null
                    }
                }
              }
              
              const listStyles = getListStateStyles()
              const ListIcon = listStyles.icon || CheckCircle
              
              return (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${listStyles.bg}`}
                >
                  <div className={`flex-shrink-0 ${listStyles.iconColor}`}>
                    <ListIcon className="h-5 w-5" />
                  </div>
                  
                  {video.thumbnail_url && (
                    <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-gray-100">
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h4>
                    {video.title_en && (
                      <p className="text-sm text-gray-500 line-clamp-1">{video.title_en}</p>
                    )}
                    {video.duration && (
                      <p className="text-xs text-gray-400 mt-1">{video.duration} 分鐘</p>
                    )}
                  </div>
                  
                  {listStyles.badge && (
                    <span className={`${listStyles.badge} text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0`}>
                      {listStyles.badgeText}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* 確認提交 Modal */}
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">確認提交選擇</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">目前總數：</span>
                  <span className="font-bold ml-2">{confirmData.currentTotal} 部</span>
                </div>
                <div>
                  <span className="text-gray-600">提交後總數：</span>
                  <span className="font-bold ml-2">{confirmData.newTotal} 部</span>
                </div>
                <div className="text-green-600">
                  <Plus className="w-4 h-4 inline mr-1" />
                  新增：{confirmData.addedCount} 部
                </div>
                <div className="text-red-600">
                  <Minus className="w-4 h-4 inline mr-1" />
                  移除：{confirmData.removedCount} 部
                </div>
              </div>
            </div>
            
            {confirmData.removedCount > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-red-600 mb-2">將移除的影片：</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {confirmData.removedVideos.map(video => (
                    <div key={video.id} className="text-sm text-gray-700">
                      • {video.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {confirmData.addedCount > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-green-600 mb-2">將新增的影片：</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {confirmData.addedVideos.map(video => (
                    <div key={video.id} className="text-sm text-gray-700">
                      • {video.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={confirmSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    確認提交選擇
                  </>
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
