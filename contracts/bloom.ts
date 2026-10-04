/**
 * contracts/bloom.ts
 * 契约：布鲁姆认知跃迁指数（CBI）与端侧主权全息数据包规范（只增不破）。
 * 遵循 erasable TypeScript，禁止 enum，纯数据类型，零外部依赖。
 */
import type { PersonalConstitutionSpec } from './cognitive.ts'

export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface UserCognitiveSnapshot {
  readCount: number              // L1: 记忆已读条目数
  lensExplorations: number       // L2: 理解思维模型透镜数
  habitCheckinCount: number      // L3: 应用微习惯践行次数
  checkupCount: number           // L4: 分析处境体检解构次数
  dialecticEvaluations: number   // L5: 评价辩证审判反省次数
  constitutionArticles: number   // L6: 创造自主立宪条款数
}

export interface BloomDimensionScore {
  level: BloomLevel
  name: string
  verb: string
  rawCount: number
  saturationRatio: number       // 0 ~ 1 饱和度
  weight: number
  effectiveScore: number        // weight * saturationRatio
}

export interface BloomCalculationResult {
  totalScore: number            // 0 ~ 100 综合认知跃迁指数
  stage: number                 // 0 ~ 4 心智进阶阶段
  title: string                 // 尊严称号
  summary: string               // 阶段心智评语
  dimensions: BloomDimensionScore[]
}

export interface SovereignHabitBackupItem {
  uid: string
  title: string
  plain?: string
  streak: number
  addedAt: number
  completedDates: string[]
}

/** 端侧主权全息备份数据契约 */
export interface SovereignBackupData {
  schemaVersion: 1
  exportedAt: string
  appName: 'howtolivebetter'
  readItems: string[]
  favItems: string[]
  habits: SovereignHabitBackupItem[]
  constitution?: PersonalConstitutionSpec
  checkinHistory: Record<string, string> // key: checkin-YYYY-MM-DD -> raw json string
}
