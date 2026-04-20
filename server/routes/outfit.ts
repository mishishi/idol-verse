import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'idol-game-secret-key-2024'

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  console.log('DEBUG outfit auth - token:', token ? token.substring(0, 20) + '...' : 'null')
  console.log('DEBUG outfit auth - header:', req.headers.authorization)
  if (!token) {
    return res.status(401).json({ error: '未授权' })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    console.log('DEBUG outfit auth - decoded:', decoded)
    req.userId = decoded.userId
    next()
  } catch (e: any) {
    console.log('DEBUG outfit auth - error:', e.message)
    return res.status(401).json({ error: '无效的token' })
  }
}

// GET /api/outfits/:characterId - Get all outfits for a character
router.get('/:characterId', authMiddleware, (req, res) => {
  try {
    const { characterId } = req.params

    const outfits = db.prepare(`
      SELECT id, outfit_key, name, rarity, image_path, is_default
      FROM character_outfits
      WHERE character_id = ?
      ORDER BY is_default DESC, rarity ASC
    `).all(characterId) as any[]

    // Mark which outfits user owns
    const userOutfits = db.prepare(`
      SELECT outfit_id FROM user_outfits WHERE user_id = ?
    `).all(req.userId) as any[]
    const ownedIds = new Set(userOutfits.map(uo => uo.outfit_id))

    const outfitsWithOwnership = outfits.map(o => ({
      ...o,
      owned: ownedIds.has(o.id)
    }))

    res.json({ outfits: outfitsWithOwnership })
  } catch (err) {
    console.error('Get outfits error:', err)
    res.status(500).json({ error: '获取服装失败' })
  }
})

// GET /api/user/outfits - Get user's all owned outfits
router.get('/user/all', authMiddleware, (req, res) => {
  try {
    const userOutfits = db.prepare(`
      SELECT uo.id as user_outfit_id, uo.obtained_at,
             co.id as outfit_id, co.character_id, co.outfit_key, co.name, co.rarity, co.image_path
      FROM user_outfits uo
      JOIN character_outfits co ON co.id = uo.outfit_id
      WHERE uo.user_id = ?
      ORDER BY co.rarity DESC, co.character_id
    `).all(req.userId) as any[]

    res.json({ outfits: userOutfits })
  } catch (err) {
    console.error('Get user outfits error:', err)
    res.status(500).json({ error: '获取服装失败' })
  }
})

// POST /api/user/outfits/:outfitId/equip - Equip outfit to a character
router.post('/:outfitId/equip', authMiddleware, (req, res) => {
  try {
    const { outfitId } = req.params
    const { characterId } = req.body // Character to equip this outfit on

    if (!characterId) {
      return res.status(400).json({ error: '缺少角色ID' })
    }

    // Verify user owns this outfit
    const userOutfit = db.prepare(`
      SELECT * FROM user_outfits WHERE user_id = ? AND outfit_id = ?
    `).get(req.userId, outfitId) as any

    if (!userOutfit) {
      return res.status(400).json({ error: '未拥有该服装' })
    }

    // Verify outfit belongs to this character
    const outfit = db.prepare(`
      SELECT * FROM character_outfits WHERE id = ?
    `).get(outfitId) as any

    if (!outfit || outfit.character_id !== characterId) {
      return res.status(400).json({ error: '服装与角色不匹配' })
    }

    // Get user's character
    const userChar = db.prepare(`
      SELECT * FROM user_characters WHERE user_id = ? AND character_id = ?
    `).get(req.userId, characterId) as any

    if (!userChar) {
      return res.status(400).json({ error: '未拥有该角色' })
    }

    // Update equipped outfit
    db.prepare(`
      UPDATE user_characters SET equipped_outfit_id = ? WHERE user_id = ? AND character_id = ?
    `).run(outfitId, req.userId, characterId)

    saveDb()

    res.json({
      success: true,
      message: '服装已装备',
      equipped_outfit_id: outfitId
    })
  } catch (err) {
    console.error('Equip outfit error:', err)
    res.status(500).json({ error: '装备服装失败' })
  }
})

// POST /api/user/outfits/give - Give outfit to user (for testing/rewards)
router.post('/give', authMiddleware, (req, res) => {
  try {
    const { outfitId } = req.body

    if (!outfitId) {
      return res.status(400).json({ error: '缺少服装ID' })
    }

    // Check if outfit exists
    const outfit = db.prepare(`
      SELECT * FROM character_outfits WHERE id = ?
    `).get(outfitId) as any

    if (!outfit) {
      return res.status(400).json({ error: '服装不存在' })
    }

    // Check if already owned
    const existing = db.prepare(`
      SELECT * FROM user_outfits WHERE user_id = ? AND outfit_id = ?
    `).get(req.userId, outfitId)

    if (existing) {
      return res.status(400).json({ error: '已拥有该服装' })
    }

    // Give outfit to user
    db.prepare(`
      INSERT INTO user_outfits (user_id, outfit_id) VALUES (?, ?)
    `).run(req.userId, outfitId)

    saveDb()

    res.json({
      success: true,
      message: '获得新服装',
      outfit: {
        id: outfit.id,
        name: outfit.name,
        rarity: outfit.rarity
      }
    })
  } catch (err) {
    console.error('Give outfit error:', err)
    res.status(500).json({ error: '获取服装失败' })
  }
})

// POST /api/user/outfits/:characterId/unequip - Unequip current outfit
router.post('/:characterId/unequip', authMiddleware, (req, res) => {
  try {
    const { characterId } = req.params

    db.prepare(`
      UPDATE user_characters SET equipped_outfit_id = NULL WHERE user_id = ? AND character_id = ?
    `).run(req.userId, characterId)

    saveDb()

    res.json({ success: true, message: '已卸下服装' })
  } catch (err) {
    console.error('Unequip outfit error:', err)
    res.status(500).json({ error: '卸下服装失败' })
  }
})

export default router
