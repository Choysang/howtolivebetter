/**
 * kernel/uid —— 稳定主键：8 位 Crockford base32。
 * 纯 JS 实现（BigInt FNV-1a 64 → 取低 40 bit），Node 与浏览器结果一致。
 * 输入 = `${章号}:${NFC 规范化标题}`；同一上游 commit 下确定；碰撞由注册表检测并构建失败。
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const MASK40 = 0xffffffffffn

export function normalizeTitle(title: string): string {
  return title.normalize('NFC').trim().replace(/\s+/g, ' ')
}

function fnv1a64(input: string): bigint {
  let hash = FNV_OFFSET
  for (let i = 0; i < input.length; i++) {
    // 按 UTF-16 码元逐个混入（确定性优先：同一字符串在所有引擎里码元序列一致）
    hash ^= BigInt(input.charCodeAt(i) & 0xffff)
    hash = (hash * FNV_PRIME) & 0xffffffffffffffffn
  }
  return hash
}

export function uidFor(chapter: number, title: string): string {
  const digest = fnv1a64(`${chapter}:${normalizeTitle(title)}`) & MASK40
  let out = ''
  for (let i = 0; i < 8; i++) {
    out = CROCKFORD[Number(digest >> BigInt(5 * i)) & 0x1f] + out
  }
  return out
}

const CROCKFORD_EXCLUDED = ['I', 'L', 'O', 'U']

export function isValidUid(s: string): boolean {
  return (
    typeof s === 'string' &&
    /^[0-9A-Z]{8}$/.test(s) &&
    !CROCKFORD_EXCLUDED.some((c) => s.includes(c))
  )
}
