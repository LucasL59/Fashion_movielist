/**
 * 郵件通知設定路由
 *
 * 允許管理員維護可收取通知的收件人列表
 */

import express from 'express'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin, requireRoles } from '../middleware/auth.js'
import { recordOperationLog } from '../services/operationLogService.js'
import { notifyCustomersNewList } from '../services/emailService.js'
import { sendEmail } from '../config/graphClient.js'

const router = express.Router()

/**
 * POST /api/mail-rules/notifications/resend-to-user
 * 補發通知給單一使用者（僅限 admin）
 */
router.post('/notifications/resend-to-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, userEmail, userName, batchId, batchName } = req.body;
    
    if (!userEmail || !batchId || !batchName) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '缺少必要參數'
      });
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // 發送「新的影片清單已上傳」郵件
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Noto Sans TC', 'PingFang TC', sans-serif; line-height: 1.8; color: #3f3a36; background-color: #fdf7f2; margin: 0; padding: 0; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; }
          .card { background: #fff; border-radius: 16px; border: 1px solid #f0e0d6; overflow: hidden; box-shadow: 0 20px 45px rgba(89, 57, 47, 0.12); }
          .header { background-color: #d9b08c; color: #fff; padding: 28px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
          .content { padding: 32px; }
          .button { display: inline-block; background-color: #a6653f; color: #fff !important; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; letter-spacing: 1px; }
          .footer { text-align: center; padding: 24px; font-size: 12px; color: #8c7a71; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>新的影片清單已就緒</h1>
            </div>
            <div class="content">
              <p>親愛的 ${userName || '使用者'}，您好：</p>
              <p>最新的影片清單 <strong>${batchName}</strong> 已上線，歡迎登入系統挑選本月想要播放的片單。</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${frontendUrl}/movies" class="button">立即挑選影片</a>
              </div>
              <p>如有任何需求或問題，歡迎與我們聯繫，我們會盡快協助。</p>
            </div>
            <div class="footer">
              <p>MVI 影片選擇系統｜飛訊資訊科技有限公司</p>
              <p>此信件為系統通知，請勿直接回覆。</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({
      to: userEmail,
      subject: `新的影片清單已上傳 - ${batchName}`,
      body: emailBody
    });
    
    // 記錄操作
    await recordOperationLog({
      req,
      action: 'mail.resend_to_user',
      resourceType: 'batch',
      resourceId: batchId,
      description: `${req.authUserProfile?.name || '未知用戶'} 補發批次「${batchName}」的通知給 ${userName}`,
      metadata: {
        batchId,
        batchName,
        targetUserId: userId,
        targetUserEmail: userEmail,
        targetUserName: userName
      }
    });
    
    res.json({
      success: true,
      message: '通知已成功發送',
      data: {
        sentTo: userEmail,
        batchName
      }
    });
    
  } catch (error) {
    console.error('補發通知失敗:', error);
    res.status(500).json({
      error: 'NotificationError',
      message: error.message || '無法發送通知'
    });
  }
});

/**
 * POST /api/mail-rules/notifications/upload
 * 補發上傳通知（允許 admin 與 uploader）
 */
router.post('/notifications/upload', requireAuth, requireRoles(['admin', 'uploader']), async (req, res) => {
  try {
    const { batchId } = req.body;
    
    let targetBatch = null;
    
    if (batchId) {
      // 如果指定了 batchId，查詢該批次
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, created_at')
        .eq('id', batchId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) {
        return res.status(404).json({
          error: 'NotFound',
          message: '找不到指定的批次'
        });
      }
      targetBatch = data;
    } else {
      // 否則找最新的 active 批次
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        return res.status(404).json({
          error: 'NotFound',
          message: '目前沒有可用的批次'
        });
      }
      targetBatch = data;
    }
    
    // 發送統一通知
    const notificationStats = await notifyCustomersNewList(targetBatch.id, targetBatch.name);
    
    // 記錄操作
    await recordOperationLog({
      req,
      action: 'mail.batch_uploaded.resend',
      resourceType: 'batch',
      resourceId: targetBatch.id,
      description: `${req.authUserProfile?.name || '未知用戶'} 補發批次「${targetBatch.name}」的上傳通知`,
      metadata: {
        batchId: targetBatch.id,
        batchName: targetBatch.name,
        notificationStats
      }
    });
    
    res.json({
      success: true,
      message: '通知已成功發送',
      data: {
        batchId: targetBatch.id,
        batchName: targetBatch.name,
        notificationStats
      }
    });
    
  } catch (error) {
    console.error('補發通知失敗:', error);
    res.status(500).json({
      error: 'NotificationError',
      message: error.message || '無法發送通知'
    });
  }
});

