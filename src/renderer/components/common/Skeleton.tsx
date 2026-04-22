import React from 'react'

interface SkeletonProps {
  variant?: 'card-grid' | 'list' | 'text' | 'avatar' | 'stat' | 'ranking-list' | 'circular'
  count?: number
  className?: string
  width?: number | string
  height?: number | string
}

/** Shimmer keyframes injected once */
const ShimmerCSS = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes shimmerPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    .skeleton-base {
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0.03) 0%,
        rgba(255,255,255,0.08) 40%,
        rgba(255,255,255,0.03) 80%
      );
      background-size: 800px 100%;
      animation: shimmer 1.6s infinite linear;
      border-radius: 6px;
    }
    @media (prefers-reduced-motion: no-preference) {
      .skeleton-base { animation: shimmer 1.6s infinite linear; }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton-base { animation: shimmerPulse 1.4s ease-in-out infinite; background: rgba(255,255,255,0.06); }
    }
    .skeleton-ranking-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0 20px;
    }
    .skeleton-ranking-header {
      display: grid;
      grid-template-columns: 56px 60px 1fr 90px 70px;
      gap: 14px;
      padding: 10px 16px;
      margin-bottom: 4px;
    }
    .skeleton-ranking-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: rgba(10, 8, 30, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
    }
    .skeleton-ranking-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  `}</style>
)

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  count = 1,
  className = '',
  width,
  height
}) => {
  const items = Array.from({ length: count }, (_, i) => i)
  const style = {
    ...(width !== undefined && {
      width: typeof width === 'number' ? `${width}px` : width
    }),
    ...(height !== undefined && {
      height: typeof height === 'number' ? `${height}px` : height
    })
  }

  if (variant === 'card-grid') {
    return (
      <>
        <ShimmerCSS />
        <div className={`idol-grid skeleton-card-grid ${className}`}>
          {items.map(i => (
            <div key={i} className="idol-card skeleton-base" style={{ minHeight: 200 }}>
              <div className="skeleton-rarity-badge skeleton-base" />
              <div className="skeleton-avatar skeleton-base" />
              <div className="skeleton-name skeleton-base" />
              <div className="skeleton-desc skeleton-base" />
              <div className="skeleton-desc skeleton-base" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      </>
    )
  }

  if (variant === 'list') {
    return (
      <>
        <ShimmerCSS />
        <div className={`skeleton-list ${className}`}>
          {items.map(i => (
            <div key={i} className="skeleton-list-item skeleton-base">
              <div className="skeleton-avatar-circle skeleton-base" />
              <div className="skeleton-list-content">
                <div className="skeleton-line skeleton-base" style={{ width: '40%', height: 12 }} />
                <div className="skeleton-line skeleton-base" style={{ width: '25%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (variant === 'ranking-list') {
    return (
      <>
        <ShimmerCSS />
        <div className={`skeleton-ranking-list ${className}`}>
          {/* Column header skeleton */}
          <div className="skeleton-ranking-header">
            <div className="skeleton-base" style={{ height: 10, width: 24, borderRadius: 4 }} />
            <div className="skeleton-base" style={{ height: 10, width: 10, borderRadius: 4 }} />
            <div className="skeleton-base" style={{ height: 10, width: 40, borderRadius: 4 }} />
            <div className="skeleton-base" style={{ height: 10, width: 50, borderRadius: 4 }} />
            <div className="skeleton-base" style={{ height: 10, width: 30, borderRadius: 4 }} />
          </div>
          {items.map(i => (
            <div key={i} className="skeleton-ranking-item">
              <div className="skeleton-base" style={{ height: 36, width: 36, borderRadius: 8, flexShrink: 0 }} />
              <div className="skeleton-base" style={{ height: 52, width: 52, borderRadius: 12, flexShrink: 0 }} />
              <div className="skeleton-ranking-info">
                <div className="skeleton-line skeleton-base" style={{ width: '50%', height: 12, marginBottom: 6 }} />
                <div className="skeleton-line skeleton-base" style={{ width: '30%', height: 10 }} />
              </div>
              <div className="skeleton-base" style={{ height: 20, width: 60, borderRadius: 6, flexShrink: 0 }} />
              <div className="skeleton-base" style={{ height: 30, width: 56, borderRadius: 8, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </>
    )
  }

  if (variant === 'avatar') {
    return (
      <>
        <ShimmerCSS />
        <div className={`skeleton-base skeleton-avatar-standalone ${className}`} />
      </>
    )
  }

  if (variant === 'circular') {
    return (
      <>
        <ShimmerCSS />
        <div
          className={`skeleton-base skeleton-circular ${className}`}
          style={{ borderRadius: '50%', ...style }}
        />
      </>
    )
  }

  if (variant === 'stat') {
    return (
      <>
        <ShimmerCSS />
        <div className={`skeleton-stat-grid ${className}`}>
          {items.map(i => (
            <div key={i} className="skeleton-base" style={{ height: 60, borderRadius: 12 }} />
          ))}
        </div>
      </>
    )
  }

  // default: text lines
  return (
    <>
      <ShimmerCSS />
      <div className={`skeleton-text ${className}`}>
        {items.map(i => (
          <div
            key={i}
            className="skeleton-line skeleton-base"
            style={{ height: 14, marginBottom: 8, ...style }}
          />
        ))}
      </div>
    </>
  )
}
