import { useState, useCallback, useRef, useEffect } from 'react'

export interface Note {
  time: number
  lane: number
}

export interface JudgmentResult {
  noteIndex: number
  judgment: 'perfect' | 'great' | 'good' | 'miss'
  delta: number
}

export interface PlayResult {
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
const GOOD_WINDOW = 220
const SCROLL_SPEED = 400 // pixels per second

export function useRhythmGame() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNotes, setActiveNotes] = useState<{ note: Note; y: number; hit: boolean }[]>([])
  const [currentCombo, setCurrentCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [judgmentCounts, setJudgmentCounts] = useState({ perfect: 0, great: 0, good: 0, miss: 0 })

  const animationRef = useRef<number | null>(null)
  const hitNotesRef = useRef<Set<number>>(new Set())

  const startGame = useCallback((notesData: Note[]) => {
    setNotes(notesData)
    setActiveNotes([])
    setCurrentCombo(0)
    setMaxCombo(0)
    setScore(0)
    setJudgmentCounts({ perfect: 0, great: 0, good: 0, miss: 0 })
    hitNotesRef.current.clear()
    setStartTime(Date.now())
    setIsPlaying(true)
  }, [])

  const updateFrame = useCallback((currentTime: number) => {
    if (!isPlaying) return

    const elapsed = currentTime - startTime
    const LANE_HEIGHT = 600 // pixels, matching CSS

    // Calculate which notes should be visible based on scroll speed
    // Notes are visible for (LANE_HEIGHT / SCROLL_SPEED) seconds = ~1.5s
    // They should appear at y = -note_travel_time and move down to judgment zone at ~80% height

    const newActiveNotes: { note: Note; y: number; hit: boolean }[] = []
    const JUDGMENT_Y = LANE_HEIGHT * 0.8

    // Calculate travel time for notes to go from spawn to judgment line
    const travelTime = JUDGMENT_Y / SCROLL_SPEED * 1000 // ms

    notes.forEach((note, index) => {
      if (hitNotesRef.current.has(index)) return

      const noteTargetTime = note.time // when note should hit judgment line
      const noteY = JUDGMENT_Y - ((noteTargetTime - elapsed) / 1000) * SCROLL_SPEED

      // Show note if it's within visible range
      if (noteY > -80 && noteY < LANE_HEIGHT + 80) {
        newActiveNotes.push({ note, y: noteY, hit: false })
      }
    })

    setActiveNotes(newActiveNotes)

    // Check for missed notes (past judgment window)
    const missedIndices: number[] = []
    notes.forEach((note, index) => {
      if (hitNotesRef.current.has(index)) return
      if (elapsed > note.time + GOOD_WINDOW) {
        missedIndices.push(index)
        hitNotesRef.current.add(index)
      }
    })

    if (missedIndices.length > 0) {
      setCurrentCombo(0)
      setJudgmentCounts(prev => ({ ...prev, miss: prev.miss + missedIndices.length }))
    }

    // Continue animation
    if (newActiveNotes.length > 0 || notes.some((n, i) => !hitNotesRef.current.has(i) && elapsed < n.time + 2000)) {
      animationRef.current = requestAnimationFrame(updateFrame)
    }
  }, [isPlaying, startTime, notes])

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateFrame)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, updateFrame])

  const hitNote = useCallback((lane: number): JudgmentResult | null => {
    if (!isPlaying) return null

    const elapsed = Date.now() - startTime
    let bestResult: JudgmentResult | null = null
    let bestDelta = Infinity

    // Find the closest unhit note in this lane
    notes.forEach((note, index) => {
      if (hitNotesRef.current.has(index)) return
      if (note.lane !== lane) return

      const delta = Math.abs(elapsed - note.time)
      if (delta < bestDelta && delta <= GOOD_WINDOW) {
        bestDelta = delta
        let judgment: 'perfect' | 'great' | 'good' = 'good'
        if (delta <= PERFECT_WINDOW) judgment = 'perfect'
        else if (delta <= GREAT_WINDOW) judgment = 'great'

        bestResult = { noteIndex: index, judgment, delta }
      }
    })

    if (bestResult) {
      hitNotesRef.current.add(bestResult.noteIndex)

      // Calculate score based on judgment
      const scoreMap = { perfect: 100, great: 70, good: 40, miss: 0 }
      setScore(prev => prev + scoreMap[bestResult!.judgment])

      setCurrentCombo(prev => {
        const newCombo = prev + 1
        setMaxCombo(prev => Math.max(prev, newCombo))
        return newCombo
      })

      setJudgmentCounts(prev => ({
        ...prev,
        [bestResult!.judgment]: prev[bestResult!.judgment] + 1
      }))

      // Remove from active notes
      setActiveNotes(prev => prev.filter(an => an.note.time !== notes[bestResult!.noteIndex].time || an.note.lane !== lane))
    }

    return bestResult
  }, [isPlaying, startTime, notes])

  const endGame = useCallback((): PlayResult => {
    setIsPlaying(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const counts = judgmentCounts
    const total = counts.perfect + counts.great + counts.good + counts.miss
    const accuracy = total > 0
      ? (counts.perfect * 100 + counts.great * 70 + counts.good * 40) / (total * 100)
      : 0

    let grade = 'D'
    if (accuracy >= 0.95 && counts.miss === 0) grade = 'S'
    else if (accuracy >= 0.85) grade = 'A'
    else if (accuracy >= 0.70) grade = 'B'
    else if (accuracy >= 0.50) grade = 'C'

    return {
      score,
      perfect_count: counts.perfect,
      great_count: counts.great,
      good_count: counts.good,
      miss_count: counts.miss,
      max_combo: maxCombo,
      grade
    }
  }, [judgmentCounts, score, maxCombo])

  return {
    isPlaying,
    activeNotes,
    currentCombo,
    maxCombo,
    score,
    startGame,
    hitNote,
    endGame
  }
}