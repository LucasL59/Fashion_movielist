/**
 * 認證與密碼管理路由
 */

import express from 'express'
import crypto from 'crypto'
import { supabase, supabaseAnon } from '../config/supabase.js'
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { recordOperationLog } from '../services/operationLogService.js'

const router = express.Router()
const TOKEN_EXPIRATION_MINUTES = 60

function generateResetToken() {
  return crypto.randomBytes(48).toString('hex')
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function findProfileByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .ilike('email', email)
    .maybeSingle()

  if (error) throw error
  return data
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'customer' } = req.body || {}

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Bad Request', message: '請提供姓名、Email 與密碼' })
    }

    if (!['admin', 'uploader', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Bad Request', message: '角色設定無效' })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
      }
    })

    if (error) {
      const message = error?.message?.includes('already registered')
        ? '此 Email 已經註冊過'
        : error.message || '建立帳號失敗'
      return res.status(400).json({ error: 'Bad Request', message })
    }

    await sendWelcomeEmail({ to: email, name })

    await recordOperationLog({
      actor: {
        id: data.user?.id,
        name,
        email,
        role,
      },
      action: 'auth.register',
      description: `${name} 註冊帳號`,
      metadata: { role },
    })

    return res.json({ success: true, userId: data.user?.id })
  } catch (error) {
    console.error('註冊失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '建立帳號失敗，請稍後再試' })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) {
      return res.status(400).json({ error: 'Bad Request', message: '請輸入 Email' })
    }

    const profile = await findProfileByEmail(email)
    if (!profile) {
      return res.json({ success: true, message: '如 Email 存在，我們已寄出重設郵件' })
    }

    const token = generateResetToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000).toISOString()

    await supabase
      .from('password_resets')
      .insert({
        user_id: profile.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      })

    await sendPasswordResetEmail({ to: profile.email, name: profile.name, token })

    return res.json({ success: true, message: '重設連結已寄出，如未收到請檢查垃圾郵件' })
  } catch (error) {
    console.error('發送重設密碼郵件失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '無法寄出重設郵件' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) {
      return res.status(400).json({ error: 'Bad Request', message: '缺少必要欄位' })
    }

    const tokenHash = hashToken(token)
    const nowIso = new Date().toISOString()

    const { data: resetRecord, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gte('expires_at', nowIso)
      .maybeSingle()

    if (error) throw error
    if (!resetRecord) {
      return res.status(400).json({ error: 'Bad Request', message: '重設連結無效或已過期' })
    }

    await supabase.auth.admin.updateUserById(resetRecord.user_id, { password })

    await supabase
      .from('password_resets')
      .update({ used_at: nowIso })
      .eq('id', resetRecord.id)

    return res.json({ success: true, message: '密碼已更新，請重新登入' })
  } catch (error) {
    console.error('重設密碼失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '重設密碼失敗，請稍後再試' })
  }
})

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Bad Request', message: '請輸入目前密碼與新密碼' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Bad Request', message: '新密碼至少需要 6 個字元' })
    }

    const tempClient = supabaseAnon
    const { error: verifyError } = await tempClient.auth.signInWithPassword({
      email: req.authUser.email,
      password: currentPassword
    })

    if (verifyError) {
      return res.status(400).json({ error: 'Bad Request', message: '目前密碼不正確' })
    }

    await supabase.auth.admin.updateUserById(req.authUser.id, { password: newPassword })

    await recordOperationLog({
      req,
      action: 'auth.change_password',
      target: {
        id: req.authUser.id,
        name: req.authUserProfile?.name,
        email: req.authUser.email,
      },
      description: '使用者更新自己的密碼',
    })

    return res.json({ success: true, message: '密碼已更新' })
  } catch (error) {
    console.error('修改密碼失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '修改密碼失敗，請稍後再試' })
  }
})

router.post('/admin-reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, newPassword } = req.body || {}
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Bad Request', message: '請提供用戶 ID 與新密碼' })
    }

    await supabase.auth.admin.updateUserById(userId, { password: newPassword })

    await recordOperationLog({
      req,
      action: 'auth.admin_reset_password',
      target: { id: userId },
      description: '管理員重設用戶密碼',
    })

    return res.json({ success: true, message: '已重設該用戶密碼' })
  } catch (error) {
    console.error('管理員重設密碼失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '無法重設該用戶密碼' })
  }
})

export default router
