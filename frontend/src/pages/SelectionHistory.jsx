/**
 * 選擇歷史頁面
 * 
 * 顯示客戶過往的選擇記錄
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  History,
  Calendar,
  Film,
  Loader,
  AlertCircle,
  Layers,
  PlusCircle,
  MinusCircle
} from 'lucide-react'
import Select from '../components/Select'
import SelectionDiffSection from '../components/SelectionDiffSection'
import { getCustomerListHistory } from '../lib/api'

export default function SelectionHistory() {
  const { user } = useAuth()
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonthKey, setSelectedMonthKey] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadSelections()
    }
  }, [user?.id])

  async function loadSelections() {
    try {
      setLoading(true)
      setError('')

      // 獲取用戶的選擇歷史記錄（使用 API）
      const response = await getCustomerListHistory(user.id, 50)
      const selectionsData = response.data || []

      console.log(`📊 找到 ${selectionsData.length} 筆選擇歷史記錄`)

      // selection_history 已包含影片詳情，直接處理
      const videoCache = new Map()
      const selectionsWithVideos = (selectionsData || []).map((selection) => {
        const videoIds = selection.video_ids || []
        
        // 如果有 added_videos 和 removed_videos（JSON 格式），直接使用
        let allVideos = []
        
        // 合併當前影片、新增影片、移除影片到快取
        const currentVideos = selection.current_videos || []
        const addedVideos = selection.added_videos || []
        const removedVideos = selection.removed_videos || []
        
        currentVideos.forEach(video => {
          if (video?.id) videoCache.set(video.id, video)
          allVideos.push(video)
        })
        
        addedVideos.forEach(video => {
          if (video?.id) videoCache.set(video.id, video)
        })
        
        removedVideos.forEach(video => {
          if (video?.id) videoCache.set(video.id, video)
        })

        return {
          ...selection,
          created_at: selection.snapshot_date, // 使用 snapshot_date 作為 created_at
          videos: allVideos,
          batches: { month: selection.month } // 模擬 batches 結構以保持兼容
        }
      })

      const sortedSelections = [...selectionsWithVideos].sort((a, b) => {
        const monthA = a?.batches?.month || a?.month || ''
        const monthB = b?.batches?.month || b?.month || ''
        if (monthA && monthB && monthA !== monthB) {
          return monthB.localeCompare(monthA)
        }
        return new Date(b.created_at || b.snapshot_date) - new Date(a.created_at || a.snapshot_date)
      })

      const enhancedSelections = sortedSelections.map((selection, index) => {
        const prevSelection = sortedSelections[index + 1]
        const currentVideoIds = selection.video_ids || []
        const prevVideoIds = prevSelection?.video_ids || []
        const addedIds = currentVideoIds.filter(id => !prevVideoIds.includes(id))
        const removedIds = prevVideoIds.filter(id => !currentVideoIds.includes(id))

        const attachVideoMeta = (videoId) => {
          const fromCache = videoCache.get(videoId)
          if (fromCache) return fromCache
          const fallback = prevSelection?.videos?.find(video => video.id === videoId)
          if (fallback) return fallback
          return {
            id: videoId,
            title: '已下架影片',
            title_en: '',
            thumbnail_url: ''
          }
        }

        const monthKey = selection?.batches?.month || selection.id

        return {
          ...selection,
          monthKey,
          diff: {
            added: addedIds.map(attachVideoMeta),
            removed: removedIds.map(attachVideoMeta),
            addedCount: addedIds.length,
            removedCount: removedIds.length,
            previousMonth: prevSelection?.batches?.month || null
          }
        }
      })

      setSelections(enhancedSelections)
      setSelectedMonthKey(prev => prev || enhancedSelections[0]?.monthKey || '')
    } catch (error) {
      console.error('載入選擇記錄失敗:', error)
      setError('載入選擇記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatMonth(monthStr) {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${year}年${parseInt(month)}月`
  }

  const monthOptions = selections.map(selection => ({
    key: selection.monthKey,
    label: formatMonth(selection?.batches?.month) || '未命名月份'
  }))

  const activeSelection = selections.find(selection => selection.monthKey === selectedMonthKey) || selections[0]

  useEffect(() => {
    if (!selectedMonthKey && selections.length > 0) {
      setSelectedMonthKey(selections[0].monthKey)
    }
  }, [selectedMonthKey, selections])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="h-12 w-12 text-primary-600 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">選擇記錄</h1>
        <p className="text-gray-600 mt-2">查看您過往的影片選擇</p>
      </div>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* Loading 狀態 */}
      {loading ? (
        <div className="card text-center py-12">
          <Loader className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">載入選擇記錄中...</p>
        </div>
      ) : selections.length === 0 ? (
        <div className="card text-center py-12">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">尚無選擇記錄</h2>
          <p className="text-gray-600">
            您還沒有提交過任何影片選擇
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">選擇您想查看的月份</p>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {formatMonth(activeSelection?.batches?.month)}
                </h2>
                {activeSelection?.diff?.previousMonth && (
                  <p className="text-sm text-gray-500 mt-1">
                    與 {formatMonth(activeSelection.diff.previousMonth)} 比較
                  </p>
                )}
              </div>
              <div className="w-full md:w-60">
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  月份
                </label>
                <Select
                  value={selectedMonthKey}
                  onChange={(event) => setSelectedMonthKey(event.target.value)}
                  options={monthOptions.map(option => ({ value: option.key, label: option.label }))}
                  placeholder="選擇月份"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white p-2 shadow-sm">
                    <Layers className="h-4 w-4 text-primary-600" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">當月片單</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {activeSelection?.videos?.length || 0} 部
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white p-2 shadow-sm">
                    <PlusCircle className="h-4 w-4 text-green-600" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-600">本月新增</p>
                    <p className="text-xl font-semibold text-green-700">
                      {activeSelection?.diff?.addedCount || 0} 部
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white p-2 shadow-sm">
                    <MinusCircle className="h-4 w-4 text-red-600" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-red-600">本月下架</p>
                    <p className="text-xl font-semibold text-red-700">
                      {activeSelection?.diff?.removedCount || 0} 部
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <Film className="h-4 w-4" />
                  </span>
                  當月擁有的片單
                </h3>
                {activeSelection?.created_at && (
                  <p className="text-sm text-gray-500">
                    提交於 {formatDate(activeSelection.created_at)}
                  </p>
                )}
              </div>

              {activeSelection?.videos?.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {activeSelection.videos.map((video) => (
                    <div
                      key={video.id}
                      className="group relative aspect-[2/3] rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="h-full w-full rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-sm font-semibold text-white line-clamp-2">
                          {video.title}
                        </p>
                        {video.title_en && (
                          <p className="text-xs text-white/70 line-clamp-1">
                            {video.title_en}
                          </p>
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
                videos={activeSelection?.diff?.added || []}
                emptyText="本月未新增影片"
              />
              <SelectionDiffSection
                title="本月下架的片單"
                highlightColor="red"
                videos={activeSelection?.diff?.removed || []}
                emptyText="本月沒有下架影片"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">所有月份一覽</h3>
            <div className="space-y-4">
              {selections.map((selection) => (
                <div key={selection.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{selection.batches?.name || '未知批次'}</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatMonth(selection.batches?.month)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                        總片單 {selection.videos?.length || 0}
                      </span>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                        +{selection.diff?.addedCount || 0}
                      </span>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                        -{selection.diff?.removedCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
