import React from 'react'
import { Icon } from './Icon'

type EmptyStateIcon = 'star' | 'users' | 'clipboard' | 'book' | 'gem' | 'ticket' | 'chart' | 'calendar' | 'heart' | 'lock'

interface EmptyStateProps {
  icon?: EmptyStateIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'star', title, description, action }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon-wrap">
        <Icon name={icon} size={40} color="rgba(255,255,255,0.2)" />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-text">{description}</div>}
      {action && (
        <button className="btn-primary" style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
