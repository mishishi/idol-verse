import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ThemeContext } from '../context/ThemeContext'
import { Icon } from '../components/common/Icon'
import { Skeleton } from '../components/common/Skeleton'

const API_BASE = 'http://localhost:3001/api'

export const SettingsPage: React.FC = () => {
  const { token, handleLogout } = useAuth()
  const { addToast } = useToast()
  const { eyeCare, toggleEyeCare } = React.useContext(ThemeContext)
  const navigate = useNavigate()

  const [userStats, setUserStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

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

  const confirmLogout = () => {
    setLogoutConfirmOpen(false)
    handleLogout()
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

        {/* Display Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">显示设置</h2>
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                <span className="settings-label">护眼模式</span>
              </div>
              <button
                className={`toggle-switch ${eyeCare ? 'on' : 'off'}`}
                onClick={toggleEyeCare}
                aria-pressed={eyeCare}
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
                ;(window as any).__resetGuide?.()
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

      {logoutConfirmOpen && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>确认退出</h3>
            <p>确定要退出登录吗？</p>
            <div className="confirm-dialog-actions">
              <button className="btn secondary" onClick={() => setLogoutConfirmOpen(false)}>
                取消
              </button>
              <button className="btn primary" onClick={confirmLogout}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
