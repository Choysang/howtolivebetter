import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseYamlSubset } from '../../backend/pipeline/yaml.ts'

test('YAML 微解析器：基础标量与嵌套对象', () => {
  const sample = `
version: "1.0"
flag: true
count: 42
gate:
  sub:
    enabled: false
`
  const res = parseYamlSubset(sample)
  assert.equal(res.version, '1.0')
  assert.equal(res.flag, true)
  assert.equal(res.count, 42)
  assert.equal((res.gate as any)?.sub?.enabled, false)
})

test('YAML 微解析器：列表与内联流式数组', () => {
  const sample = `
items:
  - "apple"
  - "banana"
chapters: [1, 2, 3]
records:
  - id: "first"
    value: 10
  - id: "second"
    value: 20
`
  const res = parseYamlSubset(sample)
  assert.deepEqual(res.items, ['apple', 'banana'])
  assert.deepEqual(res.chapters, [1, 2, 3])
  const records = res.records as any[]
  assert.equal(records.length, 2)
  assert.equal(records[0].id, 'first')
  assert.equal(records[1].value, 20)
})

test('YAML 微解析器：完整解析真实 router_config.yaml', () => {
  const start = performance.now()
  const raw = fs.readFileSync('router_config.yaml', 'utf8')
  const config = parseYamlSubset(raw) as any
  const duration = performance.now() - start

  assert.equal(config.version, '2026.1')
  assert.equal(config.schema_version, '1.0.0')
  assert.ok(Array.isArray(config.domains))
  assert.equal(config.domains.length, 12)
  assert.ok(Array.isArray(config.scenarios))
  assert.ok(config.scenarios.length >= 8)
  assert.ok(config.gatekeeper.crisis.triggers.length > 5)
  assert.ok(config.gatekeeper.crisis.hotlines.length >= 4)
  // 解析时延断言: 毫秒级完成
  assert.ok(duration < 25, `解析耗时过长: ${duration}ms`)
})
