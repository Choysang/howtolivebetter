/**
 * contracts/agent.ts · Agent-Native 协议与 Tool Schema 形式化契约
 * 
 * 核心职责:
 * 1. 2026 Model Context Protocol (MCP) 标准工具形式化定义 (dispatch_life_guide)
 * 2. OpenAI Function Calling / Claude Tool Use JSON Schema 规范
 * 3. 零 Token 浪费的高密度响应 (High-Density Action Context) 契约
 * 4. 遵守 AGENTS.md 全仓宪法：纯类型与静态契约，零外部依赖。
 */

import type { UrgencyLevel, IntentType, Hotline, RouterDecision } from './router.ts'
import type { EvidenceBase } from './kb.ts'

// —— 行动半衰期等级 (Action Half-life) —— //
export type ActionHalfLifeTier =
  | 'T_SECONDS'   // E0: 秒级~分级 (<= 4min 黄金挽救期)
  | 'T_HOURS'     // E1: 小时级~天级 (<= 72h 法定取证与阻断期)
  | 'T_LONGTERM'  // E2: 长期~终生 (微习惯与认知防坑)

// —— 高密度行动卡片契约 (零冗余 Token) —— //
export interface AgentActionItem {
  readonly uid: string
  readonly title: string
  /** 纯物理/法定动作指令（剥离所有感叹与废话） */
  readonly action: string
  /** 循证基准 (A/B/C) 与评级说明 */
  readonly evidence: string
  readonly evidenceBase: EvidenceBase
  /** 行动半衰期声明 */
  readonly halfLife: ActionHalfLifeTier
  /** 资源三元组紧缩表示: 钱[0/少/多]|时[少/中/多]|毅[否/些/是] */
  readonly costVector: string
  /** 官方条目规范 URL */
  readonly url: string
}

// —— Agent 工具返回的高密度有效载荷 (Compact Payload) —— //
export interface AgentToolResultPayload {
  readonly decisionType: 'crisis' | 'rescue' | 'deep_track' | 'fallback'
  readonly urgency: UrgencyLevel
  readonly intent: IntentType
  readonly matchedTrigger?: string
  /** L0 危机干预法定热线（仅当 crisis 时存在，0% 幻觉） */
  readonly hotlines?: readonly Hotline[]
  /** Deep-Track 专项场景 ID 及规范化专页 URL */
  readonly scenarioId?: string
  readonly scenarioUrl?: string
  /** 按照行动半衰期与循证等级压缩的高密度行动指令 (<= 3-5条) */
  readonly actions: readonly AgentActionItem[]
  /** 适合直灌大模型 Context Window 的超高密度单行文本块 */
  readonly compactPromptContext: string
  /** Token 消耗与压缩率预估指标 */
  readonly metrics: {
    readonly estimatedTokens: number
    readonly rawKbTokensEstimate: number
    readonly compressionRatio: string
  }
}

// —— 工具调用入参规范 —— //
export interface AgentDispatchParams {
  /** 用户的处境、问题、关键词或痛点口语描述 (必填) */
  readonly query: string
  /** 紧急程度过滤：'all' 全部 | 'E0' 黄金现场急救 | 'E1' 维权与阻断 | 'E2' 长期规划与习惯 */
  readonly urgency_filter?: 'all' | 'E0' | 'E1' | 'E2'
  /** 最低可信度循证评级过滤：'A' 顶级循证 | 'B' 良好证据 | 'C' 经验参考，默认 'B' */
  readonly min_evidence_grade?: 'A' | 'B' | 'C'
  /** 返回最大行动指令数 (默认 3，最大 5，防止上下文过载) */
  readonly limit?: number
}

// —— Model Context Protocol (MCP) 工具定义规范 —— //
export interface McpToolDefinition {
  readonly name: string
  readonly description: string
  readonly inputSchema: {
    readonly type: 'object'
    readonly properties: Record<string, {
      readonly type: string
      readonly description: string
      readonly enum?: readonly string[]
      readonly default?: unknown
    }>
    readonly required: readonly string[]
  }
}

// —— OpenAI Function Calling 工具规范 —— //
export interface OpenAIToolDefinition {
  readonly type: 'function'
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: {
      readonly type: 'object'
      readonly properties: Record<string, {
        readonly type: string
        readonly description: string
        readonly enum?: readonly string[]
        readonly default?: unknown
      }>
      readonly required: readonly string[]
    }
  }
}

// —— Claude / Anthropic Tool Use 工具规范 —— //
export interface ClaudeToolDefinition {
  readonly name: string
  readonly description: string
  readonly input_schema: {
    readonly type: 'object'
    readonly properties: Record<string, {
      readonly type: string
      readonly description: string
      readonly enum?: readonly string[]
      readonly default?: unknown
    }>
    readonly required: readonly string[]
  }
}

// ==============================================================================
// 标准工具形式化 Schema 单例 (冻结不可变)
// ==============================================================================

const TOOL_NAME = 'dispatch_life_guide'
const TOOL_DESCRIPTION = 
  '《高性价比人生指南》双速循证决策分发器。支持全仓 654 条科学建议的毫秒级检索与分流。' +
  '特性: 1) L0 危机干预 0% 幻觉直接短路拦截（自杀/自残/家暴/拘禁）；' +
  '2) E0 现场急救纯动作直通 (CPR/海姆立克/中风)；' +
  '3) E1/E2 深度生活决策 (劳动维权/租房博弈/慢病管理/零成本微习惯)。' +
  '严格返回按行动半衰期压缩的极高密度行动指令。'

const INPUT_SCHEMA_PROPERTIES = {
  query: {
    type: 'string',
    description: '用户当下遭遇的处境、口语化痛点或搜索词（如：“心跳骤停”、“被裁员要签离职单”、“退租扣押金”、“每天失眠怎么调理”）。',
  },
  urgency_filter: {
    type: 'string',
    enum: ['all', 'E0', 'E1', 'E2'],
    description: '时效过滤器：E0(现场秒级黄金抢救)、E1(小时~天级时效维权)、E2(长期预防与微习惯)、all(默认由分发器智能判定)。',
    default: 'all',
  },
  min_evidence_grade: {
    type: 'string',
    enum: ['A', 'B', 'C'],
    description: '最低循证医学/科学证据等级要求：A (随机对照/系统综述/权威法条)、B (前瞻队列/行业规范)、C (专家经验)，默认 B。',
    default: 'B',
  },
  limit: {
    type: 'number',
    description: '最大返回建议条目数（1~5，默认 3，避免上下文过载与注意力稀释）。',
    default: 3,
  },
} as const

const REQUIRED_PARAMS = ['query'] as const

/** 2026 Model Context Protocol (MCP) 标准 Tool 定义 */
export const MCP_DISPATCH_TOOL: McpToolDefinition = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  inputSchema: {
    type: 'object',
    properties: INPUT_SCHEMA_PROPERTIES,
    required: REQUIRED_PARAMS,
  },
} as const

/** OpenAI 标准 Function Calling 规范 */
export const OPENAI_DISPATCH_TOOL: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: INPUT_SCHEMA_PROPERTIES,
      required: REQUIRED_PARAMS,
    },
  },
} as const

/** Claude / Anthropic Tool Use 规范 */
export const CLAUDE_DISPATCH_TOOL: ClaudeToolDefinition = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  input_schema: {
    type: 'object',
    properties: INPUT_SCHEMA_PROPERTIES,
    required: REQUIRED_PARAMS,
  },
} as const
