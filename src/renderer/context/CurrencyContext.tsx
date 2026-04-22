import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface Currency {
  holy_stone: number
  summon_ticket: number
  stamina: number
  max_stamina: number
}

interface CurrencyContextType {
  currency: Currency
  setCurrency: React.Dispatch<React.SetStateAction<Currency>>
  fetchCurrency: () => void
}

const defaultCurrency: Currency = {
  holy_stone: 0,
  summon_ticket: 0,
  stamina: 0,
  max_stamina: 120
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { token, fetchCurrency: authFetchCurrency } = useAuth()
  const [currency, setCurrency] = useState<Currency>(defaultCurrency)

  const fetchCurrency = useCallback(() => {
    if (!token) return
    const API_BASE = 'http://localhost:3001/api'
    fetch(`${API_BASE}/user/currency`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      if (data && data.holy_stone !== undefined) {
        setCurrency({
          holy_stone: data.holy_stone,
          summon_ticket: data.summon_ticket,
          stamina: data.stamina || 0,
          max_stamina: data.max_stamina || 120
        })
      }
    }).catch((err) => { console.error('fetchCurrency failed:', err) })
  }, [token])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fetchCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
