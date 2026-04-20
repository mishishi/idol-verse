import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'idol-game-secret-key-2024'

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

// 7-day sign-in rewards configuration
const SIGN_IN_REWARDS = [
  { day: 1, type: 'holy_stone', amount: 10 },
  { day: 2, type: 'holy_stone', amount: 15 },
  { day: 3, type: 'summon_ticket', amount: 1 },
  { day: 4, type: 'holy_stone', amount: 20 },
  { day: 5, type: 'holy_stone', amount: 25 },
  { day: 6, type: 'summon_ticket', amount: 1 },
  { day: 7, type: 'holy_stone', amount: 50 }
]

// GET /api/daily/signin - Get sign-in status for current cycle
router.get('/signin', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const today = new Date().toISOString().split('T')[0]

    // Get or create sign-in record for this user
    let record = db.prepare('SELECT * FROM user_signin WHERE user_id = ?').get(userId) as any

    if (!record) {
      // Create new sign-in record
      db.prepare(`
        INSERT INTO user_signin (user_id, current_day, last_signin_date, signed_today)
        VALUES (?, 1, NULL, FALSE)
      `).run(userId)
      record = db.prepare('SELECT * FROM user_signin WHERE user_id = ?').get(userId)
    }

    // Check if it's a new week (Sunday reset)
    const lastDate = record.last_signin_date ? new Date(record.last_signin_date) : null
    const todayDate = new Date(today)
    let currentDay = record.current_day
    let signedToday = record.signed_today

    if (lastDate) {
      const daysSinceLastSignin = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastSignin >= 7) {
        // New week, reset
        currentDay = 1
        signedToday = false
        db.prepare('UPDATE user_signin SET current_day = 1, signed_today = FALSE WHERE user_id = ?').run(userId)
      } else if (daysSinceLastSignin >= 1 && !signedToday) {
        // New day, increment current_day if not signed today
        currentDay = Math.min(record.current_day + 1, 7)
      }
    }

    res.json({
      signed: !!signedToday,
      consecutive_days: currentDay,
      total_days: record.total_signins || 0
    })
  } catch (err) {
    console.error('Get signin status error:', err)
    res.status(500).json({ error: '获取签到状态失败' })
  }
})

// POST /api/daily/signin - Sign in and claim reward
router.post('/signin', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const today = new Date().toISOString().split('T')[0]

    // Get sign-in record
    let record = db.prepare('SELECT * FROM user_signin WHERE user_id = ?').get(userId) as any

    if (!record) {
      // Create new record if doesn't exist
      db.prepare(`
        INSERT INTO user_signin (user_id, current_day, last_signin_date, signed_today, total_signins)
        VALUES (?, 1, ?, TRUE, 1)
      `).run(userId, today)
      saveDb()

      const reward = SIGN_IN_REWARDS[0]
      giveReward(userId, reward.type, reward.amount)

      return res.json({
        success: true,
        signed: true,
        consecutive_days: 1,
        total_days: 1,
        reward: { type: reward.type, amount: reward.amount }
      })
    }

    // Already signed today
    if (record.signed_today && record.last_signin_date === today) {
      return res.status(400).json({ error: '今日已签到' })
    }

    // Calculate new current_day
    const lastDate = record.last_signin_date ? new Date(record.last_signin_date) : null
    const todayDate = new Date(today)
    let newCurrentDay = record.current_day

    if (lastDate) {
      const daysSinceLastSignin = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastSignin >= 7) {
        // New week, reset to day 1
        newCurrentDay = 1
      } else if (daysSinceLastSignin >= 1) {
        // Next day in cycle
        newCurrentDay = Math.min(record.current_day + 1, 7)
      }
      // Same day - no change
    }

    // Update record
    db.prepare(`
      UPDATE user_signin
      SET current_day = ?, last_signin_date = ?, signed_today = TRUE, total_signins = total_signins + 1
      WHERE user_id = ?
    `).run(newCurrentDay, today, userId)
    saveDb()

    // Give reward for current day
    const reward = SIGN_IN_REWARDS[newCurrentDay - 1]
    giveReward(userId, reward.type, reward.amount)
    saveDb()

    res.json({
      success: true,
      signed: true,
      consecutive_days: newCurrentDay,
      total_days: (record.total_signins || 0) + 1,
      reward: { type: reward.type, amount: reward.amount }
    })
  } catch (err) {
    console.error('Signin error:', err)
    res.status(500).json({ error: '签到失败' })
  }
})

