import React from 'react'

interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  error,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        className={`input ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-invalid={!!error}
      />
      {error && <span className="input-error-msg" role="alert">{error}</span>}
    </div>
  )
}
