/**
 * frontend/web/src/lib/store.ts
 * 零依赖纯血客户端响应式微状态总线（React 19 useSyncExternalStore 工业标准）
 * 支持跨微岛响应式、零水合冲突、跨标签页实时同步与双轨事件桥梁
 */
import { useSyncExternalStore } from 'react'

export interface Atom<T> {
  get(): T
  set(value: T): void
  subscribe(fn: () => void): () => void
}

export function atom<T>(initialValue: T): Atom<T> {
  let current = initialValue
  const listeners = new Set<() => void>()

  return {
    get(): T {
      return current
    },
    set(value: T): void {
      if (Object.is(current, value)) return
      current = value
      listeners.forEach((fn) => fn())
    },
    // 严格遵循 React 19 规范：subscribe 只注册监听，绝不在注册时同步执行！
    subscribe(fn: () => void): () => void {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

/** React 19 零跳帧同步订阅 Hook */
export function useAtom<T>(a: Atom<T>): T {
  return useSyncExternalStore(
    a.subscribe,
    () => a.get(),
    () => a.get()
  )
}

// —— 客户端持久化存储与跨标签页实时同步 —— //

export interface HabitItem {
  uid: string
  title: string
  plain?: string
  streak: number
  addedAt: number
  completedDates: string[] // 'YYYY-MM-DD'
}

function getInitialStorage(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function getHabitsStorage(): HabitItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('htlb-my-habits')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const $readItems = atom<string[]>(getInitialStorage('htlb-read-items'))
export const $favItems = atom<string[]>(getInitialStorage('htlb-fav-items'))
export const $myHabits = atom<HabitItem[]>(getHabitsStorage())
export const $searchOpen = atom<boolean>(false)

// 跨标签页 Local-First 实时同步广播机制与同页面事件中继
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'htlb-read-items' && e.newValue) {
      try {
        $readItems.set(JSON.parse(e.newValue))
      } catch {}
    } else if (e.key === 'htlb-fav-items' && e.newValue) {
      try {
        $favItems.set(JSON.parse(e.newValue))
      } catch {}
    } else if (e.key === 'htlb-my-habits' && e.newValue) {
      try {
        $myHabits.set(JSON.parse(e.newValue))
      } catch {}
    }
  })

  // 接收静态 Astro DOM 派发的自定义同步事件
  window.addEventListener('htlb:storage-sync', ((e: CustomEvent<{ key: string; value?: unknown }>) => {
    if (e.detail?.key === 'htlb-read-items') {
      $readItems.set(getInitialStorage('htlb-read-items'))
    } else if (e.detail?.key === 'htlb-fav-items') {
      $favItems.set(getInitialStorage('htlb-fav-items'))
    } else if (e.detail?.key === 'htlb-my-habits') {
      $myHabits.set(getHabitsStorage())
    }
  }) as EventListener)
}

function broadcastLocalChange(key: string, list: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('htlb:storage-sync', { detail: { key, value: list } }))
  }
}

export function updateHabits(next: HabitItem[]): void {
  $myHabits.set(next)
  if (typeof window !== 'undefined') {
    localStorage.setItem('htlb-my-habits', JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('htlb:storage-sync', { detail: { key: 'htlb-my-habits', value: next } }))
  }
}

export function toggleRead(uid: string): void {
  const list = $readItems.get()
  const next = list.includes(uid) ? list.filter((id) => id !== uid) : [...list, uid]
  $readItems.set(next)
  broadcastLocalChange('htlb-read-items', next)
}

export function toggleFav(uid: string): void {
  const list = $favItems.get()
  const next = list.includes(uid) ? list.filter((id) => id !== uid) : [...list, uid]
  $favItems.set(next)
  broadcastLocalChange('htlb-fav-items', next)
}

