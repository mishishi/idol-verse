import { useState, useCallback, useRef, useEffect } from 'react'

// Audio context for generating sounds programmatically
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Generate a simple tone
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    console.warn('Audio playback failed:', e)
  }
}

// Generate noise burst
function playNoise(duration: number, volume: number = 0.2) {
  try {
    const ctx = getAudioContext()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    noise.connect(gainNode)
    gainNode.connect(ctx.destination)

    noise.start(ctx.currentTime)
  } catch (e) {
    console.warn('Noise playback failed:', e)
  }
}

export interface AudioSystem {
  playGachaSingle: () => void
  playGachaMulti: () => void
  playSSRSound: () => void
  playURSound: () => void
  playUIClick: () => void
  playModalOpen: () => void
  playLevelUp: () => void
  playHit: (lane?: number) => void
  playMiss: () => void
  playCombo: (combo: number) => void
  playGradeSound: (grade: string) => void
  bgmEnabled: boolean
  sfxEnabled: boolean
  toggleBgm: () => void
  toggleSfx: () => void
}

export function useAudio(): AudioSystem {
  const [bgmEnabled, setBgmEnabled] = useState(false)
  const [sfxEnabled, setSfxEnabled] = useState(true)
  const bgmRef = useRef<OscillatorNode[]>([])
  const bgmGainRef = useRef<GainNode | null>(null)
  const bgmIntervalRef = useRef<number | null>(null)
  const melodyTimeoutRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)

  // Clean up BGM on unmount
  useEffect(() => {
    return () => {
      stopBgm()
    }
  }, [])

  const stopBgm = () => {
    isPlayingRef.current = false
    if (bgmIntervalRef.current) {
      clearTimeout(bgmIntervalRef.current)
      bgmIntervalRef.current = null
    }
    if (melodyTimeoutRef.current) {
      clearTimeout(melodyTimeoutRef.current)
      melodyTimeoutRef.current = null
    }
    bgmRef.current.forEach(osc => { try { osc.stop() } catch {} })
    bgmRef.current = []
    if (bgmGainRef.current) {
      bgmGainRef.current = null
    }
  }

  const playGachaSingle = useCallback(() => {
    if (!sfxEnabled) return
    // Quick ascending tones
    playTone(400, 0.1, 'square', 0.2)
    setTimeout(() => playTone(600, 0.1, 'square', 0.2), 80)
    setTimeout(() => playTone(800, 0.15, 'square', 0.25), 160)
  }, [sfxEnabled])

  const playGachaMulti = useCallback(() => {
    if (!sfxEnabled) return
    // Quick staccato for 10-pull
    for (let i = 0; i < 10; i++) {
      setTimeout(() => playTone(300 + i * 50, 0.08, 'square', 0.15), i * 60)
    }
  }, [sfxEnabled])

  const playSSRSound = useCallback(() => {
    if (!sfxEnabled) return
    // Dramatic chord progression
    playTone(261.63, 0.4, 'sawtooth', 0.3) // C4
    playTone(329.63, 0.4, 'sawtooth', 0.3) // E4
    setTimeout(() => {
      playTone(392.00, 0.5, 'sawtooth', 0.35) // G4
      playTone(523.25, 0.5, 'sawtooth', 0.25) // C5
    }, 200)
    // Add shimmer
    setTimeout(() => playNoise(0.3, 0.15), 300)
  }, [sfxEnabled])

  const playURSound = useCallback(() => {
    if (!sfxEnabled) return
    // Grand fanfare with harmonics
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    freqs.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.6, 'sawtooth', 0.25 - i * 0.03), i * 100)
    })
    // Shimmer burst
    setTimeout(() => playNoise(0.5, 0.2), 400)
    setTimeout(() => playNoise(0.3, 0.15), 700)
  }, [sfxEnabled])

  const playUIClick = useCallback(() => {
    if (!sfxEnabled) return
    playTone(800, 0.05, 'sine', 0.1)
  }, [sfxEnabled])

  const playModalOpen = useCallback(() => {
    if (!sfxEnabled) return
    playTone(500, 0.1, 'sine', 0.15)
    setTimeout(() => playTone(700, 0.1, 'sine', 0.12), 60)
  }, [sfxEnabled])

  const playLevelUp = useCallback(() => {
    if (!sfxEnabled) return
    // Ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.2, 'triangle', 0.2), i * 100)
    })
  }, [sfxEnabled])

  const playHit = useCallback((lane: number = 1) => {
    if (!sfxEnabled) return
    // Different pitch per lane (0=pink, 1=cyan, 2=green)
    const freqs = [880, 1100, 1320]
    playTone(freqs[lane] || 880, 0.08, 'sine', 0.25)
  }, [sfxEnabled])

  const playMiss = useCallback(() => {
    if (!sfxEnabled) return
    // Low dull thud
    playTone(150, 0.15, 'sawtooth', 0.15)
  }, [sfxEnabled])

  const playCombo = useCallback((combo: number) => {
    if (!sfxEnabled) return
    // Rising pitch every 10 combo
    const basePitch = 400 + Math.floor(combo / 10) * 100
    const notes = [basePitch, basePitch * 1.25, basePitch * 1.5]
    notes.forEach((n, i) => {
      setTimeout(() => playTone(Math.min(n, 1200), 0.1, 'sine', 0.2), i * 50)
    })
  }, [sfxEnabled])

  const playGradeSound = useCallback((grade: string) => {
    if (!sfxEnabled) return
    switch (grade) {
      case 'S':
        // Triumphant fanfare
        playTone(523.25, 0.2, 'sine', 0.25)
        setTimeout(() => playTone(659.25, 0.2, 'sine', 0.25), 100)
        setTimeout(() => playTone(783.99, 0.3, 'sine', 0.3), 200)
        setTimeout(() => playTone(1046.50, 0.4, 'sine', 0.3), 300)
        break
      case 'A':
        playTone(523.25, 0.15, 'sine', 0.25)
        setTimeout(() => playTone(659.25, 0.15, 'sine', 0.25), 100)
        setTimeout(() => playTone(783.99, 0.25, 'sine', 0.25), 200)
        break
      case 'B':
        playTone(440, 0.2, 'sine', 0.2)
        setTimeout(() => playTone(523.25, 0.2, 'sine', 0.2), 150)
        break
      case 'C':
        playTone(349.23, 0.2, 'sine', 0.2)
        setTimeout(() => playTone(440, 0.2, 'sine', 0.2), 200)
        break
      case 'D':
        playTone(220, 0.3, 'sine', 0.2)
        break
    }
  }, [sfxEnabled])

  const toggleBgm = useCallback(() => {
    setBgmEnabled(prev => {
      if (!prev) {
        // Rich idol-game BGM: multi-layer composition
        // Layers: pad chords | rhythmic bass | arpeggio | lead melody | shimmer
        try {
          const ctx = getAudioContext();
          const BPM = 116;
          const BEAT = 60 / BPM;
          const BAR = BEAT * 4;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.09, ctx.currentTime);
          masterGain.connect(ctx.destination);
          bgmGainRef.current = masterGain;

          // 8-bar lush chord progression (idol-pop style)
          // [root, 3rd, 5th, 7th, 9th]
          const CHORDS = [
            [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9  - bright, hopeful opening
            [220.00, 261.63, 329.63, 392.00, 493.88], // Am9    - gentle, warm
            [174.61, 220.00, 261.63, 329.63, 440.00], // Fmaj9  - floating, dreamy
            [196.00, 246.94, 293.66, 349.23, 493.88],   // G11    - lift, anticipation
            [220.00, 261.63, 329.63, 392.00, 523.25], // Dm9    - tender moment
            [164.81, 196.00, 246.94, 293.66, 440.00],  // Em7b5  - slight tension
            [261.63, 329.63, 392.00, 493.88, 659.25],  // Cadd9  - resolution, warmth
            [174.61, 220.00, 261.63, 329.63, 392.00],  // Fadd9  - open, breathing
          ];

          const BASS = [130.81, 110.00, 87.31, 98.00, 146.83, 123.47, 130.81, 87.31];

          // Bass groove: [beat offset, pitch multiplier]
          const BASS_GROOVE = [
            [0, 1], [0.5, 1], [1, 1.5], [1.5, 1],
            [2, 1], [2.5, 0.9], [3, 1.2], [3.75, 1],
          ];

          // Arpeggio 16th-note pattern: [16th offset, chord note index, octave multiplier]
          const ARP_PATTERNS = [
            [0, 0, 1], [1, 1, 1], [2, 2, 1], [3, 3, 1],
            [4, 4, 1], [5, 3, 1], [6, 2, 1], [7, 1, 1],
            [8, 0, 2], [9, 1, 2], [10, 2, 2], [11, 3, 2],
            [12, 4, 2], [13, 3, 2], [14, 2, 2], [15, 1, 2],
          ];

          // Lead melody in Cmaj pentatonic (C D E G A), 4 phrases x 8 notes
          const MELODY = [
            // Phrase 1: rising
            { n: 523.25, d: 0.5 }, { n: 659.25, d: 0.5 },
            { n: 783.99, d: 1.0 },  { n: 0, d: 0.5 },
            { n: 698.46, d: 0.5 },  { n: 659.25, d: 0.5 },
            { n: 523.25, d: 1.0 },  { n: 0, d: 0.5 },
            // Phrase 2: descent
            { n: 659.25, d: 0.5 },  { n: 587.33, d: 0.5 },
            { n: 523.25, d: 0.5 },  { n: 659.25, d: 0.5 },
            { n: 783.99, d: 1.0 },  { n: 0, d: 0.5 },
            { n: 880.00, d: 1.0 },  { n: 0, d: 0.5 },
            // Phrase 3: call & response
            { n: 783.99, d: 0.5 },  { n: 659.25, d: 0.5 },
            { n: 783.99, d: 0.5 },  { n: 880.00, d: 0.5 },
            { n: 1046.50, d: 1.0 }, { n: 0, d: 0.5 },
            { n: 783.99, d: 0.5 },  { n: 659.25, d: 0.5 },
            { n: 587.33, d: 0.5 },  { n: 523.25, d: 1.5 },
            // Phrase 4: gentle landing
            { n: 493.88, d: 0.5 },  { n: 523.25, d: 0.5 },
            { n: 587.33, d: 1.0 },  { n: 0, d: 0.5 },
            { n: 523.25, d: 0.5 },  { n: 493.88, d: 0.5 },
            { n: 440.00, d: 1.0 },  { n: 0, d: 1.0 },
          ];

          const SHIMMER_TIMES = [0.5, 2.1, 4.3, 6.7, 8.2, 10.5, 12.1, 14.8];
          const SHIMMER_FREQS = [2093, 2637, 3136, 3520, 3951, 4186];

          let chordIndex = 0;
          let melodyPhrase = 0;
          let shimmerIdx = 0;
          isPlayingRef.current = true;

          const makeOsc = (type, freq, t, duration, vol, detune = 0) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            if (detune) osc.detune.setValueAtTime(detune, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.linearRampToValueAtTime(vol, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(t);
            osc.stop(t + duration + 0.05);
            bgmRef.current.push(osc);
          };

          const playBar = (chord, bassNote, t) => {
            // Pad chords (triangle, warm slow attack)
            chord.forEach((freq, i) => {
              makeOsc('triangle', freq, t, BAR * 0.95, 0.022, (i - 2) * 3);
              makeOsc('sine', freq * 2, t, BAR * 0.9, 0.006);
            });

            // Rhythmic bass
            BASS_GROOVE.forEach(([beatOff, mult]) => {
              const bt = t + beatOff * BEAT;
              makeOsc('sine', bassNote * mult, bt, BEAT * 0.35, 0.065);
              makeOsc('sine', bassNote * mult * 0.5, bt, BEAT * 0.25, 0.025);
            });

            // Arpeggio (16th notes)
            ARP_PATTERNS.forEach(([sixOff, noteIdx, octMult]) => {
              const at = t + (sixOff / 4) * BEAT;
              const freq = chord[noteIdx] * octMult;
              makeOsc('sine', freq, at, BEAT * 0.12, 0.025);
              makeOsc('sine', freq * 3, at, BEAT * 0.06, 0.004);
            });

            // Lead melody (8 notes per bar)
            for (let i = 0; i < 8; i++) {
              const note = MELODY[(melodyPhrase * 8 + i) % MELODY.length];
              const mt = t + i * BEAT;
              if (note.n > 0) {
                makeOsc('sine', note.n, mt, note.d * BEAT * 0.75, 0.04);
                makeOsc('triangle', note.n * 2, mt, note.d * BEAT * 0.4, 0.01);
              }
            }
            melodyPhrase = (melodyPhrase + 1) % 4;

            // Shimmer accents
            SHIMMER_TIMES.forEach(st => {
              const shimmerT = t + st * BEAT;
              const freq = SHIMMER_FREQS[Math.floor(Math.random() * SHIMMER_FREQS.length)];
              makeOsc('sine', freq, shimmerT, 0.12, 0.007);
            });
          };

          // Play 2 bars at a time
          const playLoop = () => {
            if (!isPlayingRef.current) return;
            const t = ctx.currentTime;
            playBar(CHORDS[chordIndex % 8], BASS[chordIndex % 8], t);
            playBar(CHORDS[(chordIndex + 1) % 8], BASS[(chordIndex + 1) % 8], t + BAR);
            chordIndex = (chordIndex + 2) % 8;
            bgmIntervalRef.current = window.setTimeout(playLoop, BAR * 2 * 1000);
          };

          playLoop();

        } catch (e) {
          console.warn('BGM start failed:', e);
        }
      } else {
        stopBgm();
      }
      return !prev;
    });
  }, [bgmEnabled]);


  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => !prev)
  }, [])

  return {
    playGachaSingle,
    playGachaMulti,
    playSSRSound,
    playURSound,
    playUIClick,
    playModalOpen,
    playLevelUp,
    playHit,
    playMiss,
    playCombo,
    playGradeSound,
    bgmEnabled,
    sfxEnabled,
    toggleBgm,
    toggleSfx
  }
}