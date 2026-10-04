import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MCP_DISPATCH_TOOL,
  OPENAI_DISPATCH_TOOL,
  CLAUDE_DISPATCH_TOOL,
} from '../../contracts/agent.ts'
import {
  estimateTokens,
  resolveHalfLifeTier,
  compressActionText,
  formatCostVector,
  filterAndRankItems,
  formatAgentContext,
} from '../../kernel/agent.ts'
import type { RouterDecision, CrisisDecision, RescueDecision, DeepTrackDecision } from '../../contracts/router.ts'
import type { LiteItem } from '../../contracts/kb.ts'

test('MCP Tool Definition 形式化规范严格合规', () => {
  assert.equal(MCP_DISPATCH_TOOL.name, 'dispatch_life_guide')
  assert.ok(MCP_DISPATCH_TOOL.description.includes('高性价比人生指南'))
  assert.equal(MCP_DISPATCH_TOOL.inputSchema.type, 'object')
  assert.ok(MCP_DISPATCH_TOOL.inputSchema.required.includes('query'))

  const props = MCP_DISPATCH_TOOL.inputSchema.properties
  assert.ok(props.query, '必须包含 query 参数')
  assert.ok(props.urgency_filter, '必须包含 urgency_filter 参数')
  assert.ok(props.min_evidence_grade, '必须包含 min_evidence_grade 参数')
  assert.deepEqual(props.urgency_filter.enum, ['all', 'E0', 'E1', 'E2'])
  assert.deepEqual(props.min_evidence_grade.enum, ['A', 'B', 'C'])
})

test('OpenAI / Claude Function Calling Schema 规范严格对齐', () => {
  assert.equal(OPENAI_DISPATCH_TOOL.type, 'function')
  assert.equal(OPENAI_DISPATCH_TOOL.function.name, 'dispatch_life_guide')
  assert.deepEqual(
    OPENAI_DISPATCH_TOOL.function.parameters.required,
    ['query']
  )

  assert.equal(CLAUDE_DISPATCH_TOOL.name, 'dispatch_life_guide')
  assert.equal(CLAUDE_DISPATCH_TOOL.input_schema.type, 'object')
  assert.deepEqual(
    CLAUDE_DISPATCH_TOOL.input_schema.required,
    ['query']
  )
})

test('行动半衰期推演：E0 秒级、E1 小时级、E2 长期微习惯', () => {
  assert.equal(resolveHalfLifeTier('E0'), 'T_SECONDS')
  assert.equal(resolveHalfLifeTier('E1'), 'T_HOURS')
  assert.equal(resolveHalfLifeTier('E2'), 'T_LONGTERM')
})

test('高密度动作指令压缩：剥离废话并实施长度截断防膨胀', () => {
  const item: LiteItem = {
    uid: 'TEST01',
    chapter: 13,
    index: 1,
    title: '心肺复苏按压',
    plain: '说人话：用力按压两乳头连线中点，深度5到6厘米，每分钟100到120次。注意不要随意停顿。',
    benefit: '维持大脑供血',
    evidence: 'A (AHA 2020)',
    evidenceBase: 'A',
    tags: { money: '0', time: '少', willpower: '是', benefit: '大', caliber: '死亡率' },
    disputed: false,
    unverified: false,
    sensitive: false,
    always: false,
  }

  const e0Compressed = compressActionText(item, 'E0')
  assert.ok(!e0Compressed.startsWith('说人话：'), '必须剥离“说人话”等冗余前缀')
  assert.ok(e0Compressed.length <= 45, 'E0 急救动作必须在 45 字符以内')

  const cost = formatCostVector(item)
  assert.equal(cost, '钱0/时少/毅是', '资源三元组必须为紧凑格式')
})

test('L0 危机干预 Agent 响应：0% 幻觉与零动作输出，强制热线', () => {
  const crisis: CrisisDecision = {
    type: 'crisis',
    matchedTrigger: '自杀',
    template: 'crisis_static_card',
    hotlines: [
      { name: '急救电话', number: '120', desc: '生命危急' },
      { name: '心理援助', number: '12356', desc: '免费心理危机' },
    ],
  }

  const payload = formatAgentContext(crisis)
  assert.equal(payload.decisionType, 'crisis')
  assert.equal(payload.actions.length, 0, '危机通道绝对不可返回常规动作干扰')
  assert.ok(payload.compactPromptContext.includes('[L0-CRISIS-INTERCEPT]'))
  assert.ok(payload.compactPromptContext.includes('120'))
  assert.ok(payload.compactPromptContext.includes('12356'))
  assert.ok(payload.metrics.estimatedTokens < 120, '危机上下文必须极简高密')
})

test('E0 黄金急救与 Deep-Track 响应：极高密度压缩与 Token 节约证明', () => {
  const mockItems: LiteItem[] = [
    {
      uid: 'CPR001',
      chapter: 13,
      index: 1,
      title: '成人心肺复苏CPR',
      plain: '两乳头连线中点胸外按压5-6cm，频率100-120次/分',
      evidence: 'A',
      evidenceBase: 'A',
      tags: { money: '0', time: '少', willpower: '是', benefit: '大', caliber: '死亡率' },
      disputed: false,
      unverified: false,
      sensitive: false,
      always: false,
    },
    {
      uid: 'HEM002',
      chapter: 13,
      index: 2,
      title: '海姆立克急救法',
      plain: '肚脐上方两横指处向后上方冲击腹部',
      evidence: 'A',
      evidenceBase: 'A',
      tags: { money: '0', time: '少', willpower: '是', benefit: '大', caliber: '死亡率' },
      disputed: false,
      unverified: false,
      sensitive: false,
      always: false,
    },
  ]

  const rescue: RescueDecision = {
    type: 'rescue',
    matchedTrigger: '倒地',
    items: mockItems,
    banner: '急救现场',
    template: 'rescue_card',
  }

  const payload = formatAgentContext(rescue)
  assert.equal(payload.decisionType, 'rescue')
  assert.equal(payload.urgency, 'E0')
  assert.equal(payload.actions.length, 2)
  assert.equal(payload.actions[0].halfLife, 'T_SECONDS')
  assert.ok(payload.compactPromptContext.includes('[E0-GOLDEN-RESCUE: 倒地]'))

  // 压缩比验证
  assert.ok(parseInt(payload.metrics.compressionRatio) >= 70, 'Token 压缩比必须超过 70%')

  // Deep-Track 验证
  const deep: DeepTrackDecision = {
    type: 'deep_track',
    domainId: 'career',
    scenarioId: 'laid-off',
    intent: 'instant',
    urgency: 'E1',
    matchedQuery: '被裁员',
  }

  const deepPayload = formatAgentContext(deep, mockItems, { min_evidence_grade: 'A', limit: 2 })
  assert.equal(deepPayload.decisionType, 'deep_track')
  assert.equal(deepPayload.scenarioId, 'laid-off')
  assert.equal(deepPayload.scenarioUrl, '/scenario/laid-off/')
  assert.equal(deepPayload.actions[0].halfLife, 'T_HOURS')
})
