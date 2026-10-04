import React, { useState, useEffect } from 'react'
import type { Scenario, ScenarioStep } from '@contracts/kb.ts'
import { formatDurationCN, planDeadlines, toICS } from '@kernel/schedule.ts'

interface LiteItem {
  uid: string
  title: string
  chapter: number
  index: number
  evidence: string
  tags: { money: string; time: string; willpower: string }
}

interface Props {
  scenario: Scenario
  stepsWithItems: Array<{
    step: ScenarioStep
    item: LiteItem
  }>
}

function getHumanPhaseTag(scenarioId: string, within: string): string {
  const map: Record<string, Record<string, string>> = {
    'laid-off': {
      'PT1H': '谈判关键期',
      'PT24H': '离职留证期',
      'P7D': '首周社保/失业金',
      'P30D': '首月仲裁与求职',
      'P90D': '90天防坑期',
    },
    'owed-wages': {
      'PT24H': '证据留存期',
      'P7D': '劳动监察期',
      'P30D': '法援与仲裁',
      'P90D': '诉讼时效期',
    },
    'scammed': {
      'PT1H': '黄金1小时止付',
      'PT24H': '24小时挂失报警',
      'P7D': '7天安全加固',
      'P30D': '30天防冒用征信',
    },
    'renting': {
      'P7D': '看房签约把关期',
      'P30D': '入住首月存证',
      'P365D': '退租当天验收',
    },
    'marriage': {
      'P7D': '领证前冷静期',
      'P30D': '分工与财产协议',
      'P45D': '婚检与出资确认',
      'P60D': '登记领证与防范',
    },
    'baby': {
      'PT24H': '确诊戒烟酒',
      'P30D': '孕13周建册初检',
      'P60D': '急症信号警惕',
      'P180D': '孕24周糖筛',
      'P280D': '出生24小时乙肝疫苗',
      'P282D': '出院前出生证',
      'P289D': '出院即办医保/睡姿',
      'P310D': '满月前申报落户',
    },
    'chronic': {
      'PT24H': '确诊当天遵医嘱',
      'P7D': '首周慢特病认定',
      'P30D': '首月长处方与复查',
      'P90D': '90天长期管理',
    },
    'grief': {
      'PT1H': '黄金甄别与报警',
      'PT24H': '24小时证明与接运',
      'P3D': '头3天看护防急症',
      'P7D': '7天尸检异议申请',
      'P30D': '30天销户与清算',
      'P180D': '半年哀伤心理关照',
    },
  }
  return map[scenarioId]?.[within] || ''
}

