import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { useGacha } from '../context/GachaContext'
import { Icon } from '../components/common/Icon'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

const API_BASE = 'http://localhost:3001/api'

export const HomePage: React.FC = () => {
  const { token } = useAuth()
  const { currency, fetchCurrency } = useCurrency()
  const { openGacha } = useGacha()
  const navigate = useNavigate()

  const [homeStats, setHomeStats] = useState({ character_count: 0, total_gacha: 0, login_streak: 0 })
  const [homeStatsLoading, setHomeStatsLoading] = useState(true)

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

  return (
    <div className="home-page">
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
            onClick={() => openGacha()}
            onKeyDown={e => e.key === 'Enter' && openGacha()}
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

      {!homeStatsLoading && homeStats.character_count === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌟</div>
          <div className="empty-title">还没有偶像</div>
          <div className="empty-desc">去召唤试试你的运气吧！</div>
          <div className="empty-action">
            <button className="btn-primary" style={{ padding: '10px 24px', borderRadius: 12 }} onClick={() => openGacha()}>立即召唤</button>
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
              onClick={() => openGacha()}
              onKeyDown={e => e.key === 'Enter' && openGacha()}
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
              onClick={() => navigate('/daily')}
              onKeyDown={e => e.key === 'Enter' && navigate('/daily')}
              aria-label="每日任务"
            >
              <div className="action-card-icon"><Icon name="clipboard" size={26} /></div>
              <div className="action-card-title">每日任务</div>
              <div className="action-card-sub">获取奖励</div>
            </div>
            <div
              className="action-card-new"
              tabIndex={0}
              role="button"
              onClick={() => navigate('/friends')}
              onKeyDown={e => e.key === 'Enter' && navigate('/friends')}
              aria-label="好友"
            >
              <div className="action-card-icon"><Icon name="users" size={26} /></div>
              <div className="action-card-title">好友</div>
              <div className="action-card-sub">社交互动</div>
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
              onClick={() => openGacha()}
              onKeyDown={e => e.key === 'Enter' && openGacha()}
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
    </div>
  )
}
