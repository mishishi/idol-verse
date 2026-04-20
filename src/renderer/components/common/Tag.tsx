import React from 'react'

type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR'

interface TagProps {
  rarity?: Rarity
  children?: React.ReactNode
  className?: string
}

export const Tag: React.FC<TagProps> = ({
  rarity,
  children,
  className = '',
}) => {
  if (rarity) {
    const classes = ['atom-tag', `rarity-${rarity}`, className].filter(Boolean).join(' ')
    return <span className={classes}>{rarity}</span>
  }
  return <span className={`atom-tag ${className}`}>{children}</span>
}
