import React, { useState, useEffect, useRef } from 'react'

interface RestTip {
  title: string
  action: string
  source: string
}

const REST_TIPS: RestTip[] = [
  {
    title: '👀 20-20-20 远眺护眼法',
    action: '抬头注视 20 英尺（约 6 米）外的窗外或远物至少 20 秒，完全放松睫状肌。',
    source: '第 12 章 · 视力保护',
  },
  {
    title: '🧘 久坐骨盆与髋屈肌拉伸',
    action: '起立做单腿弓步拉伸，双手向上延展，缓解久坐导致的骨盆前倾与下腰酸胀。',
    source: '第 14 章 · 脊柱健康',
  },
  {
    title: '💧 补充 200ml 纯水',
    action: '轻啜温水，补充工作期间无感蒸发的水分，促进脑脊液代谢废物排出。',
    source: '第 8 章 · 水分代谢',
  },
  {
    title: '🫁 4-7-8 箱式深呼吸',
    action: '吸气 4 秒，屏息 7 秒，慢呼 8 秒，重复 3 组，强制将自主神经从交感切换为副交感。',
    source: '第 11 章 · 压力阻断',
  },
]

function getLocalDateKey(): string {
  const d = new Date()
  return `htlb-focus-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FocusTimer() {
  const [mode, setMode] = useState<'work' | 'rest'>('work')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0)
  const [currentTip, setCurrentTip] = useState(REST_TIPS[0])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const targetEndTimeRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const wakeLockRef = useRef<any>(null)

  // 1. 初始化读取今日专注累计时长（按本地日期）
  useEffect(() => {
    try {
      const todayKey = getLocalDateKey()
      const saved = Number(localStorage.getItem(todayKey) || '0')
      setTodayFocusMinutes(saved)
    } catch (e) {}
  }, [])

  // 2. 音频提示音（Web Audio API 单例复用，规避句柄泄露）
  const getAudioContext = () => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) audioCtxRef.current = new AudioCtx()
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  const playBeep = (freq = 587.33, duration = 0.3) => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (e) {}
  }

  // 3. 屏幕常亮 Wake Lock 申请与释放
  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch {}
  }

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch {}
      wakeLockRef.current = null
    }
  }

  // 4. 页面可见性重聚瞬时物理校准（解决休眠降频与 Timer 漂移）
  useEffect(() => {
    const handleReactivate = () => {
      if (isRunning && targetEndTimeRef.current) {
        requestWakeLock()
        const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000))
        setTimeLeft(remaining)
      }
    }
    document.addEventListener('visibilitychange', handleReactivate)
    window.addEventListener('focus', handleReactivate)
    return () => {
      document.removeEventListener('visibilitychange', handleReactivate)
      window.removeEventListener('focus', handleReactivate)
    }
  }, [isRunning])

  // 5. 高精度时间戳差量心跳
  useEffect(() => {
    if (isRunning) {
      targetEndTimeRef.current = Date.now() + timeLeft * 1000
      requestWakeLock()
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }

      timerRef.current = setInterval(() => {
        if (!targetEndTimeRef.current) return
        const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000))
        setTimeLeft(remaining)

        if (remaining <= 0) {
          playBeep(880, 0.5)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('⏰ 专注周期完成！', {
                body: mode === 'work' ? '已达成 25 分钟番茄钟，请离开屏幕，远眺 20 秒并活动身体。' : '5 分钟休息结束，准备好重新进入心流了吗？',
                icon: '/favicon.svg'
              })
            } catch {}
          }

          if (mode === 'work') {
            const todayKey = getLocalDateKey()
            const added = todayFocusMinutes + durationMinutes
            setTodayFocusMinutes(added)
            try {
              localStorage.setItem(todayKey, String(added))
            } catch (e) {}
            setMode('rest')
            const restSeconds = 5 * 60
            setTimeLeft(restSeconds)
            targetEndTimeRef.current = Date.now() + restSeconds * 1000
            setCurrentTip(REST_TIPS[Math.floor(Math.random() * REST_TIPS.length)])
          } else {
            setMode('work')
            const workSeconds = durationMinutes * 60
            setTimeLeft(workSeconds)
            targetEndTimeRef.current = null
            setIsRunning(false)
          }
        }
      }, 500)
    } else {
      targetEndTimeRef.current = null
      releaseWakeLock()
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      releaseWakeLock()
    }
  }, [isRunning, mode, durationMinutes, todayFocusMinutes])

  const toggleRun = () => {
    setIsRunning(!isRunning)
    playBeep(440, 0.1)
  }

  const resetTimer = (mins: number) => {
    targetEndTimeRef.current = null
    releaseWakeLock()
    setIsRunning(false)
    setMode('work')
    setDurationMinutes(mins)
    setTimeLeft(mins * 60)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // 进度百分比
  const totalSeconds = mode === 'work' ? durationMinutes * 60 : 5 * 60
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-up">
      {/* 头部导航与状态 */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span>⏳ 科学心流番茄钟</span>
          <span>·</span>
          <span>今日已沉浸 {todayFocusMinutes} 分钟</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-serif">
          {mode === 'work' ? '深度工作 · 阻断杂念' : '循证休息 · 身体复位'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          根据原书认知能量管理原则：25 分钟全神贯注，5 分钟强制离开屏幕舒展神经
        </p>
      </div>

      {/* 核心流体呼吸计时圆环 */}
      <div className="relative flex flex-col items-center justify-center py-8">
        {/* 背景呼吸光晕 */}
        <div
          className={`absolute w-72 h-72 rounded-full filter blur-3xl opacity-20 transition-all duration-1000 ${
            isRunning
              ? mode === 'work'
                ? 'bg-emerald-500 scale-110'
                : 'bg-amber-500 scale-110'
              : 'bg-gray-400 scale-90'
          }`}
        />

        {/* 计时面板卡片 */}
        <div className="relative z-10 w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center bg-white/90 dark:bg-[#12151c]/90 backdrop-blur-md shadow-2xl space-y-2">
          <div className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
            {mode === 'work' ? 'FOCUS TIME' : 'RESTORE TIME'}
          </div>

          <div className="text-5xl sm:text-6xl font-mono font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {formattedTime}
          </div>

          {/* 进度弧线提示 */}
          <div className="w-32 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                mode === 'work' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="text-xs text-gray-400 pt-1">
            {isRunning ? '心流呼吸中...' : '已暂停'}
          </div>
        </div>
      </div>

      {/* 控制操作栏 */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleRun}
            className={`px-8 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg tactile-press cursor-pointer flex items-center gap-2 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            <span>{isRunning ? '⏸ 暂停' : '▶ 开启专注'}</span>
          </button>

          <button
            onClick={() => resetTimer(durationMinutes)}
            className="px-4 py-3.5 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 dark:text-gray-300 transition-colors tactile-press cursor-pointer"
          >
            🔄 重置
          </button>
        </div>

        {/* 时长预设按钮 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">专注预设：</span>
          {[15, 25, 45].map((mins) => (
            <button
              key={mins}
              onClick={() => resetTimer(mins)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors tactile-press cursor-pointer ${
                durationMinutes === mins && mode === 'work'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {mins} 分钟
            </button>
          ))}
        </div>
      </div>

      {/* 循证休息卡片展示 */}
      {mode === 'rest' && (
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-2 animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              💡 此时推荐的 5 分钟微动作：
            </span>
            <span className="text-[10px] text-gray-400">{currentTip.source}</span>
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {currentTip.title}
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {currentTip.action}
          </p>
        </div>
      )}
    </div>
  )
}
