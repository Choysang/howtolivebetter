/**
 * kernel/match —— 处境匹配（设备端执行；同一实现也是未来 MCP match_situation 的内核）。
 * 必须成立的性质：
 *   1) 输出是输入的划分：每条规则恰好落进一个桶（核心/相关/折叠/兜底），只折叠不删除；
 *   2) always 条目必在兜底桶；
 *   3) 事实未回答或为 uncertain 时，引用该事实的原子条件视为通过（不触发折叠）。
 */
import type { Predicate } from '../contracts/predicate.ts'
import type { FactValues, FactKey } from '../contracts/facts.ts'
import { FACT_LABELS } from '../contracts/facts.ts'
import type { Axis, MatchRule } from '../contracts/kb.ts'

export type Tier = 'core' | 'related' | 'collapsed' | 'fallback'

export interface MatchResult {
  uid: string
  axis: Axis
  tier: Tier
  why: string
}

export function evalPredicate(p: Predicate, facts: FactValues): boolean {
  if ('all' in p) return p.all.every((c) => evalPredicate(c, facts))
  if ('any' in p) return p.any.some((c) => evalPredicate(c, facts))
  if ('not' in p) return !evalPredicate(p.not, facts)
  const val = facts[p.fact as FactKey]
  if (val === undefined || val === 'uncertain') return true
  return p.in.includes(val)
}

/** 谓词的人读描述（「为什么出现在这里」）。 */
export function describePredicate(p: Predicate): string {
  if ('all' in p) return p.all.map(describePredicate).join(' 且 ')
  if ('any' in p) return p.any.map(describePredicate).join(' 或 ')
  if ('not' in p) return `非（${describePredicate(p.not)}）`
  const label = FACT_LABELS[p.fact as FactKey] ?? p.fact
  return `${label}：${p.in.join(' / ')}`
}

export function matchSituation(facts: FactValues, rules: MatchRule[]): MatchResult[] {
  const out: MatchResult[] = []
  for (const rule of rules) {
    const tier: Tier = rule.always
      ? 'fallback'
      : rule.pred === undefined
        ? 'related'
        : evalPredicate(rule.pred, facts)
          ? 'core'
          : 'collapsed'
    out.push({
      uid: rule.uid,
      axis: rule.axis,
      tier,
      why: rule.always
        ? '兜底：任何处境都该知道'
        : rule.pred === undefined
          ? '普适条目'
          : describePredicate(rule.pred),
    })
  }
  return out
}
