import React, { useState, useEffect } from 'react'
import { playSound } from '../lib/sound'

export interface FortuneItem {
  uid: string
  title: string
  chapterTitle?: string
  cost?: string
  time?: string
  benefit?: string
  evidenceLevel?: string
  summary?: string
}

interface Props {
  items: FortuneItem[]
}

export default function DailyFortuneIsland({ items }: Props) {
  const [selectedItem, setSelectedItem] = useState<FortuneItem | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [copied, setCopied] = useState(false)

  // 确定性每日种子
  useEffect(() => {
    if (!items || items.length === 0) return

    const todayStr = new Date().toISOString().slice(0, 10)
    // 简单哈希确定今天的初始卡片
    let hash = 0
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i)
      hash |= 0
    }
    const initialIndex = Math.abs(hash) % items.length
    const defaultItem = items[initialIndex]
    setSelectedItem(defaultItem)

    // 读取本地是否已打卡
    try {
      const doneKey = `howtolivebetter:daily_done:${todayStr}:${defaultItem.uid}`
      setIsDone(localStorage.getItem(doneKey) === 'true')
    } catch {}
  }, [items])

  const handleShuffle = () => {
    playSound('shuffle')
    setIsFlipped(false)
    const nextIdx = Math.floor(Math.random() * items.length)
    const nextItem = items[nextIdx]
    setSelectedItem(nextItem)

    const todayStr = new Date().toISOString().slice(0, 10)
    try {
      const doneKey = `howtolivebetter:daily_done:${todayStr}:${nextItem.uid}`
      setIsDone(localStorage.getItem(doneKey) === 'true')
    } catch {
      setIsDone(false)
    }
  }

  const handleToggleDone = () => {
    if (!selectedItem) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const doneKey = `howtolivebetter:daily_done:${todayStr}:${selectedItem.uid}`
    const next = !isDone
    setIsDone(next)
    try {
      localStorage.setItem(doneKey, next ? 'true' : 'false')
      // 同时写入总打卡库
      const checklistStr = localStorage.getItem('howtolivebetter:checklist') || '{}'
      const checklist = JSON.parse(checklistStr)
      checklist[selectedItem.uid] = next ? 'done' : 'none'
      localStorage.setItem('howtolivebetter:checklist', JSON.stringify(checklist))
    } catch {}

    if (next) {
      playSound('done')
    } else {
      playSound('unmark')
    }
  }

  const handleCopy = async () => {
    if (!selectedItem) return
    playSound('copy')
    const text = `【今日循证生活小事】${selectedItem.title}\n成本：${selectedItem.cost || '零成本'} · 收益：${selectedItem.benefit || '长期复利'}\n来源：高性价比人生指南 (https://howtolivebetter.net/q/${selectedItem.uid}/)`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (!selectedItem) {
    return (
      <div className="text-center py-12 text-gray-400 font-mono">
        正在抽取今日生活微决断...
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto w-full px-4">
      {/* 3D 翻转卡片容器 */}
      <div className="life-hero-card-deck mb-6">
        <div
          onClick={() => {
            playSound('tap')
            setIsFlipped(!isFlipped)
          }}
          className="life-hero-card-top p-7 cursor-pointer select-none transition-transform duration-500 min-h-[380px] flex flex-col justify-between"
          title="点击翻转查看循证背景"
        >
          {/* 顶部标签 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#d5ed9e] text-[#12382d]">
                {selectedItem.chapterTitle || '今日微决断'}
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                UID: {selectedItem.uid} · 点击翻牌
              </span>
            </div>

            {!isFlipped ? (
              /* 正面：核心行动与收益 */
              <div className="space-y-4 pt-2">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-serif italic">
                  今日高性价比小事
                </div>
                <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white leading-snug">
                  {selectedItem.title}
                </h2>
                {selectedItem.summary && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedItem.summary}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#f7f7f0] dark:bg-[#182820] border border-[#dce4d5] dark:border-[#1c352a]">
                    <span className="text-gray-400 block text-[10px]">成本耗费</span>
                    <strong className="text-gray-800 dark:text-gray-200">{selectedItem.cost || '¥0 / 极低'}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f7f7f0] dark:bg-[#182820] border border-[#dce4d5] dark:border-[#1c352a]">
                    <span className="text-gray-400 block text-[10px]">所需时间</span>
                    <strong className="text-gray-800 dark:text-gray-200">{selectedItem.time || '1~5 分钟'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* 背面：循证依据与法理逻辑 */
              <div className="space-y-3 pt-2">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-serif italic">
                  🔬 为什么要做？循证原理
                </div>
                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                  {selectedItem.title}
                </h3>
                <div className="p-3 bg-[#edece1]/60 dark:bg-[#182820] rounded-xl text-xs text-gray-700 dark:text-gray-300 leading-relaxed border border-[#dce4d5] dark:border-[#1c352a]">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                    预期收益：{selectedItem.benefit || '消除未知阻抗，获取长期复利'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    证据评级：{selectedItem.evidenceLevel || 'A 级最高证据'} · 原文保真
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={`/q/${selectedItem.uid}/`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    前往条目全景详情页阅读争议与延伸 ↗
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 底部翻转小提示 */}
          <div className="pt-4 border-t border-[#dce4d5] dark:border-[#1c352a] flex items-center justify-between text-[11px] text-gray-400">
            <span>{isFlipped ? '↩ 点击翻回正面' : '↪ 点击翻看循证依据'}</span>
            <span className="font-mono">HOW TO LIVE BETTER</span>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggleDone}
          className={`flex-1 life-btn py-3 text-sm font-bold ${
            isDone
              ? 'bg-emerald-600 text-white shadow-md'
              : 'life-btn-lime'
          }`}
        >
          {isDone ? '✓ 今日已达成' : '○ 标记为今日已做'}
        </button>

        <button
          type="button"
          onClick={handleShuffle}
          className="p-3 rounded-full border border-[#dce4d5] dark:border-[#1c352a] hover:bg-[#edece1] dark:hover:bg-[#182820] text-gray-700 dark:text-gray-300 transition-colors"
          title="换一换（抽取另一张）"
          aria-label="换一换"
        >
          🎲
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="p-3 rounded-full border border-[#dce4d5] dark:border-[#1c352a] hover:bg-[#edece1] dark:hover:bg-[#182820] text-gray-700 dark:text-gray-300 transition-colors"
          title={copied ? '已复制！' : '复制分享'}
          aria-label="复制分享"
        >
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  )
}
