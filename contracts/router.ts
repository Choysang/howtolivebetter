/**
 * contracts/router.ts · 路由与检索分流契约
 * 纯类型与可辨识联合，零外部依赖，编译期穷尽保障。
 * 符合 AGENTS.md 全仓宪法，契约冻结只增不破。
 */
import type { LiteItem } from './kb.ts'

export type UrgencyLevel = 'E0' | 'E1' | 'E2'
export type IntentType = 'instant' | 'remedy' | 'prevent'

export interface Hotline {
  readonly name: string
  readonly number: string
  readonly desc: string
}

// —— 可辨识联合决策输出 (Discriminated Union) —— //

export interface CrisisDecision {
  readonly type: 'crisis'
  readonly matchedTrigger: string
  readonly hotlines: readonly Hotline[]
  readonly template: 'crisis_static_card'
}

export interface RescueDecision {
  readonly type: 'rescue'
  readonly matchedTrigger: string
  readonly items: readonly LiteItem[] // <= 3 条，仅 title + plain
  readonly banner: string
  readonly template: 'rescue_card'
}

export interface DeepTrackDecision {
  readonly type: 'deep_track'
  readonly domainId: string
  readonly scenarioId?: string
  readonly intent: IntentType
  readonly urgency: UrgencyLevel
  readonly matchedQuery: string
  readonly candidateUids?: readonly string[]
}

export interface FallbackDecision {
  readonly type: 'fallback'
  readonly query: string
}

export type RouterDecision = CrisisDecision | RescueDecision | DeepTrackDecision | FallbackDecision

// —— 实体配置结构 (映射自 router_config.yaml) —— //

export interface DomainConfig {
  readonly id: string
  readonly name: string
  readonly desc: string
  readonly chapters: readonly number[]
  readonly default_urgency: UrgencyLevel
  readonly priority: number
}

export interface ScenarioConfig {
  readonly id: string
  readonly domain: string
  readonly name: string
  readonly triggers: readonly string[]
  readonly sample_queries?: readonly string[]
  readonly default_urgency: UrgencyLevel
  readonly default_intent: IntentType
}

export interface GatekeeperConfig {
  readonly crisis: {
    readonly enabled: boolean
    readonly template: string
    readonly triggers: readonly string[]
    readonly hotlines: readonly Hotline[]
  }
  readonly e0_rescue: {
    readonly enabled: boolean
    readonly max_items: number
    readonly template: string
    readonly suppress_fields: readonly string[]
    readonly display_fields: readonly string[]
    readonly triggers: readonly string[]
    readonly banner?: string
  }
  readonly intent_classification: {
    readonly default_intent: IntentType
    readonly intents: Record<IntentType, { readonly name: string; readonly desc: string; readonly keywords: readonly string[] }>
  }
}

export interface RouterConfig {
  readonly version: string
  readonly schema_version: string
  readonly gatekeeper: GatekeeperConfig
  readonly domains: readonly DomainConfig[]
  readonly scenarios: readonly ScenarioConfig[]
}

// —— 现象级口语芯片契约 (Phenomenon Chips) —— //

export interface PhenomenonChip {
  readonly id: string
  readonly label: string        // 口语化现象短语 (<= 8 个汉字，动宾短语)
  readonly query: string        // 映射至分发器的标准触发词
  readonly urgency: UrgencyLevel// E0 (红), E1 (琥珀), E2 (青)
  readonly scenarioId?: string  // 关联场景 ID (kebab-case)
  readonly domainId: string     // 所属生命大域
  readonly icon: string         // 视觉指引 Emoji
}

export const PHENOMENON_CHIPS: readonly PhenomenonChip[] = [
  { id: 'chip-cardiac', label: '突然倒地没呼吸', query: '倒地 没呼吸 心肺复苏', urgency: 'E0', scenarioId: 'cardiac-arrest', domainId: 'emergency', icon: '🚨' },
  { id: 'chip-choking', label: '吃东西卡喉噎住', query: '卡喉 噎住 海姆立克', urgency: 'E0', scenarioId: 'airway-obstruction', domainId: 'emergency', icon: '🚨' },
  { id: 'chip-stroke', label: '突发嘴歪抬手不能', query: '嘴歪 胳膊没劲 脑卒中', urgency: 'E0', scenarioId: 'stroke', domainId: 'emergency', icon: '🚨' },
  { id: 'chip-heat', label: '大热天头晕中暑', query: '中暑 热射病 降温', urgency: 'E0', scenarioId: 'heatstroke', domainId: 'emergency', icon: '⚡' },
  { id: 'chip-laidoff', label: 'HR拿笔逼签离职', query: '裁员 补偿金 签字', urgency: 'E1', scenarioId: 'laid-off', domainId: 'career', icon: '⚡' },
  { id: 'chip-wages', label: '老板拖欠工资不发', query: '拖欠工资 欠薪 12333', urgency: 'E1', scenarioId: 'owed-wages', domainId: 'career', icon: '⚡' },
  { id: 'chip-rent', label: '退租房东死扣押金', query: '退租 扣押金 交接单', urgency: 'E1', scenarioId: 'rent-deposit', domainId: 'housing', icon: '⚡' },
  { id: 'chip-scam', label: '刚被骗转账求止付', query: '被骗了 止付 96110', urgency: 'E1', scenarioId: 'scam-loss', domainId: 'legal', icon: '⚡' },
  { id: 'chip-chronic', label: '体检查出慢病指标', query: '确诊慢病 高血压 门诊报销', urgency: 'E2', scenarioId: 'chronic-diagnosed', domainId: 'healthcare', icon: '🌿' },
  { id: 'chip-bereave', label: '亲人离世法定销户', query: '亲人离世 办手续 销户', urgency: 'E2', scenarioId: 'bereavement', domainId: 'elderly_care', icon: '🌿' },
] as const
