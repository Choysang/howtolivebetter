import React, { useState, useEffect } from 'react'
import { safeFetchKb } from '../lib/net.ts'
import { useAtom, $myHabits, updateHabits, type HabitItem } from '../lib/store.ts'

interface LiteItem {
  uid: string
  title: string
  plain?: string
  evidence: string
  tags: { money: string; time: string; willpower: string }
}

const DEFAULT_HABITS: HabitItem[] = [
  {
    uid: '083TMQ1Z',
    title: '保证 7–8 小时规律睡眠，固定作息节律',
    plain: '睡眠是性价比最高的身体与认知修复系统，不熬夜胜过所有昂贵补品。',
    streak: 3,
    addedAt: Date.now() - 86400000 * 3,
    completedDates: [],
  },
  {
    uid: '3W2GSHAH',
    title: '每天步行达到 7000–8000 步',
    plain: '无需去健身房，把日常通勤拆为步行，全因死亡率与心血管风险断崖式下降。',
    streak: 2,
    addedAt: Date.now() - 86400000 * 2,
    completedDates: [],
  },
  {
    uid: '4N958DQB',
    title: '完全杜绝含糖饮料，以无糖水或茶代替',
    plain: '液体糖是慢性炎症、脂肪肝与代谢综合征的最快推手，戒糖即赚纯利润。',
    streak: 5,
    addedAt: Date.now() - 86400000 * 5,
    completedDates: [],
  },
]

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HabitTracker() {
  const habits = useAtom($myHabits)
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState(getTodayStr())
  const [searchQuery, setSearchQuery] = useState('')
  const [allPool, setAllPool] = useState<LiteItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [justCompletedUid, setJustCompletedUid] = useState<string | null>(null)

  // 1. 初始化从 store / localStorage 检查并注入种子习惯
  useEffect(() => {
    setMounted(true)
    setToday(getTodayStr())
    if (habits.length === 0) {
      try {
        const stored = localStorage.getItem('htlb-my-habits')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            updateHabits(parsed)
            return
          }
        }
        // 默认种子习惯
        const todayStr = getTodayStr()
        const seeded = DEFAULT_HABITS.map((h, i) => ({
          ...h,
          completedDates: i === 0 ? [todayStr] : [],
        }))
        updateHabits(seeded)
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // 2. 预载供添加的全量建议
  useEffect(() => {
    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) => safeFetchKb<LiteItem[]>(`/kb/${hash}/lite.json`))
      .then((list) => setAllPool(list))
      .catch((e) => console.error(e))
  }, [])

  const saveHabits = (next: HabitItem[]) => {
    updateHabits(next)
  }


  // 切换今日打卡完成
  const toggleComplete = (uid: string) => {
    const todayStr = getTodayStr()
    const next = habits.map((h) => {
      if (h.uid !== uid) return h
      const done = h.completedDates.includes(todayStr)
      let nextDates: string[]
      let nextStreak = h.streak
      if (done) {
        nextDates = h.completedDates.filter((d) => d !== todayStr)
        nextStreak = Math.max(0, nextStreak - 1)
      } else {
        nextDates = [...h.completedDates, todayStr]
        nextStreak = nextStreak + 1
        setJustCompletedUid(uid)
        setTimeout(() => setJustCompletedUid(null), 1200)
      }
      return {
        ...h,
        completedDates: nextDates,
        streak: nextStreak,
      }
    })
    saveHabits(next)
  }

  // 删除习惯
  const removeHabit = (uid: string) => {
    if (!confirm('确定将该条从个人习惯养成库中移除？')) return
    const next = habits.filter((h) => h.uid !== uid)
    saveHabits(next)
  }

  // 从建议池添加新习惯
  const addHabitFromItem = (item: LiteItem) => {
    if (habits.some((h) => h.uid === item.uid)) {
      alert('已在您的个人习惯列表中')
      return
    }
    const newHabit: HabitItem = {
      uid: item.uid,
      title: item.title,
      plain: item.plain,
      streak: 0,
      addedAt: Date.now(),
      completedDates: [],
    }
    const next = [newHabit, ...habits]
    saveHabits(next)
    setIsAdding(false)
    setSearchQuery('')
  }

  // 导出 JSON 备份
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(habits, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `howtolivebetter-habits-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 导入 JSON 备份
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string)
        if (Array.isArray(parsed)) {
          saveHabits(parsed)
          alert(`成功恢复 ${parsed.length} 项个人习惯！`)
        } else {
          alert('文件格式不正确')
        }
      } catch (err) {
        alert('解析备份失败')
      }
    }
    reader.readAsText(file)
  }

  // 过去 28 天打卡热力图数据
  const last28Days = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  // 计算某天全习惯打卡率
  const getDayCompletionRate = (dateStr: string) => {
    if (!habits.length) return 0
    const count = habits.filter((h) => h.completedDates.includes(dateStr)).length
    return count / habits.length
  }

  const todayCompletedCount = habits.filter((h) => h.completedDates.includes(today)).length

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 仪表板概览统计 */}
      <div className="p-6 sm:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              🌱 循证习惯养成工作台
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 font-serif">
              今日践行：{todayCompletedCount} / {habits.length} 项
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm tactile-press cursor-pointer flex items-center gap-1.5"
            >
              <span>➕ 添加新习惯</span>
            </button>
            <button
              onClick={exportBackup}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors tactile-press cursor-pointer"
              title="导出本地 JSON 备份"
            >
              📥 导出备份
            </button>
            <label className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer inline-flex items-center">
              <span>📤 恢复</span>
              <input type="file" accept=".json" onChange={importBackup} className="hidden" />
            </label>
          </div>
        </div>

        {/* 过去 28 天坚持热力微网格 */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>过去 28 天践行热力网格（物理级零遥测，仅存本地）</span>
            <span className="font-mono">{today}</span>
          </div>
          <div className="grid grid-cols-14 sm:grid-cols-28 gap-1.5 py-1">
            {last28Days.map((d) => {
              const rate = getDayCompletionRate(d)
              let bg = 'bg-gray-100 dark:bg-gray-800'
              if (rate > 0.75) bg = 'bg-emerald-600'
              else if (rate > 0.4) bg = 'bg-emerald-400 dark:bg-emerald-500'
              else if (rate > 0) bg = 'bg-emerald-200 dark:bg-emerald-800'
              return (
                <div
                  key={d}
                  className={`h-5 rounded-md transition-all ${bg} relative group cursor-pointer hover:scale-115`}
                  title={`${d}: 完成度 ${Math.round(rate * 100)}%`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* 习惯卡片列表 */}
      <div className="space-y-3.5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 font-serif flex items-center justify-between">
          <span>我的习惯追踪列表（{habits.length} 项）</span>
          <span className="text-xs text-gray-400 font-sans font-normal">点击圆圈完成今日打卡</span>
        </h3>

        {habits.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 text-sm">
            暂无习惯，点击上方「➕ 添加新习惯」或从全书 650+ 条中收藏加入！
          </div>
        ) : (
          habits.map((h) => {
            const isDoneToday = h.completedDates.includes(today)
            const isJustCompleted = justCompletedUid === h.uid

            return (
              <div
                key={h.uid}
                className={`p-4 sm:p-5 rounded-2xl border transition-all card-hover-tactile flex items-start gap-3.5 sm:gap-4 relative overflow-hidden ${
                  isDoneToday
                    ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c]'
                }`}
              >
                {/* 打卡触感勾选框 */}
                <button
                  onClick={() => toggleComplete(h.uid)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all tactile-press cursor-pointer shrink-0 mt-0.5 ${
                    isDoneToday
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 text-transparent'
                  }`}
                >
                  ✓
                </button>

                {/* 习惯主体 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-gray-400">#{h.uid}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      🔥 连续 {h.streak} 天
                    </span>
                    {isJustCompleted && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-bounce">
                        ✨ 今日达成！
                      </span>
                    )}
                  </div>

                  <h4 className={`text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-1 ${isDoneToday ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                    {h.title}
                  </h4>

                  {h.plain && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {h.plain}
                    </p>
                  )}
                </div>

                {/* 操作与出处 */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  <a
                    href={`/q/${h.uid}/`}
                    className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="查看完整循证详情"
                  >
                    📖
                  </a>
                  <button
                    onClick={() => removeHabit(h.uid)}
                    className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="移除习惯"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 添加新习惯弹窗 */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#12151c] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 font-serif">
                从全书 650+ 条建议中添加习惯
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="搜索条目关键词（如：睡眠、喝水、运动、阅读）..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 outline-none"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {allPool
                .filter((p) => !searchQuery || p.title.includes(searchQuery) || p.plain?.includes(searchQuery))
                .slice(0, 20)
                .map((it) => (
                  <div
                    key={it.uid}
                    className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-400 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                        {it.title}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        🔬 证据 {it.evidence} · 毅力: {it.tags.willpower}
                      </div>
                    </div>
                    <button
                      onClick={() => addHabitFromItem(it)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shrink-0 tactile-press cursor-pointer"
                    >
                      ➕ 加入
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
