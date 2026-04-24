import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAudio } from '../hooks/useAudio'
import { Icon } from './common/Icon'
import { LoadingSpinner } from './common/LoadingSpinner'

interface GachaDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const API_BASE = 'http://localhost:3001/api'

export const GachaDrawer: React.FC<GachaDrawerProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth()
  const { addToast } = useToast()
  const audio = useAudio()
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
    } catch (err: any) { addToast?.(err.message, 'error'); setPulling(false) }
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
    } catch (err: any) { addToast?.(err.message, 'error'); setMultiPulling(false) }
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