function getLocalDatetimeString(d = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function ScenarioTimeline({ scenario, stepsWithItems }: Props) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [isMounted, setIsMounted] = useState(false)
  const [startTime, setStartTime] = useState<string>('2026-01-01T00:00')
  const [copiedShare, setCopiedShare] = useState(false)

  const storageKey = `scenario-progress-${scenario.id}`

  useEffect(() => {
    setIsMounted(true)
    setStartTime(getLocalDatetimeString())
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setCompleted(JSON.parse(saved))
    } catch (e) {
      console.error(e)
    }
  }, [storageKey])

  const toggleStep = (uid: string) => {
    const next = { ...completed, [uid]: !completed[uid] }
    setCompleted(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch (e) {
      console.error(e)
    }
  }

  const completedCount = stepsWithItems.filter((s) => completed[s.item.uid]).length

  // 系统原生分享 / 复制清单
  const shareChecklist = async () => {
    const title = `【${scenario.title}】时序行动指南`
    const text = `危机应对步骤（${completedCount}/${stepsWithItems.length} 已完成）：\n` +
      stepsWithItems.slice(0, 3).map((s, idx) => `${idx + 1}. [${formatDurationCN(s.step.within)}] ${s.item.title}（${s.step.hook}）`).join('\n')
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {}
    }
    navigator.clipboard.writeText(`${title}\n${text}\n🔗 完整清单：${url}`).then(() => {
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
    })
  }

  // 导出 .ics 日历文件
  const exportCalendar = () => {
    const start = new Date(startTime)
    const deadlines = planDeadlines(
      scenario.steps.map((s) => ({ uid: s.item, within: s.within })),
      start
    )
    const deadMap = new Map(deadlines.map((d) => [d.uid, d.at]))

    const events = stepsWithItems.map(({ step, item }) => ({
      uid: item.uid,
      title: `【${scenario.title}】${item.title}（${step.hook}）`,
      start: deadMap.get(item.uid) || new Date(),
      durationMin: 30,
    }))

    const icsContent = toICS(events, `${scenario.title} - 行动倒计时`)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scenario.id}-deadlines.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* 顶部控制栏与进度 */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12141a] border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
            时序行动指南
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            进度：{completedCount} / {stepsWithItems.length} 步已完成
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            倒计时以事件发生那一刻起算 · 顺序错了比内容错了更危险
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>事件起点：</span>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 outline-none"
            />
          </div>
          <button
            onClick={exportCalendar}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            📅 导出到日历 (.ics)
          </button>
          <button
            onClick={shareChecklist}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedShare ? '✓ 已复制' : '📲 分享清单'}
          </button>
        </div>
      </div>

      {/* 法律红线与核心底线提示 */}
      {scenario.notes && scenario.notes.length > 0 && (
        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-950 dark:text-amber-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            ⚠️ 关键红线与法定程序保护：
          </div>
          <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed">
            {scenario.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 时序行动轴 */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-emerald-500/30 space-y-8">
        {stepsWithItems.map(({ step, item }, index) => {
          const isDone = !!completed[item.uid]
          const withinCN = formatDurationCN(step.within)
          const phaseTag = getHumanPhaseTag(scenario.id, step.within)
          const isCrisisGolden = (step.within === 'PT1H' || step.within === 'PT24H') && !isDone

          return (
            <div key={item.uid} className="relative group">
              {/* 轴线圆点 */}
              <div
                onClick={() => toggleStep(item.uid)}
                className={`absolute -left-[31px] sm:-left-[39px] top-1 w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center text-xs font-bold transition-all ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isCrisisGolden
                      ? 'bg-white dark:bg-gray-900 border-red-500 text-red-600 animate-pulse'
                      : 'bg-white dark:bg-gray-900 border-emerald-500 text-emerald-600 hover:scale-110'
                }`}
              >
                {isDone ? '✓' : index + 1}
              </div>

              {/* 步骤卡片 */}
              <div
                className={`p-5 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-gray-50/60 dark:bg-gray-900/40 border-gray-200/50 dark:border-gray-800/50 opacity-75'
                    : isCrisisGolden
                      ? 'bg-white dark:bg-[#12141a] border-red-300 dark:border-red-900/60 shadow-xs'
                      : 'bg-white dark:bg-[#12141a] border-gray-200/80 dark:border-gray-800 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {phaseTag && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80">
                        📍 {phaseTag}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      isCrisisGolden
                        ? 'bg-red-600 text-white border-red-700 animate-pulse shadow-xs'
                        : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/80'
                    }`}>
                      ⏱️ {withinCN} {isCrisisGolden && '⚡ 黄金期'}
                    </span>
                    <a
                      href={`/q/${item.uid}/?from=scenario&src=${encodeURIComponent(scenario.id)}&srcTitle=${encodeURIComponent(scenario.title)}`}
                      className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-600"
                    >
                      #{item.uid}
                    </a>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                      {item.evidence}
                    </span>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleStep(item.uid)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 rounded border-gray-300"
                    />
                    <span>{isDone ? '已办妥' : '标记已做'}</span>
                  </label>
                </div>

                <h3 className={`text-base sm:text-lg font-bold ${
                  isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  <a 
                    href={`/q/${item.uid}/?from=scenario&src=${encodeURIComponent(scenario.id)}&srcTitle=${encodeURIComponent(scenario.title)}`} 
                    className="hover:text-emerald-600 transition-colors"
                  >
                    {item.title}
                  </a>
                </h3>

                <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                  🎯 <span className="font-semibold">当刻要领：</span>{step.hook}
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
                  <span>第{item.chapter}章 · {item.index}</span>
                  <a
                    href={`/q/${item.uid}/?from=scenario&src=${encodeURIComponent(scenario.id)}&srcTitle=${encodeURIComponent(scenario.title)}`}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    查看证据链与法规原文 &rarr;
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
