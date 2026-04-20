import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db, { saveDb } from '../db/sqlite'
import { updateDailyProgress } from './daily'

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

// Get friend list
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Get unique friends (DISTINCT on friend_id to avoid duplicates from bidirectional entries)
    const friends = db.prepare(`
      SELECT DISTINCT u.id, u.username, u.created_at,
             MIN(f.created_at, COALESCE(f2.created_at, f.created_at)) as friend_since
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
      LEFT JOIN friends f2 ON f2.user_id = u.id AND f2.friend_id = ?
      WHERE f.user_id = ? OR f.friend_id = ?
      GROUP BY u.id
    `).all(userId, userId, userId, userId)

    res.json(friends)
  } catch (err) {
    console.error('Get friends error:', err)
    res.status(500).json({ error: '获取好友列表失败' })
  }
})

// Search users by username
router.get('/search', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { q, page = '1', limit = '10' } = req.query

    if (!q || (q as string).length < 2) {
      return res.status(400).json({ error: '搜索关键词至少2个字符' })
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1)
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string) || 10))
    const offset = (pageNum - 1) * limitNum

    const countRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM users
      WHERE username LIKE ? AND id != ?
    `).get(`%${q}%`, userId) as any

    const users = db.prepare(`
      SELECT id, username, created_at
      FROM users
      WHERE username LIKE ? AND id != ?
      ORDER BY username
      LIMIT ? OFFSET ?
    `).all(`%${q}%`, userId, limitNum, offset)

    res.json({
      users,
      total: countRow?.total || 0,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil((countRow?.total || 0) / limitNum)
    })
  } catch (err) {
    console.error('Search users error:', err)
    res.status(500).json({ error: '搜索用户失败' })
  }
})

// Get pending friend requests (sent and received)
router.get('/requests', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Received requests
    const received = db.prepare(`
      SELECT fr.id, fr.from_user_id, fr.created_at, u.username as from_username
      FROM friend_requests fr
      JOIN users u ON u.id = fr.from_user_id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId)

    // Sent requests
    const sent = db.prepare(`
      SELECT fr.id, fr.to_user_id, fr.created_at, u.username as to_username
      FROM friend_requests fr
      JOIN users u ON u.id = fr.to_user_id
      WHERE fr.from_user_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId)

    res.json({ received, sent })
  } catch (err) {
    console.error('Get friend requests error:', err)
    res.status(500).json({ error: '获取好友申请失败' })
  }
})

// Send friend request
router.post('/requests', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { toUserId } = req.body

    if (!toUserId || toUserId === userId) {
      return res.status(400).json({ error: '无效的用户' })
    }

    // Check if target user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(toUserId)
    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // Check if already friends
    const existingFriendship = db.prepare(`
      SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(userId, toUserId, toUserId, userId)
    if (existingFriendship) {
      return res.status(400).json({ error: '你们已经是好友了' })
    }

    // Check if request already exists
    const existingRequest = db.prepare(`
      SELECT id FROM friend_requests
      WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
      AND status = 'pending'
    `).get(userId, toUserId, toUserId, userId)
    if (existingRequest) {
      return res.status(400).json({ error: '已发送过好友申请' })
    }

    db.prepare(`
      INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)
    `).run(userId, toUserId)
    saveDb()

    res.json({ success: true, message: '好友申请已发送' })
  } catch (err) {
    console.error('Send friend request error:', err)
    res.status(500).json({ error: '发送好友申请失败' })
  }
})

