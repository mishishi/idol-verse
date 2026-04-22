import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'
import { updateAchievementProgress } from './achievement'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'idol-game-secret-key-2024'

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: '未授权' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: '无效的token' })
  }
}

// GET /api/rhythm/songs - Get all songs with user's best stats
router.get('/songs', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    const songs = db.prepare(`
      SELECT rs.*,
             COALESCE(rus.best_score, 0) as best_score,
             COALESCE(rus.best_grade, 'D') as best_grade,
             COALESCE(rus.play_count, 0) as play_count
      FROM rhythm_songs rs
      LEFT JOIN rhythm_user_stats rus ON rus.song_id = rs.id AND rus.user_id = ?
      ORDER BY rs.id
    `).all(userId) as any[]

    // Calculate duration from last note time for each song
    const songsWithDuration = songs.map(song => {
      let duration = 60 // default 60s
      try {
        const notesData = JSON.parse(song.notes_data)
        if (Array.isArray(notesData) && notesData.length > 0) {
          const lastNote = notesData[notesData.length - 1]
          const lastNoteTime = lastNote.time || 0
          const holdDuration = lastNote.duration || 0
          duration = Math.ceil((lastNoteTime + holdDuration + 2000) / 1000)
        }
      } catch (e) {
        // use default
      }
      return { ...song, duration }
    })

    res.json({ songs: songsWithDuration })

    res.json({ songs })
  } catch (err) {
    console.error('Get songs error:', err)
    res.status(500).json({ error: '获取歌曲列表失败' })
  }
})

// POST /api/rhythm/play/:songId - Start a play session (deduct stamina)
router.post('/play/:songId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const songId = parseInt(req.params.songId)
    const STAMINA_COST = 20

    // Check song exists
    const song = db.prepare('SELECT * FROM rhythm_songs WHERE id = ?').get(songId) as any
    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' })
    }

    // Check stamina
    const currency = db.prepare('SELECT stamina FROM user_currency WHERE user_id = ?').get(userId) as any
    if (!currency || currency.stamina < STAMINA_COST) {
      return res.status(400).json({ error: '体力不足' })
    }

    // Deduct stamina
    db.prepare('UPDATE user_currency SET stamina = stamina - ? WHERE user_id = ?').run(STAMINA_COST, userId)

    // Increase play count
    const existing = db.prepare('SELECT play_count FROM rhythm_user_stats WHERE user_id = ? AND song_id = ?').get(userId, songId) as any
    if (existing) {
      db.prepare('UPDATE rhythm_user_stats SET play_count = play_count + 1 WHERE user_id = ? AND song_id = ?').run(userId, songId)
    } else {
      db.prepare('INSERT INTO rhythm_user_stats (user_id, song_id, play_count) VALUES (?, ?, 1)').run(userId, songId)
    }

    // Update daily task progress
    updateDailyProgress(userId, 'rhythm_play', 1)

    saveDb()

    res.json({
      success: true,
      message: '演奏开始',
      stamina_remaining: currency.stamina - STAMINA_COST,
      song: {
        id: song.id,
        title: song.title,
        difficulty: song.difficulty,
        bpm: song.bpm,
        notes_data: JSON.parse(song.notes_data)
      }
    })
  } catch (err) {
    console.error('Start play error:', err)
    res.status(500).json({ error: '开始演奏失败' })
  }
})

