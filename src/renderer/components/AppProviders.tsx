import React from "react"
import { AuthProvider } from "../context/AuthContext"
import { CurrencyProvider } from "../context/CurrencyContext"
import { ToastProvider } from "../context/ToastContext"
import { GachaProvider } from "../context/GachaContext"

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <CurrencyProvider>
      <ToastProvider>
        <GachaProvider>{children}</GachaProvider>
      </ToastProvider>
    </CurrencyProvider>
  </AuthProvider>
)
