/**
 * kernel/schedule —— 场景时限换算与 .ics 导出（纯函数，零 I/O）。
 * planDeadlines：每步截止 = 起点加该步 within（从起点起算的绝对时限）。
 * toICS：输出符合 RFC 5545 基本格式的 VCALENDAR。
 */

/** 解析 ISO-8601 duration 子集：PnW / PnD / PnDTnH / PTnH / PTnM / PTnS 组合。 */
export function parseDuration(d: string): number {
  const m = d.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m || (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]) === undefined) {
    throw new Error(`无法解析时限：${d}`)
  }
  const [w, dd, h, min, s] = [m[1], m[2], m[3], m[4], m[5]].map((x) => Number(x ?? 0))
  return ((w * 7 + dd) * 24 * 3600 + h * 3600 + min * 60 + s) * 1000
}

export interface Deadline {
  uid: string
  at: Date
}

export function planDeadlines(
  steps: { uid: string; within: string }[],
  start: Date,
): Deadline[] {
  return steps.map((step) => ({
    uid: step.uid,
    at: new Date(start.getTime() + parseDuration(step.within)),
  }))
}

export function formatDurationCN(d: string): string {
  const ms = parseDuration(d)
  const days = ms / 86400000
  const hours = ms / 3600000
  const mins = Math.round(ms / 60000)
  if (days >= 1 && Number.isInteger(days)) return `${days} 天内`
  if (hours >= 1 && Number.isInteger(hours)) return `${hours} 小时内`
  return `${mins} 分钟内`
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function icsDate(d: Date): string {
  return (
    String(d.getUTCFullYear()).padStart(4, '0') +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') +
    'T' +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0') +
    String(d.getUTCSeconds()).padStart(2, '0') +
    'Z'
  )
}

export interface IcsEvent {
  uid: string
  title: string
  start: Date
  durationMin?: number
}

export function toICS(events: IcsEvent[], calName = 'howtolivebetter 场景时限'): string {
  const now = icsDate(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//howtolivebetter//scenario deadlines//CN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsEscape(calName)}`,
  ]
  for (const ev of events) {
    const end = new Date(ev.start.getTime() + (ev.durationMin ?? 30) * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@howtolivebetter.local`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(ev.start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
