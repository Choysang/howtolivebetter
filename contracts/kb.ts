/**
 * 契约：知识包（kb）的形状与校验。
 * 三个命名空间互不混写：
 *   source  —— 上游原文，只读，一字不改；
 *   overlay —— 站方编辑判断（界面带「编辑」标注）；
 *   derived —— 构建期计算产物。
 * 顺序号（source.index）只是显示标签，永远不进 URL 与引用。
 */
import type { Predicate } from './predicate.ts'
import type { FactValues, FactKey } from './facts.ts'

// —— 阶段 —— //
export type StageId = 'hs' | 'college' | 'early' | 'mid' | 'retire'
export const STAGE_IDS: readonly StageId[] = ['hs', 'college', 'early', 'mid', 'retire']

export interface Stage {
  id: StageId
  name: string
  ages: string
  thesis: string
  chapters: { core: number[]; related: number[] }
  /** 逐条覆盖：uid -> core/related/excluded（优先于章级权重） */
  itemOverrides?: Record<string, 'core' | 'related' | 'excluded'>
}

// —— 成本标签（上游 HTML 注释，值域已由字段普查固化）—— //
export type MoneyCost = '0' | '少' | '多'
export type TimeCost = '少' | '中' | '多'
export type WillpowerCost = '否' | '些' | '是'
export type BenefitSize = '大' | '中' | '小'
export type Caliber = '死亡率' | '金钱' | '时间' | '自由'
export interface CostTags {
  money: MoneyCost
  time: TimeCost
  willpower: WillpowerCost
  benefit: BenefitSize
  caliber: Caliber
}

export type EvidenceBase = 'A' | 'B' | 'C'

// —— source 命名空间（上游原样）—— //
export interface UpstreamFlags {
  /** 备注以「争议」开头 */
  disputed: boolean
  /** 任一字段含「待核实」字样 */
  unverified: boolean
}

export interface SourceItem {
  chapter: number
  index: number
  title: string
  tags: CostTags
  cost: string
  plain: string
  benefit: string
  /** 原样保留，可能带后缀，如「A（争议）」 */
  evidence: string
  evidenceBase: EvidenceBase
  refs: string
  note: string
  flags: UpstreamFlags
}

import type { DialecticDebate, HabitElasticity } from './cognitive.ts'

// —— overlay 命名空间（站方编辑）—— //
export interface Overlay {
  sensitive?: boolean
  always?: boolean
  applies?: Predicate
  dialectic?: DialecticDebate
  elasticity?: HabitElasticity
}

// —— derived 命名空间（构建期计算）—— //
export interface Xref {
  raw: string
  chapter: number
  index?: number
  uid?: string
}

export interface DerivedItem {
  uid: string
  /** 本条在各阶段的核心/相关层级（由章级权重 + 逐条覆盖算出）；无键 = 不属于该阶段 */
  stageTiers: Partial<Record<StageId, 'core' | 'related'>>
  scenarios: string[]
  xrefs: Xref[]
  prev?: string
  next?: string
}

export interface Item {
  uid: string
  source: SourceItem
  overlay: Overlay
  derived: DerivedItem
}

// —— 紧凑轻量条目视图（供全仓分发器与客户端零延迟检索）—— //
export interface LiteItem {
  uid: string
  chapter: number
  index: number
  title: string
  plain?: string
  benefit?: string
  evidence: string
  evidenceBase: EvidenceBase
  tags: CostTags
  disputed: boolean
  unverified: boolean
  sensitive: boolean
  always: boolean
}

export interface Chapter {
  n: number
  title: string
  file: string
  intro: string
  uids: string[]
}

// —— 场景 —— //
export type Within = string // ISO-8601 duration，如 PT24H / P7D / P30D

export interface ScenarioStep {
  item: string // uid
  hook: string
  within: Within
}

// —— 场景剧本（8大紧急救命时刻）—— //
export type ScenarioId =
  | 'laid-off'
  | 'owed-wages'
  | 'scammed'
  | 'renting'
  | 'marriage'
  | 'baby'
  | 'chronic'
  | 'grief'
export const SCENARIO_IDS: readonly ScenarioId[] = [
  'laid-off',
  'owed-wages',
  'scammed',
  'renting',
  'marriage',
  'baby',
  'chronic',
  'grief',
]