/**
 * POST /api/mail-rules/notifications/selection-submitted
 * 補發客戶選擇通知（僅限 admin）
 */
router.post('/notifications/selection-submitted', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: '缺少客戶 ID'
      });
    }
    
    // 獲取客戶資訊
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', customerId)
      .eq('role', 'customer')
      .single();
    
    if (customerError || !customer) {
      return res.status(404).json({
        error: 'NotFound',
        message: '找不到指定的客戶'
      });
    }
    
    // 獲取該客戶最後一次的選擇記錄
    const { data: latestSelection, error: selectionError } = await supabase
      .from('selections')
      .select('id, batch_id, video_ids, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (selectionError) throw selectionError;
    
    if (!latestSelection || !latestSelection.video_ids || latestSelection.video_ids.length === 0) {
      return res.status(404).json({
        error: 'NotFound',
        message: '該客戶尚未提交任何選擇記錄'
      });
    }
    
    // 獲取選擇的影片詳細資訊
    const { data: selectedVideos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .in('id', latestSelection.video_ids);
    
    if (videosError) throw videosError;
    
    // 獲取當前批次資訊以計算上月差異（與原邏輯保持一致）
    const { data: currentBatch, error: batchError } = await supabase
      .from('batches')
      .select('month')
      .eq('id', latestSelection.batch_id)
      .single();
    
    let previousVideos = [];
    let previousVideoIds = [];
    
    if (currentBatch && currentBatch.month) {
      // 計算上一個月份
      const [year, month] = currentBatch.month.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      
      // 查找上月批次
      const { data: previousBatches } = await supabase
        .from('batches')
        .select('id')
        .eq('month', prevMonth)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (previousBatches && previousBatches.length > 0) {
        // 查找用戶上月選擇
        const { data: previousSelection } = await supabase
          .from('selections')
          .select('video_ids')
          .eq('user_id', customerId)
          .eq('batch_id', previousBatches[0].id)
          .maybeSingle();
        
        if (previousSelection && previousSelection.video_ids) {
          previousVideoIds = previousSelection.video_ids;
          
          // 獲取上月影片詳情
          const { data: prevVids } = await supabase
            .from('videos')
            .select('*')
            .in('id', previousVideoIds);
          
          previousVideos = prevVids || [];
        }
      }
    }
    
    // 發送通知給管理員（使用 emailService 中現有的函數）
    const { notifyAdminCustomerSelection } = await import('../services/emailService.js');
    
    await notifyAdminCustomerSelection({
      customerName: customer.name || customer.email,
      customerEmail: customer.email,
      batchId: latestSelection.batch_id,
      videos: selectedVideos || [],
      previousVideos: previousVideos,
      previousVideoIds: previousVideoIds
    });
    
    // 記錄操作
    await recordOperationLog({
      req,
      action: 'mail.selection_submitted.resend',
      resourceType: 'selection',
      resourceId: latestSelection.id,
      description: `${req.authUserProfile?.name || '未知用戶'} 補發客戶「${customer.name}」的影片選擇通知`,
      metadata: {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        selectionId: latestSelection.id,
        batchId: latestSelection.batch_id,
        videoCount: selectedVideos?.length || 0
      }
    });
    
    res.json({
      success: true,
      message: '選擇通知已成功發送',
      data: {
        customerId: customer.id,
        customerName: customer.name,
        selectionId: latestSelection.id,
        videoCount: selectedVideos?.length || 0
      }
    });
    
  } catch (error) {
    console.error('補發客戶選擇通知失敗:', error);
    res.status(500).json({
      error: 'NotificationError',
      message: error.message || '無法發送通知'
    });
  }
});

