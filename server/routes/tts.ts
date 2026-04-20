import { Router } from 'express'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const router = Router()

// Piper binary and model paths
const PIPER_EXE = 'D:/tmp/piper/piper.exe'
const PIPER_MODEL = 'D:/tmp/piper/voices/zh_CN-huayan-medium.onnx'
const PIPER_CONFIG = 'D:/tmp/piper/voices/zh_CN-huayan-medium.onnx.json'

// POST /api/tts/speak
// Body: { text: string, lang?: string }
// Returns: audio/wav
router.post('/speak', async (req, res) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' })
    }

    // Write input text to temp file (piper reads from stdin)
    const tmpInput = join(process.env.TEMP || '/tmp', `piper_in_${Date.now()}.txt`)
    const tmpOutput = join(process.env.TEMP || '/tmp', `piper_out_${Date.now()}.wav`)

    writeFileSync(tmpInput, text, 'utf-8')

    await new Promise<void>((resolve, reject) => {
      const piper = spawn(PIPER_EXE, [
        '--model', PIPER_MODEL,
        '--config', PIPER_CONFIG,
        '-f', tmpOutput,
      ], { stdio: ['pipe', 'pipe', 'pipe'] })

      let stderr = ''
      piper.stderr?.on('data', (d) => { stderr += d.toString() })
      piper.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Piper exited ${code}: ${stderr}`))
      })
      piper.on('error', reject)

      // Feed input text via stdin
      const inputData = Buffer.from(text, 'utf-8')
      piper.stdin?.end(inputData)
    })

    const { readFileSync } = await import('fs')
    const wavBuffer = readFileSync(tmpOutput)

    unlinkSync(tmpInput)
    unlinkSync(tmpOutput)

    res.set('Content-Type', 'audio/wav')
    res.set('Content-Length', String(wavBuffer.length))
    res.send(wavBuffer)
  } catch (err) {
    console.error('TTS error:', err)
    res.status(500).json({ error: 'TTS failed' })
  }
})

export default router
