import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useDebounce } from '../hooks/useDebounce'
import { checkUsername } from '../api/auth'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const { handleRegister, registerLoading } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const debouncedUsername = useDebounce(username, 400)
  const pwStrength = calcPwStrength(password)

  useEffect(() => {
    if (debouncedUsername.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    checkUsername(debouncedUsername)
      .then(available => setUsernameStatus(available ? 'ok' : 'taken'))
      .catch(() => setUsernameStatus('idle'))
  }, [debouncedUsername])

  const handleSubmit = async () => {
    if (password !== confirm) { addToast('两次密码不一致', 'error'); return }
    try {
      await handleRegister(username, password)
      addToast(`账号 ${username} 注册成功！请登录`, 'success')
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

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

          <div className="holo-field">
            <input
              className="holo-input"
              placeholder="用户名 / USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
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
          </div>

          <div className="holo-field">
            <input
              className="holo-input"
              type={showPw ? 'text' : 'password'}
              placeholder="密码 / PASSWORD"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
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

          <div className="holo-field">
            <input
              className="holo-input"
              type={showConfirm ? 'text' : 'password'}
              placeholder="确认密码 / CONFIRM"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
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
            disabled={registerLoading || usernameStatus === 'taken'}
            onClick={handleSubmit}
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

function calcPwStrength(pw: string): number {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

function strengthLabel(s: number): string { return s <= 1 ? 'weak' : s === 2 ? 'mid' : 'strong' }
function strengthText(s: number): string { return s <= 1 ? '脆弱' : s === 2 ? '一般' : '安全' }
