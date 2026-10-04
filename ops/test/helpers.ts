/** 测试基建：种子随机 + forAll 属性测试（fast-check 的零依赖替代）。 */
import { uidFor } from '../../kernel/uid.ts'
import type { Item, StageId, EvidenceBase, CostTags, Axis, MatchRule } from '../../contracts/kb.ts'
import type { Predicate } from '../../contracts/predicate.ts'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 断言生成值满足谓词；失败抛错并带 index。 */
export function forAll<T>(gen: (r: () => number) => T, fn: (v: T) => void, n = 200): void {
  const r = mulberry32(0x5eed)
  for (let i = 0; i < n; i++) {
    try {
      fn(gen(r))
    } catch (err) {
      throw new Error(`forAll 第 ${i} 个样本失败：${String(err)}`)
    }
  }
}

export const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!

const MONEYS = ['0', '少', '多'] as const
const TIMES = ['少', '中', '多'] as const
const WILLS = ['否', '些', '是'] as const
const BENEFITS = ['大', '中', '小'] as const
const CALIBERS = ['死亡率', '金钱', '时间', '自由'] as const
const EVIDENCE = ['A', 'B', 'C'] as const
const STAGE_IDS: StageId[] = ['hs', 'college', 'early', 'mid', 'retire']

export function genTags(r: () => number): CostTags {
  return {
    money: pick(r, MONEYS),
    time: pick(r, TIMES),
    willpower: pick(r, WILLS),
    benefit: pick(r, BENEFITS),
    caliber: pick(r, CALIBERS),
  }
}

let counter = 0

export function genItem(r: () => number): Item {
  const chapter = 1 + Math.floor(r() * 5)
  const index = 1 + Math.floor(r() * 40)
  const title = `随机条目 ${counter++} ${Math.floor(r() * 1e6)}`
  const evidenceBase = pick(r, EVIDENCE) as EvidenceBase
  const tier = r() < 0.5 ? 'core' : 'related'
  const stageId = pick(r, STAGE_IDS)
  const stageTiers: Partial<Record<StageId, 'core' | 'related'>> = r() < 0.2 ? {} : { [stageId]: tier }
  return {
    uid: uidFor(chapter, title),
    source: {
      chapter,
      index,
      title,
      tags: genTags(r),
      cost: 'x',
      plain: 'y',
      benefit: 'z',
      evidence: evidenceBase,
      evidenceBase,
      refs: 'w',
      note: r() < 0.1 ? '争议。演示' : 'n',
      flags: { disputed: false, unverified: r() < 0.1 },
    },
    overlay: { sensitive: r() < 0.1 },
    derived: { uid: '', stageTiers, scenarios: [], xrefs: [] },
  }
}

const AXES: Axis[] = ['life', 'money', 'time', 'freedom']
const FACT_KEYS = ['housing', 'money_buffer', 'health_chronic', 'family_elders', 'age'] as const
const FACT_VALS: Record<string, string[]> = {
  housing: ['own', 'rent', 'with-family', 'dorm', 'uncertain'],
  money_buffer: ['six-months', 'one-to-six', 'none', 'debt', 'uncertain'],
  health_chronic: ['yes', 'no', 'uncertain'],
  family_elders: ['yes', 'no', 'uncertain'],
  age: ['under18', '18to22', '23to35', '36to55', '56plus', 'uncertain'],
}

export function genPredicate(r: () => number): Predicate {
  const kind = Math.floor(r() * 4)
  const fact = pick(r, FACT_KEYS)
  const vals = FACT_KEYS.includes(fact) ? FACT_VALS[fact]! : ['yes']
  if (kind === 0) return { fact, in: [pick(r, vals)] }
  if (kind === 1) return { all: [genPredicate(r)] }
  if (kind === 2) return { any: [genPredicate(r), genPredicate(r)] }
  return { not: { fact, in: [pick(r, vals)] } }
}

export function genRule(r: () => number): MatchRule {
  return {
    uid: uidFor(9, `rule ${counter++} ${r()}`),
    axis: pick(r, AXES),
    always: r() < 0.15,
    pred: r() < 0.8 ? genPredicate(r) : undefined,
  }
}
