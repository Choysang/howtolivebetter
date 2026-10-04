/**
 * kernel/tokenize —— 中文分词与倒排检索（构建期与浏览器同一实现）。
 * Intl.Segmenter 零依赖；索引为两个倒排表（标题/正文），查询按命中加权。
 */

const CJK = /[\u4e00-\u9fff]/
const STOP_WORDS = new Set(['的', '了', '是', '在', '和', '与', '或', '等', '于', '之', '以', '得', '着', '过', '把', '被', '向', '自'])

export function tokenize(text: string): string[] {
  const seg = new Intl.Segmenter('zh', { granularity: 'word' })
  const tokens: string[] = []
  const rawSegments: string[] = []
  for (const s of seg.segment(text)) {
    const w = s.segment.trim().toLowerCase()
    if (!w) continue
    rawSegments.push(w)
    if (CJK.test(w)) {
      if (w.length >= 2) tokens.push(w)
    } else if (/^[a-z0-9][a-z0-9.-]{1,}$/.test(w)) {
      tokens.push(w)
    }
  }

  // 弹性兜底：若没有任何 token 产出（如高频单字“税”、“房”、“吃”、“睡”），提取非停用字的有效 CJK 单字
  if (tokens.length === 0) {
    for (const w of rawSegments) {
      if (CJK.test(w) && w.length === 1 && !STOP_WORDS.has(w)) {
        tokens.push(w)
      }
    }
  }

  return tokens
}

export interface InvertedIndex {
  /** token -> uid[]（标题命中） */
  t: Record<string, string[]>
  /** token -> uid[]（正文命中） */
  b: Record<string, string[]>
}

export interface IndexDoc {
  uid: string
  title: string
  body: string
}

function push(map: Record<string, string[]>, token: string, uid: string): void {
  const arr = map[token]
  if (arr === undefined) map[token] = [uid]
  else if (!arr.includes(uid)) arr.push(uid)
}

export function buildInverted(docs: IndexDoc[]): InvertedIndex {
  const idx: InvertedIndex = { t: {}, b: {} }
  for (const doc of docs) {
    for (const token of new Set(tokenize(doc.title))) push(idx.t, token, doc.uid)
    for (const token of new Set(tokenize(doc.body))) push(idx.b, token, doc.uid)
  }
  return idx
}

export interface QueryHit {
  uid: string
  score: number
}

export function queryIndex(idx: InvertedIndex, q: string, limit = 30): QueryHit[] {
  const scores = new Map<string, number>()
  for (const token of new Set(tokenize(q))) {
    for (const uid of idx.t[token] ?? []) scores.set(uid, (scores.get(uid) ?? 0) + 3)
    for (const uid of idx.b[token] ?? []) scores.set(uid, (scores.get(uid) ?? 0) + 1)
  }
  return [...scores.entries()]
    .map(([uid, score]) => ({ uid, score }))
    .sort((a, b) => b.score - a.score || (a.uid < b.uid ? -1 : 1))
    .slice(0, limit)
}
