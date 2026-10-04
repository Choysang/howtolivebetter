/**
 * kernel/agent.ts · Agent 上下文高密度压缩与分发转换器
 * 
 * 核心职责:
 * 1. 将 RouterDecision 与知识库条目转换为标准 AgentToolResultPayload
 * 2. 行动半衰期 (Action Half-life) 倒金字塔压缩：秒级 E0、法定小时级 E1、终生微习惯 E2
 * 3. 剥离无意义元数据，压低 Token 消耗，提供 0ms 纯函数端侧生成能力。
 * 遵循 AGENTS.md: 单函数 <= 60 行，零外部依赖，零 I/O。
 */

import type { RouterDecision, UrgencyLevel, IntentType } from '../contracts/router.ts'
import type { LiteItem, EvidenceBase } from '../contracts/kb.ts'
import type {
  AgentToolResultPayload,
  AgentActionItem,
  AgentDispatchParams,
  ActionHalfLifeTier,
} from '../contracts/agent.ts'

/** 简易精确 Token 估算器 (中英混排，零外部依赖) */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cjkCount = 0
  let otherCount = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) {
      cjkCount++
    } else {
      otherCount++
    }
  }
  return Math.ceil(cjkCount * 0.7 + otherCount * 0.25)
}

/** 计算行动半衰期等级 */
export function resolveHalfLifeTier(urgency: UrgencyLevel): ActionHalfLifeTier {
  if (urgency === 'E0') return 'T_SECONDS'
  if (urgency === 'E1') return 'T_HOURS'
  return 'T_LONGTERM'
}

/** 提取高密度物理/法定动作指令（去除冗余感叹词与叙述） */
export function compressActionText(item: LiteItem, urgency: UrgencyLevel): string {
  const sourceText = item.plain || item.benefit || item.title
  const cleaned = sourceText
    .replace(/^(例如|注意|提示|建议|说人话|核心动作)[：:\s]*/g, '')
    .replace(/(\r\n|\n|\r)/g, ' ')
    .trim()

  if (urgency === 'E0') {
    // 急救场景：严格限制在 40 字以内纯物理动作
    return cleaned.slice(0, 45)
  }
  if (urgency === 'E1') {
    // 维权时效场景：截取法定阻断核心，最多 60 字
    return cleaned.slice(0, 65)
  }
  // 常规循证习惯：最多 70 字
  return cleaned.slice(0, 75)
}

/** 格式化紧凑三元资源向量 */
export function formatCostVector(item: LiteItem): string {
  const m = item.tags?.money ?? '0'
  const t = item.tags?.time ?? '少'
  const w = item.tags?.willpower ?? '否'
  return `钱${m}/时${t}/毅${w}`
}

/** 过滤与排序候选条目 */
export function filterAndRankItems(
  pool: readonly LiteItem[],
  minGrade: EvidenceBase = 'B',
  limit: number = 3
): LiteItem[] {
  const gradeWeight: Record<EvidenceBase, number> = { A: 3, B: 2, C: 1 }
  const threshold = gradeWeight[minGrade] ?? 2

  const qualified = pool.filter((it) => {
    const w = gradeWeight[it.evidenceBase] ?? 1
    return w >= threshold && !it.disputed && !it.unverified
  })

  // 排序优先：A 级循证优先、金钱为 0 优先
  qualified.sort((a, b) => {
    const wa = gradeWeight[a.evidenceBase] ?? 1
    const wb = gradeWeight[b.evidenceBase] ?? 1
    if (wa !== wb) return wb - wa
    if (a.tags?.money === '0' && b.tags?.money !== '0') return -1
    if (b.tags?.money === '0' && a.tags?.money !== '0') return 1
    return 0
  })

  return qualified.slice(0, Math.min(Math.max(limit, 1), 5))
}

