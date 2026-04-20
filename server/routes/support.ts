import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'

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

// Get message board for a character
router.get('/board/:characterId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { characterId } = req.params

    const messages = db.prepare(`
      SELECT cm.id, cm.message, cm.created_at, u.username,
             CASE WHEN cm.user_id = ? THEN 1 ELSE 0 END as is_mine
      FROM character_messages cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.character_id = ?
      ORDER BY cm.created_at DESC
      LIMIT 50
    `).all(userId, characterId)

    // Get user's own message for today
    const today = new Date().toDateString()
    const myTodayMessage = db.prepare(`
      SELECT id FROM character_messages
      WHERE user_id = ? AND character_id = ? AND DATE(created_at) = DATE(?)
    `).get(userId, characterId, today)

    res.json({
      messages,
      can_post: !myTodayMessage,
      total_count: messages.length
    })
  } catch (err) {
    console.error('Get message board error:', err)
    res.status(500).json({ error: '获取留言板失败' })
  }
})

// Post a message to character board
router.post('/board/:characterId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { characterId } = req.params
    const { message } = req.body

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: '留言不能为空' })
    }

    const trimmed = message.trim()
    if (trimmed.length > 50) {
      return res.status(400).json({ error: '留言不能超过50字' })
    }

    // Check if character exists
    const char = db.prepare('SELECT character_id FROM characters WHERE character_id = ?').get(characterId)
    if (!char) {
      return res.status(404).json({ error: '角色不存在' })
    }

    // Check daily limit
    const today = new Date().toDateString()
    const existing = db.prepare(`
      SELECT id FROM character_messages
      WHERE user_id = ? AND character_id = ? AND DATE(created_at) = DATE(?)
    `).get(userId, characterId, today)
    if (existing) {
      return res.status(400).json({ error: '今天已经留言过，明天再来吧' })
    }

    db.prepare(`
      INSERT INTO character_messages (user_id, character_id, message) VALUES (?, ?, ?)
    `).run(userId, characterId, trimmed)

    // Update daily interact task
    updateDailyProgress(userId, 'interact', 1)

    saveDb()

    res.json({ success: true, message: '留言成功' })
  } catch (err) {
    console.error('Post message error:', err)
    res.status(500).json({ error: '留言失败' })
  }
})

// Delete own message
router.delete('/board/:characterId/:messageId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { messageId } = req.params

    db.prepare(`
      DELETE FROM character_messages WHERE id = ? AND user_id = ?
    `).run(messageId, userId)
    saveDb()

    res.json({ success: true, message: '已删除留言' })
  } catch (err) {
    console.error('Delete message error:', err)
    res.status(500).json({ error: '删除留言失败' })
  }
})

export default router