// POST /api/rhythm/score/:songId - Submit score
router.post('/score/:songId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const songId = parseInt(req.params.songId)
    const {
      score,
      perfect_count,
      great_count,
      good_count,
      miss_count,
      max_combo,
      grade
    } = req.body

    if (score === undefined || !grade) {
      return res.status(400).json({ error: '成绩数据不完整' })
    }

    // Validate counts are non-negative integers
    const p = Number(perfect_count) || 0
    const g = Number(great_count) || 0
    const ok = Number(good_count) || 0
    const m = Number(miss_count) || 0

    if (p < 0 || g < 0 || ok < 0 || m < 0) {
      return res.status(400).json({ error: '判定数量不能为负' })
    }

    // Recalculate grade from counts to prevent manipulation
    const total = p + g + ok + m
    const accuracy = total > 0
      ? (p * 100 + g * 70 + ok * 40) / (total * 100)
      : 0

    let calculatedGrade = 'D'
    if (accuracy >= 0.95 && m === 0) calculatedGrade = 'S'
    else if (accuracy >= 0.85) calculatedGrade = 'A'
    else if (accuracy >= 0.70) calculatedGrade = 'B'
    else if (accuracy >= 0.50) calculatedGrade = 'C'

    // Use calculated grade if client grade is better (prevent downgrade attacks)
    const finalGrade = gradeBetter(grade, calculatedGrade) ? grade : calculatedGrade

    // Check song exists
    const song = db.prepare('SELECT * FROM rhythm_songs WHERE id = ?').get(songId) as any
    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' })
    }

    // Insert score record
    db.prepare(`
      INSERT INTO rhythm_scores (user_id, song_id, score, perfect_count, great_count, good_count, miss_count, max_combo, grade)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, songId, score, p, g, ok, m, max_combo || 0, finalGrade)

    // Update best stats
    const existing = db.prepare('SELECT * FROM rhythm_user_stats WHERE user_id = ? AND song_id = ?').get(userId, songId) as any
    if (existing) {
      if (score > existing.best_score) {
        db.prepare('UPDATE rhythm_user_stats SET best_score = ?, best_grade = ? WHERE user_id = ? AND song_id = ?').run(score, finalGrade, userId, songId)
      } else if (score === existing.best_score && gradeBetter(finalGrade, existing.best_grade)) {
        db.prepare('UPDATE rhythm_user_stats SET best_grade = ? WHERE user_id = ? AND song_id = ?').run(finalGrade, userId, songId)
      }
    } else {
      db.prepare('INSERT INTO rhythm_user_stats (user_id, song_id, best_score, best_grade, play_count) VALUES (?, ?, ?, ?, 1)').run(userId, songId, score, finalGrade)
    }

    // Calculate rewards based on finalGrade
    let holyStoneReward = 0
    let ticketReward = 0

    switch (finalGrade) {
      case 'S':
        holyStoneReward = 30
        ticketReward = 1
        break
      case 'A':
        holyStoneReward = 20
        break
      case 'B':
        holyStoneReward = 10
        break
      case 'C':
        holyStoneReward = 5
        break
      // D: no reward
    }

    if (holyStoneReward > 0) {
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?').run(holyStoneReward, userId)
    }
    if (ticketReward > 0) {
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket + ? WHERE user_id = ?').run(ticketReward, userId)
    }

    // Update rhythm_count achievements
    const totalPlays = (db.prepare('SELECT SUM(play_count) as total FROM rhythm_user_stats WHERE user_id = ?').get(userId) as any).total || 0
    updateAchievementProgress(userId, 'rhythm_count', totalPlays)

    saveDb()

    res.json({
      success: true,
      grade: finalGrade,
      rewards: {
        holy_stone: holyStoneReward,
        summon_ticket: ticketReward
      }
    })
  } catch (err) {
    console.error('Submit score error:', err)
    res.status(500).json({ error: '提交成绩失败' })
  }
})

// GET /api/rhythm/best/:songId - Get user's best score for a song
router.get('/best/:songId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const songId = parseInt(req.params.songId)

    const stats = db.prepare('SELECT * FROM rhythm_user_stats WHERE user_id = ? AND song_id = ?').get(userId, songId) as any

    res.json({
      best_score: stats?.best_score || 0,
      best_grade: stats?.best_grade || 'D',
      play_count: stats?.play_count || 0
    })
  } catch (err) {
    console.error('Get best score error:', err)
    res.status(500).json({ error: '获取最佳成绩失败' })
  }
})

// Helper function to compare grades
function gradeBetter(newGrade: string, existingGrade: string): boolean {
  const order = ['S', 'A', 'B', 'C', 'D']
  return order.indexOf(newGrade) < order.indexOf(existingGrade)
}

// GET /api/rhythm/leaderboard - Get global leaderboard
router.get('/leaderboard', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { song_id } = req.query
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

    // Get all songs for ranking context
    const songs = db.prepare('SELECT id, title FROM rhythm_songs').all() as any[]
    const songIds = songs.map(s => s.id)

    let query: string
    let params: any[]

    if (song_id) {
      // Per-song leaderboard
      query = `
        SELECT rus.user_id, rus.song_id, rus.best_score, rus.best_grade, rus.play_count,
               u.username,
               RANK() OVER (ORDER BY rus.best_score DESC) as rank
        FROM rhythm_user_stats rus
        JOIN users u ON u.id = rus.user_id
        WHERE rus.song_id = ?
        ORDER BY rus.best_score DESC
        LIMIT ?
      `
      params = [song_id, limit]
    } else {
      // Global leaderboard - total score across all songs
      query = `
        SELECT rus.user_id,
               SUM(rus.best_score) as total_score,
               MAX(rus.best_grade) as best_grade,
               SUM(rus.play_count) as total_plays,
               u.username,
               RANK() OVER (ORDER BY SUM(rus.best_score) DESC) as rank
        FROM rhythm_user_stats rus
        JOIN users u ON u.id = rus.user_id
        GROUP BY rus.user_id
        ORDER BY total_score DESC
        LIMIT ?
      `
      params = [limit]
    }

    const leaderboard = db.prepare(query).all(...params) as any[]

    // Get user's rank if not in top results
    let myRank = null
    const isInTop = leaderboard.some(entry => entry.user_id === userId)

    if (!isInTop) {
      if (song_id) {
        const myStats = db.prepare(`
          SELECT RANK() OVER (ORDER BY best_score DESC) as rank
          FROM rhythm_user_stats
          WHERE user_id = ? AND song_id = ?
        `).get(userId, song_id) as any
        myRank = myStats?.rank || null
      } else {
        const myStats = db.prepare(`
          SELECT RANK() OVER (ORDER BY total_score DESC) as rank FROM (
            SELECT user_id, SUM(best_score) as total_score
            FROM rhythm_user_stats
            GROUP BY user_id
          ) WHERE user_id = ?
        `).get(userId) as any
        myRank = myStats?.rank || null
      }
    }

    res.json({
      leaderboard: leaderboard.map(entry => ({
        rank: entry.rank,
        user_id: entry.user_id,
        username: entry.username,
        score: song_id ? entry.best_score : entry.total_score,
        best_grade: entry.best_grade,
        plays: song_id ? entry.play_count : entry.total_plays,
        is_me: entry.user_id === userId
      })),
      my_rank: myRank,
      song_id: song_id || null
    })
  } catch (err) {
    console.error('Get leaderboard error:', err)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

export default router