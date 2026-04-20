import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'

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

// Update pass mission progress for a given target_type
export function updatePassMissionProgress(userId: number, targetType: string) {
  const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any
  if (!userPass || new Date(userPass.expires_at) <= new Date()) return // no active pass

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

// GET /api/pass/status - Get pass status
router.get('/status', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any

    if (!userPass) {
      return res.json({
        active: false,
        pass_type: null,
        days_remaining: 0,
        expires_at: null
      })
    }

    const now = new Date()
    const expiresAt = new Date(userPass.expires_at)
    const active = expiresAt > now

    if (!active) {
      return res.json({
        active: false,
        pass_type: null,
        days_remaining: 0,
        expires_at: userPass.expires_at
      })
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const today = new Date().toISOString().split('T')[0]
    const todayClaim = db.prepare(`
      SELECT id FROM pass_daily_claims WHERE user_id = ? AND claim_date = ? AND pass_type = ?
    `).get(userId, today, userPass.pass_type)
    const dailyClaimed = !!todayClaim

    res.json({
      active: true,
      pass_type: userPass.pass_type,
      days_remaining: daysRemaining,
      expires_at: userPass.expires_at,
      activated_at: userPass.activated_at,
      daily_claimed: dailyClaimed
    })
  } catch (err) {
    console.error('Get pass status error:', err)
    res.status(500).json({ error: '获取通行证状态失败' })
  }
})

// POST /api/pass/claim-daily - Claim daily pass reward
router.post('/claim-daily', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const today = new Date().toISOString().split('T')[0]

    const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any

    if (!userPass) {
      return res.status(400).json({ error: '未购买月卡' })
    }

    const expiresAt = new Date(userPass.expires_at)
    if (expiresAt <= new Date()) {
      return res.status(400).json({ error: '月卡已过期' })
    }

    // Check if already claimed today
    const alreadyClaimed = db.prepare(`
      SELECT id FROM pass_daily_claims WHERE user_id = ? AND claim_date = ? AND pass_type = ?
    `).get(userId, today, userPass.pass_type)

    if (alreadyClaimed) {
      return res.status(400).json({ error: '今日已领取' })
    }

    // Free tier reward: 30 holy_stone + 0 stamina
    // VIP tier reward: 100 holy_stone + 20 stamina
    const isVip = userPass.pass_type === 'monthly' // monthly = VIP
    const holyStoneReward = isVip ? 100 : 30
    const staminaReward = isVip ? 20 : 0

    // Add rewards
    db.prepare('UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?').run(holyStoneReward, userId)
    if (staminaReward > 0) {
      db.prepare('UPDATE user_currency SET stamina = CASE WHEN stamina + ? > max_stamina THEN max_stamina ELSE stamina + ? END WHERE user_id = ?').run(staminaReward, staminaReward, userId)
    }

    // Record claim
    db.prepare('INSERT INTO pass_daily_claims (user_id, claim_date, pass_type) VALUES (?, ?, ?)').run(userId, today, userPass.pass_type)

    saveDb()

    res.json({
      success: true,
      message: `已领取今日奖励：圣像石 ×${holyStoneReward}${staminaReward > 0 ? ` + 体力 ×${staminaReward}` : ''}`,
      rewards: {
        holy_stone: holyStoneReward,
        stamina: staminaReward
      }
    })
  } catch (err) {
    console.error('Claim daily reward error:', err)
    res.status(500).json({ error: '领取失败' })
  }
})

// GET /api/pass/missions - Get mission list
router.get('/missions', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    const missions = db.prepare(`
      SELECT pm.*,
             COALESCE(upp.progress, 0) as progress,
             COALESCE(upp.claimed, FALSE) as claimed
      FROM pass_missions pm
      LEFT JOIN user_pass_progress upp ON upp.mission_id = pm.id AND upp.user_id = ? AND upp.pass_type = pm.pass_type
      WHERE pm.pass_type = 'monthly'
      ORDER BY pm.id
    `).all(userId)

    // Get user pass status to determine VIP tier
    const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any
    const isVip = userPass && new Date(userPass.expires_at) > new Date()

    res.json({
      missions,
      is_vip: isVip
    })
  } catch (err) {
    console.error('Get missions error:', err)
    res.status(500).json({ error: '获取任务列表失败' })
  }
})

