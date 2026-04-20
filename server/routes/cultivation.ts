import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'

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

// EXP curve: exp needed to reach each level
const EXP_CURVE: number[] = []
let expSum = 0
for (let i = 1; i <= 80; i++) {
  expSum += i * 10 // each level needs level * 10 exp
  EXP_CURVE.push(expSum)
}

const getExpForLevel = (level: number): number => {
  if (level <= 1) return 0
  if (level > 80) return EXP_CURVE[79]
  return EXP_CURVE[level - 2]
}

const getLevelForExp = (exp: number): number => {
  for (let i = 80; i >= 1; i--) {
    if (exp >= getExpForLevel(i)) return i
  }
  return 1
}

// Rarity multipliers for support hall output
const RARITY_OUTPUT_MULTIPLIER: Record<string, number> = {
  'N': 1,
  'R': 2,
  'SR': 5,
  'SSR': 15,
  'UR': 50
}

// Fragment to EXP conversion
const FRAGMENT_TO_EXP = 10
const EXP_PER_LEVEL_UP = 100

// Skill upgrade config
const SKILL_MAX_LEVEL = 20
const SKILL_COST_PER_LEVEL = 20 // fragments per skill level (skill_level * 20)

// Support hall offline cap
const MAX_OFFLINE_HOURS = 24 // max 24 hours of offline earnings

// Global cooldown for support collect (per user)
const userCollectCooldown = new Map<number, number>()
const GLOBAL_COLLECT_COOLDOWN = 1000 // 1 second global cooldown

// Cleanup old cooldown entries periodically
const CLEANUP_INTERVAL = 60000 // 1 minute
const cleanupCooldowns = () => {
  const now = Date.now()
  for (const [userId, timestamp] of userCollectCooldown.entries()) {
    if (now - timestamp > GLOBAL_COLLECT_COOLDOWN * 10) {
      userCollectCooldown.delete(userId)
    }
  }
}
setInterval(cleanupCooldowns, CLEANUP_INTERVAL)

// Level up a character (consume fragments)
router.post('/characters/:id/level-up', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const charId = parseInt(req.params.id)

    // Get user's character
    const userChar = db.prepare(`
      SELECT uc.*, c.rarity FROM user_characters uc
      JOIN characters c ON uc.character_id = c.character_id
      WHERE uc.id = ? AND uc.user_id = ?
    `).get(charId, userId) as any

    if (!userChar) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const currentLevel = userChar.level || 1
    if (currentLevel >= 80) {
      return res.status(400).json({ error: '已达到最大等级' })
    }

    // Calculate fragments needed for one level up
    const expNeeded = EXP_CURVE[currentLevel - 1] - (userChar.exp || 0)
    const fragmentsNeeded = Math.ceil(expNeeded / FRAGMENT_TO_EXP)

    if (userChar.fragment_count < fragmentsNeeded) {
      return res.status(400).json({ error: `碎片不足，需要 ${fragmentsNeeded} 碎片` })
    }

    // Deduct fragments and add exp
    const newExp = (userChar.exp || 0) + (fragmentsNeeded * FRAGMENT_TO_EXP)
    const newLevel = getLevelForExp(newExp)

    db.prepare(`
      UPDATE user_characters
      SET fragment_count = fragment_count - ?,
          exp = ?,
          level = ?
      WHERE id = ?
    `).run(fragmentsNeeded, newExp, newLevel, charId)
    saveDb()

    res.json({
      success: true,
      newLevel,
      newExp,
      fragmentsUsed: fragmentsNeeded
    })
  } catch (err) {
    console.error('Level up error:', err)
    res.status(500).json({ error: '升级失败' })
  }
})

