import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface User {
  id: number
  username: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loginLoading: boolean
  registerLoading: boolean
  authLoaded: boolean
  handleLogin: (username: string, password: string) => Promise<void>
  handleRegister: (username: string, password: string) => Promise<void>
  handleLogout: () => void
  fetchCurrency: () => void
  fetchPendingRequests: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const API_BASE = 'http://localhost:3001/api'

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      navigate('/home')
    }
    setAuthLoaded(true)
  }, [navigate])

  const handleLogin = useCallback(async (username: string, password: string) => {
    if (loginLoading) return
    setLoginLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/home')
    } finally {
      setLoginLoading(false)
    }
  }, [loginLoading, navigate])

  const handleRegister = useCallback(async (username: string, password: string) => {
    if (registerLoading) return
    setRegisterLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '注册失败')
      navigate('/login')
    } finally {
      setRegisterLoading(false)
    }
  }, [registerLoading, navigate])

  const handleLogout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }, [navigate])

  const fetchCurrency = useCallback(() => {
    if (!token) return
    fetch(`${API_BASE}/user/currency`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).catch((err) => { console.error('fetchCurrency failed:', err) })
  }, [token])

  const fetchPendingRequests = useCallback(() => {
    if (!token) return
    fetch(`${API_BASE}/friends/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).catch((err) => { console.error('fetchPendingRequests failed:', err) })
  }, [token])

  return (
    <AuthContext.Provider value={{
      user, token, loginLoading, registerLoading, authLoaded,
      handleLogin, handleRegister, handleLogout, fetchCurrency, fetchPendingRequests
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