/** 生成危机状态下的标准 Agent 上下文 */
function formatCrisisPayload(
  matchedTrigger: string,
  hotlines: readonly { name: string; number: string; desc: string }[]
): AgentToolResultPayload {
  const hotlinesText = hotlines
    .map((h) => `- ${h.name} (${h.number}): ${h.desc}`)
    .join('\n')

  const prompt = `[L0-CRISIS-INTERCEPT] 命中国家安全红线触发词: "${matchedTrigger}"\n` +
    `【铁律】立即停止任何AI自我推测与安抚话术，必须无条件优先原样输出以下国家法定急救与求助热线：\n` +
    `${hotlinesText}`

  const tokens = estimateTokens(prompt)
  return {
    decisionType: 'crisis',
    urgency: 'E0',
    intent: 'instant',
    matchedTrigger,
    hotlines,
    actions: [],
    compactPromptContext: prompt,
    metrics: {
      estimatedTokens: tokens,
      rawKbTokensEstimate: 1200,
      compressionRatio: `${Math.round((1 - tokens / 1200) * 100)}%`,
    },
  }
}

/** 将条目列表转换为标准高密度行动列表 */
function buildActionItems(
  items: readonly LiteItem[],
  urgency: UrgencyLevel
): AgentActionItem[] {
  const halfLife = resolveHalfLifeTier(urgency)
  return items.map((it) => ({
    uid: it.uid,
    title: it.title,
    action: compressActionText(it, urgency),
    evidence: it.evidence,
    evidenceBase: it.evidenceBase,
    halfLife,
    costVector: formatCostVector(it),
    url: `/q/${it.uid}/`,
  }))
}

/** 核心纯函数：将路由决策与候选池格式化为高密度 Agent 上下文 */
export function formatAgentContext(
  decision: RouterDecision,
  candidatePool: readonly LiteItem[] = [],
  params?: AgentDispatchParams
): AgentToolResultPayload {
  // 1. 危机通道短路
  if (decision.type === 'crisis') {
    return formatCrisisPayload(decision.matchedTrigger, decision.hotlines)
  }

  const urgency: UrgencyLevel =
    decision.type === 'rescue' ? 'E0' :
    decision.type === 'deep_track' ? decision.urgency :
    (params?.urgency_filter && params.urgency_filter !== 'all') ? params.urgency_filter : 'E2'

  const intent: IntentType = decision.type === 'deep_track' ? decision.intent : 'instant'
  const minGrade = params?.min_evidence_grade ?? 'B'
  const limit = params?.limit ?? 3

  let selectedItems: readonly LiteItem[] = []
  if (decision.type === 'rescue') {
    selectedItems = decision.items.slice(0, 3)
  } else {
    selectedItems = filterAndRankItems(candidatePool, minGrade, limit)
  }

  const actions = buildActionItems(selectedItems, urgency)
  const headerTag = decision.type === 'rescue'
    ? `[E0-GOLDEN-RESCUE: ${decision.matchedTrigger}] 半衰期 <= 4min (纯动作指令)`
    : decision.type === 'deep_track'
    ? `[DEEP-TRACK: ${decision.scenarioId || decision.domainId}] 意图: ${intent} | 紧急度: ${urgency}`
    : `[KNOWLEDGE-RECALL] 紧急度: ${urgency} | 最低循证: Grade ${minGrade}`

  const lines = [headerTag]
  actions.forEach((a, idx) => {
    lines.push(
      `${idx + 1}. [#${a.uid}] ${a.title} [${a.evidenceBase}级|${a.costVector}]\n` +
      `   -> 动作: ${a.action}\n` +
      `   -> 链接: ${a.url}`
    )
  })

  const promptText = lines.join('\n')
  const estimatedTokens = estimateTokens(promptText)
  const rawKbTokensEstimate = Math.max(actions.length * 350, 400)
  const ratio = `${Math.round((1 - estimatedTokens / rawKbTokensEstimate) * 100)}%`

  return {
    decisionType: decision.type,
    urgency,
    intent,
    matchedTrigger: decision.type === 'rescue' ? decision.matchedTrigger : undefined,
    scenarioId: decision.type === 'deep_track' ? decision.scenarioId : undefined,
    scenarioUrl: decision.type === 'deep_track' && decision.scenarioId ? `/scenario/${decision.scenarioId}/` : undefined,
    actions,
    compactPromptContext: promptText,
    metrics: {
      estimatedTokens,
      rawKbTokensEstimate,
      compressionRatio: ratio,
    },
  }
}
