import React, { useState, useEffect } from 'react'
import type { CheckinSpec, CheckinItem } from '@contracts/kb.ts'
import type { ConstitutionRule } from '@contracts/cognitive.ts'
import { toICS } from '@kernel/schedule.ts'
import { determineStoicPhase, calculateResilienceLatency, type ResilienceAnalysis } from '@kernel/resilience.ts'

interface Props {
  spec: CheckinSpec
}

type CheckinLevel = 'floor' | 'ceiling'

export interface ConstitutionalCheckinItem extends CheckinItem {
  isConstitutional: true
  ruleIndex: number
  rationale: string
  floorCommitment: string
}

interface WorryItem {
  id: string
  text: string
  controllable: boolean | null
}

export default function CheckinTracker({ spec }: Props) {
  const [mounted, setMounted] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const currentHour = mounted ? new Date().getHours() : 12
  const stoicPhase = determineStoicPhase(currentHour)

  const [checkedMap, setCheckedMap] = useState<Record<string, CheckinLevel>>({})
  const [resilience, setResilience] = useState<ResilienceAnalysis | null>(null)
  const [constitutionalItems, setConstitutionalItems] = useState<ConstitutionalCheckinItem[]>([])

  // 暮夜塞涅卡复盘抽屉状态
  const [showSenecaDrawer, setShowSenecaDrawer] = useState(false)
  const [worries, setWorries] = useState<WorryItem[]>([
    { id: '1', text: '突发外部变化与不确定性干扰', controllable: null },
    { id: '2', text: '今日精力状态起伏与计划延宕', controllable: null },
  ])
  const [newWorry, setNewWorry] = useState('')
  const [peaceSealActivated, setPeaceSealActivated] = useState(false)

  const storageKey = `checkin-${today}`

  // 初始化读取今日与历史打卡日期，消除 SSR 水合不一致
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const normalized: Record<string, CheckinLevel> = {}
        for (const [k, v] of Object.entries(parsed)) {
          if (v === true || v === 'ceiling') normalized[k] = 'ceiling'
          else if (v === 'floor') normalized[k] = 'floor'
        }
        setCheckedMap(normalized)
      }

      // 提取所有打卡历史日期推导复原力
      const historyDates: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('checkin-') && /^\d{4}-\d{2}-\d{2}$/.test(key.slice(8))) {
          historyDates.push(key.slice(8))
        }
      }
      historyDates.sort()
      setResilience(calculateResilienceLatency(historyDates))

      // 第一公民注入：读取个人生活宪法规则并同构成打卡置顶条目
      const constRaw = localStorage.getItem('htlb-my-constitution')
      if (constRaw) {
        const parsed = JSON.parse(constRaw)
        if (Array.isArray(parsed?.rules) && parsed.rules.length > 0) {
          const mapped: ConstitutionalCheckinItem[] = parsed.rules.map(
            (r: ConstitutionRule, idx: number) => ({
              id: `const-rule-${idx}`,
              label: r.article,
              detail: `【保底微承诺】：${r.floorCommitment}（依据：${r.rationale}）`,
              item: r.uids?.[0] || '083TMQ1Z',
              isConstitutional: true,
              ruleIndex: idx,
              rationale: r.rationale,
              floorCommitment: r.floorCommitment,
            })
          )
          setConstitutionalItems(mapped)
        }
      }

      // 检查夜间是否已激活平静签章
      const sealDate = localStorage.getItem('htlb-peace-seal-date')
      if (sealDate === today) {
        setPeaceSealActivated(true)
      }
    } catch (e) {
      console.error(e)
    }
  }, [storageKey, today])

  const toggle = (id: string, level: CheckinLevel = 'ceiling') => {
    const current = checkedMap[id]
    let next: Record<string, CheckinLevel>

    if (!current) {
      next = { ...checkedMap, [id]: level }
    } else if (current === 'floor' && level === 'ceiling') {
      next = { ...checkedMap, [id]: 'ceiling' }
    } else {
      const copy = { ...checkedMap }
      delete copy[id]
      next = copy
    }

    setCheckedMap(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
  }

  // 控制二分法操作
  const classifyWorry = (id: string, controllable: boolean) => {
    setWorries((prev) =>
      prev.map((w) => (w.id === id ? { ...w, controllable } : w))
    )
  }

  const addWorry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorry.trim()) return
    setWorries((prev) => [
      ...prev,
      { id: String(Date.now()), text: newWorry.trim(), controllable: null },
    ])
    setNewWorry('')
  }

  // 塞涅卡平静清零仪式
  const activatePeaceSeal = () => {
    setPeaceSealActivated(true)
    try {
      localStorage.setItem('htlb-peace-seal-date', today)
    } catch {}
    setShowSenecaDrawer(false)
  }

  const allDisplayItems = [...constitutionalItems, ...spec.items]
  const doneCount = Object.keys(checkedMap).length

  // 导出单项周期提醒为 .ics
  const exportPeriodicReminder = (item: CheckinItem) => {
    if (!item.reminder) return
    const now = new Date()
    const nextDate = new Date(now.getTime() + item.reminder.intervalDays * 86400000)
    const icsContent = toICS(
      [
        {
          uid: item.id,
          title: `【定期自检】${item.reminder.title} - ${item.detail}`,
          start: nextDate,
          durationMin: 30,
        },
      ],
      item.reminder.title
    )
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.id}-reminder.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const todayCN = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 斯多葛晨昏双相罗盘卡片 */}
      <div className="p-6 sm:p-7 rounded-3xl bg-linear-to-br from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                斯多葛控制二分法 · 零内疚去羞耻设计
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {stoicPhase === 'morning' && '🌅 晨间意图锚定窗口 (05:00-12:00)'}
                {stoicPhase === 'evening' && '🌙 暮夜平静自省窗口 (20:00-04:00)'}
                {stoicPhase === 'midday' && '☀️ 日间清醒笃行窗口'}
              </span>
              {peaceSealActivated && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  🕊️ 今夜已斯多葛免责清零
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 font-serif mt-2">
              {stoicPhase === 'morning' && '晨间觉知：标定今日唯一受我掌控的微动作'}
              {stoicPhase === 'evening' && '暮夜自省：接纳已成之局，今夜平静清零'}
              {stoicPhase === 'midday' && `今日循证微自省 · ${todayCN}`}
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {stoicPhase === 'morning' && '「今天你会遇到意外、推脱与焦躁。但外部境遇不取决于你，唯一属于你的是眼下的微反应。」'}
              {stoicPhase === 'evening' && '「不要苛责未竟之事。只要守住了保底地板，便是在无常风浪中捍卫了自律的锚。」'}
              {stoicPhase === 'midday' && spec.intro}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0">
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {doneCount} <span className="text-sm font-normal text-gray-400">/ {allDisplayItems.length}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">今日已点亮微动作</div>
            </div>

            {/* 塞涅卡复盘抽屉按钮 */}
            <button
              onClick={() => setShowSenecaDrawer(!showSenecaDrawer)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              {showSenecaDrawer ? '收起自省抽屉 ▲' : '🌙 塞涅卡免责自省 ▼'}
            </button>
          </div>
        </div>

        {/* 进度微进度条 */}
        <div className="w-full bg-gray-200/60 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / (allDisplayItems.length || 1)) * 100}%` }}
          />
        </div>

        {/* 抗脆弱复原力看板 */}
        {resilience && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>🛡️ 韧性复原分：<strong className="text-emerald-600 dark:text-emerald-400">{resilience.recoveryScore}分</strong></span>
              <span>·</span>
              <span>历史最长连贯：<strong>{resilience.longestStreak}天</strong></span>
            </div>
            <div className="text-[11px] text-gray-400">
              {resilience.maxLatencyDays <= 2 ? '✨ 复原力极佳：中断后迅速回到正轨' : '弹性包容：断打不扣分，重返即胜利'}
            </div>
          </div>
        )}
      </div>

      {/* 塞涅卡夜间免责自省与控制二分法抽屉 */}
      {showSenecaDrawer && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gray-900/90 text-gray-100 border border-amber-500/30 shadow-2xl backdrop-blur-md space-y-4 animate-fade-up">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌙</span>
              <h3 className="font-bold text-base text-amber-400 font-serif">
                塞涅卡夜间三问 · 控制二分解构工坊
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-400">Amor Fati · 接纳命运</span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            「临睡前闭目反思：今天我克服了哪一个盲目冲动？在哪个方面展现了理性？遭遇了哪些非我所能掌控之风浪？」——把困扰你的杂念归类，不可控的客体立即免责消散。
          </p>

          <div className="space-y-2">
            {worries.map((w) => {
              if (w.controllable === false) {
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-dashed border-gray-700 text-xs text-gray-400"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-semibold">🍃 [已交由命运 / Amor Fati]</span>
                      <span className="line-through">{w.text}</span>
                    </div>
                    <span className="text-[11px] text-gray-500">无需自责内耗</span>
                  </div>
                )
              }

              return (
                <div
                  key={w.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    w.controllable === true
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-gray-800/60 border-gray-700 text-gray-200'
                  }`}
                >
                  <span>{w.text}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => classifyWorry(w.id, true)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        w.controllable === true
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/40'
                      }`}
                    >
                      ✓ 我可控 (知行)
                    </button>
                    <button
                      onClick={() => classifyWorry(w.id, false)}
                      className="px-2.5 py-1 rounded text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors cursor-pointer"
                    >
                      ✕ 客观外物 (接纳)
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={addWorry} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newWorry}
              onChange={(e) => setNewWorry(e.target.value)}
              placeholder="记录一条盘旋在脑海中的内耗念头..."
              className="flex-1 bg-black/40 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer"
            >
              投射解构
            </button>
          </form>

          <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              完成自省后，无论今日做了几项，均可平静清零入眠。
            </span>
            <button
              onClick={activatePeaceSeal}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-amber-600 hover:brightness-110 text-white shadow-md cursor-pointer transition-all"
            >
              🕊️ 接纳今日，平静清零入眠
            </button>
          </div>
        </div>
      )}

      {/* 微习惯打卡清单（宪法级第一公民置顶 + 17 项循证清单） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {allDisplayItems.map((it) => {
          const currentLevel = checkedMap[it.id]
          const isDone = !!currentLevel
          const isFloor = currentLevel === 'floor'
          const isConst = 'isConstitutional' in it && it.isConstitutional

          return (
            <div
              key={it.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 card-hover-tactile ${
                isConst
                  ? 'border-amber-500/40 bg-linear-to-br from-amber-500/10 via-emerald-500/5 to-transparent dark:from-amber-950/20 dark:via-emerald-950/10 shadow-sm'
                  : isDone
                  ? isFloor
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300/80 dark:border-indigo-800/60'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60 shadow-xs'
                  : 'bg-white dark:bg-[#12141a] border-gray-200/80 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* 状态徽章与主按键 */}
                  <button
                    onClick={() => toggle(it.id, 'ceiling')}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all tactile-press cursor-pointer shrink-0 ${
                      isDone
                        ? isFloor
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : isConst
                          ? 'border-amber-500 bg-amber-500 text-black font-extrabold'
                          : 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-300 dark:border-gray-700 text-transparent'
                    }`}
                  >
                    ✓
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isConst && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-linear-to-r from-amber-500 to-amber-600 text-black shadow-xs">
                          🛡️ 宪法第零底线
                        </span>
                      )}
                      <span className={`text-sm sm:text-base font-bold ${
                        isDone ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {it.label}
                      </span>
                      {isFloor && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold">
                          弹性地板已守住
                        </span>
                      )}
                      {'reminder' in it && it.reminder && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          每 {it.reminder.intervalDays} 天
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {it.detail}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isConst ? (
                    <a
                      href="/tools/constitution/"
                      className="font-mono text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                      title="宪法级底线条款不可在日常打卡中直接删除，需前往立宪工作台修订"
                    >
                      📜 宪法依据 ↗
                    </a>
                  ) : (
                    <a
                      href={`/q/${it.item}/`}
                      className="font-mono text-[11px] text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                      title="查看原书依据与辩证审判席"
                    >
                      #{it.item}
                    </a>
                  )}
                  {'reminder' in it && it.reminder && (
                    <button
                      onClick={() => exportPeriodicReminder(it as CheckinItem)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="生成日历提醒"
                    >
                      📅 设提醒
                    </button>
                  )}
                </div>
              </div>

              {/* 双轨切换小栏：允许疲惫时点选弹性地板 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                <span className="text-gray-400">状态不佳时：</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggle(it.id, 'floor')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      isFloor
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    🌱 仅做 30 秒保底地板
                  </button>
                  <button
                    onClick={() => toggle(it.id, 'ceiling')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      isDone && !isFloor
                        ? isConst ? 'bg-amber-500 text-black font-bold' : 'bg-emerald-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    ⭐ 天花板完成
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center text-xs text-gray-400 py-4">
        科学习惯不制造内疚 · 今天仅做保底地板也是巨大胜利 · 数据物理级留存于设备
      </div>
    </div>
  )
}
