import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evalPredicate, matchSituation, describePredicate } from '../../kernel/match.ts'
import type { FactValues } from '../../contracts/facts.ts'
import type { Predicate } from '../../contracts/predicate.ts'
import { forAll, genRule } from './helpers.ts'

test('原子谓词：命中/不命中', () => {
  const p: Predicate = { fact: 'housing', in: ['rent', 'dorm'] }
  assert.equal(evalPredicate(p, { housing: 'rent' }), true)
  assert.equal(evalPredicate(p, { housing: 'own' }), false)
})

test('uncertain 与未回答：不折叠（视为通过）', () => {
  const p: Predicate = { fact: 'housing', in: ['rent'] }
  assert.equal(evalPredicate(p, { housing: 'uncertain' }), true)
  assert.equal(evalPredicate(p, {}), true)
})

test('组合：all / any / not', () => {
  const facts: FactValues = { housing: 'rent', money_buffer: 'none' }
  assert.equal(evalPredicate({ all: [{ fact: 'housing', in: ['rent'] }, { fact: 'money_buffer', in: ['none'] }] }, facts), true)
  assert.equal(evalPredicate({ all: [{ fact: 'housing', in: ['own'] }, { fact: 'money_buffer', in: ['none'] }] }, facts), false)
  assert.equal(evalPredicate({ any: [{ fact: 'housing', in: ['own'] }, { fact: 'money_buffer', in: ['none'] }] }, facts), true)
  assert.equal(evalPredicate({ not: { fact: 'housing', in: ['own'] } }, facts), true)
})

test('性质：输出是输入的划分（每条规则恰落一桶，只折叠不删除）', () => {
  forAll(genRule, (rule) => {
    const facts: FactValues = { housing: 'rent', money_buffer: 'none', health_chronic: 'no', family_elders: 'no', age: '23to35' }
    const out = matchSituation(facts, [rule])
    assert.equal(out.length, 1)
    const tiers = ['core', 'related', 'collapsed', 'fallback']
    assert.ok(tiers.includes(out[0]!.tier))
    if (rule.always) assert.equal(out[0]!.tier, 'fallback')
  })
})

test('性质：always 必在兜底桶；无谓词为 related；谓词假为 collapsed', () => {
  const rules = [
    { uid: 'AAAAAAAA', axis: 'money' as const, always: true },
    { uid: 'BBBBBBBB', axis: 'time' as const, always: false },
    { uid: 'CCCCCCCC', axis: 'life' as const, always: false, pred: { fact: 'housing' as const, in: ['own'] } },
  ]
  const out = matchSituation({ housing: 'rent' }, rules)
  assert.equal(out.find((o) => o.uid === 'AAAAAAAA')!.tier, 'fallback')
  assert.equal(out.find((o) => o.uid === 'BBBBBBBB')!.tier, 'related')
  assert.equal(out.find((o) => o.uid === 'CCCCCCCC')!.tier, 'collapsed')
  const out2 = matchSituation({ housing: 'own' }, rules)
  assert.equal(out2.find((o) => o.uid === 'CCCCCCCC')!.tier, 'core')
})

test('describePredicate 可读', () => {
  const s = describePredicate({ any: [{ fact: 'housing', in: ['rent', 'dorm'] }, { fact: 'money_buffer', in: ['none'] }] })
  assert.ok(s.includes('住处') && s.includes('应急资金'))
  assert.ok(s.includes('或'))
})
