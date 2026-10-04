/**
 * pipeline/parse —— 行级严格解析（上游 book/*.md → SourceItem[]）。
 * 严格模式：未知字段、缺字段、格式漂移直接抛错（带文件与行号）。
 * 已知宽容点：章尾 `## 小节`（如「## 许可」）终止条目收集。
 */
import type { CostTags, SourceItem, EvidenceBase } from '../../contracts/kb.ts'

const FIELD_NAMES = ['成本', '说人话', '收益', '证据等级', '来源', '备注'] as const
type FieldName = (typeof FIELD_NAMES)[number]

const MONEY: readonly string[] = ['0', '少', '多']
const TIME: readonly string[] = ['少', '中', '多']
const WILL: readonly string[] = ['否', '些', '是']
const BENEFIT: readonly string[] = ['大', '中', '小']
const CALIBER: readonly string[] = ['死亡率', '金钱', '时间', '自由']

export class ParseError extends Error {}

function fail(file: string, lineNo: number, msg: string): never {
  throw new ParseError(`${file}:${lineNo} ${msg}`)
}

function parseTagComment(file: string, lineNo: number, inner: string): CostTags {
  const tags: Record<string, string> = {}
  for (const pair of inner.trim().split(/\s+/)) {
    const eq = pair.indexOf('=')
    if (eq < 0) fail(file, lineNo, `成本标签片段「${pair}」不含 =`)
    const k = pair.slice(0, eq)
    const v = pair.slice(eq + 1)
    if (!['钱', '时间', '毅力', '收益', '口径'].includes(k)) fail(file, lineNo, `未知成本标签键「${k}」`)
    tags[k] = v
  }
  for (const k of ['钱', '时间', '毅力', '收益', '口径']) {
    if (tags[k] === undefined) fail(file, lineNo, `成本标签缺「${k}」`)
  }
  if (!MONEY.includes(tags['钱']!)) fail(file, lineNo, `钱="${tags['钱']}" 超出值域`)
  if (!TIME.includes(tags['时间']!)) fail(file, lineNo, `时间="${tags['时间']}" 超出值域`)
  if (!WILL.includes(tags['毅力']!)) fail(file, lineNo, `毅力="${tags['毅力']}" 超出值域`)
  if (!BENEFIT.includes(tags['收益']!)) fail(file, lineNo, `收益="${tags['收益']}" 超出值域`)
  if (!CALIBER.includes(tags['口径']!)) fail(file, lineNo, `口径="${tags['口径']}" 超出值域`)
  return {
    money: tags['钱'] as CostTags['money'],
    time: tags['时间'] as CostTags['time'],
    willpower: tags['毅力'] as CostTags['willpower'],
    benefit: tags['收益'] as CostTags['benefit'],
    caliber: tags['口径'] as CostTags['caliber'],
  }
}

export interface ParsedChapter {
  n: number
  title: string
  file: string
  intro: string
  items: SourceItem[]
}

export function parseChapter(file: string, md: string): ParsedChapter {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  let n = 0
  let title = ''
  let intro = ''
  let inItems = false
  let cur: { item: SourceItem; fields: Set<string> } | null = null
  const items: SourceItem[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^\[← 回总目录\]/.test(line.trim())) continue
    const h1 = line.match(/^# (\d+)\. (.+)$/)
    if (h1) {
      n = Number(h1[1])
      title = h1[2]!.trim()
      continue
    }
    if (!inItems) {
      const im = line.match(/^### (\d+)\. (.+)$/)
      if (!im) {
        if (line.trim() !== '') intro += (intro ? '\n' : '') + line.trim()
        continue
      }
      inItems = true
      cur = startItem(file, i, Number(im[1]), im[2]!.trim())
      cur.item.chapter = n
      items.push(cur.item)
      i = readTagLine(file, lines, i, cur)
      continue
    }
    const im = line.match(/^### (\d+)\. (.+)$/)
    if (im) {
      if (cur) finishItem(file, i, cur)
      cur = startItem(file, i, Number(im[1]), im[2]!.trim())
      cur.item.chapter = n
      items.push(cur.item)
      i = readTagLine(file, lines, i, cur)
      continue
    }
    if (/^##\s/.test(line)) {
      if (cur) finishItem(file, i, cur)
      cur = null
      continue // 章尾小节（如「## 许可」）
    }
    if (cur && line.startsWith('- ')) {
      const fm = line.match(/^- ([^：]+)：(.*)$/)
      if (!fm) fail(file, i + 1, `无法解析的字段行：${line.slice(0, 60)}`)
      const name = fm[1]!.trim() as FieldName
      if (!(FIELD_NAMES as readonly string[]).includes(name)) fail(file, i + 1, `未知字段「${name}」`)
      if (cur.fields.has(name)) fail(file, i + 1, `字段「${name}」重复`)
      cur.fields.add(name)
      const val = fm[2]!.trim()
      const it = cur.item as unknown as Record<string, string>
      it[name === '成本' ? 'cost' : name === '说人话' ? 'plain' : name === '收益' ? 'benefit' : name === '来源' ? 'refs' : name === '备注' ? 'note' : 'evidence'] = val
      continue
    }
    if (cur && line.trim() !== '') fail(file, i + 1, `条目内出现无法归属的行：${line.slice(0, 60)}`)
  }
  if (cur) finishItem(file, lines.length, cur)
  if (n === 0 || !title) fail(file, 1, '缺少「# N. 章名」标题行')
  // 条号必须从 1 连续递增
  items.forEach((it, idx) => {
    if (it.index !== idx + 1) fail(file, 1, `条号不连续：第 ${idx + 1} 位是第 ${it.index} 条`)
  })
  return { n, title, file, intro, items }
}

function startItem(file: string, lineIdx: number, index: number, title: string) {
  return {
    item: {
      chapter: 0,
      index,
      title,
      tags: { money: '0', time: '少', willpower: '否', benefit: '中', caliber: '金钱' },
      cost: '',
      plain: '',
      benefit: '',
      evidence: '',
      evidenceBase: 'A' as EvidenceBase,
      refs: '',
      note: '',
      flags: { disputed: false, unverified: false },
    } as SourceItem,
    fields: new Set<string>(),
  }
}

/** 读取条目标题下一行的成本标签注释；返回新的 i（跳过注释行）。 */
function readTagLine(file: string, lines: string[], i: number, cur: { item: SourceItem; fields: Set<string> }): number {
  const next = lines[i + 1] ?? ''
  const tm = next.match(/^<!-- 成本标签:\s*(.*?)\s*-->$/)
  if (!tm) fail(file, i + 2, '条目标题下一行必须是「<!-- 成本标签: … -->」注释')
  cur.item.tags = parseTagComment(file, i + 2, tm[1]!)
  return i + 1
}

function finishItem(file: string, lineNo: number, cur: { item: SourceItem; fields: Set<string> }): void {
  const it = cur.item
  for (const f of FIELD_NAMES) {
    if (!cur.fields.has(f)) fail(file, lineNo, `第${it.index}条「${it.title}」缺字段「${f}」`)
  }
  const base = it.evidence.charAt(0)
  if (!['A', 'B', 'C'].includes(base)) fail(file, lineNo, `证据等级「${it.evidence}」不以 A/B/C 开头`)
  it.evidenceBase = base as EvidenceBase
  it.flags.disputed = /^争议/.test(it.note)
  it.flags.unverified = [it.title, it.cost, it.plain, it.benefit, it.evidence, it.refs, it.note].some((s) => s.includes('待核实'))
}
