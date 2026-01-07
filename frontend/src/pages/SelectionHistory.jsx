/**
 * 選擇歷史頁面（v3 重構版）
 * 
 * 顯示客戶的累積清單和歷史變更記錄
 * 不再按月份劃分，改為顯示每次提交的變更
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
  MinusCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Grid,
  List as ListIcon
} from 'lucide-react'
import { getCustomerListHistory, getCustomerList } from '../lib/api'

export default function SelectionHistory() {
  const { user } = useAuth()
  const [historyRecords, setHistoryRecords] = useState([])
  const [currentList, setCurrentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedRecords, setExpandedRecords] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      // 同時載入當前清單和歷史記錄
      const [listResponse, historyResponse] = await Promise.all([
        getCustomerList(user.id),
        getCustomerListHistory(user.id, 50)
      ])

      console.log('📋 當前清單:', listResponse)
      console.log('📜 歷史記錄:', historyResponse)

      // 設置當前清單
      setCurrentList(listResponse.data || [])

      // 設置歷史記錄
      setHistoryRecords(historyResponse.data || [])

    } catch (error) {
      console.error('載入選擇記錄失敗:', error)
      setError('載入選擇記錄失敗')
    } finally {
      setLoading(false)
    }
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

  function toggleExpand(recordId) {
    setExpandedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  // 統計資訊
  const totalVideos = currentList.length
  const totalSubmissions = historyRecords.length
  const latestRecord = historyRecords[0]

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
        <p className="text-gray-600 mt-2">查看您的累積清單和歷史變更記錄</p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Layers}
          label="目前擁有"
          value={`${totalVideos} 部`}
        />
        <StatCard
          icon={History}
          label="提交次數"
          value={`${totalSubmissions} 次`}
          accent="blue"
        />
        <StatCard
          icon={Calendar}
          label="最後更新"
          value={latestRecord ? formatDateTime(latestRecord.snapshot_date) : '尚未提交'}
          accent="green"
          small
        />
      </div>

      {/* 當前擁有的清單 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Film className="h-5 w-5" />
            </span>
            我的影片清單
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              共 {totalVideos} 部
            </span>
            {/* 視圖切換按鈕 */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="圖表視圖"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                title="清單視圖"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {currentList.length > 0 ? (
          viewMode === 'grid' ? (
            /* 圖表視圖 */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {currentList.map((item) => {
                const video = item.video || item
                return (
                  <div
                    key={item.id || video.id}
                    className="group relative aspect-[2/3] rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Film className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-sm font-semibold text-white line-clamp-2">{video.title}</p>
                      {video.title_en && (
                        <p className="text-xs text-white/70 line-clamp-1">{video.title_en}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* 清單視圖 */
            <div className="space-y-2">
              {currentList.map((item, index) => {
                const video = item.video || item
                return (
                  <div
                    key={item.id || video.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-500 font-medium min-w-[2rem]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-12 h-16 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Film className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{video.title}</p>
                      {video.title_en && (
                        <p className="text-sm text-gray-500 truncate">{video.title_en}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Film className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">尚無選擇的影片</h3>
            <p className="text-gray-600">前往「選擇影片」頁面開始選擇您喜歡的影片</p>
          </div>
        )}
      </div>

      {/* 歷史變更記錄 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <History className="h-5 w-5" />
          </span>
          提交歷史記錄
        </h2>

        {historyRecords.length > 0 ? (
          <div className="space-y-3">
            {historyRecords.map((record, index) => {
              const isExpanded = expandedRecords.has(record.id)
              const addedVideos = record.added_videos || []
              const removedVideos = record.removed_videos || []
              const addedCount = record.added_count || addedVideos.length
              const removedCount = record.removed_count || removedVideos.length
              const totalCount = record.total_count || 0

              return (
                <div key={record.id} className="card">
                  {/* 記錄標題列 */}
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-6 p-6 rounded-2xl transition-colors"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* 序號 */}
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-600">
                          #{historyRecords.length - index}
                        </span>
                      </div>

                      {/* 提交資訊 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {formatDateTime(record.snapshot_date)}
                          </span>
                          {index === 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              最新
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>共 {totalCount} 部</span>
                          {addedCount > 0 && (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <PlusCircle className="h-3.5 w-3.5" />
                              +{addedCount}
                            </span>
                          )}
                          {removedCount > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <MinusCircle className="h-3.5 w-3.5" />
                              -{removedCount}
                            </span>
                          )}
                        </div>
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
                  {isExpanded && (addedCount > 0 || removedCount > 0) && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* 新增的影片 */}
                        {addedCount > 0 && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                              <PlusCircle className="h-5 w-5" />
                              新增 {addedCount} 部影片
                            </h4>
                            <div className="space-y-2">
                              {addedVideos.map((video, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                                  {video.thumbnail_url ? (
                                    <img
                                      src={video.thumbnail_url}
                                      alt={video.title}
                                      className="w-10 h-14 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Film className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {video.title || '未知影片'}
                                    </p>
                                    {video.title_en && (
                                      <p className="text-xs text-gray-500 truncate">{video.title_en}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 移除的影片 */}
                        {removedCount > 0 && (
                          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                            <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                              <MinusCircle className="h-5 w-5" />
                              移除 {removedCount} 部影片
                            </h4>
                            <div className="space-y-2">
                              {removedVideos.map((video, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                                  {video.thumbnail_url ? (
                                    <img
                                      src={video.thumbnail_url}
                                      alt={video.title}
                                      className="w-10 h-14 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <Film className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {video.title || '未知影片'}
                                    </p>
                                    {video.title_en && (
                                      <p className="text-xs text-gray-500 truncate">{video.title_en}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 沒有變更時顯示提示 */}
                  {isExpanded && addedCount === 0 && removedCount === 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center py-4 text-gray-500">
                      <p>此次提交沒有變更記錄</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">尚無提交記錄</h3>
            <p className="text-gray-600">您還沒有提交過任何影片選擇</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent = 'primary', small = false }) {
  const accentStyles = {
    primary: 'text-primary-600 bg-primary-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50'
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <span className={`rounded-full p-2 shadow-sm ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`font-semibold text-gray-900 ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
