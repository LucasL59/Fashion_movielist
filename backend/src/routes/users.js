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
