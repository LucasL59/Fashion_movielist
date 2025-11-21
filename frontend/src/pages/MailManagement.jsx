/**
 * 郵件管理頁面
 *
 * 允許管理員設定不同事件的通知收件人
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Mail, ShieldCheck, Info } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createMailRule, deleteMailRule, getMailRules } from '../lib/api'

const MAIL_EVENTS = [
  {
    value: 'selection_submitted',
    label: '客戶提交影片選擇',
    description: '客戶完成影片挑選後通知相關人員（預設：系統管理員、該批次上傳者）',
  },
  {
    value: 'batch_uploaded',
    label: '新影片清單上傳',
    description: '有新的影片清單上架時通知輸控團隊（預設：通知所有使用者，實際寄信時會排除上傳者本人）',
  },
]

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
  const [rules, setRules] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [defaultRecipients, setDefaultRecipients] = useState({
    selection_submitted: [],
    batch_uploaded: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState(initialFormState)
  const [userSelectState, setUserSelectState] = useState(initialUserSelectState)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadMailRules()
  }, [])

  async function loadMailRules() {
    try {
      setLoading(true)
      setError('')
      const response = await getMailRules()
      setRules(response.data?.rules || [])
      setAvailableUsers(response.data?.availableUsers || [])
      setDefaultRecipients(response.data?.defaults || {})
    } catch (err) {
      console.error('載入郵件規則失敗:', err)
      setError('無法取得郵件設定，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecipientFromUser(eventType) {
    const profileId = userSelectState[eventType]
    if (!profileId) {
      setError('請先選擇要新增的使用者')
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
    } catch (err) {
      console.error('新增使用者收件人失敗:', err)
      setError(err.response?.data?.message || '新增失敗，請稍後再試。')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddRecipient(eventType) {
    const payload = formState[eventType]
    if (!payload.email) {
      setError('請輸入 Email')
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
    } catch (err) {
      console.error('新增收件人失敗:', err)
      setError(err.response?.data?.message || '新增收件人失敗，請確認 Email 格式。')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteRecipient(ruleId) {
    if (!ruleId) return
    try {
      await deleteMailRule(ruleId)
      await loadMailRules()
    } catch (err) {
      console.error('刪除收件人失敗:', err)
      setError('刪除失敗，請稍後再試。')
    }
  }

  const groupedRules = useMemo(() => {
    return MAIL_EVENTS.map((event) => ({
      ...event,
      recipients: rules.filter((rule) => rule.event_type === event.value),
    }))
  }, [rules])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">郵件通知管理</h1>
        <p className="text-gray-600 mt-2">
          設定不同事件的通知對象，確保所有關係人都能即時收到訊息。
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

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
                  系統預設會通知：管理員 Email（環境變數）與該批次的上傳者，您可以另外加上其他收件人。
                </div>
              )}
              {event.value === 'batch_uploaded' && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <ShieldCheck className="h-4 w-4" />
                  預設會通知所有管理員與上傳者（排除本次上傳者），若需額外通知對象可在此加入。
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
                    onClick={() => handleDeleteRecipient(rule.id)}
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
                  <select
                    className="select flex-1"
                    value={userSelectState[event.value]}
                    onChange={(e) =>
                      setUserSelectState((prev) => ({
                        ...prev,
                        [event.value]: e.target.value,
                      }))
                    }
                  >
                    <option value="">選擇使用者</option>
                    {availableUsers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}（{staff.email}）
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary flex items-center justify-center gap-2"
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
                    className="btn-primary flex items-center justify-center gap-2"
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
  )
}

