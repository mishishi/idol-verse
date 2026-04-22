import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'
import { checkAchievements, updateAchievementProgress } from './achievement'

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

// Update pass mission progress (always records regardless of pass status)
function updatePassMissionProgress(userId: number, targetType: string, missionPassType: string = 'monthly') {
  const mission = db.prepare('SELECT * FROM pass_missions WHERE pass_type = ? AND target_type = ?').get(missionPassType, targetType) as any
  if (!mission) return
  // Use mission's pass_type for progress record so claim queries work
  const existing = db.prepare('SELECT * FROM user_pass_progress WHERE user_id = ? AND mission_id = ? AND pass_type = ?').get(userId, mission.id, mission.pass_type) as any
  if (existing) {
    db.prepare('UPDATE user_pass_progress SET progress = ? WHERE user_id = ? AND mission_id = ? AND pass_type = ?').run(existing.progress + 1, userId, mission.id, mission.pass_type)
  } else {
    db.prepare('INSERT INTO user_pass_progress (user_id, mission_id, progress, claimed, pass_type) VALUES (?, ?, 1, FALSE, ?)').run(userId, mission.id, mission.pass_type)
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需在3-20之间' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度需至少6位' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const today = new Date().toISOString().split('T')[0]

    const stmt = db.prepare('INSERT INTO users (username, password_hash, login_streak, last_login_date, total_login_days) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(username, passwordHash, 1, today, 1)

    const userId = result.lastInsertRowid

    // Create user currency record
    const currencyStmt = db.prepare('INSERT INTO user_currency (user_id, holy_stone, summon_ticket, stamina) VALUES (?, ?, ?, ?)')
    currencyStmt.run(userId, 5000, 10, 100)

    // Update daily login task and pass mission progress
    updateDailyProgress(userId, 'login', 1)
    updatePassMissionProgress(userId, 'login', 'monthly')

    saveDb() // Persist to disk

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: userId, username },
      streak: {
        current: 1,
        bonus: { holy_stone: 10, summon_ticket: 0, type: 'daily' },
        message: '欢迎新玩家！',
        total_days: 1
      }
    })
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: '用户名已存在' })
    }
    console.error('Register error:', err)
    res.status(500).json({ error: '注册失败' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
    const user = stmt.get(username) as any

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' })

    // Update daily login task and pass mission progress
    updateDailyProgress(user.id, 'login', 1)
    updatePassMissionProgress(user.id, 'login')

    // Calculate login streak
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lastLogin = user.last_login_date || null

    let newStreak = 1
    let streakBonus = { holy_stone: 10, summon_ticket: 0, type: 'daily' }
    let streakMessage = ''

    if (lastLogin === today) {
      // Already logged in today, no streak bonus
      newStreak = user.login_streak || 1
    } else if (lastLogin === yesterday) {
      // Consecutive day - increment streak
      newStreak = (user.login_streak || 0) + 1
      streakBonus = getStreakBonus(newStreak)
      streakMessage = getStreakMessage(newStreak)
    } else {
      // Missed days or first login - reset streak
      newStreak = 1
      streakBonus = getStreakBonus(1)
      streakMessage = getStreakMessage(1)
    }

    // Award streak bonus
    if (streakBonus.holy_stone > 0 || streakBonus.summon_ticket > 0) {
      const curr = db.prepare('SELECT * FROM user_currency WHERE user_id = ?').get(user.id) as any
      if (curr) {
        const newHolyStone = (curr.holy_stone || 0) + streakBonus.holy_stone
        const newTickets = (curr.summon_ticket || 0) + streakBonus.summon_ticket
        db.prepare('UPDATE user_currency SET holy_stone = ?, summon_ticket = ? WHERE user_id = ?').run(newHolyStone, newTickets, user.id)
      }
    }

    // Update user login streak info
    const newTotalDays = (user.total_login_days || 0) + (lastLogin !== today ? 1 : 0)
    db.prepare('UPDATE users SET login_streak = ?, last_login_date = ?, total_login_days = ? WHERE id = ?').run(newStreak, today, newTotalDays, user.id)

    // Record login in login_records table
    db.prepare('INSERT OR REPLACE INTO user_login_records (user_id, login_date, login_streak) VALUES (?, ?, ?)').run(user.id, today, newStreak)

    // Update login_days achievements
    updateAchievementProgress(user.id, 'login_days', newStreak)
    // Also check other achievements
    checkAchievements(user.id)

    saveDb()

    res.json({
      token,
      user: { id: user.id, username: user.username },
      streak: {
        current: newStreak,
        bonus: streakBonus,
        message: streakMessage,
        total_days: newTotalDays
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

// Get streak bonus based on streak length
function getStreakBonus(streak: number): { holy_stone: number; summon_ticket: number; type: string } {
  if (streak >= 30) return { holy_stone: 100, summon_ticket: 5, type: 'legend' }
  if (streak >= 14) return { holy_stone: 60, summon_ticket: 3, type: 'epic' }
  if (streak >= 7) return { holy_stone: 50, summon_ticket: 3, type: 'weekly' }
  if (streak >= 5) return { holy_stone: 30, summon_ticket: 2, type: 'extended' }
  if (streak >= 3) return { holy_stone: 20, summon_ticket: 1, type: 'bonus' }
  if (streak >= 2) return { holy_stone: 15, summon_ticket: 0, type: 'consecutive' }
  return { holy_stone: 10, summon_ticket: 0, type: 'daily' }
}

function getStreakMessage(streak: number): string {
  if (streak >= 30) return `🎊 传奇登录！连续登录${streak}天！`
  if (streak >= 14) return `⭐ 史诗登录！连续登录${streak}天！`
  if (streak >= 7) return `🌟 一周登录！连续登录${streak}天！`
  if (streak >= 5) return `✨ extended登录！连续登录${streak}天！`
  if (streak >= 3) return `💫 连续登录${streak}天！`
  if (streak >= 2) return `🔥 连续登录${streak}天！`
  return `欢迎回来！`
}

// GET /api/auth/login-records - Get login records for a month (for calendar UI)
router.get('/login-records', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { year, month } = req.query

    const now = new Date()
    const targetYear = year ? parseInt(year as string) : now.getFullYear()
    const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1 // 1-indexed

    // Get start and end of month
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0] // Last day of month

    const records = db.prepare(`
      SELECT login_date, login_streak
      FROM user_login_records
      WHERE user_id = ? AND login_date >= ? AND login_date <= ?
      ORDER BY login_date
    `).all(userId, startDate, endDate) as any[]

    // Get current streak info
    const user = db.prepare('SELECT login_streak, total_login_days FROM users WHERE id = ?').get(userId) as any

    res.json({
      records: records.map(r => r.login_date),
      current_streak: user?.login_streak || 0,
      total_login_days: user?.total_login_days || 0,
      year: targetYear,
      month: targetMonth
    })
  } catch (err) {
    console.error('Get login records error:', err)
    res.status(500).json({ error: '获取登录记录失败' })
  }
})

// Check username availability (no auth required)
router.get('/check-username', (req, res) => {
  const { username } = req.query
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ available: false, error: '用户名不能为空' })
  }
  if (username.length < 3 || username.length > 20) {
    return res.json({ available: false })
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  res.json({ available: !existing })
})

export default router
