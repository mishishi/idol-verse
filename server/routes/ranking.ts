import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'idol-game-secret-key-2024'

// Update pass mission progress
function updatePassMissionProgress(userId: number, targetType: string) {
  const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any
  if (!userPass || new Date(userPass.expires_at) <= new Date()) return
  const mission = db.prepare("SELECT * FROM pass_missions WHERE pass_type = 'monthly' AND target_type = ?").get(targetType) as any
  if (!mission) return
  // Use mission's pass_type for progress record so claim queries work
  const existing = db.prepare('SELECT * FROM user_pass_progress WHERE user_id = ? AND mission_id = ? AND pass_type = ?').get(userId, mission.id, mission.pass_type) as any
  if (existing) {
    db.prepare('UPDATE user_pass_progress SET progress = ? WHERE user_id = ? AND mission_id = ? AND pass_type = ?').run(existing.progress + 1, userId, mission.id, mission.pass_type)
  } else {
    db.prepare('INSERT INTO user_pass_progress (user_id, mission_id, progress, claimed, pass_type) VALUES (?, ?, 1, FALSE, ?)').run(userId, mission.id, mission.pass_type)
  }
}

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

// Get week boundaries (Sunday 00:00 to Saturday 23:59)
function getWeekBounds() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0]
  }
}

// GET /api/ranking/idol-weekly - Get idol weekly ranking
router.get('/idol-weekly', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { weekStart, weekEnd } = getWeekBounds()

    // Get all characters with their weekly support totals (show all idols, even with 0 support)
    // Aggregate by character_id to sum all users' support for each idol
    // Use ROW_NUMBER() instead of RANK() to avoid ties showing the same rank number
    const rankings = db.prepare(`
      SELECT c.character_id, COALESCE(ws.total_amount, 0) as amount, c.name, c.rarity, c.image_path,
             ROW_NUMBER() OVER (ORDER BY COALESCE(ws.total_amount, 0) DESC, c.character_id) as rank
      FROM characters c
      LEFT JOIN (
        SELECT character_id, SUM(amount) as total_amount
        FROM idol_weekly_support
        GROUP BY character_id
      ) ws ON ws.character_id = c.character_id
      ORDER BY amount DESC, c.character_id
    `).all()

    // Get user's total support across all idols
    const myTotalSupport = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM idol_weekly_support
      WHERE user_id = ?
    `).get(userId) as any

    // Get user's rank among all users by total support
    const userTotalSupport = myTotalSupport.total || 0
    const userRankResult = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM (
        SELECT user_id, SUM(amount) as total_amount
        FROM idol_weekly_support
        GROUP BY user_id
        HAVING SUM(amount) > ?
      ) user_totals
    `).get(userTotalSupport) as any

    // Get top 3 for crown/medal display (only idols with actual support)
    const top3 = rankings.filter((r: any) => r.amount > 0).slice(0, 3).map((r: any) => r.character_id)

    res.json({
      rankings,
      top3,
      my_total_support: userTotalSupport,
      my_rank: userRankResult?.rank || 0,
      week_start: weekStart,
      week_end: weekEnd
    })
  } catch (err) {
    console.error('Get idol weekly ranking error:', err)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

// POST /api/ranking/support/:characterId - Support an idol
router.post('/support/:characterId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { characterId } = req.params
    const { amount } = req.body

    if (!amount || amount < 1) {
      return res.status(400).json({ error: '请输入有效的应援数量' })
    }

    // Check character exists
    const character = db.prepare('SELECT * FROM characters WHERE character_id = ?').get(characterId) as any
    if (!character) {
      return res.status(404).json({ error: '偶像不存在' })
    }

    // Check user currency
    const currency = db.prepare('SELECT holy_stone FROM user_currency WHERE user_id = ?').get(userId) as any
    if (!currency || currency.holy_stone < amount) {
      return res.status(400).json({ error: '圣像石不足' })
    }

    // Deduct holy stones
    db.prepare('UPDATE user_currency SET holy_stone = holy_stone - ? WHERE user_id = ?').run(amount, userId)

    // Update or insert weekly support record
    const existing = db.prepare('SELECT * FROM idol_weekly_support WHERE character_id = ? AND user_id = ?').get(characterId, userId) as any
    if (existing) {
      db.prepare('UPDATE idol_weekly_support SET amount = amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(amount, existing.id)
    } else {
      db.prepare('INSERT INTO idol_weekly_support (character_id, user_id, amount) VALUES (?, ?, ?)').run(characterId, userId, amount)
    }

    // Record transaction
    db.prepare('INSERT INTO support_transactions (character_id, user_id, amount) VALUES (?, ?, ?)').run(characterId, userId, amount)

    // Get updated weekly total for this idol
    const idolTotal = db.prepare('SELECT amount FROM idol_weekly_support WHERE character_id = ?').get(characterId) as any

    // Get user's remaining holy stones
    const updatedCurrency = db.prepare('SELECT holy_stone FROM user_currency WHERE user_id = ?').get(userId) as any

    // Update pass mission progress
    updatePassMissionProgress(userId, 'support')

    saveDb()

    res.json({
      success: true,
      message: `成功为 ${character.name} 应援 ${amount}！`,
      idol_total: idolTotal?.amount || 0,
      remaining_holy_stone: updatedCurrency?.holy_stone || 0
    })
  } catch (err) {
    console.error('Support idol error:', err)
    res.status(500).json({ error: '应援失败' })
  }
})

