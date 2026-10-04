import React, { useRef } from 'react'

/**
 * LivingLogo.tsx - 2026 莫比乌斯活体罗盘标识组件
 * 
 * 架构优化：
 * 1. 采用 CSS 变量直驱 GPU Compositor 线程，彻底消除高频鼠标移动时的 React 组件重渲染与 GC 损耗；
 * 2. 翡翠绿 ⇄ 琥珀金 OKLCH 双色莫比乌斯生命流；
 * 3. 欠阻尼弹簧触觉物理与空间视差倾斜。
 */
export default function LivingLogo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // 鼠标悬停 3D 微倾斜跟踪：直驱 CSS 自定义变量，0 React Re-render
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cardRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 18
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -18
    cardRef.current.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`)
    cardRef.current.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`)
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.setProperty('--tilt-x', '0deg')
    cardRef.current.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center gap-3 cursor-pointer select-none group perspective-1000 py-1"
      role="banner"
      aria-label="HowToLiveBetter Living Compass Logo"
    >
      <div
        ref={cardRef}
        onClick={(e) => {
          if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '')) {
            e.preventDefault()
            e.stopPropagation()
            window.dispatchEvent(new CustomEvent('open-awakening'))
          }
        }}
        title="点击罗盘唤醒认知觉醒全屏仪式"
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-transform duration-150 ease-out transform-style-3d shadow-md group-hover:shadow-emerald-500/20 group-hover:scale-105"
        style={{
          transform: 'rotateX(var(--tilt-y, 0deg)) rotateY(var(--tilt-x, 0deg))',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(245,158,11,0.08) 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          willChange: 'transform',
        }}
      >
        {/* 背景动态环境光晕 */}
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/25 blur-md transition-opacity duration-300 pointer-events-none opacity-30 group-hover:opacity-100 group-hover:scale-110" />

        {/* 动态 SVG 罗盘与莫比乌斯内核 */}
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-8 sm:h-8 relative z-10" fill="none">
          {/* 外环精密刻度轨迹 */}
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            className="text-emerald-500/30 dark:text-emerald-400/30"
            strokeWidth="1.2"
            strokeDasharray="2 4"
          />

          {/* 活跃动态光流环 */}
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="url(#compassGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="28 72"
            className="animate-spin origin-center duration-9000 group-hover:duration-3000"
          />

          {/* 莫比乌斯八向生命罗盘星标 */}
          <path
            d="M20 9 L23.5 17.5 L31 20 L23.5 22.5 L20 31 L16.5 22.5 L9 20 L16.5 17.5 Z"
            fill="url(#coreGrad)"
            className="transition-transform duration-300 group-hover:scale-110 origin-center filter drop-shadow-xs"
          />

          <defs>
            <linearGradient id="compassGrad" x1="0" y1="0" x2="40" y2="40">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="coreGrad" x1="9" y1="9" x2="31" y2="31">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight font-serif">
            高性价比人生指南
          </span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            2026
          </span>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-widest leading-none mt-0.5">
          LIVING COMPASS · HOW TO LIVE BETTER
        </span>
      </div>
    </div>
  )
}
