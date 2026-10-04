/**
 * ops/build-kb —— 管线 CLI：parse → register → resolve → overlay → precompute → emit。
 * 用法：
 *   node ops/build-kb.ts                     # 真实上游（需先 npm run sync）
 *   node ops/build-kb.ts --source fixtures   # 迷你书（测试/前端早期开发）
 *   node ops/build-kb.ts --idempotency-gate  # 幂等硬闸：两跑同哈希
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { execSync } from 'node:child_process'
import { parseChapter, type ParsedChapter } from '../backend/pipeline/parse.ts'
import { parseRegistry, registerUids, registryToString, type RegistryLine } from '../backend/pipeline/register.ts'
import { resolveXrefs } from '../backend/pipeline/resolve.ts'
import { applyOverlay } from '../backend/pipeline/overlay.ts'
import { precompute } from '../backend/pipeline/precompute.ts'
import { emit } from '../backend/pipeline/emit.ts'
import { validateBundle, type BundleShape, type Chapter, type EditorialSpec, type Item } from '../contracts/kb.ts'

const ROOT = resolvePath(import.meta.dirname, '..')
const args = process.argv.slice(2)
const sourceIdx = args.indexOf('--source')
const source = sourceIdx >= 0 && args[sourceIdx + 1] === 'fixtures' ? 'fixtures' : 'real'
const gate = args.includes('--idempotency-gate')

interface SourceConf {
  bookDir: string
  outDir: string
  registryFile: string
  commit: string
  repo: string
  editorial: EditorialSpec
}

async function loadConf(mode: 'real' | 'fixtures'): Promise<SourceConf> {
  if (mode === 'fixtures') {
    const ed = (await import('../contracts/fixtures/editorial.ts')).default
    return {
      bookDir: join(ROOT, 'contracts', 'fixtures', 'book'),
      outDir: join(ROOT, '.cache', 'kb-fixtures'),
      registryFile: join(ROOT, 'data', 'id-registry.fixtures.jsonl'),
      commit: 'fixtures0000000000000000000000000000000000000000',
      repo: 'fixtures://local',
      editorial: ed,
    }
  }
  const lockFile = join(ROOT, 'data', 'upstream.lock.json')
  if (!existsSync(lockFile)) {
    throw new Error('缺少 data/upstream.lock.json：请先运行 npm run sync')
  }
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { repo: string; commit: string }
  const cache = join(ROOT, '.cache', 'upstream')
  let head = ''
  try {
    head = execSync('git rev-parse HEAD', { cwd: cache, encoding: 'utf8' }).trim()
  } catch {
    throw new Error('缺少 .cache/upstream：请先运行 npm run sync')
  }
  if (head !== lock.commit) {
    throw new Error(`锁文件 commit ${lock.commit.slice(0, 7)} 与缓存 HEAD ${head.slice(0, 7)} 不一致：请先 npm run sync`)
  }
  const ed = (await import('../backend/editorial/index.ts')).default
  return {
    bookDir: join(cache, 'book'),
    outDir: join(ROOT, 'frontend', 'web', 'public'),
    registryFile: join(ROOT, 'data', 'id-registry.jsonl'),
    commit: lock.commit,
    repo: lock.repo,
    editorial: ed,
  }
}

function runOnce(conf: SourceConf, registry: RegistryLine[], outDir: string) {
  const files = readdirSync(conf.bookDir).filter((f) => f.endsWith('.md')).sort()
  if (files.length === 0) throw new Error(`${conf.bookDir} 下没有章节文件`)
  const parsed: ParsedChapter[] = files.map((f) => parseChapter(f, readFileSync(join(conf.bookDir, f), 'utf8')))

  const reg = registerUids(parsed, registry)
  if (reg.renamed.length) {
    console.log(`改名续接 ${reg.renamed.length} 条：`)
    for (const a of reg.renamed) console.log(`  第${a.chapter}章「${a.prevTitle}」→「${a.title}」（沿用 ${a.uid}）`)
  }

  const items: Item[] = []
  const chapters: Chapter[] = []
  for (const ch of parsed) {
    const uids: string[] = []
    for (const src of ch.items) {
      const uid = reg.uidByChapterIndex.get(`${ch.n}|${src.index}`)!
      items.push({
        uid,
        source: src,
        overlay: {},
        derived: { uid, stageTiers: {}, scenarios: [], xrefs: [] },
      })
      uids.push(uid)
    }
    chapters.push({ n: ch.n, title: ch.title, file: ch.file, intro: ch.intro, uids })
  }

  const resolveResult = resolveXrefs(items)
  if (resolveResult.unresolved.length) {
    console.log(`交叉引用未解析 ${resolveResult.unresolved.length} 处（保留为纯文本）：`)
    for (const x of resolveResult.unresolved.slice(0, 10)) console.log(`  ${x}`)
  }

  const { rules, sensitiveAuto } = applyOverlay(items, conf.editorial, reg.removedUids)
  if (sensitiveAuto.length) {
    console.log(`敏感条目自动扫描命中 ${sensitiveAuto.length} 条（不进精华/打卡/体检）`)
  }

  const pre = precompute(items, chapters, conf.editorial)

  const bundle: BundleShape = {
    items,
    chapters,
    stages: conf.editorial.stages,
    scenarios: conf.editorial.scenarios,
    checkup: conf.editorial.checkup,
    checkin: conf.editorial.checkin,
    manifest: {
      schemaVersion: '1.0.0',
      upstream: { repo: conf.repo, commit: conf.commit, commitShort: conf.commit.slice(0, 7) },
      hash: '0'.repeat(16),
      counts: {
        items: 0, chapters: 0, refs: 0, disputed: 0, unverified: 0,
        evidenceA: 0, evidenceB: 0, evidenceC: 0, sensitive: 0,
        stages: conf.editorial.stages.length, scenarios: conf.editorial.scenarios.length,
        checkinItems: conf.editorial.checkin.items.length,
      },
      attribution: {
        title: '', author: '', repo: '', license: 'CC BY 4.0', licenseUrl: '', derivedNotice: '',
      },
    },
  }
  const errors = validateBundle(bundle)
  if (errors.length) throw new Error(`整包校验失败：\n  ${errors.join('\n  ')}`)

  const result = emit({
    outDir,
    items,
    chapters,
    editorial: conf.editorial,
    rules,
    precomputed: pre,
    upstream: { repo: conf.repo, commit: conf.commit },
    sourceBookDir: conf.bookDir,
  })
  return { result, reg }
}

async function main() {
  const conf = await loadConf(source)
  const existing = existsSync(conf.registryFile) ? readFileSync(conf.registryFile, 'utf8') : ''
  const registry = parseRegistry(existing)

  if (gate) {
    const dir1 = join(ROOT, '.cache', 'gate-1')
    const dir2 = join(ROOT, '.cache', 'gate-2')
    for (const d of [dir1, dir2]) rmSync(d, { recursive: true, force: true })
    const pass1 = runOnce(conf, registry, dir1)
    const pass2 = runOnce(conf, pass1.reg.appended, dir2)
    if (pass1.result.hash !== pass2.result.hash) {
      throw new Error(`幂等闸失败：两次构建哈希不同（${pass1.result.hash} vs ${pass2.result.hash}）`)
    }
    rmSync(dir1, { recursive: true, force: true })
    rmSync(dir2, { recursive: true, force: true })
    console.log(`幂等闸通过：${pass1.result.hash}`)
    return
  }

  const { result, reg } = runOnce(conf, registry, conf.outDir)
  if (reg.appended.length) {
    mkdirSync(join(ROOT, 'data'), { recursive: true })
    writeFileSync(conf.registryFile, existing + registryToString(reg.appended))
    console.log(`注册表追加 ${reg.appended.length} 行`)
  }
  const c = result.manifest.counts
  console.log(
    `知识包 ${result.hash} → ${conf.outDir}\\kb\\${result.hash}\\` +
      `（${c.items} 条 / ${c.chapters} 章 / A${c.evidenceA} B${c.evidenceB} C${c.evidenceC}` +
      ` / 争议 ${c.disputed} / 待核实 ${c.unverified} / 文献链接 ${c.refs} / 敏感 ${c.sensitive}）`,
  )
}

main().catch((err) => {
  console.error(String(err))
  process.exit(1)
})
