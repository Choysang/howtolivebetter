/**
 * kernel/awakening.ts
 * 纯函数：认知觉醒物理流场、莫比乌斯坐标计算与状态机判断（零 I/O，≤ 60 行/函数）
 */
import type {
  AwakeningPhase,
  AwakeningTimelineConfig,
  StageAttractorConfig,
} from '../contracts/awakening.ts'
import {
  DEFAULT_AWAKENING_TIMELINE,
  STAGE_ATTRACTORS,
} from '../contracts/awakening.ts'

/** 计算当前动画演化所属时相 */
export function getAwakeningPhase(
  elapsedMs: number,
  timeline: AwakeningTimelineConfig = DEFAULT_AWAKENING_TIMELINE
): AwakeningPhase {
  if (elapsedMs < 0) return 'chaos'
  if (elapsedMs < timeline.chaosDurationMs) {
    return 'chaos'
  }
  const tAttractorEnd = timeline.chaosDurationMs + timeline.attractorDurationMs
  if (elapsedMs < tAttractorEnd) {
    return 'attractors'
  }
  if (elapsedMs < timeline.totalDurationMs) {
    return 'mobius'
  }
  return 'crystallized'
}

/** 计算当前时相的归一化进度 [0.0, 1.0] */
export function getPhaseProgress(
  elapsedMs: number,
  timeline: AwakeningTimelineConfig = DEFAULT_AWAKENING_TIMELINE
): { phase: AwakeningPhase; progress: number; totalProgress: number } {
  const phase = getAwakeningPhase(elapsedMs, timeline)
  const totalProgress = Math.min(1.0, Math.max(0.0, elapsedMs / timeline.totalDurationMs))
  let progress = 0.0

  if (phase === 'chaos') {
    progress = Math.min(1.0, elapsedMs / timeline.chaosDurationMs)
  } else if (phase === 'attractors') {
    const elapsedInPhase = elapsedMs - timeline.chaosDurationMs
    progress = Math.min(1.0, elapsedInPhase / timeline.attractorDurationMs)
  } else if (phase === 'mobius') {
    const elapsedInPhase = elapsedMs - (timeline.chaosDurationMs + timeline.attractorDurationMs)
    progress = Math.min(1.0, elapsedInPhase / timeline.mobiusDurationMs)
  } else {
    progress = 1.0
  }

  return { phase, progress, totalProgress }
}

/** 伯努利双纽线（莫比乌斯平面投影）空间坐标推演 */
export function calculateMobiusPoint(
  theta: number,
  scale: number
): { x: number; y: number } {
  const sin = Math.sin(theta)
  const cos = Math.cos(theta)
  const denominator = 1 + sin * sin
  const factor = (scale * Math.SQRT2) / denominator
  return {
    x: factor * cos,
    y: factor * sin * cos,
  }
}

/** 空间吸引子向心引力与旋度流场微物理加速度计算 */
export function calculateAttractorPhysics(
  px: number,
  py: number,
  ax: number,
  ay: number,
  gStrength: number,
  curlStrength: number
): { fx: number; fy: number } {
  const dx = ax - px
  const dy = ay - py
  const dist = Math.hypot(dx, dy) + 12.0 // 软化因子 epsilon，防止奇点除零

  // 向心引力
  const radialForce = gStrength / dist
  const rfx = (dx / dist) * radialForce
  const rfy = (dy / dist) * radialForce

  // 切向旋度流场力
  const cfx = (-dy / dist) * curlStrength
  const cfy = (dx / dist) * curlStrength

  return {
    fx: rfx + cfx,
    fy: rfy + cfy,
  }
}

/** 将吸引子归一化空间位置投射至具体屏幕坐标 */
export function getAttractorScreenCoords(
  attractor: StageAttractorConfig,
  width: number,
  height: number
): { x: number; y: number } {
  const cx = width * 0.5
  const cy = height * 0.5
  const radius = Math.min(width, height) * 0.42
  return {
    x: cx + attractor.normalizedX * radius,
    y: cy + attractor.normalizedY * radius,
  }
}

/** 滚轮逃逸判定：若垂直滚动分量达到或超越阈值则触发逃逸 */
export function shouldEscapeOnWheel(
  deltaY: number,
  threshold: number = DEFAULT_AWAKENING_TIMELINE.escapeWheelDelta
): boolean {
  return Math.abs(deltaY) >= threshold
}

/** 移动端触控滑动手势逃逸判定 */
export function shouldEscapeOnTouch(
  deltaY: number,
  threshold: number = DEFAULT_AWAKENING_TIMELINE.escapeTouchDelta
): boolean {
  return Math.abs(deltaY) >= threshold
}
