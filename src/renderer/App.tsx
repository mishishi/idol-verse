import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation, useParams, Routes, Route } from 'react-router-dom'
import { useDebounce } from './hooks/useDebounce'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import './styles/base.css'
import './styles/common.css'
import './styles/layout.css'
import './styles/auth.css'
import './styles/home.css'
import './styles/gacha.css'
import './styles/gallery.css'
import './styles/friends.css'
import './styles/ranking.css'
import './styles/detail.css'
import './styles/support.css'
import './styles/navbar.css'
import './styles/rhythm.css'
import './styles/stamina.css'
import './styles/outfit.css'
import './styles/neon.css'
import { Icon } from './components/common/Icon'
import { ToastContainer } from './components/common/Toast'
import { Skeleton } from './components/common/Skeleton'
import { useAudio } from './hooks/useAudio'
import RhythmPage from './components/RhythmPage'

// ============ Global Toast State ============
interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }
let toastId = 0
function generateToastId() { return ++toastId }

interface User {
  id: number
  username: string
}

type Page = 'login' | 'register' | 'home' | 'gacha' | 'gallery' | 'inventory' | 'support' | 'detail' | 'friends' | 'daily' | 'ranking' | 'pass' | 'rhythm' | 'calendar' | 'stamina' | 'settings' | 'shop'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [currency, setCurrency] = useState({ holy_stone: 0, summon_ticket: 0, stamina: 0, max_stamina: 120 })
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [authLoaded, setAuthLoaded] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Network offline/online detection
  useEffect(() => {
    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => { window.removeEventListener('offline', handleOffline); window.removeEventListener('online', handleOnline) }
  }, [])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = generateToastId()
    setToasts(prev => {
      const updated = [{ id, message, type }, ...prev]
      return updated.slice(0, 5) // max 5 toasts
    })
  }, [])
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const audio = useAudio()
  const API_BASE = 'http://localhost:3001/api'

  const fetchCurrency = () => {
    if (!token) return
    fetch(`${API_BASE}/user/currency`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      if (data && data.holy_stone !== undefined) {
        setCurrency({
          holy_stone: data.holy_stone,
          summon_ticket: data.summon_ticket,
          stamina: data.stamina || 0,
          max_stamina: data.max_stamina || 120
        })
      }
    }).catch(() => { addToast('无法加载货币数据', 'error') })
  }

  const fetchPendingRequests = () => {
    if (!token) return
    fetch(`${API_BASE}/friends/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      if (data && Array.isArray(data.received)) {
        setPendingRequestsCount(data.received.length)
      }
    }).catch(() => { addToast('无法加载好友申请', 'error') })
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      navigate('/home')
    }
    setAuthLoaded(true)
  }, [])

  useEffect(() => {
    if (token && location.pathname !== '/login' && location.pathname !== '/register') {
      fetchCurrency()
      fetchPendingRequests()
    }
  }, [token, location.pathname])

  // Mouse parallax for global star background
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', String(e.clientX))
      document.documentElement.style.setProperty('--mouse-y', String(e.clientY))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleLogin = async (username: string, password: string) => {
    if (loginLoading) return
    setLoginLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      setToken(data.token)
      setUser(data.user)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      // Show onboarding guide for new users (not in localStorage yet)
      if (!localStorage.getItem('hasSeenGuide')) {
        setShowGuide(true)
      }
      navigate('/home')
    } catch (err: any) { addToast(err.message, 'error') }
    finally { setLoginLoading(false) }
  }

  const handleRegister = async (username: string, password: string) => {
    if (registerLoading) return
    setRegisterLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '注册失败')
      addToast(`账号 ${username} 注册成功！请登录`, 'success')
      navigate('/login')
    } catch (err: any) { addToast(err.message, 'error') }
    finally { setRegisterLoading(false) }
  }

  const handleLogout = () => {
    setLogoutConfirmOpen(true)
  }

  const confirmLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setLogoutConfirmOpen(false)
    navigate('/login')
  }

  const LoginPage = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    return (
    <div className="auth-page">
      {/* Central portal */}
      <div className="portal-container">
        <div className="portal-ring" />
        <div className="portal-ring-2" />
        <div className="portal-glow" />

        {/* Form panel */}
        <div className="auth-form-panel accent-pink">
          <div className="auth-star-title">★ STARLIGHT GATEWAY ★</div>
          <h1 className="auth-main-title">偶像收藏集</h1>
          <div className="auth-subtitle">LOGIN TO THE UNIVERSE</div>

          <div className="holo-field">
            <label htmlFor="login-username" className="sr-only">用户名 / USERNAME</label>
            <input
              id="login-username"
              className="holo-input"
              placeholder="用户名 / USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(username, password)}
              autoComplete="username"
            />
          </div>

          <div className="holo-field">
            <label htmlFor="login-password" className="sr-only">密码 / PASSWORD</label>
            <input
              id="login-password"
              className="holo-input"
              type={showPw ? 'text' : 'password'}
              placeholder="密码 / PASSWORD"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(username, password)}
              autoComplete="current-password"
            />
            <button className="holo-pw-toggle" type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? '隐藏密码' : '显示密码'}>
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <button
            className="holo-submit-btn pink"
            onClick={() => handleLogin(username, password)}
            disabled={loginLoading}
          >
            {loginLoading ? <div className="auth-loading" /> : '进入宇宙'}
          </button>

          <div className="auth-link-row">
            没有账号？<span onClick={() => { navigate('/register'); setUsername(''); setPassword('') }}>立即注册</span>
          </div>
        </div>
      </div>
    </div>
  )}

  const calcPwStrength = (pw: string): number => {
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 10) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return Math.min(score, 4)
  }

  const strengthLabel = (s: number) => s <= 1 ? 'weak' : s === 2 ? 'mid' : 'strong'
  const strengthText = (s: number) => s <= 1 ? '脆弱' : s === 2 ? '一般' : '安全'

  const RegisterPage = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'error'>('idle')
    const debouncedUsername = useDebounce(username, 400)
    const pwStrength = calcPwStrength(password)

    useEffect(() => {
      if (debouncedUsername.length < 3) { setUsernameStatus('idle'); return }
      setUsernameStatus('checking')
      fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(debouncedUsername)}`)
        .then(r => r.json())
        .then(d => setUsernameStatus(d.available ? 'ok' : 'taken'))
        .catch(() => { addToast('用户名检查失败，请稍后重试', 'error'); setUsernameStatus('error') })
    }, [debouncedUsername])

    return (
      <div className="auth-page">
        <div className="portal-container">
          <div className="portal-ring" />
          <div className="portal-ring-2" />
          <div className="portal-glow" />

          <div className="auth-form-panel accent-green">
            <div className="auth-star-title">★ STARLIGHT GATEWAY ★</div>
            <h1 className="auth-main-title">偶像收藏集</h1>
            <div className="auth-subtitle">JOIN THE UNIVERSE</div>

            {/* Username */}
            <div className="holo-field">
              <label htmlFor="register-username" className="sr-only">用户名 / USERNAME</label>
              <input
                id="register-username"
                className="holo-input"
                placeholder="用户名 / USERNAME"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (password !== confirm) { addToast('两次密码不一致', 'error'); return }
                    handleRegister(username, password)
                  }
                }}
                autoComplete="username"
              />
              {usernameStatus === 'checking' && (
                <span className="holo-username-status checking">
                  <div className="auth-loading" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                </span>
              )}
              {usernameStatus === 'ok' && (
                <span className="holo-username-status available">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
              {usernameStatus === 'taken' && (
                <span className="holo-username-status taken">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </span>
              )}
              {usernameStatus === 'error' && (
                <span className="holo-username-status error">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </span>
              )}
            </div>

            {/* Password */}
            <div className="holo-field">
              <label htmlFor="register-password" className="sr-only">密码 / PASSWORD</label>
              <input
                id="register-password"
                className="holo-input"
                type={showPw ? 'text' : 'password'}
                placeholder="密码 / PASSWORD"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (password !== confirm) { addToast('两次密码不一致', 'error'); return }
                    handleRegister(username, password)
                  }
                }}
                autoComplete="new-password"
              />
              <button className="holo-pw-toggle" type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength */}
            {password.length > 0 && (
              <div className="pw-strength-wrap">
                <div className="pw-strength-bar">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`pw-strength-seg ${i < pwStrength ? `active-${strengthLabel(pwStrength)}` : ''}`} />
                  ))}
                </div>
                <span className={`pw-strength-label ${strengthLabel(pwStrength)}`}>{strengthText(pwStrength)}</span>
              </div>
            )}

            {/* Confirm password */}
            <div className="holo-field">
              <label htmlFor="register-confirm" className="sr-only">确认密码 / CONFIRM</label>
              <input
                id="register-confirm"
                className="holo-input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="确认密码 / CONFIRM"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (password !== confirm) { addToast('两次密码不一致', 'error'); return }
                    handleRegister(username, password)
                  }
                }}
                autoComplete="new-password"
              />
              <button className="holo-pw-toggle" type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? '隐藏密码' : '显示密码'}>
                {showConfirm ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            <button
              className="holo-submit-btn green"
              disabled={registerLoading || usernameStatus === 'taken' || usernameStatus === 'error'}
              onClick={() => {
                if (password !== confirm) { addToast('两次密码不一致', 'error'); return }
                handleRegister(username, password)
              }}
            >
              {registerLoading ? <div className="auth-loading" /> : '开启星途'}
            </button>

            <div className="auth-link-row">
              已有账号？<span onClick={() => { navigate('/login'); setUsername(''); setPassword(''); setConfirm('') }}>返回登录</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const HomePage = () => {
    const [homeStats, setHomeStats] = useState({ character_count: 0, total_gacha: 0, login_streak: 0 })
    const [homeStatsLoading, setHomeStatsLoading] = useState(true)
    const [showGachaDrawer, setShowGachaDrawer] = useState(false)
    const [ownedCharacters, setOwnedCharacters] = useState<any[]>([])

    useEffect(() => {
      if (!token) return
      fetch(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setHomeStats({
          character_count: d.character_count || 0,
          total_gacha: d.total_gacha || 0,
          login_streak: d.login_streak || 0
        })
        setHomeStatsLoading(false)
      }).catch(() => setHomeStatsLoading(false))
    }, [token])

    useEffect(() => {
      if (!token) return
      fetch(`${API_BASE}/user/characters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setOwnedCharacters(Array.isArray(d) ? d : (d.characters || []))
      }).catch(() => { addToast('无法加载角色数据', 'error') })
    }, [token])

    return (
      <div className="home-page">
        {/* Star dust ambient effect */}
        <div className="star-dust">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="star-dust-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        {/* Announcement Banner */}
        <div className="home-announcement">
          <div className="announcement-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="announcement-track">
            <div className="announcement-scroll">
              <div className="announcement-item">
                <span className="announce-badge new">新</span>
                <span>春日限定召唤开启！UR偶像概率UP中</span>
                <span className="announce-link" onClick={() => navigate('/gacha')}>立即参与</span>
              </div>
              <div className="announcement-item">
                <span className="announce-badge">活动</span>
                <span>每日签到可得双倍奖励</span>
              </div>
              <div className="announcement-item">
                <span className="announce-badge">公告</span>
                <span>新版本1.0.1将于下周更新</span>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="announcement-item">
                <span className="announce-badge new">新</span>
                <span>春日限定召唤开启！UR偶像概率UP中</span>
                <span className="announce-link" onClick={() => navigate('/gacha')}>立即参与</span>
              </div>
              <div className="announcement-item">
                <span className="announce-badge">活动</span>
                <span>每日签到可得双倍奖励</span>
              </div>
              <div className="announcement-item">
                <span className="announce-badge">公告</span>
                <span>新版本1.0.1将于下周更新</span>
              </div>
            </div>
          </div>
        </div>
        {/* Hero Banner */}
        <div className="home-hero-banner">
          <div className="hero-banner-glow" />
          <div className="hero-banner-content">
            <div className="hero-banner-icon"><Icon name="sparkle" size={24} /></div>
            <div className="hero-banner-text">
              <div className="hero-banner-label">限时活动</div>
              <div className="hero-banner-title">春日限定召唤</div>
              <div className="hero-banner-desc">UR偶像概率UP！还剩3天</div>
            </div>
            <button
              className="hero-banner-btn"
              onClick={() => setShowGachaDrawer(true)}
              onKeyDown={e => e.key === 'Enter' && setShowGachaDrawer(true)}
              aria-label="立即召唤，参与春日限定活动"
            >立即召唤</button>
          </div>
        </div>

        {/* Currency Strip */}
        <div className="home-currency-strip">
          <div className="currency-item">
            <span className="currency-icon"><Icon name="gem" size={20} /></span>
            <span className="currency-value">{currency.holy_stone}</span>
            <span className="currency-label">圣像石</span>
          </div>
          <div className="currency-divider" />
          <div className="currency-item">
            <span className="currency-icon"><Icon name="ticket" size={20} /></span>
            <span className="currency-value">{currency.summon_ticket}</span>
            <span className="currency-label">召唤券</span>
          </div>
          <div className="currency-divider" />
          <div className="currency-item">
            <span className="currency-icon"><Icon name="stamina" size={20} /></span>
            <span className="currency-value">{currency.stamina}/{currency.max_stamina}</span>
            <span className="currency-label">体力</span>
          </div>
        </div>

        {/* Core Stats */}
        {homeStats.character_count === 0 && homeStats.login_streak === 0 && homeStats.total_gacha === 0 && !homeStatsLoading ? (
          <div className="home-stats-center">
            <div className="empty-state" style={{ padding: '32px 24px', gap: 8 }}>
              <div className="empty-icon" style={{ fontSize: '2.5rem' }}>🌟</div>
              <div className="empty-title" style={{ fontSize: 'var(--text-label)', color: 'var(--text-secondary)' }}>开始你的偶像之旅</div>
              <div className="empty-desc">前往召唤试试手气吧！</div>
            </div>
          </div>
        ) : (
        <div className="home-stats-center">
          <div className="stat-big">
            <div className="stat-big-value">{homeStats.character_count}</div>
            <div className="stat-big-label">拥有偶像</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-big">
            <div className="stat-big-value">{homeStats.login_streak}</div>
            <div className="stat-big-label">连续登录</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-big">
            <div className="stat-big-value">{homeStats.total_gacha}</div>
            <div className="stat-big-label">总召唤</div>
          </div>
        </div>
        )}

        {/* Star Map - Celestial Star Atlas */}
        {ownedCharacters.length > 0 && (
          <section aria-label="我的星图" className="home-star-map">
            <div className="section-title">✦ 我的星图</div>
            <div className="star-map-frame">
              <div className="star-map-container">
                {/* Decorative background stars - scattered across the map */}
                <div className="star-bg" style={{left:'6%',top:'12%',width:1,height:1,animationDelay:'0s'}} />
                <div className="star-bg" style={{left:'18%',top:'6%',width:2,height:2,animationDelay:'0.4s'}} />
                <div className="star-bg" style={{left:'32%',top:'18%',width:1,height:1,animationDelay:'1.1s'}} />
                <div className="star-bg" style={{left:'45%',top:'8%',width:1,height:1,animationDelay:'0.7s'}} />
                <div className="star-bg" style={{left:'58%',top:'15%',width:2,height:2,animationDelay:'1.5s'}} />
                <div className="star-bg" style={{left:'72%',top:'6%',width:1,height:1,animationDelay:'0.2s'}} />
                <div className="star-bg" style={{left:'85%',top:'20%',width:2,height:2,animationDelay:'0.9s'}} />
                <div className="star-bg" style={{left:'92%',top:'10%',width:1,height:1,animationDelay:'1.3s'}} />
                <div className="star-bg" style={{left:'10%',top:'45%',width:1,height:1,animationDelay:'0.5s'}} />
                <div className="star-bg" style={{left:'28%',top:'52%',width:2,height:2,animationDelay:'1.8s'}} />
                <div className="star-bg" style={{left:'50%',top:'48%',width:1,height:1,animationDelay:'0.1s'}} />
                <div className="star-bg" style={{left:'68%',top:'55%',width:1,height:1,animationDelay:'1.2s'}} />
                <div className="star-bg" style={{left:'82%',top:'45%',width:2,height:2,animationDelay:'0.6s'}} />
                <div className="star-bg" style={{left:'95%',top:'50%',width:1,height:1,animationDelay:'1.6s'}} />
                <div className="star-bg" style={{left:'15%',top:'78%',width:1,height:1,animationDelay:'0.3s'}} />
                <div className="star-bg" style={{left:'38%',top:'85%',width:2,height:2,animationDelay:'1.4s'}} />
                <div className="star-bg" style={{left:'55%',top:'80%',width:1,height:1,animationDelay:'0.8s'}} />
                <div className="star-bg" style={{left:'75%',top:'88%',width:1,height:1,animationDelay:'1.7s'}} />
                <div className="star-bg" style={{left:'88%',top:'75%',width:2,height:2,animationDelay:'1.9s'}} />
                <div className="star-bg" style={{left:'5%',top:'92%',width:1,height:1,animationDelay:'0.2s'}} />
                <div className="star-bg" style={{left:'25%',top:'95%',width:1,height:1,animationDelay:'1.0s'}} />
                <div className="star-bg" style={{left:'62%',top:'92%',width:2,height:2,animationDelay:'0.4s'}} />

                {/* Character stars */}
                {ownedCharacters.map((char, idx) => (
                  <button
                    key={char.id || idx}
                    className={`star-node rarity-${char.rarity}`}
                    style={{
                      left: `${12 + (idx % 5) * 19}%`,
                      top: `${18 + Math.floor(idx / 5) * 32}%`,
                    }}
                    onClick={() => navigate(`/detail/${char.id}`)}
                    aria-label={`${char.name} ${char.rarity}`}
                  >
                    <div className="star-halo" />
                    <div className="star-core" />
                    <div className="star-label">
                      <span className="star-label-name">{char.name}</span>
                      <span className="star-label-rarity">{char.rarity}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="star-map-hint">
              <span className="star-map-hint-icon" />
              <span>点击星点查看角色详情</span>
            </div>
          </section>
        )}

        {!homeStatsLoading && homeStats.character_count === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌟</div>
            <div className="empty-title">还没有偶像</div>
            <div className="empty-desc">去召唤试试你的运气吧！</div>
            <div className="empty-action">
              <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 12 }} onClick={() => setShowGachaDrawer(true)}>立即召唤</button>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <section aria-label="快速入口">
          <div className="home-actions-section">
            <div className="section-title">✦ 快速入口</div>
            <div className="actions-grid">
              <div
                className="action-card-new"
                tabIndex={0}
                role="button"
                onClick={() => setShowGachaDrawer(true)}
                onKeyDown={e => e.key === 'Enter' && setShowGachaDrawer(true)}
                aria-label="召唤抽卡"
              >
                <div className="action-card-icon"><Icon name="slot" size={26} /></div>
                <div className="action-card-title">召唤抽卡</div>
                <div className="action-card-sub">抽取心仪偶像</div>
              </div>
              <div
                className="action-card-new"
                tabIndex={0}
                role="button"
                onClick={() => navigate('/support')}
                onKeyDown={e => e.key === 'Enter' && navigate('/support')}
                aria-label="应援殿"
              >
                <div className="action-card-icon"><Icon name="temple" size={26} /></div>
                <div className="action-card-title">应援殿</div>
                <div className="action-card-sub">放置产出资源</div>
              </div>
              <div
                className="action-card-new"
                tabIndex={0}
                role="button"
                onClick={() => navigate('/gallery')}
                onKeyDown={e => e.key === 'Enter' && navigate('/gallery')}
                aria-label="偶像图鉴"
              >
                <div className="action-card-icon"><Icon name="book" size={26} /></div>
                <div className="action-card-title">偶像图鉴</div>
                <div className="action-card-sub">查看所有偶像</div>
              </div>
              <div
                className="action-card-new"
                tabIndex={0}
                role="button"
                onClick={() => navigate('/ranking')}
                onKeyDown={e => e.key === 'Enter' && navigate('/ranking')}
                aria-label="排行榜"
              >
                <div className="action-card-icon"><Icon name="chart" size={26} /></div>
                <div className="action-card-title">排行榜</div>
                <div className="action-card-sub">查看全服排名</div>
              </div>
            </div>
          </div>
        </section>

        {/* Scroll Sections */}
        <section aria-label="限时活动">
          <div className="home-scroll-section">
            <div className="section-title">✦ 限时活动</div>
            <div className="scroll-track">
              <div
                className="scroll-card primary"
                tabIndex={0}
                role="button"
                onClick={() => setShowGachaDrawer(true)}
                onKeyDown={e => e.key === 'Enter' && setShowGachaDrawer(true)}
                aria-label="春日限定召唤，UR概率UP"
              >
                <div className="scroll-card-glow" />
                <div className="scroll-card-icon"><Icon name="sparkle" size={28} /></div>
                <div className="scroll-card-title">春日限定</div>
                <div className="scroll-card-desc">UR概率UP</div>
              </div>
              <div
                className="scroll-card"
                tabIndex={0}
                role="button"
                onClick={() => navigate('/daily')}
                onKeyDown={e => e.key === 'Enter' && navigate('/daily')}
                aria-label="每日任务"
              >
                <div className="scroll-card-glow" />
                <div className="scroll-card-icon"><Icon name="clipboard" size={28} /></div>
                <div className="scroll-card-title">每日任务</div>
                <div className="scroll-card-desc">获取奖励</div>
              </div>
              <div
                className="scroll-card"
                tabIndex={0}
                role="button"
                onClick={() => navigate('/pass')}
                onKeyDown={e => e.key === 'Enter' && navigate('/pass')}
                aria-label="通行证，赛季奖励"
              >
                <div className="scroll-card-glow" />
                <div className="scroll-card-icon"><Icon name="ticket" size={28} /></div>
                <div className="scroll-card-title">通行证</div>
                <div className="scroll-card-desc">赛季奖励</div>
              </div>
            </div>
          </div>
        </section>

        <div className="home-quickbar">
          <div
            className="quickbar-item active"
            tabIndex={0}
            role="button"
            onClick={() => navigate('/home')}
            onKeyDown={e => e.key === 'Enter' && navigate('/home')}
            aria-label="首页"
          >
            <Icon name="home" size={22} />
            <span className="quickbar-label">首页</span>
          </div>
          <div
            className="quickbar-item"
            tabIndex={0}
            role="button"
            onClick={() => navigate('/ranking')}
            onKeyDown={e => e.key === 'Enter' && navigate('/ranking')}
            aria-label="排行"
          >
            <Icon name="chart" size={22} />
            <span className="quickbar-label">排行</span>
          </div>
          <div
            className="quickbar-item"
            tabIndex={0}
            role="button"
            onClick={() => navigate('/daily')}
            onKeyDown={e => e.key === 'Enter' && navigate('/daily')}
            aria-label="任务"
          >
            <Icon name="clipboard" size={22} />
            <span className="quickbar-label">任务</span>
          </div>
        </div>

        <GachaDrawer isOpen={showGachaDrawer} onClose={() => setShowGachaDrawer(false)} onSuccess={fetchCurrency} />
      </div>
    )
  }

  // ============ GachaDrawer (Bottom Sheet for HomePage) ============
  const GachaDrawer = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) => {
    const [pulling, setPulling] = useState(false)
    const [showing, setShowing] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [currency, setCurrency] = useState({ holy_stone: 0, summon_ticket: 0 })
    const [pityStatus, setPityStatus] = useState({ pity_count: 0, is_guaranteed: false, next_guaranteed_at: 90 })
    const [useTicket, setUseTicket] = useState(false)
    const useTicketRef = useRef(useTicket)
    useEffect(() => { useTicketRef.current = useTicket }, [useTicket])
    const [multiPulling, setMultiPulling] = useState(false)
    const [summoning, setSummoning] = useState(false)
    const [multiSummoning, setMultiSummoning] = useState(false)
    const [showingMulti, setShowingMulti] = useState(false)
    const [multiResults, setMultiResults] = useState<any[]>([])
    const [multiRevealIndex, setMultiRevealIndex] = useState(0)
    const [multiAllRevealed, setMultiAllRevealed] = useState(false)
    const [needsNavBarRefresh, setNeedsNavBarRefresh] = useState(false)

    const fetchCurrency = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/currency`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setCurrency(await res.json())
      } catch {}
    }

    const fetchPityStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/gacha/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setPityStatus(await res.json())
      } catch {}
    }

    useEffect(() => { if (isOpen) { fetchCurrency(); fetchPityStatus() } }, [isOpen])

    // Auto-reveal cards one by one — first 3 fast (200ms), rest slower (500ms)
    useEffect(() => {
      if (!showingMulti) return
      if (multiRevealIndex < 0) {
        const t = setTimeout(() => setMultiRevealIndex(0), 300)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex < 3) {
        const t = setTimeout(() => setMultiRevealIndex(i => i + 1), 200)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex < 9) {
        const t = setTimeout(() => setMultiRevealIndex(i => i + 1), 500)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex === 9) {
        const t = setTimeout(() => setMultiAllRevealed(true), 600)
        return () => clearTimeout(t)
      }
    }, [showingMulti, multiRevealIndex])

    // Play SSR/UR sound when modal opens
    useEffect(() => {
      if (showing && result && (result.rarity === 'SSR' || result.rarity === 'UR')) {
        if (result.rarity === 'UR') { audio.playURSound() } else { audio.playSSRSound() }
      }
    }, [showing, result])

    // Play SSR/UR sound for multi when all cards revealed
    useEffect(() => {
      if (multiAllRevealed && multiResults.length > 0) {
        const hasUR = multiResults.some(c => c.rarity === 'UR')
        const hasSSR = multiResults.some(c => c.rarity === 'SSR')
        if (hasUR) { audio.playURSound() } else if (hasSSR) { audio.playSSRSound() }
      }
    }, [multiAllRevealed])

    const doGacha = async () => {
      if (pulling) return
      setPulling(true)
      try {
        const res = await fetch(`${API_BASE}/gacha/single`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ use_ticket: useTicketRef.current })
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || '抽卡失败') }
        const data = await res.json()
        audio.playGachaSingle()
        setResult(data.character)
        setPulling(false)
        // Phase 1: dark overlay — 1.5s of anticipation
        setSummoning(true)
        setTimeout(() => {
          setSummoning(false)
          setShowing(true)
          // Phase 2: result reveal
          setTimeout(() => fetchCurrency(), 100)
          setCurrency((prev: any) => ({
            holy_stone: prev.holy_stone - (useTicketRef.current ? 0 : 10),
            summon_ticket: prev.summon_ticket - (useTicketRef.current ? 1 : 0)
          }))
          setPityStatus((prev: any) => ({ ...prev, pity_count: data.pity_count }))
        }, 1500)
      } catch (err: any) { addToast(err.message, 'error'); setPulling(false) }
    }

    const doMultiGacha = async () => {
      if (multiPulling) return
      setMultiPulling(true)
      try {
        const res = await fetch(`${API_BASE}/gacha/multi`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ use_ticket: useTicketRef.current })
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || '十连抽卡失败') }
        const data = await res.json()
        audio.playGachaMulti()
        setMultiResults(data.characters)
        setMultiRevealIndex(-1)
        setMultiAllRevealed(false)
        setMultiPulling(false)
        // Phase 1: dark overlay — 1.5s of anticipation
        setMultiSummoning(true)
        setTimeout(() => {
          setMultiSummoning(false)
          setShowingMulti(true)
          setTimeout(() => fetchCurrency(), 100)
          setCurrency((prev: any) => ({
            holy_stone: prev.holy_stone - (useTicketRef.current ? 0 : 100),
            summon_ticket: prev.summon_ticket - (useTicketRef.current ? 10 : 0)
          }))
          setPityStatus((prev: any) => ({ ...prev, pity_count: data.pity_count }))
        }, 1500)
      } catch (err: any) { addToast(err.message, 'error'); setMultiPulling(false) }
    }

    if (!isOpen) return null
    const insufficientCurrency = useTicket ? currency.summon_ticket < 1 : currency.holy_stone < 10
    const multiInsufficientCurrency = useTicket ? currency.summon_ticket < 9 : currency.holy_stone < 100
    const pityPercent = Math.min(100, (pityStatus.pity_count / 90) * 100)

    const handleClose = () => { onSuccess?.(); onClose(); setShowing(false); setShowingMulti(false); setSummoning(false); setMultiSummoning(false) }

    return (
      <>
        {(!summoning && !multiSummoning) && (
          <>
            <div className="gacha-drawer-backdrop" onClick={handleClose} />
            <div className="gacha-drawer">
          <div className="gacha-drawer-handle"><div className="gacha-drawer-handle-bar" /></div>
          <div className="gacha-drawer-header">
            <span className="gacha-drawer-title">限时召唤</span>
            <button className="gacha-drawer-close" onClick={handleClose}><Icon name="close" size={16} /></button>
          </div>
          <div className="gacha-drawer-currency">
            <div className="gacha-drawer-currency-item">
              <Icon name="gem" size={16} color="var(--currency-stone)" />
              <span className="currency-value">{currency.holy_stone}</span>
              <span className="currency-label">圣像石</span>
            </div>
            <div className="gacha-drawer-currency-item">
              <Icon name="ticket" size={16} color="var(--currency-ticket)" />
              <span className="currency-value">{currency.summon_ticket}</span>
              <span className="currency-label">召唤券</span>
            </div>
          </div>
          <div className="gacha-drawer-section">
            <div className="gacha-drawer-mode">
              <button className={`gacha-drawer-mode-btn ${!useTicket ? 'active' : ''}`} onClick={() => setUseTicket(false)}>
                <span className="mode-dot" />圣像石
              </button>
              <button className={`gacha-drawer-mode-btn ${useTicket ? 'active' : ''}`} onClick={() => setUseTicket(true)}>
                <span className="mode-dot" />召唤券
              </button>
            </div>
          </div>
          <div className="gacha-drawer-pity">
            <div className="gacha-drawer-pity-header">
              <span className="gacha-drawer-pity-title">保底进度</span>
              <span className="gacha-drawer-pity-count">{pityStatus.pity_count} / 90</span>
            </div>
            <div className="gacha-drawer-pity-track">
              <div className="gacha-drawer-pity-fill" style={{ width: `${pityPercent}%` }} />
            </div>
          </div>
          {insufficientCurrency && <div className="gacha-drawer-insufficient">圣像石不足，无法单抽</div>}
          {multiInsufficientCurrency && <div className="gacha-drawer-insufficient">圣像石不足，无法十连</div>}
          <div className="gacha-drawer-buttons">
            <div className="gacha-drawer-btn-wrapper single">
              <div className="gacha-drawer-btn-glow" />
              <button className="gacha-drawer-btn single" onClick={doGacha} disabled={pulling || insufficientCurrency}>
                <span className="gacha-drawer-btn-icon">
                  {pulling
                    ? <LoadingSpinner size={22} color="#ffb3cc" />
                    : <Icon name="sparkles" size={22} color="#ff6b9d" />
                  }
                </span>
                <span className="gacha-drawer-btn-label">{pulling ? '抽卡中...' : '单  抽'}</span>
                <span className="gacha-drawer-btn-cost">{useTicket ? '1 召唤券' : '10 圣像石'}</span>
              </button>
            </div>
            <div className="gacha-drawer-btn-wrapper multi">
              <div className="gacha-drawer-btn-glow" />
              <button className="gacha-drawer-btn multi" onClick={doMultiGacha} disabled={multiPulling || multiInsufficientCurrency}>
                <span className="gacha-drawer-btn-icon">
                  {multiPulling
                    ? <LoadingSpinner size={22} color="#d4b3ff" />
                    : <Icon name="star2" size={22} color="#c084fc" />
                  }
                </span>
                <span className="gacha-drawer-btn-label">{multiPulling ? '抽卡中...' : '十  连'}</span>
                <span className="gacha-drawer-btn-cost">{useTicket ? '9 召唤券' : '100 圣像石'}</span>
              </button>
            </div>
          </div>
        </div>
          </>
        )}

        {summoning && result && (
          <div className="gacha-summoning-overlay" role="dialog" aria-modal="true" aria-label="召唤中">
            <div className="gacha-summoning-inner">
              <div className="summoning-ring summoning-ring-1" />
              <div className="summoning-ring summoning-ring-2" />
              <div className="summoning-ring summoning-ring-3" />
              <div className="summoning-ring summoning-ring-4" />
              <div className="summoning-ring summoning-ring-5" />
              <div className="summoning-core" />
              <div className="summoning-particles">
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
              </div>
              <div className="summoning-text">召唤中</div>
              <div className="summoning-sub">命运的卡片正在汇聚...</div>
            </div>
          </div>
        )}

        {multiSummoning && (
          <div className="gacha-summoning-overlay" role="dialog" aria-modal="true" aria-label="十连召唤中">
            <div className="gacha-summoning-inner">
              <div className="summoning-ring summoning-ring-1" />
              <div className="summoning-ring summoning-ring-2" />
              <div className="summoning-ring summoning-ring-3" />
              <div className="summoning-ring summoning-ring-4" />
              <div className="summoning-ring summoning-ring-5" />
              <div className="summoning-core" />
              <div className="summoning-particles">
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
                <div className="summoning-particle" />
              </div>
              <div className="summoning-text">十连召唤</div>
              <div className="summoning-sub">10 张命运卡片正在汇聚...</div>
            </div>
          </div>
        )}

        {showing && result && (
          <div className="gacha-result-modal" role="dialog" aria-modal="true" aria-label={`抽卡结果：${result.name || ''} ${result.rarity}`} onClick={() => { if (needsNavBarRefresh) { fetchCurrency(); setNeedsNavBarRefresh(false) }; setShowing(false) }}>
            {/* SSR/UR reveal flash */}
            {(result.rarity === 'SSR' || result.rarity === 'UR') && (
              <div className={`result-flash ${result.rarity === 'UR' ? 'result-flash-ur' : 'result-flash-ssr'}`} />
            )}
            <div className={`gacha-result-card rarity-${result.rarity}`} onClick={e => e.stopPropagation()}>
              <div className="result-card-bg">
                <div className="nebula-cloud-single nebula-cloud-single-1" />
                <div className="nebula-cloud-single nebula-cloud-single-2" />
                <div className="result-card-particles">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="result-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, width: '3px', height: '3px' }} />
                  ))}
                </div>
              </div>
              {/* UR gold particle explosion */}
              {result.rarity === 'UR' && (
                <div className="ur-particle-explosion">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i / 16) * Math.PI * 2;
                    const distance = 80 + Math.random() * 60;
                    const tx = Math.cos(angle) * distance;
                    const ty = Math.sin(angle) * distance;
                    return (
                      <div
                        key={i}
                        className="ur-particle"
                        style={{
          top: '50%',
          left: '50%',
          animationDelay: `${i * 0.05}s`,
          ['--tx' as string]: `${tx}px`,
          ['--ty' as string]: `${ty}px`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {/* UR gold ray burst - 16 rays */}
              {result.rarity === 'UR' && (
                <div className="ur-ray-burst">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="ur-ray" />
                  ))}
                </div>
              )}
              <div className="portal-ring">
                <div className="portal-ring-1" />
                <div className="portal-ring-2" />
                <div className="portal-ring-3" />
              </div>
              <div className="result-card-inner">
                <div className="result-card-hud" />
                <div className="result-card-badge">{result.rarity}</div>
                <div className="result-card-avatar-frame">
                  <div className="result-card-avatar-glow" />
                  {result?.image_path ? (
                    <img className="result-card-avatar" src={result.image_path} alt={result.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                  ) : null}
                  <div className="result-card-avatar-fallback hidden">{result?.name?.charAt(0) || '?'}</div>
                </div>
                <div className="result-card-name">{result.name}</div>
                <div className="result-card-subtitle">获得偶像</div>
                <div className="result-card-congrats">恭喜获得！</div>
                <div className="result-card-actions">
                  <button className="result-card-btn result-card-btn-secondary" onClick={() => { setShowing(false); setSummoning(true); doGacha() }}>
                    <span className="btn-shine" />再抽
                  </button>
                  <button className="result-card-btn" onClick={() => { if (needsNavBarRefresh) { fetchCurrency(); setNeedsNavBarRefresh(false) }; setShowing(false) }}>
                    <span className="btn-shine" />确定
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showingMulti && (
          <div className="gacha-drawer-overlay" onClick={() => { if (needsNavBarRefresh) { fetchCurrency(); setNeedsNavBarRefresh(false) }; setShowingMulti(false) }}>
            <div className={`gacha-result-card gacha-multi-card rarity-${multiResults[multiRevealIndex]?.rarity || 'N'}`} onClick={e => e.stopPropagation()}>
              <div className="nebula-bg">
                <div className="nebula-cloud nebula-cloud-1" />
                <div className="nebula-cloud nebula-cloud-2" />
                <div className="nebula-cloud nebula-cloud-3" />
              </div>
              <div className="wormhole-portal">
                <div className="portal-ring-nebula portal-ring-nebula-1" />
                <div className="portal-ring-nebula portal-ring-nebula-2" />
                <div className="portal-ring-nebula portal-ring-nebula-3" />
              </div>
              <div className="multi-reveal-grid">
                {multiResults.map((char, idx) => (
                  <div key={idx} className={`holo-card rarity-${char.rarity} ${idx <= multiRevealIndex ? 'multi-reveal' : ''}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="holo-card-inner">
                      {char.image_path ? (
                        <img className="holo-card-image" src={char.image_path} alt={char.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
                      ) : null}
                      <div className="holo-card-image-fallback hidden">{char.name?.charAt(0) || '?'}</div>
                      <div className="holo-card-name">{char.name}</div>
                      <div className="card-rarity-area">
                        <span className={`rarity-tag ${char.rarity}`}>{char.rarity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="multi-reveal-controls">
                {multiAllRevealed ? (
                  <div className="multi-summary">
                    <div className="multi-summary-congrats">恭喜获得 {multiResults.length} 位偶像！</div>
                    <div className="multi-summary-badges">
                      {multiResults.filter(c => c.rarity === 'UR').length > 0 && (
                        <span className="multi-summary-badge rarity-UR">UR ×{multiResults.filter(c => c.rarity === 'UR').length}</span>
                      )}
                      {multiResults.filter(c => c.rarity === 'SSR').length > 0 && (
                        <span className="multi-summary-badge rarity-SSR">SSR ×{multiResults.filter(c => c.rarity === 'SSR').length}</span>
                      )}
                      {multiResults.filter(c => c.rarity === 'SR').length > 0 && (
                        <span className="multi-summary-badge rarity-SR">SR ×{multiResults.filter(c => c.rarity === 'SR').length}</span>
                      )}
                    </div>
                    <div className="multi-summary-actions">
                      <button className="result-card-btn result-card-btn-secondary" onClick={() => { setShowingMulti(false); setMultiAllRevealed(false); setMultiRevealIndex(0); doMultiGacha() }}>
                        <span className="btn-shine" />再抽
                      </button>
                      <button className="result-card-btn" onClick={() => { if (needsNavBarRefresh) { fetchCurrency(); setNeedsNavBarRefresh(false) }; setShowingMulti(false); setMultiAllRevealed(false); setMultiRevealIndex(0) }}>
                        <span className="btn-shine" />确定
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="multi-progress">
                    <div className="multi-progress-dots">
                      {multiResults.map((_, idx) => (
                        <div key={idx} className={`multi-dot ${idx <= multiRevealIndex ? 'active' : ''} ${multiResults[idx]?.rarity === 'SSR' || multiResults[idx]?.rarity === 'UR' ? 'highlight' : ''}`} />
                      ))}
                    </div>
                    <div className="multi-progress-label">{Math.max(0, multiRevealIndex + 1)} / 10</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const GachaPage = ({ onCurrencyUpdate }: { onCurrencyUpdate?: () => void }) => {
    const [pulling, setPulling] = useState(false)
    const [showing, setShowing] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [currency, setCurrency] = useState({ holy_stone: 0, summon_ticket: 0 })
    const [pityStatus, setPityStatus] = useState({ pity_count: 0, is_guaranteed: false, next_guaranteed_at: 90 })
    const [useTicket, setUseTicket] = useState(false)
    const useTicketRef = useRef(useTicket)
    useEffect(() => { useTicketRef.current = useTicket }, [useTicket])
    const [multiPulling, setMultiPulling] = useState(false)
    const [showingMulti, setShowingMulti] = useState(false)
    const [multiResults, setMultiResults] = useState<any[]>([])
    const [multiRevealIndex, setMultiRevealIndex] = useState(0)
    const [multiAllRevealed, setMultiAllRevealed] = useState(false)
    const [needsNavBarRefresh, setNeedsNavBarRefresh] = useState(false)
    const [revealSpeed, setRevealSpeed] = useState<'normal' | 'fast'>('normal')

    const fetchCurrency = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/currency`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setCurrency(await res.json())
      } catch {}
    }

    const fetchPityStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/gacha/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setPityStatus(await res.json())
      } catch {}
    }

    useEffect(() => { fetchCurrency(); fetchPityStatus() }, [])

    // Auto-reveal cards one by one — first 3 fast (200ms), rest slower (500ms), speed toggleable
    const speedMultiplier = revealSpeed === 'fast' ? 0.1 : 1
    useEffect(() => {
      if (!showingMulti) return
      if (multiRevealIndex < 0) {
        const t = setTimeout(() => setMultiRevealIndex(0), 300 * speedMultiplier)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex < 3) {
        const t = setTimeout(() => setMultiRevealIndex(i => i + 1), 200 * speedMultiplier)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex < 9) {
        const t = setTimeout(() => setMultiRevealIndex(i => i + 1), 500 * speedMultiplier)
        return () => clearTimeout(t)
      }
      if (multiRevealIndex === 9) {
        const t = setTimeout(() => setMultiAllRevealed(true), 600 * speedMultiplier)
        return () => clearTimeout(t)
      }
    }, [showingMulti, multiRevealIndex, speedMultiplier])

    const doGacha = async () => {
      if (pulling) return
      setPulling(true)
      // Save currency for rollback in case of mid-operation failure
      const prevStone = currency.holy_stone
      const prevTicket = currency.summon_ticket
      try {
        const res = await fetch(`${API_BASE}/gacha/single`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ use_ticket: useTicketRef.current })
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || '抽卡失败') }
        const data = await res.json()
        audio.playGachaSingle()
        setResult(data.character)
        setShowing(true)
        // Defer currency refresh to avoid interrupting modal render
        setTimeout(() => fetchCurrency(), 100)
        // Also update global NavBar currency
        setCurrency((prev: any) => ({
          holy_stone: prev.holy_stone - (useTicketRef.current ? 0 : 10),
          summon_ticket: prev.summon_ticket - (useTicketRef.current ? 1 : 0)
        }))
        setPityStatus((prev: any) => ({ ...prev, pity_count: data.pity_count }))
        // Refresh navbar currency after modal closes
        setNeedsNavBarRefresh(true)
      } catch (err: any) {
        // Rollback currency on any failure after API success
        setCurrency(() => ({ holy_stone: prevStone, summon_ticket: prevTicket }))
        addToast(err.message, 'error')
      } finally { setPulling(false) }
    }

    // Play SSR/UR sound when modal opens
    useEffect(() => {
      if (showing && result && (result.rarity === 'SSR' || result.rarity === 'UR')) {
        if (result.rarity === 'UR') {
          audio.playURSound()
        } else {
          audio.playSSRSound()
        }
      }
    }, [showing, result])

    // Play SSR/UR sound for multi when all cards revealed
    useEffect(() => {
      if (multiAllRevealed && multiResults.length > 0) {
        const hasUR = multiResults.some(c => c.rarity === 'UR')
        const hasSSR = multiResults.some(c => c.rarity === 'SSR')
        if (hasUR) {
          audio.playURSound()
        } else if (hasSSR) {
          audio.playSSRSound()
        }
      }
    }, [multiAllRevealed])

    const doMultiGacha = async () => {
      if (multiPulling) return
      setMultiPulling(true)
      // Save currency for rollback in case of mid-operation failure
      const prevStone = currency.holy_stone
      const prevTicket = currency.summon_ticket
      try {
        const res = await fetch(`${API_BASE}/gacha/multi`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ use_ticket: useTicketRef.current })
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || '十连抽卡失败') }
        const data = await res.json()
        audio.playGachaMulti()
        setMultiResults(data.characters)
        setMultiRevealIndex(-1)
        setMultiAllRevealed(false)
        setRevealSpeed('normal')
        setShowingMulti(true)
        // Defer currency refresh to avoid interrupting modal render
        setTimeout(() => fetchCurrency(), 100)
        // Also update global NavBar currency
        setCurrency((prev: any) => ({
          holy_stone: prev.holy_stone - (useTicketRef.current ? 0 : 100),
          summon_ticket: prev.summon_ticket - (useTicketRef.current ? 10 : 0)
        }))
        setPityStatus((prev: any) => ({ ...prev, pity_count: data.pity_count }))
        // Refresh navbar currency after modal closes
        setNeedsNavBarRefresh(true)
      } catch (err: any) {
        // Rollback currency on any failure after API success
        setCurrency(() => ({ holy_stone: prevStone, summon_ticket: prevTicket }))
        addToast(err.message, 'error')
      } finally { setMultiPulling(false) }
    }

    const insufficientCurrency = useTicket ? currency.summon_ticket < 1 : currency.holy_stone < 10
    const multiInsufficientCurrency = useTicket ? currency.summon_ticket < 9 : currency.holy_stone < 100
    const pityPercent = Math.min(100, (pityStatus.pity_count / 90) * 100)

    return (
      <div className="gacha-page">
        {/* Hero Section */}
        <div className="gacha-hero">
          <div className="gacha-hero-glow" />
          <h2 className="gacha-title">
            <span className="gacha-title-main">召唤抽卡</span>
            <span className="gacha-title-sub">SUMMON</span>
          </h2>
          <div className="gacha-currency-display">
            <div className="currency-item holy-stone-display">
              <Icon name="gem" size={20} color="var(--currency-stone)" />
              <div>
                <div className="currency-value">{currency.holy_stone}</div>
                <div className="currency-label">圣像石</div>
              </div>
            </div>
            <div className="currency-divider" />
            <div className="currency-item ticket-display">
              <Icon name="ticket" size={20} color="var(--currency-ticket)" />
              <div>
                <div className="currency-value">{currency.summon_ticket}</div>
                <div className="currency-label">召唤券</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="gacha-mode-toggle">
          <div
            className={`mode-btn ${!useTicket ? 'active' : ''}`}
            onClick={() => setUseTicket(false)}
          >
            <Icon name="gem" size={16} color="var(--currency-stone)" />
            <span className="mode-btn-text">圣像石</span>
            <span className="mode-btn-cost">单抽10 / 十连100</span>
          </div>
          <div
            className={`mode-btn ${useTicket ? 'active' : ''}`}
            onClick={() => setUseTicket(true)}
          >
            <Icon name="ticket" size={16} color="var(--currency-ticket)" />
            <span className="mode-btn-text">召唤券</span>
            <span className="mode-btn-cost">单抽1 / 十连9</span>
          </div>
        </div>

        {/* Gacha Buttons Area */}
        <div className="gacha-buttons-area">
          <div className="gacha-btn-wrapper">
            <div className="gacha-btn-glow" />
            <button
              className={`gacha-btn ${insufficientCurrency ? 'gacha-btn-disabled' : ''}`}
              onClick={doGacha}
              disabled={pulling || insufficientCurrency}
            >
              <div className="gacha-btn-content">
                {pulling ? <LoadingSpinner size={18} color="#fff" /> : <Icon name="sparkles" size={18} color="#fff" />}
                <span className="gacha-btn-label">{pulling ? '召唤中...' : '单抽'}</span>
                <span className="gacha-btn-cost">{useTicket ? '1 召唤券' : '10 圣像石'}</span>
              </div>
              <div className="gacha-btn-particles">
                <span className="gacha-particle" style={{ '--tx': '20px', '--ty': '-10px' } as any} />
                <span className="gacha-particle" style={{ '--tx': '-15px', '--ty': '15px' } as any} />
                <span className="gacha-particle" style={{ '--tx': '25px', '--ty': '20px' } as any} />
              </div>
            </button>
            {insufficientCurrency && (
              <div className="gacha-btn-hint">{useTicket ? '召唤券不足' : '圣像石不足'}</div>
            )}
          </div>

          <div className="gacha-btn-wrapper">
            <div className="gacha-btn-glow multi-glow" />
            <button
              className={`gacha-btn gacha-btn-multi ${multiInsufficientCurrency ? 'gacha-btn-disabled' : ''}`}
              onClick={doMultiGacha}
              disabled={multiPulling || multiInsufficientCurrency}
            >
              <div className="gacha-btn-content">
                {multiPulling ? <LoadingSpinner size={18} color="#fff" /> : <Icon name="star2" size={18} color="#fff" />}
                <span className="gacha-btn-label">{multiPulling ? '十连中...' : '十连'}</span>
                <span className="gacha-btn-cost">{useTicket ? '9 召唤券' : '100 圣像石'}</span>
              </div>
              <div className="gacha-btn-particles">
                <span className="gacha-particle" style={{ '--tx': '20px', '--ty': '-10px' } as any} />
                <span className="gacha-particle" style={{ '--tx': '-15px', '--ty': '15px' } as any} />
                <span className="gacha-particle" style={{ '--tx': '25px', '--ty': '20px' } as any} />
              </div>
            </button>
            {multiInsufficientCurrency && (
              <div className="gacha-btn-hint">{useTicket ? '召唤券不足' : '圣像石不足'}</div>
            )}
          </div>
        </div>

        {/* Pity Progress Bar */}
        <div className="pity-section">
          <div className="pity-header">
            <div className="pity-label">
              <span className="pity-icon">🎯</span>
              <span>保底进度</span>
            </div>
            <div className="pity-count">
              <span className="pity-count-current">{pityStatus.pity_count}</span>
              <span className="pity-count-sep">/</span>
              <span className="pity-count-max">90</span>
            </div>
          </div>
          <div className="pity-bar">
            <div className="pity-bar-fill" style={{ width: `${pityPercent}%` }} />
            <div className="pity-milestone-line" />
            <div className="pity-milestone-label">50%</div>
            <div className="pity-milestone-90" />
            {pityStatus.is_guaranteed && (
              <div className="pity-guaranteed-badge">大保底已触发!</div>
            )}
          </div>
          <div className="pity-tip">
            {pityStatus.next_guaranteed_at > 0
              ? `再抽 ${pityStatus.next_guaranteed_at} 次必出 SSR`
              : '保底已满，下次必得 SSR!'}
          </div>
        </div>

        {showing && result && (
          <div className="gacha-result-modal" role="dialog" aria-modal="true" aria-label={`抽卡结果：${result.name || ''} ${result.rarity}`} onClick={() => { if (needsNavBarRefresh) { onCurrencyUpdate?.(); setNeedsNavBarRefresh(false) }; setShowing(false) }}>
            <div
              className={`gacha-result-card rarity-${result.rarity}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="result-card-bg">
                <div className="result-card-rays" />
                <div className="result-card-particles">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="result-particle"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                      } as any}
                    />
                  ))}
                </div>
              </div>
              {/* UR gold ray burst - 16 rays */}
              {result.rarity === 'UR' && (
                <div className="ur-ray-burst">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="ur-ray" />
                  ))}
                </div>
              )}
              <div className="result-card-inner">
                <div className="result-card-badge">{result.rarity}</div>
                <div className="result-card-avatar-frame">
                  <div className="result-card-avatar-glow" />
                  {result?.image_path ? (
                    <img
                      className="result-card-avatar"
                      src={result.image_path}
                      alt={result.name}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                    />
                  ) : null}
                  <div className="result-card-avatar-fallback hidden">{result?.name?.charAt(0) || '?'}</div>
                </div>
                <div className="result-card-name">{result.name}</div>
                <div className="result-card-subtitle">获得偶像</div>
                <button className="result-card-btn" onClick={() => { if (needsNavBarRefresh) { onCurrencyUpdate?.(); setNeedsNavBarRefresh(false) }; setShowing(false) }}>
                  <span className="btn-shine" />
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {showingMulti && (
          <div className="gacha-result-modal" role="dialog" aria-modal="true" aria-label="十连抽卡结果" onClick={() => { if (needsNavBarRefresh) { onCurrencyUpdate?.(); setNeedsNavBarRefresh(false) }; setShowingMulti(false) }}>
            <div
              className={`gacha-result-card gacha-multi-card rarity-${multiResults[multiRevealIndex]?.rarity || 'N'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="multi-reveal-grid">
                {multiResults.map((char, idx) => (
                  <div
                    key={idx}
                    className={`holo-card rarity-${char.rarity} ${idx <= multiRevealIndex ? 'multi-reveal' : ''}`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="holo-card-inner">
                      {char.image_path ? (
                        <img
                          className="holo-card-image"
                          src={char.image_path}
                          alt={char.name}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className="holo-card-image-fallback hidden">{char.name?.charAt(0) || '?'}</div>
                      <div className="holo-card-name">{char.name}</div>
                      <div className="holo-card-rarity">{char.rarity}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="multi-reveal-controls">
                {multiAllRevealed ? (
                  <div className="multi-summary">
                    <div className="multi-summary-badges">
                      {multiResults.filter(c => c.rarity === 'UR').length > 0 && (
                        <span className="multi-summary-badge rarity-UR">UR ×{multiResults.filter(c => c.rarity === 'UR').length}</span>
                      )}
                      {multiResults.filter(c => c.rarity === 'SSR').length > 0 && (
                        <span className="multi-summary-badge rarity-SSR">SSR ×{multiResults.filter(c => c.rarity === 'SSR').length}</span>
                      )}
                      {multiResults.filter(c => c.rarity === 'SR').length > 0 && (
                        <span className="multi-summary-badge rarity-SR">SR ×{multiResults.filter(c => c.rarity === 'SR').length}</span>
                      )}
                    </div>
                    <div className="multi-summary-actions">
                      <button className="result-card-btn result-card-btn-secondary" onClick={() => { setShowingMulti(false); setMultiAllRevealed(false); setMultiRevealIndex(0); doMultiGacha() }}>
                        <span className="btn-shine" />再抽
                      </button>
                      <button className="result-card-btn" onClick={() => { if (needsNavBarRefresh) { onCurrencyUpdate?.(); setNeedsNavBarRefresh(false) }; setShowingMulti(false); setMultiAllRevealed(false); setMultiRevealIndex(0) }}>
                        <span className="btn-shine" />确定
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="multi-progress">
                    <div className="multi-progress-dots">
                      {multiResults.map((_, idx) => (
                        <div key={idx} className={`multi-dot ${idx <= multiRevealIndex ? 'active' : ''} ${multiResults[idx]?.rarity === 'SSR' || multiResults[idx]?.rarity === 'UR' ? 'highlight' : ''}`} />
                      ))}
                    </div>
                    <div className="multi-progress-label">{Math.max(0, multiRevealIndex + 1)} / 10</div>
                    <button
                      className="multi-speed-toggle"
                      onClick={() => setRevealSpeed(s => s === 'normal' ? 'fast' : 'normal')}
                      aria-label={revealSpeed === 'normal' ? '加速' : '减速'}
                    >
                      {revealSpeed === 'normal' ? '⚡ 加速' : '🐢 减速'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const GalleryPage = () => {
    const [characters, setCharacters] = useState<any[]>([])
    const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
    const [userChars, setUserChars] = useState<any[]>([])
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)

    const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR']
    const RARITY_TABS = ['全部', 'N', 'R', 'SR', 'SSR', 'UR']

    useEffect(() => {
      Promise.all([
        fetch(`${API_BASE}/characters`).then(r => r.json()),
        fetch(`${API_BASE}/user/characters`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ]).then(([allChars, myChars]) => {
        setCharacters(allChars)
        const ownedIdsArray = myChars.map((c: any) => c.character_id || c.id).filter(Boolean)
        setOwnedIds(new Set(ownedIdsArray))
        setUserChars(myChars)
        setLoading(false)
      }).catch((err) => {
        console.error('[Gallery] fetch error:', err)
        setLoading(false)
      })
    }, [])

    const recentlyObtained = useMemo(() => {
      return [...userChars]
        .sort((a, b) => (b.obtained_at || 0) - (a.obtained_at || 0))
        .slice(0, 6)
    }, [userChars])

    const rarityCounts = useMemo(() => {
      const counts: Record<string, { total: number; owned: number }> = {}
      for (const r of RARITY_ORDER) {
        const total = characters.filter(c => c.rarity === r).length
        const owned = characters.filter(c => c.rarity === r && ownedIds.has(c.character_id)).length
        counts[r] = { total, owned }
      }
      counts['all'] = { total: characters.length, owned: ownedIds.size }
      return counts
    }, [characters, ownedIds])

    const filtered = useMemo(() => {
      let result = filter === 'all' ? characters : characters.filter(c => c.rarity === filter)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        result = result.filter(c => c.name.toLowerCase().includes(q))
      }
      return result
    }, [characters, filter, searchQuery, ownedIds])

    const getRarityIcon = (r: string) => ({ N: '☆', R: '✦', SR: '★', SSR: '✦', UR: '★' }[r] || '☆')
    const totalChars = characters.length
    const obtainedChars = ownedIds.size
    const completionRate = totalChars > 0 ? Math.round((obtainedChars / totalChars) * 100) : 0
    const isComplete = completionRate === 100 && totalChars > 0

    return (
      <div className={`idol-page ${isComplete ? 'idol-page-complete' : ''}`}>

        {/* ========================================
            STARFIELD BACKGROUND — 3 LAYER SYSTEM
            ======================================== */}
        <div className="gallery-starfield">
          {/* Layer 1: Distant pinprick stars */}
          <div className="starfield-layer starfield-distant">
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} className="sf-star" style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 23 + 7) % 100}%`,
                width: Math.random() * 1.5 + 0.5,
                height: Math.random() * 1.5 + 0.5,
                animationDelay: `${(i * 0.3) % 5}s`,
                animationDuration: `${2 + (i % 3)}s`,
              }} />
            ))}
          </div>
          {/* Layer 2: Mid shooting-star streaks */}
          <div className="starfield-layer starfield-mid">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="sf-shooting-star" style={{
                left: `${15 + i * 18}%`,
                top: `${8 + (i % 3) * 15}%`,
                animationDelay: `${i * 2.3}s`,
                animationDuration: `${1.2 + (i % 4) * 0.3}s`,
              }}>
                <div className="sf-streak" />
              </div>
            ))}
          </div>
          {/* Layer 3: Foreground nebula wisps */}
          <div className="starfield-layer starfield-foreground">
            <div className="sf-nebula sf-nebula-1" />
            <div className="sf-nebula sf-nebula-2" />
            <div className="sf-nebula sf-nebula-3" />
          </div>
        </div>

        {/* ========================================
            COMPLETION RIBBON — Full-width holographic banner
            ======================================== */}
        {isComplete && (
          <div className="gallery-complete-ribbon">
            <div className="ribbon-shimmer" />
            <div className="ribbon-particles">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="ribbon-spark" style={{
                  left: `${8 + i * 8}%`,
                  animationDelay: `${i * 0.2}s`,
                  width: Math.random() * 3 + 2,
                  height: Math.random() * 3 + 2,
                }} />
              ))}
            </div>
            <div className="ribbon-content">
              <Icon name="sparkles" size={20} color="var(--rarity-ur-1)" />
              <span className="ribbon-text">全图鉴已解锁</span>
              <Icon name="sparkles" size={20} color="var(--rarity-ur-1)" />
            </div>
          </div>
        )}

        {/* ========================================
            GALLERY HEADER — Starlight Portal
            ======================================== */}
        <div className="gallery-header">
          {/* Orbital rings */}
          <div className="portal-orbit portal-orbit-1">
            <div className="portal-node" />
          </div>
          <div className="portal-orbit portal-orbit-2">
            <div className="portal-node portal-node-2" />
          </div>
          <div className="portal-orbit portal-orbit-3">
            <div className="portal-node portal-node-3" />
          </div>
          {/* Center glow */}
          <div className="portal-glow" />
          {/* Title */}
          <div className="gallery-title-wrap">
            <h2 className="gallery-title">偶像图鉴</h2>
            <p className="gallery-subtitle">
              {isComplete ? '全图鉴已解锁！' : '收集所有偶像解锁全图鉴'}
            </p>
          </div>
          {/* Corner constellation dots */}
          <div className="portal-corner portal-corner-tl" />
          <div className="portal-corner portal-corner-tr" />
          <div className="portal-corner portal-corner-bl" />
          <div className="portal-corner portal-corner-br" />
        </div>

        {/* ========================================
            COLLECTION PROGRESS — Constellation Path
            ======================================== */}
        <div className={`gallery-progress-panel ${isComplete ? 'gallery-progress-complete' : ''}`}>
          {/* Constellation nodes for each rarity tier */}
          <div className="constellation-path">
            {RARITY_ORDER.map((r, i) => {
              const counts = rarityCounts[r]
              const isObtained = counts && counts.owned > 0
              return (
                <div key={r} className="constellation-node-wrap">
                  <div className={`constellation-node rarity-${r.toLowerCase()} ${isObtained ? 'obtained' : ''} ${i === RARITY_ORDER.indexOf(filter === 'all' ? 'N' : filter) ? 'active' : ''}`}>
                    <span className="cn-icon">{getRarityIcon(r)}</span>
                    <span className="cn-count">{counts ? `${counts.owned}/${counts.total}` : '0/0'}</span>
                  </div>
                  {i < RARITY_ORDER.length - 1 && (
                    <div className={`constellation-line ${isObtained ? 'obtained' : ''}`} />
                  )}
                </div>
              )
            })}
          </div>
          {/* Overall progress bar */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${completionRate}%` }}>
              <div className="progress-glow" />
            </div>
          </div>
          <div className="progress-meta">
            <span className="progress-label">
              {isComplete ? <><Icon name="sparkles" size={12} /> 已完成</> : '收集进度'}
            </span>
            <span className="progress-fraction">{obtainedChars} / {totalChars}</span>
            <span className="progress-percent">{completionRate}%</span>
          </div>
        </div>

        <div className="gallery-search-wrapper">
          <Icon name="search" size={16} className="gallery-search-icon" />
          <input
            className="gallery-search-input"
            type="text"
            placeholder="搜索偶像名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="gallery-search-clear" onClick={() => setSearchQuery('')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {recentlyObtained.length > 0 && !searchQuery && filter === 'all' && (
          <div className="gallery-recent-section">
            <div className="section-title">✦ 最近获得</div>
            <div className="recent-scroll-track">
              {recentlyObtained.map(uc => {
                const char = characters.find(c => (c.character_id || c.id) === (uc.character_id || uc.id))
                if (!char) return null
                const rarityColors: Record<string, string> = { N: '#a0a0a0', R: '#00ff88', SR: '#00ccff', SSR: '#ff00ff', UR: '#ffd700' }
                return (
                  <div key={uc.character_id || uc.id} className={`recent-card rarity-${char.rarity}`}>
                    <div className="recent-card-avatar" style={{ color: rarityColors[char.rarity] }}>★</div>
                    <div className="recent-card-name">{char.name}</div>
                    <div className="recent-card-rarity" style={{ color: rarityColors[char.rarity] }}>{char.rarity}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="gallery-filter-tabs">
          {RARITY_TABS.map(tab => {
            const key = tab === '全部' ? 'all' : tab
            const counts = rarityCounts[key] || { total: 0, owned: 0 }
            return (
              <button
                key={tab}
                className={`gallery-filter-tab ${filter === key ? 'active' : ''} ${tab !== '全部' ? `rarity-${tab.toLowerCase()}` : ''}`}
                onClick={() => setFilter(key)}
              >
                {tab !== '全部' && <span className="tab-icon">{getRarityIcon(tab)}</span>}
                {tab}
                <span className="tab-count">{counts.owned}/{counts.total}</span>
              </button>
            )
          })}
        </div>

        <div className="gallery-result-count">
          {filtered.length} 个偶像{searchQuery && ` 匹配 "${searchQuery}"`}
        </div>

        {loading ? (
          <Skeleton variant="card-grid" count={6} />
        ) : filtered.length === 0 ? (
          <div className="gallery-empty-state">
            <div className="gallery-empty-icon">
              <Icon name="search" size={32} />
            </div>
            <div className="gallery-empty-title">
              {searchQuery ? '未找到匹配的偶像' : '该稀有度暂无偶像'}
            </div>
            <div className="gallery-empty-text">
              {searchQuery ? '尝试搜索其他名称' : filter !== 'all' ? '去召唤试试获取更多' : '图鉴为空'}
            </div>
          </div>
        ) : (
          <div className="idol-grid">
            {filtered.map(char => {
              const obtained = ownedIds.has(char.character_id)
              const rarityColors: Record<string, string> = { N: '#a0a0a0', R: '#00ff88', SR: '#00ccff', SSR: '#ff00ff', UR: '#ffd700' }
              const rarityColor = rarityColors[char.rarity] || '#fff'
              const userChar = userChars.find(uc => (uc.character_id || uc.id) === char.character_id)
              return (
                <div
                  key={char.character_id}
                  className={`idol-card rarity-${char.rarity} ${!obtained ? 'idol-card-locked' : ''}`}
                  onClick={() => obtained && navigate('/inventory')}
                  style={{ cursor: obtained ? 'pointer' : 'default' }}
                >
                  <div className="idol-card-rarity" style={{ color: rarityColor, textShadow: `0 0 10px ${rarityColor}` }}>{char.rarity}</div>
                  {!obtained && (
                    <div className="idol-card-locked-overlay">
                      <Icon name="lock" size={24} />
                      <div className="lock-text">通过召唤获得</div>
                    </div>
                  )}
                  <div className="idol-card-avatar" style={{ color: rarityColor, textShadow: `0 0 20px ${rarityColor}` }}>
                    {obtained ? '★' : '✕'}
                  </div>
                  <div className="idol-card-name" style={{ color: obtained ? '#fff' : '#666' }}>{obtained ? char.name : '???'}</div>
                  <div className="idol-card-desc">{obtained ? char.description : '尚未获得此偶像'}</div>
                  {obtained && userChar && (
                    <div className="idol-card-extra">
                      <div className="idol-card-attr">{char.rarity}偶像</div>
                    </div>
                  )}
                  {obtained && <div className="idol-card-obtained-mark">已获得</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  const InventoryPage = () => {
    const [myChars, setMyChars] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [sort, setSort] = useState<string>('rarity')
    const [sortOpen, setSortOpen] = useState(false)
    const [animKey, setAnimKey] = useState(0)
    const sortBtnRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      fetch(`${API_BASE}/user/characters`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json()).then(d => { setMyChars(d); setLoading(false) }).catch((e) => { console.error('Failed to load characters:', e); setLoading(false) })
    }, [])

    const filtered = useMemo(() => {
      let list = filter === 'all' ? myChars : myChars.filter(c => c.rarity === filter)
      switch (sort) {
        case 'rarity': {
          const order = ['N', 'R', 'SR', 'SSR', 'UR']
          return [...list].sort((a, b) => order.indexOf(b.rarity) - order.indexOf(a.rarity))
        }
        case 'level':   return [...list].sort((a, b) => (b.level || 1) - (a.level || 1))
        case 'intimacy':return [...list].sort((a, b) => (b.intimacy_level || 1) - (a.intimacy_level || 1))
        case 'name':   return [...list].sort((a, b) => a.name.localeCompare(b.name))
        default: return list
      }
    }, [myChars, filter, sort])

    const rarityCounts = useMemo(() => {
      const counts: Record<string, number> = {}
      myChars.forEach(c => { counts[c.rarity] = (counts[c.rarity] || 0) + 1 })
      return counts
    }, [myChars])

    const [sortMenuStyle, setSortMenuStyle] = useState<React.CSSProperties>({})

    const stars = useMemo(() =>
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: `${(i * 41 + 13) % 100}%`,
        top: `${(i * 29 + 7) % 100}%`,
        size: Math.random() * 1.5 + 0.5,
        dur: (2 + (i % 4)).toFixed(1),
        delay: (i * 0.4 % 5).toFixed(1),
      })), [])

    const handleSortToggle = () => {
      setSortOpen(o => {
        if (!o) {
          const rect = sortBtnRef.current?.getBoundingClientRect()
          if (rect) {
            setSortMenuStyle({
              position: 'fixed',
              top: rect.bottom + 6,
              left: rect.left,
            })
          }
        }
        return !o
      })
    }

    const RARITY_TABS = ['all', 'N', 'R', 'SR', 'SSR', 'UR']
    const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR']

    const costMap: Record<string, number> = { 'N': 30, 'R': 20, 'SR': 10 }
    const getCost = (r: string) => costMap[r] || 0

    return (
      <div className="idol-page inventory-page">
        {/* Starfield background */}
        <div className="inventory-starfield">
          {stars.map(s => (
            <div key={s.id} className="inv-star" style={{
              left: s.left, top: s.top,
              width: s.size, height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }} />
          ))}
        </div>

        {/* Page header – tactical command console */}
        <div className="inventory-header">
          <div className="inventory-header-inner">
            {/* Left: glowing title */}
            <div className="inventory-title-block">
              <div className="scan-line" />
              <h2 className="inventory-title">我的背包</h2>
            </div>

            {/* Right: data panel */}
            <div className="inventory-data-panel">
              <div className="inventory-count-line">
                <span className="inventory-count-num">{myChars.length}</span>
                <span className="inventory-count-label">偶像收藏</span>
              </div>
              {Object.entries(rarityCounts).length > 0 && (
                <>
                  <div className="inventory-rarity-bar">
                    {RARITY_ORDER.filter(r => rarityCounts[r] > 0).map(r => (
                      <div
                        key={r}
                        className={`rarity-pip rarity-${r.toLowerCase()}`}
                        style={{ width: `${Math.max(4, Math.min(24, rarityCounts[r] * 4))}px` }}
                      />
                    ))}
                  </div>
                  <div className="inventory-rarity-row">
                    {RARITY_ORDER.filter(r => rarityCounts[r] > 0).map(r => (
                      <span key={r} className={`rarity-chip rarity-${r.toLowerCase()}`}>{r}×{rarityCounts[r]}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        {!loading && myChars.length > 0 && (
          <div className="inventory-tabs">
            {RARITY_TABS.map(tab => {
              const count = tab === 'all' ? myChars.length : (rarityCounts[tab] || 0)
              return (
                <button
                  key={tab}
                  className={`inv-tab ${filter === tab ? 'active' : ''} ${tab !== 'all' ? `rarity-${tab.toLowerCase()}` : ''}`}
                  onClick={() => { setFilter(tab); setAnimKey(k => k + 1) }}
                >
                  {tab === 'all' ? '全部' : tab}
                  {count > 0 && <span className="inv-tab-count">{count}</span>}
                </button>
              )
            })}
            <div className="inv-tab-spacer" />
            {/* Sort dropdown */}
            <div className="inv-sort-dropdown">
              <button className="inv-sort-trigger" ref={sortBtnRef} onClick={handleSortToggle}>
                <Icon name="arrowDown" size={12} />
                <span>{sort === 'rarity' ? '稀有度' : sort === 'level' ? '等级' : sort === 'intimacy' ? '亲密度' : '名称'}</span>
              </button>
              {sortOpen && (
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
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Skeleton variant="card-grid" count={8} />
        ) : myChars.length === 0 ? (
          <div className="inventory-empty">
            <div className="inv-empty-icon">🌟</div>
            <div className="inv-empty-title">星光收藏夹是空的</div>
            <div className="inv-empty-desc">还没有收集到任何偶像，快去召唤吧！</div>
            <button className="btn btn-primary" onClick={() => navigate('/gacha')}>前往召唤</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="inventory-empty">
            <div className="inv-empty-icon">🔍</div>
            <div className="inv-empty-title">没有符合条件的偶像</div>
            <div className="inv-empty-desc">试试切换筛选条件</div>
          </div>
        ) : (
          <div className="idol-grid inventory-grid" key={animKey}>
            {filtered.map((char, i) => {
              const cost = getCost(char.rarity)
              const canSynth = ['N', 'R', 'SR'].includes(char.rarity) && char.fragment_count >= cost
              const isHighRarity = char.rarity === 'SSR' || char.rarity === 'UR'
              return (
                <div
                  key={char.id}
                  className={`idol-card rarity-${char.rarity} ${canSynth ? 'can-synth' : ''} ${isHighRarity ? 'high-rarity' : ''} card-enter`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => navigate(`/detail/${char.id}`)}
                >
                  <div className="idol-card-rarity">{char.rarity}</div>
                  {canSynth && <div className="idol-card-synth-badge">可合成</div>}
                  <div className="idol-card-avatar">{char.rarity === 'SSR' || char.rarity === 'UR' ? '💎' : '🌟'}</div>
                  <div className="idol-card-name">{char.name}</div>

                  {/* Fragment progress bar — only for synthable */}
                  {['N', 'R', 'SR'].includes(char.rarity) && (
                    <div className="inv-frag-bar">
                      <div className="inv-frag-bar-track">
                        <div className="inv-frag-bar-fill" style={{ width: `${Math.min(100, (char.fragment_count / cost) * 100)}%` }} />
                      </div>
                      <div className="inv-frag-bar-text">{char.fragment_count}/{cost}</div>
                    </div>
                  )}

                  <div className="idol-card-stats">
                    <div className="idol-card-stat">
                      <Icon name="gem" size={12} color="var(--currency-stone)" />
                      <span>{char.fragment_count}</span>
                    </div>
                    <div className="idol-card-stat">
                      <Icon name="heart" size={12} color="#ff6b9d" />
                      <span>Lv.{char.intimacy_level}</span>
                    </div>
                    <div className="idol-card-stat">
                      <Icon name="star" size={12} color="#fbbf24" />
                      <span>Lv.{char.level || 1}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null)

  const CharacterDetailPage = () => {
    const [charData, setCharData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showAvatarPopup, setShowAvatarPopup] = useState(false)
    const [avatarAnimClass, setAvatarAnimClass] = useState('')
    const [justUnlockedMilestone, setJustUnlockedMilestone] = useState<number | null>(null)
    const [showStoryModal, setShowStoryModal] = useState(false)
    const [currentStory, setCurrentStory] = useState<any>(null)
    const [showOutfitModal, setShowOutfitModal] = useState(false)
    const [outfitList, setOutfitList] = useState<any[]>([])
    const [loadingOutfits, setLoadingOutfits] = useState(false)
    const prevIntimacyRef = useRef<number>(1)

    // TTS helper — use Edge TTS API for natural-sounding Chinese voice
    const speakLine = async (text: string, lang: string = 'zh-CN') => {
      try {
        const res = await fetch(`${API_BASE}/tts/speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, lang }),
        })
        if (!res.ok) return
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
        audio.onended = () => URL.revokeObjectURL(url)
      } catch (e) {
        // fallback to browser TTS
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
          const utter = new SpeechSynthesisUtterance(text)
          utter.lang = lang
          utter.rate = lang === 'ja-JP' ? 1.1 : 1.0
          window.speechSynthesis.speak(utter)
        }
      }
    }

    // Trigger avatar CSS animation
    const triggerAvatarAnim = (trigger: string) => {
      setAvatarAnimClass('')
      requestAnimationFrame(() => {
        setAvatarAnimClass(`anim-${trigger}`)
        setTimeout(() => setAvatarAnimClass(''), 1000)
      })
    }

    const { charId } = useParams<{ charId: string }>()

    const refreshCharData = () => {
      fetch(`${API_BASE}/cultivation/characters/${charId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => setCharData(d)).catch((e) => { console.error('Failed to refresh char data:', e) })
    }

    useEffect(() => {
      if (!charId) return
      fetch(`${API_BASE}/cultivation/characters/${charId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setCharData(d)
        setLoading(false)
        // Detect intimacy milestone crossing
        const newLevel = d?.intimacy_level || 1
        const prevLevel = prevIntimacyRef.current
        if (newLevel > prevLevel) {
          const crossedMilestones = [2, 5, 8, 10].filter(m => m > prevLevel && m <= newLevel)
          if (crossedMilestones.length > 0) {
            setJustUnlockedMilestone(crossedMilestones[crossedMilestones.length - 1])
            setTimeout(() => setJustUnlockedMilestone(null), 1200)
          }
        }
        prevIntimacyRef.current = newLevel
      }).catch((e) => { console.error(e); setLoading(false) })
    }, [charId])

    const handleLevelUp = async () => {
      try {
        const res = await fetch(`${API_BASE}/cultivation/characters/${charId}/level-up`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        audio.playLevelUp()
        refreshCharData()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleQuickLevelUp = async () => {
      try {
        const res = await fetch(`${API_BASE}/cultivation/characters/${charId}/quick-level-up`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        audio.playLevelUp()
        refreshCharData()
        addToast(`快速升级成功，消耗 ${data.holyStoneUsed} 圣像石`, 'success')
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleIntimacyUp = async () => {
      try {
        const res = await fetch(`${API_BASE}/cultivation/characters/${charId}/intimacy-up`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        audio.playLevelUp()
        refreshCharData()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const synthesisCostMap: Record<string, number> = { 'N': 30, 'R': 20, 'SR': 10 }
    const synthesisCost = charData?.character_id ? (synthesisCostMap[charData.rarity] || 0) : 0
    const canSynthesize = charData && ['N', 'R', 'SR'].includes(charData.rarity) && charData.fragment_count >= synthesisCost

    const handleSynthesis = async () => {
      if (!canSynthesize) return
      try {
        const res = await fetch(`${API_BASE}/user/characters/${charData.character_id}/synthesis`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCharData({ ...charData, fragment_count: charData.fragment_count - synthesisCost + 1 })
        audio.playLevelUp()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const fetchOutfits = async () => {
      setLoadingOutfits(true)
      try {
        const res = await fetch(`${API_BASE}/outfits/${charData.character_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOutfitList(data.outfits || [])
      } catch (err: any) {
        addToast(err.message, 'error')
        setOutfitList([])
      } finally {
        setLoadingOutfits(false)
      }
    }

    const handleEquipOutfit = async (outfitId: number) => {
      try {
        const res = await fetch(`${API_BASE}/user/outfits/${outfitId}/equip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ characterId: charData.character_id })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCharData({ ...charData, equipped_outfit: outfitList.find((o: any) => o.id === outfitId) })
        refreshCharData()
        addToast('服装已装备', 'success')
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleUnequipOutfit = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/outfits/${charData.character_id}/unequip`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCharData({ ...charData, equipped_outfit: null })
        refreshCharData()
        addToast('服装已卸下', 'success')
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const rarityColorMap: Record<string, string> = { 'N': '#a0a0a0', 'R': '#00ff88', 'SR': '#00ccff', 'SSR': '#ff00ff', 'UR': '#ffd700' }
    const rarityRgbMap: Record<string, string> = { 'N': '160,160,160', 'R': '0,255,136', 'SR': '0,204,255', 'SSR': '255,0,255', 'UR': '255,215,0' }

    if (loading) return (
      <div className="char-detail-page">
        <h2 className="page-title">角色详情</h2>
        <div className="char-detail-hero" style={{ alignItems: 'center', paddingTop: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            <Skeleton variant="circular" width={120} height={120} />
            <Skeleton variant="text" width={160} height={32} />
            <Skeleton variant="text" width={240} height={20} />
            <div style={{ width: '100%', maxWidth: 400, marginTop: 8 }}>
              <Skeleton variant="text" width="100%" height={12} />
            </div>
          </div>
        </div>
        <div className="cult-section" style={{ marginTop: 24 }}>
          <Skeleton variant="text" count={4} />
        </div>
      </div>
    )

    const expPercent = charData?.exp_for_next_level
      ? ((charData.exp - charData.exp_for_current_level) / (charData.exp_for_next_level - charData.exp_for_current_level)) * 100
      : 100

    const rarity = charData?.rarity || 'SR'
    const cssVars = {
      '--char-rarity-color': rarityColorMap[rarity],
      '--char-rarity-rgb': rarityRgbMap[rarity]
    } as React.CSSProperties

    return (
      <div className="char-detail-page" style={cssVars}>
        <h2 className="page-title">角色详情</h2>

        <div className="char-detail-hero">
          <div className="char-detail-glow" />
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
          <div className="scanline" />
          {[1,2,3,4,5].map(i => <div key={i} className="particle" />)}
          <div className={`char-detail-avatar-frame idle ${avatarAnimClass}`} onClick={() => setShowAvatarPopup(true)} style={{ cursor: 'pointer' }}>
            <div className="char-detail-avatar-ring" />
            <img
              className="char-detail-avatar"
              src={charData?.image_path ? charData.image_path : undefined}
              alt={charData?.name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
            />
            <div className="char-detail-avatar-fallback hidden">{charData?.name?.charAt(0) || '?'}</div>
            <div className="avatar-zoom-hint">🔍</div>
          </div>
          <div className="char-detail-badge">{charData?.rarity}</div>
          <div className="char-detail-name">{charData?.name}</div>
          <div className="char-detail-desc">{charData?.description}</div>
        </div>

        <div className="cult-section">
          <div className="cult-section-title">✦ 角色培养</div>

          <div className="exp-row">
            <div className="exp-label">
              <span className="lv-tag">LV</span>.{charData?.level}
              {charData?.level >= 80 && <span className="max-level-badge">MAX</span>}
            </div>
            <div className="exp-value">{charData?.exp} / {charData?.exp_for_next_level || 'MAX'}</div>
          </div>
          <div className="neon-progress">
            <div className="neon-progress-fill" style={{ width: `${expPercent}%` }} />
          </div>

          <div className="fragment-row">
            <span className="fragment-label"><Icon name="gem" size={14} color="var(--currency-stone)" /> 我的碎片</span>
            <span className={`fragment-count ${charData?.fragment_count >= (charData?.fragments_needed || 0) ? 'sufficient' : 'insufficient'}`}>
              {charData?.fragment_count}
            </span>
          </div>
          {charData?.level < 80 && (
            <div className={`fragment-hint ${charData?.fragment_count >= (charData?.fragments_needed || 0) ? 'ok' : 'short'}`}>
              {charData?.fragment_count >= (charData?.fragments_needed || 0)
                ? `✓ 碎片足够  消耗 ${charData?.fragments_needed} 碎片升级`
                : `还差 ${(charData?.fragments_needed || 0) - charData?.fragment_count} 碎片`}
            </div>
          )}

          <div className="cult-section-row">
            <div className="intimacy-row">
              <div className="intimacy-label">
                <span className="heart-icon">❤</span> 亲密度 {charData?.intimacy_level}/10
                {charData?.intimacy_level >= 10 && <span className="max-intimacy-badge">MAX</span>}
              </div>
              <button
                className={`intimacy-btn ${charData?.can_intimacy_up ? 'available' : 'locked'}`}
                onClick={handleIntimacyUp}
                disabled={!charData?.can_intimacy_up}
              >
                {charData?.intimacy_level >= 10 ? '已满' : charData?.can_intimacy_up ? '+提升 (免费)' : '明日再来'}
              </button>
            </div>
            <div className={`intimacy-hearts ${charData?.intimacy_level >= 10 ? 'maxed' : ''}`}>
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className={`intimacy-heart ${i <= (charData?.intimacy_level || 0) ? 'filled' : 'empty'}`} />
              ))}
            </div>
          </div>

          <div className="cult-section-row">
            <button
              className={`levelup-btn ${charData?.level >= 80 ? 'maxed' : charData?.fragment_count >= (charData?.fragments_needed || 0) ? 'ready' : 'disabled-btn'}`}
              onClick={handleLevelUp}
              disabled={charData?.level >= 80 || charData?.fragment_count < (charData?.fragments_needed || 0)}
            >
              {charData?.level >= 80 ? <><Icon name="star" size={14} color="var(--rarity-ur-1)" /> 已满级 <Icon name="star" size={14} color="var(--rarity-ur-1)" /></> : `升级  消耗 ${charData?.fragments_needed || 0} 碎片`}
            </button>
            {charData?.level < 80 && charData?.fragment_count < (charData?.fragments_needed || 0) && (
              <button
                className="quick-levelup-btn"
                onClick={handleQuickLevelUp}
              >
                ⚡ 快速升级 (3 圣像石)
              </button>
            )}
          </div>

          {canSynthesize && (
            <div className="cult-section-row synthesis-row">
              <div className="synthesis-hint"><Icon name="gem" size={14} color="var(--currency-stone)" /> 碎片足够，可进行合成</div>
              <button className="synthesis-btn" onClick={handleSynthesis}>
                合成  消耗 {synthesisCost} 碎片
              </button>
            </div>
          )}

          {(charData?.total_outfits > 0) && (
            <button
              className="outfit-section-btn"
              onClick={() => { fetchOutfits(); setShowOutfitModal(true); }}
            >
              <Icon name="sparkles" size={14} color="var(--accent-pink-solid)" />
              <span>查看服装 {charData?.equipped_outfit ? '(已装备)' : ''}</span>
            </button>
          )}
        </div>

        <div className="cult-section">
          <div className="cult-section-title">✦ 已解锁内容</div>
          {(charData?.voice_lines || []).map((vl: any) => {
            const isUnlocked = (charData?.intimacy_level || 1) >= vl.milestone
            const isJustUnlocked = justUnlockedMilestone === vl.milestone
            if (vl.category === 'story') {
              return (
                <div
                  key={vl.milestone}
                  className={`unlock-item ${isUnlocked ? 'unlocked' : 'locked'} ${isJustUnlocked ? 'just-unlocked' : ''}`}
                  onClick={() => {
                    if (!isUnlocked) return
                    setCurrentStory(vl)
                    setShowStoryModal(true)
                  }}
                >
                  <span className="unlock-icon">
                    {isUnlocked ? <Icon name="book" size={14} /> : <Icon name="lock" size={14} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="unlock-label">角色故事</div>
                    {isUnlocked && <span className="unlock-voice-lines">{vl.title}</span>}
                  </div>
                  {!isUnlocked && (
                    <span className="unlock-progress-hint">
                      Lv.{vl.milestone}解锁 (还差{vl.milestone - (charData?.intimacy_level || 1)}级)
                    </span>
                  )}
                </div>
              )
            }
            return (
              <div
                key={vl.milestone}
                className={`unlock-item ${isUnlocked ? 'unlocked' : 'locked'} ${isJustUnlocked ? 'just-unlocked' : ''}`}
                onClick={() => {
                  if (!isUnlocked) return
                  if (vl.category === 'voice' || vl.category === 'voice_full') {
                    const line = vl.lines[Math.floor(Math.random() * vl.lines.length)]
                    speakLine(line)
                  } else if (vl.category === 'action') {
                    triggerAvatarAnim(vl.trigger)
                  }
                }}
              >
                <span className="unlock-icon">
                  {isUnlocked ? (vl.category === 'voice' || vl.category === 'voice_full' ? <Icon name="music" size={14} /> : vl.category === 'action' ? <Icon name="sparkles" size={14} /> : <Icon name="book" size={14} />) : <Icon name="lock" size={14} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="unlock-label">
                    {vl.category === 'voice' ? '基础语音' :
                     vl.category === 'voice_full' ? '完整语音' :
                     vl.category === 'action' ? '互动动作' : vl.title}
                  </div>
                  {isUnlocked && vl.lines && vl.category !== 'action' && (
                    <span className="unlock-voice-lines">
                      {vl.lines[0]}
                    </span>
                  )}
                  {isUnlocked && vl.category === 'action' && (
                    <span className="unlock-action-hint">
                      点击触发{vl.trigger === 'shake' ? '摇摆' : vl.trigger === 'blush' ? '害羞' : '挥手'}动画
                    </span>
                  )}
                </div>
                {!isUnlocked && (
                  <span className="unlock-progress-hint">
                    Lv.{vl.milestone}解锁 (还差{vl.milestone - (charData?.intimacy_level || 1)}级)
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Floating mini avatar - always visible for action feedback */}
        {avatarAnimClass && (
          <div className="floating-mini-avatar">
            <img
              src={charData?.image_path ? charData.image_path : undefined}
              alt={charData?.name}
              className={`floating-mini-img ${avatarAnimClass}`}
            />
          </div>
        )}

        <div className="cult-section">
          <div className="cult-section-title">✦ 应援留言板</div>
          <MessageBoard charId={charData?.character_id} token={token} />
        </div>

        {showAvatarPopup && (
          <div className="avatar-popup-overlay" onClick={() => setShowAvatarPopup(false)}>
            <div className="avatar-popup-content" onClick={(e) => e.stopPropagation()}>
              <button className="avatar-popup-close" onClick={() => setShowAvatarPopup(false)}>×</button>
              <img
                className="avatar-popup-image"
                src={charData?.image_path ? charData.image_path : undefined}
                alt={charData?.name}
              />
              <div className="avatar-popup-name">{charData?.name}</div>
              <div className="avatar-popup-rarity">{charData?.rarity}</div>
            </div>
          </div>
        )}

        {showStoryModal && currentStory && (
          <div className="story-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowStoryModal(false)}>
            <div className="story-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="story-modal-close" onClick={() => setShowStoryModal(false)}>×</button>
              <div className="story-modal-header">
                <div className="story-modal-chapter">Chapter {currentStory.milestone}</div>
                <div className="story-modal-title">{currentStory.title}</div>
              </div>
              <div className="story-modal-divider" />
              <div className="story-modal-body">
                {currentStory.content.split('\n').map((paragraph: string, idx: number) => (
                  paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                ))}
              </div>
              <div className="story-modal-footer">
                <span className="story-modal-hint">与 {charData?.name} 的亲密度达到 {currentStory.milestone} 级时解锁</span>
              </div>
            </div>
          </div>
        )}

        {showOutfitModal && (
          <div className="outfit-overlay" onClick={() => setShowOutfitModal(false)}>
            <div className="outfit-modal-v2" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>✦ 角色服装</h3>
                <button className="modal-close" onClick={() => setShowOutfitModal(false)}>×</button>
              </div>

              {loadingOutfits ? (
                <div style={{ padding: '40px 28px' }}>
                  <Skeleton variant="card-grid" count={4} />
                </div>
              ) : (
                <div className="outfit-grid-v2">
                  {outfitList.map((outfit: any) => {
                    const isEquipped = charData?.equipped_outfit?.id === outfit.id
                    return (
                      <div
                        key={outfit.id}
                        className={`outfit-card-v2 ${outfit.is_default ? 'rarity-N' : `rarity-${outfit.rarity}`} ${!outfit.owned ? 'locked' : ''} ${isEquipped ? 'equipped' : ''}`}
                        onClick={() => {
                          if (!outfit.owned) {
                            addToast('未拥有该服装', 'error')
                            return
                          }
                          if (isEquipped) {
                            handleUnequipOutfit()
                          } else {
                            handleEquipOutfit(outfit.id)
                          }
                        }}
                      >
                        {isEquipped && <div className="equipped-badge">已装备</div>}
                        <div className="outfit-card-image">
                          {outfit.image_path ? (
                            <img src={outfit.image_path} alt={outfit.name} />
                          ) : (
                            <div className="outfit-card-placeholder">👗</div>
                          )}
                        </div>
                        <div className="outfit-card-name">{outfit.name}</div>
                        <div className="outfit-card-rarity">{outfit.rarity}</div>
                        {!outfit.owned && <div className="outfit-locked-overlay">🔒</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {outfitList.length === 0 && !loadingOutfits && (
                <div style={{ padding: '40px 28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  暂无服装数据
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const MessageBoard = ({ charId, token }: { charId: string; token: string }) => {
    const [msgs, setMsgs] = useState<any[]>([])
    const [canPost, setCanPost] = useState(false)
    const [input, setInput] = useState('')
    const [posting, setPosting] = useState(false)
    const [loading, setLoading] = useState(true)

    const loadMessages = useCallback(() => {
      if (!charId) return
      fetch(`${API_BASE}/support/board/${charId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setMsgs(d.messages || [])
        setCanPost(d.can_post !== false)
        setLoading(false)
      }).catch((e) => { console.error('Failed to load messages:', e); setLoading(false) })
    }, [charId, token])

    useEffect(() => { loadMessages() }, [loadMessages])

    const handlePost = async () => {
      if (!input.trim() || posting) return
      setPosting(true)
      try {
        const res = await fetch(`${API_BASE}/support/board/${charId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input.trim() })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        audio.playUIClick()
        setInput('')
        loadMessages()
        setCanPost(false)
      } catch (err: any) {
        alert(err.message)
      } finally {
        setPosting(false)
      }
    }

    const handleDelete = async (msgId: number) => {
      try {
        await fetch(`${API_BASE}/support/board/${charId}/${msgId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        audio.playUIClick()
        loadMessages()
        setCanPost(true)
      } catch {}
    }

    if (loading) return <div className="msg-board-loading"><Skeleton variant="list" count={5} /></div>

    return (
      <div className="msg-board">
        {canPost ? (
          <div className="msg-input-container">
            <div className="msg-input-wrapper">
              <input
                className="msg-input"
                placeholder="写下你的应援留言..."
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 50))}
                onKeyDown={e => e.key === 'Enter' && handlePost()}
                maxLength={50}
              />
              <span className="msg-char-count" style={{ color: input.length >= 45 ? '#ff6b9d' : undefined }}>{input.length}/50</span>
              <button className="msg-post-btn" onClick={handlePost} disabled={posting || !input.trim()}>
                {posting ? '···' : '应援'}
              </button>
            </div>
          </div>
        ) : (
          <div className="msg-cooldown">今日已留言</div>
        )}
        <div className="msg-list">
          {msgs.length === 0 ? (
            <div className="msg-empty">还没有留言，快来写第一条吧！</div>
          ) : msgs.map(m => (
            <div key={m.id} className={`msg-item ${m.is_mine ? 'mine' : ''}`}>
              <div className="msg-header">
                <span className="msg-user">{m.username}</span>
                <span className="msg-time">{new Date(m.created_at).toLocaleDateString()}</span>
                {m.is_mine && (
                  <button className="msg-del-btn" onClick={() => handleDelete(m.id)}>×</button>
                )}
              </div>
              <div className="msg-text">{m.message}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SupportHallPage = () => {
    const [hallData, setHallData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showSelect, setShowSelect] = useState<number | null>(null)
    const [slotContextIdx, setSlotContextIdx] = useState<number | null>(null)
    const [modalSearch, setModalSearch] = useState('')
    const [collecting, setCollecting] = useState(false)
    const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR']
    const collectingRef = React.useRef(false)

    const fetchHall = () => {
      fetch(`${API_BASE}/cultivation/support`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => {
        setHallData(d)
        setLoading(false)
      }).catch((e) => { console.error('Failed to load hall data:', e); setLoading(false) })
    }

    useEffect(() => { fetchHall() }, [])

    // ESC to close select modal
    useEffect(() => {
      if (showSelect === null) return
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSelect(null) }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [showSelect])

    // Clear modal search when modal closes
    useEffect(() => {
      if (showSelect !== null) setModalSearch('')
    }, [showSelect])

    const handleSlotClick = (index: number) => {
      const slot = hallData?.slots?.[index]
      const allSlots = hallData?.slots || []
      const occupiedCount = allSlots.filter((s: any) => s.character_id).length
      if (slot?.character_id) {
        // Occupied: toggle remove context menu
        setSlotContextIdx(prev => prev === index ? null : index)
        setShowSelect(null)
      } else {
        // Empty: check if hall is full
        if (occupiedCount >= 8) {
          addToast('应援殿已满（8/8），请先移除一位偶像', 'error')
          return
        }
        // Open selection modal
        setShowSelect(index)
        setSlotContextIdx(null)
      }
    }

    const handleRemoveCharacter = async (index: number) => {
      await handleSelectCharacter(index, null)
      setSlotContextIdx(null)
    }

    const handleSelectCharacter = async (slotIndex: number, characterId: string | null) => {
      try {
        const res = await fetch(`${API_BASE}/cultivation/support/slot/${slotIndex}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_id: characterId })
        })
        if (!res.ok) throw new Error('设置失败')
        setShowSelect(null)
        fetchHall()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleCollect = async () => {
      if (collectingRef.current) return
      const totalPending = hallData?.pending_output?.reduce((sum: number, p: any) => sum + p.pending, 0) || 0
      if (totalPending <= 0) return
      collectingRef.current = true
      setCollecting(true)
      try {
        const res = await fetch(`${API_BASE}/cultivation/support/collect`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        fetchHall()
      } catch (err: any) { addToast(err.message, 'error') } finally {
        collectingRef.current = false
        setCollecting(false)
      }
    }

    if (loading) return <div className="idol-page support-hall"><Skeleton variant="card-grid" count={3} /></div>

    const totalPending = hallData?.pending_output?.reduce((sum: number, p: any) => sum + p.pending, 0) || 0

    return (
      <>
      <div className="idol-page support-hall">
        {/* Floating particles background */}
        <div className="hall-particles">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="hall-particle" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>

        <div className="support-hall-header">
          <div className="hall-title-frame">
            <div className="hall-title-corner htc-tl" />
            <div className="hall-title-corner htc-tr" />
            <div className="hall-title-corner htc-bl" />
            <div className="hall-title-corner htc-br" />
            <h2 className="support-hall-title">应援殿</h2>
            <p className="support-hall-subtitle">放置偶像以产生圣像石</p>
          </div>
        </div>

        {/* Energy balance display */}
        <div className="hall-balance-bar">
          <div className="hall-balance-item">
            <Icon name="gem" size={18} color="var(--currency-stone)" />
            <span className="hall-balance-label">圣像石</span>
            <span className="hall-balance-value">{hallData?.holy_stones || 0}</span>
          </div>
          <div className="hall-balance-divider" />
          <div className="hall-balance-item">
            <Icon name="stamina" size={18} color="#ffd700" />
            <span className="hall-balance-label">待收取</span>
            <span className="hall-balance-value highlight">{totalPending}</span>
          </div>
        </div>

        {/* Empty state — all slots vacant */}
        {hallData?.slots?.every((s: any) => !s.character_id) && !loading && (
          <div className="empty-state">
            <div className="empty-icon">🏛️</div>
            <div className="empty-title">应援殿空无一物</div>
            <div className="empty-desc">点击空槽位，放置你的第一位偶像</div>
          </div>
        )}

        <div className="hall-slots-grid">
          {hallData?.slots?.map((slot: any, idx: number) => (
            <div
              key={idx}
              className={`energy-slot ${slot.character_id ? 'rarity-' + slot.rarity : 'empty'}`}
              onClick={() => handleSlotClick(idx)}
            >
              {/* Corner brackets for holographic effect */}
              <div className="slot-corner sc-tl" />
              <div className="slot-corner sc-tr" />
              <div className="slot-corner sc-bl" />
              <div className="slot-corner sc-br" />

              <div className="slot-inner">
                {slot.character_id ? (
                  <>
                    <div className="char-rarity-badge">{slot.rarity}</div>
                    <div className="slot-gauge-wrapper" style={{ '--gauge-percent': `${Math.min(100, ((hallData.pending_output[idx]?.pending || 0) / 100) * 100)}%` } as React.CSSProperties}>
                      <div className="slot-gauge-bg" />
                      <div className="slot-gauge-fill" />
                      <div className="slot-gauge-inner">
                        <span className="slot-gauge-value">{hallData.pending_output[idx]?.pending || 0}</span>
                        <span className="slot-gauge-label">待收</span>
                      </div>
                      {(hallData.pending_output[idx]?.pending || 0) >= 100 && <div className="slot-ready-pulse" />}
                    </div>
                    <p className="slot-char-name">{slot.character_name}</p>
                    <div className="slot-glow-effect" />
                    {/* Remove button at bottom */}
                    <button
                      className="slot-unlink-btn"
                      onClick={e => { e.stopPropagation(); handleRemoveCharacter(idx) }}
                      aria-label="移除偶像"
                    >
                      <svg className="unlink-icon" viewBox="0 0 24 24" fill="none">
                        <path className="unlink-chain" d="M10 6H6a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <path className="unlink-chain" d="M14 18h4a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <line className="unlink-slash" x1="9" y1="15" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="unlink-label">解除入驻</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="slot-holo-ring">
                      <div className="slot-plus-icon">+</div>
                    </div>
                    <p className="slot-plus-label">放置偶像</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {showSelect !== null && (
          <div className="support-modal-overlay" role="dialog" aria-modal="true" aria-label="选择偶像" onClick={(e) => e.target === e.currentTarget && setShowSelect(null)}>
            <div className="support-modal" onClick={e => e.stopPropagation()}>
              {/* Corner brackets */}
              <div className="sm-corner sm-corner-tl" />
              <div className="sm-corner sm-corner-tr" />
              <div className="sm-corner sm-corner-bl" />
              <div className="sm-corner sm-corner-br" />

              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="sm-particle" style={{
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.4}s`,
                  background: ['#00ffff', '#ff00ff', '#ffd700', '#00ff88', '#ff6b9d', '#00ccff'][i]
                }} />
              ))}

              <div className="sm-header">
                <span className="sm-lock-icon"><Icon name="sparkles" size={16} /></span>
                <div className="sm-title">选择偶像入驻</div>
              </div>

              <div className="sm-body">
                {/* Slot count */}
                <div className="sm-balance">
                  <span>拥有偶像</span>
                  <span className="sm-balance-value">
                    <Icon name="mic" size={14} />
                    {hallData?.user_characters?.length || 0}
                  </span>
                </div>

                {/* Search input */}
                <div className="sm-search-wrapper">
                  <Icon name="search" size={14} color="rgba(255,255,255,0.3)" />
                  <input
                    type="text"
                    className="sm-search-input"
                    placeholder="搜索偶像名称..."
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Character list grouped by rarity */}
                <div className="support-modal-grid">
                  {RARITY_ORDER.map(rarity => {
                    const allChars = (hallData?.user_characters || []).filter((c: any) => c.rarity === rarity)
                    const chars = modalSearch.trim()
                      ? allChars.filter((c: any) => c.name.toLowerCase().includes(modalSearch.trim().toLowerCase()))
                      : allChars
                    if (chars.length === 0) return null
                    return (
                      <div key={rarity} className="sm-rarity-group">
                        {!modalSearch.trim() && <div className={`sm-rarity-label rarity-${rarity.toLowerCase()}`}>{rarity}</div>}
                        {chars.map((char: any) => {
                          const isPlaced = (hallData?.slots || []).some((s: any) => s.character_id === char.character_id)
                          return (
                            <div
                              key={char.id}
                              className={`support-char-item rarity-${char.rarity} ${isPlaced ? 'already-placed' : ''}`}
                              onClick={() => !isPlaced && handleSelectCharacter(showSelect, char.character_id)}
                            >
                              <div className="support-char-info">
                                <div className="char-rarity-badge">{char.rarity}</div>
                                <span className="support-char-name">{char.name}</span>
                                {isPlaced && <span className="support-placed-badge">已入驻</span>}
                              </div>
                              {!isPlaced && <div className="char-enter-arrow">→</div>}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {modalSearch.trim() && RARITY_ORDER.every(r =>
                    !(hallData?.user_characters || []).filter((c: any) => c.rarity === r)
                      .some((c: any) => c.name.toLowerCase().includes(modalSearch.trim().toLowerCase()))
                  ) && (
                    <div className="sm-no-results">未找到 "{modalSearch}"</div>
                  )}
                </div>

                <div className="sm-modal-footer">
                  <button className="sm-cancel-btn" onClick={() => setShowSelect(null)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalPending > 0 && (
        <div className="collect-area">
          <button
            className="collect-btn"
            onClick={handleCollect}
            disabled={collecting}
          >
            <span className="collect-btn-inner">
              {collecting ? '收取中...' : <><Icon name="gem" size={14} color="var(--currency-stone)" /> 收取全部 (+{totalPending})</>}
            </span>
          </button>
        </div>
      )}

      </>
    )
  }

  const FriendsPage = () => {
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')
    const [friends, setFriends] = useState<any[]>([])
    const [requests, setRequests] = useState<{ received: any[], sent: any[] }>({ received: [], sent: [] })
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchPage, setSearchPage] = useState(1)
    const [searchTotalPages, setSearchTotalPages] = useState(1)
    const [staminaStatus, setStaminaStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showSearchDropdown, setShowSearchDropdown] = useState(false)
    const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)
    const [searching, setSearching] = useState(false)
    const [bannerHiding, setBannerHiding] = useState(false)
    const [activeResultIndex, setActiveResultIndex] = useState(-1)
    const [pendingAction, setPendingAction] = useState<number | null>(null)
    const [sendingRequestId, setSendingRequestId] = useState<number | null>(null)
    const [receivedCollapsed, setReceivedCollapsed] = useState(false)
    const [sentCollapsed, setSentCollapsed] = useState(false)
    const [prevSentToday, setPrevSentToday] = useState(staminaStatus?.sent_today || 0)
    const [staminaFlip, setStaminaFlip] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const debouncedQuery = useDebounce(searchQuery, 300)

    const fetchFriends = () => {
      return fetch(`${API_BASE}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(setFriends).catch((e) => { console.error('Failed to fetch friends:', e) })
    }

    const fetchRequests = () => {
      return fetch(`${API_BASE}/friends/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(setRequests).catch((e) => { console.error('Failed to fetch friend requests:', e) })
    }

    const fetchStaminaStatus = () => {
      return fetch(`${API_BASE}/friends/stamina-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(setStaminaStatus).catch((e) => { console.error('Failed to fetch stamina status:', e) })
    }

    const formatRelativeTime = (dateStr: string) => {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }

    useEffect(() => {
      setLoading(true)
      Promise.all([fetchFriends(), fetchRequests(), fetchStaminaStatus()]).finally(() => setLoading(false))
    }, [])

    // Close search dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
          setShowSearchDropdown(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset page when query changes
    useEffect(() => {
      setSearchPage(1)
    }, [debouncedQuery])

    // Debounced search
    useEffect(() => {
      const doSearch = async () => {
        if (debouncedQuery.length < 2) {
          setSearchResults([])
          setShowSearchDropdown(false)
          setSearching(false)
          return
        }
        setSearching(true)
        try {
          const res = await fetch(`${API_BASE}/friends/search?q=${encodeURIComponent(debouncedQuery)}&page=${searchPage}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          setSearchResults(data.users || [])
          setSearchTotalPages(data.pages || 1)
          setShowSearchDropdown(true)
          setActiveResultIndex(-1)
        } catch {}
        setSearching(false)
      }
      doSearch()
    }, [debouncedQuery, token, searchPage])

    const handleSendRequest = async (toUserId: number) => {
      if (sendingRequestId !== null) return
      setSendingRequestId(toUserId)
      try {
        const res = await fetch(`${API_BASE}/friends/requests`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast('好友申请已发送', 'success')
        setSearchResults([])
        setSearchQuery('')
        setShowSearchDropdown(false)
        setActiveResultIndex(-1)
        fetchRequests()
        audio.playModalOpen()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setSendingRequestId(null) }
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSearchDropdown || searchResults.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveResultIndex(i => Math.min(i + 1, searchResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveResultIndex(i => Math.max(i - 1, -1))
      } else if (e.key === 'Enter' && activeResultIndex >= 0) {
        e.preventDefault()
        handleSendRequest(searchResults[activeResultIndex].id)
      } else if (e.key === 'Escape') {
        setShowSearchDropdown(false)
        setActiveResultIndex(-1)
      }
    }

    const handleAccept = async (requestId: number) => {
      setPendingAction(requestId)
      try {
        const res = await fetch(`${API_BASE}/friends/requests/${requestId}/accept`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast('已接受好友申请', 'success')
        fetchFriends()
        fetchRequests()
        audio.playLevelUp()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setPendingAction(null) }
    }

    const handleReject = async (requestId: number) => {
      setPendingAction(requestId)
      try {
        const res = await fetch(`${API_BASE}/friends/requests/${requestId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        fetchRequests()
        audio.playUIClick()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setPendingAction(null) }
    }

    const handleRemoveFriend = async (friendId: number) => {
      try {
        const res = await fetch(`${API_BASE}/friends/${friendId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast('已删除好友', 'success')
        setConfirmRemoveId(null)
        fetchFriends()
        fetchStaminaStatus()
        audio.playUIClick()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleSendStamina = async (friendId: number) => {
      try {
        const res = await fetch(`${API_BASE}/friends/send-stamina`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(`已赠送体力，剩余 ${data.remaining} 次`, 'success')
        // Trigger count flip animation
        setStaminaFlip(true)
        setPrevSentToday(staminaStatus?.sent_today || 0)
        setTimeout(() => setStaminaFlip(false), 350)
        fetchStaminaStatus()
        audio.playLevelUp()
      } catch (err: any) { addToast(err.message, 'error') }
    }

    const handleReceiveStamina = async () => {
      setBannerHiding(true)
      setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/friends/receive-stamina`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          addToast(`领取了 ${data.received} 体力！`, 'success')
          fetchStaminaStatus()
          audio.playLevelUp()
        } catch (err: any) { addToast(err.message, 'error') }
        setBannerHiding(false)
      }, 300)
    }

    // Star particles data - memoized to avoid recreating on each render
    const starParticles = useMemo(() => {
      const floating = Array.from({ length: 20 }, (_, i) => ({
        id: `f-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1.5,
        duration: Math.random() * 4 + 4,
        delay: Math.random() * 5,
        type: 'floating' as const
      }))
      const twinkling = Array.from({ length: 20 }, (_, i) => ({
        id: `t-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 1.5 + 0.5,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 4,
        type: 'twinkling' as const
      }))
      return [...floating, ...twinkling]
    }, [])

    if (loading) return <div className="idol-page friends-page"><Skeleton variant="list" count={6} /></div>

    return (
      <div className="idol-page friends-page">
        {/* Star Particles Background */}
        <div className="star-particles">
          {starParticles.map(p => (
            <div
              key={p.id}
              className={`star-particle ${p.type === 'twinkling' ? 'star-twinkle' : ''}`}
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.type === 'twinkling' ? Math.random() * 0.5 + 0.3 : undefined,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Hero Section */}
        <div className="friends-hero">
          <h1 className="friends-hero-title">星光社交大厅</h1>
          <p className="friends-hero-subtitle"><span>Starlight Social Hub</span></p>
        </div>

        {/* Stamina Banner */}
        {staminaStatus?.pending_gifts?.length > 0 && (
          <div className={`stamina-banner ${bannerHiding ? 'hiding' : ''}`} onClick={handleReceiveStamina}>
            <div className="stamina-banner-info">
              <span className="stamina-banner-icon">🎁</span>
              <span className="stamina-banner-text">收到 <strong>{staminaStatus.pending_gifts.length}</strong> 份体力待领取</span>
            </div>
            <button className="stamina-banner-btn">立即领取</button>
          </div>
        )}

        {/* Tabs */}
        <div className="starlight-tabs">
          <button
            className={`tab-pill ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('friends'); audio.playUIClick() }}
          >
            <Icon name="sparkles" size={14} /> 好友列表 <span className="tab-count">{friends.length}</span>
          </button>
          <button
            className={`tab-pill ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('requests'); audio.playUIClick() }}
          >
            <span className="tab-icon">📨</span> 申请列表
            {requests.received.length > 0 && <span className="tab-count">{requests.received.length}</span>}
          </button>
        </div>

        <div className={`tab-content-wrapper tab-content-${activeTab}`} key={activeTab}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 20px' }}>
            <Skeleton variant="list" count={3} />
          </div>
        ) : activeTab === 'friends' ? (
          <>
            {/* Starlight Search */}
            <div className="starlight-search" ref={searchRef}>
              <div className="star-catalog-search-wrapper">
                <span className="star-catalog-search-icon">{searching ? '⏳' : '🔍'}</span>
                <input
                  type="text"
                  className="star-catalog-input"
                  placeholder="搜索星际用户目录..."
                  value={searchQuery}
                  aria-label="搜索星际用户目录"
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery.length > 0 && (
                  <button className="star-catalog-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false) }}>✕</button>
                )}
              </div>

              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div className="star-catalog-results">
                  {searching ? (
                    <div className="star-catalog-empty">
                      <div className="star-catalog-empty-icon">
                        <div className="auth-loading" style={{ width: 20, height: 20 }} />
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>搜索星际坐标中...</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="star-catalog-empty">
                      <div className="star-catalog-empty-icon">🔭</div>
                      <div>未找到星际访客</div>
                    </div>
                  ) : (
                    <>
                      {searchResults.map((u, idx) => {
                        const isFriend = friends.some(f => f.id === u.id)
                        return (
                          <div key={u.id} className={`star-catalog-item ${activeResultIndex === idx ? 'active' : ''}`}>
                            <img
                              src={u.avatar_url || '/default-avatar.png'}
                              alt={u.username}
                              className="star-catalog-item-avatar"
                            />
                            <div className="star-catalog-item-info">
                              <div className="star-catalog-item-name">{u.username}</div>
                              <div className="star-catalog-item-level">Lv.{u.level || 1}</div>
                            </div>
                            <button
                              className={`star-catalog-item-add ${isFriend ? 'friend' : ''}`}
                              disabled={sendingRequestId === u.id || isFriend}
                              onClick={() => !isFriend && handleSendRequest(u.id)}
                            >
                              {isFriend ? '✓ 已添加' : sendingRequestId === u.id ? '发送中...' : '+ 添加'}
                            </button>
                          </div>
                        )
                      })}
                      {searchTotalPages > 1 && (
                        <div className="search-pagination">
                          <button
                            className="search-pagination-btn"
                            disabled={searchPage <= 1}
                            onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                          >‹</button>
                          <span className="search-pagination-info">{searchPage}/{searchTotalPages}</span>
                          <button
                            className="search-pagination-btn"
                            disabled={searchPage >= searchTotalPages}
                            onClick={() => setSearchPage(p => Math.min(searchTotalPages, p + 1))}
                          >›</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Stamina Status */}
            <div className="stamina-status-bar">
              <span className="stamina-status-text">
                今日赠送: <strong className="stamina-status-count">{staminaStatus?.sent_today || 0}</strong>/{staminaStatus?.max_per_day || 3}
              </span>
            </div>

            {/* Friends Constellation List */}
            <div className="constellation-list">
              {friends.length === 0 ? (
                <div className="empty-state" onClick={() => document.querySelector<HTMLInputElement>('.star-catalog-input')?.focus()}>
                  <div className="empty-state-icon">🌌</div>
                  <div className="empty-state-text">好友列表为空</div>
                  <div className="empty-state-hint">点击这里搜索并添加好友</div>
                </div>
              ) : (
                friends.map((f, idx) => {
                  const intimacyLevel = f.intimacy_level || 1
                  const intimacyPercent = (intimacyLevel / 10) * 100
                  const isHigh = intimacyLevel >= 7
                  const isMax = intimacyLevel >= 10
                  return (
                    <div
                      key={f.id}
                      role="button"
                      tabIndex={0}
                      className="constellation-node"
                      style={{ animationDelay: `${Math.min(idx * 0.08, 2)}s` }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (staminaStatus?.sent_today < 3) handleSendStamina(f.id)
                        }
                        if (e.key === 'Delete' || e.key === 'Backspace') {
                          e.preventDefault()
                          setConfirmRemoveId(f.id)
                        }
                        if (e.key === 'Escape' && confirmRemoveId === f.id) {
                          setConfirmRemoveId(null)
                        }
                      }}
                    >
                      {/* Left accent bar */}
                      <div className="constellation-line" />

                      {/* Avatar */}
                      <div className="constellation-avatar-col">
                        <div className="constellation-avatar-ring">
                          <div className={`node-avatar-wrapper ${f.is_online ? 'online' : ''}`}>
                            <img
                              src={f.avatar_url || '/default-avatar.png'}
                              alt={f.username}
                              className="node-avatar"
                            />
                            {f.is_online && <div className="online-indicator" />}
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="node-info">
                        <div className="node-header">
                          <span className="node-name">{f.username}</span>
                          <span className="node-level">Lv.{f.level || 1}</span>
                        </div>
                        <div className="node-status-row">
                          <span className={`node-status-dot ${f.is_online ? 'online' : ''}`} />
                          <span className={`node-status ${f.is_online ? 'online' : ''}`}>
                            {f.is_online ? '在线' : `最后上线 ${f.last_login ? formatRelativeTime(f.last_login) : '未知'}`}
                          </span>
                        </div>
                        {/* Intimacy stars */}
                        <div className="intimacy-stars">
                          {Array.from({ length: 10 }, (_, i) => {
                            const starNum = i + 1
                            const filled = starNum <= intimacyLevel
                            const isHigh = intimacyLevel >= 7
                            const isMax = intimacyLevel >= 10
                            return (
                              <span
                                key={i}
                                className={`intimacy-star ${filled ? (isMax ? 'max' : isHigh ? 'high' : 'filled') : ''}`}
                              >
                                ★
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={`node-actions ${staminaStatus?.sent_today >= 3 ? 'exhausted' : ''}`}>
                        <button
                          className={`node-btn send-stamina ${staminaStatus?.sent_today >= 3 ? 'sent' : ''}`}
                          onClick={() => handleSendStamina(f.id)}
                          disabled={staminaStatus?.sent_today >= 3}
                          title={`赠送10体力 (今日${staminaStatus?.sent_today || 0}/3)`}
                        >
                          <svg className="stamina-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path className="bolt-core" d="M13 3L6 14h5l-1 7 7-11h-5l1-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            <path className="bolt-glow" d="M13 3L6 14h5l-1 7 7-11h-5l1-7z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25"/>
                          </svg>
                          <span className={`stamina-btn-label ${staminaFlip ? 'flip' : ''}`}>{staminaStatus?.sent_today >= 3 ? '已送' : `${staminaStatus?.sent_today || 0}/3`}</span>
                        </button>
                        {confirmRemoveId === f.id ? (
                          <div className="node-confirm-remove">
                            <button className="node-btn confirm-yes" onClick={() => handleRemoveFriend(f.id)}>确认</button>
                            <button className="node-btn confirm-no" onClick={() => setConfirmRemoveId(null)}>取消</button>
                          </div>
                        ) : (
                          <button className="node-btn remove" onClick={() => setConfirmRemoveId(f.id)} title="删除好友" aria-label="删除好友">
                            <svg className="remove-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <polygon className="hex-frame" points="12,2 21.5,7 21.5,17 12,22 2.5,17 2.5,7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                              <line className="x-line line1" x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <line className="x-line line2" x1="15.5" y1="8.5" x2="8.5" y2="15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <div className="request-list">
            {/* Received Requests */}
            <div
              className={`request-section-header ${receivedCollapsed ? 'collapsed' : ''}`}
              onClick={() => setReceivedCollapsed(c => !c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReceivedCollapsed(c => !c) } }}
              aria-expanded={!receivedCollapsed}
            >
              <span className="request-section-label">
                收到的申请 ({requests.received.length})
              </span>
            </div>
            {!receivedCollapsed && (
              <>
                {requests.received.length === 0 && (
                  <div className="request-empty-hint">
                    暂无待处理的申请
                  </div>
                )}
                {requests.received.map((r, idx) => (
                  <div key={r.id} className="request-constellation" style={{ animationDelay: `${Math.min(idx * 0.06, 2)}s` }}>
                    <img
                      src={r.from_avatar || '/default-avatar.png'}
                      alt={r.from_username}
                      className="request-avatar"
                    />
                    <div className="request-info">
                      <div className="request-name">
                        {r.from_username}
                        <span className="request-direction received">收到</span>
                      </div>
                      <div className="request-time">{formatRelativeTime(r.created_at)}</div>
                    </div>
                    <div className="request-actions">
                      <button className="request-btn accept" disabled={pendingAction === r.id} onClick={() => handleAccept(r.id)}>
                        {pendingAction === r.id ? '处理中...' : '接受'}
                      </button>
                      <button className="request-btn reject" disabled={pendingAction === r.id} onClick={() => handleReject(r.id)}>拒绝</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Sent Requests */}
            <div
              className={`request-section-header sent ${sentCollapsed ? 'collapsed' : ''}`}
              onClick={() => setSentCollapsed(c => !c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSentCollapsed(c => !c) } }}
              aria-expanded={!sentCollapsed}
            >
              <span className="request-section-label">
                发出的申请 ({requests.sent.length})
              </span>
            </div>
            {!sentCollapsed && (
              <>
                {requests.sent.length === 0 && (
                  <div className="request-empty-hint">
                    暂无发出的申请
                  </div>
                )}
                {requests.sent.map((r, idx) => (
                  <div key={r.id} className="request-constellation" style={{ animationDelay: `${Math.min((requests.received.length + idx) * 0.06, 2)}s` }}>
                    <img
                      src={r.to_avatar || '/default-avatar.png'}
                      alt={r.to_username}
                      className="request-avatar"
                    />
                    <div className="request-info">
                      <div className="request-name">
                        {r.to_username}
                        <span className="request-direction sent">发出</span>
                      </div>
                      <div className="request-time">{formatRelativeTime(r.created_at)}</div>
                    </div>
                    <button className="request-btn reject" disabled={pendingAction === r.id} onClick={() => handleReject(r.id)}>
                      {pendingAction === r.id ? '处理中...' : '取消'}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        </div>
      </div>
    )
  }

  const DailyPage = () => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'achievements'>('tasks')
    const [tasks, setTasks] = useState<any[]>([])
    const [achievements, setAchievements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState<number | null>(null)
    const [resetCountdown, setResetCountdown] = useState('')
    const [achFilter, setAchFilter] = useState<'all' | 'gacha' | 'collect' | 'login' | 'friend'>('all')
    const [justClaimed, setJustClaimed] = useState<Set<number>>(new Set())
    const [achUnlockPopup, setAchUnlockPopup] = useState<{ id: number; title: string; icon: string } | null>(null)
    const prevAchievementsRef = useRef<any[]>([])

    // Countdown to next daily reset (midnight)
    useEffect(() => {
      const updateCountdown = () => {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const diff = tomorrow.getTime() - now.getTime()
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setResetCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      }
      updateCountdown()
      const timer = setInterval(updateCountdown, 1000)
      return () => clearInterval(timer)
    }, [])

    const fetchData = () => {
      setLoading(true)
      Promise.all([
        fetch(`${API_BASE}/daily/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE}/achievements`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ]).then(([tasksData, achData]) => {
        const newAchievements = achData.achievements || []
        // Detect newly unlocked achievements
        const prevMap = new Map(prevAchievementsRef.current.map(a => [a.id, a]))
        const newlyUnlocked = newAchievements.find(a =>
          a.unlocked && !a.claimed && prevMap.has(a.id) && !prevMap.get(a.id).unlocked
        )
        if (newlyUnlocked) {
          setAchUnlockPopup({ id: newlyUnlocked.id, title: newlyUnlocked.title, icon: newlyUnlocked.icon })
        }
        prevAchievementsRef.current = newAchievements
        setTasks(tasksData.tasks || [])
        setAchievements(newAchievements)
        setLoading(false)
      }).catch((e) => { console.error('Failed to load daily data:', e); setLoading(false) })
    }

    useEffect(() => { fetchData() }, [])

    const handleClaimTask = async (taskId: number) => {
      setClaiming(taskId)
      try {
        const res = await fetch(`${API_BASE}/daily/tasks/${taskId}/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(`领取成功！获得 ${data.reward.amount} ${getRewardLabel(data.reward.type)}`, 'success')
        audio.playLevelUp()
        setJustClaimed(prev => new Set([...prev, taskId]))
        setTimeout(() => setJustClaimed(prev => { const s = new Set(prev); s.delete(taskId); return s }), 800)
        fetchData()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setClaiming(null) }
    }

    const handleClaimAchievement = async (achId: number) => {
      setClaiming(achId)
      try {
        const res = await fetch(`${API_BASE}/achievements/${achId}/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(`成就解锁！获得 ${data.reward.amount} ${getRewardLabel(data.reward.type)}`, 'success')
        audio.playLevelUp()
        setJustClaimed(prev => new Set([...prev, achId]))
        setTimeout(() => setJustClaimed(prev => { const s = new Set(prev); s.delete(achId); return s }), 800)
        fetchData()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setClaiming(null) }
    }

    const getRewardIcon = (type: string) => {
      switch (type) {
        case 'holy_stone': return <Icon name="gem" size={16} color="var(--currency-stone)" />
        case 'summon_ticket': return <Icon name="ticket" size={16} color="var(--currency-ticket)" />
        case 'fragment': return <Icon name="gem" size={16} color="var(--rarity-sr)" />
        case 'character_ticket_sr': return <Icon name="ticket" size={16} color="var(--rarity-sr)" />
        case 'character_ticket_ur': return <Icon name="ticket" size={16} color="var(--rarity-ur-1)" />
        default: return <Icon name="gift" size={16} />
      }
    }

    const getRewardLabel = (type: string) => {
      switch (type) {
        case 'holy_stone': return '圣像石'
        case 'summon_ticket': return '召唤券'
        case 'fragment': return '碎片'
        case 'character_ticket_sr': return 'SR角色券'
        case 'character_ticket_ur': return 'UR角色券'
        default: return type
      }
    }

    const getTaskIcon = (taskKey: string) => {
      switch (taskKey) {
        case 'login': return <Icon name="home" size={18} />
        case 'gacha_single': return <Icon name="slot" size={18} />
        case 'gacha_multi': return <Icon name="star2" size={18} />
        case 'send_stamina': return <Icon name="gift" size={18} />
        case 'interact': return <Icon name="users" size={18} />
        default: return <Icon name="clipboard" size={18} />
      }
    }

    const getAchIcon = (icon: string) => {
      switch (icon) {
        case 'gacha': return <Icon name="slot" size={18} />
        case 'collect': return <Icon name="book" size={18} />
        case 'login': return <Icon name="calendar" size={18} />
        case 'friend': return <Icon name="users" size={18} />
        case 'rhythm': return <Icon name="music" size={18} />
        default: return <Icon name="star" size={18} />
      }
    }

    const completedTasks = tasks.filter(t => t.completed && !t.claimed).length
    const unlockedAches = achievements.filter(a => a.unlocked && !a.claimed).length

    const filteredAchievements = achFilter === 'all'
      ? achievements
      : achievements.filter(a => a.icon === achFilter)

    const filterTabs: { key: 'all' | 'gacha' | 'collect' | 'login' | 'friend' | 'rhythm', label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'gacha', label: '抽卡' },
      { key: 'collect', label: '收集' },
      { key: 'login', label: '登录' },
      { key: 'friend', label: '社交' },
      { key: 'rhythm', label: '演奏' },
    ]

    if (loading) return <div className="idol-page"><Skeleton variant="list" count={8} /></div>

    return (
      <div className="idol-page">
        <h2 className="page-title">
          任务中心
          <span className="daily-reset-countdown" aria-label={`距离重置还有 ${resetCountdown}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {resetCountdown}
          </span>
        </h2>

        <div className="daily-tabs">
          <button
            className={`daily-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('tasks'); audio.playUIClick() }}
          >
            每日任务
            {completedTasks > 0 && <span className="daily-tab-badge">{completedTasks}</span>}
          </button>
          <button
            className={`daily-tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('achievements'); audio.playUIClick() }}
          >
            成就
            {unlockedAches > 0 && <span className="daily-tab-badge">{unlockedAches}</span>}
          </button>
        </div>

        {activeTab === 'tasks' ? (
          <>
            {tasks.length > 0 && tasks.every(t => t.claimed) && (
              <div className="daily-complete-banner" role="status">
                <div className="dcb-stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="dcb-star" style={{ animationDelay: `${i * 0.15}s` }}>★</span>
                  ))}
                </div>
                <span className="dcb-text">今日任务已全部完成！明天再来吧～</span>
                <div className="dcb-stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="dcb-star" style={{ animationDelay: `${i * 0.15 + 0.3}s` }}>★</span>
                  ))}
                </div>
              </div>
            )}
            <div className="daily-list">
              {tasks.length === 0 ? (
              <div className="empty-state">暂无每日任务</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`daily-item ${task.completed ? 'completed' : ''} ${task.claimed ? 'claimed' : ''} ${justClaimed.has(task.id) ? 'just-claimed' : ''}`}>
                  <div className="daily-item-icon">{getTaskIcon(task.task_key)}</div>
                  <div className="daily-item-info">
                    <div className="daily-item-title-row">
                      <span className="daily-item-title">{task.title}</span>
                      <span className={`task-type-badge ${task.reset_daily === false ? 'one-time' : 'daily'}`}>
                        {task.reset_daily === false ? '一次' : '每日'}
                      </span>
                    </div>
                    <div className="daily-item-desc">{task.description}</div>
                    <div className="daily-item-progress">
                      <div className="daily-progress-bar">
                        <div
                          className={`daily-progress-fill ${task.completed ? 'done' : ''}`}
                          style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}
                        />
                      </div>
                      <span className="daily-progress-text">{task.progress}/{task.target}{task.target > 0 ? ` (${Math.round((task.progress / task.target) * 100)}%)` : ''}</span>
                    </div>
                  </div>
                  <div className="daily-item-reward">
                    <span className="reward-icon" title={getRewardLabel(task.reward_type)}>{getRewardIcon(task.reward_type)}</span>
                    <span className="reward-amount">×{task.reward_amount.toLocaleString()}</span>
                  </div>
                  <div className="daily-item-action">
                    {task.claimed ? (
                      <span className="daily-claimed-label">已领取</span>
                    ) : task.completed ? (
                      <button
                        className={`daily-claim-btn ${claiming === task.id ? 'loading' : ''}`}
                        onClick={() => handleClaimTask(task.id)}
                        disabled={claiming === task.id}
                      >
                        {claiming === task.id ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14, animation: 'spinLoader 0.8s linear infinite' }}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                          </svg>
                        ) : '领取'}
                      </button>
                    ) : (
                      <span className="daily-locked-label">未完成</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </>
        ) : (
          <>
            <div className="ach-filter-bar" role="group" aria-label="成就筛选">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  className={`ach-filter-pill ${achFilter === tab.key ? 'active' : ''}`}
                  onClick={() => { setAchFilter(tab.key); audio.playUIClick() }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="daily-list">
              {filteredAchievements.length === 0 ? (
                <div className="ach-empty-state">
                  <div className="ach-empty-icon">
                    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="30" cy="30" r="28" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="4 4"/>
                      <path d="M30 8L32.5 20H45L34.5 27.5L38 40L30 32L22 40L25.5 27.5L15 20H27.5L30 8Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                      <circle cx="30" cy="30" r="3" fill="rgba(255,255,255,0.1)"/>
                    </svg>
                  </div>
                  <div className="ach-empty-title">
                    {achFilter === 'all' ? '星光正在汇聚...' : '星座尚未点亮...'}
                  </div>
                  <div className="ach-empty-desc">
                    {achFilter === 'all' ? '开始游戏，解锁你的第一个成就' :
                     achFilter === 'gacha' ? '继续应援偶像，解锁抽卡成就' :
                     achFilter === 'collect' ? '收集更多偶像，解锁收集成就' :
                     achFilter === 'login' ? '坚持每日登录，累积登录成就' :
                     achFilter === 'friend' ? '添加好友互动，解锁社交成就' :
                     '开始演奏，解锁演奏成就'}
                  </div>
                  <div className="ach-empty-hint">
                    {achFilter === 'all' ? '完成每日任务可解锁成就' :
                     achFilter === 'friend' ? '赠送/索要体力可加速进度' :
                     achFilter === 'rhythm' ? '演奏歌曲可累计进度' :
                     '继续加油，星光不负赶路人'}
                  </div>
                </div>
              ) : (
                filteredAchievements.map(ach => (
                  <div key={ach.id} className={`daily-item achievement-item ${ach.unlocked ? 'unlocked' : 'locked'} ${ach.claimed ? 'claimed' : ''} ${justClaimed.has(ach.id) ? 'just-claimed' : ''}`}>
                  <div className="daily-item-icon">{getAchIcon(ach.icon)}</div>
                  <div className="daily-item-info">
                    <div className="daily-item-title">{ach.title}</div>
                    <div className="daily-item-desc">{ach.description}</div>
                    <div className="daily-item-progress">
                      <div className="daily-progress-bar">
                        <div
                          className={`daily-progress-fill ${ach.unlocked ? 'done' : ''}`}
                          style={{ width: `${Math.min(100, (ach.progress / ach.condition_value) * 100)}%` }}
                        />
                      </div>
                      <span className="daily-progress-text">{ach.progress}/{ach.condition_value}{ach.condition_value > 0 ? ` (${Math.round((ach.progress / ach.condition_value) * 100)}%)` : ''}</span>
                    </div>
                  </div>
                  <div className="daily-item-reward">
                    <span className="reward-icon" title={getRewardLabel(ach.reward_type)}>{getRewardIcon(ach.reward_type)}</span>
                    <span className="reward-amount">×{ach.reward_amount.toLocaleString()}</span>
                  </div>
                  <div className="daily-item-action">
                    {ach.claimed ? (
                      <span className="daily-claimed-label">已领取</span>
                    ) : ach.unlocked ? (
                      <button
                        className={`daily-claim-btn ${claiming === ach.id ? 'loading' : ''}`}
                        onClick={() => handleClaimAchievement(ach.id)}
                        disabled={claiming === ach.id}
                      >
                        {claiming === ach.id ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14, animation: 'spinLoader 0.8s linear infinite' }}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                          </svg>
                        ) : '领取'}
                      </button>
                    ) : (
                      <span className="daily-locked-label">🔒</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </>
        )}

        {/* Achievement Unlock Popup */}
        {achUnlockPopup && (
          <div className="ach-unlock-overlay" onClick={() => setAchUnlockPopup(null)} role="dialog" aria-modal="true" aria-label="成就解锁">
            <div className="ach-unlock-popup" onClick={e => e.stopPropagation()}>
              <div className="ach-unlock-bg-glow" />
              <div className="ach-unlock-starfield">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className="ach-unlock-star" style={{ animationDelay: `${i * 0.12}s` }}>.</span>
                ))}
              </div>
              <div className="ach-unlock-corner ach-unlock-corner-tl" />
              <div className="ach-unlock-corner ach-unlock-corner-tr" />
              <div className="ach-unlock-corner ach-unlock-corner-bl" />
              <div className="ach-unlock-corner ach-unlock-corner-br" />
              <div className="ach-unlock-badge">ACHIEVEMENT</div>
              <div className="ach-unlock-icon">
                {achUnlockPopup.icon === 'gacha' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M12 13v2M8 18h8M10 16h4"/></svg>}
                {achUnlockPopup.icon === 'collect' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>}
                {achUnlockPopup.icon === 'login' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                {achUnlockPopup.icon === 'friend' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
                {achUnlockPopup.icon === 'rhythm' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><circle cx="8" cy="7" r="2.5"/><circle cx="20" cy="9" r="2.5"/><path d="M5.5 17.5C3 15 3 11 5.5 8.5M8 7C8 7 12 5 12 9s4 2 4 6"/></svg>}
                {!['gacha','collect','login','friend','rhythm'].includes(achUnlockPopup.icon) && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              </div>
              <div className="ach-unlock-title">{achUnlockPopup.title}</div>
              <div className="ach-unlock-subtitle">已解锁</div>
              <button className="ach-unlock-close" onClick={() => setAchUnlockPopup(null)} aria-label="关闭">
                <svg viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============ SupportModal ============
  const SupportModal = ({ idol, onClose, onConfirm, holyStones, loading, addToast }: {
    idol: any
    onClose: () => void
    onConfirm: (amount: number) => void
    holyStones: number
    loading: boolean
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void
  }) => {
    const [amount, setAmount] = useState('')

    // ESC to close
    useEffect(() => {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    const getRarityColor = (rarity: string) => {
      const map: Record<string, string> = { 'N': '#a0a0a0', 'R': '#00ff88', 'SR': '#00ccff', 'SSR': '#ff00ff', 'UR': '#ffd700' }
      return map[rarity] || '#fff'
    }

    const handleQuickAmount = (val: number) => {
      setAmount(String(val))
    }

    const handleHalfAmount = () => {
      setAmount(String(Math.floor(holyStones / 2)))
    }

    const handleAllInAmount = () => {
      setAmount(String(holyStones))
    }

    const handleConfirm = () => {
      const n = parseInt(amount)
      if (!n || n < 1) { addToast('请输入有效数量', 'error'); return }
      if (n > holyStones) { addToast('圣像石不足', 'error'); return }
      onConfirm(n)
    }

    const particles = Array.from({ length: 6 }, (_, i) => ({
      left: `${15 + i * 14}%`,
      top: `${20 + (i % 3) * 25}%`,
      delay: `${i * 0.6}s`,
      color: i % 2 === 0 ? '#00ffff' : '#ff00ff',
      size: i % 3 === 0 ? 4 : 3
    }))

    return (
      <div className="support-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="support-modal-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="support-modal">
          {/* Corner brackets */}
          <div className="sm-corner sm-corner-tl" />
          <div className="sm-corner sm-corner-tr" />
          <div className="sm-corner sm-corner-bl" />
          <div className="sm-corner sm-corner-br" />

          {/* Floating particles */}
          {particles.map((p, i) => (
            <div key={i} className="sm-particle" style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              animationDelay: p.delay
            }} />
          ))}

          {/* Header */}
          <div className="sm-header">
            <span className="sm-lock-icon">◈</span>
            <div className="sm-title" id="support-modal-title">能量契约</div>
          </div>

          {/* Idol info */}
          <div className="sm-idol-block">
            <div className="sm-idol-avatar" style={{ borderColor: getRarityColor(idol.rarity), color: getRarityColor(idol.rarity) }}>
              ★
            </div>
            <div>
              <div className="sm-idol-name">{idol.name}</div>
              <div className="sm-idol-meta">
                <span className="sm-idol-rarity" style={{ color: getRarityColor(idol.rarity) }}>{idol.rarity}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="sm-body">
            {/* Balance */}
            <div className="sm-balance">
              <span className="sm-balance-value">
                <Icon name="gem" size={14} color="var(--currency-stone)" />
                {holyStones.toLocaleString()}
              </span>
            </div>

            {/* Energy input */}
            <div className="sm-input-wrapper">
              <label htmlFor="sm-energy-input" className="sm-input-label">应援能量</label>
              <input
                id="sm-energy-input"
                className="sm-energy-input"
                type="number"
                placeholder="输入应援数量"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                autoFocus
              />
              {/* Slider alternative */}
              <input
                className="sm-energy-slider"
                type="range"
                min={0}
                max={holyStones}
                step={100}
                value={parseInt(amount) || 0}
                onChange={e => setAmount(e.target.value)}
                aria-label="应援能量滑块"
              />
            </div>

            {/* Quick amounts */}
            <div className="sm-quick-amounts">
              {[100, 1000, 10000].map(v => (
                <button key={v} className="sm-quick-chip" onClick={() => handleQuickAmount(v)}>
                  +{v}
                </button>
              ))}
              <button className="sm-quick-chip sm-quick-chip-secondary" onClick={handleHalfAmount}>
                一半
              </button>
              <button className="sm-quick-chip sm-quick-chip-accent" onClick={handleAllInAmount}>
                全部
              </button>
            </div>

            {/* Confirm */}
            <button className="sm-confirm-btn" onClick={handleConfirm} disabled={loading}>
              {loading ? '契约缔结中...' : '◈ 缔结契约 ◈'}
            </button>

            <button className="sm-cancel-btn" onClick={onClose}>取消</button>
          </div>
        </div>
      </div>
    )
  }

  // ============ RankingPage ============
  const RankingPage = () => {
    const [activeTab, setActiveTab] = useState<'rankings' | 'my-support'>('rankings')
    const [rankings, setRankings] = useState<any[]>([])
    const [mySupports, setMySupports] = useState<any[]>([])
    const [myTotalSupport, setMyTotalSupport] = useState(0)
    const [myRank, setMyRank] = useState(0)
    const [loading, setLoading] = useState(true)
    const [supporting, setSupporting] = useState<string | null>(null)
    const [selectedIdol, setSelectedIdol] = useState<any>(null)
    const [mySupportedIds, setMySupportedIds] = useState<Set<string>>(new Set())
    const [weekRange, setWeekRange] = useState({ start: '', end: '' })
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 20

    const handleOpenSupport = (idol: any) => {
      setSelectedIdol(idol)
    }

    const handleConfirmSupport = async (amount: number) => {
      if (!amount || amount < 1) { addToast('请输入有效数量', 'error'); return }
      if (amount > currency.holy_stone) { addToast('圣像石不足', 'error'); return }
      const targetIdol = selectedIdol!
      setSupporting(targetIdol.character_id)
      try {
        const res = await fetch(`${API_BASE}/ranking/support/${targetIdol.character_id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(data.message, 'success')
        audio.playLevelUp()
        fetchRankings()
        fetchMySupports()
        fetchCurrency()
        setSelectedIdol(null)
        // Auto-scroll to supported idol and flash highlight
        setHighlightedId(targetIdol.character_id)
        setTimeout(() => {
          const el = document.querySelector(`[data-ranking-id="${targetIdol.character_id}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
        setTimeout(() => setHighlightedId(null), 2000)
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setSupporting(null) }
    }

    const fetchRankings = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/ranking/idol-weekly`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setRankings(data.rankings || [])
        setMyTotalSupport(data.my_total_support || 0)
        setMyRank(data.my_rank || 0)
        if (data.week_start && data.week_end) {
          setWeekRange({ start: data.week_start, end: data.week_end })
        }
      } catch {}
      setLoading(false)
    }

    const fetchMySupports = async () => {
      try {
        const res = await fetch(`${API_BASE}/ranking/my-supports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setMySupports(data.supports || [])
        // Build set of supported idol IDs for highlighting
        const supportedIds = new Set((data.supports || []).map((s: any) => s.character_id))
        setMySupportedIds(supportedIds)
      } catch {}
    }

    useEffect(() => {
      fetchRankings()
      fetchMySupports()
    }, [])


    const getRarityColor = (rarity: string) => {
      const map: Record<string, string> = { 'N': '#a0a0a0', 'R': '#00ff88', 'SR': '#00ccff', 'SSR': '#ff00ff', 'UR': '#ffd700' }
      return map[rarity] || '#fff'
    }

    const getImagePath = (imagePath: string) => {
      if (!imagePath) return null
      return imagePath.startsWith('http') ? imagePath : `http://localhost:3001${imagePath}`
    }

    const getRankBadge = (rank: number) => {
      if (rank <= 3) {
        return (
          <div className="ranking-position-top3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="ranking-crown-icon">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
            </svg>
            <span className="ranking-rank-number">{rank}</span>
          </div>
        )
      }
      return <span className="ranking-position-inner">{rank}</span>
    }

    const isTop10 = (rank: number) => rank >= 1 && rank <= 10

    const getRankClass = (rank: number) => {
      if (rank === 1) return 'top-1'
      if (rank === 2) return 'top-2'
      if (rank === 3) return 'top-3'
      if (rank <= 10) return `top-${rank}`
      return ''
    }

    if (loading) return <div className="idol-page"><Skeleton variant="ranking-list" count={8} /></div>

    return (
      <div className="idol-page">
        <h2 className="page-title">
          应援排行榜
          {weekRange.start && weekRange.end && (
            <span className="ranking-week-range">
              {weekRange.start} ~ {weekRange.end}
            </span>
          )}
          <button
            className="ranking-share-btn"
            onClick={() => {
              const weekText = weekRange.start && weekRange.end ? `${weekRange.start}至${weekRange.end}` : '本期'
              const rankInfo = mySupports.length > 0
                ? `我的应援：共${myTotalSupport.toLocaleString()}能量，已应援${mySupports.length}位偶像`
                : '尚未进行任何应援'
              const shareText = `【偶像收藏集】${weekText}应援排行榜\n${rankInfo}\n游戏链接：idol-game://ranking`
              navigator.clipboard.writeText(shareText).then(() => addToast('排行榜信息已复制到剪贴板', 'success'))
            }}
            aria-label="复制排行榜信息"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span style={{ fontSize: '0.72rem', marginLeft: 4 }}>分享</span>
          </button>
        </h2>

        {/* Accessibility: live region for ranking updates */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {highlightedId && <span>应援成功！已滚动到应援的偶像</span>}
        </div>

        <div className="ranking-tabs">
          <button className={`ranking-tab ${activeTab === 'rankings' ? 'active' : ''}`} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('rankings'); audio.playUIClick() }}>
            <span className="ranking-tab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M3 3v18h18"/>
                <path d="M7 16l4-8 4 5 5-9"/>
              </svg>
            </span>
            偶像榜单
          </button>
          <button className={`ranking-tab ${activeTab === 'my-support' ? 'active' : ''}`} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('my-support'); audio.playUIClick() }}>
            <span className="ranking-tab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </span>
            我的应援
            {mySupports.length > 0 && <span className="daily-tab-badge" style={{ marginLeft: 6 }} aria-label={`已应援 ${mySupports.length} 位偶像`}>{mySupports.length}</span>}
          </button>
        </div>

        {activeTab === 'rankings' ? (
          <>
            {myRank > 0 && (
              <div className="my-rank-banner">
                <span className="my-rank-banner-icon">
                  <svg viewBox="0 0 24 24" fill="var(--accent-pink-solid)" style={{ width: 20, height: 20 }}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </span>
                <span>应援榜第 <span className="my-rank-banner-position">{myRank}</span> 名</span>
                <span className="my-rank-banner-label">，已应援 <span className="my-rank-banner-position">{mySupports.length}</span> 位偶像，共 <span className="my-rank-banner-position">{myTotalSupport.toLocaleString()}</span> 能量</span>
              </div>
            )}
            <div className="ranking-list">
              {/* Column headers */}
              {rankings.length > 0 && (
                <div className="ranking-list-header" role="row">
                  <div className="ranking-col-rank" role="columnheader">排名</div>
                  <div className="ranking-col-avatar" role="columnheader" />
                  <div className="ranking-col-info" role="columnheader">偶像</div>
                  <div className="ranking-col-score" role="columnheader">应援能量</div>
                  <div className="ranking-col-action" role="columnheader" />
                </div>
              )}
              {rankings.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'block', opacity: 0.5 }}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <div className="empty-state-title">本期榜单尚未开始</div>
                  <div className="empty-state-text">快去应援心仪的偶像，冲击榜单吧！</div>
                </div>
              ) : (
                rankings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((idol: any) => {
                  const isSupported = mySupportedIds.has(idol.character_id)
                  const isHighlighted = highlightedId === idol.character_id
                  return (
                    <div
                      key={idol.character_id}
                      data-ranking-id={idol.character_id}
                      className={`ranking-item ${getRankClass(idol.rank)} ${isSupported ? 'is-supported' : ''} ${isHighlighted ? 'highlight-flash' : ''} ranking-item-clickable`}
                      role="row"
                      tabIndex={0}
                      onClick={() => navigate(`/detail/${idol.character_id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/detail/${idol.character_id}`) } }}
                      aria-label={`${idol.rank}名 ${idol.name} 稀有度${idol.rarity} 应援${idol.amount}能量`}
                    >
                      <div className="ranking-position">{getRankBadge(idol.rank)}</div>
                      <div className={`ranking-avatar rarity-${idol.rarity}`}>
                        {idol.rank > 3 && (
                          <span className="idol-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                            </svg>
                          </span>
                        )}
                        {idol.image_path ? (
                          <img
                            src={getImagePath(idol.image_path)}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : null}
                        <span className="avatar-initial" style={idol.image_path ? { display: 'none' } : {}}>{idol.name.charAt(0)}</span>
                      </div>
                      <div className="ranking-info">
                        <div className="ranking-name">
                          {idol.name}
                          {isSupported && (
                            <span className="supported-indicator" aria-label="已应援">
                              <svg viewBox="0 0 24 24" fill="var(--accent-pink-solid)" style={{ width: 14, height: 14, verticalAlign: 'middle' }}>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="ranking-level">
                          <span className="rarity-badge" style={{ color: getRarityColor(idol.rarity) }}>{idol.rarity}</span>
                        </div>
                      </div>
                      <div className="ranking-score">
                        <div className="ranking-score-value"><Icon name="gem" size={14} color="var(--currency-stone)" /> {idol.amount.toLocaleString()}</div>
                      </div>
                      <button
                        className="ranking-support-btn"
                        onClick={(e) => { e.stopPropagation(); handleOpenSupport(idol) }}
                        aria-label={`为${idol.name}应援`}
                        disabled={supporting === idol.character_id}
                      >
                        {supporting === idol.character_id ? '应援中...' : '应援'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {/* Pagination */}
            {rankings.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(rankings.length / PAGE_SIZE)
              const maxVisible = 5
              let start = Math.max(1, page - Math.floor(maxVisible / 2))
              let end = start + maxVisible - 1
              if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxVisible + 1) }
              const pages: number[] = []
              for (let i = start; i <= end; i++) pages.push(i)
              return (
                <div className="ranking-pagination" role="navigation" aria-label="排行榜分页">
                  <button
                    className="ranking-page-btn"
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page === 1}
                    aria-label="上一页"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                  {start > 1 && (
                    <>
                      <button className={`ranking-page-btn ${page === 1 ? 'active' : ''}`} onClick={() => { setPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="第1页">1</button>
                      {start > 2 && <span className="ranking-page-ellipsis">···</span>}
                    </>
                  )}
                  {pages.map(p => (
                    <button key={p} className={`ranking-page-btn ${p === page ? 'active' : ''}`} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label={`第${p}页`} aria-current={p === page ? 'page' : undefined}>{p}</button>
                  ))}
                  {end < totalPages && (
                    <>
                      {end < totalPages - 1 && <span className="ranking-page-ellipsis">···</span>}
                      <button className={`ranking-page-btn ${page === totalPages ? 'active' : ''}`} onClick={() => { setPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label={`第${totalPages}页`}>{totalPages}</button>
                    </>
                  )}
                  <button
                    className="ranking-page-btn"
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page >= totalPages}
                    aria-label="下一页"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              )
            })()}
          </>
        ) : (
          <div className="ranking-list">
            {mySupports.length === 0 ? (
              <div className="ranking-list">
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-pink-solid)" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'block', opacity: 0.6 }}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <div className="empty-state-title">暂无应援记录</div>
                  <div className="empty-state-text">快去榜单为你喜欢的偶像应援吧！</div>
                </div>
              </div>
            ) : (
              mySupports.map((support: any) => (
                <div key={support.character_id} className={`ranking-item is-supported ${getRankClass(support.rank || 0)}`} role="row">
                  <div className="ranking-position">{getRankBadge(support.rank || 0)}</div>
                  <div className={`ranking-avatar rarity-${support.rarity}`}>
                    {support.rank <= 3 && (
                      <span className="crown">
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
                        </svg>
                      </span>
                    )}
                    {support.rank > 3 && (
                      <span className="idol-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                      </span>
                    )}
                    {support.image_path ? (
                      <img
                        src={getImagePath(support.image_path)}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                    <span className="avatar-initial" style={support.image_path ? { display: 'none' } : {}}>{support.name.charAt(0)}</span>
                  </div>
                  <div className="ranking-info">
                    <div className="ranking-name">{support.name}</div>
                    <div className="ranking-level">
                      <span className="rarity-badge" style={{ color: getRarityColor(support.rarity) }}>{support.rarity}</span>
                    </div>
                  </div>
                  <div className="ranking-score">
                    <div className="ranking-score-value">
                      <Icon name="gem" size={14} color="var(--currency-stone)" /> {support.amount.toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="ranking-cancel-btn"
                    onClick={() => addToast('取消应援功能开发中', 'info')}
                    aria-label={`取消对${support.name}的应援`}
                  >
                    取消应援
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Support Modal */}
        {selectedIdol && (
          <SupportModal
            idol={selectedIdol}
            holyStones={currency.holy_stone}
            loading={!!supporting}
            onClose={() => setSelectedIdol(null)}
            onConfirm={handleConfirmSupport}
            addToast={addToast}
          />
        )}
      </div>
    )
  }

  // ============ PassPage ============
  const PassPage = () => {
    const [passStatus, setPassStatus] = useState<any>(null)
    const [missions, setMissions] = useState<any[]>([])
    const [isVip, setIsVip] = useState(false)
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState<number | null>(null)
    const [claimingDaily, setClaimingDaily] = useState(false)
    const [purchasing, setPurchasing] = useState(false)

    const fetchPassStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/pass/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setPassStatus(data)
      } catch {}
    }

    const fetchMissions = async () => {
      try {
        const res = await fetch(`${API_BASE}/pass/missions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setMissions(data.missions || [])
        setIsVip(data.is_vip)
      } catch {}
    }

    useEffect(() => {
      setLoading(true)
      Promise.all([fetchPassStatus(), fetchMissions()]).finally(() => setLoading(false))
    }, [])

    const handleClaimDaily = async () => {
      setClaimingDaily(true)
      try {
        const res = await fetch(`${API_BASE}/pass/claim-daily`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(data.message, 'success')
        audio.playLevelUp()
        fetchPassStatus()
        fetchMissions()
        fetchCurrency()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setClaimingDaily(false) }
    }

    const handleClaimMission = async (missionId: number) => {
      setClaiming(missionId)
      try {
        const res = await fetch(`${API_BASE}/pass/missions/${missionId}/claim`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(data.message, 'success')
        audio.playLevelUp()
        fetchMissions()
        fetchCurrency()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setClaiming(null) }
    }

    const handlePurchase = async () => {
      setPurchasing(true)
      try {
        const res = await fetch(`${API_BASE}/pass/purchase`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pass_type: 'monthly', cost: 300 })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(data.message, 'success')
        audio.playLevelUp()
        fetchPassStatus()
        fetchMissions()
        fetchCurrency()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setPurchasing(false) }
    }

    const getMissionIcon = (targetType: string) => {
      switch (targetType) {
        case 'login': return <Icon name="home" size={18} />
        case 'gacha': return <Icon name="slot" size={18} />
        case 'send_stamina': return <Icon name="gift" size={18} />
        case 'support': return <Icon name="gem" size={18} color="var(--currency-stone)" />
        default: return <Icon name="clipboard" size={18} />
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const claimedToday = passStatus?.daily_claimed || false

    if (loading) return <div className="idol-page"><Skeleton variant="stat" count={4} /></div>

    return (
      <div className="idol-page">
        <h2 className="page-title">成长通行证</h2>

        {/* Pass Status Card */}
        <div className={`pass-status-card ${passStatus?.active ? 'active' : 'inactive'} ${(passStatus?.active && passStatus?.days_remaining <= 5) ? 'urgent' : ''}`}>
          {passStatus?.active ? (
            <>
              <div className="pass-status-header">
                <div className="pass-vip-badge">VIP</div>
                <div className="pass-info">
                  <div className="pass-title">月卡会员</div>
                  <div className="pass-expiry">有效期至 {new Date(passStatus.expires_at).toLocaleDateString('zh-CN')}</div>
                </div>
                <div className={`pass-days-left ${passStatus.days_remaining <= 5 ? 'urgent' : ''}`}>{passStatus.days_remaining}<span>天</span></div>
              </div>
              <div className="pass-daily-section">
                <div className="pass-daily-info">
                  <span>今日奖励：圣像石 ×100 + 体力 ×20</span>
                </div>
                <button
                  className="pass-daily-claim-btn"
                  onClick={handleClaimDaily}
                  disabled={claimingDaily || claimedToday}
                >
                  {claimingDaily ? '领取中...' : claimedToday ? '今日已领取' : '领取今日奖励'}
                </button>
              </div>
            </>
          ) : (
            <div className="pass-inactive-content">
              <div className="pass-inactive-title">月卡特权</div>
              <div className="pass-perks">
                <div className="pass-perk">✦ 每日 100 圣像石 + 20 体力</div>
                <div className="pass-perk">✦ 通行证任务双倍奖励</div>
                <div className="pass-perk">✦ 限定称号</div>
              </div>
              <button
                className="pass-purchase-btn"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? '购买中...' : <><Icon name="gem" size={14} color="var(--currency-stone)" /> 激活月卡 (300)</>}
              </button>
            </div>
          )}
        </div>

        {/* Mission List */}
        <div className="pass-missions-section">
          <div className="pass-missions-header">
            <span>通行证任务</span>
            {isVip && <span className="vip-indicator">VIP</span>}
          </div>
          {missions.length > 0 && (() => {
            const completed = missions.filter((m: any) => m.claimed).length
            const total = missions.length
            const pct = Math.round((completed / total) * 100)
            return (
              <div className="pass-overall-progress">
                <div className="pass-overall-label">
                  <span>任务进度</span>
                  <span className="pass-overall-count">{completed}/{total} ({pct}%)</span>
                </div>
                <div className="pass-overall-track">
                  <div className="pass-overall-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
          <div className="daily-list">
            {missions.length === 0 ? (
              <div className="empty-state">暂无任务</div>
            ) : (
              missions.map((mission: any) => (
                <div key={mission.id} className={`daily-item ${mission.claimed ? 'claimed' : ''}`}>
                  <div className="daily-item-icon">{getMissionIcon(mission.target_type)}</div>
                  <div className="daily-item-info">
                    <div className="daily-item-title">{mission.title}</div>
                    <div className="daily-item-desc">{mission.description}</div>
                    <div className="daily-item-progress">
                      <div className="daily-progress-bar">
                        <div
                          className={`daily-progress-fill ${mission.progress >= mission.target ? 'done' : ''}`}
                          style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }}
                        />
                      </div>
                      <span className="daily-progress-text">{mission.progress}/{mission.target}{mission.target > 0 ? ` (${Math.round((mission.progress / mission.target) * 100)}%)` : ''}</span>
                    </div>
                  </div>
                  <div className="daily-item-reward">
                    {isVip && mission.bonus_reward_amount ? (
                      <>
                        <Icon name="ticket" size={16} />
                        <span className="reward-amount">×{mission.bonus_reward_amount}</span>
                        <span style={{ color: '#ffd700', fontSize: '0.8em', marginLeft: 4 }}>+VIP</span>
                      </>
                    ) : (
                      <>
                        <Icon name="gem" size={16} color="var(--currency-stone)" />
                        <span className="reward-amount">×{mission.reward_amount}</span>
                      </>
                    )}
                  </div>
                  <div className="daily-item-action">
                    {mission.claimed ? (
                      <span className="daily-claimed-label">已领取</span>
                    ) : mission.progress >= mission.target ? (
                      <button
                        className="daily-claim-btn"
                        onClick={() => handleClaimMission(mission.id)}
                        disabled={claiming === mission.id}
                      >
                        {claiming === mission.id ? '...' : '领取'}
                      </button>
                    ) : (
                      <span className="daily-locked-label">未完成</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============ CalendarPage ============
  const CalendarPage = () => {
    const [records, setRecords] = useState<string[]>([])
    const [currentStreak, setCurrentStreak] = useState(0)
    const [totalDays, setTotalDays] = useState(0)
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [loading, setLoading] = useState(true)
    const [signInStatus, setSignInStatus] = useState<{ signed: boolean; consecutive_days: number; total_days: number }>({ signed: false, consecutive_days: 1, total_days: 0 })
    const [signingIn, setSigningIn] = useState(false)

    const fetchRecords = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/auth/login-records?year=${year}&month=${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setRecords(data.records || [])
        setCurrentStreak(data.current_streak || 0)
        setTotalDays(data.total_login_days || 0)
      } catch {}
      setLoading(false)
    }

    useEffect(() => { fetchRecords() }, [year, month])

    const fetchSignInStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/daily/signin`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setSignInStatus({ signed: data.signed || false, consecutive_days: data.consecutive_days || 1, total_days: data.total_days || 0 })
      } catch {}
    }

    useEffect(() => { fetchSignInStatus() }, [])

    const handleSignIn = async () => {
      if (signInStatus.signed || signingIn) return
      setSigningIn(true)
      try {
        const res = await fetch(`${API_BASE}/daily/signin`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSignInStatus(prev => ({ ...prev, signed: true }))
        fetchSignInStatus()
        addToast(`签到成功！获得 ${data.reward?.amount || 10} 圣像石`, 'success')
        audio.playLevelUp()
      } catch (err: any) { addToast(err.message, 'error') }
      finally { setSigningIn(false) }
    }

    const prevMonth = () => {
      if (month === 1) { setYear(y => y - 1); setMonth(12) }
      else setMonth(m => m - 1)
    }
    const nextMonth = () => {
      if (month === 12) { setYear(y => y + 1); setMonth(1) }
      else setMonth(m => m + 1)
    }

    const today = new Date()
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
    const todayStr = today.toISOString().split('T')[0]

    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const emptyCells = Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="celestial-day empty" />)

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isLoggedIn = records.includes(dateStr)
      const isToday = isCurrentMonth && day === today.getDate()
      let cls = 'celestial-day'
      if (isLoggedIn) cls += ' logged-in'
      if (isToday) cls += ' today'
      return (
        <div key={day} className={cls} style={{ '--day-index': i } as any}>
          <span className="celestial-day-number">{day}</span>
          {isLoggedIn && <span className="celestial-star">✦</span>}
        </div>
      )
    })

    const weekdays = ['日', '一', '二', '三', '四', '五', '六']

    return (
      <div className="idol-page">
        <div className="section-header">
          <h2 className="section-title">签到日历</h2>
        </div>

        {/* 7-Day Check-In Reward Track */}
        <div className="checkin-track-card">
          <div className="checkin-track-header">
            <div className="checkin-track-title">本周签到</div>
            <div className="checkin-track-total">累计 {signInStatus.total_days} 天</div>
          </div>
          <div className="checkin-days-row">
            {[
              { day: 1, reward: 10, type: 'stone', label: '10' },
              { day: 2, reward: 15, type: 'stone', label: '15' },
              { day: 3, reward: 1, type: 'ticket', label: '票' },
              { day: 4, reward: 20, type: 'stone', label: '20' },
              { day: 5, reward: 25, type: 'stone', label: '25' },
              { day: 6, reward: 1, type: 'ticket', label: '票' },
              { day: 7, reward: 50, type: 'stone', label: '50' },
            ].map(item => {
              const isPast = item.day < signInStatus.consecutive_days
              const isCurrent = item.day === signInStatus.consecutive_days
              const isClaimed = isPast || signInStatus.signed && item.day === signInStatus.consecutive_days
              return (
                <div key={item.day} className={`checkin-day-item ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''} ${isClaimed && item.day !== signInStatus.consecutive_days ? 'claimed' : ''}`}>
                  <div className="checkin-day-dot">
                    {isPast || (signInStatus.signed && isCurrent) ? (
                      <span className="checkin-check">✓</span>
                    ) : isCurrent ? (
                      <span className="checkin-fire">●</span>
                    ) : (
                      <span className="checkin-empty">○</span>
                    )}
                  </div>
                  <div className="checkin-day-num">第{item.day}天</div>
                  <div className="checkin-day-reward">
                    {item.type === 'stone' && <span className="reward-stone">{item.label}石</span>}
                    {item.type === 'ticket' && <span className="reward-ticket">票×{item.label}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <button
            className={`checkin-btn ${signInStatus.signed ? 'signed' : ''}`}
            onClick={handleSignIn}
            disabled={signInStatus.signed || signingIn}
          >
            {signInStatus.signed ? (
              <>✓ 已签到</>
            ) : signingIn ? (
              <>签到中...</>
            ) : (
              <>🎁 立即签到</>
            )}
          </button>
        </div>

        <div className="calendar-card">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <div className="cal-title">{year}年{month}月</div>
            <button className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>

          <div className="cal-stats">
            <div className="cal-stat">
              <span className="cal-stat-val">{currentStreak}</span>
              <span className="cal-stat-lbl">连续天数</span>
            </div>
            <div className="cal-stat-divider" />
            <div className="cal-stat">
              <span className="cal-stat-val">{totalDays}</span>
              <span className="cal-stat-lbl">累计天数</span>
            </div>
          </div>

          <div className="cal-weekdays">
            {weekdays.map(w => <div key={w} className="cal-weekday">{w}</div>)}
          </div>

          <div className="cal-grid">
            {emptyCells}
            {days}
          </div>

          <div className="cal-legend">
            <span className="cal-legend-item"><span className="cal-dot logged" />已登录</span>
            <span className="cal-legend-item"><span className="cal-dot today" />今日</span>
          </div>
        </div>

        {/* Reward Preview */}
        <div className="cal-reward-preview">
          <div className="section-header">
            <h2 className="section-title">本月奖励</h2>
          </div>
          <div className="cal-reward-grid">
            {[
              { day: 1, reward: '50 神圣石', type: 'holy_stone' },
              { day: 3, reward: '召唤券 x1', type: 'ticket' },
              { day: 7, reward: '100 神圣石', type: 'holy_stone' },
              { day: 14, reward: '限定头像框', type: 'special' },
              { day: 21, reward: '200 神圣石', type: 'holy_stone' },
              { day: 28, reward: 'SSR角色碎片 x5', type: 'character' },
            ].map(item => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
              const isClaimed = records.includes(dateStr)
              const isToday = isCurrentMonth && item.day === today.getDate()
              return (
                <div key={item.day} className={`cal-reward-item ${isClaimed ? 'claimed' : ''} ${isToday ? 'today' : ''}`}>
                  <div className="cal-reward-day">第{item.day}天</div>
                  <div className="cal-reward-icon">
                    {item.type === 'holy_stone' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2" fill="rgba(0,204,255,0.1)"/></svg>}
                    {item.type === 'ticket' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#ff69b4" strokeWidth="2" fill="rgba(255,105,180,0.1)"/><path d="M12 8V16M8 12H16" stroke="#ff69b4" strokeWidth="2" strokeLinecap="round"/></svg>}
                    {item.type === 'special' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#ffd700" strokeWidth="2" fill="rgba(255,215,0,0.1)"/></svg>}
                    {item.type === 'character' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="5" stroke="#a855f7" strokeWidth="2" fill="rgba(168,85,247,0.1)"/><path d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/></svg>}
                  </div>
                  <div className="cal-reward-name">{item.reward}</div>
                  {isClaimed && <div className="cal-reward-badge">已领取</div>}
                  {isToday && !isClaimed && <div className="cal-reward-badge today">可领取</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }


  // ============ SettingsPage ============
  const SettingsPage = () => {
    const [userStats, setUserStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchStats = async () => {
        setLoading(true)
        try {
          const [currencyRes, userRes] = await Promise.all([
            fetch(`${API_BASE}/user/currency`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/user/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
          ])
          const currencyData = await currencyRes.json()
          const userData = await userRes.json()
          setUserStats({
            ...currencyData,
            username: userData?.username,
            login_streak: userData?.login_streak,
            created_at: userData?.created_at
          })
        } catch (e) {
          console.error('Failed to fetch user stats:', e)
        } finally {
          setLoading(false)
        }
      }
      fetchStats()
    }, [])

    const handleLogout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      navigate('/login')
    }

    return (
      <div className="settings-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home') }} aria-label="返回">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="page-title">设置</h1>
        </div>

        <div className="settings-content">
          {/* Account Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">账号信息</h2>
            <div className="settings-card">
              {loading ? (
                <div className="settings-loading">
                  <Skeleton variant="text" count={3} />
                </div>
              ) : (
                <>
                  <div className="settings-row">
                    <span className="settings-label">用户名</span>
                    <span className="settings-value">{userStats?.username || '--'}</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">登录天数</span>
                    <span className="settings-value highlight">{userStats?.login_streak || 0} 天</span>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">注册时间</span>
                    <span className="settings-value">{userStats?.created_at ? new Date(userStats.created_at).toLocaleDateString('zh-CN') : '--'}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Audio Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">音频设置</h2>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-row-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                  <span className="settings-label">背景音乐</span>
                </div>
                <button
                  className={`toggle-switch ${audio.bgmEnabled ? 'on' : 'off'}`}
                  onClick={() => { audio.toggleBgm(); audio.playUIClick() }}
                  aria-pressed={audio.bgmEnabled}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.8"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span className="settings-label">音效</span>
                </div>
                <button
                  className={`toggle-switch ${audio.sfxEnabled ? 'on' : 'off'}`}
                  onClick={() => { audio.toggleSfx(); audio.playUIClick() }}
                  aria-pressed={audio.sfxEnabled}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>
          </section>

          {/* Guide Reset */}
          <section className="settings-section">
            <h2 className="settings-section-title">新手引导</h2>
            <div className="settings-card">
              <button
                className="settings-logout-btn"
                style={{ justifyContent: 'center', gap: 8 }}
                onClick={() => {
                  localStorage.removeItem('hasSeenGuide')
                  setShowGuide(true)
                  navigate('/home')
                  addToast('已重新显示新手引导', 'info')
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                重新显示新手引导
              </button>
            </div>
          </section>

          {/* About Section */}
          <section className="settings-section">
            <h2 className="settings-section-title">关于</h2>
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">游戏版本</span>
                <span className="settings-value">1.0.0</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">客户端</span>
                <span className="settings-value">Web</span>
              </div>
            </div>
          </section>

          {/* Logout */}
          <section className="settings-section">
            <button className="settings-logout-btn" onClick={() => setLogoutConfirmOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              退出登录
            </button>
          </section>
        </div>
      </div>
    )
  }

  // ============ ShopPage ============
  const ShopPage = () => {
    const [currency, setCurrency] = useState<any>(null)
    const [buying, setBuying] = useState<string | null>(null)
    const [confirmPack, setConfirmPack] = useState<any>(null)
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'holy_stone' | 'summon' | 'special'>('holy_stone')

    const fetchCurrency = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/currency`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setCurrency(data)
      } catch {}
    }

    useEffect(() => { fetchCurrency() }, [])

    const holyStonePacks = [
      { id: 'hs_1', amount: 60, cost: 6, label: '60 神圣石', desc: '限时优惠', originalCost: 8, accent: 'accent-gold', popular: false },
      { id: 'hs_2', amount: 350, cost: 30, label: '350 神圣石', desc: '赠送50 神圣石', originalCost: null, accent: 'accent-cyan', popular: true },
      { id: 'hs_3', amount: 1200, cost: 98, label: '1200 神圣石', desc: '赠送200 神圣石 (限时9折)', originalCost: 108, accent: 'accent-pink', popular: false },
      { id: 'hs_4', amount: 2500, cost: 198, label: '2500 神圣石', desc: '赠送500 神圣石 (限时8折)', originalCost: 248, accent: 'accent-gold', popular: false },
      { id: 'hs_5', amount: 6500, cost: 488, label: '6500 神圣石', desc: '赠送1500 神圣石 (限时7.5折)', originalCost: 648, accent: 'accent-purple', popular: false },
      { id: 'hs_6', amount: 20000, cost: 1398, label: '20000 神圣石', desc: '赠送6000 神圣石 (限时7折)', originalCost: 1998, accent: 'accent-rainbow', popular: false },
    ]

    const summonPacks = [
      { id: 'sum_1', amount: 1, cost: 30, label: '单抽召唤券 x1', desc: '限定召唤一次', accent: 'accent-gold', popular: false },
      { id: 'sum_2', amount: 10, cost: 280, label: '十连召唤券 x10', desc: '限时赠送1张', originalCost: 300, accent: 'accent-cyan', popular: true },
      { id: 'sum_3', amount: 30, cost: 800, label: '月卡召唤券 x30', desc: '每日赠送10张', accent: 'accent-pink', popular: false },
    ]

    const specialPacks = [
      { id: 'sp_1', amount: 1, cost: 68, label: '新手礼包', desc: '包含SSR角色+1000神圣石', originalCost: 128, accent: 'accent-gold', popular: true, badge: 'HOT' },
      { id: 'sp_2', amount: 1, cost: 128, label: '限定角色礼包', desc: '必得当期限定角色', accent: 'accent-pink', popular: false, badge: '限定' },
      { id: 'sp_3', amount: 1, cost: 298, label: '豪华礼包', desc: '包含UR角色+2000神圣石', originalCost: 498, accent: 'accent-rainbow', popular: false, badge: '豪华' },
    ]

    const handleBuyClick = (pack: any) => {
      const holyStone = currency?.holy_stone || 0
      if (holyStone < pack.cost) {
        addToast('神圣石不足，无法购买', 'error')
        return
      }
      setConfirmPack(pack)
    }

    const handleConfirmBuy = async () => {
      if (!confirmPack) return
      const packId = confirmPack.id
      setBuying(packId)
      setConfirmPack(null)
      try {
        const res = await fetch(`${API_BASE}/user/buy-item`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: packId, item_type: 'shop' })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast('购买成功！', 'success')
        audio.playLevelUp()
        setPurchaseSuccess(packId)
        setTimeout(() => setPurchaseSuccess(null), 2000)
        fetchCurrency()
      } catch (e: any) {
        addToast(e.message || '购买失败', 'error')
      } finally {
        setBuying(null)
      }
    }

    const renderPacks = (packs: any[]) => (
      <div className="shop-grid">
        {packs.map(pack => (
          <div key={pack.id} className={`shop-card ${pack.accent ? 'accent-' + pack.accent : ''} ${purchaseSuccess === pack.id ? 'purchased' : ''}`}>
            {pack.popular && <div className="shop-badge popular">荐</div>}
            {pack.badge && <div className="shop-badge special">{pack.badge}</div>}
            <div className="shop-card-icon">
              {pack.id.startsWith('hs') && <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2" fill="rgba(0,204,255,0.1)"/></svg>}
              {pack.id.startsWith('sum') && <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#ff69b4" strokeWidth="2" fill="rgba(255,105,180,0.1)"/><path d="M12 8V16M8 12H16" stroke="#ff69b4" strokeWidth="2" strokeLinecap="round"/></svg>}
              {pack.id.startsWith('sp') && <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,215,0,0.1)"/></svg>}
            </div>
            <div className="shop-card-label">{pack.label}</div>
            <div className="shop-card-desc">{pack.desc}</div>
            {pack.originalCost && (
              <div className="shop-card-original">原价 {pack.originalCost}</div>
            )}
            <div className="shop-card-price">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2"/></svg>
              {pack.cost}
            </div>
            <button
              className={`shop-buy-btn ${purchaseSuccess === pack.id ? 'success' : ''} ${currency?.holy_stone < pack.cost ? 'disabled' : ''}`}
              disabled={buying !== null || currency?.holy_stone < pack.cost}
              onClick={() => handleBuyClick(pack)}
            >
              {buying === pack.id ? '购买中...' : purchaseSuccess === pack.id ? '已购买' : '购买'}
            </button>
          </div>
        ))}
      </div>
    )

    return (
      <div className="shop-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/home') }} aria-label="返回">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="page-title">商城</h1>
          <div className="shop-currency-display">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2"/></svg>
            <span>{currency?.holy_stone ?? '--'}</span>
          </div>
        </div>

        <div className="shop-tabs">
          <button className={`shop-tab ${activeTab === 'holy_stone' ? 'active' : ''}`} onClick={() => setActiveTab('holy_stone')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2"/></svg>
            神圣石
          </button>
          <button className={`shop-tab ${activeTab === 'summon' ? 'active' : ''}`} onClick={() => setActiveTab('summon')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            召唤券
          </button>
          <button className={`shop-tab ${activeTab === 'special' ? 'active' : ''}`} onClick={() => setActiveTab('special')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2"/></svg>
            限定礼包
          </button>
        </div>

        <div className="shop-content">
          {activeTab === 'holy_stone' && renderPacks(holyStonePacks)}
          {activeTab === 'summon' && renderPacks(summonPacks)}
          {activeTab === 'special' && renderPacks(specialPacks)}
        </div>

        {confirmPack && (
          <div className="shop-confirm-overlay" onClick={() => setConfirmPack(null)}>
            <div className="shop-confirm-modal" onClick={e => e.stopPropagation()}>
              <h3>确认购买</h3>
              <div className="shop-confirm-item">
                <div className="shop-confirm-icon">
                  {confirmPack.id.startsWith('hs') && <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2" fill="rgba(0,204,255,0.1)"/></svg>}
                  {confirmPack.id.startsWith('sum') && <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#ff69b4" strokeWidth="2" fill="rgba(255,105,180,0.1)"/><path d="M12 8V16M8 12H16" stroke="#ff69b4" strokeWidth="2" strokeLinecap="round"/></svg>}
                  {confirmPack.id.startsWith('sp') && <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,215,0,0.1)"/></svg>}
                </div>
                <div className="shop-confirm-info">
                  <div className="shop-confirm-name">{confirmPack.label}</div>
                  <div className="shop-confirm-desc">{confirmPack.desc}</div>
                </div>
              </div>
              <div className="shop-confirm-price">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#00ccff" strokeWidth="2"/></svg>
                <span>{confirmPack.cost}</span>
              </div>
              <div className="shop-confirm-balance">
                剩余: {currency?.holy_stone || 0} 神圣石 → {(currency?.holy_stone || 0) - confirmPack.cost} 神圣石
              </div>
              <div className="shop-confirm-actions">
                <button className="btn-secondary" onClick={() => setConfirmPack(null)}>取消</button>
                <button className="btn-primary" onClick={handleConfirmBuy} disabled={buying !== null}>
                  {buying !== null ? '购买中...' : '确认购买'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }


  // ============ StaminaShopPage ============
  const StaminaShopPage = () => {
    const [currency, setCurrency] = useState<any>(null)
    const [buying, setBuying] = useState<number | null>(null)
    const [confirmPack, setConfirmPack] = useState<any>(null)
    const [overflowWarn, setOverflowWarn] = useState<any>(null)
    const [staminaAnim, setStaminaAnim] = useState(false)
    const [prevStamina, setPrevStamina] = useState(0)
    const [purchaseSuccess, setPurchaseSuccess] = useState<number | null>(null)

    const fetchCurrency = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/currency`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const newStamina = data?.stamina || 0
        if (currency && newStamina !== currency.stamina) {
          setPrevStamina(currency.stamina)
          setStaminaAnim(true)
          setTimeout(() => setStaminaAnim(false), 800)
        }
        setCurrency(data)
      } catch {}
    }

    useEffect(() => { fetchCurrency() }, [])

    // Auto-refresh when page becomes visible
    useEffect(() => {
      const handleVisibility = () => {
        if (!document.hidden) fetchCurrency()
      }
      document.addEventListener('visibilitychange', handleVisibility)
      return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [])

    const staminaPacks = [
      { id: 1, amount: 50, cost: 50, label: '小体力包', desc: '恢复50体力', accent: 'accent-gold', icon: '⚡', valueNote: '适合急需' },
      { id: 2, amount: 100, cost: 100, label: '中体力包', desc: '恢复100体力', accent: 'accent-cyan', icon: '💎', recommended: true, valueNote: '每体力仅需1圣石' },
      { id: 3, amount: 200, cost: 180, label: '大体力包', desc: '恢复200体力 (9折)', accent: 'accent-pink', icon: '⭐', valueNote: '省20圣石' },
    ]

    const handleBuyClick = (pack: any) => {
      const holyStone = currency?.holy_stone || 0
      if (holyStone < pack.cost) {
        addToast('圣像石不足，无法购买', 'error')
        return
      }
      const maxStamina = currency?.max_stamina || 120
      const afterStamina = (currency?.stamina || 0) + pack.amount
      if (afterStamina > maxStamina) {
        setOverflowWarn({ pack, overflow: afterStamina - maxStamina })
      } else {
        setConfirmPack(pack)
      }
    }

    const handleConfirmBuy = async () => {
      if (!confirmPack) return
      const packId = confirmPack.id
      setBuying(packId)
      setConfirmPack(null)
      try {
        const res = await fetch(`${API_BASE}/user/buy-stamina`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: packId })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        addToast(data.message, 'success')
        audio.playLevelUp()
        setPurchaseSuccess(packId)
        setTimeout(() => setPurchaseSuccess(null), 2000)
        fetchCurrency()
      } catch (err: any) { addToast(err.message, 'error') }
      setBuying(null)
    }

    const handleOverflowConfirm = () => {
      setConfirmPack(overflowWarn.pack)
      setOverflowWarn(null)
    }

    const holyStone = currency?.holy_stone || 0
    const maxStamina = currency?.max_stamina || 120
    const currentStamina = currency?.stamina || 0

    return (
      <div className="idol-page stamina-page-wrapper">
        {/* Back button */}
        <button className="stamina-back-btn" onClick={() => navigate('/home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          返回
        </button>

        <div className="stamina-header">
          <h2 className="stamina-title">体力商店</h2>
          <p className="stamina-subtitle">能量补给站 · Energy Supply Station</p>
        </div>

        <div className="stamina-currency-display">
          <div className="stamina-currency-card">
            <div className="currency-icon"><Icon name="gem" size={24} color="#ffd700" /></div>
            <div className="currency-amount">{holyStone}</div>
            <div className="currency-label">圣像石</div>
          </div>
          <div className={`stamina-currency-card ${holyStone === 0 ? 'danger' : ''}`}>
            <div className="currency-icon"><Icon name="stamina" size={24} color="#ff6b9d" /></div>
            <div className={`currency-amount ${staminaAnim ? 'stamina-flash' : ''}`}>{currentStamina}/{maxStamina}</div>
            <div className="currency-label">体力</div>
          </div>
        </div>

        {/* Stamina progress bar */}
        <div className="stamina-bar-wrapper">
          <span className="stamina-bar-icon">⚡</span>
          <div className="stamina-bar-track">
            <div className="stamina-bar-fill" style={{ width: `${Math.min((currentStamina / maxStamina) * 100, 100)}%` }} />
          </div>
          <span className="stamina-bar-text">
            {currentStamina}/{maxStamina}
            {currentStamina >= maxStamina && <span className="stamina-full-hint"> 已满</span>}
          </span>
        </div>

        <div className="stamina-shop-grid">
          {staminaPacks.map(pack => {
            const canAfford = holyStone >= pack.cost
            const deficit = pack.cost - holyStone
            return (
              <div key={pack.id} className={`stamina-pack-card ${pack.accent} ${pack.recommended ? 'recommended' : ''} ${!canAfford ? 'no-afford' : ''} ${buying === pack.id ? 'buying' : ''} ${purchaseSuccess === pack.id ? 'just-bought' : ''}`}>
                {pack.recommended && <div className="pack-recommended-badge">每体力最低价</div>}
                <span className="stamina-pack-corner tl" />
                <span className="stamina-pack-corner tr" />
                <span className="stamina-pack-corner bl" />
                <span className="stamina-pack-corner br" />
                <div className={`stamina-pack-icon ${pack.accent === 'accent-gold' ? 'gold' : pack.accent === 'accent-cyan' ? 'cyan' : 'pink'}`}>
                  <span className="pack-emoji-icon">{purchaseSuccess === pack.id ? '✓' : pack.icon}</span>
                </div>
                <div className="stamina-pack-title">{pack.label}</div>
                <div className="stamina-pack-desc">{pack.desc}</div>
                {pack.valueNote && <div className="pack-value-note">{pack.valueNote}</div>}
                <div className="stamina-pack-reward">+{pack.amount}</div>
                <div className="stamina-pack-btn-wrap">
                  <button
                    className={`stamina-pack-btn ${pack.accent === 'accent-gold' ? 'gold' : pack.accent === 'accent-cyan' ? 'cyan' : 'pink'}`}
                    onClick={() => handleBuyClick(pack)}
                    disabled={buying === pack.id || !canAfford}
                  >
                    {buying === pack.id ? (
                      <span className="btn-loading"><span className="btn-spinner" />购买中</span>
                    ) : purchaseSuccess === pack.id ? (
                      '购买成功'
                    ) : (
                      <><Icon name="gem" size={14} color="currentColor" /> {pack.cost}</>
                    )}
                  </button>
                  {!canAfford && <div className="pack-deficit-hint">还差 {deficit} 颗</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Zero balance guide */}
        {holyStone === 0 && (
          <div className="stamina-zero-guide">
            <span className="zero-guide-icon">💡</span>
            <span>圣像石耗尽了？参加 rhythm 演奏或完成每日任务可获得大量圣像石奖励</span>
          </div>
        )}

        {/* Confirm dialog */}
        {confirmPack && (
          <div className="stamina-confirm-overlay" onClick={() => setConfirmPack(null)}>
            <div className="stamina-confirm-card" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">⚡</div>
              <div className="confirm-title">确认购买</div>
              <div className="confirm-desc">
                消耗 <span className="confirm-cost"><Icon name="gem" size={14} color="#ffd700" /> {confirmPack.cost}</span>
                ，获得 <span className="confirm-reward">+{confirmPack.amount} 体力</span>
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn cancel" onClick={() => setConfirmPack(null)}>取消</button>
                <button className="confirm-btn ok" onClick={handleConfirmBuy}>确认购买</button>
              </div>
            </div>
          </div>
        )}

        {/* Overflow warning dialog */}
        {overflowWarn && (
          <div className="stamina-confirm-overlay" onClick={() => { setOverflowWarn(null); setConfirmPack(null) }}>
            <div className="stamina-confirm-card overflow" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon overflow-icon">⚠️</div>
              <div className="confirm-title">体力将溢出</div>
              <div className="confirm-desc">
                当前体力 <strong>{currentStamina}/{maxStamina}</strong>，购买后将达到 <strong className="overflow-val">{currentStamina + overflowWarn.pack.amount}</strong>，溢出 <span className="overflow-num">{overflowWarn.overflow}</span> 点
              </div>
              <div className="overflow-warn">溢出的体力将无法使用，建议购买更小的体力包</div>
              <div className="confirm-actions">
                <button className="confirm-btn cancel" onClick={() => { setOverflowWarn(null); setConfirmPack(null) }}>调整</button>
                <button className="confirm-btn warn" onClick={handleOverflowConfirm}>仍要购买</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============ Onboarding Guide ============
  const OnboardingGuide = () => {
    const [step, setStep] = useState(0)
    const totalSteps = 4

    const steps = [
      {
        target: '.home-currency-strip',
        title: '资源一览',
        desc: '圣像石用于召唤和购买体力，召唤券可免费召唤，体力用于演奏玩法',
        position: 'bottom'
      },
      {
        target: '.hero-banner-btn',
        title: '召唤偶像',
        desc: '点击这里召唤心仪的偶像角色，不同稀有度概率不同',
        position: 'bottom'
      },
      {
        target: '.home-star-map',
        title: '我的星图',
        desc: '这里展示你获得的所有偶像，点击星点可查看详情并互动',
        position: 'top'
      },
      {
        target: '.home-actions-section',
        title: '快速入口',
        desc: '应援殿放置偶像获取资源，图鉴查看所有角色，排行了解全服竞争',
        position: 'top'
      }
    ]

    const handleNext = () => {
      if (step < totalSteps - 1) {
        setStep(step + 1)
      } else {
        localStorage.setItem('hasSeenGuide', 'true')
        setShowGuide(false)
      }
    }

    const handleSkip = () => {
      localStorage.setItem('hasSeenGuide', 'true')
      setShowGuide(false)
    }

    const currentStep = steps[step]

    return (
      <div className="guide-overlay">
        {/* Highlight overlay */}
        <div className="guide-highlight-mask" />

        {/* Tooltip card */}
        <div className={`guide-tooltip guide-tooltip-${currentStep.position}`}>
          <div className="guide-step-indicator">
            {step + 1} / {totalSteps}
          </div>
          <div className="guide-tooltip-title">{currentStep.title}</div>
          <div className="guide-tooltip-desc">{currentStep.desc}</div>
          <div className="guide-tooltip-actions">
            <button className="guide-skip-btn" onClick={handleSkip}>跳过</button>
            <button className="guide-next-btn" onClick={handleNext}>
              {step < totalSteps - 1 ? '下一步' : '完成'}
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="guide-dots">
          {steps.map((_, i) => (
            <span key={i} className={`guide-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
      </div>
    )
  }

  const NavBar = () => {
    const [cmdOpen, setCmdOpen] = useState(false)
    const cmdRef = useRef<HTMLDivElement>(null)

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
                    aria-pressed={audio.bgmEnabled}
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
                    aria-pressed={audio.sfxEnabled}
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
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/friends'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21V19C20.9 18.4 20.6 17.9 20.1 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                      <path d="M21 14C21 12.3 19.7 11 18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                    </svg>
                    <span>好友</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/daily'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 11L3 11L3 17L21 17L21 7L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 3L21 3L21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>任务</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/ranking'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21V11M12 21V7M16 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>应援榜</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/stamina'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>体力商店</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/shop'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6H21" stroke="currentColor" strokeWidth="2"/><path d="M16 10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>商城</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/calendar'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>签到日历</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/pass'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M21 7L12 3L3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>通行证</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/settings'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>设置</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <button className="nav-cmd-item nav-cmd-logout" onClick={() => { audio.playUIClick(); setLogoutConfirmOpen(true); setCmdOpen(false) }}>
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

  const BottomNav = () => {
    const [cmdOpen, setCmdOpen] = useState(false)
    const cmdRef = useRef<HTMLDivElement>(null)

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
          <div className="bnv-currency-item stone" title="圣像石">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 9L12 16L22 9L12 2Z" fill="#00ccff" opacity="0.9"/><path d="M2 15L12 22L22 15" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/><path d="M2 12L12 19L22 12" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/></svg>
            <span>{currency.holy_stone.toLocaleString()}</span>
          </div>
          <div className="bnv-currency-item ticket" title="召唤券">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#ffd700" strokeWidth="1.8"/><path d="M3 9H21" stroke="#ffd700" strokeWidth="1.5" opacity="0.7"/><circle cx="16" cy="14" r="2" fill="#ffd700" opacity="0.8"/></svg>
            <span>{currency.summon_ticket}</span>
          </div>
          <div className="bnv-currency-item stamina" title="体力">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#ff6b9d" stroke="#ff6b9d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{currency.stamina || 0}/{currency.max_stamina || 120}</span>
          </div>
        </div>
        <div className="bottom-nav-items">
        <div
          className={`bottom-nav-item primary ${location.pathname === '/home' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          aria-current={location.pathname === '/home' ? 'page' : undefined}
          onClick={() => { audio.playUIClick(); navigate('/home') }}
          onKeyDown={e => e.key === 'Enter' && (audio.playUIClick(), navigate('/home'))}
          aria-label="首页"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 9L12 2L21 9V20C21 20.5 20.5 21 20 21H4C3.5 21 3 20.5 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="bottom-nav-label">首页</span>
        </div>
        <div
          className={`bottom-nav-item secondary ${location.pathname === '/inventory' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          aria-current={location.pathname === '/inventory' ? 'page' : undefined}
          onClick={() => { audio.playUIClick(); navigate('/inventory') }}
          onKeyDown={e => e.key === 'Enter' && (audio.playUIClick(), navigate('/inventory'))}
          aria-label="背包"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 7L12 3L4 7V17L12 21L20 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12L12 21" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              <path d="M12 12L4 7" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
              <path d="M12 12L20 7" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
            </svg>
          </span>
          <span className="bottom-nav-label">背包</span>
        </div>
        <div
          className={`bottom-nav-item secondary ${location.pathname === '/support' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          aria-current={location.pathname === '/support' ? 'page' : undefined}
          onClick={() => { audio.playUIClick(); navigate('/support') }}
          onKeyDown={e => e.key === 'Enter' && (audio.playUIClick(), navigate('/support'))}
          aria-label="应援"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19 21V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 3L3 8V21H21V8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21V16H15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="bottom-nav-label">应援</span>
        </div>
        <div
          className={`bottom-nav-item secondary ${location.pathname === '/rhythm' ? 'active' : ''}`}
          tabIndex={0}
          role="button"
          aria-current={location.pathname === '/rhythm' ? 'page' : undefined}
          onClick={() => { audio.playUIClick(); navigate('/rhythm') }}
          onKeyDown={e => e.key === 'Enter' && (audio.playUIClick(), navigate('/rhythm'))}
          aria-label="演出"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </span>
          <span className="bottom-nav-label">演出</span>
        </div>
        <div className="bottom-nav-item" ref={cmdRef as any}>
          <div className={`bottom-nav-cmd-wrapper ${cmdOpen ? 'open' : ''}`}>
            <button className="bottom-nav-cmd-btn" onClick={() => { audio.playUIClick(); setCmdOpen(o => !o) }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {cmdOpen && (
              <div className="nav-cmd-popover bottom-nav-cmd-popover">
                <div className="nav-cmd-section">
                  <div className="nav-cmd-section-label">音频</div>
                  <button aria-pressed={audio.bgmEnabled} className={`nav-cmd-item ${audio.bgmEnabled ? 'on' : 'off'}`} onClick={() => { audio.toggleBgm(); audio.playUIClick() }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18V5L21 3V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>背景音乐</span><span className="nav-cmd-status">{audio.bgmEnabled ? '开' : '关'}</span>
                  </button>
                  <button aria-pressed={audio.sfxEnabled} className={`nav-cmd-item ${audio.sfxEnabled ? 'on' : 'off'}`} onClick={() => { audio.toggleSfx(); audio.playUIClick() }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.8"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>音效</span><span className="nav-cmd-status">{audio.sfxEnabled ? '开' : '关'}</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <div className="nav-cmd-section">
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/friends'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="2"/><path d="M21 21V19C20.9 18.4 20.6 17.9 20.1 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/><path d="M21 14C21 12.3 19.7 11 18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7"/></svg>
                    <span>好友</span>
                    {pendingRequestsCount > 0 && (
                      <span className="friend-request-badge">{pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}</span>
                    )}
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/daily'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11L3 11L3 17L21 17L21 7L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 3L21 3L21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>任务</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/ranking'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21V11M12 21V7M16 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>应援榜</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/stamina'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>体力</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/shop'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>商城</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/calendar'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>日历</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/pass'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 15S3 17 3 19H21S20 17 20 15V5H4V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 15V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M20 15V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 5V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    <span>通行证</span>
                  </button>
                  <button className="nav-cmd-item" onClick={() => { audio.playUIClick(); navigate('/settings'); setCmdOpen(false) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.06a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.38 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.06A1.65 1.65 0 004.38 9a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00.33 1.82V15a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V21a2 2 0 002 2 2 2 0 002-2v-.06a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33h.06a1.65 1.65 0 001-1.51V12a2 2 0 012-2 2 2 0 012 2v.06a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V21a2 2 0 002 2 2 2 0 002-2v-.06a1.65 1.65 0 00-1.51-1H21a2 2 0 01-2-2 2 2 0 012-2h.06a1.65 1.65 0 001.51-1z" stroke="currentColor" strokeWidth="2"/></svg>
                    <span>设置</span>
                  </button>
                </div>
                <div className="nav-cmd-divider"/>
                <button className="nav-cmd-item nav-cmd-logout" onClick={() => { audio.playUIClick(); setLogoutConfirmOpen(true); setCmdOpen(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
          <span className="bottom-nav-label">菜单</span>
        </div>
        </div>
      </nav>
    )
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {!authLoaded ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020008' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00ccff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
      <>
      <div className="starfield" />
      {location.pathname !== '/login' && location.pathname !== '/register' && <NavBar />}
      <main id="main-content" aria-label="页面内容">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/gacha" element={<GachaPage onCurrencyUpdate={fetchCurrency} />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/support" element={<SupportHallPage />} />
          <Route path="/detail/:charId" element={<CharacterDetailPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/pass" element={<PassPage />} />
          <Route path="/rhythm" element={<RhythmPage token={token!} />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stamina" element={<StaminaShopPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/shop" element={<ShopPage />} />
        </Routes>
      </main>

      {/* Network offline banner */}
      {isOffline && (
        <div className="offline-banner" role="alert" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>
          <span>网络已断开，请检查您的连接</span>
        </div>
      )}

      {showGuide && <OnboardingGuide />}
      {location.pathname !== '/login' && location.pathname !== '/register' && <BottomNav />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Logout confirmation dialog */}
      {logoutConfirmOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setLogoutConfirmOpen(false)} role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 360 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚪</div>
            <h3 id="logout-confirm-title" style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 8 }}>确认退出登录</h3>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginBottom: 28 }}>确定要退出当前账号吗？</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setLogoutConfirmOpen(false)} style={{ padding: '10px 28px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'var(--surface-glass)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-base)' }}>取消</button>
              <button onClick={confirmLogout} style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ff6b9d, #c44569)', color: '#fff', cursor: 'pointer', fontSize: 'var(--text-base)', fontWeight: 600, boxShadow: '0 0 20px rgba(255,107,157,0.3)' }}>确认退出</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default App
