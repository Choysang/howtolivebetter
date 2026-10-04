/**
 * ops/sync —— 上游同步与轮询。
 *   node ops/sync.ts                          # 单次：克隆或快进 .cache/upstream，写 data/upstream.lock.json
 *   node ops/sync.ts --watch --interval 3600  # 常驻：上游变化时自动同步并触发全量构建
 * 要点：core.autocrlf 永久关闭（防 CRLF 破坏可复现哈希）；不 fork、不改上游。
 */
import { execSync } from 'node:child_process'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { spawnSync } from 'node:child_process'

const REPO = 'https://github.com/eternity4719/HowToLiveBetter.git'
const BRANCH = 'main'
const ROOT = resolvePath(import.meta.dirname, '..')
const CACHE = join(ROOT, '.cache', 'upstream')
const LOCK = join(ROOT, 'data', 'upstream.lock.json')

const git = (...args: string[]): string =>
  execSync(`git -c core.autocrlf=false ${args.join(' ')}`, { cwd: existsSync(CACHE) ? CACHE : ROOT, encoding: 'utf8' }).trim()

function localHead(): string | null {
  if (!existsSync(join(CACHE, '.git'))) return null
  return execSync('git rev-parse HEAD', { cwd: CACHE, encoding: 'utf8' }).trim()
}

function ensureClone(): void {
  if (existsSync(join(CACHE, '.git'))) return
  mkdirSync(join(ROOT, '.cache'), { recursive: true })
  execSync(`git -c core.autocrlf=false clone --depth 1 --branch ${BRANCH} ${REPO} "${CACHE}"`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  })
  // 持久关闭 autocrlf，后续 fetch/reset 不受全局配置影响
  execSync('git config core.autocrlf false', { cwd: CACHE, encoding: 'utf8' })
}

function fetchUpstream(): string {
  execSync('git -c core.autocrlf=false fetch --depth 1 origin main', { cwd: CACHE, encoding: 'utf8', stdio: 'pipe' })
  execSync('git -c core.autocrlf=false reset --hard FETCH_HEAD', { cwd: CACHE, encoding: 'utf8', stdio: 'pipe' })
  return localHead()!
}

function writeLock(commit: string): void {
  mkdirSync(join(ROOT, 'data'), { recursive: true })
  writeFileSync(LOCK, JSON.stringify({ repo: REPO, branch: BRANCH, commit, syncedAt: new Date().toISOString() }, null, 2) + '\n')
}

function runFullBuild(): void {
  console.log('[sync] 触发全量构建（build-kb + astro build）…')
  const r = spawnSync(process.execPath, [join(ROOT, 'ops', 'build.ts')], { stdio: 'inherit', cwd: ROOT })
  if (r.status !== 0) console.error('[sync] 构建失败，保留已同步的上游；修复后手动 npm run build')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const watch = args.includes('--watch')
  const intervalIdx = args.indexOf('--interval')
  const intervalSec = intervalIdx >= 0 ? Number(args[intervalIdx + 1]) : 3600
  if (!Number.isFinite(intervalSec) || intervalSec < 60) {
    throw new Error('--interval 最小 60 秒')
  }

  ensureClone()
  const remoteHead = git('ls-remote', REPO, 'HEAD').split('\t')[0]!
  let head = localHead()

  if (head === remoteHead) {
    console.log(`[sync] 上游无变化（${remoteHead.slice(0, 7)}）`)
  } else {
    head = fetchUpstream()
    console.log(`[sync] 已更新到 ${head.slice(0, 7)}`)
  }
  writeLock(head)

  if (!watch) return

  console.log(`[sync] 轮询模式：每 ${intervalSec}s 检查一次上游，变化即自动构建（Ctrl+C 退出）`)
  let last = localHead()
  for (;;) {
    await new Promise((r) => setTimeout(r, intervalSec * 1000))
    let remote = ''
    try {
      remote = git('ls-remote', REPO, 'HEAD').split('\t')[0]!
    } catch (err) {
      console.error(`[sync] ls-remote 失败（网络？），下轮重试：${String(err).slice(0, 120)}`)
      continue
    }
    if (remote === last) continue
    const got = fetchUpstream()
    writeLock(got)
    console.log(`[sync] ${new Date().toISOString()} 上游更新：${last!.slice(0, 7)} → ${got.slice(0, 7)}`)
    last = got
    runFullBuild()
  }
}

main().catch((err) => {
  console.error(String(err))
  process.exit(1)
})
