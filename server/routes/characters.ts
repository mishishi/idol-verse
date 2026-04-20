import { Router } from 'express'
import db from '../db/sqlite'

const router = Router()

// Get all characters
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM characters ORDER BY CASE rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 WHEN 'N' THEN 5 END, name")
    const characters = stmt.all()
    res.json(characters)
  } catch (err) {
    console.error('Get characters error:', err)
    res.status(500).json({ error: '获取角色列表失败' })
  }
})

// Get single character
router.get('/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM characters WHERE character_id = ?')
    const character = stmt.get(req.params.id)
    if (!character) {
      return res.status(404).json({ error: '角色不存在' })
    }
    res.json(character)
  } catch (err) {
    console.error('Get character error:', err)
    res.status(500).json({ error: '获取角色信息失败' })
  }
})

export default router
