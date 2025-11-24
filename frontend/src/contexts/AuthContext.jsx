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
  
  useEffect(() => {
    // 檢查當前 session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // 處理 Refresh Token 無效的情況
        console.warn('Session init error:', error.message)
        supabase.auth.signOut()
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
      // 處理 Token 刷新失敗
      if (event === 'TOKEN_REFRESH_SHUTDOWN' || event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
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
      
      if (error) throw error
      
      setUser(data)
    } catch (error) {
      console.error('獲取用戶資料失敗:', error)
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

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
   */
  async function signOut() {
    try {
      await recordOperationEvent({
        action: 'auth.logout',
        description: '使用者登出系統',
        metadata: user ? { email: user.email, id: user.id } : {},
      })
    } catch (logError) {
      console.warn('登出紀錄寫入失敗:', logError)
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
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

