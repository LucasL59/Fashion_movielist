/**
 * 認證/授權中介層
 *
 * 提供共用的 requireAuth、requireAdmin、requireRoles 與 optionalAuth
 */

import { supabase } from '../config/supabase.js'

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

async function ensureAuthUserProfile(req) {
  if (!req.authUser?.id) {
    throw new Error('Missing authenticated user')
  }

  if (!req.authUserProfile) {
    req.authUserProfile = await fetchUserProfile(req.authUser.id)
  }

  return req.authUserProfile
}

export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req)

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: '缺少授權資訊' })
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Unauthorized', message: '授權無效或已過期' })
    }

    req.authUser = data.user
    req.authUserProfile = await fetchUserProfile(data.user.id)

    return next()
  } catch (error) {
    console.error('Auth 驗證失敗:', error)
    return res.status(401).json({ error: 'Unauthorized', message: '授權驗證失敗' })
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const profile = req.authUserProfile || (await ensureAuthUserProfile(req))

    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: '僅限管理員操作' })
    }

    return next()
  } catch (error) {
    console.error('檢查管理員權限失敗:', error)
    return res.status(500).json({ error: 'Internal Server Error', message: '無法驗證使用者權限' })
  }
}

export function requireRoles(allowedRoles = []) {
  return async function roleGuard(req, res, next) {
    try {
      const profile = req.authUserProfile || (await ensureAuthUserProfile(req))

      if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        return res.status(403).json({ error: 'Forbidden', message: '缺少操作權限' })
      }

      return next()
    } catch (error) {
      console.error('檢查使用者角色失敗:', error)
      return res.status(500).json({ error: 'Internal Server Error', message: '無法驗證使用者角色' })
    }
  }
}

export async function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req)

  if (!token) {
    return next()
  }

  try {
    const { data } = await supabase.auth.getUser(token)
    if (data?.user) {
      req.authUser = data.user
      req.authUserProfile = await fetchUserProfile(data.user.id)
    }
  } catch (error) {
    console.warn('可選驗證失敗，將繼續處理請求:', error.message)
  }

  return next()
}
