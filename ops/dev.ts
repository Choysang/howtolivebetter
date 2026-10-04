import { spawn, execSync } from 'node:child_process'
import { resolve, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

console.log('==> [1/2] 确保知识包已构建 (build:kb)...')
execSync('node ops/build-kb.ts', { cwd: ROOT, stdio: 'inherit' })

console.log('==> [2/2] 启动 Astro 开发服务器...')
const webDir = join(ROOT, 'frontend', 'web')
const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
})

devProcess.on('exit', (code) => {
  process.exit(code ?? 0)
})
