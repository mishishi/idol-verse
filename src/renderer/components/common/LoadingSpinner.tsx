import React from 'react'

interface LoadingSpinnerProps {
  size?: number
  color?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 20,
  color = 'var(--accent-pink-solid, #ff6b9d)',
  className = ''
}) => {
  return (
    <span
      className={`loading-spinner ${className}`}
      role="status"
      aria-label="加载中"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="40 20"
          opacity="0.8"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="20 60"
          strokeDashoffset="-30"
          opacity="0.4"
        />
      </svg>
      <style>{`
        @keyframes spinnerRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .loading-spinner svg { animation: spinnerRotate 0.7s linear infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-spinner svg { animation: none; opacity: 0.6; }
        }
      `}</style>
    </span>
  )
}