// Upgrade character skill (consume fragments)
router.post('/characters/:id/skill-up', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const charId = parseInt(req.params.id)

    // Get user's character
    const userChar = db.prepare(`
      SELECT uc.*, c.rarity FROM user_characters uc
      JOIN characters c ON uc.character_id = c.character_id
      WHERE uc.id = ? AND uc.user_id = ?
    `).get(charId, userId) as any

    if (!userChar) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const currentSkillLevel = userChar.skill_level || 1
    if (currentSkillLevel >= SKILL_MAX_LEVEL) {
      return res.status(400).json({ error: '技能已达最大等级' })
    }

    // Calculate fragments needed for skill upgrade
    const fragmentsNeeded = currentSkillLevel * SKILL_COST_PER_LEVEL

    if (userChar.fragment_count < fragmentsNeeded) {
      return res.status(400).json({ error: `碎片不足，需要 ${fragmentsNeeded} 碎片` })
    }

    // Deduct fragments and upgrade skill
    const newSkillLevel = currentSkillLevel + 1
    db.prepare(`
      UPDATE user_characters
      SET fragment_count = fragment_count - ?,
          skill_level = ?
      WHERE id = ?
    `).run(fragmentsNeeded, newSkillLevel, charId)
    saveDb()

    res.json({
      success: true,
      newSkillLevel,
      fragmentsUsed: fragmentsNeeded
    })
  } catch (err) {
    console.error('Skill up error:', err)
    res.status(500).json({ error: '技能升级失败' })
  }
})

// Get character details with cultivation info
router.get('/characters/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const charId = parseInt(req.params.id)

    const userChar = db.prepare(`
      SELECT uc.*, c.name, c.rarity, c.description, c.image_path, c.voice_lines
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.character_id
      WHERE uc.id = ? AND uc.user_id = ?
    `).get(charId, userId) as any

    if (!userChar) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const currentLevel = userChar.level || 1
    const currentExp = userChar.exp || 0
    const expForCurrentLevel = getExpForLevel(currentLevel)
    const expForNextLevel = currentLevel >= 80 ? null : getExpForLevel(currentLevel + 1)

    // Check if intimacy can be upgraded today
    const intimacyRecord = db.prepare(`
      SELECT last_intimacy_at FROM user_intimacy_records
      WHERE user_id = ? AND character_id = ?
      ORDER BY last_intimacy_at DESC LIMIT 1
    `).get(userId, userChar.character_id) as any

    let canIntimacyUp = true
    if (intimacyRecord) {
      const lastDate = new Date(intimacyRecord.last_intimacy_at)
      const today = new Date()
      canIntimacyUp = lastDate.toDateString() !== today.toDateString()
    }

    // Calculate fragments needed for level up
    const expNeeded = currentLevel >= 80 ? 0 : (expForNextLevel || 0) - currentExp
    const fragmentsNeeded = Math.ceil(Math.max(0, expNeeded) / FRAGMENT_TO_EXP)

    // Calculate skill upgrade cost
    const currentSkillLevel = userChar.skill_level || 1
    const skillCost = currentSkillLevel >= SKILL_MAX_LEVEL ? 0 : currentSkillLevel * SKILL_COST_PER_LEVEL
    const canSkillUp = currentSkillLevel < SKILL_MAX_LEVEL && userChar.fragment_count >= skillCost

    // Get equipped outfit info
    let equippedOutfit = null
    if (userChar.equipped_outfit_id) {
      equippedOutfit = db.prepare(`
        SELECT id, outfit_key, name, rarity, image_path
        FROM character_outfits WHERE id = ?
      `).get(userChar.equipped_outfit_id) as any
    }

    // Get total outfits count for this character
    const totalOutfits = db.prepare(`
      SELECT COUNT(*) as count FROM character_outfits WHERE character_id = ?
    `).get(userChar.character_id) as any

    res.json({
      id: userChar.id,
      character_id: userChar.character_id,
      name: userChar.name,
      rarity: userChar.rarity,
      description: userChar.description,
      image_path: userChar.image_path,
      voice_lines: userChar.voice_lines ? JSON.parse(userChar.voice_lines) : [],
      fragment_count: userChar.fragment_count,
      intimacy_level: userChar.intimacy_level || 1,
      level: currentLevel,
      exp: currentExp,
      exp_for_current_level: expForCurrentLevel,
      exp_for_next_level: expForNextLevel,
      exp_needed_for_next_level: expNeeded,
      fragments_needed: fragmentsNeeded,
      skill_level: currentSkillLevel,
      skill_max_level: SKILL_MAX_LEVEL,
      skill_cost: skillCost,
      can_skill_up: canSkillUp,
      can_intimacy_up: canIntimacyUp,
      equipped_outfit: equippedOutfit,
      total_outfits: totalOutfits?.count || 0
    })
  } catch (err) {
    console.error('Get character error:', err)
    res.status(500).json({ error: '获取角色信息失败' })
  }
})

