/**
 * 影片卡片組件 - Modern Refined
 * 
 * 顯示單部影片的資訊
 */

import { useState } from 'react'
import { Check, Clock, Star, Film, Edit, Play } from 'lucide-react'

export default function MovieCard({ video, isSelected, onToggle, onEdit, showEdit = false, isAlreadyOwned = false }) {
  const selected = isSelected
  const [imageError, setImageError] = useState(false)
  
  return (
    <div 
      className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-300 ${
        selected 
          ? isAlreadyOwned
            ? 'ring-4 ring-blue-500/30 shadow-lg scale-[1.02]' 
            : 'ring-4 ring-primary-500/30 shadow-lg scale-[1.02]'
          : 'hover:shadow-medium hover:-translate-y-1 border border-gray-100'
      } ${onToggle ? 'cursor-pointer' : ''}`}
      onClick={() => onToggle && onToggle(video.id)}
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
        
        {/* 選中狀態遮罩 */}
        {selected && (
          <div className={`absolute inset-0 backdrop-blur-[1px] flex items-center justify-center animate-fade-in ${
            isAlreadyOwned ? 'bg-blue-900/20' : 'bg-primary-900/20'
          }`}>
            <div className={`rounded-full p-3 shadow-lg transform scale-110 ${
              isAlreadyOwned ? 'bg-white text-blue-600' : 'bg-white text-primary-600'
            }`}>
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
          </div>
        )}
        
        {/* 已擁有標記 */}
        {isAlreadyOwned && (
          <div className={`absolute top-3 ${showEdit ? 'right-14' : 'right-3'}`}>
            <span className="bg-blue-600/95 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg tracking-wide">
              已擁有
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

