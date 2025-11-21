/**
 * 郵件通知設定路由
 *
 * 允許管理員維護可收取通知的收件人列表
 */

import express from 'express'
import { supabase } from '../config/supabase.js'

const router = express.Router()

const EVENT_TYPES = ['selection_submitted', 'batch_uploaded']

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * GET /api/mail-rules
 * 取得所有郵件規則，可透過 eventType 過濾
 */
router.get('/', async (req, res) => {
  try {
    const { eventType } = req.query
    let query = supabase
      .from('mail_rules')
      .select('*')
      .order('event_type', { ascending: true })
      .order('created_at', { ascending: true })

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('取得郵件規則失敗:', error)
    res.status(500).json({
      error: 'MailRulesError',
      message: error.message || '無法取得郵件規則',
    })
  }
})

/**
 * POST /api/mail-rules
 * 新增郵件規則
 */
router.post('/', async (req, res) => {
  try {
    const { eventType, recipientName, recipientEmail, createdBy } = req.body

    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '不支援的郵件事件類型',
      })
    }

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email 格式不正確',
      })
    }

    const { data, error } = await supabase
      .from('mail_rules')
      .insert({
        event_type: eventType,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('新增郵件規則失敗:', error)
    res.status(500).json({
      error: 'MailRulesError',
      message: error.message || '無法新增郵件規則',
    })
  }
})

/**
 * PUT /api/mail-rules/:id
 * 更新郵件規則
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { recipientName, recipientEmail } = req.body

    if (recipientEmail && !isValidEmail(recipientEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email 格式不正確',
      })
    }

    const updatePayload = {}
    if (typeof recipientName === 'string') {
      updatePayload.recipient_name = recipientName
    }
    if (recipientEmail) {
      updatePayload.recipient_email = recipientEmail
    }
    updatePayload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('mail_rules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('更新郵件規則失敗:', error)
    res.status(500).json({
      error: 'MailRulesError',
      message: error.message || '無法更新郵件規則',
    })
  }
})

/**
 * DELETE /api/mail-rules/:id
 * 刪除郵件規則
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('mail_rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      success: true,
      message: '郵件規則已刪除',
    })
  } catch (error) {
    console.error('刪除郵件規則失敗:', error)
    res.status(500).json({
      error: 'MailRulesError',
      message: error.message || '無法刪除郵件規則',
    })
  }
})

export default router