// Increase intimacy
router.post('/characters/:id/intimacy-up', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const charId = parseInt(req.params.id)

    const userChar = db.prepare(`
      SELECT * FROM user_characters WHERE id = ? AND user_id = ?
    `).get(charId, userId) as any

    if (!userChar) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const currentIntimacy = userChar.intimacy_level || 1
    if (currentIntimacy >= 10) {
      return res.status(400).json({ error: '亲密度已达最大等级' })
    }

    // Check if already upgraded today
    const intimacyRecord = db.prepare(`
      SELECT last_intimacy_at FROM user_intimacy_records
      WHERE user_id = ? AND character_id = ?
      ORDER BY last_intimacy_at DESC LIMIT 1
    `).get(userId, userChar.character_id) as any

    if (intimacyRecord) {
      const lastDate = new Date(intimacyRecord.last_intimacy_at)
      const today = new Date()
      if (lastDate.toDateString() === today.toDateString()) {
        return res.status(400).json({ error: '今日亲密度已提升，请明天再来' })
      }
    }

    // Update intimacy
    const newIntimacy = currentIntimacy + 1
    db.prepare(`
      UPDATE user_characters SET intimacy_level = ? WHERE id = ?
    `).run(newIntimacy, charId)

    // Record intimacy upgrade
    db.prepare(`
      INSERT INTO user_intimacy_records (user_id, character_id) VALUES (?, ?)
    `).run(userId, userChar.character_id)

    // Reward: give some fragments based on intimacy level
    const fragmentReward = newIntimacy // same as intimacy level
    db.prepare(`
      UPDATE user_characters SET fragment_count = fragment_count + ? WHERE id = ?
    `).run(fragmentReward, charId)
    saveDb()

    res.json({
      success: true,
      new_intimacy: newIntimacy,
      fragments_reward: fragmentReward
    })
  } catch (err) {
    console.error('Intimacy up error:', err)
    res.status(500).json({ error: '亲密度提升失败' })
  }
})

// Get support hall status
router.get('/support', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Initialize slots if not exist
    const existingSlots = db.prepare(`
      SELECT slot_index FROM user_support_slots WHERE user_id = ?
    `).all(userId) as any[]

    if (existingSlots.length === 0) {
      // Create 3 empty slots with current time as last_collected_at
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      for (let i = 0; i < 3; i++) {
        db.prepare(`
          INSERT INTO user_support_slots (user_id, slot_index, last_collected_at) VALUES (?, ?, ?)
        `).run(userId, i, nowStr)
      }
    }

    // Get slots with character info
    const slots = db.prepare(`
      SELECT uss.id, uss.slot_index, uss.character_id, uss.last_collected_at,
             c.name as character_name, c.rarity
      FROM user_support_slots uss
      LEFT JOIN characters c ON uss.character_id = c.character_id
      WHERE uss.user_id = ?
      ORDER BY uss.slot_index
    `).all(userId) as any[]

    // Get user's characters for selection
    const userCharacters = db.prepare(`
      SELECT uc.id, uc.character_id, c.name, c.rarity, uc.intimacy_level
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.character_id
      WHERE uc.user_id = ?
    `).all(userId) as any[]

    // Calculate pending output
    const now = new Date()
    const pendingOutput = slots.map((slot: any) => {
      if (!slot.character_id) return { slot_index: slot.slot_index, pending: 0 }

      // If last_collected_at is NULL/invalid, treat as now (no pending)
      if (!slot.last_collected_at) return { slot_index: slot.slot_index, pending: 0 }

      const lastCollected = new Date(slot.last_collected_at)
      const hoursPassed = Math.min((now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60), MAX_OFFLINE_HOURS)
      const baseOutput = RARITY_OUTPUT_MULTIPLIER[slot.rarity] || 1
      const intimacyBonus = 1 + ((slot.intimacy_level || 1) - 1) * 0.1
      const outputPerHour = baseOutput * intimacyBonus

      return {
        slot_index: slot.slot_index,
        pending: Math.floor(hoursPassed * outputPerHour)
      }
    })

    res.json({
      slots: slots.map((s: any) => ({
        slot_index: s.slot_index,
        character_id: s.character_id,
        character_name: s.character_name,
        rarity: s.rarity,
        last_collected_at: s.last_collected_at
      })),
      user_characters: userCharacters,
      pending_output: pendingOutput
    })
  } catch (err) {
    console.error('Get support error:', err)
    res.status(500).json({ error: '获取应援殿失败' })
  }
})

