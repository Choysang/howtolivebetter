/** 生成条目摘要（供编辑层选题与人工审阅；uid 已注册）。 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'

const ROOT = resolvePath(import.meta.dirname, '..')
const latest = JSON.parse(readFileSync(join(ROOT, 'frontend', 'web', 'public', 'kb', 'latest.json'), 'utf8')) as { hash: string }
const lite = JSON.parse(readFileSync(join(ROOT, 'frontend', 'web', 'public', 'kb', latest.hash, 'lite.json'), 'utf8')) as Array<{
  uid: string; chapter: number; index: number; title: string
  evidenceBase: string; tags: { money: string; time: string; willpower: string; benefit: string; caliber: string }
  disputed: boolean; unverified: boolean; sensitive: boolean; always: boolean
}>
const chapters = JSON.parse(readFileSync(join(ROOT, 'frontend', 'web', 'public', 'kb', latest.hash, 'chapters.json'), 'utf8')) as Array<{ n: number; title: string }>
const chTitle = new Map(chapters.map((c) => [c.n, c.title]))

const lines: string[] = [`# 条目摘要（${lite.length} 条）`, '']
for (const ch of chapters) {
  lines.push(`## 第${ch.n}章 ${chTitle.get(ch.n)}`)
  for (const it of lite.filter((i) => i.chapter === ch.n)) {
    const flags = [
      it.disputed ? '争议' : '',
      it.unverified ? '待核实' : '',
      it.sensitive ? '敏感' : '',
    ].filter(Boolean).join(',')
    lines.push(
      `- ${it.uid} ${String(it.index).padStart(2, ' ')} [${it.evidenceBase}${flags ? '|' + flags : ''}] ` +
        `钱${it.tags.money}/时${it.tags.time}/毅${it.tags.willpower}/益${it.tags.benefit} ${it.title}`,
    )
  }
  lines.push('')
}
writeFileSync(join(ROOT, 'data', 'item-digest.md'), lines.join('\n'))
console.log(`data/item-digest.md（${lite.length} 条）`)
