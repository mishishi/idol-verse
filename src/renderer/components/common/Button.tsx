import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent-green'
  size?: 'default' | 'large'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ariaLabel,
}) => {
  const classes = [
    'btn',
    variant !== 'default' ? `btn-${variant}` : '',
    size === 'large' ? 'btn-large' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {loading ? <LoadingSpinner size={18} /> : children}
    </button>
  )
}
