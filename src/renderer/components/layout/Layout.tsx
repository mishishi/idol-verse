import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCurrency } from '../../context/CurrencyContext'
import { useAudio } from '../../hooks/useAudio'
import { Icon } from '../common/Icon'
import { ToastContainer } from '../common/Toast'
import { useGacha } from '../../context/GachaContext'
import { useToast } from '../../context/ToastContext'
import { GachaDrawer } from '../GachaDrawer'

// ============ OnboardingGuide ============
interface OnboardingGuideProps {
  onComplete: () => void
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0)
  const { user } = useAuth()

  const steps = [
    { title: '欢迎', desc: `欢迎来到虚拟偶像的世界，${user?.username || '训练师'}！` },
    { title: '收集', desc: '通过召唤系统收集虚拟偶像，打造你的专属阵容。' },
    { title: '培养', desc: '通过日常互动和应援活动提升偶像与你之间的羁绊。' },
    { title: '演出', desc: '演奏节奏游戏获取奖励，提升偶像的技能。' },
  ]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].desc}</p>
        <div className="onboarding-actions">
          {step > 0 && (
            <button className="onboarding-btn secondary" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          <button className="onboarding-btn primary" onClick={handleNext}>
            {step < steps.length - 1 ? '下一步' : '开始'}
          </button>
        </div>
      </div>
    </div>
  )
}

  const NavBar: React.FC<{ onGuide: () => void; onLogout: () => void }> = ({ onGuide, onLogout }) => {
    const [cmdOpen, setCmdOpen] = useState(false)
    const cmdRef = useRef<HTMLDivElement>(null)

    const { user } = useAuth()
    const audio = useAudio()
    const navigate = useNavigate()

    // Close popover on outside click
    useEffect(() => {
      if (!cmdOpen) return
      const handler = (e: MouseEvent) => {
        if (cmdRef.current && !cmdRef.current.contains(e.target as Node)) setCmdOpen(false)
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [cmdOpen])

    return (
      <>
      <nav className="navbar" aria-label="顶部导航">
        <div className="navbar-left">
          <div className="holo-emblem">
            <div className="emblem-frame" />
            <div className="emblem-inner">
              <div className="emblem-particles">
                <span className="particle-dot" style={{'--i':0} as React.CSSProperties}/>
                <span className="particle-dot" style={{'--i':1} as React.CSSProperties}/>
                <span className="particle-dot" style={{'--i':2} as React.CSSProperties}/>
                <span className="particle-dot" style={{'--i':3} as React.CSSProperties}/>
                <span className="particle-dot" style={{'--i':4} as React.CSSProperties}/>
                <span className="particle-dot" style={{'--i':5} as React.CSSProperties}/>
              </div>
              <div className="emblem-core">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1L3 7V17L12 23L21 17V7L12 1Z" fill="url(#hexGem)" stroke="url(#hexStroke)" strokeWidth="0.5"/>
                  <path d="M12 1L3 7H21L12 1Z" fill="rgba(255,255,255,0.15)"/>
                  <path d="M12 23L3 17H21L12 23Z" fill="rgba(0,0,0,0.2)"/>
                  <path d="M3 7L12 13L21 7" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                  <path d="M3 17L12 13L21 17" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
                  <circle cx="12" cy="12" r="3" fill="rgba(255,107,157,0.8)"/>
                  <circle cx="12" cy="12" r="1.5" fill="#fff"/>
                  <defs>
                    <linearGradient id="hexGem" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff6b9d"/>
                      <stop offset="25%" stopColor="#ff00ff"/>
                      <stop offset="50%" stopColor="#00ccff"/>
                      <stop offset="75%" stopColor="#00ff88"/>
                      <stop offset="100%" stopColor="#ffd700"/>
                    </linearGradient>
                    <linearGradient id="hexStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff"/>
                      <stop offset="50%" stopColor="#ff6b9d"/>
                      <stop offset="100%" stopColor="#00ccff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="emblem-corner" />
              <div className="emblem-corner" />
              <div className="emblem-corner" />
              <div className="emblem-corner" />
            </div>
            <div className="emblem-glow" />
            <div className="emblem-ring" />
            <div className="emblem-ring" />
            <div className="emblem-ring" />
          </div>
          <div className="title-block">
            <div className="title-main-row">
              <span className="title-idol">IDOL</span>
              <span className="title-verse">
                <span className="verse-bracket">[</span>VERSE<span className="verse-bracket">]</span>
              </span>
            </div>
            <div className="title-sub-row">
              <span className="title-jp">偶像宇宙</span>
              <span className="title-tag">COLLECTION</span>
            </div>
          </div>
          <div className="nav-decor-line">
            <span className="line-segment seg1"/>
            <span className="line-dot"/>
            <span className="line-segment seg2"/>
          </div>
        </div>
        <div className="navbar-right">
          <div className="nav-user-pill">
            <div className="nav-user-avatar">{user?.username?.charAt(0).toUpperCase() || '?'}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{user?.username || '训练师'}</span>
            </div>
          </div>
          <div className="nav-cmd-wrapper" ref={cmdRef}>
            <button
              className={`nav-cmd-btn ${cmdOpen ? 'active' : ''}`}
              onClick={() => { audio.playUIClick(); setCmdOpen(o => !o) }}
              title="菜单"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {cmdOpen && (
              <div className="nav-cmd-popover">
                <div className="nav-cmd-section">
                  <div className="nav-cmd-section-label">音频</div>
                  <button
                    className={`nav-cmd-item ${audio.bgmEnabled ? 'on' : 'off'}`}
                    onClick={() => { audio.toggleBgm(); audio.playUIClick() }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>背景音乐</span>
                    <span className="nav-cmd-status">{audio.bgmEnabled ? '开' : '关'}</span>
                  </button>
                  <button
                    className={`nav-cmd-item ${audio.sfxEnabled ? 'on' : 'off'}`}
                    onClick={() => { audio.toggleSfx(); audio.playUIClick() }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.8"/>
                      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>音效</span>
                    <span className="nav-cmd-status">{audio.sfxEnabled ? '开' : '关'}</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <div className="nav-cmd-section">
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/friends'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21V19C20.9 18.4 20.6 17.9 20.1 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                      <path d="M21 14C21 12.3 19.7 11 18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                    </svg>
                    <span>好友</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/daily'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 11L3 11L3 17L21 17L21 7L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 3L21 3L21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>任务</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/ranking'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21V11M12 21V7M16 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>应援榜</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/stamina'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>体力商店</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/calendar'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>签到日历</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/pass'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M21 7L12 3L3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>通行证</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/avatar-test'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M6 21V19C6 16.8 8.8 15 12 15C15.2 15 18 16.8 18 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>动画测试</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; onGuide(); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>新手引导</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <button className="nav-cmd-item nav-cmd-logout" onClick={() => { try { audio.playUIClick() } catch(e) {}; onLogout(); setCmdOpen(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
    )
  }

  const BottomNav: React.FC<{ pendingRequestsCount: number; onLogout: () => void }> = ({ pendingRequestsCount, onLogout }) => {
    const [cmdOpen, setCmdOpen] = useState(false)
    const cmdRef = useRef<HTMLDivElement>(null)

    const { user } = useAuth()
    const { currency } = useCurrency()
    const { openGacha } = useGacha()
    const audio = useAudio()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
      if (!cmdOpen) return
      const handler = (e: MouseEvent) => {
        if (cmdRef.current && !cmdRef.current.contains(e.target as Node)) setCmdOpen(false)
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [cmdOpen])

    return (
      <nav className="bottom-nav" aria-label="底部导航">
        {/* Currency strip - always visible on mobile */}
        <div className="bottom-nav-currency">
          <div className="bnv-currency-item" title="圣像石">
            <Icon name="gem" size={12} color="#00ccff" />
            <span>{currency.holy_stone.toLocaleString()}</span>
          </div>
          <div className="bnv-currency-item" title="召唤券">
            <Icon name="ticket" size={12} color="#ffd700" />
            <span>{currency.summon_ticket}</span>
          </div>
          <div className="bnv-currency-item" title="体力">
            <Icon name="stamina" size={12} color="#ff6b9d" />
            <span>{currency.stamina || 0}/{currency.max_stamina || 120}</span>
          </div>
        </div>
        <div className="bottom-nav-items">
        <div
          className={`bottom-nav-item ${location.pathname === '/home' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/home') }}
          onKeyDown={e => e.key === 'Enter' && (navigate('/home'))}
          aria-label="首页"
        >
          <span className="bottom-nav-icon">
            <Icon name="home" size={22} />
          </span>
          <span className="bottom-nav-label">首页</span>
        </div>
        <div
          className={`bottom-nav-item ${location.pathname === '/inventory' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/inventory') }}
          onKeyDown={e => e.key === 'Enter' && (navigate('/inventory'))}
          aria-label="背包"
        >
          <span className="bottom-nav-icon">
            <Icon name="backpack" size={22} />
          </span>
          <span className="bottom-nav-label">背包</span>
        </div>
        <div
          className={`bottom-nav-item ${location.pathname === '/support' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/support') }}
          onKeyDown={e => e.key === 'Enter' && (navigate('/support'))}
          aria-label="应援"
        >
          <span className="bottom-nav-icon">
            <Icon name="star" size={22} />
          </span>
          <span className="bottom-nav-label">应援</span>
        </div>
        <div
          className={`bottom-nav-item ${location.pathname === '/rhythm' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/rhythm') }}
          onKeyDown={e => e.key === 'Enter' && (navigate('/rhythm'))}
          aria-label="演出"
        >
          <span className="bottom-nav-icon">
            <Icon name="music" size={22} />
          </span>
          <span className="bottom-nav-label">演出</span>
        </div>
        <div
          className="bottom-nav-item"
          tabIndex={0}
          role="button"
          onClick={() => { try { audio.playUIClick() } catch(e) {}; openGacha() }}
          onKeyDown={e => e.key === 'Enter' && (openGacha())}
          aria-label="召唤"
        >
          <span className="bottom-nav-icon">
            <Icon name="gem" size={22} />
          </span>
          <span className="bottom-nav-label">召唤</span>
        </div>
        <div className="bottom-nav-item" ref={cmdRef as any}>
          <div className={`bottom-nav-cmd-wrapper ${cmdOpen ? 'open' : ''}`}>
            <button className="bottom-nav-cmd-btn" onClick={() => { audio.playUIClick(); setCmdOpen(o => !o) }} aria-label="音频设置">
              <Icon name="menu" size={22} />
            </button>
            {cmdOpen && (
              <div className="nav-cmd-popover bottom-nav-cmd-popover">
                <div className="nav-cmd-section">
                  <div className="nav-cmd-section-label">音频</div>
                  <button className={`nav-cmd-item ${audio.bgmEnabled ? 'on' : 'off'}`} onClick={() => { audio.toggleBgm(); audio.playUIClick() }}>
                    <Icon name="music" size={16} />
                    <span>背景音乐</span><span className="nav-cmd-status">{audio.bgmEnabled ? '开' : '关'}</span>
                  </button>
                  <button className={`nav-cmd-item ${audio.sfxEnabled ? 'on' : 'off'}`} onClick={() => { audio.toggleSfx(); audio.playUIClick() }}>
                    <Icon name="play" size={16} />
                    <span>音效</span><span className="nav-cmd-status">{audio.sfxEnabled ? '开' : '关'}</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <div className="nav-cmd-section">
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/friends'); setCmdOpen(false) }}>
                    <Icon name="users" size={16} />
                    <span>好友</span>
                    {pendingRequestsCount > 0 && (
                      <span className="friend-request-badge">{pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}</span>
                    )}
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/daily'); setCmdOpen(false) }}>
                    <Icon name="clipboard" size={16} />
                    <span>每日任务</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/ranking'); setCmdOpen(false) }}>
                    <Icon name="chart" size={16} />
                    <span>应援榜</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { try { audio.playUIClick() } catch(e) {}; navigate('/settings'); setCmdOpen(false) }}>
                    <Icon name="settings" size={16} />
                    <span>设置</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <span className="bottom-nav-label">菜单</span>
        </div>
        </div>
      </nav>
    )
  }

// ============ Layout ============
export interface LayoutProps {
  children: React.ReactNode
  showGuide: boolean
  setShowGuide: (show: boolean) => void
  onGuideComplete: () => void
  logoutConfirmOpen: boolean
  setLogoutConfirmOpen: (open: boolean) => void
  pendingRequestsCount: number
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showGuide,
  setShowGuide,
  onGuideComplete,
  logoutConfirmOpen,
  setLogoutConfirmOpen,
  pendingRequestsCount,
}) => {
  const { handleLogout: logout } = useAuth()
  const { isGachaOpen, closeGacha } = useGacha()
  const { fetchCurrency } = useCurrency()
  const { toasts, removeToast } = useToast()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  const handleLogout = () => {
    logout()
    setLogoutConfirmOpen(false)
  }

  return (
    <div className="layout">
      <NavBar
        onLogout={() => setLogoutConfirmOpen(true)}
        onGuide={() => setShowGuide(true)}
      />
      <main className="layout-main">
        {children}
      </main>
      {!isAuthPage && <BottomNav pendingRequestsCount={pendingRequestsCount} onLogout={() => setLogoutConfirmOpen(true)} />}

      <GachaDrawer isOpen={isGachaOpen} onClose={closeGacha} onSuccess={fetchCurrency} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showGuide && <OnboardingGuide onComplete={onGuideComplete} />}

      {logoutConfirmOpen && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>确认退出</h3>
            <p>确定要退出登录吗？</p>
            <div className="confirm-dialog-actions">
              <button className="btn secondary" onClick={() => setLogoutConfirmOpen(false)}>
                取消
              </button>
              <button className="btn primary" onClick={() => { logout(); setLogoutConfirmOpen(false) }}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}