const EVENT_TYPES = ['selection_submitted', 'batch_uploaded']

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getAdminProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('role', 'admin')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // 如果有管理員資料，回傳；否則回退到環境變數
    if (data && data.length > 0) {
      return data;
    }
    
    // 回退：從環境變數建立虛擬管理員資料
    const envEmails = (process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    
    return envEmails.map((email, index) => ({
      id: `env-admin-${index}`,
      name: '系統管理員',
      email,
      role: 'admin'
    }));
  } catch (error) {
    console.error('取得管理員資料失敗:', error);
    return [];
  }
}

async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

async function buildDefaultRecipients(users) {
  const adminProfiles = await getAdminProfiles();
  
  const adminEntries = adminProfiles.map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    description: '系統管理員',
  }));

  // 上傳者清單
  const uploaderEntries = (users || [])
    .filter((user) => user.role === 'uploader')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      description: '上傳者',
    }));

  // 客戶清單調整通知：通知所有系統管理員和所有上傳者
  const selectionSubmittedRecipients = [
    ...adminEntries,
    ...uploaderEntries,
  ];

  // 新影片清單上傳通知：通知系統管理員和所有客戶
  const customerEntries = (users || [])
    .filter((user) => user.role === 'customer')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      description: '客戶',
    }));

  const batchUploadedRecipients = [
    ...adminEntries,
    ...customerEntries,
  ];

  return {
    selection_submitted: selectionSubmittedRecipients,
    batch_uploaded: batchUploadedRecipients,
  }
}

async function getDefaultEmails(eventType, users = []) {
  if (eventType === 'selection_submitted') {
    const adminProfiles = await getAdminProfiles();
    return adminProfiles.map(admin => admin.email).filter(Boolean);
  }
  if (eventType === 'batch_uploaded') {
    return (users || [])
      .filter((user) => user.role !== 'customer') // 只包含管理員與上傳者
      .map((user) => user.email)
      .filter(Boolean);
  }
  return []
}

/**
 * GET /api/mail-rules
 * 取得郵件規則與可選用戶
 */
router.use(requireAuth, requireAdmin)

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

    const defaults = await buildDefaultRecipients(users);

    res.json({
      success: true,
      data: {
        rules: data || [],
        availableUsers: users || [],
        defaults: defaults,
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

    let finalName = recipientName?.trim()
    let finalEmail = recipientEmail?.trim()
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

    const usersForDefaults =
      eventType === 'batch_uploaded' ? await fetchAllProfiles() : []
    const defaultEmails = await getDefaultEmails(eventType, usersForDefaults)
    if (defaultEmails.includes(finalEmail)) {
      return res.status(400).json({
        error: 'DuplicateRecipient',
        message: '此收件人已包含在預設通知對象中',
      })
    }

    const { count: existsCount } = await supabase
      .from('mail_rules')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .eq('recipient_email', finalEmail)

    if (existsCount) {
      return res.status(400).json({
        error: 'DuplicateRecipient',
        message: '此收件人已在通知清單中',
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

    await recordOperationLog({
      req,
      action: 'mail.recipient.add',
      resourceType: 'mail_rule',
      resourceId: data.id,
      description: `新增 ${eventType} 郵件收件者：${data.recipient_name}`,
      metadata: {
        eventType,
        recipientEmail: data.recipient_email,
        profileId: data.profile_id,
      },
    })

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

    await recordOperationLog({
      req,
      action: 'mail.recipient.update',
      resourceType: 'mail_rule',
      resourceId: data.id,
      description: `更新郵件收件者：${data.recipient_name}`,
      metadata: {
        recipientEmail: data.recipient_email,
        profileId: data.profile_id,
      },
    })

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

    const { data, error } = await supabase
      .from('mail_rules')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error

    if (data) {
      await recordOperationLog({
        req,
        action: 'mail.recipient.remove',
        resourceType: 'mail_rule',
        resourceId: data.id,
        description: `移除郵件收件者：${data.recipient_name}`,
        metadata: {
          eventType: data.event_type,
          recipientEmail: data.recipient_email,
          profileId: data.profile_id,
        },
      })
    }

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

