const API_BASE = 'http://localhost:3001/api'

export interface LoginResponse {
  token: string
  user: { id: number; username: string }
}

export interface RegisterResponse {
  message?: string
  user?: { id: number; username: string }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')
  return data
}

export async function register(username: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')
  return data
}

export async function checkUsername(username: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`)
  const data = await res.json()
  return data.available === true
}