// Accept friend request
router.post('/requests/:id/accept', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const requestId = parseInt(req.params.id)

    const request = db.prepare(`
      SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'
    `).get(requestId, userId) as any

    if (!request) {
      return res.status(404).json({ error: '好友申请不存在' })
    }

    // Update request status
    db.prepare(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`).run(requestId)

    // Create friendship (both directions)
    db.prepare(`INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)`).run(userId, request.from_user_id)
    db.prepare(`INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)`).run(request.from_user_id, userId)
    saveDb()

    res.json({ success: true, message: '已接受好友申请' })
  } catch (err) {
    console.error('Accept friend request error:', err)
    res.status(500).json({ error: '接受好友申请失败' })
  }
})

// Reject friend request
router.delete('/requests/:id', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const requestId = parseInt(req.params.id)

    db.prepare(`
      DELETE FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'
    `).run(requestId, userId)
    saveDb()

    res.json({ success: true, message: '已拒绝好友申请' })
  } catch (err) {
    console.error('Reject friend request error:', err)
    res.status(500).json({ error: '拒绝好友申请失败' })
  }
})

// Remove friend
router.delete('/:friendId', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const friendId = parseInt(req.params.friendId)

    db.prepare(`DELETE FROM friends WHERE user_id = ? AND friend_id = ?`).run(userId, friendId)
    db.prepare(`DELETE FROM friends WHERE user_id = ? AND friend_id = ?`).run(friendId, userId)
    saveDb()

    res.json({ success: true, message: '已删除好友' })
  } catch (err) {
    console.error('Remove friend error:', err)
    res.status(500).json({ error: '删除好友失败' })
  }
})

// Get stamina gift status for friends
router.get('/stamina-status', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Get today's sent count
    const sentToday = db.prepare(`
      SELECT COUNT(*) as count FROM stamina_gifts
      WHERE sender_id = ? AND DATE(created_at) = DATE('now')
    `).get(userId) as any

    // Get pending received gifts
    const pendingGifts = db.prepare(`
      SELECT sg.id, sg.sender_id, sg.amount, sg.created_at, u.username as sender_username
      FROM stamina_gifts sg
      JOIN users u ON u.id = sg.sender_id
      WHERE sg.receiver_id = ? AND sg.received_at IS NULL
    `).all(userId)

    res.json({
      sent_today: sentToday.count,
      max_per_day: 3,
      pending_gifts: pendingGifts
    })
  } catch (err) {
    console.error('Get stamina status error:', err)
    res.status(500).json({ error: '获取体力状态失败' })
  }
})

// Send stamina to a friend
router.post('/send-stamina', authMiddleware, (req, res) => {
  try {
    const userId = req.userId
    const { friendId } = req.body

    // Check if they are friends
    const friendship = db.prepare(`
      SELECT id FROM friends WHERE user_id = ? AND friend_id = ?
    `).get(userId, friendId)
    if (!friendship) {
      return res.status(400).json({ error: '只能给好友赠送体力' })
    }

    // Check daily limit
    const today = new Date().toDateString()
    const sentToday = db.prepare(`
      SELECT COUNT(*) as count FROM stamina_gifts
      WHERE sender_id = ? AND DATE(created_at) = DATE('now')
    `).get(userId) as any
    if (sentToday.count >= 3) {
      return res.status(400).json({ error: '今日赠送次数已用完（每天3次）' })
    }

    // Create stamina gift
    db.prepare(`
      INSERT INTO stamina_gifts (sender_id, receiver_id) VALUES (?, ?)
    `).run(userId, friendId)

    // Update daily send stamina task and pass mission progress
    updateDailyProgress(userId, 'send_stamina', 1)
    updatePassMissionProgress(userId, 'send_stamina')

    saveDb()

    res.json({ success: true, message: '体力已赠送', remaining: 3 - sentToday.count - 1 })
  } catch (err) {
    console.error('Send stamina error:', err)
    res.status(500).json({ error: '赠送体力失败' })
  }
})

// Receive stamina (claim all pending)
router.post('/receive-stamina', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Get pending gifts
    const pending = db.prepare(`
      SELECT id, amount FROM stamina_gifts
      WHERE receiver_id = ? AND received_at IS NULL
    `).all(userId) as any[]

    if (pending.length === 0) {
      return res.status(400).json({ error: '没有可领取的体力' })
    }

    // Calculate total stamina to add
    const totalAmount = pending.reduce((sum: number, g: any) => sum + g.amount, 0)

    // Mark as received
    const placeholders = pending.map(() => '?').join(',')
    db.prepare(`
      UPDATE stamina_gifts SET received_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})
    `).run(...pending.map((g: any) => g.id))

    // Add stamina to user
    db.prepare(`
      UPDATE user_currency SET stamina = stamina + ? WHERE user_id = ?
    `).run(totalAmount, userId)
    saveDb()

    res.json({ success: true, received: totalAmount, count: pending.length })
  } catch (err) {
    console.error('Receive stamina error:', err)
    res.status(500).json({ error: '领取体力失败' })
  }
})

export default router
