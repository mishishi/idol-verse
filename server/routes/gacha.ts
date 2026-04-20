import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'
import { checkAchievements } from './achievement'

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

// Get all characters with their probabilities
const CHARACTER_POOL = [
  { character_id: 'star_01', name: '星月诗织', rarity: 'N', weight: 40 },
  { character_id: 'star_02', name: '月野美月', rarity: 'N', weight: 40 },
  { character_id: 'sun_01', name: '日向美玲', rarity: 'R', weight: 25 },
  { character_id: 'sun_02', name: '风中璃绪', rarity: 'R', weight: 25 },
  { character_id: 'moon_01', name: '雪宫静', rarity: 'R', weight: 25 },
  { character_id: 'galaxy_01', name: '星野美羽', rarity: 'SR', weight: 8 },
  { character_id: 'galaxy_02', name: '夜空遥香', rarity: 'SR', weight: 7 },
  { character_id: 'cosmic_01', name: '流星美月', rarity: 'SSR', weight: 2 },
  { character_id: 'cosmic_02', name: '极光彼方', rarity: 'SSR', weight: 2 },
  { character_id: 'eternal_01', name: '神崎诗织', rarity: 'UR', weight: 0.5 },
  { character_id: 'eternal_02', name: '神崎舞妃', rarity: 'UR', weight: 0.5 },
]

// Get pity counter for user (from persisted value)
function getPityCounter(userId: number): { count: number, isGuaranteed: boolean } {
  const row = db.prepare('SELECT pity_count FROM user_currency WHERE user_id = ?').get(userId) as any
  const count = row?.pity_count || 0
  return { count, isGuaranteed: count >= 89 }
}

// Increment and get updated pity counter atomically
function incrementPityCounter(userId: number, increment: number = 1): { count: number, isGuaranteed: boolean } {
  db.prepare('UPDATE user_currency SET pity_count = pity_count + ? WHERE user_id = ?').run(increment, userId)
  const row = db.prepare('SELECT pity_count FROM user_currency WHERE user_id = ?').get(userId) as any
  const count = row?.pity_count || 0
  return { count, isGuaranteed: count >= 89 }
}

// Get gacha status (pity counter)
router.get('/status', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const pity = getPityCounter(userId)
    res.json({
      pity_count: pity.count,
      is_guaranteed: pity.isGuaranteed,
      next_guaranteed_at: Math.max(0, 90 - pity.count)
    })
  } catch (err) {
    console.error('Gacha status error:', err)
    res.status(500).json({ error: '获取抽卡状态失败' })
  }
})

// Single gacha pull
router.post('/single', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { use_ticket } = req.body

    const currency = db.prepare('SELECT holy_stone, summon_ticket FROM user_currency WHERE user_id = ?').get(userId) as any

    if (use_ticket) {
      if (currency.summon_ticket < 1) {
        return res.status(400).json({ error: '召唤券不足' })
      }
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket - 1 WHERE user_id = ?').run(userId)
    } else {
      if (currency.holy_stone < 10) {
        return res.status(400).json({ error: '圣像石不足' })
      }
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone - 10 WHERE user_id = ?').run(userId)
    }

    // Check pity BEFORE pull to determine rates
    const pityBefore = getPityCounter(userId)

    const character = doGachaPull(userId, 'single')

    // Increment pity counter AFTER pull
    const pity = incrementPityCounter(userId, 1)

    // Update daily task, achievement, and pass mission progress
    updateDailyProgress(userId, 'gacha_single', 1)
    checkAchievements(userId)
    updatePassMissionProgress(userId, 'gacha')

    saveDb()
    console.log('[SINGLE] pity before:', pityBefore.count, 'after:', pity.count)

    res.json({
      success: true,
      character,
      pity_count: pity.count,
      currency_used: use_ticket ? 'ticket' : 'holy_stone'
    })
  } catch (err) {
    console.error('Gacha error:', err)
    console.error(err.stack)
    res.status(500).json({ error: '抽卡失败' })
  }
})

