import express from 'express'
import cors from 'cors'
import { join } from 'path'
import authRoutes from './routes/auth'
import gachaRoutes from './routes/gacha'
import charactersRoutes from './routes/characters'
import userRoutes from './routes/user'
import cultivationRoutes from './routes/cultivation'
import friendRoutes from './routes/friend'
import supportRoutes from './routes/support'
import dailyRoutes from './routes/daily'
import achievementRoutes from './routes/achievement'
import rankingRoutes from './routes/ranking'
import passRoutes from './routes/pass'
import rhythmRoutes from './routes/rhythm'
import outfitRoutes from './routes/outfit'
import ttsRoutes from './routes/tts'
import { initDb } from './db/sqlite'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Static files for resources
const resourcesPath = join(process.cwd(), 'resources')
app.use('/resources', express.static(resourcesPath))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/gacha', gachaRoutes)
app.use('/api/characters', charactersRoutes)
app.use('/api/user', userRoutes)
app.use('/api/cultivation', cultivationRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/daily', dailyRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/ranking', rankingRoutes)
app.use('/api/pass', passRoutes)
app.use('/api/rhythm', rhythmRoutes)
app.use('/api/outfits', outfitRoutes)
app.use('/api/tts', ttsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Initialize database then start server
initDb().then(() => {
  console.log('Database initialized')
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})
