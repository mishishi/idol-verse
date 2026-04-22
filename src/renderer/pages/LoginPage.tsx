import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { handleLogin, loginLoading } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="portal-container">
        <div className="portal-ring" />
        <div className="portal-ring-2" />
        <div className="portal-glow" />

        <div className="auth-form-panel accent-pink">
          <div className="auth-star-title">★ STARLIGHT GATEWAY ★</div>
          <h1 className="auth-main-title">偶像收藏集</h1>
          <div className="auth-subtitle">LOGIN TO THE UNIVERSE</div>

          <div className="holo-field">
            <input
              className="holo-input"
              placeholder="用户名 / USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(username, password).catch(err => addToast(err.message, 'error'))}
              autoComplete="username"
            />
          </div>

          <div className="holo-field">
            <input
              className="holo-input"
              type={showPw ? 'text' : 'password'}
              placeholder="密码 / PASSWORD"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin(username, password).catch(err => addToast(err.message, 'error'))}
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
            onClick={() => handleLogin(username, password).catch(err => addToast(err.message, 'error'))}
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
  )
}
