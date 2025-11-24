/**
 * 操作紀錄路由
 *
 * 僅提供管理員查閱 audit log
 */

import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { recordOperationLog } from '../services/operationLogService.js'

const router = express.Router()
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const DEFAULT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.register',
  'auth.change_password',
  'auth.admin_reset_password',
  'upload.batch_import',
  'videos.update',
  'selections.submit',
  'mail.recipient.add',
  'mail.recipient.remove',
  'mail.recipient.update',
  'users.role_change',
  'settings.operation_log_retention',
]

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limitRaw = parseInt(query.limit, 10) || DEFAULT_LIMIT
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}

function normalizeDateInput(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { action, actorId, targetId, search, startDate, endDate } = req.query
    const { page, limit, from, to } = parsePagination(req.query)

    let query = supabase
      .from('operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (action) {
      query = query.eq('action', action)
    }

    if (actorId) {
      query = query.eq('actor_id', actorId)
    }

    if (targetId) {
      query = query.eq('target_user_id', targetId)
    }

    const normalizedStart = normalizeDateInput(startDate)
    if (normalizedStart) {
      query = query.gte('created_at', normalizedStart)
    }

    const normalizedEnd = normalizeDateInput(endDate)
    if (normalizedEnd) {
      query = query.lte('created_at', normalizedEnd)
    }

    if (search) {
      const keyword = `%${search.trim()}%`
      query = query.or(
        `actor_email.ilike.${keyword},actor_name.ilike.${keyword},target_user_email.ilike.${keyword},target_user_name.ilike.${keyword},description.ilike.${keyword}`
      )
    }

    const { data, error, count } = await query.range(from, to)
    if (error) throw error

    const total = count || 0
    const totalPages = Math.max(Math.ceil(total / limit), 1)

    res.json({
      success: true,
      data: {
        items: data || [],
        page,
        pageSize: limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('取得操作紀錄失敗:', error)
    res.status(500).json({
      error: 'OperationLogsError',
      message: error.message || '無法取得操作紀錄',
    })
  }
})

router.get('/actions', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('operation_logs')
      .select('action')
      .not('action', 'is', null)
      .order('action', { ascending: true })

    if (error) throw error

    const actions = Array.from(
      new Set([
        ...DEFAULT_ACTIONS,
        ...((data || []).map((item) => item.action).filter(Boolean)),
      ])
    )

    res.json({ success: true, data: actions })
  } catch (error) {
    console.error('取得操作類別失敗:', error)
    res.status(500).json({
      error: 'OperationLogsError',
      message: error.message || '無法取得操作類別',
    })
  }
})

router.post('/events', requireAuth, async (req, res) => {
  try {
    const { action, description, metadata = {}, target } = req.body || {}

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'ValidationError', message: '請提供有效的 action 文字' })
    }

    await recordOperationLog({
      req,
      action,
      target,
      description,
      metadata,
    })

    res.json({ success: true })
  } catch (error) {
    console.error('建立操作事件失敗:', error)
    res.status(500).json({ error: 'OperationLogsError', message: error.message || '建立操作事件失敗' })
  }
})

export default router
