#!/usr/bin/env python3
content = open('src/renderer/App.tsx', 'r', encoding='utf-8').read()

# 1. Remove createPortal from imports
old = 'import React, { useState, useEffect, useCallback, useRef, useMemo, createPortal } from \'react\''
new = 'import React, { useState, useEffect, useCallback, useRef, useMemo } from \'react\''
if old in content:
    content = content.replace(old, new)
    print('removed createPortal from import')
else:
    print('createPortal not in import, skipping')

# 2. Replace sortTriggerRef -> sortBtnRef everywhere
content = content.replace('sortTriggerRef', 'sortBtnRef')

# 3. Remove sortMenuStyle state declaration that has no business there
# The state is declared properly below via the handleSortToggle

# 4. Find and replace the handleSortToggle function body
old_toggle = '    // Position and open sort dropdown via portal\n    const handleSortToggle = () => {\n      if (!sortOpen) {\n        const rect = sortTriggerRef.current?.getBoundingClientRect()\n        if (rect) {\n          setSortMenuStyle({\n            position: \'fixed\',\n            top: rect.bottom + window.scrollY + 6,\n            right: window.innerWidth - rect.right,\n          })\n        }\n      }\n      setSortOpen(o => !o)\n    }'

new_toggle = '    const [sortMenuStyle, setSortMenuStyle] = useState<React.CSSProperties>({})\n\n    const handleSortToggle = () => {\n      setSortOpen(o => {\n        if (!o) {\n          const rect = sortBtnRef.current?.getBoundingClientRect()\n          if (rect) {\n            setSortMenuStyle({\n              position: \'fixed\',\n              top: rect.bottom + 6,\n              left: rect.left,\n            })\n          }\n        }\n        return !o\n      })\n    }'

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle)
    print('replaced handleSortToggle')
else:
    print('WARNING: handleSortToggle pattern not matched exactly')

# 5. Remove the click-outside useEffect
old_effect = '    // Close sort dropdown on outside click\n    useEffect(() => {\n      const handler = (e: MouseEvent) => {\n        const target = e.target as Element\n        if (!target.closest(\'.inv-sort-dropdown\')) setSortOpen(false)\n      }\n      document.addEventListener(\'click\', handler)\n      return () => document.removeEventListener(\'click\', handler)\n    }, [])\n\n    const RARITY_TABS'
new_effect = '    const RARITY_TABS'
if old_effect in content:
    content = content.replace(old_effect, new_effect)
    print('removed click-outside effect')
else:
    print('WARNING: click-outside effect not matched')

# 6. Replace createPortal usage with regular div
old_portal = '''              {sortOpen && createPortal(
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

new_div = '''              {sortOpen && (
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
                </div>
              )}'''

if old_portal in content:
    content = content.replace(old_portal, new_div)
    print('replaced createPortal with div')
else:
    print('WARNING: portal pattern not matched')

# Verify
if 'createPortal' in content:
    print('ERROR: createPortal still present')
    exit(1)

open('src/renderer/App.tsx', 'w', encoding='utf-8').write(content)
print('OK')