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

// Get user currency
router.get('/currency', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare('SELECT holy_stone, summon_ticket, stamina, max_stamina FROM user_currency WHERE user_id = ?')
    const currency = stmt.get(req.userId)
    if (!currency) {
      return res.status(404).json({ error: '用户货币信息不存在' })
    }
    res.json(currency)
  } catch (err) {
    console.error('Get currency error:', err)
    res.status(500).json({ error: '获取货币信息失败' })
  }
})

// Get user characters
router.get('/characters', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT uc.id, uc.character_id, uc.fragment_count, uc.intimacy_level, uc.level, uc.exp, uc.skill_level,
             c.name, c.rarity, c.image_path, c.description
      FROM user_characters uc
      JOIN characters c ON uc.character_id = c.character_id
      WHERE uc.user_id = ?
      ORDER BY CASE c.rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 WHEN 'N' THEN 5 END, c.name
    `)
    const characters = stmt.all(req.userId)
    res.json(characters)
  } catch (err) {
    console.error('Get user characters error:', err)
    res.status(500).json({ error: '获取角色列表失败' })
  }
})

// Fragment synthesis - spend fragments to get a character
router.post('/characters/:characterId/synthesis', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { characterId } = req.params

    const charStmt = db.prepare('SELECT * FROM characters WHERE character_id = ?')
    const char = charStmt.get(characterId) as any
    if (!char) {
      return res.status(404).json({ error: '角色不存在' })
    }

    // SSR and UR cannot be synthesized
    if (char.rarity === 'SSR' || char.rarity === 'UR') {
      return res.status(400).json({ error: '该稀有度无法合成' })
    }

    // Calculate fragment cost
    const costMap: Record<string, number> = { 'N': 30, 'R': 20, 'SR': 10 }
    const cost = costMap[char.rarity]

    // Check if already owned
    const existingStmt = db.prepare('SELECT * FROM user_characters WHERE user_id = ? AND character_id = ?')
    const existing = existingStmt.get(userId, characterId) as any

    if (!existing) {
      return res.status(400).json({ error: '该角色尚未获得，请先通过召唤获取' })
    }

    // Check if enough fragments
    if (existing.fragment_count < cost) {
      return res.status(400).json({ error: `碎片不足，需要${cost}个碎片，当前拥有${existing.fragment_count}个` })
    }

    // Consume fragments (cost - 1 because character itself counts as 1)
    const netCost = cost - 1
    if (netCost > 0) {
      db.prepare('UPDATE user_characters SET fragment_count = fragment_count - ? WHERE id = ?').run(netCost, existing.id)
    }

    // Character is already owned, synthesis just consumes fragments
    // (The character itself is "synthesized" by using fragments)
    saveDb()
    res.json({ success: true, message: `合成成功，消耗了${netCost}个碎片` })
  } catch (err) {
    console.error('Synthesis error:', err)
    res.status(500).json({ error: '合成失败' })
  }
})

// Get user profile
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const userStmt = db.prepare('SELECT id, username, created_at, login_streak FROM users WHERE id = ?')
    const user = userStmt.get(req.userId) as any

    const charCountStmt = db.prepare('SELECT COUNT(*) as count FROM user_characters WHERE user_id = ?')
    const charCount = (charCountStmt.get(req.userId) as any).count

    const gachaCountStmt = db.prepare('SELECT COUNT(*) as count FROM user_gacha_records WHERE user_id = ?')
    const gachaCount = (gachaCountStmt.get(req.userId) as any).count

    res.json({
      ...user,
      character_count: charCount,
      total_gacha: gachaCount,
      login_streak: user?.login_streak || 0
    })
  } catch (err) {
    console.error('Get profile error:', err)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// Purchase stamina with holy_stone
// Cost: 50 holy_stone per 50 stamina
router.post('/buy-stamina', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { amount } = req.body // 1, 2, or 3 (packs of 50 stamina)

    const STAMINA_PER_PACK = 50
    const HOLY_STONE_PER_PACK = 50
    const MAX_PACKS = 3

    if (!amount || amount < 1 || amount > MAX_PACKS) {
      return res.status(400).json({ error: `购买数量需在1-${MAX_PACKS}之间` })
    }

    const currency = db.prepare('SELECT holy_stone, stamina, max_stamina FROM user_currency WHERE user_id = ?').get(userId) as any
    if (!currency) {
      return res.status(404).json({ error: '用户货币信息不存在' })
    }

    const totalStamina = STAMINA_PER_PACK * amount
    const totalCost = HOLY_STONE_PER_PACK * amount

    if (currency.holy_stone < totalCost) {
      return res.status(400).json({ error: `圣像石不足，需要${totalCost}圣像石，当前拥有${currency.holy_stone}圣像石` })
    }

    // Check if stamina would exceed max (allow overflow up to 2x max)
    const newStamina = currency.stamina + totalStamina
    const maxOverflow = currency.max_stamina * 2
    if (newStamina > maxOverflow) {
      return res.status(400).json({ error: `体力已满或接近上限（当前${currency.stamina}/${currency.max_stamina}），无法购买更多体力` })
    }

    // Deduct holy_stone and add stamina
    db.prepare('UPDATE user_currency SET holy_stone = holy_stone - ?, stamina = stamina + ? WHERE user_id = ?')
      .run(totalCost, totalStamina, userId)

    saveDb()

    const updated = db.prepare('SELECT holy_stone, stamina, max_stamina FROM user_currency WHERE user_id = ?').get(userId) as any

    res.json({
      success: true,
      message: `购买成功，获得体力×${totalStamina}`,
      holy_stone: updated.holy_stone,
      stamina: updated.stamina,
      max_stamina: updated.max_stamina
    })
  } catch (err) {
    console.error('Buy stamina error:', err)
    res.status(500).json({ error: '购买体力失败' })
  }
})

export default router
