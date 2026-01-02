import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { recordOperationLog } from '../services/operationLogService.js'

const router = express.Router()
const OPERATION_LOGS_KEY = 'operation_logs'
const MAIL_NOTIFICATIONS_KEY = 'mail_notifications'
const DEFAULT_RETENTION_DAYS = 90
const MIN_RETENTION_DAYS = 7
const MAX_RETENTION_DAYS = 365

function isMissingSettingsTableError(error) {
  if (!error) return false
  const code = error.code || error?.details || ''
  const message = (error.message || '').toLowerCase()
  return code === '42P01' || message.includes('system_settings')
}

async function getFallbackSettingFromLogs() {
  try {
    const { data, error } = await supabase
      .from('operation_logs')
      .select('metadata')
      .eq('action', 'settings.operation_log_retention')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('無法從操作紀錄讀取保留設定，將使用預設值:', error.message)
      return { retentionDays: DEFAULT_RETENTION_DAYS, lastCleanupAt: null }
    }

    const metadata = data?.metadata || {}
    if (metadata.retentionDays) {
      return {
        retentionDays: Number(metadata.retentionDays) || DEFAULT_RETENTION_DAYS,
        lastCleanupAt: metadata.lastCleanupAt || null,
      }
    }
  } catch (fallbackError) {
    console.warn('操作紀錄 fallback 讀取失敗，將使用預設值:', fallbackError.message)
  }

  return {
    retentionDays: DEFAULT_RETENTION_DAYS,
    lastCleanupAt: null,
  }
}

async function getOperationLogSetting() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', OPERATION_LOGS_KEY)
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTableError(error)) {
      console.warn('system_settings 表不存在，將改用操作紀錄作為設定來源')
      return getFallbackSettingFromLogs()
    }
    throw error
  }

  if (!data) {
    return {
      retentionDays: DEFAULT_RETENTION_DAYS,
      lastCleanupAt: null,
    }
  }

  const value = data.value || {}
  return {
    retentionDays: value.retentionDays || DEFAULT_RETENTION_DAYS,
    lastCleanupAt: value.lastCleanupAt || null,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  }
}

async function saveOperationLogSetting(retentionDays, adminId) {
  const payload = {
    key: OPERATION_LOGS_KEY,
    value: {
      retentionDays,
      lastCleanupAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
    updated_by: adminId || null,
  }

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' })
    .select('*')
    .single()

  if (error) {
    if (isMissingSettingsTableError(error)) {
      console.warn('system_settings 表不存在，略過資料庫持久化:', error.message)
      return null
    }
    throw error
  }
  return data
}

async function cleanupOperationLogs(retentionDays) {
  const thresholdDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('operation_logs')
    .delete()
    .lt('created_at', thresholdDate)
    .select('id')

  if (error) {
    console.error('清理操作紀錄失敗:', error.message)
    return { deletedCount: 0 }
  }

  return { deletedCount: data?.length || 0 }
}

router.get('/operation-logs', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const setting = await getOperationLogSetting()
    res.json({ success: true, data: setting })
  } catch (error) {
    console.error('取得操作紀錄設定失敗:', error)
    res.status(500).json({ error: 'SystemSettingsError', message: error.message || '無法取得設定' })
  }
})

router.put('/operation-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { retentionDays } = req.body || {}
    const parsedDays = Number(retentionDays)

    if (!Number.isInteger(parsedDays) || parsedDays < MIN_RETENTION_DAYS || parsedDays > MAX_RETENTION_DAYS) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `保留天數需介於 ${MIN_RETENTION_DAYS} 與 ${MAX_RETENTION_DAYS} 天之間`,
      })
    }

    const saved = await saveOperationLogSetting(parsedDays, req.authUser?.id)
    const cleanupResult = await cleanupOperationLogs(parsedDays)

    await recordOperationLog({
      req,
      action: 'settings.operation_log_retention',
      description: `更新操作紀錄保留天數為 ${parsedDays} 天`,
      metadata: {
        retentionDays: parsedDays,
        deletedLogs: cleanupResult.deletedCount,
      },
    })

    res.json({
      success: true,
      data: {
        retentionDays: parsedDays,
        lastCleanupAt: saved?.value?.lastCleanupAt || saved?.updated_at || new Date().toISOString(),
        deletedLogs: cleanupResult.deletedCount,
        persisted: Boolean(saved),
      },
    })
  } catch (error) {
    console.error('更新操作紀錄保留天數失敗:', error)
    res.status(500).json({ error: 'SystemSettingsError', message: error.message || '無法更新設定' })
  }
})

