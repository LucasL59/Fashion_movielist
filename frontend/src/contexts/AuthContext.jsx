/**
 * 認證 Context
 * 
 * 管理用戶認證狀態
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { recordOperationEvent } from '../lib/api'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  function clearAuthStorage() {
    if (typeof window === 'undefined') return
    try {
      const keysToClear = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (!key) continue
        if (key.startsWith('supabase.auth.') || key.includes('-auth-token')) {
          keysToClear.push(key)
        }
      }
      keysToClear.forEach(key => window.localStorage.removeItem(key))
    } catch (error) {
      console.warn('清除 Supabase token 失敗:', error)
    }
  }

  async function resetSession() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // 忽略登出錯誤，主要目標是清除 client 端暫存
    } finally {
      clearAuthStorage()
    }
  }
  
  useEffect(() => {
    // 檢查當前 session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // 處理 Refresh Token 無效的情況
        console.warn('Session init error:', error.message)
        resetSession()
        setLoading(false)
        return
      }
      
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })
    
    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 只處理重要的認證事件，避免重複調用
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (session?.user) {
          fetchUserProfile(session.user.id)
        }
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_SHUTDOWN') {
        setUser(null)
        setLoading(false)
      }
    })
    
    // 監聽頁面可見性變化 - 當用戶回到頁面時檢查 Session
    const handleVisibilityChange = async () => {
      // 只在頁面變為可見時檢查
      if (document.visibilityState !== 'visible') return
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        // 如果有 session 但獲取失敗，或沒有 session 且當前頁面不是登入頁
        if (error || !session) {
          const currentPath = window.location.pathname
          // 只有在非登入頁且之前有 session 的情況下才跳轉
          if (currentPath !== '/login' && currentPath !== '/') {
            console.warn('Session 已過期，正在跳轉到登入頁...')
            setUser(null)
            clearAuthStorage()
            window.location.replace('/login?expired=true')
          }
        }
      } catch (e) {
        console.warn('檢查 Session 失敗:', e)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // 只在組件掛載時執行一次，避免無限循環
  
  /**
   * 獲取用戶 Profile
   */
  async function fetchUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.warn('獲取用戶資料失敗:', error)
        await resetSession()
        throw error
      }

      setUser(data)
    } catch (error) {
      console.error('獲取用戶資料失敗:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 註冊
   */
  async function signUp(email, password, name, role = 'customer') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })
    
    if (error) throw error
    return data
  }
  
  /**
   * 登入
   */
  async function signIn(email, password) {
    await resetSession()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await resetSession()
      throw error
    }

    try {
      await recordOperationEvent({
        action: 'auth.login',
        description: '使用者登入系統',
        metadata: { email },
      })
    } catch (logError) {
      console.warn('登入紀錄寫入失敗:', logError)
    }

    return data
  }
  
  /**
   * 登出
   * 注意：即使 API 調用失敗也會完成登出，確保用戶能正常登出
   */
  async function signOut() {
    // 先記錄用戶資訊（在清除前）
    const userInfo = user ? { email: user.email, id: user.id } : {}
    
    // 立即清除本地狀態，確保登出一定會執行
    setUser(null)
    
    // 嘗試記錄登出事件（不阻擋登出流程）
    try {
      await recordOperationEvent({
        action: 'auth.logout',
        description: '使用者登出系統',
        metadata: userInfo,
      })
    } catch (logError) {
      // 忽略錯誤，不影響登出
      console.warn('登出紀錄寫入失敗（不影響登出）:', logError)
    }

    // 嘗試調用 Supabase 登出（不阻擋登出流程）
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.warn('Supabase 登出失敗（不影響登出）:', error)
    }
    
    // 清除所有本地存儲
    clearAuthStorage()
  }
  
  /**
   * 更新用戶資料
   */
  async function updateProfile(updates) {
    if (!user) return
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    setUser(data)
    return data
  }
  
  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

