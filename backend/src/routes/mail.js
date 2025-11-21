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

async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * GET /api/mail-rules
 * 取得郵件規則與可選用戶
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

    const [{ data, error }, users] = await Promise.all([
      query,
      fetchAllProfiles(),
    ])
    if (error) throw error

    const defaults = {
      selection_submitted: [
        {
          id: 'dynamic-uploader',
          name: '該批次上傳者',
          email: '-',
          description: '系統會根據實際上傳此批次的使用者自動通知',
        },
      ],
      batch_uploaded: (users || []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
    }

    res.json({
      success: true,
      data: {
        rules: data || [],
        availableUsers: users || [],
        defaults,
      },
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
    const { eventType, recipientName, recipientEmail, createdBy, profileId } = req.body

    if (!EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '不支援的郵件事件類型',
      })
    }

    let finalName = recipientName
    let finalEmail = recipientEmail
    let profileReference = profileId || null

    if (profileId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '找不到指定的使用者',
        })
      }
      finalName = profile.name
      finalEmail = profile.email
    }

    if (!finalEmail || !isValidEmail(finalEmail)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email 格式不正確',
      })
    }

    const { data, error } = await supabase
      .from('mail_rules')
      .insert({
        event_type: eventType,
        recipient_name: finalName,
        recipient_email: finalEmail,
        profile_id: profileReference,
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
    const { recipientName, recipientEmail, profileId } = req.body

    const updatePayload = {}

    if (profileId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        return res.status(400).json({
          error: 'ValidationError',
          message: '找不到指定的使用者',
        })
      }
      updatePayload.profile_id = profile.id
      updatePayload.recipient_name = profile.name
      updatePayload.recipient_email = profile.email
    } else {
      if (recipientName !== undefined) {
        updatePayload.recipient_name = recipientName
        updatePayload.profile_id = null
      }
      if (recipientEmail) {
        if (!isValidEmail(recipientEmail)) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'Email 格式不正確',
          })
        }
        updatePayload.recipient_email = recipientEmail
      }
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

