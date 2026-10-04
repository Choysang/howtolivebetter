/** 编辑层：排序公式（/about/method/ 页由此生成；权重公开）。 */
import type { RankConfig } from '../../contracts/kb.ts'

export const rankConfig: RankConfig = {
  benefit: { 大: 30, 中: 20, 小: 10 },
  evidence: { A: 8, B: 4, C: 0 },
  stageBoost: { core: 15, related: 6 },
  penalty: { moneyHigh: -6, moneyLow: -2, timeHigh: -3, willpowerYes: -2 },
  perChapterCap: 4,
}
