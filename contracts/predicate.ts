/**
 * 契约：适用条件 DSL（predicate）。
 * 编辑层用它声明「什么处境下这条建议更相关」；kernel/match.ts 在设备端求值。
 * 语义约定：事实未回答或为 uncertain 时，引用该事实的原子条件视为通过（不折叠）。
 */
import type { FactKey } from './facts.ts'

export type Predicate =
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  | { fact: FactKey; in: readonly string[] }

/** 结构校验：返回错误列表；空数组 = 合法。 */
export function validatePredicate(p: Predicate, path = 'root'): string[] {
  if (p === null || typeof p !== 'object') return [`${path}：谓词必须是对象`]
  if ('all' in p) {
    if (!Array.isArray(p.all) || p.all.length === 0) return [`${path}.all 必须是非空数组`]
    return p.all.flatMap((c, i) => validatePredicate(c as Predicate, `${path}.all[${i}]`))
  }
  if ('any' in p) {
    if (!Array.isArray(p.any) || p.any.length === 0) return [`${path}.any 必须是非空数组`]
    return p.any.flatMap((c, i) => validatePredicate(c as Predicate, `${path}.any[${i}]`))
  }
  if ('not' in p) return validatePredicate(p.not as Predicate, `${path}.not`)
  if ('fact' in p) {
    if (typeof p.fact !== 'string') return [`${path}.fact 必须是字符串`]
    if (!Array.isArray(p.in) || p.in.length === 0) return [`${path}.in 必须是非空数组`]
    if (p.in.some((v) => typeof v !== 'string')) return [`${path}.in 的值必须是字符串`]
    return []
  }
  return [`${path}：谓词缺少 all/any/not/fact 键`]
}
