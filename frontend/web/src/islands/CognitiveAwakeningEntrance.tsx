import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { AwakeningPhase } from '@contracts/awakening.ts'
import {
  MASTER_MAXIM,
  STAGE_ATTRACTORS,
  AWAKENING_STORAGE_KEY,
  AWAKENING_EVENT_OPEN,
  DEFAULT_AWAKENING_TIMELINE,
} from '@contracts/awakening.ts'
import {
  getPhaseProgress,
  calculateMobiusPoint,
  calculateAttractorPhysics,
  getAttractorScreenCoords,
  shouldEscapeOnWheel,
  shouldEscapeOnTouch,
} from '@kernel/awakening.ts'

const PARTICLE_STRIDE = 10

interface DockTargetCoords {
  x: number
  y: number
  radius: number
}

interface ScreenCoord {
  x: number
  y: number
}

export default function CognitiveAwakeningEntrance() {
  const [active, setActive] = useState(false)
  const [isImploding, setIsImploding] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<AwakeningPhase | 'imploding'>('chaos')
  const [timelineProgress, setTimelineProgress] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const implosionTimerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const implosionStartTimeRef = useRef<number>(0)
  const touchStartYRef = useRef<number>(0)
  const dockTargetsRef = useRef<DockTargetCoords[]>([])
  const attractorCoordsRef = useRef<ScreenCoord[]>([])
  const particlesRef = useRef<Float32Array | null>(null)
  const particleCountRef = useRef<number>(600)

  // WebKit 18+ 显存归零回收契约
  const releaseCanvasMemory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, 1, 1)
  }, [])

  // 采集主页面承接元素的视口绝对坐标（单次采样，零重排 Layout Thrashing）
  const sampleDockCoordinates = useCallback(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-stage-dock]')
    if (cards.length >= 5) {
      dockTargetsRef.current = Array.from(cards).map((el) => {
        const r = el.getBoundingClientRect()
        return {
          x: r.left + r.width * 0.5,
          y: r.top + r.height * 0.5,
          radius: Math.max(r.width, r.height) * 0.45,
        }
      })
    } else {
      // 容错降级：吸入视口中轴偏下（阶段卡片预估带）
      const cx = window.innerWidth * 0.5
      const cy = window.innerHeight * 0.65
      dockTargetsRef.current = [0, 1, 2, 3, 4].map((i) => ({
        x: cx + (i - 2) * (window.innerWidth * 0.18),
        y: cy,
        radius: 60,
      }))
    }
  }, [])

  // 2026 空间相变退出触发：进入粒子坍缩吸入态 (Spatial Implosion)
  const exitAwakening = useCallback(() => {
    if (isImploding) return
    sampleDockCoordinates()
    setIsImploding(true)
    setCurrentPhase('imploding')
    implosionStartTimeRef.current = performance.now()

    try {
      localStorage.setItem(AWAKENING_STORAGE_KEY, 'true')
    } catch {}

    if (implosionTimerRef.current) clearTimeout(implosionTimerRef.current)

    // 550ms 后完成彻底吸入与主页面无缝对接
    implosionTimerRef.current = setTimeout(() => {
      setActive(false)
      setIsImploding(false)
      window.dispatchEvent(new CustomEvent('awakening-dock-landed'))
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      releaseCanvasMemory()
    }, 550)
  }, [isImploding, sampleDockCoordinates, releaseCanvasMemory])

  // 启动或重置觉醒动画
  const startAwakening = useCallback(() => {
    if (implosionTimerRef.current) clearTimeout(implosionTimerRef.current)
    setIsImploding(false)
    setActive(true)
    startTimeRef.current = performance.now()
    lastTimeRef.current = startTimeRef.current
    setCurrentPhase('chaos')
    setTimelineProgress(0)
  }, [])

  // 检测首次访问与全局自定义唤醒事件
  useEffect(() => {
    try {
      const awakened = localStorage.getItem(AWAKENING_STORAGE_KEY)
      if (!awakened) {
        startAwakening()
      }
    } catch {
      startAwakening()
    }

    const handleOpenEvent = () => startAwakening()
    window.addEventListener(AWAKENING_EVENT_OPEN, handleOpenEvent)

    return () => {
      window.removeEventListener(AWAKENING_EVENT_OPEN, handleOpenEvent)
      if (implosionTimerRef.current) clearTimeout(implosionTimerRef.current)
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      releaseCanvasMemory()
    }
  }, [startAwakening, releaseCanvasMemory])

  // 键盘 ESC 逃逸舱
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        exitAwakening()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, exitAwakening])

  // 鼠标滚轮与移动端滑动手势逃逸舱
  useEffect(() => {
    if (!active) return

    const handleWheel = (e: WheelEvent) => {
      if (shouldEscapeOnWheel(e.deltaY, DEFAULT_AWAKENING_TIMELINE.escapeWheelThreshold)) {
        exitAwakening()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartYRef.current
      if (shouldEscapeOnTouch(deltaY, DEFAULT_AWAKENING_TIMELINE.escapeTouchThreshold)) {
        exitAwakening()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [active, exitAwakening])

  // Page Visibility API 自动切台休眠（避免 Significant Energy 警告）
  useEffect(() => {
    if (!active) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current)
          animFrameIdRef.current = null
        }
      } else {
        lastTimeRef.current = performance.now()
        // 唤醒重绘将由主循环自然恢复
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [active])

  // Canvas 2D 粒子微物理引擎主循环
  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const isReducedMotion = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    const isMobile = window.innerWidth < 768
    const count = isReducedMotion ? 40 : (isMobile ? 300 : 600)
    particleCountRef.current = count

    const pData = new Float32Array(count * PARTICLE_STRIDE)
    particlesRef.current = pData

    // 移动端封顶 DPR 1.5 节省 50% 显存与计算带宽
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0)
    let width = window.innerWidth
    let height = window.innerHeight

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // 零 GC：在 resize 时预计算并静态缓存吸引子坐标，杜绝帧循环内分配
      attractorCoordsRef.current = STAGE_ATTRACTORS.map((att) =>
        getAttractorScreenCoords(att, width, height)
      )
      sampleDockCoordinates()
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const cx = width * 0.5
    const cy = height * 0.5

    // 初始化粒子群
    for (let i = 0; i < count; i++) {
      const offset = i * PARTICLE_STRIDE
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * Math.min(width, height) * 0.45

      pData[offset + 0] = cx + Math.cos(angle) * radius // x
      pData[offset + 1] = cy + Math.sin(angle) * radius // y
      pData[offset + 2] = (Math.random() - 0.5) * 1.5   // vx
      pData[offset + 3] = (Math.random() - 0.5) * 1.5   // vy
      pData[offset + 4] = pData[offset + 0]             // originX
      pData[offset + 5] = pData[offset + 1]             // originY
      pData[offset + 6] = i % 5                         // attractorIdx
      pData[offset + 7] = (i / count) * Math.PI * 2     // theta
      pData[offset + 8] = 1.0 + Math.random() * 2.2     // size
      pData[offset + 9] = i % 3                         // colorId
    }

    const colors = [
      'rgba(16, 185, 129, ', // 翡翠绿
      'rgba(245, 158, 11, ', // 琥珀金
      'rgba(56, 189, 248, ', // 冰晶天青
    ]

    lastTimeRef.current = performance.now()

    const render = (now: number) => {
      if (document.hidden) {
        animFrameIdRef.current = requestAnimationFrame(render)
        return
      }

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033)
      lastTimeRef.current = now

      const elapsed = now - startTimeRef.current

      // 判断常规阶段进度还是坍缩退出阶段
      let phase: AwakeningPhase | 'imploding' = currentPhase
      if (isImploding) {
        phase = 'imploding'
      } else {
        const phaseInfo = getPhaseProgress(elapsed, DEFAULT_AWAKENING_TIMELINE)
        phase = phaseInfo.phase
        setCurrentPhase(phase)
        setTimelineProgress(phaseInfo.totalProgress)
      }

      // 清屏尾迹
      ctx.fillStyle = isImploding ? 'rgba(8, 10, 14, 0.35)' : 'rgba(8, 10, 14, 0.22)'
      ctx.fillRect(0, 0, width, height)

      const mobiusScale = Math.min(width, height) * 0.26
      const rotAngle = (elapsed * 0.0006) % (Math.PI * 2)
      const attractorCoords = attractorCoordsRef.current

      // 阶段二吸引子光晕（非坍缩期）
      if (phase === 'attractors') {
        for (let a = 0; a < attractorCoords.length; a++) {
          const coord = attractorCoords[a]
          const attConfig = STAGE_ATTRACTORS[a]
          const grad = ctx.createRadialGradient(coord.x, coord.y, 4, coord.x, coord.y, 60)
          grad.addColorStop(0, attConfig.color)
          grad.addColorStop(1, 'transparent')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(coord.x, coord.y, 60, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const dockTargets = dockTargetsRef.current
      const targetsLen = dockTargets.length || 1

      // 粒子物理迭代（全平坦 Float32Array 零分配运算）
      for (let i = 0; i < count; i++) {
        const offset = i * PARTICLE_STRIDE
        let px = pData[offset + 0]
        let py = pData[offset + 1]
        let vx = pData[offset + 2]
        let vy = pData[offset + 3]
        const attIdx = pData[offset + 6]
        const theta = pData[offset + 7]
        let size = pData[offset + 8]
        const colorId = pData[offset + 9]

        if (phase === 'imploding') {
          // 【2026 核心空间相变算法】：向宿主 DOM 卡片绝对坐标执行二阶阻尼吸入坍缩
          const target = dockTargets[attIdx % targetsLen] || { x: cx, y: cy }
          const dx = target.x - px
          const dy = target.y - py
          const dist = Math.hypot(dx, dy) + 0.1

          // 弹簧引力 + 切向微弱旋流
          const force = Math.min(dist * 12.0, 1800.0)
          const normX = dx / dist
          const normY = dy / dist

          vx += (normX * force - normY * 120.0) * dt
          vy += (normY * force + normX * 120.0) * dt

          // 临界阻尼衰减
          vx *= 0.82
          vy *= 0.82

          // 接近目标时粒子逐渐收敛变细
          if (dist < 120) {
            size *= 0.94
          }
        } else if (phase === 'chaos') {
          vx += (Math.random() - 0.5) * 2.8
          vy += (Math.random() - 0.5) * 2.8
          vx *= 0.94
          vy *= 0.94
        } else if (phase === 'attractors') {
          const targetAttractor = attractorCoords[attIdx] || { x: cx, y: cy }
          const forces = calculateAttractorPhysics(px, py, targetAttractor.x, targetAttractor.y, 120, 85)
          vx += forces.fx * dt
          vy += forces.fy * dt
          vx *= 0.91
          vy *= 0.91
        } else {
          // mobius / crystallized
          const mobPt = calculateMobiusPoint(theta + rotAngle, mobiusScale)
          const targetX = cx + mobPt.x
          const targetY = cy + mobPt.y
          vx += (targetX - px) * 2.4 * dt
          vy += (targetY - py) * 2.4 * dt
          vx *= 0.86
          vy *= 0.86
        }

        px += vx
        py += vy

        pData[offset + 0] = px
        pData[offset + 1] = py
        pData[offset + 2] = vx
        pData[offset + 3] = vy
        pData[offset + 8] = size

        // 绘制粒子
        const pAlpha = phase === 'imploding'
          ? Math.max(0.1, 1.0 - (now - implosionStartTimeRef.current) / 550)
          : 0.55 + Math.sin(elapsed * 0.003 + i) * 0.35

        ctx.fillStyle = colors[colorId] + pAlpha + ')'
        ctx.beginPath()
        ctx.arc(px, py, Math.max(0.6, size), 0, Math.PI * 2)
        ctx.fill()
      }

      animFrameIdRef.current = requestAnimationFrame(render)
    }

    animFrameIdRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
    }
  }, [active, isImploding, currentPhase, sampleDockCoordinates])

  if (!active) return null

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden select-none bg-[#08090d] text-gray-100 flex flex-col justify-between transition-opacity duration-500 ease-out ${
        isImploding ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ contain: 'strict', isolation: 'isolate' }}
      onDoubleClick={exitAwakening}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* 顶部状态与逃逸指示条 */}
      <header className="relative z-10 w-full px-5 py-4 sm:px-8 sm:py-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono tracking-wider text-emerald-400 uppercase">
            {isImploding ? 'PHASE IV · 空间相变注入主页' : 'COGNITIVE AWAKENING 2026'}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={exitAwakening}
            className="liquid-glass tactile-spring px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <span>跳过觉醒</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono border border-white/15">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* 中央主标金句浮现区 */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-5 pointer-events-none my-auto">
        {/* 活体罗盘微光徽标 */}
        <div
          className={`inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md transition-all duration-1000 ${
            currentPhase === 'chaos' ? 'opacity-30 scale-90' : 'opacity-100 scale-100 shadow-2xl shadow-emerald-500/20'
          }`}
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-spin" style={{ animationDuration: '14s' }} viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.4" />
            <circle cx="20" cy="20" r="16" stroke="#f59e0b" strokeWidth="2" strokeDasharray="24 76" strokeLinecap="round" />
            <path d="M20 10 L23 18 L30 20 L23 22 L20 30 L17 22 L10 20 L17 18 Z" fill="url(#entranceGrad)" />
            <defs>
              <linearGradient id="entranceGrad" x1="10" y1="10" x2="30" y2="30">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 终极导引金句：严格单行不折行 */}
        <div className="space-y-3">
          <div className="hero-headline-container">
            <h1
              className={`mega-monumental-headline transition-all duration-1000 ${
                currentPhase === 'chaos'
                  ? 'opacity-40 blur-xs scale-98 text-gray-400'
                  : 'opacity-100 blur-none scale-100 text-transparent bg-clip-text bg-linear-to-r from-gray-100 via-emerald-200 to-amber-200'
              }`}
            >
              {MASTER_MAXIM.title}
            </h1>
          </div>

          <p
            className={`text-sm sm:text-lg md:text-xl font-serif tracking-wide transition-all duration-1000 delay-200 ${
              currentPhase === 'chaos'
                ? 'opacity-20 text-gray-500'
                : 'opacity-90 text-emerald-300/90'
            }`}
          >
            {MASTER_MAXIM.subtitle}
          </p>
        </div>

        {/* 阶段二五大吸引子指示胶囊 */}
        <div
          className={`flex flex-wrap items-center justify-center gap-2 pt-2 transition-all duration-700 pointer-events-auto ${
            currentPhase === 'chaos' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
          }`}
        >
          {STAGE_ATTRACTORS.map((att) => (
            <a
              key={att.id}
              href={`/stage/${att.id}/`}
              onClick={() => {
                try {
                  localStorage.setItem(AWAKENING_STORAGE_KEY, 'true')
                } catch {}
              }}
              className="liquid-glass tactile-spring px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white border border-white/10 hover:border-emerald-500/50 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: att.color }} />
              <span>{att.name}</span>
              <span className="text-[10px] text-gray-400 font-mono">({att.ageSpan})</span>
            </a>
          ))}
        </div>
      </main>

      {/* 底部 Liquid Glass 3.0 控制岛 */}
      <footer className="relative z-10 w-full px-5 py-5 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
        {/* 细颗粒度时间线进度条 */}
        <div className="w-full sm:w-64 flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
            <span>COGNITIVE AWAKENING</span>
            <span>{Math.round(timelineProgress * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-emerald-500 to-amber-400 transition-all duration-75 rounded-full"
              style={{ width: `${timelineProgress * 100}%` }}
            />
          </div>
        </div>

        {/* 主操作岛 */}
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={exitAwakening}
            className="prism-border tactile-spring px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <span>🧭 开启循证人生罗盘</span>
            <span>&rarr;</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
