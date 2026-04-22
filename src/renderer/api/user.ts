const API_BASE = 'http://localhost:3001/api'

function authHeaders(token: string) {
  return { 'Authorization': `Bearer ${token}` }
}

export interface UserProfile {
  character_count: number
  total_gacha: number
  login_streak: number
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/user/profile`, { headers: authHeaders(token) })
  return res.json()
}

export async function fetchCurrency(token: string) {
  const res = await fetch(`${API_BASE}/user/currency`, { headers: authHeaders(token) })
  return res.json()
}

export async function fetchCharacters(token: string) {
  const res = await fetch(`${API_BASE}/user/characters`, { headers: authHeaders(token) })
  return res.json()
}
