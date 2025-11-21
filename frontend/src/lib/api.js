/**
 * API 客戶端
 * 
 * 封裝所有 API 請求
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器（添加認證 token）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 響應攔截器（統一錯誤處理）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

/**
 * 上傳 Excel 檔案
 */
export async function uploadExcel(file, userId, batchName) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)
  formData.append('batchName', batchName)
  
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

/**
 * 獲取最新影片清單
 */
export async function getLatestVideos() {
  const response = await api.get('/api/videos/latest')
  return response.data
}

/**
 * 獲取指定月份的影片清單
 */
export async function getVideosByMonth(month) {
  const response = await api.get(`/api/videos/by-month/${month}`)
  return response.data
}

/**
 * 獲取所有可用月份
 */
export async function getAvailableMonths() {
  const response = await api.get('/api/videos/months')
  return response.data
}

/**
 * 獲取單一影片
 */
export async function getVideo(id) {
  const response = await api.get(`/api/videos/${id}`)
  return response.data
}

/**
 * 更新影片資訊
 */
export async function updateVideo(id, data, thumbnailFile = null) {
  const formData = new FormData()
  
  // 添加文字資料
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key])
    }
  })
  
  // 添加圖片檔案
  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile)
  }
  
  const response = await api.put(`/api/videos/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

/**
 * 刪除影片
 */
export async function deleteVideo(id) {
  const response = await api.delete(`/api/videos/${id}`)
  return response.data
}

/**
 * 獲取特定批次的影片
 */
export async function getVideosByBatch(batchId) {
  const response = await api.get(`/api/videos/batch/${batchId}`)
  return response.data
}

/**
 * 獲取所有批次
 */
export async function getBatches() {
  // 直接使用 Supabase 查詢批次
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      videos:videos(count)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return { data }
}

/**
 * 提交影片選擇
 */
export async function submitSelection(data) {
  const response = await api.post('/api/selections', data)
  return response.data
}

/**
 * 獲取用戶的選擇記錄
 */
export async function getUserSelections(userId) {
  const response = await api.get(`/api/selections/user/${userId}`)
  return response.data
}

/**
 * 郵件規則相關 API
 */
export async function getMailRules(params = {}) {
  const response = await api.get('/api/mail-rules', { params })
  return response.data
}

export async function createMailRule(data) {
  const response = await api.post('/api/mail-rules', data)
  return response.data
}

export async function updateMailRule(id, data) {
  const response = await api.put(`/api/mail-rules/${id}`, data)
  return response.data
}

export async function deleteMailRule(id) {
  const response = await api.delete(`/api/mail-rules/${id}`)
  return response.data
}

/**
 * 獲取批次的所有選擇（管理員）
 */
export async function getBatchSelections(batchId) {
  // 直接使用 Supabase 查詢選擇記錄
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase
    .from('selections')
    .select(`
      *,
      profiles:user_id (
        name,
        email
      )
    `)
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return { data }
}

/**
 * 設定提醒排程
 */
export async function setReminderSchedule(data) {
  const response = await api.post('/api/reminders/schedule', data)
  return response.data
}

/**
 * 立即發送提醒
 */
export async function sendReminderNow(data) {
  const response = await api.post('/api/reminders/send', data)
  return response.data
}

/**
 * 取得客戶儀表板狀態
 */
export async function getCustomerDashboardStatus(userId) {
  const response = await api.get(`/api/dashboard/customer/${userId}`)
  return response.data
}

/**
 * 取得管理員/上傳者儀表板概況
 */
export async function getAdminDashboardOverview() {
  const response = await api.get('/api/dashboard/admin/overview')
  return response.data
}

export default api

