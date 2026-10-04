import { createServer, type Server } from 'node:http'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { join, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8',
}

export function createStaticServer(targetDir: string = 'frontend/web/dist'): Server {
  const resolvedTarget = resolve(targetDir)

  return createServer((req, res) => {
    let urlPath = '/'
    try {
      urlPath = decodeURIComponent(req.url?.split('?')[0] || '/')
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('400 Bad Request')
      return
    }

    // 防御路径穿越（Path Traversal / CWE-22）
    const normalizedPath = resolve(resolvedTarget, '.' + (urlPath.startsWith('/') ? urlPath : '/' + urlPath))
    if (!normalizedPath.startsWith(resolvedTarget)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('403 Forbidden')
      return
    }

    let filePath = normalizedPath
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html')
    } else if (!existsSync(filePath) && existsSync(filePath + '.html')) {
      filePath = filePath + '.html'
    }

    // 再次核验合成后的文件仍在 resolvedTarget 内
    if (!resolve(filePath).startsWith(resolvedTarget)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('403 Forbidden')
      return
    }

    if (!existsSync(filePath)) {
      // 尝试 404.html
      const notFound = join(resolvedTarget, '404.html')
      if (existsSync(notFound)) {
        res.writeHead(404, { 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        })
        res.end(readFileSync(notFound))
        return
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found')
      return
    }

    const ext = extname(filePath).toLowerCase()
    const contentType = MIME[ext] || 'application/octet-stream'

    // 安全响应头与不可变缓存头
    const headers: Record<string, string> = { 
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }

    if (urlPath.startsWith('/_astro/') || (urlPath.startsWith('/kb/') && !urlPath.endsWith('/latest.json'))) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    } else if (urlPath === '/kb/latest.json') {
      headers['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=300'
    }

    res.writeHead(200, headers)
    res.end(readFileSync(filePath))
  })
}

// CLI 直接运行支持
const currentFilePath = fileURLToPath(import.meta.url)
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(currentFilePath)

if (isMain) {
  const args = process.argv.slice(2)
  const targetDir = resolve(args[0] || 'frontend/web/dist')
  const port = Number(process.env.PORT || 3000)
  const server = createStaticServer(targetDir)

  server.listen(port, () => {
    console.log(`预览服务运行于: http://localhost:${port}`)
    console.log(`静态目录: ${targetDir}`)
  })
}
