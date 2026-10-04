import React, { useState, useEffect } from 'react'
import { safeFetchKb } from '../lib/net.ts'
import { useAtom, $myHabits, updateHabits } from '../lib/store.ts'

interface ItemLite {
  uid: string
  title: string
  chapter: number
  index: number
  evidence: string
  evidenceBase: string
  plain?: string
  benefit?: string
  tags: {
    money: string
    time: string
    willpower: string
  }
}

export default function RandomCapsule() {
  const habits = useAtom($myHabits)
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<ItemLite[]>([])
  const [currentItem, setCurrentItem] = useState<ItemLite | null>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  const [copied, setCopied] = useState(false)

  const savedHabit = currentItem ? habits.some((h) => h.uid === currentItem.uid) : false

  // 预载轻量条目
  useEffect(() => {
    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) => safeFetchKb<ItemLite[]>(`/kb/${hash}/lite.json`))
      .then((data) => {
        setItems(data)
        // 默认选一个高质量 A 级建议
        const aGrade = data.filter((d) => d.evidenceBase === 'A' && d.plain)
        const pool = aGrade.length > 0 ? aGrade : data
        setCurrentItem(pool[Math.floor(Math.random() * pool.length)])
      })
      .catch((err) => console.error('加载盲盒数据失败', err))
  }, [])

  const drawRandom = () => {
    if (!items.length || isFlipping) return
    setIsFlipping(true)
    setCopied(false)

    setTimeout(() => {
      const next = items[Math.floor(Math.random() * items.length)]
      setCurrentItem(next)
      setTimeout(() => {
        setIsFlipping(false)
      }, 350)
    }, 250)
  }

  const toggleHabit = () => {
    if (!currentItem) return
    if (savedHabit) {
      updateHabits(habits.filter((h) => h.uid !== currentItem.uid))
    } else {
      updateHabits([
        {
          uid: currentItem.uid,
          title: currentItem.title,
          plain: currentItem.plain || currentItem.benefit,
          addedAt: Date.now(),
          streak: 0,
          completedDates: [],
        },
        ...habits,
      ])
    }
  }

  const copyShare = () => {
    if (!currentItem) return
    const text = `【今日循证灵感】${currentItem.title}\n🔬 循证评级：${currentItem.evidence}\n💡 执行要领：${currentItem.plain || currentItem.benefit || '详见指南'}\n🔗 完整依据：${window.location.origin}/q/${currentItem.uid}/`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShare = async () => {
    if (!currentItem) return
    const url = `${window.location.origin}/q/${currentItem.uid}/`
    const title = `【今日循证灵感】${currentItem.title}`
    const text = `💡 执行要领：${currentItem.plain || currentItem.benefit || '详见指南'}\n🔬 循证评级：${currentItem.evidence}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {}
    }
    copyShare()
  }

  return (
    <>
      {/* 悬浮微光盲盒入口按钮 */}
      <button
        onClick={() => {
          setIsOpen(true)
          if (!currentItem && items.length) drawRandom()
        }}
        className="fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-full bg-linear-to-r from-amber-500 to-emerald-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer border border-amber-300/30"
        title="抽取今日高性价比智慧盲盒"
      >
        <span className="text-base group-hover:rotate-45 transition-transform">🎲</span>
        <span className="hidden sm:inline font-sans">灵感盲盒</span>
        <span className="inline-block w-2 h-2 rounded-full bg-amber-200 animate-ping" />
      </button>

      {/* 弹窗遮罩与 3D 翻牌展区 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-md bg-white dark:bg-[#12151c] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 sm:p-7 space-y-6 overflow-hidden">
            {/* 顶部标题与关闭 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎲</span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 font-serif">
                    今日循证灵感盲盒
                  </h3>
                  <p className="text-[11px] text-gray-400">从 650+ 条科学建议中随心抽取当下契机</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3D 翻转卡片核心展示区 */}
            <div className="perspective-1000 py-2">
              <div
                className={`relative w-full rounded-2xl p-6 border transition-transform duration-500 transform-style-3d ${
                  isFlipping ? 'rotate-y-180 scale-95 opacity-50' : 'scale-100 opacity-100'
                } ${
                  currentItem?.evidenceBase === 'A'
                    ? 'border-emerald-300/80 dark:border-emerald-800 bg-linear-to-b from-emerald-50/70 to-white dark:from-emerald-950/30 dark:to-[#141822]'
                    : 'border-amber-300/80 dark:border-amber-800 bg-linear-to-b from-amber-50/70 to-white dark:from-amber-950/30 dark:to-[#141822]'
                } shadow-md`}
              >
                {currentItem ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-400">#{currentItem.uid}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          currentItem.evidenceBase === 'A'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        🔬 证据等级 {currentItem.evidence}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
                      {currentItem.title}
                    </h4>

                    {currentItem.plain && (
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-black/40 border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          💡 大白话：
                        </span>
                        {currentItem.plain}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        💰 钱: {currentItem.tags.money}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        ⏱️ 时: {currentItem.tags.time}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        🧠 毅力: {currentItem.tags.willpower}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-400">正在摇牌抽取中...</div>
                )}
              </div>
            </div>

            {/* 操作控制区 */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={drawRandom}
                disabled={isFlipping}
                className="w-full py-3 rounded-xl text-sm font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className={isFlipping ? 'animate-spin' : ''}>🔄</span>
                <span>再抽一张（洗牌翻转）</span>
              </button>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {currentItem && (
                  <a
                    href={`/q/${currentItem.uid}/`}
                    className="py-2 rounded-xl text-center font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    📖 详情出处
                  </a>
                )}
                <button
                  onClick={toggleHabit}
                  className={`py-2 rounded-xl text-center font-semibold border transition-colors cursor-pointer ${
                    savedHabit
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {savedHabit ? '✓ 已入习惯' : '➕ 入我的习惯'}
                </button>
                <button
                  onClick={handleShare}
                  className={`py-2 rounded-xl text-center font-semibold border transition-colors cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {copied ? '✓ 已复制' : '📲 分享卡片'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
