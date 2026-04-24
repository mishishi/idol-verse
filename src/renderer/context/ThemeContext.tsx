import React, { createContext, useState, useEffect, useCallback } from 'react'

interface ThemeContextValue {
  eyeCare: boolean
  toggleEyeCare: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  eyeCare: false,
  toggleEyeCare: () => {},
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eyeCare, setEyeCare] = useState(() => localStorage.getItem('eyeCare') === 'true')

  useEffect(() => {
    document.body.className = eyeCare ? 'theme-eye-care' : ''
    localStorage.setItem('eyeCare', String(eyeCare))
  }, [eyeCare])

  const toggleEyeCare = useCallback(() => {
    setEyeCare(v => !v)
  }, [])

  return (
    <ThemeContext.Provider value={{ eyeCare, toggleEyeCare }}>
      {children}
    </ThemeContext.Provider>
  )
}
