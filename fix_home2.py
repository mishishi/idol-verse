#!/usr/bin/env python3
import re

content = open('src/renderer/App.tsx', 'r', encoding='utf-8').read()

start = content.find('  const HomePage = () => {')
end = content.find('\n  const GachaPage', start)
if start == -1 or end == -1:
    print('ERROR: boundaries not found')
    exit(1)

print(f'Found HomePage at {start}-{end}, length={end-start}')

# Check current state
section = content[start:end]
classes = re.findall(r'className="([^"]+)"', section)
print('Current classes:', classes[:15])

new_homepage = '''  const HomePage = () => {
    const [homeStats, setHomeStats] = useState({ character_count: 0, total_gacha: 0, login_streak: 0 })

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
      }).catch(() => {})
    }, [token])

    const stars = useMemo(() =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        dur: (Math.random() * 3 + 2).toFixed(1),
        delay: (Math.random() * 4).toFixed(1),
      })), [])

    return (
      <div className="home-page">
        <div className="star-particles">
          {stars.map(s => (
            <div key={s.id} className="star-particle" style={{
              left: s.left, top: s.top,
              width: s.size, height: s.size,
              ['--twinkle-dur' as string]: `${s.dur}s`,
              ['--twinkle-delay' as string]: `${s.delay}s`,
            }} />
          ))}
        </div>

        <div className="home-portal-bg">
          <div className="home-portal-ring" />
          <div className="home-portal-ring-2" />
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
            <button className="hero-banner-btn" onClick={() => setPage('gacha')}>立即召唤</button>
          </div>
        </div>

        {/* Currency Strip */}
        <div className="home-currency-strip">
          <div className="currency-pill">
            <span className="currency-pill-value">{currency.holy_stone}</span>
            <span className="currency-pill-label">圣像石</span>
          </div>
          <div className="currency-pill">
            <span className="currency-pill-value">{currency.summon_ticket}</span>
            <span className="currency-pill-label">召唤券</span>
          </div>
          <div className="currency-pill">
            <span className="currency-pill-value">{currency.stamina}/{currency.max_stamina}</span>
            <span className="currency-pill-label">体力</span>
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

        {/* Quick Actions Grid */}
        <div className="home-actions-section">
          <div className="section-title">\u2726 快速入口</div>
          <div className="actions-grid">
            <div className="action-card-new" onClick={() => setPage('gacha')}>
              <div className="action-card-icon"><Icon name="slot" size={26} /></div>
              <div className="action-card-title">召唤抽卡</div>
              <div className="action-card-sub">抽取心仪偶像</div>
            </div>
            <div className="action-card-new" onClick={() => setPage('support')}>
              <div className="action-card-icon"><Icon name="temple" size={26} /></div>
              <div className="action-card-title">应援殿</div>
              <div className="action-card-sub">放置产出资源</div>
            </div>
            <div className="action-card-new" onClick={() => setPage('gallery')}>
              <div className="action-card-icon"><Icon name="book" size={26} /></div>
              <div className="action-card-title">偶像图鉴</div>
              <div className="action-card-sub">查看所有偶像</div>
            </div>
            <div className="action-card-new" onClick={() => setPage('inventory')}>
              <div className="action-card-icon"><Icon name="backpack" size={26} /></div>
              <div className="action-card-title">我的背包</div>
              <div className="action-card-sub">已拥有偶像</div>
            </div>
            <div className="action-card-new" onClick={() => setPage('friends')}>
              <div className="action-card-icon"><Icon name="users" size={26} /></div>
              <div className="action-card-title">好友系统</div>
              <div className="action-card-sub">社交互动</div>
            </div>
            <div className="action-card-new" onClick={() => setPage('ranking')}>
              <div className="action-card-icon"><Icon name="chart" size={26} /></div>
              <div className="action-card-title">排行榜</div>
              <div className="action-card-sub">实力排行</div>
            </div>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="home-daily-row">
          <div className="daily-row-icon"><Icon name="clipboard" size={20} /></div>
          <div className="daily-row-text">
            <div className="daily-row-title">每日任务</div>
            <div className="daily-row-desc\">完成领奖励</div>
          </div>
          <div className="daily-row-arrow"><Icon name="arrowRight" size={16} /></div>
        </div>

        {/* Scroll Sections */}
        <div className="home-scroll-section">
          <div className="section-title">\u2726 限时活动</div>
          <div className="scroll-track">
            <div className="scroll-card primary" onClick={() => setPage('gacha')}>
              <div className="scroll-card-glow" />
              <div className="scroll-card-icon"><Icon name="sparkle" size={28} /></div>
              <div className="scroll-card-title">春日限定</div>
              <div className="scroll-card-desc">UR概率UP</div>
            </div>
            <div className="scroll-card" onClick={() => setPage('daily')}>
              <div className="scroll-card-glow" />
              <div className="scroll-card-icon"><Icon name="clipboard" size={28} /></div>
              <div className="scroll-card-title">每日任务</div>
              <div className="scroll-card-desc">获取奖励</div>
            </div>
            <div className="scroll-card" onClick={() => setPage('pass')}>
              <div className="scroll-card-glow" />
              <div className="scroll-card-icon"><Icon name="ticket" size={28} /></div>
              <div className="scroll-card-title">通行证</div>
              <div className="scroll-card-desc">赛季奖励</div>
            </div>
          </div>
        </div>

        <div className="home-quickbar">
          <div className="quickbar-item active" onClick={() => setPage('home')}>
            <Icon name="home" size={22} />
            <span className="quickbar-label">首页</span>
          </div>
          <div className="quickbar-item" onClick={() => setPage('gacha')}>
            <Icon name="slot" size={22} />
            <span className="quickbar-label">召唤</span>
          </div>
          <div className="quickbar-item" onClick={() => setPage('ranking')}>
            <Icon name="chart" size={22} />
            <span className="quickbar-label">排行</span>
          </div>
          <div className="quickbar-item" onClick={() => setPage('daily')}>
            <Icon name="clipboard" size={22} />
            <span className="quickbar-label">任务</span>
          </div>
        </div>
      </div>
    )
  }
'''

new_content = content[:start] + new_homepage + content[end:]

# Safety checks
if len(new_content) < len(content):
    print(f'ERROR: new ({len(new_content)}) < old ({len(content)})')
    exit(1)

for marker in ['home-hero-banner', 'home-stats-center', 'actions-grid', 'home-daily-row', 'home-quickbar']:
    if marker not in new_content:
        print(f'ERROR: missing {marker}')
        exit(1)

if 'home-dashboard' in new_content:
    print('ERROR: old home-dashboard still present')
    exit(1)

open('src/renderer/App.tsx', 'w', encoding='utf-8').write(new_content)
print(f'OK: wrote {len(new_content)} chars')
