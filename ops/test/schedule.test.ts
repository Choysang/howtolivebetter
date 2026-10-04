import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDuration, planDeadlines, toICS, formatDurationCN } from '../../kernel/schedule.ts'

test('parseDuration：ISO-8601 子集', () => {
  assert.equal(parseDuration('PT24H'), 86400000)
  assert.equal(parseDuration('P7D'), 7 * 86400000)
  assert.equal(parseDuration('P2W'), 14 * 86400000)
  assert.equal(parseDuration('PT30M'), 1800000)
  assert.equal(parseDuration('PT90S'), 90000)
  assert.equal(parseDuration('P1DT12H'), 36 * 3600000)
  assert.throws(() => parseDuration('P'))
  assert.throws(() => parseDuration('24H'))
  assert.throws(() => parseDuration('P1Y'))
})

test('planDeadlines：时限从起点起算（绝对）', () => {
  const start = new Date('2026-10-03T08:00:00Z')
  const out = planDeadlines(
    [
      { uid: 'AAAAAAAA', within: 'PT2H' },
      { uid: 'BBBBBBBB', within: 'P1D' },
      { uid: 'CCCCCCCC', within: 'P1DT30M' },
    ],
    start,
  )
  assert.equal(out[0]!.at.toISOString(), '2026-10-03T10:00:00.000Z')
  assert.equal(out[1]!.at.toISOString(), '2026-10-04T08:00:00.000Z')
  assert.equal(out[2]!.at.toISOString(), '2026-10-04T08:30:00.000Z')
})

test('toICS：RFC 5545 基本格式', () => {
  const ics = toICS([
    { uid: 'AAAAAAAA', title: '报警留证; 重要, 步骤', start: new Date('2026-10-03T10:00:00Z'), durationMin: 15 },
  ])
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'))
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  assert.ok(ics.includes('DTSTART:20261003T100000Z'))
  assert.ok(ics.includes('DTEND:20261003T101500Z'))
  assert.ok(ics.includes('SUMMARY:报警留证\\; 重要\\, 步骤'))
  assert.ok(ics.includes('UID:AAAAAAAA@howtolivebetter.local'))
  assert.ok(ics.includes('\r\nBEGIN:VEVENT\r\n'))
})

test('formatDurationCN', () => {
  assert.equal(formatDurationCN('PT24H'), '1 天内')
  assert.equal(formatDurationCN('P7D'), '7 天内')
  assert.equal(formatDurationCN('PT30M'), '30 分钟内')
  assert.equal(formatDurationCN('PT90S'), '2 分钟内')
})