// GET /api/ranking/my-support/:characterId - Get user's support for a specific idol
router.get('/my-support/:characterId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { characterId } = req.params

    const support = db.prepare('SELECT amount, updated_at FROM idol_weekly_support WHERE character_id = ? AND user_id = ?').get(characterId, userId) as any

    res.json({
      character_id: characterId,
      amount: support?.amount || 0,
      supported_at: support?.updated_at || null
    })
  } catch (err) {
    console.error('Get my support error:', err)
    res.status(500).json({ error: '获取应援记录失败' })
  }
})

// GET /api/ranking/my-supports - Get all my supports this week
router.get('/my-supports', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    const supports = db.prepare(`
      SELECT ws.character_id, ws.amount, ws.updated_at, c.name, c.rarity, c.image_path
      FROM idol_weekly_support ws
      JOIN characters c ON c.character_id = ws.character_id
      WHERE ws.user_id = ? AND ws.amount > 0
      ORDER BY ws.amount DESC
    `).all(userId)

    const total = supports.reduce((sum: number, s: any) => sum + s.amount, 0)

    res.json({ supports, total })
  } catch (err) {
    console.error('Get my supports error:', err)
    res.status(500).json({ error: '获取应援记录失败' })
  }
})

// GET /api/ranking/friends - Get friend comparison leaderboard
router.get('/friends', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Get user's stats
    const userStats = db.prepare(`
      SELECT u.id, u.username, u.total_login_days, u.login_streak,
             COUNT(DISTINCT uc.id) as total_characters,
             SUM(CASE WHEN c.rarity = 'UR' THEN 1 ELSE 0 END) as ur_count,
             SUM(CASE WHEN c.rarity = 'SSR' THEN 1 ELSE 0 END) as ssr_count,
             SUM(CASE WHEN c.rarity = 'SR' THEN 1 ELSE 0 END) as sr_count,
             SUM(CASE WHEN c.rarity = 'R' THEN 1 ELSE 0 END) as r_count,
             (SELECT holy_stone FROM user_currency WHERE user_id = u.id) as holy_stone
      FROM users u
      LEFT JOIN user_characters uc ON uc.user_id = u.id
      LEFT JOIN characters c ON c.character_id = uc.character_id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(userId) as any

    // Get friend IDs
    const friends = db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
      WHERE f.user_id = ? OR f.friend_id = ?
    `).all(userId, userId, userId) as any[]

    const friendIds = friends.map((f: any) => f.id)

    if (friendIds.length === 0) {
      return res.json({
        my_rank: 1,
        leaderboard: [
          {
            rank: 1,
            user_id: userStats.id,
            username: userStats.username,
            total_characters: userStats.total_characters || 0,
            ur_count: userStats.ur_count || 0,
            ssr_count: userStats.ssr_count || 0,
            sr_count: userStats.sr_count || 0,
            total_login_days: userStats.total_login_days || 0,
            login_streak: userStats.login_streak || 0,
            is_me: true
          }
        ]
      })
    }

    // Get friends' stats
    const friendStats = db.prepare(`
      SELECT u.id, u.username, u.total_login_days, u.login_streak,
             COUNT(DISTINCT uc.id) as total_characters,
             SUM(CASE WHEN c.rarity = 'UR' THEN 1 ELSE 0 END) as ur_count,
             SUM(CASE WHEN c.rarity = 'SSR' THEN 1 ELSE 0 END) as ssr_count,
             SUM(CASE WHEN c.rarity = 'SR' THEN 1 ELSE 0 END) as sr_count,
             SUM(CASE WHEN c.rarity = 'R' THEN 1 ELSE 0 END) as r_count,
             (SELECT holy_stone FROM user_currency WHERE user_id = u.id) as holy_stone
      FROM users u
      LEFT JOIN user_characters uc ON uc.user_id = u.id
      LEFT JOIN characters c ON c.character_id = uc.character_id
      WHERE u.id IN (${friendIds.map(() => '?').join(',')})
      GROUP BY u.id
    `).all(...friendIds) as any[]

    // Combine user and friends, sort by score (UR*100 + SSR*50 + SR*20 + R*5 + total_login_days)
    const allStats = [
      {
        user_id: userStats.id,
        username: userStats.username,
        total_characters: userStats.total_characters || 0,
        ur_count: userStats.ur_count || 0,
        ssr_count: userStats.ssr_count || 0,
        sr_count: userStats.sr_count || 0,
        r_count: userStats.r_count || 0,
        total_login_days: userStats.total_login_days || 0,
        login_streak: userStats.login_streak || 0,
        holy_stone: userStats.holy_stone || 0,
        is_me: true
      },
      ...friendStats.map((f: any) => ({
        user_id: f.id,
        username: f.username,
        total_characters: f.total_characters || 0,
        ur_count: f.ur_count || 0,
        ssr_count: f.ssr_count || 0,
        sr_count: f.sr_count || 0,
        r_count: f.r_count || 0,
        total_login_days: f.total_login_days || 0,
        login_streak: f.login_streak || 0,
        holy_stone: f.holy_stone || 0,
        is_me: false
      }))
    ]

    // Sort by score: UR*100 + SSR*50 + SR*20 + R*5 + total_login_days
    allStats.sort((a, b) => {
      const scoreA = a.ur_count * 100 + a.ssr_count * 50 + a.sr_count * 20 + a.r_count * 5 + a.total_login_days
      const scoreB = b.ur_count * 100 + b.ssr_count * 50 + b.sr_count * 20 + b.r_count * 5 + b.total_login_days
      return scoreB - scoreA
    })

    // Assign ranks
    const leaderboard = allStats.map((s, idx) => ({ ...s, rank: idx + 1 }))
    const myRank = leaderboard.findIndex((l) => l.is_me) + 1

    res.json({ my_rank: myRank, leaderboard })
  } catch (err) {
    console.error('Get friends leaderboard error:', err)
    res.status(500).json({ error: '获取好友排行榜失败' })
  }
})

export default router
