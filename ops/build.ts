import { execSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { existsSync } from 'node:fs'

const ROOT = resolve(import.meta.dirname, '..')

// 如果缺少上游缓存，自动执行初始浅克隆同步
if (!existsSync(join(ROOT, '.cache', 'upstream', '.git'))) {
  console.log('==> [0/2] 首次检测到缺少上游缓存，自动同步上游知识库 (sync)...')
  execSync('node ops/sync.ts', { cwd: ROOT, stdio: 'inherit' })
}

console.log('==> [1/2] 构建知识包 (build:kb)...')
execSync('node ops/build-kb.ts', { cwd: ROOT, stdio: 'inherit' })

console.log('==> [2/2] 构建 Astro 静态站点 (frontend/web/dist)...')
const webDir = join(ROOT, 'frontend', 'web')
execSync('npm run build', { cwd: webDir, stdio: 'inherit' })

console.log('==> 全量构建完成！产物位于 frontend/web/dist/')
