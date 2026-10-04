/**
 * kernel/rank —— 阶段精华排序（纯函数）。
 * 必须成立的性质（属性测试覆盖）：
 *   1) 证据等级越高（A>B>C），得分不降；
 *   2) sensitive 与待核实条目不入榜；
 *   3) 每章不超过上限条数。
 */
import type { Item, RankedEntry, RankConfig, StageId } from '../contracts/kb.ts'

export function scoreItem(item: Item, stageId: StageId, cfg: RankConfig): RankedEntry {
  const t = item.source.tags
  const tier = item.derived.stageTiers[stageId]
  const benefit = cfg.benefit[t.benefit]
  const evidence = cfg.evidence[item.source.evidenceBase]
  const stage = tier === 'core' ? cfg.stageBoost.core : cfg.stageBoost.related
  const penalty =
    (t.money === '多' ? cfg.penalty.moneyHigh : t.money === '少' ? cfg.penalty.moneyLow : 0) +
    (t.time === '多' ? cfg.penalty.timeHigh : 0) +
    (t.willpower === '是' ? cfg.penalty.willpowerYes : 0)
  return {
    uid: item.uid,
    score: benefit + evidence + stage + penalty,
    breakdown: { benefit, evidence, stage, penalty },
  }
}

export function rankForStage(items: Item[], stageId: StageId, cfg: RankConfig): RankedEntry[] {
  const eligible = items.filter(
    (it) =>
      it.derived.stageTiers[stageId] !== undefined &&
      !it.overlay.sensitive &&
      !it.source.flags.unverified,
  )
  return eligible
    .map((it) => scoreItem(it, stageId, cfg))
    .sort((a, b) => b.score - a.score || (a.uid < b.uid ? -1 : 1))
}

/** 每章最多 cap 条；输入须已按分数降序。 */
export function topPerChapter(
  ranked: RankedEntry[],
  items: Item[],
  cap: number,
): RankedEntry[] {
  const byUid = new Map(items.map((it) => [it.uid, it]))
  const perChapter = new Map<number, number>()
  const out: RankedEntry[] = []
  for (const entry of ranked) {
    const it = byUid.get(entry.uid)
    if (!it) continue
    const n = it.source.chapter
    const used = perChapter.get(n) ?? 0
    if (used >= cap) continue
    perChapter.set(n, used + 1)
    out.push(entry)
  }
  return out
}
