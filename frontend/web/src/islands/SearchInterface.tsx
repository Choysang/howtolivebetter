import React, { useState, useEffect, useMemo } from 'react'
import { tokenize } from '@kernel/tokenize.ts'
import { safeFetchKb } from '../lib/net.ts'
const _isolateSafeFetch = () => {}
import { dispatchQuery } from '@kernel/dispatcher.ts'
import { PHENOMENON_CHIPS } from '@contracts/router.ts'
import type { RouterConfig, RouterDecision } from '@contracts/router.ts'
import type { LiteItem as KernelLiteItem } from '@contracts/kb.ts'

interface LiteItem {
  uid: string
  title: string
  chapter: number
  index: number
  plain?: string
  benefit?: string
  evidence: string
  evidenceBase: 'A' | 'B' | 'C'
  tags: { money: string; time: string; willpower: string; benefit: string; caliber: string }
  disputed?: boolean
  unverified?: boolean
  sensitive?: boolean
  always?: boolean
  flags?: { disputed: boolean; unverified: boolean }
}

interface Props {
  initialItems?: LiteItem[]
}

export default function SearchInterface({ initialItems = [] }: Props) {
  const [items, setItems] = useState<LiteItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(initialItems.length === 0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null)
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') || ''
    }
    return ''
  })
  const [selectedEvidence, setSelectedEvidence] = useState<string>('all')
  const [selectedMoney, setSelectedMoney] = useState<string>('all')
  const [selectedChapter, setSelectedChapter] = useState<string>('all')
  const [onlySpecial, setOnlySpecial] = useState<boolean>(false)
  const [plainOnly, setPlainOnly] = useState<boolean>(false)
  const [viewFilter, setViewFilter] = useState<'all' | 'fav' | 'read'>('all')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const [readSet, setReadSet] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('htlb-fav-items') || '[]')
      setFavSet(new Set(favs))
      const reads = JSON.parse(localStorage.getItem('htlb-read-items') || '[]')
      setReadSet(new Set(reads))
    } catch (e) {}
  }, [])

  // 加载全量知识包与不可变路由配置（若已传入 initialItems 则仅按需加载 routerConfig）
  const loadKbData = () => {
    setIsLoading(items.length === 0)
    setLoadError(null)

    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) =>
        Promise.all([
          items.length > 0 ? Promise.resolve(items) : safeFetchKb<LiteItem[]>(`/kb/${hash}/lite.json`),
          safeFetchKb<RouterConfig | null>(`/kb/${hash}/router.json`).catch(() => null),
        ])
      )
      .then(([data, routerData]: [LiteItem[], RouterConfig | null]) => {
        if (items.length === 0) setItems(data)
        if (routerData) setRouterConfig(routerData)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('加载全量检索数据失败', err)
        setLoadError(err instanceof Error ? err.message : '网络异常或知识包未就绪')
        setIsLoading(false)
      })
  }

  useEffect(() => {
    loadKbData()
  }, [])

  // 同步 URL 查询参数
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (query.trim()) {
      url.searchParams.set('q', query.trim())
    } else {
      url.searchParams.delete('q')
    }
    window.history.replaceState(null, '', url.toString())
  }, [query])

  // 双速分发决策计算 (0ms 纯函数)
  const decision: RouterDecision | null = useMemo(() => {
    if (!query.trim() || !routerConfig) return null
    return dispatchQuery(
      query,
      routerConfig,
      items as unknown as KernelLiteItem[]
    )
  }, [query, routerConfig, items])

  const filtered = useMemo(() => {
    return items.filter((it) => {
      // 视图过滤（全部 / 收藏 / 已读）
      if (viewFilter === 'fav' && !favSet.has(it.uid)) return false
      if (viewFilter === 'read' && !readSet.has(it.uid)) return false

      // 章节过滤
      if (selectedChapter !== 'all' && String(it.chapter) !== selectedChapter) {
        return false
      }

      // 文本匹配与智能分词检索
      if (query.trim()) {
        const qWords = tokenize(query)
        const q = query.toLowerCase().trim()
        const matchTitle = it.title.toLowerCase().includes(q)
        const matchUid = it.uid.toLowerCase().includes(q)
        const matchChapter = String(it.chapter) === q
        const matchPlain = it.plain ? it.plain.toLowerCase().includes(q) : false
        let tokenMatch = false
        for (const w of qWords) {
          const wLower = w.toLowerCase()
          if (it.title.toLowerCase().includes(wLower) || (it.plain && it.plain.toLowerCase().includes(wLower))) {
            tokenMatch = true
            break
          }
        }
        if (!matchTitle && !matchUid && !matchChapter && !matchPlain && !tokenMatch) return false
      }
      // 证据等级
      if (selectedEvidence !== 'all' && it.evidenceBase !== selectedEvidence) {
        return false
      }
      // 成本过滤
      if (selectedMoney !== 'all' && it.tags.money !== selectedMoney) {
        return false
      }
      // 争议与待核实过滤
      const isDisputed = Boolean(it.disputed ?? it.flags?.disputed)
      const isUnverified = Boolean(it.unverified ?? it.flags?.unverified)
      if (onlySpecial && !isDisputed && !isUnverified) {
        return false
      }
      return true
    })
  }, [items, query, selectedEvidence, selectedMoney, selectedChapter, onlySpecial, viewFilter, favSet, readSet])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const displayed = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleFav = (uid: string) => {
    const next = new Set(favSet)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    setFavSet(next)
    localStorage.setItem('htlb-fav-items', JSON.stringify(Array.from(next)))
  }

  const toggleRead = (uid: string) => {
    const next = new Set(readSet)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    setReadSet(next)
    localStorage.setItem('htlb-read-items', JSON.stringify(Array.from(next)))
  }

  return (
    <div className="space-y-6">
      {/* 搜索过滤工具条 */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#12141a] border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-4">
        {/* 顶部主视图切换：全部 / 收藏 / 已读 */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 flex-wrap">
          <button
            onClick={() => { setViewFilter('all'); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            📖 全部建议 ({isLoading ? '...' : items.length})
          </button>
          <button
            onClick={() => { setViewFilter('fav'); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewFilter === 'fav'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            ★ 我的收藏 ({favSet.size})
          </button>
          <button
            onClick={() => { setViewFilter('read'); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewFilter === 'read'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            ✓ 已读条目 ({readSet.size})
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="全文检索 654 条建议、口语现象、编号、章节、标签..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm sm:text-base"
          />
          <span className="absolute left-4 top-3.5 text-gray-400 text-lg">🔍</span>
          {query && (
            <button
              onClick={() => { setQuery(''); setPage(1); }}
              className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* 空态下的现象级口语芯片 (Phenomenon Chips) */}
        {!query.trim() && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span>⚡ 常见生活痛点现象直达 (免输入点击)</span>
              </span>
              <span className="text-[11px] text-gray-400">0ms 纯函数分流</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PHENOMENON_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => {
                    setQuery(chip.query)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    chip.urgency === 'E0'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 hover:bg-rose-100'
                      : chip.urgency === 'E1'
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100'
                  }`}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 筛选 Chip */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">证据等级：</span>
            {['all', 'A', 'B', 'C'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => { setSelectedEvidence(lvl); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedEvidence === lvl
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {lvl === 'all' ? '全部' : `Grade ${lvl}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <span className="text-gray-400">金钱成本：</span>
            {[
              { val: 'all', label: '全部' },
              { val: '0', label: '零成本' },
              { val: '少', label: '低投入' },
              { val: '多', label: '需支出' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => { setSelectedMoney(val); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedMoney === val
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <span className="text-gray-400">章节直达：</span>
            <select
              value={selectedChapter}
              onChange={(e) => { setSelectedChapter(e.target.value); setPage(1); }}
              className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs outline-none"
            >
              <option value="all">全书 34 章全部</option>
              {Array.from({ length: 34 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>第 {n} 章</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-gray-300 font-medium select-none ml-2">
            <input
              type="checkbox"
              checked={plainOnly}
              onChange={(e) => setPlainOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>💡 仅看说人话速览</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={onlySpecial}
              onChange={(e) => { setOnlySpecial(e.target.checked); setPage(1); }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>仅看争议/待核实</span>
          </label>
        </div>
      </div>

      {/* L0 危机干预 0% 幻觉高亮短路卡 */}
      {decision && decision.type === 'crisis' && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
              <span>🚨</span>
              <span>危机求助安全通道 · 命中高危词「{decision.matchedTrigger}」</span>
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-300 font-medium">生命安全第一 · 零检索直接干预</span>
          </div>
          <p className="text-sm text-rose-900 dark:text-rose-100 leading-relaxed font-medium">
            如果您或他人正处于人身安全危险、家庭暴力或极度绝望状态，请立即放下手机拨打以下国家法定急救与求助专线（点击号码直接呼叫）：
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {decision.hotlines.map((h) => (
              <a
                key={h.number}
                href={`tel:${h.number}`}
                className="flex flex-col p-3 rounded-xl bg-white dark:bg-[#1a1d26] border border-rose-300 dark:border-rose-800 hover:scale-[1.02] active:scale-[0.98] transition-transform text-center shadow-xs min-h-[56px] justify-center"
              >
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">{h.name}</span>
                <span className="font-mono text-xl font-black text-rose-600 dark:text-rose-400">{h.number}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* E0 现场急救优先通道卡片 */}
      {decision && decision.type === 'rescue' && (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
              <span>⚡</span>
              <span>现场急救通道 · 命中「{decision.matchedTrigger}」</span>
            </span>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">{decision.banner}</span>
          </div>
          <div className="space-y-2.5 pt-1">
            {decision.items.map((item, i) => (
              <div
                key={item.uid}
                className="p-3.5 rounded-xl bg-white dark:bg-[#1a1d26] border border-amber-300 dark:border-amber-800"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <a
                    href={`/q/${item.uid}/`}
                    className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-amber-600"
                  >
                    {item.title}
                  </a>
                </div>
                {item.plain && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 pl-7 leading-relaxed font-medium">
                    {item.plain}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deep-Track 情境跃迁看板 */}
      {decision && decision.type === 'deep_track' && decision.scenarioId && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📌</span>
            <div>
              <div className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                匹配到专项应对剧本 · 场景：{decision.scenarioId}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                该问题具备高压时效性，建议查阅结构化倒计时行动清单
              </div>
            </div>
          </div>
          <a
            href={`/scenario/${decision.scenarioId}/`}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            进入专页 →
          </a>
        </div>
      )}

      {/* 结果汇总 (若处于危机状态则抑制普通计数) */}
      {!(decision && decision.type === 'crisis') && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>共检索到 <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{isLoading ? '...' : filtered.length}</strong> 条建议</span>
          <span>第 {page} / {Math.max(1, totalPages)} 页</span>
        </div>
      )}

      {/* 列表渲染 (若处于危机状态则抑制普通条目以防干扰) */}
      {!(decision && decision.type === 'crisis') && (
        <div className="space-y-3">
          {displayed.map((it) => (
            <div
              key={it.uid}
              className="p-5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12141a] card-hover-tactile flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`/q/${it.uid}/`}
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    #{it.uid}
                  </a>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/80">
                    {it.evidence}
                  </span>
                  {(it.disputed ?? it.flags?.disputed) && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200">
                      争议
                    </span>
                  )}
                  {(it.unverified ?? it.flags?.unverified) && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200">
                      待核实
                    </span>
                  )}
                  <span className="text-xs text-gray-400">第 {it.chapter} 章</span>
                </div>

                <a
                  href={`/q/${it.uid}/`}
                  className="block font-semibold text-gray-900 dark:text-gray-100 hover:text-emerald-600 transition-colors leading-snug"
                >
                  {it.title}
                </a>

                {plainOnly && it.plain ? (
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/90 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    💡 <strong>说人话：</strong>{it.plain}
                  </p>
                ) : it.benefit ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {it.benefit}
                  </p>
                ) : null}
              </div>

              <div className="flex sm:flex-col items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => toggleFav(it.uid)}
                  className={`p-2 rounded-lg text-sm border transition-all ${
                    favSet.has(it.uid)
                      ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                      : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-amber-500'
                  }`}
                  title="收藏"
                >
                  ★
                </button>
                <button
                  onClick={() => toggleRead(it.uid)}
                  className={`p-2 rounded-lg text-sm border transition-all ${
                    readSet.has(it.uid)
                      ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                      : 'border-gray-200 dark:border-gray-800 text-gray-400 hover:text-blue-500'
                  }`}
                  title="标记已读"
                >
                  ✓
                </button>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
                <span>⚡ 正在秒级装载 654 条全量循证建议索引...</span>
                <span className="font-mono">Local-First Cache</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-5 rounded-xl border border-gray-200/60 dark:border-gray-800 bg-white/60 dark:bg-[#12141a]/60 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                  <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {loadError && !isLoading && items.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 space-y-3">
              <span className="text-3xl block">⚠️</span>
              <p className="font-bold text-sm">未能成功读取全库索引知识包</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">{loadError}</p>
              <button
                onClick={loadKbData}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-xs"
              >
                ↻ 重新加载索引
              </button>
            </div>
          )}

          {!isLoading && !loadError && filtered.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#12141a] border border-gray-200/80 dark:border-gray-800 text-gray-400">
              <span className="text-3xl block mb-2">🔍</span>
              没有找到符合当前过滤条件的建议，请尝试调整搜索词或重置过滤器。
            </div>
          )}
        </div>
      )}

      {/* 分页控制 */}
      {totalPages > 1 && !(decision && decision.type === 'crisis') && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141a] disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-xs text-gray-500 px-3">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12141a] disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
