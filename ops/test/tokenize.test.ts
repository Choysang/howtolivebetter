import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, buildInverted, queryIndex } from '../../kernel/tokenize.ts'

test('tokenize：中文按词切，过滤单字与非词', () => {
  const tokens = tokenize('押金的数额、退还时间必须写进合同')
  assert.ok(tokens.includes('押金'))
  assert.ok(tokens.includes('合同'))
  assert.ok(!tokens.includes('的'))
})

test('tokenize：英文数字保留', () => {
  const tokens = tokenize('走 7000 步，睡够 7 小时')
  assert.ok(tokens.includes('7000'))
  assert.ok(tokens.includes('小时'))
})

test('tokenize：单字查询弹性召回实词，过滤纯虚词', () => {
  assert.deepEqual(tokenize('睡'), ['睡'])
  assert.deepEqual(tokenize('税'), ['税'])
  assert.deepEqual(tokenize('的'), [])
})

test('倒排索引：标题命中权重高于正文', () => {
  const idx = buildInverted([
    { uid: 'AAAAAAAA', title: '押金写进合同', body: '别的内容' },
    { uid: 'BBBBBBBB', title: '别的东西', body: '押金押金押金' },
  ])
  const hits = queryIndex(idx, '押金')
  assert.equal(hits.length, 2)
  assert.equal(hits[0]!.uid, 'AAAAAAAA')
  assert.ok(hits[0]!.score > hits[1]!.score)
})

test('queryIndex：多词查询取并集加权', () => {
  const idx = buildInverted([
    { uid: 'AAAAAAAA', title: '租房押金', body: '' },
    { uid: 'BBBBBBBB', title: '看病挂号', body: '' },
    { uid: 'CCCCCCCC', title: '租房合同', body: '押金' },
  ])
  const hits = queryIndex(idx, '租房 押金')
  assert.equal(hits[0]!.uid, 'AAAAAAAA')
  assert.ok(hits.some((h) => h.uid === 'CCCCCCCC'))
  assert.ok(!hits.some((h) => h.uid === 'BBBBBBBB'))
})

test('queryIndex：空查询返回空', () => {
  const idx = buildInverted([{ uid: 'AAAAAAAA', title: '测试', body: '' }])
  assert.deepEqual(queryIndex(idx, ''), [])
})
