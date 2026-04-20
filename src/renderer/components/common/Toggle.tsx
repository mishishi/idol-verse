import React from 'react'
import '../styles/toggle.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'default' | 'small'
  className?: string
  ariaLabel?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'default',
  className = '',
  ariaLabel
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!disabled) onChange(!checked)
    }
  }

  return (
    <span
      className={`atom-toggle ${size === 'small' ? 'atom-toggle-sm' : ''} ${disabled ? 'atom-toggle-disabled' : ''} ${className}`}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
    >
      <span className="atom-toggle-thumb" />
    </span>
  )
}
