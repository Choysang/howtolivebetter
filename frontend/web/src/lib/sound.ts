/**
 * frontend/web/src/lib/sound.ts
 * 纯原生 Web Audio API 程序化微音效合成引擎
 * 100% 物理级纯离线、零外部音频文件加载（0 mp3/wav 依赖）
 * 依据生产解密声学模型：5200Hz 低通滤波 + 泛音双轨指数衰减包络
 */

const STORAGE_KEY = 'howtolivebetter:sound:v1'
const DEBOUNCE_MS = 120

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let soundEnabled: boolean | null = null
const lastTriggerMap = new Map<string, number>()
const listeners = new Set<() => void>()

/** 获取用户音效偏好（默认开启，可拨动关闭） */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (soundEnabled === null) {
    try {
      soundEnabled = localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      soundEnabled = true
    }
  }
  return soundEnabled
}

/** 切换音效开关 */
export function toggleSound(): boolean {
  if (typeof window === 'undefined') return false
  const next = !isSoundEnabled()
  soundEnabled = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  } catch {}
  listeners.forEach((fn) => fn())
  if (next) {
    playSound('tap')
  }
  return next
}

/** 订阅音效状态变更 */
export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 初始化单例 AudioContext 与高保真模拟低通滤波器 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null

  if (!audioCtx) {
    audioCtx = new AudioCtx()
    const lowpass = audioCtx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 5200

    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.55

    masterGain.connect(lowpass).connect(audioCtx.destination)
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }

  return audioCtx
}

interface NoteSpec {
  freq: number
  at?: number
  dur?: number
  gain?: number
  bendTo?: number
  type?: OscillatorType
}

/** 核心双轨谐波音符合成函数（基频 + 4 次泛音微润色） */
function playNotes(ctx: AudioContext, notes: NoteSpec[]): void {
  if (!masterGain) return

  for (const n of notes) {
    const startTime = ctx.currentTime + (n.at ?? 0)
    const dur = n.dur ?? 0.22
    const baseGain = n.gain ?? 0.18

    // 谐波轨道：基波(权重1) + 4倍泛音(权重0.07，更短衰减)
    const harmonics: [number, number, number][] = [
      [1, 1, dur],
      [4, 0.07, dur * 0.35],
    ]

    for (const [ratio, amp, decay] of harmonics) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = ratio === 1 ? n.type ?? 'sine' : 'sine'
      osc.frequency.setValueAtTime(n.freq * ratio, startTime)

      if (n.bendTo) {
        osc.frequency.exponentialRampToValueAtTime(
          n.bendTo * ratio,
          startTime + Math.min(0.08, dur)
        )
      }

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(baseGain * amp, startTime + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay)

      osc.connect(gain).connect(masterGain)
      osc.start(startTime)
      osc.stop(startTime + decay + 0.03)
    }
  }
}

/** 纸本微快门瞬态白噪声合成（手翻书质感） */
function playShutterNoise(ctx: AudioContext, dur = 0.09, gainVal = 0.5): void {
  if (!masterGain) return
  const sampleCount = Math.ceil(ctx.sampleRate * dur)
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
  }

  const src = ctx.createBufferSource()
  src.buffer = buffer

  const bandpass = ctx.createBiquadFilter()
  bandpass.type = 'bandpass'
  bandpass.frequency.value = 2400

  const gain = ctx.createGain()
  gain.gain.value = gainVal

  src.connect(bandpass).connect(gain).connect(masterGain)
  src.start()
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]

type SoundType = 'done' | 'todo' | 'unmark' | 'favorite' | 'unfavorite' | 'tap' | 'shuffle' | 'celebrate' | 'copy'

/** 触发预设声学交互动作 */
export function playSound(type: SoundType): void {
  if (!isSoundEnabled() || (typeof document !== 'undefined' && document.hidden)) return

  const now = Date.now()
  const lastTime = lastTriggerMap.get(type) ?? 0
  if (now - lastTime < DEBOUNCE_MS) return
  lastTriggerMap.set(type, now)

  const ctx = getAudioContext()
  if (!ctx) return

  switch (type) {
    case 'done':
      // 达成双音清脆上扬
      playNotes(ctx, [
        { freq: 1046.5, dur: 0.16 },
        { freq: 1567.98, at: 0.07, dur: 0.32 },
      ])
      break
    case 'todo':
      // 待做轻微滑音
      playNotes(ctx, [{ freq: 520, bendTo: 780, dur: 0.16, gain: 0.15 }])
      break
    case 'unmark':
      // 取消低音滑落
      playNotes(ctx, [{ freq: 783.99, bendTo: 520, dur: 0.14, gain: 0.1 }])
      break
    case 'favorite':
      // 三度上升琶音
      playNotes(
        ctx,
        [1318.51, 1661.22, 1975.53].map((freq, i) => ({
          freq,
          at: i * 0.045,
          dur: 0.18 + i * 0.05,
          gain: 0.1,
          type: 'triangle',
        }))
      )
      break
    case 'unfavorite':
      playNotes(ctx, [{ freq: 987.77, bendTo: 740, dur: 0.12, gain: 0.07 }])
      break
    case 'tap':
      // 短促点触音
      playNotes(ctx, [{ freq: 880, dur: 0.07, gain: 0.07 }])
      break
    case 'shuffle':
      // 洗牌音效：5音随机快速弹跳
      playNotes(
        ctx,
        Array.from({ length: 5 }, (_, i) => ({
          freq: SCALE[Math.floor(Math.random() * SCALE.length)],
          at: i * 0.045,
          dur: 0.08,
          gain: 0.07,
        }))
      )
      break
    case 'celebrate':
      // 连成一线庆祝和弦五音上行
      playNotes(
        ctx,
        [523.25, 659.25, 783.99, 1046.5, 1318.51].map((freq, i) => ({
          freq,
          at: i * 0.07,
          dur: i === 4 ? 0.6 : 0.2,
          gain: 0.14,
        }))
      )
      break
    case 'copy':
      playShutterNoise(ctx, 0.06, 0.3)
      playNotes(ctx, [
        { freq: 1760, dur: 0.06, gain: 0.07 },
        { freq: 2349.32, at: 0.05, dur: 0.1, gain: 0.06 },
      ])
      break
  }
}
