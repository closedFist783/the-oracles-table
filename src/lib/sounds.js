// Web Audio API sound effects — no external files needed
let _ctx = null

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      return null
    }
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {})
  }
  return _ctx
}

export function playButtonClick() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08)
  } catch (e) {}
}

export function playDiceRoll() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Quick noise bursts simulating rattling dice
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      const start = t + i * 0.06
      osc.frequency.setValueAtTime(200 + Math.random() * 300, start)
      osc.frequency.exponentialRampToValueAtTime(100 + Math.random() * 200, start + 0.05)
      gain.gain.setValueAtTime(0.12, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06)
      osc.start(start); osc.stop(start + 0.06)
    }
  } catch (e) {}
}

export function playLevelUp() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Ascending triumphant fanfare — C E G C
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    const durations = [0.15, 0.15, 0.15, 0.25, 0.25, 0.5]
    let offset = 0
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t + offset)
      gain.gain.setValueAtTime(0.25, t + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + durations[i])
      osc.start(t + offset); osc.stop(t + offset + durations[i] + 0.05)
      offset += durations[i] * 0.85
    })
  } catch (e) {}
}

export function playSuccess() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + i * 0.1)
      gain.gain.setValueAtTime(0.2, t + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25)
      osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.3)
    })
  } catch (e) {}
}

export function playCritical() {
  try {
    const ctx = getCtx(); if (!ctx) return
    const t = ctx.currentTime
    // Dramatic impact: low thud then high shimmer
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1); gain1.connect(ctx.destination)
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(150, t)
    osc1.frequency.exponentialRampToValueAtTime(50, t + 0.3)
    gain1.gain.setValueAtTime(0.35, t)
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    osc1.start(t); osc1.stop(t + 0.4)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2); gain2.connect(ctx.destination)
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1200, t + 0.05)
    osc2.frequency.exponentialRampToValueAtTime(600, t + 0.5)
    gain2.gain.setValueAtTime(0.2, t + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc2.start(t + 0.05); osc2.stop(t + 0.65)
  } catch (e) {}
}
