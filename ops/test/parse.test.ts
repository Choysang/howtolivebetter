import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseChapter, ParseError } from '../../backend/pipeline/parse.ts'

const BOOK = join(import.meta.dirname, '..', '..', 'contracts', 'fixtures', 'book')

function parseAll(): ReturnType<typeof parseChapter>[] {
  return readdirSync(BOOK)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseChapter(f, readFileSync(join(BOOK, f), 'utf8')))
}

test('fixtures 全量解析：3 章 21 条', () => {
  const chapters = parseAll()
  assert.equal(chapters.length, 3)
  assert.equal(chapters[0]!.title, '演示：不要早死')
  assert.equal(chapters.reduce((s, c) => s + c.items.length, 0), 21)
})

test('章号/条号/章名与文件一致', () => {
  const chapters = parseAll()
  assert.deepEqual(chapters.map((c) => c.n), [1, 2, 3])
  for (const c of chapters) c.items.forEach((it, i) => assert.equal(it.index, i + 1))
})

test('成本标签解析', () => {
  const chapters = parseAll()
  const it = chapters[0]!.items[0]!
  assert.deepEqual(it.tags, { money: '0', time: '少', willpower: '些', benefit: '大', caliber: '死亡率' })
})

test('证据等级原文与基准（含带后缀变体）', () => {
  const chapters = parseAll()
  const disputedSalt = chapters[1]!.items.find((i) => i.title.includes('低钠盐'))!
  assert.equal(disputedSalt.evidence, 'A（争议）')
  assert.equal(disputedSalt.evidenceBase, 'A')
  assert.equal(disputedSalt.flags.disputed, true)
})

test('待核实标记', () => {
  const chapters = parseAll()
  const smoke = chapters[0]!.items[1]!
  assert.equal(smoke.flags.unverified, true)
  const fund = chapters[1]!.items.find((i) => i.title.includes('定投'))!
  assert.equal(fund.flags.unverified, true)
})

test('备注字段完整保留（含章尾 ## 小节不吞条目）', () => {
  const chapters = parseAll()
  const last = chapters[2]!.items.at(-1)!
  assert.equal(last.title, '水电表读数拍照留证')
  assert.equal(last.note, '墙面地面也拍')
})

test('导语提取', () => {
  const chapters = parseAll()
  assert.ok(chapters[0]!.intro.startsWith('这一节演示解析格式'))
})

test('严格模式：未知字段报错带行号', () => {
  const bad = '# 1. 测试\n\n### 1. 标题\n<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->\n- 未知字段：x\n'
  assert.throws(() => parseChapter('bad.md', bad), /未知字段/)
})

test('严格模式：缺成本标签注释报错', () => {
  const bad = '# 1. 测试\n\n### 1. 标题\n- 成本：x\n'
  assert.throws(() => parseChapter('bad.md', bad), /成本标签/)
})

test('严格模式：缺字段报错', () => {
  const bad = '# 1. 测试\n\n### 1. 标题\n<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->\n- 成本：x\n'
  assert.throws(() => parseChapter('bad.md', bad), /缺字段/)
})

test('严格模式：证据等级非法', () => {
  const bad = [
    '# 1. 测试', '', '### 1. 标题',
    '<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->',
    '- 成本：x', '- 说人话：y', '- 收益：z', '- 证据等级：D', '- 来源：s', '- 备注：n', '',
  ].join('\n')
  assert.throws(() => parseChapter('bad.md', bad), /证据等级/)
})

test('严格模式：条号不连续报错', () => {
  const bad = [
    '# 1. 测试', '', '### 1. 标题',
    '<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->',
    '- 成本：x', '- 说人话：y', '- 收益：z', '- 证据等级：A', '- 来源：s', '- 备注：n', '',
    '### 3. 标题二',
    '<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->',
    '- 成本：x', '- 说人话：y', '- 收益：z', '- 证据等级：A', '- 来源：s', '- 备注：n', '',
  ].join('\n')
  assert.throws(() => parseChapter('bad.md', bad), /条号不连续/)
})
