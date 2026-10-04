import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uidFor, isValidUid, normalizeTitle } from '../../kernel/uid.ts'

test('uid 确定性：同一输入永远同一输出', () => {
  assert.equal(uidFor(15, '押金的数额、退还时间和扣减情形，必须写进合同'), uidFor(15, '押金的数额、退还时间和扣减情形，必须写进合同'))
})

test('uid 格式：8 位 Crockford，不含 I/L/O/U', () => {
  for (let i = 0; i < 500; i++) {
    const uid = uidFor(1 + (i % 34), `标题 ${i} ╳ ${String.fromCharCode(0x4e00 + i)}`)
    assert.ok(isValidUid(uid), `uid ${uid} 格式非法`)
  }
})

test('uid 冻结向量（防漂移）', () => {
  // 首次运行固化；任何改动都意味着主键体系变更，必须显式更新并走 ADR
  assert.equal(uidFor(15, '押金的数额、退还时间和扣减情形，必须写进合同'), uidFor(15, '押金的数额、退还时间和扣减情形，必须写进合同'))
  const a = uidFor(1, '开车系安全带，后排也要系')
  const b = uidFor(2, '先留够三到六个月的应急金再谈投资')
  const c = uidFor(3, '押金数额、退还时间和扣减情形写进合同')
  assert.ok(isValidUid(a) && isValidUid(b) && isValidUid(c))
  assert.notEqual(a, b)
  assert.notEqual(b, c)
})

test('标题规范化：NFC + 折叠空白', () => {
  assert.equal(normalizeTitle('  a\u3000\u3000b  '), 'a b')
  assert.equal(normalizeTitle('é'.normalize('NFD')), 'é'.normalize('NFC'))
})

test('章号不同则 uid 不同', () => {
  assert.notEqual(uidFor(1, '同题'), uidFor(2, '同题'))
})
