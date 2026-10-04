import React, { useState, useEffect, useMemo } from 'react'
import { safeFetchKb } from '../lib/net.ts'
import type { CheckupSpec, CheckupQuestion } from '@contracts/kb.ts'
import type { FactValues } from '@contracts/facts.ts'
import { matchSituation, type MatchResult, type Tier } from '@kernel/match.ts'

interface LiteItem {
  uid: string
  title: string
  chapter: number
  index: number
  evidence: string
  tags: { money: string; time: string; willpower: string }
}

interface MatchRule {
  uid: string
  axis: 'life' | 'time' | 'money' | 'freedom'
  always: boolean
  pred?: any
}

interface Props {
  spec: CheckupSpec
}

export default function CheckupWizard({ spec }: Props) {
  const [facts, setFacts] = useState<FactValues>({})
  const [rules, setRules] = useState<MatchRule[]>([])
  const [itemsMap, setItemsMap] = useState<Map<string, LiteItem>>(new Map())
  const [activeTab, setActiveTab] = useState<'core' | 'fallback' | 'collapsed'>('core')
  const [copied, setCopied] = useState(false)
  const [showQuestions, setShowQuestions] = useState(true)

  // 1. 初始化从 URL hash 读取 facts
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace(/^#/, '')
      const match = hash.match(/facts=([^&]+)/)
      if (match) {
        try {
          const pairs = decodeURIComponent(match[1]).split(',')
          const loaded: FactValues = {}
          const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype'])
          for (const p of pairs) {
            const [k, v] = p.split(':')
            if (k && v && !dangerousKeys.has(k) && /^[a-zA-Z0-9_-]+$/.test(k)) {
              (loaded as any)[k] = v
            }
          }
          setFacts(loaded)
        } catch (e) {
          console.error('解析 URL Hash 失败', e)
        }
      }
    }
    parseHash()

    // 2. 加载规则与轻量条目索引
    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) => Promise.all([
        safeFetchKb<MatchRule[]>(`/kb/${hash}/rules.json`),
        safeFetchKb<LiteItem[]>(`/kb/${hash}/lite.json`),
      ]))
      .then(([rulesData, liteData]) => {
        setRules(rulesData)
        setItemsMap(new Map(liteData.map((it) => [it.uid, it])))
      })
      .catch((err) => console.error('加载体检知识包失败', err))
  }, [])

  // 3. 更新事实并同步到 URL hash（绝不发起任何网络请求）
  const updateFact = (newFacts: FactValues) => {
    const next = { ...facts, ...newFacts }
    setFacts(next)
    const encoded = Object.entries(next)
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    window.history.replaceState(null, '', `#facts=${encodeURIComponent(encoded)}`)
  }

  // 4. 重置体检
  const resetAll = () => {
    setFacts({})
    window.history.replaceState(null, '', window.location.pathname)
  }

  // 5. 本地运行纯函数匹配内核
  const matchResults = useMemo(() => {
    if (rules.length === 0) return []
    return matchSituation(facts, rules)
  }, [facts, rules])

  // 按分组划分条目
  const grouped = useMemo(() => {
    const core: Array<{ result: MatchResult; item?: LiteItem }> = []
    const fallback: Array<{ result: MatchResult; item?: LiteItem }> = []
    const collapsed: Array<{ result: MatchResult; item?: LiteItem }> = []

    for (const r of matchResults) {
      const item = itemsMap.get(r.uid)
      if (r.tier === 'core') {
        core.push({ result: r, item })
      } else if (r.tier === 'fallback' || r.tier === 'related') {
        fallback.push({ result: r, item })
      } else if (r.tier === 'collapsed') {
        collapsed.push({ result: r, item })
      }
    }

    return { core, fallback, collapsed }
  }, [matchResults, itemsMap])

  const answeredCount = Object.keys(facts).length
  const totalQuestions = spec.questions.length

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-10">
      {/* 隐私承诺与进度条 */}
      <div className="p-6 rounded-2xl bg-linear-to-br from-emerald-500/5 via-emerald-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 mb-2">
              🔒 100% 浏览器本地匹配 · 零数据上传
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 font-serif">
              处境体检自测
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
              {spec.intro}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 text-gray-700 dark:text-gray-200 transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              {copied ? '✓ 已复制诊断链接' : '🔗 分享此体检'}
            </button>
            {answeredCount > 0 && (
              <button
                onClick={resetAll}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                重置答案
              </button>
            )}
          </div>
        </div>

        {/* 答题进度条 */}
        <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>已回答 {answeredCount} / {totalQuestions} 个处境维度</span>
          <button
            onClick={() => setShowQuestions((v) => !v)}
            className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
          >
            {showQuestions ? '收起问卷 ▲' : '展开问卷 ▼'}
          </button>
        </div>
      </div>

      {/* 苏格拉底式问卷区域 */}
      {showQuestions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spec.questions.map((q: CheckupQuestion, qIdx: number) => {
            const currentVal = (facts as any)[q.fact]
            return (
              <div 
                key={q.id}
                className="p-5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12141a] space-y-3 shadow-xs"
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                    Q{qIdx + 1}
                  </span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                    {q.q}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {q.options.map((opt: any) => {
                    const optVal = opt.facts[q.fact]
                    const isSelected = currentVal === optVal
                    return (
                      <button
                        key={opt.label}
                        onClick={() => updateFact(opt.facts)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 体检匹配结果展示 */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('core')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'core'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🎯 关键盲点与针对性条目 ({grouped.core.length})
            </button>
            <button
              onClick={() => setActiveTab('fallback')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'fallback'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              🛡️ 全员底线与基石 ({grouped.fallback.length})
            </button>
            <button
              onClick={() => setActiveTab('collapsed')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'collapsed'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              📦 已折叠无关项 ({grouped.collapsed.length})
            </button>
          </div>
          <span className="text-xs text-gray-400">
            纯浏览器内核实时计算
          </span>
        </div>

        {/* 选中的结果清单 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(activeTab === 'core'
            ? grouped.core
            : activeTab === 'fallback'
            ? grouped.fallback
            : grouped.collapsed
          ).map(({ result, item }) => {
            if (!item) return null
            return (
              <div
                key={result.uid}
                className="p-5 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12141a] space-y-3 card-hover-tactile flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/q/${item.uid}/?from=checkup&srcTitle=${encodeURIComponent('处境体检自测报告')}`}
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      >
                        #{item.uid}
                      </a>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/80">
                        {item.evidence}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">第{item.chapter}章</span>
                  </div>

                  <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    <a href={`/q/${item.uid}/?from=checkup&srcTitle=${encodeURIComponent('处境体检自测报告')}`}>
                      {item.title}
                    </a>
                  </h4>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    🔍 命中缘由：<span className="text-emerald-700 dark:text-emerald-300">{result.why}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400">💰 {item.tags.money === '0' ? '零花费' : '需投入'}</span>
                  <a
                    href={`/q/${item.uid}/?from=checkup&srcTitle=${encodeURIComponent('处境体检自测报告')}`}
                    className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    查看详情 &rarr;
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
