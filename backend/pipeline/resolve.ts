/**
 * pipeline/resolve —— 交叉引用解析 + 邻条 + 反向索引原料。
 * 识别三种原文引用：
 *   见第 N 节第 M 条 / 见第 N 节 / 见第 M 条（同章带标题）
 * 未命中的引用保留为纯文本（不造链接），仅计数汇报。
 */
import type { Item, Xref } from '../../contracts/kb.ts'

const XREF_RE = /见第\s*(\d+)\s*节\s*第?\s*(\d+)\s*条|见第\s*(\d+)\s*节|见第\s*(\d+)\s*条（([^）]+)）/g

export interface ResolveResult {
  items: Item[]
  unresolved: string[]
}

export function resolveXrefs(items: Item[]): ResolveResult {
  const uidByCi = new Map<string, string>()
  const titleByUid = new Map<string, { chapter: number; index: number; title: string }>()
  for (const it of items) {
    uidByCi.set(`${it.source.chapter}|${it.source.index}`, it.uid)
    titleByUid.set(it.uid, { chapter: it.source.chapter, index: it.source.index, title: it.source.title })
  }

  const unresolved: string[] = []
  for (const it of items) {
    const xrefs: Xref[] = []
    for (const field of [it.source.plain, it.source.benefit, it.source.note]) {
      for (const m of field.matchAll(XREF_RE)) {
        const raw = m[0]
        if (m[1] !== undefined && m[2] !== undefined) {
          const uid = uidByCi.get(`${Number(m[1])}|${Number(m[2])}`)
          if (uid) xrefs.push({ raw, chapter: Number(m[1]), index: Number(m[2]), uid })
          else unresolved.push(`${it.uid}「${raw}」目标不存在`)
        } else if (m[3] !== undefined) {
          xrefs.push({ raw, chapter: Number(m[3]) })
        } else if (m[4] !== undefined) {
          // 同章「见第 M 条（标题）」：先按条号，再按标题兜底
          const byIndex = uidByCi.get(`${it.source.chapter}|${Number(m[4])}`)
          const target = byIndex ?? findByTitle(items, it.source.chapter, m[5]!)
          if (target) xrefs.push({ raw, chapter: it.source.chapter, index: Number(m[4]), uid: target })
          else unresolved.push(`${it.uid}「${raw}」目标不存在`)
        }
      }
    }
    // 去重（同一条目内同引用可能出现多次字段）
    it.derived.xrefs = [...new Map(xrefs.map((x) => [x.raw, x])).values()]
  }

  // 邻条
  for (const it of items) {
    const prev = uidByCi.get(`${it.source.chapter}|${it.source.index - 1}`)
    const next = uidByCi.get(`${it.source.chapter}|${it.source.index + 1}`)
    it.derived.prev = prev
    it.derived.next = next
  }
  void titleByUid
  return { items, unresolved }
}

function findByTitle(items: Item[], chapter: number, title: string): string | undefined {
  return items.find((i) => i.source.chapter === chapter && i.source.title === title)?.uid
}
