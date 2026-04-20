import React from 'react'

type BadgeVariant = 'default' | 'success' | 'danger' | 'info' | 'rarity-N' | 'rarity-R' | 'rarity-SR' | 'rarity-SSR' | 'rarity-UR'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  ariaLabel?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  ariaLabel,
}) => {
  const classes = ['atom-badge', variant !== 'default' ? `atom-badge-${variant}` : '', className].filter(Boolean).join(' ')
  return (
    <span className={classes} aria-label={ariaLabel}>
      {children}
    </span>
  )
}
