/**
 * 操作紀錄服務
 *
 * 提供統一定義，讓各路由在重要行為後記錄 audit log
 */

import { supabase } from '../config/supabase.js'

function resolveActorInfo({ req, actor }) {
  const profile = actor || req?.authUserProfile || null
  const user = req?.authUser || null

  return {
    actor_id: profile?.id || user?.id || null,
    actor_name: profile?.name || user?.user_metadata?.name || null,
    actor_email: profile?.email || user?.email || null,
    actor_role: profile?.role || user?.user_metadata?.role || null,
  }
}

function resolveTargetInfo(target = null) {
  if (!target) return { target_user_id: null, target_user_name: null, target_user_email: null }

  return {
    target_user_id: target.id || null,
    target_user_name: target.name || null,
    target_user_email: target.email || null,
  }
}

function resolveRequestContext(req) {
  if (!req) return { ip_address: null, user_agent: null }

  const forwardedFor = req.headers?.['x-forwarded-for'] || ''
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]

  return {
    ip_address: ip?.trim() || req.ip || null,
    user_agent: req.get ? req.get('user-agent') : req.headers?.['user-agent'] || null,
  }
}

export async function recordOperationLog({
  req = null,
  actor = null,
  target = null,
  action,
  resourceType = null,
  resourceId = null,
  description = null,
  metadata = null,
}) {
  if (!action) return

  const actorInfo = resolveActorInfo({ req, actor })

  if (!actorInfo.actor_id && !actorInfo.actor_email) {
    // 缺少操作者資訊時放棄寫入避免無效紀錄
    return
  }

  const targetInfo = resolveTargetInfo(target)
  const contextInfo = resolveRequestContext(req)

  const payload = {
    ...actorInfo,
    ...targetInfo,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    description,
    metadata: metadata || {},
    ...contextInfo,
  }

  try {
    const { error } = await supabase.from('operation_logs').insert(payload)
    if (error) {
      console.warn('寫入操作紀錄失敗:', error.message)
    }
  } catch (error) {
    console.warn('寫入操作紀錄發生錯誤:', error.message)
  }
}

export async function recordOperationBatch(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) return

  const rows = logs.map((log) => {
    const actorInfo = resolveActorInfo(log)
    const targetInfo = resolveTargetInfo(log.target)
    const contextInfo = resolveRequestContext(log.req)

    return {
      ...actorInfo,
      ...targetInfo,
      action: log.action,
      resource_type: log.resourceType || null,
      resource_id: log.resourceId || null,
      description: log.description || null,
      metadata: log.metadata || {},
      ...contextInfo,
    }
  })

  try {
    const { error } = await supabase.from('operation_logs').insert(rows)
    if (error) {
      console.warn('批次寫入操作紀錄失敗:', error.message)
    }
  } catch (error) {
    console.warn('批次寫入操作紀錄發生錯誤:', error.message)
  }
}
