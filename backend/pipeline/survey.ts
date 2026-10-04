/**
 * 字段普查：对 .cache/upstream/book/*.md 做全量格式扫描，固化值域。
 * 只读、无副作用；输出 JSON 摘要到 stdout。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const BOOK_DIR = join(import.meta.dirname, '..', '..', '.cache', 'upstream', 'book')

interface Item {
  chapter: number
  index: number
  title: string
  tagComment: boolean
  fields: string[]
  evidence: string
  notePrefix: string
  unresolved: string[]
}

const fieldFreq = new Map<string, number>()
const tagKeys = new Map<string, Map<string, number>>()
const evidenceValues = new Map<string, number>()
const items: Item[] = []
const anomalies: string[] = []

const files = readdirSync(BOOK_DIR).filter((f) => f.endsWith('.md')).sort()
for (const file of files) {
  const raw = readFileSync(join(BOOK_DIR, file), 'utf8').replace(/\r\n/g, '\n')
  const lines = raw.split('\n')
  const chNum = Number(file.slice(0, 2))
  let h1 = ''
  let introLines: string[] = []
  let cur: Item | null = null
  let introDone = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const m = line.match(/^### (\d+)\. (.+)$/)
    if (m) {
      cur = { chapter: chNum, index: Number(m[1]), title: m[2]!, tagComment: false, fields: [], evidence: '', notePrefix: '', unresolved: [] }
      items.push(cur)
      introDone = true
      // 下一行是否为成本标签注释
      const next = lines[i + 1] ?? ''
      if (/^<!-- 成本标签:.*-->\s*$/.test(next)) {
        cur.tagComment = true
        const inner = next.replace(/^<!-- 成本标签:\s*/, '').replace(/-->\s*$/, '')
        for (const pair of inner.trim().split(/\s+/)) {
          const [k, v] = pair.split('=')
          if (!k || !v) continue
          if (!tagKeys.has(k!)) tagKeys.set(k!, new Map())
          const vm = tagKeys.get(k!)!
          vm.set(v!, (vm.get(v!) ?? 0) + 1)
        }
        i++
      } else if (next.trim() !== '' && !next.startsWith('- ')) {
        anomalies.push(`${file}:${i + 2} 条目后既非标签也非字段: ${next.slice(0, 60)}`)
      }
      continue
    }
    if (!introDone) {
      if (line.startsWith('# ')) { h1 = line.slice(2).trim(); continue }
      if (/^\[← 回总目录\]/.test(line.trim())) continue
      if (line.trim() !== '') introLines.push(line.trim())
      continue
    }
    const fm = line.match(/^- ([^：]+)：(.*)$/)
    if (fm && cur) {
      const name = fm[1]!.trim()
      fieldFreq.set(name, (fieldFreq.get(name) ?? 0) + 1)
      cur.fields.push(name)
      const val = fm[2]!.trim()
      if (name === '证据等级') { cur.evidence = val; evidenceValues.set(val, (evidenceValues.get(val) ?? 0) + 1) }
      if (name === '备注') cur.notePrefix = val.slice(0, 6)
      continue
    }
    if (cur && line.trim() !== '' && !line.startsWith('#')) {
      cur.unresolved.push(`${file}:${i + 1}: ${line.slice(0, 70)}`)
    }
  }
  console.log(JSON.stringify({ file, h1, intro: introLines[0]?.slice(0, 40) ?? '' }))
}

const byChapter = new Map<number, number>()
for (const it of items) byChapter.set(it.chapter, (byChapter.get(it.chapter) ?? 0) + 1)

const missingFields = new Map<string, number>()
for (const it of items) {
  for (const req of ['成本', '说人话', '收益', '证据等级', '来源']) {
    if (!it.fields.includes(req)) missingFields.set(req, (missingFields.get(req) ?? 0) + 1)
  }
}

const notePrefixes = new Map<string, number>()
for (const it of items) if (it.notePrefix) notePrefixes.set(it.notePrefix, (notePrefixes.get(it.notePrefix) ?? 0) + 1)

const summary = {
  files: files.length,
  totalItems: items.length,
  itemsByChapter: Object.fromEntries([...byChapter.entries()].sort((a, b) => a[0] - b[0])),
  fieldFreq: Object.fromEntries([...fieldFreq.entries()].sort()),
  tagKeys: Object.fromEntries([...tagKeys.entries()].map(([k, v]) => [k, Object.fromEntries([...v.entries()].sort())])),
  evidenceValues: Object.fromEntries([...evidenceValues.entries()].sort()),
  missingRequiredFields: Object.fromEntries(missingFields),
  notePrefixes: Object.fromEntries([...notePrefixes.entries()].sort()),
  itemsWithoutTagComment: items.filter((i) => !i.tagComment).length,
  unresolvedLineSamples: items.flatMap((i) => i.unresolved).slice(0, 15),
  anomalies: anomalies.slice(0, 15),
}
console.log('\n===== SURVEY SUMMARY =====')
console.log(JSON.stringify(summary, null, 2))
