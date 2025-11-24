/**
 * 用戶管理頁面（僅管理員）
 * 
 * 管理所有用戶的角色
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Users, Shield, Upload as UploadIcon, User, CheckCircle, AlertCircle, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { adminResetUserPassword, updateUserRole } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [resetTarget, setResetTarget] = useState(null)
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
    }
  }, [user])

  function openResetModal(targetUser) {
    setResetTarget(targetUser)
    setResetForm({ password: '', confirmPassword: '' })
    setResetError('')
  }

  async function handleResetPassword(e) {
    e.preventDefault()

    if (!resetForm.password || !resetForm.confirmPassword) {
      setResetError('請填寫所有欄位')
      return
    }

    if (resetForm.password.length < 6) {
      setResetError('新密碼至少需 6 個字元')
      return
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('確認密碼不一致')
      return
    }

    try {
      setResetLoading(true)
      setResetError('')
      await adminResetUserPassword(resetTarget.id, resetForm.password)
      showToast('已重設該用戶密碼', 'success')
      setResetTarget(null)
    } catch (err) {
      console.error('重設密碼失敗:', err)
      setResetError(err.response?.data?.message || '重設密碼失敗，請稍後再試')
    } finally {
      setResetLoading(false)
    }
  }
  
  async function loadUsers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('載入用戶失敗:', error)
      setError('載入用戶列表失敗')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleRoleChange(userId, newRole) {
    try {
      setUpdating(userId)
      setError('')
      setSuccess('')
      
      await updateUserRole(userId, newRole)

      // 更新本地狀態
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      
      setSuccess('角色已更新')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('更新角色失敗:', error)
      setError('更新角色失敗')
    } finally {
      setUpdating(null)
    }
  }
  
  function getRoleIcon(role) {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-red-600" />
      case 'uploader':
        return <UploadIcon className="h-5 w-5 text-primary-600" />
      case 'customer':
        return <User className="h-5 w-5 text-green-600" />
      default:
        return <User className="h-5 w-5 text-gray-600" />
    }
  }
  
  function getRoleName(role) {
    switch (role) {
      case 'admin':
        return '管理員'
      case 'uploader':
        return '上傳者'
      case 'customer':
        return '客戶'
      default:
        return '未知'
    }
  }
  
  function getRoleBadgeColor(role) {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'uploader':
        return 'bg-primary-100 text-primary-800'
      case 'customer':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  if (user?.role !== 'admin') {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h2>
        <p className="text-gray-600">只有管理員可以訪問此頁面</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">用戶管理</h1>
        <p className="text-gray-600 mt-2">管理所有用戶的角色權限</p>
      </div>
      
      {/* 成功訊息 */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* 角色說明 */}
      <div className="card bg-primary-50 border-primary-200">
        <h3 className="font-semibold text-gray-900 mb-3">角色權限說明</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            <span className="font-medium">管理員：</span>
            <span className="text-gray-600">完整權限（查看、編輯、刪除、設定提醒、管理用戶）</span>
          </div>
          <div className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4 text-primary-600" />
            <span className="font-medium">上傳者：</span>
            <span className="text-gray-600">上傳和編輯影片清單（無刪除和提醒設定權限）</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="font-medium">客戶：</span>
            <span className="text-gray-600">只能選擇影片</span>
          </div>
        </div>
      </div>
      
      {/* 用戶列表 */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">用戶列表</h2>
          <span className="text-sm text-gray-500">（共 {users.length} 位用戶）</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 py-12">尚無用戶</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">姓名</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">目前角色</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">變更角色</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">密碼操作</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">註冊時間</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(u.role)}
                        <span className="font-medium text-gray-900">{u.name}</span>
                        {u.id === user.id && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                            您
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(u.role)}`}>
                        {getRoleName(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.id === user.id ? (
                        <span className="text-sm text-gray-500">無法變更自己的角色</span>
                      ) : (
                        <div className="min-w-[120px]">
                          <Select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updating === u.id}
                            options={[
                              { value: 'customer', label: '客戶' },
                              { value: 'uploader', label: '上傳者' },
                              { value: 'admin', label: '管理員' },
                            ]}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openResetModal(u)}
                        className="btn btn-ghost text-sm flex items-center gap-2"
                      >
                        <KeyRound className="h-4 w-4" /> 重設密碼
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('zh-TW')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`重設密碼 - ${resetTarget?.name || ''}`}
        footer={null}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {resetError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {resetError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
            <input
              type="password"
              name="password"
              value={resetForm.password}
              onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
              className="input"
              placeholder="至少 6 個字元"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
            <input
              type="password"
              name="confirmPassword"
              value={resetForm.confirmPassword}
              onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="input"
              placeholder="再次輸入新密碼"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setResetTarget(null)}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={resetLoading}>
              {resetLoading ? '處理中...' : '重設密碼'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

