/**
 * pipeline/emit —— 内容寻址知识包 + 机读面。
 * 幂等：同输入（条目、编辑层、注册表决策）→ 同哈希 → 同文件。
 * 输出：
 *   {out}/kb/{hash}/  manifest items lite chapters stages scenarios rules checkup checkin search-index
 *   {out}/kb/latest.json
 *   {out}/llms.txt · llms-full.txt · items.json · robots.txt · md/chapter-{n}.md
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Chapter, Item, Manifest, EditorialSpec, MatchRule, CheckupSpec, CheckinSpec, Scenario } from '../../contracts/kb.ts'
import { validateManifest } from '../../contracts/kb.ts'
import type { Precomputed } from './precompute.ts'
import { parseYamlSubset } from './yaml.ts'

export interface EmitInput {
  outDir: string
  items: Item[]
  chapters: Chapter[]
  editorial: EditorialSpec
  rules: MatchRule[]
  precomputed: Precomputed
  upstream: { repo: string; commit: string }
  sourceBookDir: string
}

export interface EmitResult {
  hash: string
  manifest: Manifest
  wrote: string[]
}

/** 递归排序键的稳定序列化（哈希输入）。 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const FILE_ORDER = ['items', 'lite', 'chapters', 'stages', 'scenarios', 'rules', 'checkup', 'checkin', 'search-index'] as const

export function emit(input: EmitInput): EmitResult {
  const { outDir, items, chapters, editorial, rules, precomputed, upstream } = input

  const files: Record<string, unknown> = {
    items,
    lite: precomputed.lite,
    chapters,
    stages: precomputed.stagesComputed,
    scenarios: editorial.scenarios,
    rules,
    checkup: editorial.checkup,
    checkin: editorial.checkin,
    'search-index': precomputed.index,
  }

  const hashInput = FILE_ORDER.map((name) => canonicalJson(files[name])).join('\n') + `\nupstream=${upstream.commit}`
  const hash = createHash('sha256').update(hashInput, 'utf8').digest('hex').slice(0, 16)

  const counts = {
    items: items.length,
    chapters: chapters.length,
    refs: precomputed.refLinks,
    disputed: items.filter((i) => i.source.flags.disputed).length,
    unverified: items.filter((i) => i.source.flags.unverified).length,
    evidenceA: items.filter((i) => i.source.evidenceBase === 'A').length,
    evidenceB: items.filter((i) => i.source.evidenceBase === 'B').length,
    evidenceC: items.filter((i) => i.source.evidenceBase === 'C').length,
    sensitive: items.filter((i) => i.overlay.sensitive).length,
    stages: editorial.stages.length,
    scenarios: editorial.scenarios.length,
    checkinItems: editorial.checkin.items.length,
  }

  const manifest: Manifest = {
    schemaVersion: '1.0.0',
    upstream: { repo: upstream.repo, commit: upstream.commit, commitShort: upstream.commit.slice(0, 7) },
    hash,
    counts,
    attribution: {
      title: '高性价比人生指南（HowToLiveBetter）',
      author: 'albert4719 与贡献者',
      repo: 'https://github.com/eternity4719/HowToLiveBetter',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/deed.zh',
      derivedNotice: '本站按人生阶段重排并新增编辑层（阶段映射、排序、场景钩子），原文一字未改。',
    },
  }
  const errors = validateManifest(manifest)
  if (errors.length) throw new Error(`manifest 校验失败：${errors.join('；')}`)

  const wrote: string[] = []
  const hashDir = join(outDir, 'kb', hash)
  mkdirSync(hashDir, { recursive: true })
  for (const name of FILE_ORDER) {
    const p = join(hashDir, `${name}.json`)
    writeFileSync(p, JSON.stringify(files[name]))
    wrote.push(p)
  }
  writeFileSync(join(hashDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  wrote.push(join(hashDir, 'manifest.json'))
  writeFileSync(join(outDir, 'kb', 'latest.json'), JSON.stringify({ hash }))
  wrote.push(join(outDir, 'kb', 'latest.json'))

  const routerYamlPath = join(process.cwd(), 'router_config.yaml')
  if (existsSync(routerYamlPath)) {
    const raw = readFileSync(routerYamlPath, 'utf8')
    const parsed = parseYamlSubset(raw)
    const jsonStr = JSON.stringify(parsed)
    writeFileSync(join(hashDir, 'router.json'), jsonStr)
    writeFileSync(join(outDir, 'kb', 'router.json'), jsonStr)
    wrote.push(join(hashDir, 'router.json'))
  }

  // 机读面
  writeFileSync(
    join(outDir, 'llms.txt'),
    llmsTxt(manifest, chapters, editorial.stages.map((s) => s.id), editorial.scenarios.map((s) => s.id)),
  )
  writeFileSync(join(outDir, 'llms-full.txt'), llmsFull(manifest, chapters, items))
  writeFileSync(join(outDir, 'items.json'), JSON.stringify(precomputed.lite))
  writeFileSync(join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\n')
  const mdDir = join(outDir, 'md')
  mkdirSync(mdDir, { recursive: true })
  for (const ch of chapters) {
    const src = join(input.sourceBookDir, ch.file)
    if (existsSync(src)) copyFileSync(src, join(mdDir, `chapter-${ch.n}.md`))
  }

  pruneOldHashes(join(outDir, 'kb'), hash)
  return { hash, manifest, wrote }
}

function pruneOldHashes(kbDir: string, current: string): void {
  const dirs = readdirSync(kbDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[0-9a-f]{16}$/.test(d.name))
  for (const d of dirs) {
    if (d.name !== current) rmSync(join(kbDir, d.name), { recursive: true, force: true })
  }
}

export function llmsTxt(m: Manifest, chapters: Chapter[], stageIds: string[], scenarioIds: string[]): string {
  const c = m.counts
  const lines = [
    '# 高性价比人生指南 · 阶段重排版',
    '',
    `> ${m.attribution.derivedNotice} 上游：${m.attribution.title}（${m.attribution.repo}），${m.attribution.license}。`,
    `> 数据版本：上游 commit ${m.upstream.commitShort}；共 ${c.items} 条（A ${c.evidenceA} / B ${c.evidenceB} / C ${c.evidenceC}），${c.refs} 条文献链接，${c.disputed} 条争议标注，${c.unverified} 条待核实标注。`,
    '',
    '## 站点地图',
    '',
    '- / ：四个入口（阶段 / 处境 / 场景 / 习惯）',
    `- /stage/{id}/ ：阶段手册（${stageIds.join(' · ')}）`,
    '- /checkup/ ：处境体检（答案仅在浏览器本地与 URL # 片段，不上传）',
    `- /scenario/{id}/ ：场景指南（${scenarioIds.join(' · ')}）`,
    '- /checkin/ ：每日打卡（数据仅在本地）',
    '- /q/{uid}/ ：条目详情（uid 为 8 位稳定主键）',
    '- /chapter/{n}/ ：章节',
    '- /search/ ：检索',
    '- /about/ /about/method/ ：署名与方法',
    '',
    '## 章节',
    '',
    ...chapters.map((ch) => `- /chapter/${ch.n}/ 第${ch.n}章 ${ch.title}（${ch.uids.length} 条）`),
    '',
    '## 机读数据',
    '',
    '- /items.json ：全部条目 lite 视图',
    `- /kb/${m.hash}/items.json ：全量条目（含原文六字段）`,
    `- /kb/${m.hash}/manifest.json ：清单与计数`,
    '- /md/chapter-{n}.md ：章节原文（text/markdown）',
    '',
    '引用任何条目时请附带 uid 与本站 URL，并署名上游作者与许可证。',
    '',
  ]
  return lines.join('\n')
}

export function llmsFull(m: Manifest, chapters: Chapter[], items: Item[]): string {
  const byChapter = new Map<number, Item[]>()
  for (const it of items) {
    const arr = byChapter.get(it.source.chapter) ?? []
    arr.push(it)
    byChapter.set(it.source.chapter, arr)
  }
  const header = llmsTxt(m, chapters, [], []).split('## 章节')[0]!
  const out: string[] = [header, '## 全部条目', '']
  for (const ch of chapters) {
    out.push(`# 第${ch.n}章 ${ch.title}`, '', ch.intro, '')
    for (const it of byChapter.get(ch.n) ?? []) {
      const s = it.source
      out.push(
        `## [${it.uid}] 第${s.chapter}节第${s.index}条 ${s.title}`,
        '',
        `- 成本标签：钱=${s.tags.money} 时间=${s.tags.time} 毅力=${s.tags.willpower} 收益=${s.tags.benefit} 口径=${s.tags.caliber}`,
        `- 成本：${s.cost}`,
        `- 说人话：${s.plain}`,
        `- 收益：${s.benefit}`,
        `- 证据等级：${s.evidence}`,
        `- 来源：${s.refs}`,
        `- 备注：${s.note}`,
        '',
      )
    }
  }
  return out.join('\n')
}

export function readIfExists(p: string): string | undefined {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return undefined
  }
}