// Get today's daily tasks with progress
router.get('/tasks', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const today = new Date().toISOString().split('T')[0]

    // Get all daily tasks
    const tasks = db.prepare('SELECT * FROM daily_tasks').all()

    // Get user's progress for today
    const progressRows = db.prepare(`
      SELECT task_id, progress, claimed
      FROM user_daily_progress
      WHERE user_id = ? AND date = ?
    `).all(userId, today)

    const progressMap = new Map(progressRows.map((p: any) => [p.task_id, p]))

    const result = tasks.map((task: any) => {
      const userProgress = progressMap.get(task.id)
      return {
        id: task.id,
        task_key: task.task_key,
        title: task.title,
        description: task.description,
        target: task.target,
        progress: userProgress?.progress || 0,
        claimed: userProgress?.claimed || false,
        reward_type: task.reward_type,
        reward_amount: task.reward_amount,
        completed: (userProgress?.progress || 0) >= task.target
      }
    })

    res.json({ tasks: result, date: today })
  } catch (err) {
    console.error('Daily tasks error:', err)
    res.status(500).json({ error: '获取每日任务失败' })
  }
})

// Claim daily task reward
router.post('/tasks/:id/claim', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const taskId = parseInt(req.params.id)
    const today = new Date().toISOString().split('T')[0]

    // Get task
    const task = db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(taskId) as any
    if (!task) {
      return res.status(404).json({ error: '任务不存在' })
    }

    // Get user's progress
    const progress = db.prepare(`
      SELECT * FROM user_daily_progress
      WHERE user_id = ? AND task_id = ? AND date = ?
    `).get(userId, taskId, today) as any

    if (!progress) {
      return res.status(400).json({ error: '任务未开始' })
    }

    if (progress.progress < task.target) {
      return res.status(400).json({ error: '任务未完成' })
    }

    if (progress.claimed) {
      return res.status(400).json({ error: '已领取' })
    }

    // Mark as claimed
    db.prepare(`
      UPDATE user_daily_progress
      SET claimed = TRUE, claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND task_id = ? AND date = ?
    `).run(userId, taskId, today)

    // Give reward
    giveReward(userId, task.reward_type, task.reward_amount)
    saveDb()

    res.json({ success: true, reward: { type: task.reward_type, amount: task.reward_amount } })
  } catch (err) {
    console.error('Claim task error:', err)
    res.status(500).json({ error: '领取奖励失败' })
  }
})

// Update daily task progress (called by other systems)
export function updateDailyProgress(userId: number, taskKey: string, amount: number = 1) {
  const today = new Date().toISOString().split('T')[0]

  const task = db.prepare('SELECT * FROM daily_tasks WHERE task_key = ?').get(taskKey) as any
  if (!task) return

  const existing = db.prepare(`
    SELECT * FROM user_daily_progress
    WHERE user_id = ? AND task_id = ? AND date = ?
  `).get(userId, task.id, today) as any

  if (existing) {
    if (!existing.claimed) {
      db.prepare(`
        UPDATE user_daily_progress
        SET progress = progress + ?
        WHERE user_id = ? AND task_id = ? AND date = ?
      `).run(amount, userId, task.id, today)
    }
  } else {
    db.prepare(`
      INSERT INTO user_daily_progress (user_id, task_id, progress, date)
      VALUES (?, ?, ?, ?)
    `).run(userId, task.id, amount, today)
  }
}

function giveReward(userId: number, rewardType: string, amount: number) {
  switch (rewardType) {
    case 'holy_stone':
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?').run(amount, userId)
      break
    case 'summon_ticket':
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket + ? WHERE user_id = ?').run(amount, userId)
      break
    case 'fragment':
      // Give fragments of a random character the user has
      // For now, skip - would need to pick a specific character
      break
    case 'character_ticket_sr':
    case 'character_ticket_ur':
      // These are handled separately as special tickets
      break
  }
}

export default router
