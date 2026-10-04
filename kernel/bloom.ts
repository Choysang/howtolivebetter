/**
 * kernel/bloom.ts
 * 纯函数：布鲁姆认知跃迁量化方程（CBI）与心智位阶推演（零 I/O，≤ 60 行/函数）
 */
import type {
  UserCognitiveSnapshot,
  BloomCalculationResult,
  BloomDimensionScore,
  BloomLevel,
} from '../contracts/bloom.ts'

interface DimensionConfig {
  level: BloomLevel
  name: string
  verb: string
  weight: number
  halfSat: number
  getCount: (s: UserCognitiveSnapshot) => number
}

const DIMENSION_CONFIGS: DimensionConfig[] = [
  { level: 1, name: '记忆 (Remember)', verb: '标记已读', weight: 10, halfSat: 20, getCount: (s) => s.readCount },
  { level: 2, name: '理解 (Understand)', verb: '思维透镜', weight: 15, halfSat: 6, getCount: (s) => s.lensExplorations },
  { level: 3, name: '应用 (Apply)', verb: '习惯打卡', weight: 20, halfSat: 10, getCount: (s) => s.habitCheckinCount },
  { level: 4, name: '分析 (Analyze)', verb: '处境体检', weight: 20, halfSat: 3, getCount: (s) => s.checkupCount },
  { level: 5, name: '评价 (Evaluate)', verb: '辩证审判', weight: 15, halfSat: 3, getCount: (s) => s.dialecticEvaluations },
  { level: 6, name: '创造 (Create)', verb: '生活立宪', weight: 20, halfSat: 4, getCount: (s) => s.constitutionArticles },
]

/** 双曲饱和缓释函数：确保单向刷量无法突破该维度的加权天花板 */
export function calculateSaturation(count: number, halfSat: number): number {
  if (count <= 0 || halfSat <= 0) return 0
  return count / (count + halfSat)
}

/** 阶段位阶与称号映射纯函数 */
export function determineBloomStage(score: number): { stage: number; title: string; summary: string } {
  if (score < 15) {
    return { stage: 0, title: '直觉探索者', summary: '以直觉面对纷繁世界，正迈出积累首批循证认知样本的第一步。' }
  }
  if (score < 35) {
    return { stage: 1, title: '循证知行者', summary: '告别道听途说，依托循证证据等级与习惯保底地板展开知行合一。' }
  }
  if (score < 55) {
    return { stage: 2, title: '辩证自省者', summary: '穿透单一叙事，能熟练为对立观点建立钢人论据与失效边界。' }
  }
  if (score < 75) {
    return { stage: 3, title: '抗脆弱策士', summary: '在生活不确定性与意外冲击中设计弹性安全边际与自适应复原力。' }
  }
  return { stage: 4, title: '自主立法官', summary: '向内立法，完成从他人建议到个体生活宪法的自主跃迁。' }
}

/** 形式化计算布鲁姆认知跃迁指数 B(t) */
export function calculateCBI(snapshot: UserCognitiveSnapshot): BloomCalculationResult {
  const dimensions: BloomDimensionScore[] = DIMENSION_CONFIGS.map((cfg) => {
    const rawCount = Math.max(0, cfg.getCount(snapshot))
    const saturationRatio = calculateSaturation(rawCount, cfg.halfSat)
    const effectiveScore = cfg.weight * saturationRatio
    return {
      level: cfg.level,
      name: cfg.name,
      verb: cfg.verb,
      rawCount,
      saturationRatio: Number(saturationRatio.toFixed(4)),
      weight: cfg.weight,
      effectiveScore: Number(effectiveScore.toFixed(2)),
    }
  })

  const rawTotal = dimensions.reduce((acc, dim) => acc + dim.effectiveScore, 0)
  const totalScore = Math.min(100, Math.round(rawTotal))
  const { stage, title, summary } = determineBloomStage(totalScore)

  return {
    totalScore,
    stage,
    title,
    summary,
    dimensions,
  }
}