// Set support slot
router.put('/support/slot/:index', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const slotIndex = parseInt(req.params.index)
    const { character_id } = req.body

    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 2) {
      return res.status(400).json({ error: '无效的槽位' })
    }

    // If setting a character, verify user owns it
    if (character_id) {
      const owned = db.prepare(`
        SELECT id FROM user_characters WHERE user_id = ? AND character_id = ?
      `).get(userId, character_id)

      if (!owned) {
        return res.status(400).json({ error: '您没有这个角色' })
      }
    }

    // Update or insert slot
    const existing = db.prepare(`
      SELECT id FROM user_support_slots WHERE user_id = ? AND slot_index = ?
    `).get(userId, slotIndex)

    if (existing) {
      // When setting a character, reset last_collected_at to now so output starts from now
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      db.prepare(`
        UPDATE user_support_slots
        SET character_id = ?, last_collected_at = ?
        WHERE user_id = ? AND slot_index = ?
      `).run(character_id || null, nowStr, userId, slotIndex)
    } else {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      db.prepare(`
        INSERT INTO user_support_slots (user_id, slot_index, character_id, last_collected_at) VALUES (?, ?, ?, ?)
      `).run(userId, slotIndex, character_id || null, nowStr)
    }
    saveDb()

    res.json({ success: true })
  } catch (err) {
    console.error('Set support slot error:', err)
    res.status(500).json({ error: '设置应援位失败' })
  }
})

// Collect support output
router.post('/support/collect', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const now = new Date()

    // Global cooldown check
    const lastCollect = userCollectCooldown.get(userId) || 0
    if (now.getTime() - lastCollect < GLOBAL_COLLECT_COOLDOWN) {
      return res.status(429).json({ error: '操作太频繁，请稍后再试' })
    }
    userCollectCooldown.set(userId, now.getTime())

    // Get all slots
    const slots = db.prepare(`
      SELECT uss.slot_index, uss.character_id, uss.last_collected_at,
             c.rarity, uc.intimacy_level
      FROM user_support_slots uss
      LEFT JOIN characters c ON uss.character_id = c.character_id
      LEFT JOIN user_characters uc ON uss.character_id = uc.character_id AND uc.user_id = uss.user_id
      WHERE uss.user_id = ?
    `).all(userId) as any[]

    let totalCollected = 0
    const slotsToUpdate: number[] = []

    for (const slot of slots) {
      if (!slot.character_id) continue
      if (!slot.last_collected_at) continue

      const lastCollected = new Date(slot.last_collected_at)
      const msPassed = now.getTime() - lastCollected.getTime()

      // Minimum 500ms cooldown between collections to prevent rapid re-collection
      if (msPassed < 500) continue

      const hoursPassed = Math.min(msPassed / (1000 * 60 * 60), MAX_OFFLINE_HOURS)
      const baseOutput = RARITY_OUTPUT_MULTIPLIER[slot.rarity] || 1
      const intimacyBonus = 1 + ((slot.intimacy_level || 1) - 1) * 0.1
      const outputPerHour = baseOutput * intimacyBonus
      const collected = Math.floor(hoursPassed * outputPerHour)

      totalCollected += collected
      slotsToUpdate.push(slot.slot_index)
    }

    // Early return if nothing to collect
    if (totalCollected === 0) {
      return res.json({ success: true, collected: 0 })
    }

    // Update last collected time for all slots that had valid cooldown
    const pad = (n: number) => String(n).padStart(2, '0')
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    for (const slotIndex of slotsToUpdate) {
      db.prepare(`
        UPDATE user_support_slots
        SET last_collected_at = ?
        WHERE user_id = ? AND slot_index = ?
      `).run(nowStr, userId, slotIndex)
    }

    // Add collected currency
    const existing = db.prepare(`
      SELECT holy_stone FROM user_currency WHERE user_id = ?
    `).get(userId)

    if (existing) {
      db.prepare(`
        UPDATE user_currency SET holy_stone = holy_stone + ? WHERE user_id = ?
      `).run(totalCollected, userId)
    } else {
      db.prepare(`
        INSERT INTO user_currency (user_id, holy_stone) VALUES (?, ?)
      `).run(userId, totalCollected)
    }
    saveDb()

    res.json({
      success: true,
      collected: totalCollected
    })
  } catch (err) {
    console.error('Collect support error:', err)
    res.status(500).json({ error: '收取失败' })
  }
})

export default router