// POST /api/pass/missions/:id/claim - Claim mission reward
router.post('/missions/:id/claim', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const missionId = parseInt(req.params.id)

    const mission = db.prepare('SELECT * FROM pass_missions WHERE id = ?').get(missionId) as any
    if (!mission) {
      return res.status(404).json({ error: '任务不存在' })
    }

    // Check progress
    const progress = db.prepare(`
      SELECT progress, claimed FROM user_pass_progress WHERE user_id = ? AND mission_id = ? AND pass_type = ?
    `).get(userId, missionId, mission.pass_type) as any

    if (!progress || progress.progress < mission.target) {
      return res.status(400).json({ error: '任务未完成' })
    }

    if (progress.claimed) {
      return res.status(400).json({ error: '奖励已领取' })
    }

    // Get user pass status for VIP bonus
    const userPass = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any
    const isVip = userPass && new Date(userPass.expires_at) > new Date()

    // Calculate rewards (VIP gets bonus if available)
    const rewardType = isVip && mission.bonus_reward_type ? mission.bonus_reward_type : mission.reward_type
    const rewardAmount = isVip && mission.bonus_reward_amount ? mission.bonus_reward_amount : mission.reward_amount

    // Add rewards
    if (rewardType === 'holy_stone') {
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?').run(rewardAmount, userId)
    } else if (rewardType === 'summon_ticket') {
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket + ? WHERE user_id = ?').run(rewardAmount, userId)
    } else if (rewardType === 'stamina') {
      db.prepare('UPDATE user_currency SET stamina = CASE WHEN stamina + ? > max_stamina THEN max_stamina ELSE stamina + ? END WHERE user_id = ?').run(rewardAmount, rewardAmount, userId)
    }

    // Mark as claimed
    db.prepare(`
      UPDATE user_pass_progress SET claimed = TRUE WHERE user_id = ? AND mission_id = ? AND pass_type = ?
    `).run(userId, missionId, mission.pass_type)

    saveDb()

    res.json({
      success: true,
      message: `已领取 ${mission.title} 奖励：${rewardType === 'holy_stone' ? '圣像石' : rewardType === 'summon_ticket' ? '召唤券' : '体力'} ×${rewardAmount}`,
      rewards: {
        type: rewardType,
        amount: rewardAmount,
        is_vip_bonus: isVip && mission.bonus_reward_type !== null
      }
    })
  } catch (err) {
    console.error('Claim mission reward error:', err)
    res.status(500).json({ error: '领取奖励失败' })
  }
})

// POST /api/pass/purchase - Activate/purchase pass
router.post('/purchase', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { pass_type = 'monthly', cost = 300 } = req.body // default cost 300 holy_stone

    // Check if already has active pass
    const existing = db.prepare('SELECT * FROM user_pass WHERE user_id = ?').get(userId) as any
    if (existing && new Date(existing.expires_at) > new Date()) {
      return res.status(400).json({ error: '月卡仍在有效期内' })
    }

    // Deduct cost (in real app this would be a real purchase)
    const currency = db.prepare('SELECT holy_stone FROM user_currency WHERE user_id = ?').get(userId) as any
    if (!currency || currency.holy_stone < cost) {
      return res.status(400).json({ error: '圣像石不足' })
    }

    db.prepare('UPDATE user_currency SET holy_stone = holy_stone - ? WHERE user_id = ?').run(cost, userId)

    // Calculate new expiry (30 days from now or extend existing)
    const now = new Date()
    let expiresAt: Date
    if (existing && new Date(existing.expires_at) > now) {
      // Extend from current expiry
      expiresAt = new Date(existing.expires_at)
      expiresAt.setDate(expiresAt.getDate() + 30)
    } else {
      // Start fresh
      expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + 30)
    }

    // Upsert pass
    db.prepare(`
      INSERT OR REPLACE INTO user_pass (user_id, pass_type, activated_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, pass_type, now.toISOString(), expiresAt.toISOString())

    saveDb()

    res.json({
      success: true,
      message: `月卡已激活，有效期至 ${expiresAt.toLocaleDateString('zh-CN')}`,
      expires_at: expiresAt.toISOString(),
      days_remaining: 30
    })
  } catch (err) {
    console.error('Purchase pass error:', err)
    res.status(500).json({ error: '购买月卡失败' })
  }
})

export default router
