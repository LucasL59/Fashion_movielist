/**
 * 影片詳細預覽 Modal
 * 
 * 顯示影片的完整資訊，包含封面、標題、簡介等
 * 可用於影片選擇頁面、影片管理頁面等
 */

import { createPortal } from 'react-dom'
import { X, Film, Edit, Check } from 'lucide-react'

export default function VideoDetailModal({ video, onClose, onAction, actionLabel, actionIcon: ActionIcon }) {
  if (!video) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 影片封面 - 使用 2:3 比例（海報比例），限制最大高度 */}
        <div className="relative w-full bg-gradient-to-b from-gray-900 to-gray-800 py-4 flex justify-center flex-shrink-0">
          <div className="relative w-3/5 max-w-xs max-h-[35vh] aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden shadow-2xl">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-contain bg-gray-900"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <Film className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3">
              <h2 className="text-base font-bold text-white mb-1 leading-tight">{video.title}</h2>
              {video.title_en && (
                <p className="text-white/90 text-xs">{video.title_en}</p>
              )}
            </div>
          </div>
        </div>

        {/* 影片詳細資訊 - 可滾動區域，最小高度確保可見 */}
        <div className="flex-1 overflow-y-auto min-h-[120px]">
          <div className="p-4 sm:p-6 space-y-4">
          {/* 簡介 */}
          {video.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                影片簡介
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {video.description}
              </p>
            </div>
          )}

          {video.description_en && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                {video.description_en}
              </p>
            </div>
          )}

            {/* 如果沒有簡介 */}
            {!video.description && !video.description_en && (
              <div className="text-center py-8 text-gray-400">
                <Film className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>此影片尚無詳細簡介</p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        {onAction && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => {
                onAction(video);
                onClose();
              }}
              className="w-full py-3 px-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              {ActionIcon && <ActionIcon className="h-5 w-5" />}
              {actionLabel || '確定'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
