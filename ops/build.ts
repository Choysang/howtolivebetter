import { execSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'

const ROOT = resolve(import.meta.dirname, '..')

// 如果缺少上游缓存，自动执行初始浅克隆同步
if (!existsSync(join(ROOT, '.cache', 'upstream', '.git'))) {
  console.log('==> [0/2] 首次检测到缺少上游缓存，自动同步上游知识库 (sync)...')
  execSync('node ops/sync.ts', { cwd: ROOT, stdio: 'inherit' })
}

console.log('==> [1/2] 构建知识包 (build:kb)...')
execSync('node ops/build-kb.ts', { cwd: ROOT, stdio: 'inherit' })

console.log('==> [2/3] 构建 Astro 静态站点 (frontend/web/dist)...')
const webDir = join(ROOT, 'frontend', 'web')
execSync('npm run build', { cwd: webDir, stdio: 'inherit' })

// [3/3] 若配置了非根 ASTRO_BASE (如 GitHub Pages 子路径 /howtolivebetter)，规范化产物 HTML 内部链接
const rawBase = (process.env.ASTRO_BASE || '').trim().replace(/^\/|\/$/g, '')
if (rawBase && rawBase !== '') {
  console.log(`==> [3/3] 正在为子路径部署 (/${rawBase}) 自动规范化 dist HTML 内部链接...`)
  const distDir = join(webDir, 'dist')

  function processDir(dir: string) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const st = statSync(fullPath)
      if (st.isDirectory()) {
        processDir(fullPath)
      } else if (st.isFile() && entry.endsWith('.html')) {
        const content = readFileSync(fullPath, 'utf-8')
        const rewritten = content.replace(/\b(href|action)=(["'])\/([^"'>\s]*)\2/g, (match, attr, quote, path) => {
          if (path.startsWith('/') || path === rawBase || path.startsWith(rawBase + '/')) {
            return match
          }
          const target = path ? `/${rawBase}/${path}` : `/${rawBase}/`
          return `${attr}=${quote}${target}${quote}`
        })
        if (rewritten !== content) {
          writeFileSync(fullPath, rewritten, 'utf-8')
        }
      }
    }
  }

  if (existsSync(distDir)) {
    processDir(distDir)
  }
}

console.log('==> 全量构建完成！产物位于 frontend/web/dist/')

