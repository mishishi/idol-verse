#!/usr/bin/env python3
content = open('src/renderer/App.tsx', 'r', encoding='utf-8').read()

# 1. Remove createPortal from imports
old_import = 'import React, { useState, useEffect, useCallback, useRef, useMemo, createPortal } from \'react\''
new_import = 'import React, { useState, useEffect, useCallback, useRef, useMemo } from \'react\''
content = content.replace(old_import, new_import)

# 2. Remove sortTriggerRef (not needed anymore)
old_state = '    const [filter, setFilter] = useState<string>(\'all\')\n    const [sort, setSort] = useState<string>(\'rarity\')\n    const [sortOpen, setSortOpen] = useState(false)\n    const [animKey, setAnimKey] = useState(0)\n    const sortTriggerRef = useRef<HTMLButtonElement>(null)'
new_state = '    const [filter, setFilter] = useState<string>(\'all\')\n    const [sort, setSort] = useState<string>(\'rarity\')\n    const [sortOpen, setSortOpen] = useState(false)\n    const [animKey, setAnimKey] = useState(0)'
content = content.replace(old_state, new_state)

# 3. Remove sortMenuStyle state
old_style = '    const [sortMenuStyle, setSortMenuStyle] = useState<React.CSSProperties>({})\n\n    const stars = useMemo'
new_style = '    const stars = useMemo'
content = content.replace(old_style, new_style)

# 4. Replace the handleSortToggle - remove portal logic
old_toggle = '''    // Position and open sort dropdown via portal
    const handleSortToggle = () => {
      if (!sortOpen) {
        const rect = sortTriggerRef.current?.getBoundingClientRect()
        if (rect) {
          setSortMenuStyle({
            position: 'fixed',
            top: rect.bottom + window.scrollY + 6,
            right: window.innerWidth - rect.right,
          })
        }
      }
      setSortOpen(o => !o)
    }'''

new_toggle = '''    const handleSortToggle = () => {
      setSortOpen(o => !o)
    }'''
content = content.replace(old_toggle, new_toggle)

# 5. Remove the click-outside effect
old_effect = '''    // Close sort dropdown on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as Element
        if (!target.closest(\'.inv-sort-dropdown\')) setSortOpen(false)
      }
      document.addEventListener(\'click\', handler)
      return () => document.removeEventListener(\'click\', handler)
    }, [])'''

new_effect = ''
content = content.replace(old_effect, new_effect)

# 6. Replace sort trigger - remove ref
old_trigger = '<button className="inv-sort-trigger" ref={sortTriggerRef} onClick={handleSortToggle}>'
new_trigger = '<button className="inv-sort-trigger" onClick={handleSortToggle}>'
content = content.replace(old_trigger, new_trigger)

# 7. Replace the createPortal sort menu with a simple div
old_menu = '''              {sortOpen && createPortal(
                <div className="inv-sort-menu" style={sortMenuStyle}>
                  {[
                    { value: 'rarity', label: '稀有度' },
                    { value: 'level', label: '等级' },
                    { value: 'intimacy', label: '亲密度' },
                    { value: 'name', label: '名称' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`inv-sort-option ${sort === opt.value ? 'active' : ''}`}
                      onClick={() => { setSort(opt.value); setAnimKey(k => k + 1); setSortOpen(false) }}
                    >
                      {opt.label}
                      {sort === opt.value && <Icon name="check" size={12} color="var(--rarity-sr)" />}
                    </button>
                  ))}
                </div>,
                document.body
              )}'''

new_menu = '''              {sortOpen && (
                <div className="inv-sort-menu">
                  {[
                    { value: 'rarity', label: '稀有度' },
                    { value: 'level', label: '等级' },
                    { value: 'intimacy', label: '亲密度' },
                    { value: 'name', label: '名称' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`inv-sort-option ${sort === opt.value ? 'active' : ''}`}
                      onClick={() => { setSort(opt.value); setAnimKey(k => k + 1); setSortOpen(false) }}
                    >
                      {opt.label}
                      {sort === opt.value && <Icon name="check" size={12} color="var(--rarity-sr)" />}
                    </button>
                  ))}
                </div>
              )}'''
content = content.replace(old_menu, new_menu)

# Verify
if 'createPortal' in content:
    print('ERROR: createPortal still present')
    exit(1)
if 'sortTriggerRef' in content:
    print('ERROR: sortTriggerRef still present')
    exit(1)
if 'sortMenuStyle' in content:
    print('ERROR: sortMenuStyle still present')
    exit(1)

open('src/renderer/App.tsx', 'w', encoding='utf-8').write(content)
print('OK')