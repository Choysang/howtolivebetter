import { execSync } from 'node:child_process'
import { resolve, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

console.log('==> [1/2] 构建知识包 (build:kb)...')
execSync('node ops/build-kb.ts', { cwd: ROOT, stdio: 'inherit' })

console.log('==> [2/2] 构建 Astro 静态站点 (frontend/web/dist)...')
const webDir = join(ROOT, 'frontend', 'web')
execSync('npm run build', { cwd: webDir, stdio: 'inherit' })

console.log('==> 全量构建完成！产物位于 frontend/web/dist/')
