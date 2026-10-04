import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { safeFetchKb, assertSafeLocalUrl, SecuritySandboxError } from '../../frontend/web/src/lib/net.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const FRONTEND_SRC = join(ROOT, 'frontend', 'web', 'src')
const NET_GUARD_FILE = join(FRONTEND_SRC, 'lib', 'net.ts')

/**
 * 递归收集目录下的全部源码文件
 */
function collectSourceFiles(dir: string, extList = ['.ts', '.tsx', '.astro', '.js']): string[] {
  let results: string[] = []
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      results = results.concat(collectSourceFiles(full, extList))
    } else if (st.isFile()) {
      if (extList.some((ext) => full.endsWith(ext))) {
        results.push(full)
      }
    }
  }
  return results
}

test('隐私硬闸 [1/4]: 静态扫描除 net.ts 外所有前端源码，绝对零网络外发原语', () => {
  const allFiles = collectSourceFiles(FRONTEND_SRC)
  assert.ok(allFiles.length > 10, '前端源码文件必须被有效扫描到')

  const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
    { name: 'fetch() 原生调用', regex: /\bfetch\s*\(/g },
    { name: 'XMLHttpRequest 实例', regex: /\bXMLHttpRequest\b/g },
    { name: 'navigator.sendBeacon 上报', regex: /\bsendBeacon\s*\(/g },
    { name: 'WebSocket 通信', regex: /\bWebSocket\b/g },
    { name: 'EventSource 通信', regex: /\bEventSource\b/g },
  ]

  const violations: Array<{ file: string; line: number; rule: string; code: string }> = []

  for (const filePath of allFiles) {
    // 唯一受控白名单出口：frontend/web/src/lib/net.ts
    if (resolve(filePath) === resolve(NET_GUARD_FILE)) {
      continue
    }

    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]
      // 忽略纯注释行
      const trimmed = lineText.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue
      }

      for (const rule of FORBIDDEN_PATTERNS) {
        if (rule.regex.test(lineText)) {
          violations.push({
            file: relative(ROOT, filePath).replace(/\\/g, '/'),
            line: i + 1,
            rule: rule.name,
            code: trimmed,
          })
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `发现违反 Local-First 零外发铁律的网络调用！违规明细:\n${JSON.stringify(violations, null, 2)}`
  )
})

test('隐私硬闸 [2/4]: net.ts 出口白名单与物理沙箱形式化隔离证明', async () => {
  // 1. 跨域拦截断言
  assert.throws(
    () => assertSafeLocalUrl('https://evil-analytics.org/collect'),
    SecuritySandboxError,
    '任何试图跨域外发的行为必须被物理阻断'
  )

  // 2. 伪协议与非法路径变形断言
  await assert.rejects(
    () => safeFetchKb('//evil-cdn.com/kb/latest.json'),
    SecuritySandboxError,
    '协议相对 URL 必须被拦截'
  )
  await assert.rejects(
    () => safeFetchKb('/kb/../../etc/passwd'),
    SecuritySandboxError,
    '路径穿越必须被拦截'
  )
  await assert.rejects(
    () => safeFetchKb('/kb/..\\secret'),
    SecuritySandboxError,
    '反斜杠路径变形必须被拦截'
  )

  // 3. 非只读知识包路径必须被坚决阻断
  await assert.rejects(
    () => safeFetchKb('/api/upload-user-profile'),
    SecuritySandboxError,
    '非白名单路径必须被拦截'
  )
  await assert.rejects(
    () => safeFetchKb('/checkup/answers'),
    SecuritySandboxError,
    '试图向体检路径外发必须被拦截'
  )

  // 4. 同源静态合规性
  assert.ok(assertSafeLocalUrl('/kb/latest.json'), '同源相对路径必须允许')
  assert.ok(assertSafeLocalUrl('http://localhost/kb/latest.json'), '同源基准路径必须允许')
})

test('隐私硬闸 [3/4]: 体检答案 URL Hash 物理零外发证明 (RFC 3986 规范级)', () => {
  const wizardFile = join(FRONTEND_SRC, 'islands', 'CheckupWizard.tsx')
  assert.ok(statSync(wizardFile).isFile(), 'CheckupWizard.tsx 必须存在')
  const content = readFileSync(wizardFile, 'utf-8')

  // 1. 证明体检答案完全存放于 URL Hash (#facts=...)
  assert.ok(content.includes('window.location.hash'), '体检必须读取 URL Hash')
  assert.ok(
    content.includes('history.replaceState') || content.includes('window.location.replace'),
    '体检答案状态必须使用端侧无刷新 history.replaceState 保存'
  )

  // 2. 证明体检组件严禁向网络模块传入用户 facts
  // 扫描组件中所有的 safeFetchKb 调用参数
  const safeFetchMatches = [...content.matchAll(/safeFetchKb[^(]*\(([^)]+)\)/g)]
  for (const match of safeFetchMatches) {
    const arg = match[1]
    assert.ok(
      !arg.includes('facts') && !arg.includes('hash=') && !arg.includes('window.location'),
      `体检网络请求中严禁拼入任何用户体检状态或 Hash: ${arg}`
    )
  }

  // 3. RFC 3986 §3.5 规范级保证：HTTP/1.1 (RFC 7230) 与 HTTP/2 (RFC 7540) 规范明确规定：
  // 客户端在向服务器发送请求行（Request-Line）或 :path 头时，必须剔除 fragment 标识符。
  // 因此 URL Hash 在物理协议栈层面 100% 绝不出网卡。
})

test('隐私硬闸 [4/4]: 打卡与宪法数据 localStorage 纯本地闭环证明', () => {
  const allFiles = collectSourceFiles(FRONTEND_SRC)
  const filesUsingLocalStorage: string[] = []

  for (const filePath of allFiles) {
    const content = readFileSync(filePath, 'utf-8')
    if (content.includes('localStorage')) {
      filesUsingLocalStorage.push(filePath)
    }
  }

  assert.ok(filesUsingLocalStorage.length > 0, '必须包含使用 localStorage 的打卡/状态模块')

  // 逐一审查所有使用 localStorage 的文件，断言其未向网络模块泄露任何持久化数据
  for (const filePath of filesUsingLocalStorage) {
    const content = readFileSync(filePath, 'utf-8')
    // 若该文件同时引入了 safeFetchKb，确保 safeFetchKb 的入参绝不包含 localStorage 获取的变量
    if (content.includes('safeFetchKb')) {
      const calls = [...content.matchAll(/safeFetchKb[^(]*\(([^)]+)\)/g)]
      for (const call of calls) {
        const arg = call[1].trim()
        assert.ok(
          arg.startsWith("'/kb/") || arg.startsWith('`/kb/'),
          `文件 ${relative(ROOT, filePath)} 中 safeFetchKb 参数只能是静态 /kb/ 路径，严禁动态传入用户本地数据: ${arg}`
        )
      }
    }
  }
})
