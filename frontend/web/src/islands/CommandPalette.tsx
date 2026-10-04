import React, { useState, useEffect, useRef } from 'react'
import { tokenize } from '@kernel/tokenize.ts'
import { safeFetchKb } from '../lib/net.ts'
import { dispatchQuery } from '@kernel/dispatcher.ts'
import type { RouterConfig, RouterDecision } from '@contracts/router.ts'
import type { LiteItem } from '@contracts/kb.ts'

interface SearchItem {
  uid: string
  title: string
  chapter: number
  index: number
  evidence: string
  plain?: string
  type?: 'item' | 'stage' | 'scenario'
  url?: string
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 监听全局快捷键 Cmd+K / Ctrl+K 以及 / 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === '/' && !isInput && !isOpen) {
        e.preventDefault()
        setIsOpen(true)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleOpenEvent = () => setIsOpen(true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleOpenEvent)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleOpenEvent)
    }
  }, [isOpen])

  // 打开时加载轻量索引与不可变路由配置
  useEffect(() => {
    if (!isOpen || items.length > 0) return

    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) =>
        Promise.all([
          safeFetchKb<LiteItem[]>(`/kb/${hash}/lite.json`),
          safeFetchKb<RouterConfig | null>(`/kb/${hash}/router.json`).catch(() => null),
        ])
      )
      .then(([data, routerData]: [LiteItem[], RouterConfig | null]) => {
        if (routerData) setRouterConfig(routerData)
        const mapped: SearchItem[] = data.map((d) => ({
          uid: d.uid,
          title: d.title,
          chapter: d.chapter,
          index: d.index,
          evidence: d.evidence,
          plain: d.plain,
          type: 'item',
          url: `/q/${d.uid}/`,
        }))
        // 加入快捷页面跳转
        const quickNav: SearchItem[] = [
          { uid: 'NAV-HS', title: '🧭 人生阶段手册 · 高中生', chapter: 0, index: 0, evidence: '手册', type: 'stage', url: '/stage/hs/' },
          { uid: 'NAV-COL', title: '🧭 人生阶段手册 · 大学生', chapter: 0, index: 0, evidence: '手册', type: 'stage', url: '/stage/college/' },
          { uid: 'NAV-EARLY', title: '🧭 人生阶段手册 · 刚工作', chapter: 0, index: 0, evidence: '手册', type: 'stage', url: '/stage/early/' },
          { uid: 'NAV-MID', title: '🧭 人生阶段手册 · 中年', chapter: 0, index: 0, evidence: '手册', type: 'stage', url: '/stage/mid/' },
          { uid: 'NAV-RET', title: '🧭 人生阶段手册 · 退休前后', chapter: 0, index: 0, evidence: '手册', type: 'stage', url: '/stage/retire/' },
          { uid: 'NAV-ASSESS', title: '🩺 处境体检（苏格拉底提问）', chapter: 0, index: 0, evidence: '工具', type: 'stage', url: '/checkup/' },
          { uid: 'NAV-CHECKIN', title: '✅ 每日打卡（17件零成本小事）', chapter: 0, index: 0, evidence: '工具', type: 'stage', url: '/checkin/' },
          { uid: 'NAV-LAIDOFF', title: '⚡ 紧急时刻 · 被裁员了', chapter: 0, index: 0, evidence: '应急', type: 'scenario', url: '/scenario/laid-off/' },
          { uid: 'NAV-WAGES', title: '⚡ 紧急时刻 · 被欠薪了', chapter: 0, index: 0, evidence: '应急', type: 'scenario', url: '/scenario/owed-wages/' },
          { uid: 'NAV-RENT', title: '⚡ 紧急时刻 · 租房签约与退租', chapter: 0, index: 0, evidence: '应急', type: 'scenario', url: '/scenario/renting/' },
          { uid: 'NAV-SCAM', title: '⚡ 紧急时刻 · 遭遇诈骗维权', chapter: 0, index: 0, evidence: '应急', type: 'scenario', url: '/scenario/scammed/' },
        ]
        setItems([...quickNav, ...mapped])
      })
      .catch((err) => console.error('加载搜索索引失败', err))
  }, [isOpen, items.length])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // 双速分发决策计算 (0ms 纯函数)
  const decision: RouterDecision | null =
    query.trim() && routerConfig
      ? dispatchQuery(
          query,
          routerConfig,
          items.filter((i) => i.type === 'item') as unknown as LiteItem[]
        )
      : null

  const filtered = query.trim()
    ? (() => {
        const qWords = tokenize(query)
        const qLower = query.toLowerCase().trim()
        const scored = items
          .map((it) => {
            let score = 0
            const titleLower = it.title.toLowerCase()
            const uidLower = it.uid.toLowerCase()
            if (titleLower === qLower || uidLower === qLower) score += 100
            else if (titleLower.includes(qLower)) score += 30
            else if (uidLower.includes(qLower)) score += 20
            else if (String(it.chapter) === qLower) score += 15

            for (const w of qWords) {
              if (titleLower.includes(w.toLowerCase())) score += 10
            }
            return { item: it, score }
          })
          .filter((x) => x.score > 0)

        scored.sort((a, b) => b.score - a.score)
        return scored.map((x) => x.item).slice(0, 8)
      })()
    : items.slice(0, 8)

  const handleSelect = (item: SearchItem) => {
    setIsOpen(false)
    if (item.url) window.location.href = item.url
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex])
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="全局指令与搜索中枢"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#15171e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-gray-200 dark:border-gray-800 gap-3">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索 650+ 条高性价比建议、紧急时刻、人生阶段手册..."
            className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm sm:text-base"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded font-mono border border-gray-200 dark:border-gray-700">
            ESC
          </kbd>
        </div>

        {/* L0 危机干预 0% 幻觉高亮短路卡 */}
        {decision && decision.type === 'crisis' && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                🚨 危机求助安全通道 · 命中词「{decision.matchedTrigger}」
              </span>
              <span className="text-xs text-rose-600 dark:text-rose-400">生命安全第一 · 零检索干预</span>
            </div>
            <p className="text-xs text-rose-800 dark:text-rose-200 mb-3 leading-relaxed">
              如果您或您身边的人正处于生命安全危险、人身侵害或极度心理绝望中，请立即放下手机拨打以下国家法定救助热线：
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {decision.hotlines.map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex flex-col p-2.5 rounded-xl bg-white dark:bg-[#1a1d26] border border-rose-300 dark:border-rose-800 hover:scale-[1.02] active:scale-[0.98] transition-transform text-center shadow-sm"
                >
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{h.name}</span>
                  <span className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">{h.number}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* E0 现场急救卡直通 */}
        {decision && decision.type === 'rescue' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                ⚡ 现场急救优先通道
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">{decision.banner}</span>
            </div>
            <div className="space-y-2 mt-2">
              {decision.items.map((item, i) => (
                <div
                  key={item.uid}
                  onClick={() => handleSelect({ ...item, type: 'item', url: `/q/${item.uid}/` })}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#1a1d26] border border-amber-300 dark:border-amber-800/80 cursor-pointer hover:border-amber-400"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</span>
                  </div>
                  {item.plain && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 pl-7 line-clamp-2 leading-relaxed">
                      {item.plain}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 常规条目检索列表 */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              未找到匹配的建议或场景
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.uid}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden pr-3">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                    {item.uid}
                  </span>
                  <span className="font-medium text-sm truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.chapter > 0 && (
                    <span className="text-xs text-gray-400">第{item.chapter}章</span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                    {item.evidence}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#121419] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono">↑↓</kbd> 移动</span>
            <span><kbd className="font-mono">Enter</kbd> 打开</span>
          </div>
          <span>654 条建议 · 零服务器上传 · 双速通道</span>
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  )
}
