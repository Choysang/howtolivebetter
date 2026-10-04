/**
 * kernel/radar.ts
 * 纯函数：布鲁姆认知雷达极坐标投影、香农熵均衡度与微阻抗跃迁指引（零 I/O，≤ 60 行/函数）
 */
import type { BloomCalculationResult } from '../contracts/bloom.ts'
import type {
  RadarPoint,
  RadarGeometryConfig,
  CognitiveBalanceMetrics,
  NextStepQuantumRecommendation,
} from '../contracts/radar.ts'

// 各维度心智活化能摩擦力（由易到难标定）
const ACTIVATION_FRICTION: readonly number[] = [1.0, 2.0, 1.5, 4.0, 3.0, 5.0]
const TARGET_URLS: readonly string[] = [
  '/stage/early/',
  '/stage/mid/',
  '/checkin/',
  '/checkup/',
  '/search/',
  '/tools/constitution/',
]

/** 计算六维雷达点集（顺时针极坐标到笛卡尔投影，L6 居于正顶 12:00 方向） */
export function calculateRadarPoints(
  result: BloomCalculationResult,
  cfg: RadarGeometryConfig
): { points: RadarPoint[]; polygonString: string } {
  const count = result.dimensions.length || 6
  const points: RadarPoint[] = result.dimensions.map((dim, idx) => {
    // 顺时针自顶向下时钟拓扑：L1(02:00) -> L2(04:00) -> L3(06:00) -> L4(08:00) -> L5(10:00) -> L6(12:00正天顶王冠)
    const angle = -Math.PI / 2 + ((idx + 1) * 2 * Math.PI) / count
    const r = cfg.radius * Math.max(0.06, Math.min(1.0, dim.saturationRatio))
    return {
      x: Number((cfg.cx + r * Math.cos(angle)).toFixed(2)),
      y: Number((cfg.cy + r * Math.sin(angle)).toFixed(2)),
      level: dim.level,
      dimensionName: dim.name,
      verb: dim.verb,
      scoreRatio: dim.saturationRatio,
    }
  })

  const polygonString = points.map((p) => `${p.x},${p.y}`).join(' ')
  return { points, polygonString }
}

/** 形式化计算认知多边形面积充盈率与香农均衡熵 */
export function calculateCognitiveBalanceMetrics(
  result: BloomCalculationResult
): CognitiveBalanceMetrics {
  const dims = result.dimensions
  const n = dims.length
  if (n === 0) return { areaRatio: 0, shannonEntropy: 0, hasCognitiveHemiplegia: true }

  // 1. 鞋带公式多边形面积充盈率: sum(s_i * s_{i+1}) / 6
  let crossSum = 0
  for (let i = 0; i < n; i++) {
    const s1 = dims[i].saturationRatio
    const s2 = dims[(i + 1) % n].saturationRatio
    crossSum += s1 * s2
  }
  const areaRatio = Number(Math.min(1.0, crossSum / n).toFixed(4))

  // 2. 香农认知均衡熵: H = -sum(p_i * ln(p_i)) / ln(n)
  const eps = 1e-6
  const total = dims.reduce((acc, d) => acc + d.saturationRatio + eps, 0)
  let entropySum = 0
  for (const d of dims) {
    const p = (d.saturationRatio + eps) / total
    entropySum -= p * Math.log(p)
  }
  const maxEntropy = Math.log(n)
  const shannonEntropy = Number(Math.max(0, Math.min(1.0, entropySum / maxEntropy)).toFixed(4))

  return {
    areaRatio,
    shannonEntropy,
    hasCognitiveHemiplegia: shannonEntropy < 0.65 || (areaRatio < 0.1 && result.totalScore > 10),
  }
}

/** 推导下一阶心智位阶跃迁的最低阻抗原子行动指引 */
export function deriveNextStepQuantumGuide(
  result: BloomCalculationResult
): NextStepQuantumRecommendation {
  let bestIdx = 0
  let maxRoi = -1

  for (let i = 0; i < result.dimensions.length; i++) {
    const dim = result.dimensions[i]
    const friction = ACTIVATION_FRICTION[i] || 1.0
    const sat = dim.saturationRatio
    // 边际增益导数: (w / h) * (1 - sat)^2
    const marginalDerivative = (dim.weight * Math.pow(1 - sat, 2)) / 10
    const roi = marginalDerivative / friction

    if (roi > maxRoi) {
      maxRoi = roi
      bestIdx = i
    }
  }

  const bestDim = result.dimensions[bestIdx] || result.dimensions[0]
  const stageThresholds = [15, 35, 55, 75, 100]
  const nextTarget = stageThresholds[Math.min(stageThresholds.length - 1, result.stage)]
  const gap = Math.max(0, nextTarget - result.totalScore)

  return {
    dimensionIndex: bestIdx,
    level: bestDim.level,
    dimensionName: bestDim.name,
    actionVerb: bestDim.verb,
    marginalRoi: Number(maxRoi.toFixed(4)),
    suggestedAction: `以最小认知摩擦执行 1 次「${bestDim.verb}」，释放 +${(maxRoi * 10).toFixed(1)} 跃迁势能`,
    targetUrl: TARGET_URLS[bestIdx] || '/stage/early/',
    scoreGapToNextStage: gap,
  }
}
