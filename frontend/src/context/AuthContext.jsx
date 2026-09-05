import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as authApi from '../utils/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.fetchCurrentUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email, password, rememberMe = true) => {
    const data = await authApi.login(email, password)
    authApi.setToken(data.access_token, rememberMe)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (fields) => {
    const data = await authApi.signup(fields)
    authApi.setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    authApi.setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((patch) => setUser((u) => (u ? { ...u, ...patch } : u)), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
