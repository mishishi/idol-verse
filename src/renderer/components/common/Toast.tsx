import React, { useEffect } from 'react'
import { Icon } from './Icon'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  visible: boolean
  onClose?: () => void
  duration?: number
  className?: string
}

const TYPE_META = {
  success: { label: 'SUCCESS', iconName: 'check' as const, accent: '#00ff88', glow: 'rgba(0,255,136,0.25)' },
  error:   { label: 'FATAL',   iconName: 'cross' as const, accent: '#ff3366', glow: 'rgba(255,51,102,0.25)' },
  info:    { label: 'SYSTEM',  iconName: 'sparkle' as const, accent: '#00d4ff', glow: 'rgba(0,212,255,0.25)' },
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onClose,
  duration = 3000,
  className = ''
}) => {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => { onClose?.() }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  if (!visible) return null

  const { label, iconName, accent, glow } = TYPE_META[type]

  return (
    <div
      className={`toast toast-${type} ${className}`}
      role="alert"
      aria-live="polite"
      onClick={onClose}
      style={{ '--t-accent': accent, '--t-glow': glow } as React.CSSProperties}
    >
      {/* Scan-line overlay */}
      <div className="toast-scanline" />

      {/* Corner brackets */}
      <span className="toast-corner toast-corner-tl" />
      <span className="toast-corner toast-corner-tr" />
      <span className="toast-corner toast-corner-bl" />
      <span className="toast-corner toast-corner-br" />

      {/* Inner glow border */}
      <div className="toast-border-glow" />

      {/* Content */}
      <div className="toast-icon-wrap">
        <Icon name={iconName} size={15} color={accent} />
      </div>

      <div className="toast-body">
        <div className="toast-header-row">
          <span className="toast-label">{label}</span>
          <span className="toast-status-dot" />
        </div>
        <p className="toast-msg">{message}</p>
      </div>

      <button className="toast-close" onClick={onClose} aria-label="关闭">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Bottom accent line */}
      <div className="toast-bottom-line" />
    </div>
  )
}

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }

interface ToastContainerProps { toasts: ToastItem[]; onRemove: (id: number) => void }

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => (
  <div className="toast-container" role="region" aria-label="通知">
    {toasts.map(t => (
      <Toast
        key={t.id}
        message={t.message}
        type={t.type}
        visible={true}
        onClose={() => onRemove(t.id)}
        duration={3000}
      />
    ))}
  </div>
)
