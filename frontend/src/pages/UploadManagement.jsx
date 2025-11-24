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
  AlertTriangle,
} from 'lucide-react'
import { uploadExcel, getBatches, getBatchSelections } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import Modal from '../components/Modal'

export default function UploadManagement() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [file, setFile] = useState(null)
  const [batchName, setBatchName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selections, setSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

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
      showToast('載入批次失敗', 'error')
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
      showToast('載入選擇失敗', 'error')
    }
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)

      // 如果使用者還沒有輸入批次名稱，嘗試從檔名提取月份
      if (!batchName) {
        let suggestedName = ''
        const fileName = selectedFile.name
        
        // 嘗試從檔名提取月份資訊
        const monthPatterns = [
          /(\d{4})[年\-]?(\d{1,2})月?/,  // 2024年11月, 2024-11, 202411
          /(\d{1,2})月/,                  // 11月, 10月
        ]
        
        const currentYear = new Date().getFullYear()
        let extractedMonth = null
        
        for (const pattern of monthPatterns) {
          const match = fileName.match(pattern)
          if (match) {
            if (match[2]) {
              // 有年份和月份
              extractedMonth = `${match[1]}-${String(match[2]).padStart(2, '0')}`
            } else {
              // 只有月份，使用當前年份
              extractedMonth = `${currentYear}-${String(match[1]).padStart(2, '0')}`
            }
            break
          }
        }
        
        // 如果成功提取月份，使用提取的月份；否則使用當前月份
        if (extractedMonth) {
          suggestedName = `${extractedMonth} 影片清單`
        } else {
          const now = new Date()
          suggestedName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} 影片清單`
        }
        
        setBatchName(suggestedName)
      }
    }
  }

  async function handleUpload() {
    if (!file) {
      showToast('請選擇檔案', 'warning')
      return
    }

    if (!batchName) {
      showToast('請輸入批次名稱', 'warning')
      return
    }

    try {
      setUploading(true)
      await uploadExcel(file, user.id, batchName)
      showToast('上傳成功！系統已發送通知', 'success')
      setFile(null)
      setBatchName('')

      await loadBatches()
      document.getElementById('file-input').value = ''
    } catch (error) {
      console.error('上傳失敗:', error)
      showToast(error.response?.data?.message || '上傳失敗，請稍後再試', 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleBatchClick(batch) {
    setSelectedBatch(batch)
    loadSelections(batch.id)
  }

  function handleDeleteBatch(batchId, name) {
    setPendingDelete({ id: batchId, name })
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return

    const { id, name } = pendingDelete
    try {
      setDeleting(id)
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', id)

      if (error) throw error

      setBatches(batches.filter((batch) => batch.id !== id))
      if (selectedBatch?.id === id) {
        setSelectedBatch(null)
        setSelections([])
      }

      showToast(`批次「${name}」已刪除`, 'success')
    } catch (error) {
      console.error('刪除批次失敗:', error)
      showToast('刪除批次失敗：' + error.message, 'error')
    } finally {
      setDeleting(null)
      setPendingDelete(null)
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

        <div className="space-y-4">
          <div>
            <label htmlFor="batch-name" className="block text-sm font-medium text-gray-700 mb-2">
              批次名稱 <span className="text-amber-600">*</span>
            </label>
            <input
              id="batch-name"
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="input"
              placeholder="例如：10月清單、2024-10 影片清單"
            />
            <p className="text-xs text-amber-600 mt-1.5">
              💡 提示：系統會自動從批次名稱或檔名中識別月份（如「10月」或「2024-10」）
            </p>
          </div>

          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Excel 檔案
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-input"
                className="btn btn-outline cursor-pointer"
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

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="確認刪除批次"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPendingDelete(null)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary bg-red-600 hover:bg-red-700 border-none"
              onClick={handleConfirmDelete}
              disabled={!!deleting}
            >
              {deleting ? '刪除中...' : '確認刪除'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-gray-600">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              確定要刪除批次「{pendingDelete?.name}」嗎？
            </p>
            <p className="mt-1 text-sm">
              此操作將會刪除該批次內的所有影片及客戶的選擇紀錄，且無法復原。
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}


