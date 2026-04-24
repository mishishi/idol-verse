import React from "react"
import { AuthProvider } from "../context/AuthContext"
import { CurrencyProvider } from "../context/CurrencyContext"
import { ToastProvider } from "../context/ToastContext"
import { GachaProvider } from "../context/GachaContext"
import { ThemeProvider } from "../context/ThemeContext"

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>
      <CurrencyProvider>
        <ToastProvider>
          <GachaProvider>{children}</GachaProvider>
        </ToastProvider>
      </CurrencyProvider>
    </AuthProvider>
  </ThemeProvider>
)
