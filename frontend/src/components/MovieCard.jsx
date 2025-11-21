/**
 * 影片卡片組件
 * 
 * 顯示單部影片的資訊
 */

import { useState } from 'react'
import { Check, Clock, Star, Film, Edit } from 'lucide-react'

export default function MovieCard({ video, isSelected, onToggle, onEdit, showEdit = false }) {
  const selected = isSelected
  const [imageError, setImageError] = useState(false)
  
  return (
    <div 
      className={`card transition-all duration-200 hover:shadow-lg ${
        selected ? 'ring-2 ring-primary-600' : ''
      } ${onToggle ? 'cursor-pointer' : ''}`}
      onClick={() => onToggle && onToggle(video.id)}
    >
      {/* 圖片 */}
      <div className="relative aspect-[2/3] mb-4 bg-gray-100 rounded-lg overflow-hidden">
        {video.thumbnail_url && !imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Film className="h-16 w-16" />
          </div>
        )}
        
        {/* 選中標記 */}
        {selected && (
          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-2">
            <Check className="h-5 w-5" />
          </div>
        )}
        
        {/* 編輯按鈕 */}
        {showEdit && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(video)
            }}
            className="absolute bottom-2 right-2 bg-white text-gray-700 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors"
            title="編輯影片"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* 影片資訊 */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
          {video.title}
        </h3>
        
        {video.title_en && (
          <p className="text-sm text-gray-500 line-clamp-1">
            {video.title_en}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {video.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{video.duration} 分鐘</span>
            </div>
          )}
          
          {video.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>{video.rating}</span>
            </div>
          )}
        </div>
        
        {video.description && (
          <p className="text-sm text-gray-600 line-clamp-3 mt-2">
            {video.description}
          </p>
        )}
        
        {/* 詳細資訊 */}
        <div className="pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-500">
          {video.director && (
            <p><span className="font-medium">導演：</span>{video.director}</p>
          )}
          {video.actor_male && (
            <p><span className="font-medium">男演員：</span>{video.actor_male}</p>
          )}
          {video.actor_female && (
            <p><span className="font-medium">女演員：</span>{video.actor_female}</p>
          )}
          <div className="flex gap-2">
            {video.language && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {video.language}
              </span>
            )}
            {video.subtitle && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                字幕: {video.subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

