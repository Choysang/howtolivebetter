import React, { useState, useEffect } from 'react'
import { shouldIgnoreShortcut, transitionChord } from '@kernel/shortcuts.ts'

interface ShortcutItem {
  chord: string
  label: string
  action: string
}

const SHORTCUTS: ShortcutItem[] = [
  { chord: '?', label: '快捷键速查', action: '打开/关闭此全域速查面板' },
  { chord: '⌘ K / /', label: '全局指挥官', action: '唤起模糊搜索与决策分发' },
  { chord: 'g h', label: '返回首页', action: '跳转至指南主入口 (/)' },
  { chord: 'g s', label: '阶段手册', action: '跳转至人生阶段手册 (/stage/)' },
  { chord: 'g c', label: '处境体检', action: '跳转至苏格拉底体检 (/checkup/)' },
  { chord: 'g k', label: '晨昏打卡', action: '跳转至微习惯打卡 (/checkin/)' },
  { chord: 'g l', label: '生活立宪', action: '跳转至个人宪法起草 (/tools/constitution/)' },
  { chord: 'g r', label: '现场急救', action: '跳转至紧急时刻应对剧本 (/scenario/)' },
  { chord: 'r', label: '灵感胶囊', action: '唤起 3D 灵感盲盒翻牌' },
  { chord: 'Esc', label: '退出关闭', action: '关闭当前打开的浮层与弹窗' },
]

export default function KeyboardShortcutsHUD() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingChord, setPendingChord] = useState<string | null>(null)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('htlb-shortcuts-enabled')
      if (stored !== null) setShortcutsEnabled(stored === 'true')
    } catch {}

    let lastKeyTime = 0
    let timeoutTimer: number | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierActive = e.metaKey || e.ctrlKey || e.altKey
      const target = e.target as HTMLElement | null

      const ctx = {
        tagName: target?.tagName || '',
        isContentEditable: Boolean(target?.isContentEditable),
        isComposing: Boolean(e.isComposing || e.keyCode === 229),
        hasModifier: isModifierActive,
      }

      // 输入框与 IME 避让
      if (shouldIgnoreShortcut(ctx)) return

      // Esc 永远可用
      if (e.key === 'Escape') {
        if (pendingChord) {
          setPendingChord(null)
          return
        }
        if (isOpen) {
          setIsOpen(false)
          return
        }
      }

      // '?' (Shift + /)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }

      if (!shortcutsEnabled || isModifierActive) return

      const now = Date.now()
      const elapsed = lastKeyTime > 0 ? now - lastKeyTime : 0
      lastKeyTime = now

      const result = transitionChord(pendingChord, e.key, elapsed, 1200)

      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
        timeoutTimer = null
      }

      if (result.isWaiting) {
        setPendingChord(result.nextChord)
        timeoutTimer = window.setTimeout(() => {
          setPendingChord(null)
        }, 1200)
        return
      }

      setPendingChord(null)

      if (result.matchedRoute) {
        e.preventDefault()
        window.location.href = result.matchedRoute
        return
      }

      // 单字符穿透操作
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('open-random-capsule'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  }, [isOpen, pendingChord, shortcutsEnabled])

  const toggleShortcuts = () => {
    const next = !shortcutsEnabled
    setShortcutsEnabled(next)
    try {
      localStorage.setItem('htlb-shortcuts-enabled', String(next))
    } catch {}
  }

  return (
    <>
      {/* 底部微型 Chord 状态指示胶囊 */}
      {pendingChord && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-2xl bg-gray-900/90 text-white text-xs font-mono shadow-2xl backdrop-blur-md border border-emerald-500/50 flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-100"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>按键等待：g + [h, s, c, k, l, r]</span>
          <span className="text-[10px] text-gray-400 font-sans ml-1">Esc 取消</span>
        </aside>
      )}

      {/* 快捷键速查模态框 */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="全域快捷键速查面板"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#15171e] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌨️</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 font-serif">
                  全域键盘快捷网络 (Shortcuts)
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="关闭面板"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-mono p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              遵循 Linear 2026 原生零依赖标准，支持无延迟 Chord 连续键击导航与无障碍。
            </p>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {SHORTCUTS.map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.label}</span>
                    <span className="text-[11px] text-gray-400">{item.action}</span>
                  </div>
                  <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs">
                    {item.chord}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-400">WCAG 2.1.4 单字符键：</span>
              <button
                onClick={toggleShortcuts}
                className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                  shortcutsEnabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    : 'bg-gray-100 text-gray-500 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}
              >
                {shortcutsEnabled ? '✓ 已启用（点击禁用）' : '✕ 已停用（点击启用）'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