export interface Scenario {
  id: ScenarioId | string
  title: string
  subtitle: string
  steps: ScenarioStep[]
  /** 红线与分支提示（不进时间线，页面渲染在步骤之后） */
  notes?: string[]
  sources?: string[] // 编辑依据（上游长文等），仅署信用
}

// —— 体检 —— //
export interface CheckupOption {
  label: string
  facts: Partial<FactValues>
}

export interface CheckupQuestion {
  id: string
  fact: FactKey
  q: string
  hint?: string
  options: CheckupOption[]
}

export interface CheckupSpec {
  intro: string
  questions: CheckupQuestion[]
}

// —— 打卡 —— //
export interface CheckinItem {
  id: string
  label: string
  detail?: string
  item: string // uid 出处
  /** 周期提醒（可选）：标题 + 周期天数，可导出 .ics */
  reminder?: { title: string; intervalDays: number }
}

export interface CheckinSpec {
  intro: string
  items: CheckinItem[]
}

// —— 排序配置 —— //
export interface RankConfig {
  benefit: Record<BenefitSize, number>
  evidence: Record<EvidenceBase, number>
  stageBoost: { core: number; related: number }
  penalty: { moneyHigh: number; moneyLow: number; timeHigh: number; willpowerYes: number }
  perChapterCap: number
}

// —— 适用条件（体检匹配）—— //
export interface ApplicabilitySpec {
  chapterDefaults: Record<number, Predicate>
  overrides: { uid: string; applies: Predicate; confidence: number }[]
}

// —— 编辑层整体形状（pipeline 与 editorial 的契约）—— //
export interface EditorialSpec {
  stages: Stage[]
  picks: Partial<Record<StageId, string[]>>
  rankConfig: RankConfig
  scenarios: Scenario[]
  checkup: CheckupSpec
  applicability: ApplicabilitySpec
  flags: { autoScanKeywords: string[]; sensitive: string[]; always: string[] }
  checkin: CheckinSpec
}

// —— 匹配规则（编译后的紧凑形式，供设备端 matchSituation）—— //
export type Axis = 'life' | 'money' | 'time' | 'freedom'
export interface MatchRule {
  uid: string
  axis: Axis
  always: boolean
  pred?: Predicate
}

// —— 精华榜 —— //
export interface RankedEntry {
  uid: string
  score: number
  breakdown: { benefit: number; evidence: number; stage: number; penalty: number }
}

// —— 清单（manifest）—— //
export interface ManifestCounts {
  items: number
  chapters: number
  refs: number
  disputed: number
  unverified: number
  evidenceA: number
  evidenceB: number
  evidenceC: number
  sensitive: number
  stages: number
  scenarios: number
  checkinItems: number
}

export interface Manifest {
  schemaVersion: string
  upstream: { repo: string; commit: string; commitShort: string }
  hash: string
  counts: ManifestCounts
  attribution: {
    title: string
    author: string
    repo: string
    license: string
    licenseUrl: string
    derivedNotice: string
  }
}

// ============ 校验器（手写，替代 Zod；失败即错误列表） ============ //

const CALIBER_TO_AXIS: Record<Caliber, Axis> = {
  死亡率: 'life', 金钱: 'money', 时间: 'time', 自由: 'freedom',
}
export const caliberToAxis = (c: Caliber): Axis => CALIBER_TO_AXIS[c]!

const EVIDENCE_BASES: readonly string[] = ['A', 'B', 'C']
const MONEY: readonly string[] = ['0', '少', '多']
const TIME: readonly string[] = ['少', '中', '多']
const WILL: readonly string[] = ['否', '些', '是']
const BENEFIT: readonly string[] = ['大', '中', '小']
const CALIBER: readonly string[] = ['死亡率', '金钱', '时间', '自由']
const UID_RE = /^[0-9A-Z]{8}$/
export const isUid = (s: string): boolean => UID_RE.test(s)

