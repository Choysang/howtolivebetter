/**
 * frontend/web/src/lib/net.ts
 * 全站唯一网络出口守卫（物理级 Local-First 零泄露沙箱）
 * 铁律：除白名单内的只读静态知识包（GET /kb/*）外，严禁任何数据外发。
 */

export class SecuritySandboxError extends Error {
  constructor(message: string) {
    super(`[Local-First Security] ${message}`)
    this.name = 'SecuritySandboxError'
  }
}

const ALLOWED_GET_PREFIXES = [
  '/kb/',
  '/favicon.svg',
] as const

// 内存单例只读缓存，阻断重复网络 I/O，践行 Local-First 极限性能
const kbCache = new Map<string, unknown>()

/**
 * 安全只读获取知识包数据
 */
export async function safeFetchKb<T>(path: string): Promise<T> {
  // 1. 规范化路径检查（阻断协议相对 URL、路径穿透 ../ 与伪协议）
  if (path.startsWith('//') || path.includes('..') || path.includes('\\')) {
    throw new SecuritySandboxError(`检测到非法路径变形尝试: ${path}`)
  }

  // 2. 路径白名单静态守卫
  const isAllowed = ALLOWED_GET_PREFIXES.some((prefix) => path.startsWith(prefix))
  if (!isAllowed) {
    throw new SecuritySandboxError(`阻断访问非白名单路径: ${path}。全站遵循 Local-First 零外发铁律！`)
  }

  // 3. 检查内存单例缓存
  if (kbCache.has(path)) {
    return kbCache.get(path) as T
  }

  // 4. 纯客户端只读 GET 请求，不携带凭证与外部参数
  const response = await fetch(path, {
    method: 'GET',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`加载知识包失败 (${response.status}): ${path}`)
  }

  const data = (await response.json()) as T
  kbCache.set(path, data)
  return data
}

/**
 * 校验指定 URL 是否符合 Local-First 零外发安全边界
 */
export function assertSafeLocalUrl(urlStr: string): boolean {
  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const url = new URL(urlStr, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
    if (url.origin !== baseOrigin) {
      throw new SecuritySandboxError(`跨域网络请求被物理拦截: ${urlStr}`)
    }
    return true
  } catch (e) {
    if (e instanceof SecuritySandboxError) throw e
    return false
  }
}
