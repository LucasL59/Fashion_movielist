/**
 * 操作紀錄頁面（僅管理員）
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getOperationLogActions, getOperationLogs } from '../lib/api'
import Select from '../components/Select'

const PAGE_SIZE = 20
const ACTION_LABELS = {
  'upload.batch_import': '批次上傳影片',
  'auth.login': '登入',
  'auth.logout': '登出',
  'auth.register': '註冊',
  'auth.change_password': '修改密碼',
  'auth.admin_reset_password': '管理員重設密碼',
  'videos.update': '編輯影片',
  'selections.submit': '選擇影片',
  'mail.recipient.add': '新增郵件收件者',
  'mail.recipient.remove': '移除郵件收件者',
  'mail.recipient.update': '更新郵件收件者',
  'users.role_change': '用戶角色變更',
  'settings.operation_log_retention': '操作紀錄保留設定',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

function MetadataList({ metadata }) {
  if (!metadata || typeof metadata !== 'object') return null
  const entries = Object.entries(metadata).filter(([, val]) => val !== undefined && val !== null)
  if (!entries.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
        >
          <span className="font-semibold text-gray-800">{key}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600 break-all">{String(val)}</span>
        </span>
      ))}
    </div>
  )
}

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  )
}

export default function OperationLogs() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [actions, setActions] = useState([])
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({ action: '', search: '', startDate: '', endDate: '' })
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [expandedRows, setExpandedRows] = useState({})

  const hasFilters = useMemo(() => {
    return Object.values(filters).some((value) => Boolean(value))
  }, [filters])

  useEffect(() => {
    async function loadActions() {
      try {
        const response = await getOperationLogActions()
        setActions(response.data || [])
      } catch (error) {
        console.error('載入動作類別失敗:', error)
      }
    }
    loadActions()
  }, [])

  const actionOptions = useMemo(() => {
    const unique = Array.from(new Set(actions || []))
    return unique.map((action) => ({
      value: action,
      label: ACTION_LABELS[action] || action,
    }))
  }, [actions])

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters])

  async function loadLogs() {
    try {
      setLoading(true)
      const params = {
        page,
        limit: PAGE_SIZE,
        action: filters.action || undefined,
        search: filters.search || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }
      const response = await getOperationLogs(params)
      setLogs(response.data?.items || [])
      setMeta({
        total: response.data?.total || 0,
        totalPages: response.data?.totalPages || 1,
      })
    } catch (error) {
      console.error('載入操作紀錄失敗:', error)
      showToast('無法載入操作紀錄，請稍後再試', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function updateFilters(partial) {
    setFilters((prev) => ({ ...prev, ...partial }))
    setPage(1)
  }

  function handleResetFilters() {
    setFilters({ action: '', search: '', startDate: '', endDate: '' })
    setPage(1)
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadLogs()
  }

  function toggleExpansion(logId) {
    setExpandedRows((prev) => ({ ...prev, [logId]: !prev[logId] }))
  }

  if (user?.role !== 'admin') {
    return (
      <div className="card text-center py-12">
        <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h2>
        <p className="text-gray-600">只有管理員可以查看操作紀錄</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <ScrollText className="h-10 w-10 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">操作紀錄</h1>
            <p className="text-gray-600 mt-1">追蹤系統內的關鍵操作與敏感動作</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="stat-card">
            <p className="text-sm text-gray-500">今天已記錄</p>
            <p className="text-2xl font-semibold text-gray-900">
              {logs.filter((log) => new Date(log.created_at).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">總紀錄數</p>
            <p className="text-2xl font-semibold text-gray-900">{meta.total.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-gray-500">目前頁面</p>
            <p className="text-2xl font-semibold text-gray-900">
              {page}/{meta.totalPages}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="h-5 w-5" />
          <span className="font-semibold">篩選條件</span>
          {hasFilters && (
            <span className="inline-flex items-center text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
              已套用
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">操作類別</label>
            <Select
              value={filters.action}
              onChange={(e) => updateFilters({ action: e.target.value })}
              options={actionOptions}
              placeholder={actionOptions.length ? '選擇操作類別' : '尚無資料'}
              disabled={!actionOptions.length}
            />
            {!actionOptions.length && (
              <p className="text-xs text-gray-400 mt-1">尚未產生任何操作類別</p>
            )}
          </div>

          <div>
            <label className="label">搜尋內容</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="輸入操作者、目標或描述"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">起始日期</label>
            <input
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="label">結束日期</label>
            <input
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Activity className="h-4 w-4 mr-2" />
            套用篩選
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleResetFilters} disabled={loading}>
            清除條件
          </button>
          <button
            type="button"
            className="btn btn-ghost flex items-center gap-2"
            onClick={() => {
              setRefreshing(true)
              loadLogs()
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            重新整理
          </button>
        </div>
      </form>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <ScrollText className="h-5 w-5" />
            <span className="font-semibold">紀錄列表</span>
            <span className="text-sm text-gray-400">共 {meta.total.toLocaleString()} 筆</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-gray-200 bg-white p-1 shadow-inner">
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition ${
                  viewMode === 'list' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
                清單
              </button>
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition ${
                  viewMode === 'cards' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
                卡片
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                讀取中...
              </div>
            )}
          </div>
        </div>

        {logs.length === 0 && !loading ? (
          <div className="text-center py-12 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-3" />
            <p>暫無符合條件的紀錄</p>
          </div>
        ) : (
          <div>
            {viewMode === 'list' ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">發生時間 / 來源</th>
                      <th className="px-4 py-3 text-left font-medium">操作</th>
                      <th className="px-4 py-3 text-left font-medium">操作者</th>
                      <th className="px-4 py-3 text-left font-medium">目標</th>
                      <th className="px-4 py-3 text-left font-medium">描述摘要</th>
                      <th className="px-4 py-3 text-right font-medium">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const expanded = expandedRows[log.id]
                      return (
                        <>
                          <tr key={log.id} className="bg-white">
                            <td className="px-4 py-3 align-top text-gray-700">
                              <p className="font-semibold text-gray-900">{formatDate(log.created_at)}</p>
                              <p className="text-xs text-gray-500">IP：{log.ip_address || '未知'}</p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                                {ACTION_LABELS[log.action] || '未知動作'}
                              </span>
                              <p className="text-xs text-gray-400 mt-1 break-all">{log.action}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-gray-700">
                              <p className="font-medium">{log.actor_name || '—'}</p>
                              <p className="text-xs text-gray-500 break-all">{log.actor_email || '—'}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-gray-700">
                              {log.target_user_name || log.target_user_email ? (
                                <>
                                  <p className="font-medium">{log.target_user_name || '—'}</p>
                                  <p className="text-xs text-gray-500 break-all">{log.target_user_email || '—'}</p>
                                </>
                              ) : (
                                <p className="text-gray-400">無</p>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-gray-700">
                              <p className="line-clamp-2 text-sm text-gray-600">{log.description || '—'}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                                onClick={() => toggleExpansion(log.id)}
                              >
                                {expanded ? (
                                  <>
                                    收合
                                    <ChevronUp className="h-4 w-4" />
                                  </>
                                ) : (
                                  <>
                                    展開
                                    <ChevronDown className="h-4 w-4" />
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr key={`${log.id}-detail`} className="bg-gray-50/60">
                              <td colSpan={6} className="px-6 py-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <InfoBlock title="操作者">
                                    <p className="text-base font-semibold text-gray-900">{log.actor_name || '—'}</p>
                                    <p className="text-sm text-gray-500 break-all">{log.actor_email || '—'}</p>
                                    <p className="text-xs text-gray-400 mt-1">角色：{log.actor_role || '未知'}</p>
                                  </InfoBlock>
                                  <InfoBlock title="目標與來源">
                                    <p className="text-sm text-gray-600">{log.target_user_name || '無特定目標'}</p>
                                    {log.target_user_email && (
                                      <p className="text-xs text-gray-500 break-all">{log.target_user_email}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">IP：{log.ip_address || '未知'}</p>
                                    {log.user_agent && (
                                      <p className="text-xs text-gray-400 break-words">UA：{log.user_agent}</p>
                                    )}
                                  </InfoBlock>
                                </div>
                                <div className="mt-4">
                                  <InfoBlock title="描述 / 附註">
                                    <p className="text-sm text-gray-700">{log.description || '—'}</p>
                                    <MetadataList metadata={log.metadata} />
                                  </InfoBlock>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => {
                  const expanded = expandedRows[log.id]
                  return (
                    <article
                      key={log.id}
                      className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">發生時間</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(log.created_at)}</p>
                          <p className="text-xs text-gray-500 mt-1">IP：{log.ip_address || '未知'}</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <span className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-semibold text-primary-700">
                            {ACTION_LABELS[log.action] || '未知動作'}
                          </span>
                          <span className="text-xs text-gray-400">{log.action}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-gray-700 line-clamp-2">{log.description || '—'}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {log.actor_name || '—'} · {log.actor_role || '未知' }
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                          onClick={() => toggleExpansion(log.id)}
                        >
                          {expanded ? (
                            <>
                              收合詳細
                              <ChevronUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              查看詳細
                              <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>

                      {expanded && (
                        <div className="pt-4 space-y-4 border-t border-gray-100 mt-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <InfoBlock title="操作者">
                              <p className="text-base font-semibold text-gray-900">{log.actor_name || '—'}</p>
                              <p className="text-sm text-gray-500 break-all">{log.actor_email || '—'}</p>
                              <p className="text-xs text-gray-400 mt-1">角色：{log.actor_role || '未知'}</p>
                            </InfoBlock>
                            <InfoBlock title="目標與來源">
                              <p className="text-sm text-gray-600">{log.target_user_name || '無特定目標'}</p>
                              {log.target_user_email && (
                                <p className="text-xs text-gray-500 break-all">{log.target_user_email}</p>
                              )}
                              {log.user_agent && (
                                <p className="text-xs text-gray-400 break-words mt-2">UA：{log.user_agent}</p>
                              )}
                            </InfoBlock>
                          </div>
                          <InfoBlock title="描述 / 附註">
                            <p className="text-sm text-gray-700">{log.description || '—'}</p>
                            <MetadataList metadata={log.metadata} />
                          </InfoBlock>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            第 {page} / {meta.totalPages} 頁，共 {meta.total.toLocaleString()} 筆紀錄
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-2"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              上一頁
            </button>
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-2"
              onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
              disabled={page >= meta.totalPages || loading}
            >
              下一頁
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
