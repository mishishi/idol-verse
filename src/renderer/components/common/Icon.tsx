import React from 'react'

export type IconName =
  | 'mic' | 'slot' | 'temple' | 'book' | 'backpack'
  | 'star' | 'fire' | 'sparkle' | 'home' | 'chart'
  | 'clipboard' | 'gem' | 'ticket' | 'sparkles' | 'star2'
  | 'heart' | 'check' | 'cross' | 'arrowRight' | 'gift'
  | 'users' | 'calendar' | 'stamina' | 'user' | 'settings'
  | 'play' | 'music' | 'search' | 'close' | 'arrowDown'
  | 'shuffle' | 'lock' | 'unlock' | 'send' | 'refresh'
  | 'minus' | 'plus'

interface IconProps {
  name: IconName
  size?: number
  color?: string
  className?: string
}

// Each icon is an array of SVG path strings
const icons: Record<IconName, string[]> = {
  mic:      ['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v4', 'M8 23h8'],
  slot:     ['M3 3h18v18H3z', 'M7 7h2v2H7z', 'M11 7h2v2h-2z', 'M15 7h2v2h-2z', 'M7 11h2v2H7z', 'M11 11h2v2h-2z', 'M15 11h2v2h-2z', 'M7 15h2v2H7z', 'M11 15h2v2h-2z', 'M15 15h2v2h-2z'],
  temple:   ['M5 21h14', 'M5 21V11l7-7 7 7v10', 'M9 21v-4h6v4', 'M9 9h6'],
  book:     ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z'],
  backpack: ['M5 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M9 8V6a3 3 0 0 1 6 0v2'],
  star:     ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  fire:     ['M12 22c4-2 7-5 7-10 0-3-2-5-4-6-1 .8-2 2-2 3 0-3 1-6-2-8-2 2-3 4-3 6 0 2-1 3-2 3-2 0-3-2-3-2 1 2 3 3 5 4 0-3 1-5 2-6-3 2-4 5-4 9 0 2 1 4 3 5 1-2 3-3 4-2z'],
  sparkle:  ['M12 3v2m0 14v2m-8-9H3m18 0h-2', 'M5.6 5.6l1.4 1.4m10 10l1.4 1.4M5.6 18.4l1.4-1.4m10-10l1.4-1.4'],
  home:     ['M3 12l2-2m0 0l7-7 7 7', 'M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m4 0h2m-2 0v4'],
  chart:    ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  clipboard:['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z'],
  gem:      ['M12 2L2 9l10 13 10-13L12 2z', 'M2 9h20', 'M12 2v20'],
  ticket:   ['M15 5v2m0 4v2m0 4v2', 'M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z'],
  sparkles: ['M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z', 'M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z', 'M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z'],
  star2:    ['M5 3l2.5 5.5L13 9l-5 4.5 1.5 6L5 17l-4.5 2.5L5 25'],
  heart:    ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  check:    ['M20 6L9 17l-5-5'],
  cross:    ['M18 6L6 18', 'M6 6l12 12'],
  arrowRight:['M5 12h14m-7-7l7 7-7 7'],
  gift:     ['M20 12v10H4V12', 'M2 7h20v5H2z', 'M12 22V7', 'M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z', 'M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'],
  users:    ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  calendar: ['M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  stamina:  ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  user:     ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.8 1.07 1.51 1.51H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  play:     ['M5 3l14 9-14 9V3z'],
  music:    ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  search:   ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  close:    ['M18 6L6 18', 'M6 6l12 12'],
  arrowDown:['M12 5v14m0 0l-7-7m7 7l7-7'],
  shuffle:  ['M16 3h5v5', 'M4 20L21 3', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
  lock:     ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  unlock:   ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', 'M7 11V7a5 5 0 0 1 9.9-1'],
  send:     ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  refresh:  ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  minus:    ['M5 12h14'],
  plus:     ['M12 5v14', 'M5 12h14'],
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
}) => {
  const paths = icons[name]
  if (!paths) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
