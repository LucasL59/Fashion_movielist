/**
 * 影片卡片組件 - v3 優化版
 * 
 * 支援多種顯示狀態的清晰視覺回饋
 */

import { useState } from 'react'
import { Check, Clock, Star, Film, X, Plus, Minus, Eye } from 'lucide-react'

export default function MovieCard_v3({ 
  video, 
  selected, 
  onToggle, 
  displayState = 'available',
  disabled = false,
  onPreview = null // 新增：預覽功能回調
}) {
  const [imageError, setImageError] = useState(false)
  
  // 根據狀態決定樣式
  const getStateStyles = () => {
    switch (displayState) {
      case 'owned':
        return {
          ring: 'ring-2 ring-blue-500',
          overlay: 'bg-blue-500/15',
          iconBg: 'bg-blue-500',
          badge: 'bg-blue-500 text-white',
          badgeText: '已擁有',
          icon: Check
        }
      case 'pending_add':
        return {
          ring: 'ring-2 ring-green-500',
          overlay: 'bg-green-500/15',
          iconBg: 'bg-green-500',
          badge: 'bg-green-500 text-white',
          badgeText: '待新增',
          icon: Plus
        }
      case 'pending_remove':
        return {
          ring: 'ring-2 ring-red-500',
          overlay: 'bg-red-500/15',
          iconBg: 'bg-red-500',
          badge: 'bg-red-500 text-white',
          badgeText: '待移除',
          icon: Minus
        }
      default:
        return {
          ring: 'border border-gray-200',
          overlay: null,
          iconBg: null,
          badge: null,
          badgeText: null,
          icon: null
        }
    }
  }
  
  const styles = getStateStyles()
  const Icon = styles.icon
  
  return (
    <div 
      className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-200 ${
        styles.ring
      } ${
        onToggle && !disabled ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => !disabled && onToggle && onToggle(video.id)}
    >
      {/* 圖片容器 */}
      <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
        {video.thumbnail_url && !imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
            <Film className="h-12 w-12" />
          </div>
        )}
        
        {/* 狀態遮罩 */}
        {styles.overlay && (
          <div className={`absolute inset-0 ${styles.overlay} backdrop-blur-[2px] flex items-center justify-center`}>
            {Icon && (
              <div className={`${styles.iconBg} text-white rounded-full p-2.5 shadow-lg`}>
                <Icon className="h-6 w-6 stroke-[2.5]" />
              </div>
            )}
          </div>
        )}
        
        {/* 狀態標籤 */}
        {styles.badge && (
          <div className="absolute top-2 right-2">
            <span className={`${styles.badge} text-xs px-2.5 py-1 rounded-full font-semibold shadow-md`}>
              {styles.badgeText}
            </span>
          </div>
        )}
        
        {/* 預覽按鈕 */}
        {onPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // 防止觸發卡片的 onClick
              onPreview(video);
            }}
            className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="查看詳情"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* 影片資訊 */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-bold text-sm text-gray-900 line-clamp-1">
            {video.title}
          </h3>
          
          {video.title_en && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
              {video.title_en}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {video.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{video.duration}分</span>
            </div>
          )}
          
          {video.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 stroke-yellow-400" />
              <span>{video.rating}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
