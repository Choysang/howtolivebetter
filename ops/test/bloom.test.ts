import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSaturation, determineBloomStage, calculateCBI } from '../../kernel/bloom.ts'
import type { UserCognitiveSnapshot, SovereignBackupData } from '../../contracts/bloom.ts'

test('bloom: calculateSaturation 双曲饱和数学特性', () => {
  assert.equal(calculateSaturation(0, 10), 0)
  assert.equal(calculateSaturation(-5, 10), 0)
  assert.equal(calculateSaturation(10, 10), 0.5)
  assert.equal(calculateSaturation(30, 10), 0.75)
  assert.ok(calculateSaturation(100000, 10) < 1.0)
  assert.ok(calculateSaturation(100000, 10) > 0.999)
})

test('bloom: 防刷机制与单向刷分天花板（Anti-Grinding Defense）', () => {
  // 极端单向刷量：狂点已读 10,000 次，但无其他维度投入
  const grifterSnapshot: UserCognitiveSnapshot = {
    readCount: 10000,
    lensExplorations: 0,
    habitCheckinCount: 0,
    checkupCount: 0,
    dialecticEvaluations: 0,
    constitutionArticles: 0,
  }

  const result = calculateCBI(grifterSnapshot)
  assert.ok(result.totalScore <= 10, '单向刷已读得分绝不可能突破 L1 加权上限 10 分')
  assert.equal(result.stage, 0)
  assert.equal(result.title, '直觉探索者')
})

test('bloom: 全维跃升与阶段映射确定性', () => {
  // 零行为
  const emptyResult = calculateCBI({
    readCount: 0,
    lensExplorations: 0,
    habitCheckinCount: 0,
    checkupCount: 0,
    dialecticEvaluations: 0,
    constitutionArticles: 0,
  })
  assert.equal(emptyResult.totalScore, 0)
  assert.equal(emptyResult.stage, 0)
  assert.equal(emptyResult.title, '直觉探索者')

  // 平衡知行跃迁
  const masterSnapshot: UserCognitiveSnapshot = {
    readCount: 150,
    lensExplorations: 12,
    habitCheckinCount: 60,
    checkupCount: 15,
    dialecticEvaluations: 10,
    constitutionArticles: 6,
  }

  const masterResult = calculateCBI(masterSnapshot)
  assert.ok(masterResult.totalScore >= 75, '均衡高阶实践者应稳定达成 75 分以上')
  assert.equal(masterResult.stage, 4)
  assert.equal(masterResult.title, '自主立法官')
})

test('bloom: 端侧主权备份数据契约结构合法性', () => {
  const dummyBackup: SovereignBackupData = {
    schemaVersion: 1,
    exportedAt: '2026-10-04T00:00:00.000Z',
    appName: 'howtolivebetter',
    readItems: ['083TMQ1Z', '02-01'],
    favItems: ['7WB0GXS8'],
    habits: [
      {
        uid: '3W2GSHAH',
        title: '睡前深呼吸',
        streak: 5,
        addedAt: Date.now(),
        completedDates: ['2026-10-01', '2026-10-02'],
      },
    ],
    constitution: {
      userName: '实践者',
      lastUpdated: '2026-10-04',
      motto: '知行合一',
      rules: [],
    },
    checkinHistory: {
      'checkin-2026-10-03': '{"083TMQ1Z":"ceiling"}',
    },
  }

  assert.equal(dummyBackup.schemaVersion, 1)
  assert.equal(dummyBackup.appName, 'howtolivebetter')
  assert.ok(Array.isArray(dummyBackup.readItems))
  assert.ok(Array.isArray(dummyBackup.habits))
})
