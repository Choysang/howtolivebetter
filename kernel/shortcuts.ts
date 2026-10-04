/**
 * kernel/shortcuts.ts
 * 纯函数：全域快捷键输入校验与 Chord 状态机转换器（零 I/O，≤ 60 行/函数）
 */

export interface KeyContext {
  tagName: string
  isContentEditable: boolean
  isComposing: boolean
  hasModifier: boolean
}

/** 判定是否应当阻断单字符快捷键（严格符合 WCAG 2.1.4 与输入法 IME 规范） */
export function shouldIgnoreShortcut(ctx: KeyContext): boolean {
  if (ctx.isComposing) return true
  const tag = ctx.tagName.toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (ctx.isContentEditable) return true
  return false
}

export interface ChordTransitionResult {
  nextChord: string | null
  matchedRoute: string | null
  isWaiting: boolean
}

const CHORD_ROUTES: Record<string, string> = {
  'g h': '/',
  'g c': '/checkup/',
  'g s': '/stage/',
  'g k': '/checkin/',
  'g l': '/tools/constitution/',
  'g r': '/scenario/',
}

/** Chord 序列状态转移纯函数（g 作为前缀，支持超时重置） */
export function transitionChord(
  currentChord: string | null,
  key: string,
  elapsedMs: number,
  timeoutMs: number = 1200
): ChordTransitionResult {
  const normalizedKey = key.toLowerCase()

  // 超时重置
  if (currentChord && elapsedMs > timeoutMs) {
    currentChord = null
  }

  if (!currentChord) {
    if (normalizedKey === 'g') {
      return { nextChord: 'g', matchedRoute: null, isWaiting: true }
    }
    return { nextChord: null, matchedRoute: null, isWaiting: false }
  }

  if (currentChord === 'g') {
    const sequence = `g ${normalizedKey}`
    const route = CHORD_ROUTES[sequence] || null
    return {
      nextChord: null,
      matchedRoute: route,
      isWaiting: false,
    }
  }

  return { nextChord: null, matchedRoute: null, isWaiting: false }
}
