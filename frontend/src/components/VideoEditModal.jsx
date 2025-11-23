/**
 * 影片編輯對話框
 * 
 * 允許 admin 和 uploader 編輯影片資訊和上傳新圖片
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Loader, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { updateVideo } from '../lib/api'

export default function VideoEditModal({ video, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    director: '',
    actor_male: '',
    actor_female: '',
    duration: '',
    rating: '',
    language: '',
    subtitle: ''
  })
  
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || '',
        title_en: video.title_en || '',
        description: video.description || '',
        director: video.director || '',
        actor_male: video.actor_male || '',
        actor_female: video.actor_female || '',
        duration: video.duration || '',
        rating: video.rating || '',
        language: video.language || '',
        subtitle: video.subtitle || ''
      })
      setThumbnailPreview(video.thumbnail_url)
    }
  }, [video])
  
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      // 驗證檔案類型
      if (!file.type.startsWith('image/')) {
        setError('請選擇圖片檔案')
        return
      }
      
      // 驗證檔案大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError('圖片檔案不能超過 5MB')
        return
      }
      
      setThumbnailFile(file)
      
      // 建立預覽
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result)
      }
      reader.readAsDataURL(file)
      
      setError('')
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      
      await updateVideo(video.id, formData, thumbnailFile)
      
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()
    } catch (error) {
      console.error('更新影片失敗:', error)
      setError(error.response?.data?.message || '更新失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }
  
  if (!video) return null
  
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.8);
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* 標題 - 固定在頂部 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">編輯影片資訊</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* 表單 - 可滾動區域 */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* 圖片上傳 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                影片封面
              </label>
              <div className="flex items-start gap-4">
                {/* 預覽 */}
                <div className="flex-shrink-0">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="預覽"
                      className="w-32 h-48 object-cover rounded-lg border border-gray-200"
                      style={{ borderRadius: '0.5rem' }}
                    />
                  ) : (
                    <div className="w-32 h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* 上傳按鈕 */}
                <div className="flex-1">
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    選擇新圖片
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    支援 JPEG、PNG、GIF、WebP 格式，最大 5MB
                  </p>
                </div>
              </div>
            </div>
            
            {/* 基本資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  片名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  英文片名
                </label>
                <input
                  type="text"
                  name="title_en"
                  value={formData.title_en}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
            
            {/* 簡介 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                簡介
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input"
              />
            </div>
            
            {/* 導演與演員 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  導演
                </label>
                <input
                  type="text"
                  name="director"
                  value={formData.director}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  男演員
                </label>
                <input
                  type="text"
                  name="actor_male"
                  value={formData.actor_male}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  女演員
                </label>
                <input
                  type="text"
                  name="actor_female"
                  value={formData.actor_female}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
            
            {/* 其他資訊 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  片長
                </label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="例: 120分鐘"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  級別
                </label>
                <input
                  type="text"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  placeholder="例: 普遍級"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  發音
                </label>
                <input
                  type="text"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  placeholder="例: 國語"
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字幕
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="例: 中文"
                  className="input"
                />
              </div>
            </div>
            
            {/* 按鈕 */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="btn-secondary min-w-[100px]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    儲存變更
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
