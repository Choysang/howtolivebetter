/** 真实上游全量解析冒烟（不产文件，仅验证严格模式可通过）。 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseChapter } from '../backend/pipeline/parse.ts'

const BOOK = join(import.meta.dirname, '..', '.cache', 'upstream', 'book')
const files = readdirSync(BOOK).filter((f) => f.endsWith('.md')).sort()
let items = 0
const t0 = Date.now()
for (const f of files) {
  const ch = parseChapter(f, readFileSync(join(BOOK, f), 'utf8'))
  if (ch.n !== Number(f.slice(0, 2))) throw new Error(`${f} 章号与文件名不符：${ch.n}`)
  items += ch.items.length
}
console.log(`OK ${files.length} 章 / ${items} 条 / ${Date.now() - t0}ms`)
