import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCBI } from '../../kernel/bloom.ts'
import {
  calculateRadarPoints,
  calculateCognitiveBalanceMetrics,
  deriveNextStepQuantumGuide,
} from '../../kernel/radar.ts'
import type { UserCognitiveSnapshot } from '../../contracts/bloom.ts'

test('radar: calculateRadarPoints 几何投影坐标单调与极坐标有效性', () => {
  const snapshot: UserCognitiveSnapshot = {
    readCount: 10,
    lensExplorations: 5,
    habitCheckinCount: 10,
    checkupCount: 2,
    dialecticEvaluations: 2,
    constitutionArticles: 2,
  }
  const result = calculateCBI(snapshot)
  const geom = calculateRadarPoints(result, { size: 300, cx: 150, cy: 150, radius: 100 })

  assert.equal(geom.points.length, 6)
  assert.ok(geom.polygonString.length > 20)

  // 验证 L6 居于最上方 (angle = -PI/2)，其 x 必须严格位于中心 cx 附近
  const l6Point = geom.points[5] // 最后一维是 L6 (创造)
  assert.ok(Math.abs(l6Point.x - 150) < 1.0, 'L6 应该在正上方的中轴线上')
  assert.ok(l6Point.y < 150, 'L6 应该在中心点上方')
})

test('radar: calculateCognitiveBalanceMetrics 香农均衡熵与偏瘫判定', () => {
  // 1. 极端偏瘫样本：狂读 1000 篇但其他全为 0
  const hemiplegicSnapshot: UserCognitiveSnapshot = {
    readCount: 1000,
    lensExplorations: 0,
    habitCheckinCount: 0,
    checkupCount: 0,
    dialecticEvaluations: 0,
    constitutionArticles: 0,
  }
  const hemiResult = calculateCBI(hemiplegicSnapshot)
  const hemiMetrics = calculateCognitiveBalanceMetrics(hemiResult)

  assert.ok(hemiMetrics.hasCognitiveHemiplegia, '单维畸形刷分必须命中偏瘫预警')
  assert.ok(hemiMetrics.shannonEntropy < 0.65, '严重偏瘫的香农熵应显著低于 0.65')

  // 2. 均衡高维样本：知行合一
  const balancedSnapshot: UserCognitiveSnapshot = {
    readCount: 40,
    lensExplorations: 10,
    habitCheckinCount: 20,
    checkupCount: 5,
    dialecticEvaluations: 5,
    constitutionArticles: 4,
  }
  const balResult = calculateCBI(balancedSnapshot)
  const balMetrics = calculateCognitiveBalanceMetrics(balResult)

  assert.ok(!balMetrics.hasCognitiveHemiplegia, '均衡知行发展不应偏瘫')
  assert.ok(balMetrics.shannonEntropy > 0.85, '均衡发展的香农熵应逼近 1.0')
  assert.ok(balMetrics.areaRatio > 0.15, '面积充盈率必须显著大于 0')
})

test('radar: deriveNextStepQuantumGuide 最优阻抗微推荐', () => {
  const snapshot: UserCognitiveSnapshot = {
    readCount: 0,
    lensExplorations: 0,
    habitCheckinCount: 0,
    checkupCount: 0,
    dialecticEvaluations: 0,
    constitutionArticles: 0,
  }
  const result = calculateCBI(snapshot)
  const guide = deriveNextStepQuantumGuide(result)

  assert.ok(guide.actionVerb.length > 0)
  assert.ok(guide.targetUrl.startsWith('/'))
  assert.ok(guide.marginalRoi > 0)
  assert.ok(guide.scoreGapToNextStage > 0)
})
