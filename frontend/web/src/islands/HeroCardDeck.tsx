import React, { useState, useEffect, useRef } from 'react'
import { playSound } from '../lib/sound'

interface CardItem {
  id: string
  title: string
  category: string
  tag: string
  evidence: string
  benefit: string
  cost: string
  source: string
}

const FEATURED_CARDS: CardItem[] = [
  {
    id: 'deck-1',
    title: '晨起一杯温水与 3 分钟躯干拉伸',
    category: '身体健康',
    tag: '零成本 · 高杠杆',
    evidence: 'Lancet 2023 · 唤醒胃结肠反射与副交感节律',
    benefit: '加速基础代谢，降低清晨心血管阻抗',
    cost: '¥0 · 3分钟',
    source: '/q/2V9M4K1P/',
  },
  {
    id: 'deck-2',
    title: '20-20-20 护眼法则：远眺 20 秒',
    category: '日常精力',
    tag: '零成本 · 立即见效',
    evidence: 'AAO 美国眼科学会 · 睫状肌微痉挛预防试验',
    benefit: '阻断干眼症与视疲劳累积，维持专注',
    cost: '¥0 · 20秒',
    source: '/q/7B8X3M9L/',
  },
  {
    id: 'deck-3',
    title: '睡前 45 分钟阻断冷光源与信息瀑布',
    category: '睡眠修复',
    tag: '高收益 · 习惯底线',
    evidence: 'Nature Neuroscience · 视网膜神经节细胞光敏感机制',
    benefit: '内源褪黑素自然分泌，深度慢波睡眠提升 25%',
    cost: '¥0 · 45分钟',
    source: '/q/9D4K2N8X/',
  },
  {
    id: 'deck-4',
    title: '6 个月底线应急储备金（存入低波货币工具）',
    category: '财务安全',
    tag: '核心防线 · 反脆弱',
    evidence: 'Behavioral Finance · 确定性流动性对认知带宽的保护',
    benefit: '彻底消除职场被动妥协内耗，建立生活自决底牌',
    cost: '保本低风险',
    source: '/scenario/laid-off/',
  },
  {
    id: 'deck-5',
    title: '晚间 5 分钟斯多葛「塞涅卡三问」微自省',
    category: '心智觉醒',
    tag: '心智卫生 · 去羞耻',
    evidence: 'Cognitive Behavioral Therapy (CBT) · 睡前情绪解耦',
    benefit: '区分可控与不可控，切断反刍内耗，安然入眠',
    cost: '¥0 · 5分钟',
    source: '/tools/constitution/',
  },
]

export default function HeroCardDeck() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({})
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 读取本地打卡状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem('howtolivebetter:deck_completed')
      if (saved) {
        setCompletedMap(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // 自动轮播（6秒）
  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURED_CARDS.length)
    }, 6000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused])

  const handlePrev = () => {
    playSound('tap')
    setCurrentIndex((prev) => (prev - 1 + FEATURED_CARDS.length) % FEATURED_CARDS.length)
  }

  const handleNext = () => {
    playSound('tap')
    setCurrentIndex((prev) => (prev + 1) % FEATURED_CARDS.length)
  }

  const handleToggleDone = (id: string) => {
    const nextState = !completedMap[id]
    const updated = { ...completedMap, [id]: nextState }
    setCompletedMap(updated)
    try {
      localStorage.setItem('howtolivebetter:deck_completed', JSON.stringify(updated))
    } catch {}

    if (nextState) {
      playSound('done')
    } else {
      playSound('unmark')
    }
  }

  const card = FEATURED_CARDS[currentIndex]
  const isDone = !!completedMap[card.id]

  return (
    <div
      className="w-full max-w-md mx-auto px-4 sm:px-6 relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 双层斜切卡片甲板容器 */}
      <div className="life-hero-card-deck">
        <div className="life-hero-card-top p-6 sm:p-7 transition-all duration-300">
          {/* 卡片头部标签与序号 */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#d5ed9e] text-[#12382d]">
                {card.category}
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                {card.tag}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
              <span className="font-bold text-gray-800 dark:text-gray-200">0{currentIndex + 1}</span>
              <span>/</span>
              <span>0{FEATURED_CARDS.length}</span>
            </div>
          </div>

          {/* 卡片大标题 */}
          <h3 className="text-xl sm:text-2xl font-bold font-serif text-gray-900 dark:text-white leading-snug tracking-tight mb-4 min-h-[3.6rem]">
            {card.title}
          </h3>

          {/* 循证与收益清单 */}
          <div className="space-y-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 bg-[#f7f7f0] dark:bg-[#182820]/50 p-3.5 rounded-xl border border-[#dce4d5]/60 dark:border-[#1c352a]">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">🔬 循证</span>
              <span className="line-clamp-1">{card.evidence}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">⚡ 杠杆</span>
              <span className="line-clamp-1">{card.benefit}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-[#dce4d5]/50 dark:border-[#1c352a]">
              <span>支出成本：<strong className="text-gray-800 dark:text-gray-200">{card.cost}</strong></span>
              <a
                href={card.source}
                onClick={() => playSound('tap')}
                className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                查看条目 ↗
              </a>
            </div>
          </div>

          {/* 底部操作行 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleToggleDone(card.id)}
              className={`flex-1 life-btn py-2 text-xs sm:text-sm ${
                isDone
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'life-btn-lime'
              }`}
            >
              {isDone ? '✓ 今日已完成' : '○ 标记为今日做过'}
            </button>

            {/* 左右翻页按钮 */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-full border border-[#dce4d5] dark:border-[#1c352a] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-[#edece1] dark:hover:bg-[#1c352a] transition-colors"
                title="上一张"
                aria-label="上一张"
              >
                ←
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-full border border-[#dce4d5] dark:border-[#1c352a] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-[#edece1] dark:hover:bg-[#1c352a] transition-colors"
                title="下一张"
                aria-label="下一张"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部微小胶囊指示器 (Dots) */}
      <div className="flex items-center justify-center gap-1.5 mt-5">
        {FEATURED_CARDS.map((_, idx) => {
          const isActive = idx === currentIndex
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                playSound('tap')
                setCurrentIndex(idx)
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isActive
                  ? 'w-6 bg-[#d5ed9e]'
                  : 'w-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
              }`}
              title={`切换到第 ${idx + 1} 张`}
              aria-label={`切换到第 ${idx + 1} 张`}
            />
          )
        })}
      </div>
    </div>
  )
}
