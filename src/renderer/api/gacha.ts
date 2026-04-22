const API_BASE = 'http://localhost:3001/api'

function authHeaders(token: string) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function doGacha(token: string, useTicket: boolean = false) {
  const res = await fetch(`${API_BASE}/gacha/draw`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ use_ticket: useTicket })
  })
  return res.json()
}

export async function doMultiGacha(token: string, useTicket: boolean = false) {
  const res = await fetch(`${API_BASE}/gacha/draw-multi`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ use_ticket: useTicket })
  })
  return res.json()
}

export async function fetchPityStatus(token: string) {
  const res = await fetch(`${API_BASE}/gacha/pity-status`, { headers: authHeaders(token) })
  return res.json()
}
