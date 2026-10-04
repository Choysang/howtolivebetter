import React, { useState, useEffect, useId } from 'react'
import type { UserCognitiveSnapshot, BloomCalculationResult } from '@contracts/bloom.ts'
import { calculateCBI } from '@kernel/bloom.ts'
import {
  calculateRadarPoints,
  calculateCognitiveBalanceMetrics,
  deriveNextStepQuantumGuide,
} from '@kernel/radar.ts'

interface Props {
  size?: number
  defaultExpanded?: boolean
}

export default function CognitiveEvolutionRadar({ size = 340, defaultExpanded = false }: Props) {
  const filterId = useId().replace(/:/g, '')
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<UserCognitiveSnapshot>({
    readCount: 0,
    lensExplorations: 0,
    habitCheckinCount: 0,
    checkupCount: 0,
    dialecticEvaluations: 0,
    constitutionArticles: 0,
  })

  // 纯端侧同步用户多维认知行为数据（零遥测、物理不出设备）
  useEffect(() => {
    setMounted(true)
    try {
      const readRaw = localStorage.getItem('htlb-read-items')
      const readCount = readRaw ? (JSON.parse(readRaw) as string[]).length : 0

      // 提取打卡历史记录
      let habitCheckinCount = 0
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('checkin-') && /^\d{4}-\d{2}-\d{2}$/.test(k.slice(8))) {
          const val = localStorage.getItem(k)
          if (val) {
            try {
              const parsed = JSON.parse(val)
              habitCheckinCount += Object.keys(parsed).length
            } catch {}
          }
        }
      }

      // 提取个人生活宪法条款
      let constitutionArticles = 0
      const constRaw = localStorage.getItem('htlb-my-constitution')
      if (constRaw) {
        try {
          const parsed = JSON.parse(constRaw)
          constitutionArticles = Array.isArray(parsed?.rules) ? parsed.rules.length : 0
        } catch {}
      }

      // 提取自测与体检次数（存在即视为至少完成 1 次）
      const hasAnswers = window.location.hash.includes('ans=')
      const checkupCount = hasAnswers ? 1 : 0

      // 提取思维透镜与辩证反思体验估算
      const lensRaw = localStorage.getItem('htlb-lens-explored')
      const lensExplorations = lensRaw ? Number(lensRaw) || 0 : (readCount > 5 ? 2 : 0)

      const dialecticRaw = localStorage.getItem('htlb-dialectic-viewed')
      const dialecticEvaluations = dialecticRaw ? Number(dialecticRaw) || 0 : (constitutionArticles > 0 ? 3 : 0)

      setSnapshot({
        readCount,
        lensExplorations,
        habitCheckinCount,
        checkupCount,
        dialecticEvaluations,
        constitutionArticles,
      })
    } catch (e) {
      console.error(e)
    }
  }, [])

  if (!mounted) {
    return (
      <div className="p-4 rounded-2xl bg-gray-100/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800 animate-pulse text-center text-xs text-gray-400">
        正在初始化布鲁姆认知演化雷达...
      </div>
    )
  }

  const result: BloomCalculationResult = calculateCBI(snapshot)
  const center = size / 2
  const maxRadius = size * 0.36
  const { points, polygonString } = calculateRadarPoints(result, {
    size,
    cx: center,
    cy: center,
    radius: maxRadius,
  })

  const balanceMetrics = calculateCognitiveBalanceMetrics(result)
  const nextStep = deriveNextStepQuantumGuide(result)
  const stepLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-linear-to-br from-emerald-500/10 via-slate-900/40 to-amber-500/5 border border-emerald-500/20 backdrop-blur-md shadow-xl transition-all duration-300">
      {/* 头部摘要与位阶徽章 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200/40 dark:border-gray-800/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              布鲁姆心智六阶 · 演化全息雷达
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              心智位阶：{result.title}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-serif text-gray-900 dark:text-gray-100 mt-1">
            认知跃迁指数 CBI: <span className="font-mono text-emerald-600 dark:text-emerald-400">{result.totalScore}</span> / 100
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mt-0.5 leading-relaxed">
            {result.summary}
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-end sm:self-auto px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        >
          {isExpanded ? '收起雷达仪表 ▲' : '展开演化雷达 ▼'}
        </button>
      </div>

      {/* 雷达图核心与微阻抗下一步指引 */}
      {isExpanded && (
        <div className="mt-5 space-y-6 animate-fade-up">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            {/* 纯原生零依赖 SVG 雷达画布 */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible select-none"
                role="img"
                aria-label="布鲁姆六阶心智极坐标演化雷达"
              >
                <defs>
                  {/* 2026 极光呼吸微光滤镜 */}
                  <filter id={`glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {/* 全息极光径向能量场 */}
                  <radialGradient id={`aurora-${filterId}`} cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                  </radialGradient>
                </defs>

                {/* 1. 同心正六边形等高网格 */}
                {stepLevels.map((lvl) => {
                  const gridPts = Array.from({ length: 6 })
                    .map((_, i) => {
                      const angle = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 6
                      const r = maxRadius * lvl
                      return `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`
                    })
                    .join(' ')
                  return (
                    <polygon
                      key={lvl}
                      points={gridPts}
                      fill={lvl === 1 ? 'rgba(15, 23, 42, 0.4)' : 'none'}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth={lvl === 1 ? '1.5' : '1'}
                      strokeDasharray={lvl < 1 ? '3 3' : undefined}
                    />
                  )
                })}

                {/* 2. 六条辐向射线 */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const angle = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 6
                  const x2 = center + maxRadius * Math.cos(angle)
                  const y2 = center + maxRadius * Math.sin(angle)
                  return (
                    <line
                      key={i}
                      x1={center}
                      y1={center}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1"
                    />
                  )
                })}

                {/* 3. 用户认知多边形实体（极光微光滤镜） */}
                <polygon
                  points={polygonString}
                  fill={`url(#aurora-${filterId})`}
                  stroke="#10b981"
                  strokeWidth="2.5"
                  filter={`url(#glow-${filterId})`}
                  style={{ transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />

                {/* 4. 顶点微晶点与膨胀触控命中域 */}
                {points.map((pt, i) => {
                  const isHovered = hoveredIdx === i
                  return (
                    <g
                      key={pt.level}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* 膨胀不可见命中圆 */}
                      <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />
                      {/* 脉冲光圈 */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="9"
                          fill="rgba(16, 185, 129, 0.25)"
                          stroke="#10b981"
                          strokeWidth="1.2"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5 : 3.5}
                        fill={isHovered ? '#6ee7b7' : '#10b981'}
                        stroke="#020617"
                        strokeWidth="1.5"
                      />
                    </g>
                  )
                })}

                {/* 5. 坐标轴标签自适应避让排版 */}
                {points.map((pt, i) => {
                  const angle = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 6
                  const pushDist = maxRadius * 1.22
                  const labelX = center + pushDist * Math.cos(angle)
                  const labelY = center + pushDist * Math.sin(angle)
                  const cos = Math.cos(angle)

                  let anchor: 'start' | 'end' | 'middle' = 'middle'
                  if (cos > 0.25) anchor = 'start'
                  else if (cos < -0.25) anchor = 'end'

                  return (
                    <text
                      key={pt.level}
                      x={labelX}
                      y={labelY}
                      textAnchor={anchor}
                      dominantBaseline="central"
                      fontSize="10"
                      className="font-mono font-medium fill-gray-600 dark:fill-gray-300 select-none pointer-events-none"
                    >
                      L{pt.level} {pt.dimensionName.split(' ')[0]}
                      <tspan className="fill-emerald-600 dark:fill-emerald-400 font-bold">
                        {' '}{Math.round(pt.scoreRatio * 100)}%
                      </tspan>
                    </text>
                  )
                })}
              </svg>

              {/* 顶点悬浮微卡片 */}
              {hoveredIdx !== null && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs shadow-xl pointer-events-none z-20 whitespace-nowrap">
                  <span className="text-emerald-400 font-bold">
                    L{points[hoveredIdx].level} {points[hoveredIdx].dimensionName}
                  </span>
                  ：饱和度 {(points[hoveredIdx].scoreRatio * 100).toFixed(0)}% · 点击前往「{points[hoveredIdx].verb}」
                </div>
              )}
            </div>

            {/* 右侧：香农均衡度仪表与下一阶跃迁微动作 */}
            <div className="flex-1 space-y-4 w-full">
              {/* 香农均衡度与偏瘫防护 */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    香农认知均衡度 (Shannon Factor):
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(balanceMetrics.shannonEntropy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${balanceMetrics.shannonEntropy * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {balanceMetrics.hasCognitiveHemiplegia ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⚠️ 提示：检测到单维发展过载。建议从单纯刷阅读，转向微习惯践行与生活立宪，让心智多维对称展开。
                    </span>
                  ) : (
                    <span>
                      ✨ 心智六阶稳态共振：多维知行均衡度极高，有效抵御认知盲区与均值回归。
                    </span>
                  )}
                </div>
              </div>

              {/* 下一步最低阻抗原子行动指引 */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    ⚡ 下一步量子跃迁指引（微阻抗 ROI 最优）
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    距下一阶还需 {nextStep.scoreGapToNextStage} 分
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  {nextStep.suggestedAction}
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    执行维度：L{nextStep.level} {nextStep.dimensionName}
                  </span>
                  <a
                    href={nextStep.targetUrl}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    立即践行 &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
