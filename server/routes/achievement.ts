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

// Get all achievements with user's progress
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Get all achievements
    const achievements = db.prepare('SELECT * FROM achievements').all()

    // Get user's achievement progress
    const userAchs = db.prepare(`
      SELECT achievement_id, progress, unlocked, claimed, unlocked_at
      FROM user_achievements
      WHERE user_id = ?
    `).all(userId)

    const userAchMap = new Map(userAchs.map((ua: any) => [ua.achievement_id, ua]))

    // Calculate current progress for each achievement
    const result = achievements.map((ach: any) => {
      const userProgress = userAchMap.get(ach.id)
      const currentProgress = userProgress?.progress || 0
      const unlocked = userProgress?.unlocked || false
      const claimed = userProgress?.claimed || false

      return {
        id: ach.id,
        achievement_key: ach.achievement_key,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        condition_type: ach.condition_type,
        condition_value: ach.condition_value,
        progress: currentProgress,
        unlocked,
        claimed,
        reward_type: ach.reward_type,
        reward_amount: ach.reward_amount,
        unlocked_at: userProgress?.unlocked_at || null
      }
    })

    res.json({ achievements: result })
  } catch (err) {
    console.error('Achievements error:', err)
    res.status(500).json({ error: '获取成就失败' })
  }
})

// Claim achievement reward
router.post('/:id/claim', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const achievementId = parseInt(req.params.id)

    // Get achievement
    const ach = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId) as any
    if (!ach) {
      return res.status(404).json({ error: '成就不存在' })
    }

    // Get user's achievement record
    const userAch = db.prepare(`
      SELECT * FROM user_achievements
      WHERE user_id = ? AND achievement_id = ?
    `).get(userId, achievementId) as any

    if (!userAch) {
      return res.status(400).json({ error: '成就未解锁' })
    }

    if (!userAch.unlocked) {
      return res.status(400).json({ error: '成就未解锁' })
    }

    if (userAch.claimed) {
      return res.status(400).json({ error: '已领取' })
    }

    // Mark as claimed
    db.prepare(`
      UPDATE user_achievements
      SET claimed = TRUE, claimed_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND achievement_id = ?
    `).run(userId, achievementId)

    // Give reward
    giveReward(userId, ach.reward_type, ach.reward_amount)
    saveDb()

    res.json({ success: true, reward: { type: ach.reward_type, amount: ach.reward_amount } })
  } catch (err) {
    console.error('Claim achievement error:', err)
    res.status(500).json({ error: '领取奖励失败' })
  }
})

// Update achievement progress (called by other systems)
export function updateAchievementProgress(userId: number, conditionType: string, value: number) {
  // Find achievements matching this condition type where progress < condition_value
  const achievements = db.prepare(`
    SELECT * FROM achievements
    WHERE condition_type = ? AND condition_value <= ?
  `).all(conditionType, value) as any[]

  for (const ach of achievements) {
    const existing = db.prepare(`
      SELECT * FROM user_achievements
      WHERE user_id = ? AND achievement_id = ?
    `).get(userId, ach.id) as any

    if (existing) {
      if (!existing.unlocked) {
        db.prepare(`
          UPDATE user_achievements
          SET progress = ?, unlocked = TRUE, unlocked_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND achievement_id = ?
        `).run(value, userId, ach.id)
      }
    } else {
      db.prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked, unlocked_at)
        VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
      `).run(userId, ach.id, value)
    }
  }
}

// Check and update achievements based on current stats
export function checkAchievements(userId: number) {
  // Gacha count achievement
  const gachaCount = (db.prepare('SELECT COUNT(*) as count FROM user_gacha_records WHERE user_id = ?').get(userId) as any).count
  updateAchievementProgress(userId, 'gacha_count', gachaCount)

  // Character count achievement
  const charCount = (db.prepare('SELECT COUNT(*) as count FROM user_characters WHERE user_id = ?').get(userId) as any).count
  updateAchievementProgress(userId, 'character_count', charCount)

  // Friend count achievement
  const friendCount = (db.prepare('SELECT COUNT(*) as count FROM friends WHERE user_id = ?').get(userId) as any).count
  updateAchievementProgress(userId, 'friend_count', friendCount)
}

function giveReward(userId: number, rewardType: string, amount: number) {
  switch (rewardType) {
    case 'holy_stone':
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?').run(amount, userId)
      break
    case 'summon_ticket':
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket + ? WHERE user_id = ?').run(amount, userId)
      break
  }
}

export default router
