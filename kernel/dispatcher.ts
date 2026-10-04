/**
 * kernel/dispatcher.ts · 零 I/O 纯函数双速分发器
 * 核心职责:
 * 1. L0 危机短路拦截 (0% 幻觉，100% 确定性)
 * 2. E0 现场急救直通 (<= 3 条纯指令)
 * 3. Deep-Track 深度意图与情境分流
 * 遵守 AGENTS.md: 单函数 <= 50 行，零外部依赖，剥离物理时钟。
 */
import type {
  RouterConfig,
  RouterDecision,
  CrisisDecision,
  RescueDecision,
  DeepTrackDecision,
  FallbackDecision,
  IntentType,
  UrgencyLevel,
} from '../contracts/router.ts'
import type { LiteItem } from '../contracts/kb.ts'

export function matchFirstKeyword(query: string, keywords: readonly string[]): string | null {
  for (const kw of keywords) {
    if (kw.length > 0 && query.includes(kw)) {
      return kw
    }
  }
  return null
}

export function detectIntent(
  query: string,
  config: RouterConfig['gatekeeper']['intent_classification']
): IntentType {
  let matchedIntent = config.default_intent
  let maxMatchedLen = 0

  for (const [key, def] of Object.entries(config.intents) as [IntentType, { name: string; keywords: string[] }][]) {
    for (const kw of def.keywords) {
      if (query.includes(kw) && kw.length > maxMatchedLen) {
        maxMatchedLen = kw.length
        matchedIntent = key
      }
    }
  }
  return matchedIntent
}

function resolveRescueItems(itemsPool?: readonly LiteItem[]): LiteItem[] {
  if (!itemsPool || itemsPool.length === 0) return []
  // 优先选取第 13 节紧急情况的条目，序号越小致死风险越高
  const ch13 = itemsPool.filter((i) => i.chapter === 13)
  const sorted = [...ch13].sort((a, b) => a.index - b.index)
  const picked = sorted.length > 0 ? sorted.slice(0, 3) : itemsPool.slice(0, 3)
  return picked.map((item) => ({
    uid: item.uid,
    chapter: item.chapter,
    index: item.index,
    title: item.title,
    plain: item.plain,
    benefit: '',
    evidence: item.evidence,
    evidenceBase: item.evidenceBase,
    tags: item.tags,
    disputed: false,
    unverified: false,
    sensitive: false,
    always: false,
  }))
}

export function dispatchQuery(
  rawQuery: string,
  config: RouterConfig,
  itemsPool?: readonly LiteItem[]
): RouterDecision {
  const query = rawQuery.trim().toLowerCase()
  if (!query) {
    return { type: 'fallback', query: '' } as FallbackDecision
  }

  // 1. 阶梯 0: L0 危机干预 100% 短路拦截 (零检索、零幻觉)
  const crisisTrigger = matchFirstKeyword(query, config.gatekeeper.crisis.triggers)
  if (crisisTrigger && config.gatekeeper.crisis.enabled) {
    const decision: CrisisDecision = {
      type: 'crisis',
      matchedTrigger: crisisTrigger,
      hotlines: config.gatekeeper.crisis.hotlines,
      template: 'crisis_static_card',
    }
    return decision
  }

  // 2. 阶梯 1: E0 现场急救短路直通 (<= 3条纯指令)
  const rescueTrigger = matchFirstKeyword(query, config.gatekeeper.e0_rescue.triggers)
  if (rescueTrigger && config.gatekeeper.e0_rescue.enabled) {
    const rescueDecision: RescueDecision = {
      type: 'rescue',
      matchedTrigger: rescueTrigger,
      items: resolveRescueItems(itemsPool),
      banner: config.gatekeeper.e0_rescue.banner || '⚠️ 黄金急救现场 · 立即执行核心动作',
      template: 'rescue_card',
    }
    return rescueDecision
  }

  // 3. 阶梯 2: Deep-Track 意图与情境分流
  const intent = detectIntent(query, config.gatekeeper.intent_classification)
  const matchedScenario = config.scenarios.find((s) => s.triggers.some((t) => query.includes(t)))

  let domainId = matchedScenario?.domain || ''
  let urgency: UrgencyLevel = matchedScenario?.default_urgency || 'E2'

  if (!domainId) {
    const matchedDomain = config.domains.find(
      (d) => query.includes(d.name) || d.desc.includes(query) || (d.chapters && d.chapters.some((c) => query.includes(`${c}章`)))
    )
    domainId = matchedDomain ? matchedDomain.id : config.domains[0]?.id || 'emergency'
    urgency = matchedDomain ? matchedDomain.default_urgency : 'E2'
  }

  const deepDecision: DeepTrackDecision = {
    type: 'deep_track',
    domainId,
    scenarioId: matchedScenario?.id ? matchedScenario.id.replace(/_/g, '-') : undefined,
    intent,
    urgency,
    matchedQuery: rawQuery,
  }
  return deepDecision
}
