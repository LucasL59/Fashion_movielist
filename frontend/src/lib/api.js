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

/**
 * 從 Supabase 獲取當前的 access token
 * 動態導入避免循環依賴
 */
async function getAccessToken() {
  if (typeof window === 'undefined') return null

  try {
    // 動態導入 supabase，避免循環依賴
    const { supabase } = await import('./supabase')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('⚠️ 獲取 Supabase session 失敗:', error.message)
      return null
    }
    
    return session?.access_token || null
  } catch (error) {
    console.error('❌ 獲取 access token 時發生錯誤:', error)
    return null
  }
}

// 請求攔截器（添加認證 token 和禁用緩存）
api.interceptors.request.use(
  async (config) => {
    try {
      // 從 Supabase 獲取最新的 access token
      const token = await getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('❌ 請求攔截器錯誤:', error)
      // 即使獲取 token 失敗，仍然繼續請求
    }
    
    // 禁用緩存以避免 304 Not Modified 問題
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    config.headers['Pragma'] = 'no-cache'
    config.headers['Expires'] = '0'
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 響應攔截器（統一錯誤處理）
api.interceptors.response.use(
  (response) => {
    // 處理 304 Not Modified 等沒有 response body 的情況
    if (!response.data && response.status === 304) {
      console.warn(`⚠️ 收到 304 響應 (${response.config.url})，使用空數據`)
      response.data = {
        success: true,
        data: [],
        count: 0
      }
    }
    return response
  },
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
 * 獲取用戶在上一個月批次的選擇
 */
export async function getPreviousSelection(currentBatchId) {
  const response = await api.get(`/api/selections/previous/${currentBatchId}`)
  return response.data
}

/**
 * 獲取用戶目前擁有的所有影片（累積）
 * @deprecated 使用 getCustomerList 代替
 */
export async function getCurrentOwnedVideos(userId) {
  const response = await api.get(`/api/selections/current-owned/${userId}`)
  return response.data
}

/**
 * 客戶累積清單相關 API
 */

/**
 * 獲取客戶當前的累積清單
 */
export async function getCustomerList(customerId) {
  console.log(`🔍 載入客戶清單...`)
  const response = await api.get(`/api/customer-list/${customerId}`)
  
  // 處理 304 Not Modified 或其他沒有 body 的情況
  if (!response.data) {
    console.log('⚠️ API 返回空響應（可能是 304），返回空清單')
    return {
      success: true,
      data: {
        items: [],
        videoIds: []
      },
      count: 0
    }
  }
  
  const count = response.data?.count ?? response.data?.data?.items?.length ?? 0
  console.log(`✅ 已載入 ${count} 部影片`)
  return response.data
}

/**
 * 更新客戶清單（新增或移除影片）
 */
export async function updateCustomerList(customerId, { addVideoIds = [], removeVideoIds = [], month = null }) {
  console.log(`📝 更新客戶清單: 新增 ${addVideoIds.length} 部，移除 ${removeVideoIds.length} 部`)
  const response = await api.post(`/api/customer-list/${customerId}/update`, {
    addVideoIds,
    removeVideoIds,
    month
  })
  return response.data
}

/**
 * 提交客戶清單（記錄歷史快照並發送通知）
 */
export async function submitCustomerList(customerId, { addedVideos = [], removedVideos = [] }) {
  console.log(`📤 提交客戶清單: 新增 ${addedVideos.length} 部，移除 ${removedVideos.length} 部`)
  const response = await api.post(`/api/customer-list/${customerId}/submit`, {
    addedVideos,
    removedVideos
  })
  return response.data
}

/**
 * 獲取客戶的選擇歷史記錄
 */
export async function getCustomerListHistory(customerId, limit = 10) {
  const response = await api.get(`/api/customer-list/${customerId}/history`, {
    params: { limit }
  })
  return response.data
}

/**
 * 清空客戶的累積清單
 */
export async function clearCustomerList(customerId) {
  const response = await api.delete(`/api/customer-list/${customerId}/clear`)
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
export async function getReminderSettings() {
  const response = await api.get('/api/reminders/settings')
  return response.data
}

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
 * 獲取郵件通知開關設定
 */
export async function getMailNotificationSettings() {
  const response = await api.get('/api/system-settings/mail-notifications')
  return response.data
}

/**
 * 更新郵件通知開關設定
 */
export async function setMailNotificationSettings(data) {
  const response = await api.put('/api/system-settings/mail-notifications', data)
  return response.data
}

/**
 * 補發客戶選擇通知
 */
export async function resendSelectionNotification(customerId) {
  const response = await api.post('/api/mail-rules/notifications/selection-submitted', { customerId })
  return response.data
}

/**
 * 補發批次上傳通知（批量）
 */
export async function resendBatchUploadNotification(batchId) {
  const response = await api.post('/api/mail-rules/notifications/upload', { batchId })
  return response.data
}

export async function registerAccount(data) {
  const response = await api.post('/api/auth/register', data)
  return response.data
}

export async function requestPasswordReset(email) {
  const response = await api.post('/api/auth/forgot-password', { email })
  return response.data
}

export async function resetPassword(token, password) {
  const response = await api.post('/api/auth/reset-password', { token, password })
  return response.data
}

export async function changePassword(payload) {
  const response = await api.post('/api/auth/change-password', payload)
  return response.data
}

export async function adminResetUserPassword(userId, newPassword) {
  const response = await api.post('/api/auth/admin-reset-password', { userId, newPassword })
  return response.data
}

export async function updateUserRole(userId, role) {
  const response = await api.put(`/api/users/${userId}/role`, { role })
  return response.data
}

export async function createUser(userData) {
  const response = await api.post('/api/users', userData)
  return response.data
}

export async function deleteUser(userId) {
  const response = await api.delete(`/api/users/${userId}`)
  return response.data
}

export async function getOperationLogRetentionSetting() {
  const response = await api.get('/api/system-settings/operation-logs')
  return response.data
}

export async function updateOperationLogRetention({ retentionDays }) {
  const response = await api.put('/api/system-settings/operation-logs', { retentionDays })
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
export async function getAdminDashboardOverview(batchId = null) {
  const params = batchId ? { batchId } : {}
  const response = await api.get('/api/dashboard/admin/overview', { params })
  return response.data
}

/**
 * 取得操作紀錄清單（僅管理員）
 */
export async function resendUploadNotification(batchId, batchName) {
  const response = await api.post('/api/mail-rules/notifications/upload', { batchId, batchName })
  return response.data
}

export async function getOperationLogs(params = {}) {
  const response = await api.get('/api/operation-logs', { params })
  return response.data
}

/**
 * 取得所有 operation action 類別
 */
export async function getOperationLogActions() {
  const response = await api.get('/api/operation-logs/actions')
  return response.data
}

export async function recordOperationEvent(payload) {
  const response = await api.post('/api/operation-logs/events', payload)
  return response.data
}

/**
 * 取得所有客戶的當前清單總覽（v3 累積清單架構）
 */
export async function getCustomerListsOverview() {
  const response = await api.get('/api/selections/customer-lists')
  return response.data
}

// 向後兼容：保留舊函數名稱
export async function getMonthlySelectionSummary(month) {
  // v3 不再按月份查詢，直接返回所有客戶清單
  return getCustomerListsOverview()
}

export default api