// Pull a single character (reusable for both single and multi)
// If pityOverride is provided (for multi-pull), use it instead of fetching from DB
function doGachaPull(userId: number, gachaType: 'single' | 'multi', pityOverride?: number) {
  const pity = pityOverride !== undefined ? { count: pityOverride, isGuaranteed: pityOverride >= 89 } : getPityCounter(userId)

  let selectedRarity: string
  const roll = Math.random() * 100

  if (pity.isGuaranteed) {
    selectedRarity = roll < 50 ? 'R' : (roll < 80 ? 'SR' : (roll < 95 ? 'SSR' : 'UR'))
  } else {
    if (roll < 0.5) selectedRarity = 'UR'
    else if (roll < 2.5) selectedRarity = 'SSR'
    else if (roll < 10) selectedRarity = 'SR'
    else if (roll < 35) selectedRarity = 'R'
    else selectedRarity = 'N'
  }

  const candidates = CHARACTER_POOL.filter(c => c.rarity === selectedRarity)
  const selected = candidates[Math.floor(Math.random() * candidates.length)]

  db.prepare('INSERT INTO user_gacha_records (user_id, character_id, gacha_type) VALUES (?, ?, ?)').run(userId, selected.character_id, gachaType)

  const existingChar = db.prepare('SELECT * FROM user_characters WHERE user_id = ? AND character_id = ?').get(userId, selected.character_id)

  if (existingChar) {
    const fragmentCount = selectedRarity === 'N' ? 3 : selectedRarity === 'R' ? 2 : selectedRarity === 'SR' ? 1 : 0
    if (fragmentCount > 0) {
      db.prepare('UPDATE user_characters SET fragment_count = fragment_count + ? WHERE id = ?').run(fragmentCount, (existingChar as any).id)
    }
  } else {
    db.prepare('INSERT INTO user_characters (user_id, character_id, fragment_count) VALUES (?, ?, 1)').run(userId, selected.character_id)
  }

  // Get image_path from characters table
  const charData = db.prepare('SELECT image_path FROM characters WHERE character_id = ?').get(selected.character_id) as any

  return {
    character_id: selected.character_id,
    name: selected.name,
    rarity: selectedRarity,
    image_path: charData?.image_path || null
  }
}

// Multi gacha pull (10x) — pity calculated at start, each pull increments it
router.post('/multi', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { use_ticket } = req.body

    const currency = db.prepare('SELECT holy_stone, summon_ticket FROM user_currency WHERE user_id = ?').get(userId) as any

    if (use_ticket) {
      if (currency.summon_ticket < 10) {
        return res.status(400).json({ error: '召唤券不足（需要10张）' })
      }
      db.prepare('UPDATE user_currency SET summon_ticket = summon_ticket - 10 WHERE user_id = ?').run(userId)
    } else {
      if (currency.holy_stone < 100) {
        return res.status(400).json({ error: '圣像石不足（需要100）' })
      }
      db.prepare('UPDATE user_currency SET holy_stone = holy_stone - 100 WHERE user_id = ?').run(userId)
    }

    // Get pity BEFORE any pulls in this multi — all 10 pulls share the same starting pity
    const pityBefore = getPityCounter(userId)
    let currentPity = pityBefore.count

    const results = []
    for (let i = 0; i < 10; i++) {
      currentPity++ // Increment for rate determination
      const result = doGachaPull(userId, 'multi', currentPity)
      results.push(result)
      // Persist each pull immediately to prevent data loss on crash
      saveDb()
    }

    // Persist the actual pity count increment (all 10 at once)
    const pityAfter = incrementPityCounter(userId, 10)

    // Update daily task, achievement, and pass mission progress
    updateDailyProgress(userId, 'gacha_multi', 1)
    checkAchievements(userId)
    updatePassMissionProgress(userId, 'gacha')

    saveDb()
    console.log('[MULTI] pityBefore:', pityBefore.count, 'after:', pityAfter.count)

    res.json({
      success: true,
      characters: results,
      pity_count: pityAfter.count,
      currency_used: use_ticket ? 'ticket' : 'holy_stone'
    })
  } catch (err) {
    console.error('Multi gacha error:', err)
    res.status(500).json({ error: '十连抽卡失败' })
  }
})

export default router
