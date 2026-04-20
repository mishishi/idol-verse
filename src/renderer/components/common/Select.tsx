import React, { useState, useRef, useEffect } from 'react'
import '../styles/select.css'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaLabel?: string
  error?: boolean
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  className = '',
  ariaLabel,
  error = false
}) => {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const triggerId = useRef(`select-trigger-${Math.random().toString(36).slice(2)}`)

  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on ESC; reset focused index
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setFocusedIndex(-1) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Arrow-key navigation within the open dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(o => !o)
      if (!open && focusedIndex >= 0 && !options[focusedIndex].disabled) {
        onChange(options[focusedIndex].value)
        setOpen(false)
        setFocusedIndex(-1)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setFocusedIndex(options.findIndex(o => !o.disabled))
      } else {
        const next = (focusedIndex + 1) % options.length
        setFocusedIndex(options.findIndex((o, i) => i > focusedIndex && !o.disabled) ?? next)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) {
        const prev = focusedIndex <= 0 ? options.length - 1 : focusedIndex - 1
        setFocusedIndex(prev)
      }
    }
  }

  return (
    <div
      ref={ref}
      className={`atom-select ${open ? 'atom-select-open' : ''} ${error ? 'atom-select-error' : ''} ${disabled ? 'atom-select-disabled' : ''} ${className}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        id={triggerId.current}
        className="atom-select-trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        aria-activedescendant={open && focusedIndex >= 0 ? `select-option-${focusedIndex}` : undefined}
        disabled={disabled}
      >
        <span className={`atom-select-value ${!selected ? 'atom-select-placeholder' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="atom-select-arrow">▼</span>
      </button>

      {open && (
        <ul className="atom-select-dropdown" role="listbox" aria-label={ariaLabel}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`select-option-${i}`}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              className={`atom-select-option ${opt.value === value ? 'atom-select-option-selected' : ''} ${opt.disabled ? 'atom-select-option-disabled' : ''} ${focusedIndex === i ? 'atom-select-option-focused' : ''}`}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value)
                  setOpen(false)
                  setFocusedIndex(-1)
                }
              }}
              onMouseEnter={() => setFocusedIndex(i)}
            >
              {opt.label}
              {opt.value === value && <span className="atom-select-check">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
