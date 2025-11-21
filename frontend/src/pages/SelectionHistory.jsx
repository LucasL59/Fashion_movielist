/**
 * 選擇歷史頁面
 * 
 * 顯示客戶過往的選擇記錄
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { History, Calendar, Film, Loader, AlertCircle } from 'lucide-react'
import { getUserSelections } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function SelectionHistory() {
  const { user } = useAuth()
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (user) {
      loadSelections()
    }
  }, [user])
  
  async function loadSelections() {
    try {
      setLoading(true)
      setError('')
      
      // 獲取用戶的選擇記錄
      const { data: selectionsData, error: selectionsError } = await supabase
        .from('selections')
        .select(`
          *,
          batches:batch_id (
            id,
            name,
            month,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (selectionsError) throw selectionsError
      
      // 對每個選擇，獲取影片詳情
      const selectionsWithVideos = await Promise.all(
        (selectionsData || []).map(async (selection) => {
          const videoIds = selection.video_ids || []
          
          if (videoIds.length === 0) {
            return {
              ...selection,
              videos: []
            }
          }
          
          const { data: videos, error: videosError } = await supabase
            .from('videos')
            .select('id, title, title_en, thumbnail_url')
            .in('id', videoIds)
          
          if (videosError) {
            console.error('載入影片失敗:', videosError)
            return {
              ...selection,
              videos: []
            }
          }
          
          return {
            ...selection,
            videos: videos || []
          }
        })
      )
      
      setSelections(selectionsWithVideos)
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
      
      {/* 選擇記錄列表 */}
      {selections.length === 0 ? (
        <div className="card text-center py-12">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">尚無選擇記錄</h2>
          <p className="text-gray-600">
            您還沒有提交過任何影片選擇
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {selections.map((selection) => (
            <div key={selection.id} className="card">
              {/* 標題 */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selection.batches?.name || '未知批次'}
                  </h3>
                  {selection.batches?.month && (
                    <p className="text-sm text-gray-500 mt-1">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {formatMonth(selection.batches.month)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">提交時間</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(selection.created_at)}
                  </p>
                </div>
              </div>
              
              {/* 統計 */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                  <Film className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    已選擇 {selection.videos?.length || 0} 部影片
                  </span>
                </div>
              </div>
              
              {/* 影片列表 */}
              {selection.videos && selection.videos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {selection.videos.map((video) => (
                    <div
                      key={video.id}
                      className="group relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden"
                    >
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
                      
                      {/* 標題覆蓋層 */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs font-medium line-clamp-2">
                          {video.title}
                        </p>
                        {video.title_en && (
                          <p className="text-white/70 text-xs line-clamp-1 mt-0.5">
                            {video.title_en}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

