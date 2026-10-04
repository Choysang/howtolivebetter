/**
 * contracts/radar.ts
 * 契约：布鲁姆认知演化雷达几何、香农认知均衡度与微阻抗跃迁指引契约（只增不破）。
 * 遵循 erasable TypeScript，禁止 enum，纯数据类型，零外部依赖。
 */
import type { BloomLevel } from './bloom.ts'

export interface RadarPoint {
  x: number
  y: number
  level: BloomLevel
  dimensionName: string
  verb: string
  scoreRatio: number
}

export interface RadarGeometryConfig {
  size: number
  cx: number
  cy: number
  radius: number
}

export interface NextStepQuantumRecommendation {
  dimensionIndex: number
  level: BloomLevel
  dimensionName: string
  actionVerb: string
  marginalRoi: number
  suggestedAction: string
  targetUrl: string
  scoreGapToNextStage: number
}

export interface CognitiveBalanceMetrics {
  /** 雷达围合多边形面积充盈率 (0 ~ 1.0) */
  areaRatio: number
  /** 香农认知均衡熵 (0 ~ 1.0)，趋向 1.0 表示六阶心智发展无偏瘫短板 */
  shannonEntropy: number
  /** 是否存在严重单维偏瘫（如仅刷阅读却从不打卡反思） */
  hasCognitiveHemiplegia: boolean
}
