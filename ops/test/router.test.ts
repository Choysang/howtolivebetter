import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseYamlSubset } from '../../backend/pipeline/yaml.ts'
import { dispatchQuery, matchFirstKeyword, detectIntent } from '../../kernel/dispatcher.ts'
import { PHENOMENON_CHIPS, type RouterConfig, type CrisisDecision, type RescueDecision, type DeepTrackDecision } from '../../contracts/router.ts'
import type { LiteItem } from '../../contracts/kb.ts'

function loadConfig(): RouterConfig {
  const raw = fs.readFileSync('router_config.yaml', 'utf8')
  return parseYamlSubset(raw) as unknown as RouterConfig
}

test('定理证明：全书 34 节必须被 12 个生命大域严格全射且互斥单射覆盖', () => {
  const config = loadConfig()
  assert.equal(config.domains.length, 12, '必须恰好有 12 个生命大域')

  const coveredChapters: number[] = []
  const domainChapterSets = new Map<string, Set<number>>()

  for (const domain of config.domains) {
    const s = new Set<number>()
    for (const ch of domain.chapters) {
      assert.ok(ch >= 1 && ch <= 34, `域 ${domain.id} 包含了越界章号 ${ch}`)
      assert.ok(!s.has(ch), `域 ${domain.id} 内部重复列出了章号 ${ch}`)
      s.add(ch)
      coveredChapters.push(ch)
    }
    domainChapterSets.set(domain.id, s)
  }

  // 1. 单射性验证：两两域之间交集为空
  const domainList = config.domains
  for (let i = 0; i < domainList.length; i++) {
    for (let j = i + 1; j < domainList.length; j++) {
      const d1 = domainList[i]
      const d2 = domainList[j]
      const s1 = domainChapterSets.get(d1.id)!
      const s2 = domainChapterSets.get(d2.id)!
      for (const ch of s1) {
        assert.ok(!s2.has(ch), `章号 ${ch} 在域 ${d1.id} 和 ${d2.id} 之间重叠，破坏单射性`)
      }
    }
  }

  // 2. 全射性验证：总数恰好为 34，且集合与 1..34 严格恒等
  assert.equal(coveredChapters.length, 34, '所有域覆盖的章节总数必须恰好为 34')
  const coveredSet = new Set(coveredChapters)
  assert.equal(coveredSet.size, 34, '去重章节总数必须为 34')
  for (let ch = 1; ch <= 34; ch++) {
    assert.ok(coveredSet.has(ch), `第 ${ch} 节未归属于任何域 (孤儿章)`)
  }
})

test('L0 危机干预短路测试：0% 幻觉，100% 优先返回法定热线', () => {
  const config = loadConfig()

  const sensitiveInputs = [
    '我想死但怕疼',
    '被家暴被软禁在房间里了',
    '有人割腕自残',
    '被黑中介非法拘禁了怎么办',
    '跳楼念头',
  ]

  for (const input of sensitiveInputs) {
    const decision = dispatchQuery(input, config)
    assert.equal(decision.type, 'crisis', `输入「${input}」未能触发危机短路`)
    const crisis = decision as CrisisDecision
    assert.equal(crisis.template, 'crisis_static_card')
    assert.ok(crisis.hotlines.length >= 4)
    // 必须包含 120, 110, 12356
    const numbers = crisis.hotlines.map((h) => h.number)
    assert.ok(numbers.includes('120'), '危机热线必须包含 120')
    assert.ok(numbers.includes('110'), '危机热线必须包含 110')
    assert.ok(numbers.includes('12356'), '危机热线必须包含 12356')
  }
})

test('E0 现场急救直通测试：返回条数严格 <= 3，仅输出核心操作', () => {
  const config = loadConfig()
  const mockItems: LiteItem[] = [
    { uid: 'A1', chapter: 13, index: 1, title: '倒地无呼吸立即胸外按压', plain: '用力按压胸口两乳头连线中点', benefit: '', evidence: 'A', evidenceBase: 'A', tags: {} as any, disputed: false, unverified: false, sensitive: false, always: false },
    { uid: 'A2', chapter: 13, index: 2, title: '老人摔倒莫乱扶', plain: '先喊人判断意识', benefit: '', evidence: 'A', evidenceBase: 'A', tags: {} as any, disputed: false, unverified: false, sensitive: false, always: false },
    { uid: 'A3', chapter: 13, index: 3, title: '突发嘴歪抬手不能打120', plain: '识别卒中黄金时间', benefit: '', evidence: 'A', evidenceBase: 'A', tags: {} as any, disputed: false, unverified: false, sensitive: false, always: false },
    { uid: 'A4', chapter: 13, index: 4, title: '第四条急救备用', plain: '备用', benefit: '', evidence: 'B', evidenceBase: 'B', tags: {} as any, disputed: false, unverified: false, sensitive: false, always: false },
  ]

  const rescueInputs = [
    '老人突然倒地没呼吸了',
    '吃东西卡住噎住了海姆立克',
    '动脉大出血止血',
  ]

  for (const input of rescueInputs) {
    const decision = dispatchQuery(input, config, mockItems)
    assert.equal(decision.type, 'rescue', `输入「${input}」未能触发现场急救`)
    const rescue = decision as RescueDecision
    assert.equal(rescue.template, 'rescue_card')
    assert.ok(rescue.items.length <= 3, '急救条目必须 <= 3 条以防认知过载')
    assert.equal(rescue.items.length, 3)
    assert.equal(rescue.items[0].index, 1)
  }
})

test('Deep-Track 意图识别与情境下钻测试：规范化 kebab-case ID', () => {
  const config = loadConfig()

  // 1. 现场处置意图 instant
  const d1 = dispatchQuery('公司裁员HR叫我过去现在怎么办', config) as DeepTrackDecision
  assert.equal(d1.type, 'deep_track')
  assert.equal(d1.intent, 'instant')
  assert.equal(d1.domainId, 'career')
  assert.equal(d1.scenarioId, 'laid-off', '情境 ID 必须规范化为 kebab-case')

  // 2. 事后维权意图 remedy
  const d2 = dispatchQuery('租房退租押金被扣怎么维权索赔起诉', config) as DeepTrackDecision
  assert.equal(d2.type, 'deep_track')
  assert.equal(d2.intent, 'remedy')
  assert.equal(d2.domainId, 'housing')
  assert.equal(d2.scenarioId, 'rent-deposit')

  // 3. 预防与常备意图 prevent
  const d3 = dispatchQuery('如何预防中暑夏天常备什么', config) as DeepTrackDecision
  assert.equal(d3.type, 'deep_track')
  assert.equal(d3.intent, 'prevent')
  assert.equal(d3.domainId, 'emergency')
  assert.equal(d3.scenarioId, 'heatstroke')
})

test('现象级口语芯片 (Phenomenon Chips)：零阻抗直达验证', () => {
  const config = loadConfig()
  assert.equal(PHENOMENON_CHIPS.length, 10, '预置现象芯片必须覆盖 10 大核心生活困境')

  for (const chip of PHENOMENON_CHIPS) {
    const decision = dispatchQuery(chip.query, config)
    assert.ok(decision.type === 'rescue' || decision.type === 'deep_track', `芯片 ${chip.label} 未能产出有效决策`)
    if (decision.type === 'deep_track') {
      assert.equal(decision.domainId, chip.domainId, `芯片 ${chip.label} 域归属错误`)
      if (chip.scenarioId) {
        assert.equal(decision.scenarioId, chip.scenarioId, `芯片 ${chip.label} 场景下钻错误`)
      }
    }
  }
})
