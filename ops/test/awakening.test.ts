import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MASTER_MAXIM,
  DEFAULT_AWAKENING_TIMELINE,
  STAGE_ATTRACTORS,
} from '../../contracts/awakening.ts'
import {
  getAwakeningPhase,
  getPhaseProgress,
  calculateMobiusPoint,
  calculateAttractorPhysics,
  getAttractorScreenCoords,
  shouldEscapeOnWheel,
  shouldEscapeOnTouch,
} from '../../kernel/awakening.ts'

test('awakening: 终极导引金句与哲学背景契约完备', () => {
  assert.equal(MASTER_MAXIM.title, '世界以主题铺陈，生命按阶段决断。')
  assert.equal(MASTER_MAXIM.subtitle, '以循证为度刺破噪音，在不可逆的时流中筑牢反脆弱。')
  assert.ok(MASTER_MAXIM.philosophicalContext.ontology.length > 0)
  assert.ok(MASTER_MAXIM.philosophicalContext.existentialism.length > 0)
  assert.ok(MASTER_MAXIM.philosophicalContext.epistemology.length > 0)
  assert.ok(MASTER_MAXIM.philosophicalContext.cybernetics.length > 0)
})

test('awakening: 五大生命阶段空间吸引子配置完整且归一化在合理范围', () => {
  assert.equal(STAGE_ATTRACTORS.length, 5)
  const ids = STAGE_ATTRACTORS.map((a) => a.id)
  assert.deepEqual(ids, ['hs', 'college', 'early', 'mid', 'retire'])

  for (const attractor of STAGE_ATTRACTORS) {
    assert.ok(attractor.normalizedX >= -1.0 && attractor.normalizedX <= 1.0)
    assert.ok(attractor.normalizedY >= -1.0 && attractor.normalizedY <= 1.0)
    assert.ok(attractor.name.length > 0)
    assert.ok(attractor.color.startsWith('#'))
  }
})

test('awakening: 时间轴所属时相演化推导严格单调', () => {
  assert.equal(getAwakeningPhase(0), 'chaos')
  assert.equal(getAwakeningPhase(1000), 'chaos')
  assert.equal(getAwakeningPhase(2399), 'chaos')

  // 阶段二：吸引子收敛
  assert.equal(getAwakeningPhase(2400), 'attractors')
  assert.equal(getAwakeningPhase(4000), 'attractors')
  assert.equal(getAwakeningPhase(5199), 'attractors')

  // 阶段三：莫比乌斯与字素
  assert.equal(getAwakeningPhase(5200), 'mobius')
  assert.equal(getAwakeningPhase(7000), 'mobius')
  assert.equal(getAwakeningPhase(7999), 'mobius')

  // 终态结晶
  assert.equal(getAwakeningPhase(8000), 'crystallized')
  assert.equal(getAwakeningPhase(12000), 'crystallized')
})

test('awakening: getPhaseProgress 归一化进度计算', () => {
  const p0 = getPhaseProgress(0)
  assert.equal(p0.phase, 'chaos')
  assert.equal(p0.progress, 0)
  assert.equal(p0.totalProgress, 0)

  const pHalfChaos = getPhaseProgress(1200)
  assert.equal(pHalfChaos.phase, 'chaos')
  assert.equal(pHalfChaos.progress, 0.5)

  const pAttractorStart = getPhaseProgress(2400)
  assert.equal(pAttractorStart.phase, 'attractors')
  assert.equal(pAttractorStart.progress, 0)

  const pDone = getPhaseProgress(9000)
  assert.equal(pDone.phase, 'crystallized')
  assert.equal(pDone.progress, 1)
  assert.equal(pDone.totalProgress, 1)
})

test('awakening: 伯努利双纽线（莫比乌斯投影）几何对称性推演', () => {
  // 原点: theta = 0, sin = 0, cos = 1 -> x = scale * sqrt(2), y = 0
  const p0 = calculateMobiusPoint(0, 100)
  assert.ok(Math.abs(p0.x - 100 * Math.SQRT2) < 1e-6)
  assert.ok(Math.abs(p0.y) < 1e-6)

  // theta = Math.PI / 2 -> cos = 0 -> x = 0, y = 0 (交叉中心)
  const pCenter = calculateMobiusPoint(Math.PI / 2, 100)
  assert.ok(Math.abs(pCenter.x) < 1e-6)
  assert.ok(Math.abs(pCenter.y) < 1e-6)

  // 对称性：theta -> theta + PI 时 x 取负，y 保持同号
  const p1 = calculateMobiusPoint(0.5, 50)
  const p1Opp = calculateMobiusPoint(0.5 + Math.PI, 50)
  assert.ok(Math.abs(p1.x + p1Opp.x) < 1e-6)
  assert.ok(Math.abs(p1.y - p1Opp.y) < 1e-6)

  // 对称性：theta -> -theta 时 x 保持相同，y 取负
  const p1Neg = calculateMobiusPoint(-0.5, 50)
  assert.ok(Math.abs(p1.x - p1Neg.x) < 1e-6)
  assert.ok(Math.abs(p1.y + p1Neg.y) < 1e-6)
})

test('awakening: 吸引子向心引力与旋度流场受力计算非奇点稳定性', () => {
  // 粒子恰好在吸引子处，验证 epsilon 软化因子防止除零
  const forceAtSingularity = calculateAttractorPhysics(100, 100, 100, 100, 10, 5)
  assert.ok(Number.isFinite(forceAtSingularity.fx))
  assert.ok(Number.isFinite(forceAtSingularity.fy))

  // 吸引子在右侧 (ax > px)，主要受力沿正 x 轴
  const fRight = calculateAttractorPhysics(0, 0, 100, 0, 100, 0)
  assert.ok(fRight.fx > 0)
  assert.equal(fRight.fy, 0)

  // 引入旋度切向力，y 方向应产生垂直加速度分量
  const fCurl = calculateAttractorPhysics(0, 0, 100, 0, 100, 50)
  assert.ok(fCurl.fx > 0)
  assert.ok(fCurl.fy > 0)
})

test('awakening: 屏幕坐标投影映射保真度', () => {
  const coord = getAttractorScreenCoords(STAGE_ATTRACTORS[0], 1000, 800)
  assert.ok(coord.x > 0 && coord.x < 1000)
  assert.ok(coord.y > 0 && coord.y < 800)
})

test('awakening: 逃逸舱触发阈值判定', () => {
  assert.equal(shouldEscapeOnWheel(10), false)
  assert.equal(shouldEscapeOnWheel(35), true)
  assert.equal(shouldEscapeOnWheel(-40), true)

  assert.equal(shouldEscapeOnTouch(20), false)
  assert.equal(shouldEscapeOnTouch(45), true)
  assert.equal(shouldEscapeOnTouch(-50), true)
})
