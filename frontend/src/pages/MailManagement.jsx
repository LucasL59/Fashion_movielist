/**
 * 郵件管理頁面
 *
 * 允許管理員設定不同事件的通知收件人
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Mail, ShieldCheck, Info, AlertTriangle, Clock, Calendar, X, Send, User, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createMailRule, deleteMailRule, getMailRules, getReminderSettings, setReminderSchedule, getBatches, getMailNotificationSettings, setMailNotificationSettings, resendSelectionNotification, resendBatchUploadNotification } from '../lib/api'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

const MAIL_EVENTS = [
  {
    value: 'selection_submitted',
    label: '客戶提交影片選擇',
    description: '客戶完成影片挑選後通知相關人員（預設：所有系統管理員、該批次上傳者）',
  },
  {
    value: 'batch_uploaded',
    label: '新影片清單上傳',
    description: '有新的影片清單上架時通知內部人員（預設：所有管理員與上傳者，實際寄信時會排除本次上傳者本人。客戶會收到另一封專屬通知）',
  },
]

const DEFAULT_REMINDER_MESSAGE = '請記得上傳本月的影片清單'

const initialFormState = MAIL_EVENTS.reduce((acc, event) => {
  acc[event.value] = { name: '', email: '' }
  return acc
}, {})

const initialUserSelectState = MAIL_EVENTS.reduce((acc, event) => {
  acc[event.value] = ''
  return acc
}, {})

export default function MailManagement() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rules, setRules] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [defaultRecipients, setDefaultRecipients] = useState({
    selection_submitted: [],
    batch_uploaded: [],
  })
  
  // 郵件通知開關狀態
  const [mailToggles, setMailToggles] = useState({
    selection_submitted: { enabled: true },
    batch_uploaded: { enabled: true },
  })
  const [mailTogglesLoading, setMailTogglesLoading] = useState(false)
  const [mailTogglesSyncing, setMailTogglesSyncing] = useState(false)

  // 提醒設定 State
  const [reminderConfig, setReminderConfig] = useState({
    enabled: false,
    dayOfMonth: 1,
    hourOfDay: 9,
    message: DEFAULT_REMINDER_MESSAGE,
    extraEmails: [],
  })
  const [newExtraEmail, setNewExtraEmail] = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderSyncing, setReminderSyncing] = useState(false)
  const [messageDraft, setMessageDraft] = useState(DEFAULT_REMINDER_MESSAGE)

  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState(initialFormState)
  const [userSelectState, setUserSelectState] = useState(initialUserSelectState)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  
  // 補發通知相關狀態
  const [allUsers, setAllUsers] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sendingTo, setSendingTo] = useState(null) // 正在發送給哪個使用者
  
  // 客戶選擇補發相關狀態
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [resendingSelection, setResendingSelection] = useState(false)
  
  // 批次上傳補發相關狀態
  const [selectedBatchForResend, setSelectedBatchForResend] = useState('')
  const [resendingBatch, setResendingBatch] = useState(false)

  const uploaderEmails = useMemo(() => {
    return availableUsers
      .filter(u => u.role === 'uploader')
      .map(u => u.email.toLowerCase())
  }, [availableUsers])

  useEffect(() => {
    loadMailRules()
    loadReminderSettings()
    loadUsersAndBatches()
    loadMailNotificationToggles()
  }, [])
  
  async function loadUsersAndBatches() {
    try {
      setLoadingUsers(true)
      
      // 載入所有使用者
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .order('role', { ascending: true })
        .order('name', { ascending: true })
      
      if (usersError) throw usersError
      setAllUsers(usersData || [])
      
      // 載入批次清單
      const batchesResponse = await getBatches()
      setBatches(batchesResponse.data || [])
      
      // 預設選擇最新批次
      if (batchesResponse.data && batchesResponse.data.length > 0) {
        setSelectedBatch(batchesResponse.data[0].id)
      }
    } catch (error) {
      console.error('載入使用者或批次失敗:', error)
      showToast('載入資料失敗', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }
  
  // 載入郵件通知開關設定
  async function loadMailNotificationToggles() {
    try {
      setMailTogglesLoading(true)
      const response = await getMailNotificationSettings()
      const settings = response.data || {}
      
      setMailToggles({
        selection_submitted: settings.selection_submitted || { enabled: true },
        batch_uploaded: settings.batch_uploaded || { enabled: true },
      })
    } catch (error) {
      console.error('載入郵件通知開關失敗:', error)
      // 載入失敗時使用預設值（都啟用）
      setMailToggles({
        selection_submitted: { enabled: true },
        batch_uploaded: { enabled: true },
      })
    } finally {
      setMailTogglesLoading(false)
    }
  }
  
  // 切換郵件通知開關
  async function handleToggleMailNotification(eventType) {
    if (mailTogglesSyncing) return
    
    const currentEnabled = mailToggles[eventType]?.enabled
    const newToggles = {
      ...mailToggles,
      [eventType]: { enabled: !currentEnabled }
    }
    
    setMailToggles(newToggles)
    setMailTogglesSyncing(true)
    
    try {
      await setMailNotificationSettings(newToggles)
      const eventLabel = eventType === 'selection_submitted' ? '客戶提交影片選擇' : '新影片清單上傳'
      showToast(`${eventLabel}通知已${!currentEnabled ? '啟用' : '停用'}`, 'success')
    } catch (error) {
      console.error('更新郵件通知開關失敗:', error)
      // 恢復原狀態
      setMailToggles(mailToggles)
      showToast('更新失敗，請稍後再試', 'error')
    } finally {
      setMailTogglesSyncing(false)
    }
  }
  
  // 補發客戶選擇通知
  async function handleResendSelectionNotification() {
    if (!selectedCustomer) {
      showToast('請先選擇客戶', 'warning')
      return
    }
    
    const customer = allUsers.find(u => u.id === selectedCustomer)
    if (!customer) {
      showToast('找不到指定的客戶', 'error')
      return
    }
    
    try {
      setResendingSelection(true)
      await resendSelectionNotification(selectedCustomer)
      showToast(`已成功補發 ${customer.name} 的選擇通知`, 'success')
      setSelectedCustomer('') // 清空選擇
    } catch (error) {
      console.error('補發客戶選擇通知失敗:', error)
      const errorMsg = error.response?.data?.message || '補發通知失敗'
      showToast(errorMsg, 'error')
    } finally {
      setResendingSelection(false)
    }
  }
  
  // 補發批次上傳通知
  async function handleResendBatchUploadNotification() {
    if (!selectedBatchForResend) {
      showToast('請先選擇批次', 'warning')
      return
    }
    
    const batch = batches.find(b => b.id === selectedBatchForResend)
    if (!batch) {
      showToast('找不到指定的批次', 'error')
      return
    }
    
    try {
      setResendingBatch(true)
      const response = await resendBatchUploadNotification(selectedBatchForResend)
      const stats = response.data?.notificationStats
      if (stats) {
        showToast(`已補發通知：${stats.customersSent} 位客戶、${stats.internalSent} 位內部人員`, 'success')
      } else {
        showToast(`已成功補發批次「${batch.name}」的上傳通知`, 'success')
      }
      setSelectedBatchForResend('') // 清空選擇
    } catch (error) {
      console.error('補發批次上傳通知失敗:', error)
      const errorMsg = error.response?.data?.message || '補發通知失敗'
      showToast(errorMsg, 'error')
    } finally {
      setResendingBatch(false)
    }
  }

  // ... (loadReminderSettings)

  async function loadReminderSettings() {
    try {
      setReminderLoading(true)
      const response = await getReminderSettings()
      const config = response.data || {}
      
      // 解析 Cron: "0 9 1 * *" -> 分 時 日 月 週
      const parts = (config.cronSchedule || '0 9 1 * *').split(' ')
      const hour = parseInt(parts[1] || '9', 10)
      const day = parseInt(parts[2] || '1', 10)

      const nextConfig = {
        enabled: config.enabled || false,
        dayOfMonth: day,
        hourOfDay: hour,
        message: config.message || DEFAULT_REMINDER_MESSAGE,
        extraEmails: config.extraEmails || []
      }

      setReminderConfig(nextConfig)
      setMessageDraft(nextConfig.message)
    } catch (error) {
      console.error('載入提醒設定失敗:', error)
      // 不顯示錯誤 toast，因為這不是主要功能，且可能是初次使用
    } finally {
      setReminderLoading(false)
    }
  }

  function buildReminderPayload(config) {
    return {
      enabled: config.enabled,
      cronSchedule: `0 ${config.hourOfDay} ${config.dayOfMonth} * *`,
      message: config.message,
      recipientType: 'uploader',
      extraEmails: config.extraEmails
    }
  }

  async function syncReminderConfig(nextConfig, { successMessage, errorMessage } = {}) {
    if (reminderSyncing) return false

    const previousConfig = reminderConfig
    setReminderConfig(nextConfig)
    setReminderSyncing(true)

    try {
      await setReminderSchedule(buildReminderPayload(nextConfig))
      if (successMessage) {
        showToast(successMessage, 'success')
      }
      return true
    } catch (error) {
      console.error('更新提醒設定失敗:', error)
      setReminderConfig(previousConfig)
      showToast(errorMessage || '更新提醒設定失敗，請稍後再試', 'error')
      return false
    } finally {
      setReminderSyncing(false)
    }
  }

  async function handleToggleReminder() {
    if (reminderSyncing) return
    const nextConfig = { ...reminderConfig, enabled: !reminderConfig.enabled }
    await syncReminderConfig(nextConfig, {
      successMessage: nextConfig.enabled ? '每月提醒已啟用' : '每月提醒已停用'
    })
  }

  async function handleReminderDayChange(day) {
    if (reminderSyncing) return
    const nextConfig = { ...reminderConfig, dayOfMonth: day }
    await syncReminderConfig(nextConfig, { successMessage: '提醒日期已更新' })
  }

  async function handleReminderHourChange(hour) {
    if (reminderSyncing) return
    const nextConfig = { ...reminderConfig, hourOfDay: hour }
    await syncReminderConfig(nextConfig, { successMessage: '提醒時間已更新' })
  }

  async function handleMessageBlur() {
    if (reminderSyncing) return
    const trimmed = messageDraft.trim()
    if (!trimmed) {
      showToast('提醒訊息不可為空', 'warning')
      setMessageDraft(reminderConfig.message)
      return
    }
    if (trimmed === reminderConfig.message) return

    const nextConfig = { ...reminderConfig, message: trimmed }
    const success = await syncReminderConfig(nextConfig, { successMessage: '提醒訊息已更新' })
    if (!success) {
      // 還原輸入框內容
      setMessageDraft(reminderConfig.message)
    }
  }

  async function handleAddExtraEmail() {
    if (!newExtraEmail) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newExtraEmail)) {
      showToast('Email 格式不正確', 'warning')
      return
    }
    
    const emailLower = newExtraEmail.toLowerCase()

    if (reminderConfig.extraEmails.some(e => e.toLowerCase() === emailLower)) {
      showToast('此 Email 已在清單中', 'info')
      setNewExtraEmail('')
      return
    }

    if (uploaderEmails.includes(emailLower)) {
      showToast('此 Email 為系統上傳者，已包含在預設通知對象中', 'info')
      setNewExtraEmail('')
      return
    }

    const nextConfig = {
      ...reminderConfig,
      extraEmails: [...reminderConfig.extraEmails, newExtraEmail]
    }

    const success = await syncReminderConfig(nextConfig, { successMessage: '已新增額外通知 Email' })
    if (success) {
      setNewExtraEmail('')
    }
  }

  async function handleRemoveExtraEmail(email) {
    if (reminderSyncing) return
    const nextConfig = {
      ...reminderConfig,
      extraEmails: reminderConfig.extraEmails.filter(e => e !== email)
    }

    await syncReminderConfig(nextConfig, { successMessage: '已移除額外通知 Email' })
  }

  async function loadMailRules() {
    try {
      setLoading(true)
      const response = await getMailRules()
      setRules(response.data?.rules || [])
      setAvailableUsers(response.data?.availableUsers || [])
      setDefaultRecipients(response.data?.defaults || {})
    } catch (err) {
      console.error('載入郵件規則失敗:', err)
      showToast('無法取得郵件設定，請稍後再試。', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecipientFromUser(eventType) {
    const profileId = userSelectState[eventType]
    if (!profileId) {
      showToast('請先選擇要新增的使用者', 'warning')
      return
    }

    // 檢查是否已存在於預設名單中 (簡單檢查 ID 或 Email)
    const selectedUser = availableUsers.find(u => u.id === profileId)
    const isDefault = defaultRecipients[eventType]?.some(
      r => r.email === selectedUser?.email || r.id === profileId
    )
    
    if (isDefault) {
      showToast('此使用者已包含在預設通知對象中，無需重複新增', 'info')
      return
    }

    // 檢查是否已存在於額外規則中
    const isExist = rules.some(
      r => r.event_type === eventType && r.recipient_email === selectedUser?.email
    )
    
    if (isExist) {
      showToast('此使用者已在額外收件人名單中', 'warning')
      return
    }

    try {
      setSubmitting(true)
      await createMailRule({
        eventType,
        profileId,
        createdBy: user?.id,
      })
      setUserSelectState((prev) => ({
        ...prev,
        [eventType]: '',
      }))
      await loadMailRules()
      showToast('已成功加入使用者', 'success')
    } catch (err) {
      console.error('新增使用者收件人失敗:', err)
      showToast(err.response?.data?.message || '新增失敗，請稍後再試。', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddRecipient(eventType) {
    const payload = formState[eventType]
    if (!payload.email) {
      showToast('請輸入 Email', 'warning')
      return
    }

    // 檢查是否已存在於預設名單
    const isDefault = defaultRecipients[eventType]?.some(
      r => r.email === payload.email
    )
    
    if (isDefault) {
      showToast('此 Email 已包含在預設通知對象中，無需重複新增', 'info')
      return
    }

    // 檢查是否已存在於額外規則
    const isExist = rules.some(
      r => r.event_type === eventType && r.recipient_email === payload.email
    )
    
    if (isExist) {
      showToast('此 Email 已在額外收件人名單中', 'warning')
      return
    }

    try {
      setSubmitting(true)
      await createMailRule({
        eventType,
        recipientName: payload.name,
        recipientEmail: payload.email,
        createdBy: user?.id,
      })
      setFormState((prev) => ({
        ...prev,
        [eventType]: { name: '', email: '' },
      }))
      await loadMailRules()
      showToast('已新增收件人', 'success')
    } catch (err) {
      console.error('新增收件人失敗:', err)
      showToast(err.response?.data?.message || '新增收件人失敗，請確認 Email 格式。', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteRecipient(ruleId) {
    if (!ruleId) return
    try {
      await deleteMailRule(ruleId)
      await loadMailRules()
      showToast('已移除收件人', 'success')
    } catch (err) {
      console.error('刪除收件人失敗:', err)
      showToast('刪除失敗，請稍後再試。', 'error')
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteRecipient(pendingDelete.id)
    } finally {
      setPendingDelete(null)
    }
  }
  
  async function handleResendToUser(userId) {
    if (!selectedBatch) {
      showToast('請先選擇批次', 'warning')
      return
    }
    
    const user = allUsers.find(u => u.id === userId)
    const batch = batches.find(b => b.id === selectedBatch)
    
    if (!user || !batch) {
      showToast('找不到使用者或批次', 'error')
      return
    }
    
    try {
      setSendingTo(userId)
      
      // 呼叫後端 API 發送單一使用者通知
      await api.post('/api/mail-rules/notifications/resend-to-user', {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        batchId: batch.id,
        batchName: batch.name
      })
      
      showToast(`已成功發送通知給 ${user.name}`, 'success')
    } catch (error) {
      console.error('發送通知失敗:', error)
      showToast(error.response?.data?.message || '發送通知失敗', 'error')
    } finally {
      setSendingTo(null)
    }
  }

  const groupedRules = useMemo(() => {
    return MAIL_EVENTS.map((event) => ({
      ...event,
      recipients: rules.filter((rule) => rule.event_type === event.value),
    }))
  }, [rules])

  return (
    <>
      <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">郵件通知管理</h1>
        <p className="text-gray-600 mt-2">
          設定不同事件的通知對象，確保所有關係人都能即時收到訊息。
        </p>
      </div>

      {/* 客戶提交影片選擇通知 */}
      <section className="card bg-white border-primary-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">客戶提交影片選擇通知</h2>
              <p className="text-sm text-gray-500">客戶提交選擇時自動通知管理員與上傳者</p>
              {!mailToggles.selection_submitted?.enabled && (
                <p className="text-xs text-gray-400 mt-1">啟用後所有變更會立即套用，無需手動儲存</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggleMailNotification('selection_submitted')}
              disabled={mailTogglesSyncing}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                mailToggles.selection_submitted?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              } ${mailTogglesSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="sr-only">啟用客戶提交通知</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  mailToggles.selection_submitted?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${mailToggles.selection_submitted?.enabled ? 'text-primary-700' : 'text-gray-500'}`}>
              {mailToggles.selection_submitted?.enabled ? '已啟用' : '已停用'}
            </span>
            {mailTogglesSyncing ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="spinner w-4 h-4 border-gray-300"></span>
                <span>同步中...</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">變更會自動儲存</span>
            )}
          </div>
        </div>

        {mailTogglesLoading ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <div className="spinner"></div> 載入設定中...
          </div>
        ) : mailToggles.selection_submitted?.enabled ? (
          <div className="space-y-4 transition-all duration-300">
            <p className="text-sm text-gray-600">
              當客戶提交或更新影片選擇時，系統會自動發送通知郵件給所有管理員、該批次的上傳者，以及額外設定的收件人。
            </p>
            
            {/* 補發客戶選擇通知 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">補發客戶選擇通知</p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">選擇特定客戶，重新發送其最後一次的影片選擇通知給管理員與上傳者。</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      options={[
                        { value: '', label: '請選擇客戶' },
                        ...allUsers
                          .filter(u => u.role === 'customer')
                          .map((customer) => ({
                            value: customer.id,
                            label: `${customer.name} (${customer.email})`
                          }))
                      ]}
                    />
                  </div>
                  <button
                    onClick={handleResendSelectionNotification}
                    disabled={!selectedCustomer || resendingSelection}
                    className="btn btn-secondary whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {resendingSelection ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>發送中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>補發通知</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 將補發該客戶最後一次提交的選擇記錄通知
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p>客戶提交影片選擇通知目前為停用狀態。</p>
            <p className="text-sm mt-1">啟用後當客戶提交選擇時會自動發送通知。</p>
          </div>
        )}
      </section>

      {/* 新影片清單上傳通知 */}
      <section className="card bg-white border-primary-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">新影片清單上傳通知</h2>
              <p className="text-sm text-gray-500">上傳新清單時自動通知所有客戶與相關人員</p>
              {!mailToggles.batch_uploaded?.enabled && (
                <p className="text-xs text-gray-400 mt-1">啟用後所有變更會立即套用，無需手動儲存</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleToggleMailNotification('batch_uploaded')}
              disabled={mailTogglesSyncing}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                mailToggles.batch_uploaded?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              } ${mailTogglesSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="sr-only">啟用上傳通知</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  mailToggles.batch_uploaded?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${mailToggles.batch_uploaded?.enabled ? 'text-primary-700' : 'text-gray-500'}`}>
              {mailToggles.batch_uploaded?.enabled ? '已啟用' : '已停用'}
            </span>
            {mailTogglesSyncing ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="spinner w-4 h-4 border-gray-300"></span>
                <span>同步中...</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">變更會自動儲存</span>
            )}
          </div>
        </div>

        {mailTogglesLoading ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <div className="spinner"></div> 載入設定中...
          </div>
        ) : mailToggles.batch_uploaded?.enabled ? (
          <div className="space-y-4 transition-all duration-300">
            <p className="text-sm text-gray-600">
              當管理員或上傳者上傳新的影片清單時，系統會自動發送通知郵件給所有客戶，以及內部相關人員（管理員、上傳者，排除本次上傳者本人）。
            </p>
            
            {/* 補發上傳通知（批量） */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">補發上傳通知（批量）</p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">選擇批次，重新發送上傳通知給所有客戶與相關人員。</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedBatchForResend}
                      onChange={(e) => setSelectedBatchForResend(e.target.value)}
                      options={[
                        { value: '', label: '請選擇批次' },
                        ...batches.map((batch) => ({
                          value: batch.id,
                          label: `${batch.name} (${new Date(batch.created_at).toLocaleDateString('zh-TW')})`
                        }))
                      ]}
                    />
                  </div>
                  <button
                    onClick={handleResendBatchUploadNotification}
                    disabled={!selectedBatchForResend || resendingBatch}
                    className="btn btn-secondary whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {resendingBatch ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>發送中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>補發通知</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 將通知所有客戶與內部人員（管理員、上傳者）
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p>新影片清單上傳通知目前為停用狀態。</p>
            <p className="text-sm mt-1">啟用後當上傳新清單時會自動發送通知。</p>
          </div>
        )}
      </section>

      {/* 每月提醒設定 */}
      <section className="card bg-white border-primary-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">每月上傳提醒</h2>
              <p className="text-sm text-gray-500">設定定期發送 Email 提醒上傳者上傳影片清單</p>
              <p className="text-xs text-gray-400 mt-1">啟用後所有變更會立即套用，無需手動儲存</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleReminder}
              disabled={reminderSyncing}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                reminderConfig.enabled ? 'bg-primary-600' : 'bg-gray-200'
              } ${reminderSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="sr-only">啟用提醒</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  reminderConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${reminderConfig.enabled ? 'text-primary-700' : 'text-gray-500'}`}>
              {reminderConfig.enabled ? '已啟用' : '已停用'}
            </span>
            {reminderSyncing ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="spinner w-4 h-4 border-gray-300"></span>
                <span>同步中...</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">變更會自動儲存</span>
            )}
          </div>
        </div>

        {reminderLoading ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <div className="spinner"></div> 載入設定中...
          </div>
        ) : reminderConfig.enabled ? (
          <div className="space-y-6 transition-all duration-300">
            {/* 時間設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">提醒時間</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={reminderConfig.dayOfMonth}
                      onChange={(e) => handleReminderDayChange(parseInt(e.target.value, 10))}
                      disabled={reminderSyncing}
                      className="pl-10 input w-full appearance-none disabled:cursor-not-allowed"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>每月 {day} 號</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={reminderConfig.hourOfDay}
                      onChange={(e) => handleReminderHourChange(parseInt(e.target.value, 10))}
                      disabled={reminderSyncing}
                      className="pl-10 input w-full appearance-none disabled:cursor-not-allowed"
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">提醒訊息內容</label>
                <input
                  type="text"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onBlur={handleMessageBlur}
                  disabled={reminderSyncing}
                  className="input w-full disabled:cursor-not-allowed"
                  placeholder="例如：請記得上傳本月的影片清單"
                />
              </div>
            </div>

            {/* 收件人設定 */}
            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">通知對象</label>
              <div className="space-y-4">
                {/* 預設通知對象（上傳者） */}
                <div className="bg-white border border-dashed border-primary-200 rounded-xl px-4 py-3">
                  <div className="flex flex-col gap-1 mb-2">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary-600" />
                      預設通知對象（所有上傳者）
                    </p>
                    <p className="text-xs text-gray-500">
                      啟用提醒後系統會自動通知所有上傳者，無須額外切換。
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {availableUsers.filter(u => u.role === 'uploader').map((uploader) => (
                      <span
                        key={uploader.id}
                        className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs"
                      >
                        {uploader.name}
                        {uploader.email && <span className="text-gray-500 ml-1">（{uploader.email}）</span>}
                      </span>
                    ))}
                    {availableUsers.filter(u => u.role === 'uploader').length === 0 && (
                      <span className="text-xs text-gray-500">目前系統中沒有上傳者</span>
                    )}
                  </div>
                </div>

                {/* 額外通知 Email */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">額外通知 Email</p>
                  {reminderConfig.extraEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {reminderConfig.extraEmails.map(email => (
                        <span key={email} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-200 text-gray-700 shadow-sm">
                          {email}
                          <button
                            onClick={() => handleRemoveExtraEmail(email)}
                            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                            disabled={reminderSyncing}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newExtraEmail}
                      onChange={(e) => setNewExtraEmail(e.target.value)}
                      placeholder="輸入 Email 後按 Enter 或點擊新增"
                      className="input flex-1"
                      disabled={reminderSyncing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddExtraEmail()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraEmail}
                      disabled={reminderSyncing}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4 mr-1" /> 新增
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">
            <p>每月提醒目前為停用狀態。</p>
            <p className="text-sm mt-1">啟用後即可設定提醒時間與通知對象。</p>
          </div>
        )}
      </section>

      {/* 個別使用者補發通知卡片 */}
      <section className="card bg-white border-blue-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">個別使用者補發通知</h2>
            <p className="text-sm text-gray-500">針對個別使用者補發「新的影片清單已上傳」通知</p>
          </div>
        </div>

        {loadingUsers ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader className="h-5 w-5 animate-spin" />
            載入使用者資料中...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 批次選擇器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇批次
              </label>
              <Select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                options={[
                  { value: '', label: '請選擇批次' },
                  ...batches.map((batch) => ({
                    value: batch.id,
                    label: `${batch.name} (${new Date(batch.created_at).toLocaleDateString('zh-TW')})`
                  }))
                ]}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                💡 選擇要補發通知的影片清單批次
              </p>
            </div>

            {/* 使用者列表 */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">所有使用者</p>
              <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50">
                {allUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-full flex-shrink-0 ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                        user.role === 'uploader' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-medium text-gray-900 flex-shrink-0">{user.name}</span>
                        <span className="text-sm text-gray-600 truncate">{user.email}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                          user.role === 'uploader' ? 'bg-blue-50 text-blue-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {user.role === 'admin' ? '管理員' : user.role === 'uploader' ? '上傳者' : '客戶'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResendToUser(user.id)}
                      disabled={!selectedBatch || sendingTo === user.id}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5 flex-shrink-0"
                    >
                      {sendingTo === user.id ? (
                        <>
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-xs">發送中...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span className="text-xs">補發通知</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
                {allUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">目前沒有使用者</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="spinner"></div>
          載入郵件規則中...
        </div>
      ) : (
        groupedRules.map((event) => (
          <section key={event.value} className="card space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{event.label}</h2>
                  <p className="text-sm text-gray-500">{event.description}</p>
                </div>
              </div>
              {event.value === 'selection_submitted' && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <ShieldCheck className="h-4 w-4" />
                  系統預設會通知：所有系統管理員（依使用者資料）與該批次的上傳者，您可以另外加上其他收件人。
                </div>
              )}
              {event.value === 'batch_uploaded' && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <ShieldCheck className="h-4 w-4" />
                  預設會通知所有管理員與上傳者（排除本次上傳者本人）。客戶會收到另一封「新的影片清單已上傳」通知，無需重複設定。
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-dashed border-primary-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary-600" />
                  預設通知對象
                </p>
                <div className="flex flex-wrap gap-2">
                  {(defaultRecipients[event.value] || []).map((recipient) => (
                    <span
                      key={recipient.id || recipient.email || recipient.name}
                      className="inline-flex items-center rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs"
                    >
                      {recipient.name}
                      {recipient.email && <span className="text-gray-500 ml-1">（{recipient.email}）</span>}
                      {recipient.description && (
                        <span className="text-gray-500 ml-1 text-[11px]">{recipient.description}</span>
                      )}
                    </span>
                  ))}
                  {(defaultRecipients[event.value] || []).length === 0 && (
                    <span className="text-xs text-gray-500">尚未設定預設通知對象</span>
                  )}
                </div>
              </div>

              {event.recipients.length === 0 && (
                <p className="text-sm text-gray-500">目前尚未設定額外收件人。</p>
              )}
              {event.recipients.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-primary-50/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{rule.recipient_name || '未命名'}</p>
                    <p className="text-sm text-gray-600">{rule.recipient_email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(rule)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="移除收件人"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">從系統使用者加入</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Select
                      value={userSelectState[event.value]}
                      onChange={(e) =>
                        setUserSelectState((prev) => ({
                          ...prev,
                          [event.value]: e.target.value,
                        }))
                      }
                      options={[
                        { value: '', label: '選擇使用者' },
                        ...availableUsers.map((staff) => ({
                          value: staff.id,
                          label: `${staff.name}（${staff.email}）`
                        }))
                      ]}
                      placeholder="選擇使用者"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
                    onClick={() => handleAddRecipientFromUser(event.value)}
                    disabled={submitting}
                  >
                    <Plus className="h-4 w-4" />
                    加入使用者
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">手動輸入 Email</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="顯示名稱（選填）"
                    value={formState[event.value].name}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        [event.value]: { ...prev[event.value], name: e.target.value },
                      }))
                    }
                  />
                  <input
                    type="email"
                    className="input flex-1"
                    placeholder="收件人 Email"
                    value={formState[event.value].email}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        [event.value]: { ...prev[event.value], email: e.target.value },
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                    onClick={() => handleAddRecipient(event.value)}
                    disabled={submitting}
                  >
                    <Plus className="h-4 w-4" />
                    新增
                  </button>
                </div>
              </div>
            </div>
          </section>
        ))
      )}
    </div>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="確認移除收件人"
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
            >
              確認刪除
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-gray-600">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            確定要移除「{pendingDelete?.recipient_name || pendingDelete?.recipient_email}」嗎？
            此操作將使該收件人無法收到相關通知。
          </p>
        </div>
      </Modal>
    </>
  )
}

