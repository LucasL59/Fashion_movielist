import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { recordOperationLog } from '../services/operationLogService.js'

const router = express.Router()

const ALLOWED_ROLES = ['admin', 'uploader', 'customer']

async function fetchProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * POST /api/users
 * 管理員建立新使用者
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'ValidationError', message: '請填寫完整欄位（Email、密碼、名稱、角色）' })
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'ValidationError', message: '無效的角色類型' })
    }

    // 1. 建立 Supabase Auth User
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動驗證 Email，讓使用者可直接登入
      user_metadata: { 
        full_name: name,
        role 
      }
    })

    if (createError) {
      throw createError
    }

    const newUser = authData.user

    // 2. 確保 Profile 存在 (手動寫入以防 Trigger 延遲或失敗)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        email: email,
        name: name,
        role: role,
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.warn('Profile 寫入失敗 (可能由 Trigger 處理):', profileError.message)
    }

    // 3. 記錄操作日誌
    await recordOperationLog({
      req,
      action: 'users.create',
      target: {
        id: newUser.id,
        name: name,
        email: email,
      },
      description: `建立使用者：${name} (${role})`,
      metadata: {
        role,
        createdByAdmin: true
      },
    })

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email,
        name,
        role
      },
      message: '使用者建立成功'
    })

  } catch (error) {
    console.error('建立使用者失敗:', error)
    res.status(500).json({ 
      error: 'UserCreationError', 
      message: error.message || '建立使用者失敗' 
    })
  }
})

router.put('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body || {}

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'ValidationError', message: '請提供合法的角色類型' })
    }

    const existingProfile = await fetchProfileById(id)
    if (!existingProfile) {
      return res.status(404).json({ error: 'NotFound', message: '找不到指定的使用者' })
    }

    if (existingProfile.role === role) {
      return res.json({ success: true, data: existingProfile, message: '角色未變更' })
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    const { data: adminUserData, error: adminFetchError } = await supabase.auth.admin.getUserById(id)
    if (adminFetchError) {
      console.warn('讀取 auth user 失敗，將略過 metadata 同步:', adminFetchError.message)
    } else if (adminUserData?.user) {
      const currentMetadata = adminUserData.user.user_metadata || {}
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { ...currentMetadata, role },
      })
    }

    await recordOperationLog({
      req,
      action: 'users.role_change',
      target: {
        id,
        name: updatedProfile.name,
        email: updatedProfile.email,
      },
      description: `變更 ${updatedProfile.name || updatedProfile.email} 的角色：${existingProfile.role} → ${role}`,
      metadata: {
        oldRole: existingProfile.role,
        newRole: role,
      },
    })

    res.json({ success: true, data: updatedProfile })
  } catch (error) {
    console.error('更新使用者角色失敗:', error)
    res.status(500).json({ error: 'UserManagementError', message: error.message || '更新角色失敗' })
  }
})

export default router
