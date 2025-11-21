/**
 * 上傳管理頁面
 *
 * 管理影片清單上傳與客戶選擇狀態
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Upload,
  FileSpreadsheet,
  Users,
  CheckCircle,
  AlertCircle,
  Loader,
  Trash2,
} from 'lucide-react'
import { uploadExcel, getBatches, getBatchSelections } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function UploadManagement() {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [batchName, setBatchName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadBatches()
  }, [])

  async function loadBatches() {
    try {
      setLoading(true)
      const response = await getBatches()
      setBatches(response.data || [])
    } catch (error) {
      console.error('載入批次失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSelections(batchId) {
    try {
      const response = await getBatchSelections(batchId)
      setSelections(response.data || [])
    } catch (error) {
      console.error('載入選擇失敗:', error)
    }
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadSuccess(false)
      setUploadError('')

      if (!batchName) {
        const now = new Date()
        const defaultName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} 影片清單`
        setBatchName(defaultName)
      }
    }
  }

  async function handleUpload() {
    if (!file) {
      setUploadError('請選擇檔案')
      return
    }

    if (!batchName) {
      setUploadError('請輸入批次名稱')
      return
    }

    try {
      setUploading(true)
      setUploadError('')
      await uploadExcel(file, user.id, batchName)
      setUploadSuccess(true)
      setFile(null)
      setBatchName('')

      await loadBatches()
      document.getElementById('file-input').value = ''
    } catch (error) {
      console.error('上傳失敗:', error)
      setUploadError(error.response?.data?.message || '上傳失敗，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  function handleBatchClick(batch) {
    setSelectedBatch(batch)
    loadSelections(batch.id)
  }

  async function handleDeleteBatch(batchId, name) {
    if (!window.confirm(`確定要刪除批次「${name}」嗎？\n\n此操作無法復原。`)) {
      return
    }

    try {
      setDeleting(batchId)
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId)

      if (error) throw error

      setBatches(batches.filter((batch) => batch.id !== batchId))
      if (selectedBatch?.id === batchId) {
        setSelectedBatch(null)
        setSelections([])
      }

      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error) {
      console.error('刪除批次失敗:', error)
      setUploadError('刪除批次失敗：' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">上傳管理</h1>
        <p className="text-gray-600 mt-2">上傳影片清單、管理批次與客戶選擇</p>
      </div>

      {/* 上傳區域 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">上傳影片清單</h2>
        </div>

        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">上傳成功！</p>
              <p className="text-sm text-green-700 mt-1">
                影片清單已上傳，系統已自動發送通知給所有客戶。
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="batch-name" className="block text-sm font-medium text-gray-700 mb-2">
              批次名稱
            </label>
            <input
              id="batch-name"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="input"
              placeholder="例如：2025-01 影片清單"
            />
          </div>

          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Excel 檔案
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-input"
                className="btn btn-outline cursor-pointer inline-flex items-center gap-2"
              >
                <FileSpreadsheet className="h-5 w-5" />
                選擇檔案
              </label>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {file && <span className="text-sm text-gray-600">{file.name}</span>}
            </div>
            <p className="text-xs text-gray-500 mt-2">支援 .xlsx 與 .xls，需包含影片圖片</p>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn btn-primary"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="spinner"></div>
                上傳中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                上傳並發送通知
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 批次列表與客戶選擇 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">批次列表與客戶選擇</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        ) : batches.length === 0 ? (
          <p className="text-center text-gray-500 py-12">尚無批次記錄</p>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`border rounded-lg p-4 transition-all ${
                  selectedBatch?.id === batch.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleBatchClick(batch)}
                  >
                    <h3 className="font-semibold text-gray-900">{batch.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      上傳時間：{new Date(batch.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-600">
                      影片數量：<span className="font-semibold">{batch.videos?.[0]?.count || 0}</span>
                    </p>
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBatch(batch.id, batch.name)
                        }}
                        disabled={deleting === batch.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        {deleting === batch.id ? (
                          <div className="spinner w-5 h-5"></div>
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {selectedBatch?.id === batch.id && selections.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">客戶選擇</h4>
                    <div className="space-y-2">
                      {selections.map((selection) => (
                        <div key={selection.id} className="bg-white rounded p-3 border border-gray-100">
                          <p className="font-medium text-gray-900">
                            {selection.profiles?.name || '未知客戶'}
                          </p>
                          <p className="text-sm text-gray-600">{selection.profiles?.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            已選擇 {selection.video_ids?.length || 0} 部影片
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            提交時間：{new Date(selection.created_at).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