/**
 * GET /api/system-settings/mail-notifications
 * 取得郵件通知開關設定
 */
router.get('/mail-notifications', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value, updated_at, updated_by')
      .eq('key', MAIL_NOTIFICATIONS_KEY)
      .maybeSingle()

    if (error) {
      if (isMissingSettingsTableError(error)) {
        // 表不存在時返回預設值
        return res.json({
          success: true,
          data: {
            selection_submitted: { enabled: true },
            batch_uploaded: { enabled: true },
          },
        })
      }
      throw error
    }

    // 如果沒有資料，返回預設值
    if (!data) {
      return res.json({
        success: true,
        data: {
          selection_submitted: { enabled: true },
          batch_uploaded: { enabled: true },
        },
      })
    }

    res.json({
      success: true,
      data: data.value || {
        selection_submitted: { enabled: true },
        batch_uploaded: { enabled: true },
      },
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    })
  } catch (error) {
    console.error('取得郵件通知設定失敗:', error)
    res.status(500).json({
      error: 'SystemSettingsError',
      message: error.message || '無法取得郵件通知設定',
    })
  }
})

/**
 * PUT /api/system-settings/mail-notifications
 * 更新郵件通知開關設定
 */
router.put('/mail-notifications', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { selection_submitted, batch_uploaded } = req.body || {}

    // 驗證參數
    if (typeof selection_submitted?.enabled !== 'boolean' || typeof batch_uploaded?.enabled !== 'boolean') {
      return res.status(400).json({
        error: 'ValidationError',
        message: '請提供有效的開關設定（enabled 需為布林值）',
      })
    }

    const payload = {
      key: MAIL_NOTIFICATIONS_KEY,
      value: {
        selection_submitted: { enabled: selection_submitted.enabled },
        batch_uploaded: { enabled: batch_uploaded.enabled },
      },
      updated_at: new Date().toISOString(),
      updated_by: req.authUser?.id || req.authUserProfile?.id || null,
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert(payload, { onConflict: 'key' })
      .select('*')
      .single()

    if (error) {
      if (isMissingSettingsTableError(error)) {
        console.warn('system_settings 表不存在，無法儲存設定')
        return res.status(500).json({
          error: 'SystemSettingsError',
          message: 'system_settings 表不存在，請先執行資料庫遷移腳本',
        })
      }
      throw error
    }

    // 記錄操作
    const changes = []
    if (selection_submitted.enabled) {
      changes.push('啟用客戶提交影片選擇通知')
    } else {
      changes.push('停用客戶提交影片選擇通知')
    }
    if (batch_uploaded.enabled) {
      changes.push('啟用新影片清單上傳通知')
    } else {
      changes.push('停用新影片清單上傳通知')
    }

    await recordOperationLog({
      req,
      action: 'settings.mail_notifications',
      resourceType: 'system_settings',
      resourceId: MAIL_NOTIFICATIONS_KEY,
      description: `更新郵件通知設定：${changes.join('、')}`,
      metadata: {
        selection_submitted: selection_submitted.enabled,
        batch_uploaded: batch_uploaded.enabled,
      },
    })

    res.json({
      success: true,
      message: '郵件通知設定已更新',
      data: data.value,
    })
  } catch (error) {
    console.error('更新郵件通知設定失敗:', error)
    res.status(500).json({
      error: 'SystemSettingsError',
      message: error.message || '無法更新郵件通知設定',
    })
  }
})

export default router
