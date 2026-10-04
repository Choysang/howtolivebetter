/**
 * kernel/resilience.ts
 * 纯函数：斯多葛双相窗口判定、控制二分法计算、复原力潜伏期判定（零 I/O，≤ 60 行/函数）
 */
export type StoicPhase = 'morning' | 'evening' | 'midday'

export interface ResilienceAnalysis {
  totalLoggedDays: number
  longestStreak: number
  maxLatencyDays: number   // 最大复原潜伏期（中断后到下一次再开始的最大天数）
  currentStreak: number
  recoveryScore: number    // 0-100 坚韧复原分（中断后能够重回正轨的能力）
}

/** 根据当前小时计算斯多葛自省窗口 */
export function determineStoicPhase(hour: number): StoicPhase {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 20 || hour < 5) return 'evening'
  return 'midday'
}

/** 计算抗脆弱复原力指标：彻底摒弃脆弱的单纯 Streak，奖励「重返力」 */
export function calculateResilienceLatency(sortedDateStrings: string[]): ResilienceAnalysis {
  if (sortedDateStrings.length === 0) {
    return { totalLoggedDays: 0, longestStreak: 0, maxLatencyDays: 0, currentStreak: 0, recoveryScore: 100 }
  }

  const timestamps = sortedDateStrings.map((d) => new Date(d).getTime()).sort((a, b) => a - b)
  const oneDayMs = 86400000
  let maxLatency = 1
  let curStreak = 1
  let maxStreak = 1
  let totalBreaks = 0

  for (let i = 1; i < timestamps.length; i++) {
    const diffDays = Math.round((timestamps[i] - timestamps[i - 1]) / oneDayMs)
    if (diffDays === 1) {
      curStreak++
      if (curStreak > maxStreak) maxStreak = curStreak
    } else if (diffDays > 1) {
      totalBreaks++
      if (diffDays > maxLatency) maxLatency = diffDays
      curStreak = 1
    }
  }

  const recoveryScore = totalBreaks === 0
    ? 100
    : Math.max(20, Math.round(100 - (maxLatency > 7 ? (maxLatency - 7) * 5 : 0)))

  return {
    totalLoggedDays: timestamps.length,
    longestStreak: maxStreak,
    maxLatencyDays: maxLatency,
    currentStreak: curStreak,
    recoveryScore,
  }
}
