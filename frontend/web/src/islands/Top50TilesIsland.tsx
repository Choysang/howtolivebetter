import React, { useState, useEffect } from 'react'
import { playSound } from '../lib/sound'

export interface Top50Item {
  uid: string
  rank: number
  title: string
  domain: string
  cost: string
  benefit: string
  evidenceLevel: string
}

interface Props {
  items: Top50Item[]
}

type Status = 'none' | 'todo' | 'done'

export default function Top50TilesIsland({ items }: Props) {
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({})
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('howtolivebetter:checklist')
      if (saved) {
        setStatusMap(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const handleToggle = (uid: string) => {
    const current = statusMap[uid] || 'none'
    let next: Status = 'none'
    if (current === 'none') {
      next = 'done'
      playSound('done')
    } else if (current === 'done') {
      next = 'todo'
      playSound('todo')
    } else {
      next = 'none'
      playSound('unmark')
    }

    const updated = { ...statusMap, [uid]: next }
    setStatusMap(updated)
    try {
      localStorage.setItem('howtolivebetter:checklist', JSON.stringify(updated))
    } catch {}
  }

  // 计算进度
  const doneCount = items.filter((it) => statusMap[it.uid] === 'done').length
  const todoCount = items.filter((it) => statusMap[it.uid] === 'todo').length
  const percent = Math.round((doneCount / items.length) * 100)

  // 筛选领域
  const domains = ['all', ...Array.from(new Set(items.map((it) => it.domain)))]
  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter((it) => it.domain === activeFilter)

  // 导出 ICS 日历包
  const handleExportICS = () => {
    playSound('copy')
    const todoList = items.filter((it) => statusMap[it.uid] === 'todo')
    const targetItems = todoList.length > 0 ? todoList : items.slice(0, 10)

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HowToLiveBetter//Top 50 Actions//CN',
      'CALSCALE:GREGORIAN',
    ]

    const now = new Date()
    targetItems.forEach((it, idx) => {
      // 安排在接下来的周六上午 10:00
      const d = new Date(now.getTime() + (idx + 1) * 7 * 86400000)
      d.setHours(10, 0, 0, 0)
      const dateStr = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${it.uid}@howtolivebetter.net`,
        `DTSTAMP:${dateStr}`,
        `DTSTART:${dateStr}`,
        `SUMMARY:【循证生活】${it.title}`,
        `DESCRIPTION:领域：${it.domain}\\n成本：${it.cost}\\n预期收益：${it.benefit}\\n条目：https://howtolivebetter.net/q/${it.uid}/`,
        'END:VEVENT'
      )
    })

    icsContent.push('END:VCALENDAR')
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'howtolivebetter-top50.ics'
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4">
      {/* 顶部进度统计条 */}
      <div className="mb-8 p-6 rounded-3xl bg-[#edece1]/60 dark:bg-[#182820]/70 border border-[#dce4d5] dark:border-[#1c352a]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
              精选 50 条生活实践完成度
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              已做到 <strong className="text-emerald-700 dark:text-emerald-400">{doneCount}</strong> 项 · 待做 <strong className="text-amber-700 dark:text-amber-400">{todoCount}</strong> 项 · 未标记 <strong>{items.length - doneCount - todoCount}</strong> 项
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-extrabold text-emerald-800 dark:text-emerald-300">
              {percent}%
            </span>
            <button
              type="button"
              onClick={handleExportICS}
              className="life-btn life-btn-lime text-xs font-bold py-2.5 px-4"
              title="导出待办项到手机日历"
            >
              📅 导出日历 (.ics)
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${Math.round((todoCount / items.length) * 100)}%` }}
          />
        </div>

        {/* 状态图例说明 */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> 已做到（点击切换）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 待做储备
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700 inline-block" /> 未标记
          </span>
        </div>
      </div>

      {/* 领域筛选过滤器 */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6 pb-2">
        {domains.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              playSound('tap')
              setActiveFilter(d)
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === d
                ? 'bg-[#12382d] text-white dark:bg-[#d5ed9e] dark:text-[#12382d]'
                : 'bg-white dark:bg-[#131b17] text-gray-600 dark:text-gray-300 border border-[#dce4d5] dark:border-[#1c352a] hover:bg-[#edece1]'
            }`}
          >
            {d === 'all' ? '全部 50 项' : d}
          </button>
        ))}
      </div>

      {/* 50 磁贴密集网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-10">
        {filteredItems.map((it) => {
          const st = statusMap[it.uid] || 'none'
          return (
            <div
              key={it.uid}
              onClick={() => handleToggle(it.uid)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
                st === 'done'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                  : st === 'todo'
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500 shadow-xs'
                  : 'bg-white dark:bg-[#131b17] border-[#dce4d5] dark:border-[#1c352a] hover:border-emerald-500 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-400">
                      #{String(it.rank).padStart(2, '0')}
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {it.domain}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      st === 'done'
                        ? 'bg-emerald-600 text-white'
                        : st === 'todo'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    {st === 'done' ? '✓ 已做到' : st === 'todo' ? '⏳ 待做' : '○ 未做'}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-sm text-gray-900 dark:text-gray-100 leading-snug mb-2">
                  {it.title}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {it.benefit}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                <span>成本：<strong className="text-gray-700 dark:text-gray-300">{it.cost}</strong></span>
                <a
                  href={`/q/${it.uid}/`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  循证详情 ↗
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
