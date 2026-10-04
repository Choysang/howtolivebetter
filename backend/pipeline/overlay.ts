/**
 * pipeline/overlay —— 应用编辑层：三命名空间合流。
 * 编辑层的全部 uid 引用必须可解析；指向已删除条目的引用给出带 tombstone 提示的失败。
 */
import type { EditorialSpec, Item, MatchRule, StageId } from '../../contracts/kb.ts'
import { caliberToAxis } from '../../contracts/kb.ts'
import { EDITORIAL_DIALECTICS, EDITORIAL_ELASTICITY } from '../editorial/cognitive.ts'

export interface OverlayResult {
  items: Item[]
  rules: MatchRule[]
  sensitiveAuto: string[]
}

export function applyOverlay(items: Item[], ed: EditorialSpec, removedUids: string[]): OverlayResult {
  const byUid = new Map(items.map((i) => [i.uid, i]))
  const removed = new Set(removedUids)

  const resolveUid = (uid: string, where: string): string => {
    if (byUid.has(uid)) return uid
    if (removed.has(uid)) {
      throw new Error(`${where} 引用了已被上游删除的条目 ${uid}（tombstone）：请更新编辑层`)
    }
    throw new Error(`${where} 引用了不存在的 uid ${uid}`)
  }

  // sensitive：显式清单 + 关键词自动扫描（双保险）
  const sensitiveAuto: string[] = []
  for (const it of items) {
    const text = `${it.source.title}\n${it.source.plain}\n${it.source.note}`
    if (ed.flags.autoScanKeywords.some((k) => text.includes(k))) sensitiveAuto.push(it.uid)
  }
  const sensitiveSet = new Set([...ed.flags.sensitive, ...sensitiveAuto])
  const alwaysSet = new Set(ed.flags.always.map((u) => resolveUid(u, 'flags.always')))

  for (const uid of sensitiveSet) if (!byUid.has(uid)) throw new Error(`flags.sensitive 引用了不存在的 uid ${uid}`)

  // 阶段分层 + 场景归属 + overlay 标记
  const stageOf = new Map<StageId, Map<string, 'core' | 'related'>>()
  for (const st of ed.stages) {
    const core = new Set(st.chapters.core)
    const related = new Set(st.chapters.related)
    const overlap = st.chapters.core.filter((n) => related.has(n))
    if (overlap.length) throw new Error(`阶段 ${st.id} 第 ${overlap.join('、')} 章同时是 core 和 related`)
    stageOf.set(st.id, new Map())
  }
  for (const it of items) {
    for (const st of ed.stages) {
      const override = st.itemOverrides?.[it.uid]
      if (override === 'core' || override === 'related') {
        stageOf.get(st.id)!.set(it.uid, override)
      } else if (override === 'excluded' || override === undefined) {
        const n = it.source.chapter
        if (override !== 'excluded') {
          if (st.chapters.core.includes(n)) stageOf.get(st.id)!.set(it.uid, 'core')
          else if (st.chapters.related.includes(n)) stageOf.get(st.id)!.set(it.uid, 'related')
        }
      } else {
        throw new Error(`阶段 ${st.id} 对 ${it.uid} 的覆盖值非法：${String(override)}`)
      }
    }
    it.overlay.sensitive = sensitiveSet.has(it.uid) || undefined
    it.overlay.always = alwaysSet.has(it.uid) || undefined
    it.overlay.dialectic = EDITORIAL_DIALECTICS[it.uid] || undefined
    it.overlay.elasticity = EDITORIAL_ELASTICITY[it.uid] || undefined
  }
  for (const it of items) {
    const tiers: Partial<Record<StageId, 'core' | 'related'>> = {}
    for (const st of ed.stages) {
      const tier = stageOf.get(st.id)!.get(it.uid)
      if (tier) tiers[st.id] = tier
    }
    it.derived.stageTiers = tiers
  }

  for (const sc of ed.scenarios) {
    for (const step of sc.steps) resolveUid(step.item, `场景 ${sc.id}`)
  }
  for (const [sid, uids] of Object.entries(ed.picks)) {
    for (const uid of uids ?? []) {
      resolveUid(uid, `picks.${sid}`)
      const it = byUid.get(uid)!
      if (it.overlay.sensitive || it.source.flags.unverified) {
        throw new Error(`picks.${sid} 的 ${uid} 是 sensitive/待核实条目，不得入选`)
      }
      if (!it.derived.stageTiers[sid as StageId]) {
        throw new Error(`picks.${sid} 的 ${uid} 不属于该阶段（需先加入章映射或逐条覆盖）`)
      }
    }
  }
  for (const ci of ed.checkin.items) {
    resolveUid(ci.item, `checkin.${ci.id}`)
    const it = byUid.get(ci.item)!
    if (it.overlay.sensitive) throw new Error(`checkin.${ci.id} 引用了 sensitive 条目 ${ci.item}`)
  }
  const overrideUids = new Set<string>()
  for (const o of ed.applicability.overrides) {
    resolveUid(o.uid, 'applicability.overrides')
    if (o.confidence < 0 || o.confidence > 1) throw new Error(`applicability ${o.uid} confidence 超出 [0,1]`)
    if (overrideUids.has(o.uid)) throw new Error(`applicability 重复覆盖 ${o.uid}`)
    overrideUids.add(o.uid)
  }

  for (const sc of ed.scenarios) {
    for (const step of sc.steps) {
      const it = byUid.get(step.item)!
      if (!it.derived.scenarios.includes(sc.id)) it.derived.scenarios.push(sc.id)
    }
  }

  // 匹配规则：sensitive 条目不进体检结果
  const overrideMap = new Map(ed.applicability.overrides.map((o) => [o.uid, o.applies]))
  const rules: MatchRule[] = []
  for (const it of items) {
    if (it.overlay.sensitive) continue
    rules.push({
      uid: it.uid,
      axis: caliberToAxis(it.source.tags.caliber),
      always: it.overlay.always === true,
      pred: overrideMap.get(it.uid) ?? ed.applicability.chapterDefaults[it.source.chapter],
    })
  }

  return { items, rules, sensitiveAuto }
}
