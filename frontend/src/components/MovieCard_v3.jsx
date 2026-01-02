/**
 * 影片卡片組件 - v3 重構版本
 * 
 * 支援新的顯示狀態：
 * - 'owned': 已擁有
 * - 'pending_add': 待新增
 * - 'pending_remove': 待移除
 * - 'available': 可選
 */

import { useState } from 'react'
import { Check, Clock, Star, Film, Edit, Plus, Minus, AlertCircle } from 'lucide-react'

export default function MovieCard({ 
  video, 
  selected = false,  // 已選中（向後相容）
  onToggle, 
  onEdit, 
  showEdit = false,
  displayState = 'available'  // 新增：顯示狀態
}) {
  const [imageError, setImageError] = useState(false)
  
  // 根據 displayState 決定樣式
  const getStateStyle = () => {
    switch (displayState) {
      case 'owned':
        return {
          ring: 'ring-4 ring-blue-500/30 shadow-lg scale-[1.02]',
          badge: 'bg-blue-600/95 backdrop-blur text-white',
          badgeText: '已擁有',
          overlay: 'bg-blue-900/20',
          iconBg: 'bg-white text-blue-600',
          icon: <Check className="h-8 w-8 stroke-[3]" />
        }
      case 'pending_add':
        return {
          ring: 'ring-4 ring-green-500/30 shadow-lg scale-[1.02]',
          badge: 'bg-green-600/95 backdrop-blur text-white',
          badgeText: '待新增',
          overlay: 'bg-green-900/20',
          iconBg: 'bg-white text-green-600',
          icon: <Plus className="h-8 w-8 stroke-[3]" />
        }
      case 'pending_remove':
        return {
          ring: 'ring-4 ring-red-500/30 shadow-lg scale-[1.02]',
          badge: 'bg-red-600/95 backdrop-blur text-white',
          badgeText: '待移除',
          overlay: 'bg-red-900/20',
          iconBg: 'bg-white text-red-600',
          icon: <Minus className="h-8 w-8 stroke-[3]" />
        }
      default: // 'available'
        return {
          ring: 'hover:shadow-medium hover:-translate-y-1 border border-gray-100',
          badge: null,
          badgeText: null,
          overlay: null,
          iconBg: null,
          icon: null
        }
    }
  }
  
  const stateStyle = getStateStyle()
  const isHighlighted = ['owned', 'pending_add', 'pending_remove'].includes(displayState)
  
  return (
    <div 
      className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-300 ${
        stateStyle.ring
      } ${onToggle ? 'cursor-pointer' : ''}`}
      onClick={() => onToggle && onToggle(video)}
    >
      {/* 圖片容器 */}
      <div className="relative aspect-[2/3] bg-gray-100 overflow-hidden">
        {video.thumbnail_url && !imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
            <Film className="h-16 w-16" />
          </div>
        )}
        
        {/* 漸層遮罩 (底部文字可讀性) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* 高亮狀態遮罩與圖標 */}
        {isHighlighted && stateStyle.overlay && (
          <div className={`absolute inset-0 backdrop-blur-[1px] flex items-center justify-center animate-fade-in ${stateStyle.overlay}`}>
            <div className={`rounded-full p-3 shadow-lg transform scale-110 ${stateStyle.iconBg}`}>
              {stateStyle.icon}
            </div>
          </div>
        )}
        
        {/* 狀態標記 */}
        {stateStyle.badge && stateStyle.badgeText && (
          <div className={`absolute top-3 ${showEdit ? 'right-14' : 'right-3'}`}>
            <span className={`${stateStyle.badge} text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg tracking-wide`}>
              {stateStyle.badgeText}
            </span>
          </div>
        )}
        
        {/* 編輯按鈕 */}
        {showEdit && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(video)
            }}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-700 rounded-full p-2 shadow-sm hover:bg-white hover:text-primary-600 transition-all opacity-0 group-hover:opacity-100"
            title="編輯影片"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* 影片資訊 */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-display font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {video.title}
          </h3>
          
          {video.title_en && (
            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5 font-medium">
              {video.title_en}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
          {video.duration && (
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5" />
              <span>{video.duration} min</span>
            </div>
          )}
          
          {video.rating && (
            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md">
              <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400" />
              <span>{video.rating}</span>
            </div>
          )}

          {video.language && (
             <span className="px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
               {video.language}
             </span>
           )}
        </div>
        
        {video.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        )}
        
        {/* 詳細標籤 */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {video.director && (
            <span className="text-xs text-gray-400">導演: {video.director}</span>
          )}
        </div>
      </div>
    </div>
  )
}
