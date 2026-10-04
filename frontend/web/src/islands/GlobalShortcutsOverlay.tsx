import React, { useState, useEffect, useRef } from 'react'
import { shouldIgnoreShortcut, transitionChord } from '@kernel/shortcuts.ts'

export default function GlobalShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingChord, setPendingChord] = useState<string | null>(null)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const lastKeyTimeRef = useRef<number>(0)
  const timeoutTimerRef = useRef<number | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('htlb-shortcuts-enabled')
      if (stored !== null) setShortcutsEnabled(stored === 'true')
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierActive = e.metaKey || e.ctrlKey || e.altKey
      const target = e.target as HTMLElement | null

      const ctx = {
        tagName: target?.tagName || '',
        isContentEditable: Boolean(target?.isContentEditable),
        isComposing: Boolean(e.isComposing || e.keyCode === 229),
        hasModifier: isModifierActive,
      }

      // 如果在输入框中，忽略单字符快捷键
      if (shouldIgnoreShortcut(ctx)) return

      // Escape 永远可用
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

      // '?' (Shift + /) 唤起速查弹窗
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }

      if (!shortcutsEnabled || isModifierActive) return

      const now = Date.now()
      const elapsed = lastKeyTimeRef.current > 0 ? now - lastKeyTimeRef.current : 0
      lastKeyTimeRef.current = now

      const result = transitionChord(pendingChord, e.key, elapsed, 1200)

      if (timeoutTimerRef.current) {
        window.clearTimeout(timeoutTimerRef.current)
        timeoutTimerRef.current = null
      }

      if (result.isWaiting) {
        setPendingChord(result.nextChord)
        timeoutTimerRef.current = window.setTimeout(() => {
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
      if (timeoutTimerRef.current) window.clearTimeout(timeoutTimerRef.current)
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
      {/* 1. Chord 序列 HUD 浮动提示胶囊 */}
      {pendingChord && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-900/90 dark:bg-black/90 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <kbd className="px-2 py-0.5 rounded bg-emerald-500 text-black font-mono font-bold text-xs uppercase shadow-xs">
            {pendingChord}
          </kbd>
          <div className="flex items-center gap-2 text-xs text-gray-300 font-sans">
            <span>等待导航按键:</span>
            <span className="font-mono text-emerald-400 font-semibold">h 首页</span> ·
            <span className="font-mono text-emerald-400 font-semibold">c 体检</span> ·
            <span className="font-mono text-emerald-400 font-semibold">s 阶段</span> ·
            <span className="font-mono text-emerald-400 font-semibold">k 打卡</span> ·
            <span className="font-mono text-emerald-400 font-semibold">l 宪法</span> ·
            <span className="font-mono text-emerald-400 font-semibold">r 急救</span>
          </div>
          <span className="text-[10px] text-gray-500 ml-1">Esc 取消</span>
        </aside>
      )}

      {/* 2. '?' 全域快捷键速查岛屿模态窗 */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="全域键盘快捷键指南"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-[#12141a] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6 text-gray-900 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⌨️</span>
                <div>
                  <h3 className="text-base font-bold font-serif">全域快捷键网络速查</h3>
                  <p className="text-xs text-gray-400">肌肉记忆 0ms 纯端侧直达 · Linear 级体验</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-2">
                  🧭 全域导航（Chord 序列）
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">直达首页</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then h</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">苏格拉底处境体检</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then c</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">五大人生阶段手册</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then s</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">17件零成本打卡</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then k</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">个人生活宪法起草</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then l</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">紧急时刻/现场急救</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">g then r</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-2">
                  ⚡ 行动与检索快捷键
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">全局指令与分流搜索</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">⌘K 或 /</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">灵感胶囊 3D 盲盒</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">r</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">快捷键帮助速查</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">? (Shift+/)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">关闭所有浮层</span>
                    <span className="font-mono font-bold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">Esc</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WCAG 2.1.4 字符键开关底栏 */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-400">WCAG 2.1.4 单字符键状态：</span>
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
