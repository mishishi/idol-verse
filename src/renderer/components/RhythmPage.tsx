import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './common/Icon'
import { useAudio } from '../hooks/useAudio'

const API_BASE = 'http://localhost:3001/api'
const LANE_KEYS = ['d', 'f', 'j']

interface Song {
  id: number
  song_key: string
  title: string
  difficulty: number
  bpm: number
  best_score: number
  best_grade: string
  play_count: number
  duration?: number
}

interface Note {
  time: number
  lane: number
  type?: 'tap' | 'hold'
  duration?: number
}

interface ActiveNote {
  note: Note
  angle: number
  id: number
  held?: boolean
  holdProgress?: number
}

interface PlayResult {
  score: number
  perfect_count: number
  great_count: number
  good_count: number
  miss_count: number
  max_combo: number
  grade: string
}

const PERFECT_WINDOW = 80
const GREAT_WINDOW = 150
const GOOD_WINDOW = 300
const STAMINA_COST = 20
const JUDGMENT_RADIUS = 40
const LANE_RADII = [170, 130, 90]
const CENTER_X = 200
const CENTER_Y = 200
const TRAVEL_TIME = 5000

export default function RhythmPage({ token, showToast }: { token: string; showToast?: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const navigate = useNavigate()
  const audio = useAudio()
  const [view, setView] = useState<'list' | 'playing' | 'result'>('list')
  const [songs, setSongs] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([])
  const [startTime, setStartTime] = useState(0)
  const [currentCombo, setCurrentCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [judgmentCounts, setJudgmentCounts] = useState({ perfect: 0, great: 0, good: 0, miss: 0 })
  const [lastJudgment, setLastJudgment] = useState<string | null>(null)
  const [result, setResult] = useState<PlayResult | null>(null)
  const [stamina, setStamina] = useState(100)
  const [loading, setLoading] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [pressedLanes, setPressedLanes] = useState<Set<number>>(new Set())
  const [heldLanes, setHeldLanes] = useState<Set<number>>(new Set())
  const [showJudgment, setShowJudgment] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [countdownText, setCountdownText] = useState('')
  const [comboMilestone, setComboMilestone] = useState<number | null>(null)
  const [screenShake, setScreenShake] = useState(false)
  const [hitEffects, setHitEffects] = useState<{id: number, lane: number, x: number, y: number, isRipple?: boolean}[]>([])
  const [paused, setPaused] = useState(false)
  const [previousBestScore, setPreviousBestScore] = useState(0)
  const [resultRevealed, setResultRevealed] = useState(false)

  const animationRef = useRef<number | null>(null)
  const hitNotesRef = useRef<Set<number>>(new Set())
  const noteIdRef = useRef(0)
  const holdStartRef = useRef<Map<number, number>>(new Map())
  const activeHoldsRef = useRef<Map<number, ActiveNote>>(new Map())
  const pauseStartRef = useRef<number | null>(null)
  const totalPauseDurationRef = useRef(0)
  const hitEffectIdRef = useRef(0)
  const comboMilestoneTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const pauseRef = useRef(false)


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        pauseStartRef.current = Date.now()
      } else {
        if (pauseStartRef.current !== null) {
          totalPauseDurationRef.current += Date.now() - pauseStartRef.current
          pauseStartRef.current = null
        }
        if (view === 'playing' && startTime && !gameEnded) {
          const restartFrame = () => {
            if (gameEnded) return
            animationRef.current = requestAnimationFrame(restartFrame)
          }
          animationRef.current = requestAnimationFrame(restartFrame)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [view, startTime, gameEnded])

  useEffect(() => {
    fetchSongs()
    fetchStamina()
  }, [])

  const fetchSongs = async () => {
    try {
      const res = await fetch(API_BASE + '/rhythm/songs', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setSongs(data.songs || [])
    } catch (err) {
      showToast?.('获取歌曲列表失败', 'error')
    }
  }

  const fetchStamina = async () => {
    try {
      const res = await fetch(API_BASE + '/user/currency', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setStamina(data.stamina || 0)
    } catch (err) {
      showToast?.('获取体力失败', 'error')
    }
  }


  useEffect(() => {
    if (view !== 'playing') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        togglePause()
        return
      }
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (lane !== -1 && !e.repeat) {
        setPressedLanes(prev => new Set(prev).add(lane))
        handleLaneHit(lane)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase())
      if (lane !== -1) {
        setPressedLanes(prev => { const next = new Set(prev); next.delete(lane); return next })
        handleLaneRelease(lane)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [view, startTime, notes, gameEnded])

  const handleLaneHit = useCallback((lane: number) => {
    if (!startTime || gameEnded) return
    const elapsed = Date.now() - startTime
    for (const [noteIndex, activeNote] of activeHoldsRef.current.entries()) {
      if (activeNote.note.lane !== lane || activeNote.note.type !== 'hold') continue
      const holdDuration = activeNote.note.duration || 500
      const noteEndTime = activeNote.note.time + holdDuration
      if (elapsed >= activeNote.note.time - GOOD_WINDOW && elapsed <= noteEndTime + GOOD_WINDOW) {
        activeNote.held = true
        activeHoldsRef.current.set(noteIndex, activeNote)
        holdStartRef.current.set(noteIndex, elapsed)
        setHeldLanes(prev => new Set(prev).add(lane))
        audio.playHit(lane)
        return
      }
    }
    let bestResult: { index: number; judgment: 'perfect' | 'great' | 'good'; delta: number; isHold: boolean } | null = null
    let bestDelta = Infinity
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      if (hitNotesRef.current.has(i) || note.lane !== lane) continue
      const delta = Math.abs(elapsed - note.time)
      if (delta < bestDelta && delta <= GOOD_WINDOW) {
        bestDelta = delta
        const isHold = note.type === 'hold'
        let judgment: 'perfect' | 'great' | 'good' = 'good'
        if (delta <= PERFECT_WINDOW) judgment = 'perfect'
        else if (delta <= GREAT_WINDOW) judgment = 'great'
        bestResult = { index: i, judgment, delta, isHold }
      }
    }
    if (bestResult) {
      hitNotesRef.current.add(bestResult.index)
      if (bestResult.isHold) {
        const note = notes[bestResult.index]
        activeHoldsRef.current.set(bestResult.index, { note, angle: 0, id: noteIdRef.current++, held: false })
        holdStartRef.current.set(bestResult.index, elapsed)
        setHeldLanes(prev => new Set(prev).add(lane))
        audio.playHit(lane)
      } else {
        const scoreMap = { perfect: 100, great: 70, good: 40, miss: 0 }
        setScore(prev => prev + scoreMap[bestResult!.judgment])
        setCurrentCombo(prev => {
          const newCombo = prev + 1
          setMaxCombo(m => Math.max(m, newCombo))
          if (newCombo % 10 === 0) audio.playCombo(newCombo)
          if ([10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300].includes(newCombo)) {
            setComboMilestone(newCombo)
            if (comboMilestoneTimeoutRef.current) clearTimeout(comboMilestoneTimeoutRef.current)
            comboMilestoneTimeoutRef.current = window.setTimeout(() => setComboMilestone(null), 1000)
          }
          return newCombo
        })
        setJudgmentCounts(prev => ({ ...prev, [bestResult!.judgment]: prev[bestResult!.judgment as keyof typeof prev] + 1 }))
        setLastJudgment(bestResult.judgment)
        setShowJudgment(true)
        setTimeout(() => { setLastJudgment(null); setShowJudgment(false) }, 300)
        const laneRadius = LANE_RADII[lane]
        const effectX = CENTER_X + Math.cos(0) * laneRadius
        const effectY = CENTER_Y + Math.sin(0) * laneRadius
        setHitEffects(prev => [...prev, { id: hitEffectIdRef.current++, lane, x: effectX, y: effectY }])
        audio.playHit(lane)
      }
    }
  }, [startTime, notes, gameEnded, audio])


  const handleLaneRelease = useCallback((lane: number) => {
    if (!startTime || gameEnded) return
    const elapsed = Date.now() - startTime
    setHeldLanes(prev => { const next = new Set(prev); next.delete(lane); return next })
    for (const [noteIndex, activeNote] of activeHoldsRef.current.entries()) {
      if (activeNote.note.lane !== lane || !activeNote.held) continue
      const note = activeNote.note
      const holdDuration = note.duration || 500
      const holdTime = elapsed - (holdStartRef.current.get(noteIndex) || note.time)
      let judgment: 'perfect' | 'great' | 'good' | 'miss' = 'miss'
      let holdRatio = holdTime / holdDuration
      if (holdRatio >= 1.0) judgment = 'perfect'
      else if (holdRatio >= 0.7) judgment = 'great'
      else if (holdRatio >= 0.4) judgment = 'good'
      else judgment = 'miss'
      const scoreMap = { perfect: 150, great: 100, good: 50, miss: 0 }
      setScore(prev => prev + scoreMap[judgment])
      setCurrentCombo(prev => { const newCombo = prev + 1; setMaxCombo(m => Math.max(m, newCombo)); if (newCombo % 10 === 0) audio.playCombo(newCombo); return newCombo })
      setJudgmentCounts(prev => ({ ...prev, [judgment]: prev[judgment as keyof typeof prev] + 1 }))
      setLastJudgment(judgment)
      setShowJudgment(true)
      setTimeout(() => { setLastJudgment(null); setShowJudgment(false) }, 300)
      activeHoldsRef.current.delete(noteIndex)
      holdStartRef.current.delete(noteIndex)
      audio.playHit(lane)
      return
    }
  }, [startTime, gameEnded, audio])

  const handleTouchLane = (lane: number) => {
    if (view === 'playing') {
      setPressedLanes(prev => new Set(prev).add(lane))
      // Add ripple effect
      const laneRadius = LANE_RADII[lane]
      const rippleX = CENTER_X + Math.cos(Math.PI * 2 / 3 * lane) * laneRadius
      const rippleY = CENTER_Y + Math.sin(Math.PI * 2 / 3 * lane) * laneRadius
      setHitEffects(prev => [...prev, { id: hitEffectIdRef.current++, lane, x: rippleX, y: rippleY, isRipple: true }])
      handleLaneHit(lane)
    }
  }

  const handleTouchRelease = (lane: number) => {
    if (view === 'playing') { setPressedLanes(prev => { const next = new Set(prev); next.delete(lane); return next }); handleLaneRelease(lane) }
  }

  const togglePause = useCallback(() => {
    if (gameEnded || !startTime) return
    if (pauseRef.current) {
      // Resume
      if (pauseStartRef.current !== null) {
        totalPauseDurationRef.current += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      const restartFrame = () => {
        if (gameEnded || pauseRef.current) return
        animationRef.current = requestAnimationFrame(restartFrame)
      }
      animationRef.current = requestAnimationFrame(restartFrame)
      pauseRef.current = false
      setPaused(false)
    } else {
      // Pause
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      pauseStartRef.current = Date.now()
      pauseRef.current = true
      setPaused(true)
    }
  }, [gameEnded, startTime])

  const handleHoldExpire = useCallback((noteIndex: number) => {
    const activeNote = activeHoldsRef.current.get(noteIndex)
    if (!activeNote || !activeNote.held) return
    const note = activeNote.note
    const holdDuration = note.duration || 500
    const holdTime = holdDuration
    const holdRatio = holdTime / holdDuration
    let judgment: 'perfect' | 'great' | 'good' | 'miss'
    if (holdRatio >= 1.0) judgment = 'perfect'
    else if (holdRatio >= 0.7) judgment = 'great'
    else if (holdRatio >= 0.4) judgment = 'good'
    else judgment = 'miss'
    const scoreMap = { perfect: 150, great: 100, good: 50, miss: 0 }
    setScore(prev => prev + scoreMap[judgment])
    setCurrentCombo(prev => { const newCombo = prev + 1; setMaxCombo(m => Math.max(m, newCombo)); if (newCombo % 10 === 0) audio.playCombo(newCombo); return newCombo })
    setJudgmentCounts(prev => ({ ...prev, [judgment]: prev[judgment as keyof typeof prev] + 1 }))
    setLastJudgment(judgment)
    setShowJudgment(true)
    setTimeout(() => { setLastJudgment(null); setShowJudgment(false) }, 300)
    activeHoldsRef.current.delete(noteIndex)
    holdStartRef.current.delete(noteIndex)
    hitNotesRef.current.add(noteIndex)
    audio.playHit(note.lane)
  }, [audio])


  useEffect(() => {
    if (view !== 'playing' || !startTime) return
    const updateFrame = () => {
      const elapsed = Date.now() - startTime - totalPauseDurationRef.current
      const updatedActive: ActiveNote[] = []
      notes.forEach((note, index) => {
        const noteTargetTime = note.time
        const timeUntilHit = noteTargetTime - elapsed
        const progress = 1 - (timeUntilHit / TRAVEL_TIME)
        const baseRadius = LANE_RADII[note.lane]
        const currentRadius = Math.max(JUDGMENT_RADIUS, baseRadius - progress * (baseRadius - JUDGMENT_RADIUS))
        const angle = (index * 0.5) % (Math.PI * 2)
        const isActiveHold = activeHoldsRef.current.has(index)
        if (progress >= 0 && progress <= 1.2 && (!hitNotesRef.current.has(index) || isActiveHold)) {
          const existingHold = activeHoldsRef.current.get(index)
          if (existingHold) {
            existingHold.angle = angle
            existingHold.holdProgress = isActiveHold ? (elapsed - (holdStartRef.current.get(index) || noteTargetTime)) / (note.duration || 500) : 0
            updatedActive.push(existingHold)
          } else {
            updatedActive.push({ note, angle, id: noteIdRef.current++, held: false, holdProgress: 0 })
          }
        }
      })
      for (const [index, activeNote] of activeHoldsRef.current.entries()) {
        const note = activeNote.note
        const holdDuration = note.duration || 500
        const noteEndTime = note.time + holdDuration
        if (elapsed > noteEndTime + GOOD_WINDOW) handleHoldExpire(index)
      }
      setActiveNotes(updatedActive)
      let missedThisFrame = false
      notes.forEach((note, index) => {
        if (hitNotesRef.current.has(index)) return
        if (elapsed > note.time + GOOD_WINDOW) {
          hitNotesRef.current.add(index)
          missedThisFrame = true
          audio.playMiss()
          setScreenShake(true)
          setTimeout(() => setScreenShake(false), 200)
        }
      })
      if (missedThisFrame) { setCurrentCombo(0); setJudgmentCounts(prev => ({ ...prev, miss: prev.miss + 1 })) }
      const allDone = notes.length > 0 && notes.every((_, i) => hitNotesRef.current.has(i) || elapsed > notes[notes.length - 1].time + 2000)
      if (allDone && !gameEnded) { endGame(); return }
      if (!gameEnded) animationRef.current = requestAnimationFrame(updateFrame)
    }
    animationRef.current = requestAnimationFrame(updateFrame)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [view, startTime, notes, gameEnded, audio, handleHoldExpire])


  const startPlay = async (song: Song) => {
    if (stamina < STAMINA_COST) { showToast?.('体力不足！', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/rhythm/play/' + song.id, { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
      const data = await res.json()
      if (!data.success) { showToast?.(data.error || '开始演奏失败', 'error'); return }
      setStamina(data.stamina_remaining)
      setCurrentSong(song)
      setPreviousBestScore(song.best_score || 0)
      setNotes(data.song.notes_data)
      setActiveNotes([])
      setCurrentCombo(0); setMaxCombo(0); setScore(0)
      setJudgmentCounts({ perfect: 0, great: 0, good: 0, miss: 0 })
      setLastJudgment(null); setGameEnded(false); setShowJudgment(false); setHitEffects([])
      hitNotesRef.current.clear(); noteIdRef.current = 0; holdStartRef.current.clear(); activeHoldsRef.current.clear()
      totalPauseDurationRef.current = 0; pauseStartRef.current = null; pauseRef.current = false
      setView('playing')
      setCountdown(3); setCountdownText('3'); countdownRef.current = 3
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = window.setInterval(() => {
        const current = countdownRef.current
        if (current === 3) { setCountdownText('2'); setCountdown(2); countdownRef.current = 2 }
        else if (current === 2) { setCountdownText('1'); setCountdown(1); countdownRef.current = 1 }
        else if (current === 1) { setCountdownText('GO'); setCountdown(0); countdownRef.current = 0 }
        else { clearInterval(countdownIntervalRef.current!); countdownIntervalRef.current = null; setCountdown(null); countdownRef.current = null; setStartTime(Date.now()) }
      }, 1000)
    } catch (err) { showToast?.('开始演奏失败', 'error') }
    finally { setLoading(false) }
  }

  const endGame = useCallback(() => {
    setGameEnded(true)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    const counts = judgmentCounts
    const total = counts.perfect + counts.great + counts.good + counts.miss
    const accuracy = total > 0 ? (counts.perfect * 100 + counts.great * 70 + counts.good * 40) / (total * 100) : 0
    let grade = 'D'
    if (accuracy >= 0.95 && counts.miss === 0) grade = 'S'
    else if (accuracy >= 0.85) grade = 'A'
    else if (accuracy >= 0.70) grade = 'B'
    else if (accuracy >= 0.50) grade = 'C'
    const playResult: PlayResult = { score, perfect_count: counts.perfect, great_count: counts.great, good_count: counts.good, miss_count: counts.miss, max_combo: maxCombo, grade }
    setResult(playResult)
    setResultRevealed(false)
    setView('result')
    audio.playGradeSound(grade)
    submitScore(playResult)
    // Dramatic reveal sequence
    setTimeout(() => setResultRevealed(true), 800)
  }, [audio, judgmentCounts, score, maxCombo, currentSong])

  const submitScore = async (playResult: PlayResult) => {
    if (!currentSong) return
    try {
      await fetch(API_BASE + '/rhythm/score/' + currentSong.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(playResult)
      })
    } catch (err) { showToast?.('提交成绩失败', 'error') }
  }


  const renderDifficulty = (level: number) => '★'.repeat(level) + '☆'.repeat(4 - level)

  const getNotePosition = (note: Note, index: number, elapsed: number) => {
    const noteTargetTime = note.time
    const timeUntilHit = noteTargetTime - elapsed
    const progress = 1 - (timeUntilHit / TRAVEL_TIME)
    const baseRadius = LANE_RADII[note.lane]
    const currentRadius = Math.max(JUDGMENT_RADIUS - 20, baseRadius - progress * (baseRadius - JUDGMENT_RADIUS))
    const angle = (index * 0.7 + elapsed * 0.001) % (Math.PI * 2)
    const x = CENTER_X + Math.cos(angle) * currentRadius
    const y = CENTER_Y + Math.sin(angle) * currentRadius
    return { x, y, angle, radius: currentRadius }
  }

  if (view === 'list') {
    return (
      <div className="rhythm-page">
        <div className="stage-header">
          <div className="stage-header-frame">
            <div className="frame-corner frame-tl" />
            <div className="frame-corner frame-tr" />
            <div className="frame-corner frame-bl" />
            <div className="frame-corner frame-br" />
            <div className="stage-title-area">
              <div className="stage-eyebrow">VIRTUAL IDOL COLLECTION</div>
              <h2 className="stage-title">偶像演出</h2>
              <div className="stage-title-glow" />
            </div>
          </div>
          <div className="stamina-pod">
            <div className="pod-label">体力</div>
            <div className="pod-bar">
              <div className="pod-bar-fill" style={{ width: `${Math.min(100, stamina)}%` }} />
              <div className="pod-bar-glow" style={{ width: `${Math.min(100, stamina)}%` }} />
            </div>
            <div className="pod-value">{stamina}<span className="pod-max">/100</span></div>
          </div>
        </div>
        <div className="rhythm-tip">键盘 <span className="key-hint">D</span><span className="key-hint">F</span><span className="key-hint">J</span> 对应三条轨道，或触摸屏幕</div>
        <div className="song-list">
          {songs.map(song => {
            const canPlay = stamina >= STAMINA_COST && !loading
            return (
            <div key={song.id} className={`song-card${!canPlay ? ' disabled' : ''}`} onClick={() => canPlay && startPlay(song)}>
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-meta">
                  <span className="song-bpm">BPM {song.bpm}</span>
                  <span className="song-duration">{Math.floor((song.duration || 60) / 60)}:{String((song.duration || 60) % 60).padStart(2, '0')}</span>
                  <span className="song-difficulty">{renderDifficulty(song.difficulty)}</span>
                </div>
                <div className="song-best">
                  {song.play_count > 0 ? <><span className={`grade-badge grade-${song.best_grade}`}>{song.best_grade}</span><span className="best-score">{song.best_score.toLocaleString()}</span></> : <span className="not-played">未演奏</span>}
                </div>
              </div>
              <div className="song-play-btn">{loading ? '...' : '演奏'}</div>
            </div>
          )})}
        </div>
        <div className="rhythm-info-bar"><span><Icon name="stamina" size={16} color="#ffd700" /> 每次演奏消耗 {STAMINA_COST} 体力</span><span>S级: 圣像石×30 + 召唤券×1 | A级: ×20 | B级: ×10 | C级: ×5</span></div>
      </div>
    )
  }


  if (view === 'playing') {
    const elapsed = startTime ? Date.now() - startTime - totalPauseDurationRef.current : 0
    const progress = notes.length > 0 ? Math.min(1, elapsed / (notes[notes.length - 1].time + 2000)) * 100 : 0
    return (
      <div className={`rhythm-playing ${screenShake ? 'shake' : ''}`}>
        <div className="stage-ambient" />
        <div className="stage-lights">
          <div className="light-beam" /><div className="light-beam" /><div className="light-beam" /><div className="light-beam" /><div className="light-beam" />
        </div>
        <div className="game-hud">
          <div className="hud-left">
            <div className="hud-song-name">{currentSong?.title}</div>
            <div className="hud-score">{score.toLocaleString()}</div>
          </div>
          <div className="hud-center">
            <div className="hud-j-judgment"><span className="stat-perfect">P {judgmentCounts.perfect}</span><span className="stat-great">G {judgmentCounts.great}</span><span className="stat-good">OK {judgmentCounts.good}</span><span className="stat-miss">M {judgmentCounts.miss}</span></div>
          </div>
          <div className="hud-right">
            <div className="hud-combo"><span className="combo-num">{currentCombo}</span><span className="combo-label">COMBO</span></div>
            <button className="pause-btn" onClick={togglePause}>⏸</button>
          </div>
        </div>
        {paused && (
          <div className="pause-overlay">
            <div className="pause-content">
              <div className="pause-title">PAUSED</div>
              <div className="pause-hint">按 P 或 ESC 继续</div>
              <button className="pause-resume-btn" onClick={togglePause}>继续</button>
              <button className="pause-quit-btn" onClick={() => { setView('list'); fetchSongs(); fetchStamina() }}>退出</button>
            </div>
          </div>
        )}
        <div className={`judgment-indicator ${lastJudgment} ${showJudgment ? 'show' : ''}`}>{lastJudgment?.toUpperCase()}</div>
        <div className="stage-center">
          <div className="orbit-lanes"><div className="orbit-ring orbit-ring-0" /><div className="orbit-ring orbit-ring-1" /><div className="orbit-ring orbit-ring-2" /></div>
          <div className="judgment-ring" />
          <div className="stage-idol"><div className="idol-placeholder">★</div></div>
          {activeNotes.map(an => {
            const pos = getNotePosition(an.note, notes.indexOf(an.note), elapsed)
            const isHold = an.note.type === 'hold'
            const isHeld = an.held
            const isNearCenter = pos.radius < 70
            const laneColors = ['#ff69b4', '#00ced1', '#7fff00']
            const color = laneColors[an.note.lane]
            if (isHold && isHeld) {
              return <div key={an.id} className={`orbit-note hold-note held lane-${an.note.lane}${isNearCenter ? ' near-center' : ''}`} style={{ left: pos.x, top: pos.y, backgroundColor: color, boxShadow: `0 0 20px ${color}, 0 0 40px ${color}` }} />
            } else if (isHold) {
              return <div key={an.id} className={`orbit-note hold-note lane-${an.note.lane}${isNearCenter ? ' near-center' : ''}`} style={{ left: pos.x, top: pos.y, borderColor: color, boxShadow: `0 0 10px ${color}` }} />
            } else {
              return <div key={an.id} className={`orbit-note lane-${an.note.lane}${isNearCenter ? ' near-center' : ''}`} style={{ left: pos.x, top: pos.y, backgroundColor: color, boxShadow: `0 0 15px ${color}, 0 0 30px ${color}` }} />
            }
          })}
          {hitEffects.map(effect => <div key={effect.id} className="hit-effect" style={{ left: effect.x, top: effect.y }} />)}
        </div>
        <div className="key-hints">
          <div className="lane-connector lane-0-connector" />
          <div className="lane-connector lane-1-connector" />
          <div className="lane-connector lane-2-connector" />
          <div className={`key-hint lane-0 ${pressedLanes.has(0) ? 'pressed' : ''}`}>D</div>
          <div className={`key-hint lane-1 ${pressedLanes.has(1) ? 'pressed' : ''}`}>F</div>
          <div className={`key-hint lane-2 ${pressedLanes.has(2) ? 'pressed' : ''}`}>J</div>
        </div>
        <div className="judge-stats"><span className="stat-perfect">P {judgmentCounts.perfect}</span><span className="stat-great">G {judgmentCounts.great}</span><span className="stat-good">OK {judgmentCounts.good}</span><span className="stat-miss">M {judgmentCounts.miss}</span></div>
        <div className="song-progress"><div className="song-progress-fill" style={{ width: progress + '%' }} /></div>
        {comboMilestone && <div className="combo-milestone">{comboMilestone} COMBO!</div>}
        {countdown !== null && (
          <div className="countdown-overlay">
            {countdownText === 'GO' ? (
              <div className="countdown-wrapper">
                <div className="countdown-go-ring" />
                <div className="countdown-go-ring" />
                <div className="countdown-go-ring" />
                <div className="countdown-go">{countdownText}</div>
              </div>
            ) : (
              <div className="countdown-wrapper">
                <div className={`countdown-ring countdown-ring-${countdownText}`} />
                <div key={countdownText} className={`countdown-number num-${countdownText}`}>{countdownText}</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }


  if (view === 'result' && result) {
    const gradeColors: Record<string, string> = { S: '#ffd700', A: '#00ff88', B: '#00ccff', C: '#ff9500', D: '#ff4757' }
    return (
      <div className="result-card">
        <div className="result-card-inner">
          <div className="result-drag-handle" />
          <div className="result-header">
            <div className="result-song-name">{currentSong?.title}</div>
            <div className={`result-grade${resultRevealed ? ' revealed' : ''}`} style={{ color: gradeColors[result.grade], textShadow: '0 0 30px ' + gradeColors[result.grade] }}>{resultRevealed ? result.grade : '?'}</div>
          </div>
          <div className={`result-score${resultRevealed ? ' revealed' : ''}`}>{resultRevealed ? result.score.toLocaleString() : '???'}</div>
          {resultRevealed && previousBestScore > 0 && (
            <div className={`result-score-delta ${result.score > previousBestScore ? 'new-record' : ''}`}>
              {result.score > previousBestScore ? '↑ ' : ''}{Math.abs(result.score - previousBestScore).toLocaleString()} {result.score > previousBestScore ? '新纪录!' : '上次最佳'}
            </div>
          )}
          <div className={`result-stats${resultRevealed ? ' revealed' : ''}`}>
            <div className="result-stat"><span className="stat-label">最大Combo</span><span className="stat-value">{result.max_combo}</span></div>
            <div className="result-stat-row"><span className="stat-p">P {result.perfect_count}</span><span className="stat-g">G {result.great_count}</span><span className="stat-ok">OK {result.good_count}</span><span className="stat-m">M {result.miss_count}</span></div>
          </div>
          <div className={`result-actions${resultRevealed ? ' revealed' : ''}`}>
            <button className="btn-retry" onClick={() => { setView('list'); fetchSongs(); fetchStamina() }}>返回歌曲</button>
            <button className="btn-replay" onClick={() => { if (currentSong) startPlay(currentSong) }}>再来一次</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
