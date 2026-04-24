import React, { createContext, useContext, useState, useCallback } from 'react'

interface GachaContextValue {
  isGachaOpen: boolean
  openGacha: () => void
  closeGacha: () => void
}

const GachaContext = createContext<GachaContextValue>({
  isGachaOpen: false,
  openGacha: () => {},
  closeGacha: () => {},
})

export const GachaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGachaOpen, setIsGachaOpen] = useState(false)
  const openGacha = useCallback(() => setIsGachaOpen(true), [])
  const closeGacha = useCallback(() => setIsGachaOpen(false), [])

  return (
    <GachaContext.Provider value={{ isGachaOpen, openGacha, closeGacha }}>
      {children}
    </GachaContext.Provider>
  )
}

export const useGacha = () => useContext(GachaContext)
