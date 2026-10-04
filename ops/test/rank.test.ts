import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankForStage, topPerChapter, scoreItem } from '../../kernel/rank.ts'
import type { Item, RankConfig, StageId } from '../../contracts/kb.ts'
import { forAll, genItem, pick, mulberry32 } from './helpers.ts'

const CFG: RankConfig = {
  benefit: { 大: 30, 中: 20, 小: 10 },
  evidence: { A: 8, B: 4, C: 0 },
  stageBoost: { core: 15, related: 6 },
  penalty: { moneyHigh: -6, moneyLow: -2, timeHigh: -3, willpowerYes: -2 },
  perChapterCap: 4,
}

const STAGE: StageId = 'early'

test('性质：证据等级越高，得分不降', () => {
  forAll(genItem, (item) => {
    const a = scoreItem({ ...item, source: { ...item.source, evidenceBase: 'A', evidence: 'A' } }, STAGE, CFG)
    const b = scoreItem({ ...item, source: { ...item.source, evidenceBase: 'B', evidence: 'B' } }, STAGE, CFG)
    const c = scoreItem({ ...item, source: { ...item.source, evidenceBase: 'C', evidence: 'C' } }, STAGE, CFG)
    assert.ok(a.score >= b.score, `A(${a.score}) 应 ≥ B(${b.score})`)
    assert.ok(b.score >= c.score, `B(${b.score}) 应 ≥ C(${c.score})`)
  })
})

test('性质：sensitive 与待核实条目不入榜', () => {
  forAll(genItem, (item) => {
    const items = [item]
    const ranked = rankForStage(items, STAGE, CFG)
    if (item.overlay.sensitive || item.source.flags.unverified) {
      assert.equal(ranked.length, 0)
    } else if (item.derived.stageTiers[STAGE]) {
      assert.equal(ranked.length, 1)
    }
  })
})

test('性质：核心加成高于相关', () => {
  forAll(genItem, (item) => {
    if (!item.derived.stageTiers[STAGE]) return
    const core = scoreItem({ ...item, derived: { ...item.derived, stageTiers: { [STAGE]: 'core' } } }, STAGE, CFG)
    const rel = scoreItem({ ...item, derived: { ...item.derived, stageTiers: { [STAGE]: 'related' } } }, STAGE, CFG)
    assert.ok(core.score > rel.score)
  })
})

test('性质：每章不超过上限', () => {
  const r = mulberry32(42)
  const items: Item[] = Array.from({ length: 120 }, () => genItem(r))
  for (const it of items) it.derived.stageTiers = { [STAGE]: pick(r, ['core', 'related'] as const) }
  const ranked = rankForChapterUncapped(items)
  const capped = topPerChapter(ranked, items, 4)
  const perChapter = new Map<number, number>()
  const byUid = new Map(items.map((i) => [i.uid, i]))
  for (const e of capped) {
    const n = byUid.get(e.uid)!.source.chapter
    perChapter.set(n, (perChapter.get(n) ?? 0) + 1)
  }
  for (const [n, count] of perChapter) assert.ok(count <= 4, `第${n}章 ${count} 条超上限`)
  assert.ok(capped.length <= ranked.length)
})

function rankForChapterUncapped(items: Item[]) {
  return rankForStage(items, STAGE, CFG)
}

test('排序降序且稳定（同分按 uid）', () => {
  const r = mulberry32(7)
  const items = Array.from({ length: 60 }, () => genItem(r))
  for (const it of items) it.derived.stageTiers = { [STAGE]: 'core' }
  const ranked = rankForStage(items, STAGE, CFG)
  for (let i = 1; i < ranked.length; i++) {
    const prev = ranked[i - 1]!
    const cur = ranked[i]!
    assert.ok(prev.score > cur.score || (prev.score === cur.score && prev.uid <= cur.uid))
  }
})