export function validateSourceItem(src: SourceItem): string[] {
  const e: string[] = []
  const where = `第${src.chapter}节第${src.index}条`
  if (!Number.isInteger(src.chapter) || src.chapter < 1) e.push(`${where}：章号非法`)
  if (!Number.isInteger(src.index) || src.index < 1) e.push(`${where}：条号非法`)
  if (!src.title?.trim()) e.push(`${where}：缺标题`)
  if (!MONEY.includes(src.tags?.money)) e.push(`${where}：成本标签 钱="${src.tags?.money}" 非法`)
  if (!TIME.includes(src.tags?.time)) e.push(`${where}：成本标签 时间="${src.tags?.time}" 非法`)
  if (!WILL.includes(src.tags?.willpower)) e.push(`${where}：成本标签 毅力="${src.tags?.willpower}" 非法`)
  if (!BENEFIT.includes(src.tags?.benefit)) e.push(`${where}：成本标签 收益="${src.tags?.benefit}" 非法`)
  if (!CALIBER.includes(src.tags?.caliber)) e.push(`${where}：成本标签 口径="${src.tags?.caliber}" 非法`)
  for (const f of ['cost', 'plain', 'benefit', 'evidence', 'refs'] as const) {
    if (typeof src[f] !== 'string' || !src[f].trim()) e.push(`${where}：字段 ${f} 缺失或为空`)
  }
  if (!EVIDENCE_BASES.includes(src.evidenceBase)) e.push(`${where}：证据等级基准 "${src.evidenceBase}" 非法`)
  if (!src.evidence.startsWith(src.evidenceBase)) e.push(`${where}：证据等级原文与基准不符`)
  return e
}

export function validateManifest(m: Manifest): string[] {
  const e: string[] = []
  if (m.schemaVersion !== '1.0.0') e.push('schemaVersion 必须是 1.0.0')
  if (!/^[0-9a-f]{16}$/.test(m.hash)) e.push('hash 必须是 16 位十六进制')
  if (!m.upstream.commit || !m.upstream.commitShort) e.push('manifest 缺上游 commit')
  const c = m.counts
  for (const k of ['items', 'chapters', 'refs', 'disputed', 'unverified', 'evidenceA', 'evidenceB', 'evidenceC', 'sensitive', 'stages', 'scenarios', 'checkinItems'] as const) {
    if (!Number.isInteger(c[k]) || c[k] < 0) e.push(`counts.${k} 非法`)
  }
  if (c.items !== c.evidenceA + c.evidenceB + c.evidenceC) e.push('counts：证据分级之和必须等于条目总数')
  if (c.stages < 1) e.push('counts.stages 至少为 1（正式站为 5）')
  if (m.attribution?.license !== 'CC BY 4.0') e.push('attribution.license 必须为 CC BY 4.0')
  return e
}

/** 校验整包：条目、章节、场景等交叉引用可解析。 */
export interface BundleShape {
  items: Item[]
  chapters: Chapter[]
  stages: Stage[]
  scenarios: Scenario[]
  checkup: CheckupSpec
  checkin: CheckinSpec
  manifest: Manifest
}

export function validateBundle(b: BundleShape): string[] {
  const e: string[] = []
  const uidSet = new Set(b.items.map((i) => i.uid))
  if (uidSet.size !== b.items.length) e.push('条目 uid 存在重复')
  for (const it of b.items) {
    e.push(...validateSourceItem(it.source))
    if (!isUid(it.uid)) e.push(`uid "${it.uid}" 格式非法`)
  }
  // 「每章必有阶段映射」
  const mappedChapters = new Set<number>()
  for (const st of b.stages) {
    for (const n of st.chapters.core) mappedChapters.add(n)
    for (const n of st.chapters.related) mappedChapters.add(n)
  }
  for (const ch of b.chapters) {
    if (!mappedChapters.has(ch.n)) e.push(`第${ch.n}章「${ch.title}」没有阶段映射（必须至少 related）`)
  }
  for (const ch of b.chapters) {
    for (const uid of ch.uids) if (!uidSet.has(uid)) e.push(`第${ch.n}章引用了不存在的 uid ${uid}`)
  }
  for (const sc of b.scenarios) {
    for (const step of sc.steps) {
      if (!uidSet.has(step.item)) e.push(`场景 ${sc.id} 引用了不存在的 uid ${step.item}`)
      if (!step.hook?.trim()) e.push(`场景 ${sc.id} 步骤缺钩子`)
    }
  }
  for (const ci of b.checkin.items) {
    if (!uidSet.has(ci.item)) e.push(`打卡项 ${ci.id} 引用了不存在的 uid ${ci.item}`)
  }
  for (const it of b.items) {
    for (const x of it.derived.xrefs) {
      if (x.index !== undefined && !x.uid) e.push(`条目 ${it.uid} 的交叉引用「${x.raw}」未能解析`)
    }
  }
  return e
}
