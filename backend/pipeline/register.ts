/**
 * pipeline/register —— uid 注册与改名续接。
 * 基础 uid 每次确定性重推导（uidFor）；data/id-registry.jsonl 只追加「决策行」：
 *   seen  —— 新条目首次出现（chapter|title -> uid）
 *   alias —— 章内唯一孤儿的改名续接（新标题 -> 旧 uid）
 * 碰撞与歧义改名直接构建失败。同输入同输出（幂等）。
 */
import { uidFor } from '../../kernel/uid.ts'
import type { SourceItem } from '../../contracts/kb.ts'
import type { ParsedChapter } from './parse.ts'

export interface SeenLine { t: 'seen'; chapter: number; title: string; uid: string }
export interface AliasLine { t: 'alias'; chapter: number; title: string; uid: string; prevTitle: string }
export type RegistryLine = SeenLine | AliasLine

export interface RegisterResult {
  uidByChapterIndex: Map<string, string>
  appended: RegistryLine[]
  removedUids: string[]
  renamed: AliasLine[]
}

const key = (chapter: number, title: string): string => `${chapter}|${title}`

export function parseRegistry(text: string): RegistryLine[] {
  if (!text.trim()) return []
  return text.split('\n').filter(Boolean).map((l, i) => {
    try {
      return JSON.parse(l) as RegistryLine
    } catch {
      throw new Error(`id-registry.jsonl 第 ${i + 1} 行不是合法 JSON：${l.slice(0, 60)}`)
    }
  })
}

export function registerUids(chapters: ParsedChapter[], registry: RegistryLine[]): RegisterResult {
  const pairToUid = new Map<string, string>()
  const uidToPair = new Map<string, string>()
  for (const line of registry) {
    const k = key(line.chapter, line.title)
    if (pairToUid.has(k)) throw new Error(`注册表冲突：${k} 出现多次`)
    if (uidToPair.has(line.uid) && uidToPair.get(line.uid) !== k) {
      throw new Error(`注册表冲突：uid ${line.uid} 被两对标题占用`)
    }
    pairToUid.set(k, line.uid)
    uidToPair.set(line.uid, k)
  }

  const appended: RegistryLine[] = []
  const renamed: AliasLine[] = []
  const uidByChapterIndex = new Map<string, string>()
  const usedUids = new Set<string>()
  const allItems: SourceItem[] = chapters.flatMap((c) => c.items)

  for (const ch of chapters) {
    const seenTitles = new Set(
      [...pairToUid.keys()].filter((k) => k.startsWith(`${ch.n}|`)).map((k) => k.split('|').slice(1).join('|')),
    )
    const currentTitles = new Set(ch.items.map((i) => i.title))
    const orphans = [...seenTitles].filter((t) => !currentTitles.has(t))

    for (const item of ch.items) {
      const k = key(ch.n, item.title)
      let uid = pairToUid.get(k)
      if (uid === undefined) {
        const candidate = uidFor(ch.n, item.title)
        const candidateOwner = uidToPair.get(candidate)
        if (candidateOwner !== undefined) {
          // 候选 uid 已被其他对占用 —— 真·碰撞或跨章同名；改名续接只认章内孤儿
          if (orphans.length === 1) {
            const prevTitle = orphans[0]!
            uid = pairToUid.get(key(ch.n, prevTitle))!
            const alias: AliasLine = { t: 'alias', chapter: ch.n, title: item.title, uid, prevTitle }
            appended.push(alias)
            renamed.push(alias)
            pairToUid.set(k, uid)
          } else {
            throw new Error(
              `uid 碰撞且无法续接：第${ch.n}章「${item.title}」派生 ${candidate}（已被「${candidateOwner}」占用）；章内孤儿 ${orphans.length} 个`,
            )
          }
        } else if (orphans.length === 1) {
          // 新派生 uid 空闲，但章内有唯一孤儿 —— 判定为改名，续接旧 uid
          const prevTitle = orphans[0]!
          uid = pairToUid.get(key(ch.n, prevTitle))!
          const alias: AliasLine = { t: 'alias', chapter: ch.n, title: item.title, uid, prevTitle }
          appended.push(alias)
          renamed.push(alias)
          pairToUid.set(k, uid)
        } else {
          uid = candidate
          const seen: SeenLine = { t: 'seen', chapter: ch.n, title: item.title, uid }
          appended.push(seen)
          pairToUid.set(k, uid)
          uidToPair.set(uid, k)
        }
      }
      if (usedUids.has(uid)) throw new Error(`uid 重复分配：${uid}（第${ch.n}章「${item.title}」）`)
      usedUids.add(uid)
      uidByChapterIndex.set(`${ch.n}|${item.index}`, uid)
    }
  }

  const currentUidPairs = new Set(allItems.map((i) => key(i.chapter, i.title)).map((k) => pairToUid.get(k)!))
  const removedUids = [...uidToPair.entries()]
    .filter(([uid]) => !currentUidPairs.has(uid))
    .map(([uid]) => uid)

  return { uidByChapterIndex, appended, removedUids, renamed }
}

export function registryToString(lines: RegistryLine[]): string {
  return lines.map((l) => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : '')
}
