import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENTAL_MODELS, resolveDialectic, filterItemsByMentalModel, getSocraticPrompt } from '../../kernel/cognitive.ts'
import { determineStoicPhase, calculateResilienceLatency } from '../../kernel/resilience.ts'
import { compilePersonalConstitution } from '../../kernel/constitution.ts'
import type { Item } from '../../contracts/kb.ts'

test('cognitive: MENTAL_MODELS 包含全部核心模型与追问', () => {
  assert.ok(MENTAL_MODELS['first-principles'])
  assert.ok(MENTAL_MODELS['inversion'])
  assert.ok(MENTAL_MODELS['dichotomy-of-control'])
  assert.ok(MENTAL_MODELS['first-principles'].coreQuestion.length > 0)
})

test('cognitive: resolveDialectic 与 filterItemsByMentalModel 纯函数推演', () => {
  const dummyItem: Item = {
    uid: 'TEST0001',
    source: {
      chapter: 1, index: 1, title: '测试', cost: '', plain: '', benefit: '',
      evidence: 'A', evidenceBase: 'A', refs: '', note: '',
      tags: { money: '0', time: '小', willpower: '小', benefit: '大', caliber: '死亡率' },
      flags: { disputed: false, unverified: false },
    },
    overlay: {
      dialectic: {
        lenses: ['first-principles', 'inversion'],
        pro: { thesis: '正方立论', rationale: '强理由' },
        con: { thesis: '反方立论', rationale: '强辩驳' },
        boundary: { condition: '极端条件', consequence: '后果', remedy: '兜底' },
        socratic: { level: 'contradiction', prompt: '反思问句' },
      },
    },
    derived: { stageTiers: {}, scenarios: [], xrefs: [] },
  }

  const dialectic = resolveDialectic(dummyItem)
  assert.ok(dialectic)
  assert.equal(dialectic?.pro.thesis, '正方立论')
  assert.equal(getSocraticPrompt(dummyItem)?.prompt, '反思问句')

  const filtered = filterItemsByMentalModel([dummyItem], 'first-principles')
  assert.equal(filtered.length, 1)

  const emptyFilter = filterItemsByMentalModel([dummyItem], 'pareto')
  assert.equal(emptyFilter.length, 0)
})

test('resilience: determineStoicPhase 时间窗口判定', () => {
  assert.equal(determineStoicPhase(7), 'morning')
  assert.equal(determineStoicPhase(14), 'midday')
  assert.equal(determineStoicPhase(22), 'evening')
  assert.equal(determineStoicPhase(2), 'evening')
  assert.equal(determineStoicPhase(4), 'evening')
})

test('resilience: calculateResilienceLatency 抗脆弱复原力推演', () => {
  // 连续连续三天
  const continuous = calculateResilienceLatency(['2026-01-01', '2026-01-02', '2026-01-03'])
  assert.equal(continuous.longestStreak, 3)
  assert.equal(continuous.recoveryScore, 100)

  // 中断 3 天后重返（有韧性复原）
  const brokenAndRecovered = calculateResilienceLatency(['2026-01-01', '2026-01-04'])
  assert.equal(brokenAndRecovered.maxLatencyDays, 3)
  assert.ok(brokenAndRecovered.recoveryScore >= 90)

  // 空日志
  const empty = calculateResilienceLatency([])
  assert.equal(empty.totalLoggedDays, 0)
  assert.equal(empty.recoveryScore, 100)
})

test('constitution: compilePersonalConstitution 端侧编译个人宪法', () => {
  const md = compilePersonalConstitution({
    userName: '张三',
    lastUpdated: '2026-10-03',
    motto: '实事求是，向内观照',
    rules: [
      {
        article: '健康第一底线',
        rationale: '身体是承载认知的唯一物理硬件',
        floorCommitment: '熄灯上床，手机放远，闭目深呼吸10次',
        uids: ['SLEEP001'],
      },
    ],
  })

  assert.ok(md.includes('《个人生活宪法》'))
  assert.ok(md.includes('张三'))
  assert.ok(md.includes('健康第一底线'))
  assert.ok(md.includes('【弹性地板】绝不妥协的 30 秒微动作'))
  assert.ok(md.includes('#SLEEP001'))
})
