/**
 * 契约：体检事实字段（facts）。
 * 全部为枚举值；每个枚举都含「不确定」（uncertain）。
 * 事实永不离开设备；「不确定」不触发任何折叠。
 */

export type FactKey =
  | 'age'
  | 'occupation'
  | 'housing'
  | 'commute'
  | 'family_elders'
  | 'family_kids_preschool'
  | 'family_kids_school'
  | 'family_pregnant'
  | 'health_chronic'
  | 'health_caregiver'
  | 'money_buffer'
  | 'smoke'
  | 'drink'
  | 'sedentary'
  | 'sleep'
  | 'drive'
  | 'tech'

export type FactValues = Partial<Record<FactKey, string>>

const UNCERTAIN = 'uncertain' as const

export const FACT_ENUMS: Readonly<Record<FactKey, readonly string[]>> = {
  age: ['under18', '18to22', '23to35', '36to55', '56plus', UNCERTAIN],
  occupation: ['hs-student', 'college-student', 'employed', 'self-employed', 'unemployed', 'retired', UNCERTAIN],
  housing: ['own', 'rent', 'with-family', 'dorm', UNCERTAIN],
  commute: ['none', 'short', 'long', UNCERTAIN],
  family_elders: ['yes', 'no', UNCERTAIN],
  family_kids_preschool: ['yes', 'no', UNCERTAIN],
  family_kids_school: ['yes', 'no', UNCERTAIN],
  family_pregnant: ['yes', 'no', UNCERTAIN],
  health_chronic: ['yes', 'no', UNCERTAIN],
  health_caregiver: ['yes', 'no', UNCERTAIN],
  money_buffer: ['six-months', 'one-to-six', 'none', 'debt', UNCERTAIN],
  smoke: ['yes', 'no', UNCERTAIN],
  drink: ['regular', 'occasional', 'none', UNCERTAIN],
  sedentary: ['yes', 'no', UNCERTAIN],
  sleep: ['less7', 'seven-eight', 'nine-plus', UNCERTAIN],
  drive: ['yes', 'no', UNCERTAIN],
  tech: ['yes', 'no', UNCERTAIN],
}

export const FACT_LABELS: Readonly<Record<FactKey, string>> = {
  age: '年龄段',
  occupation: '当前身份',
  housing: '住处',
  commute: '通勤',
  family_elders: '家里有老人要照应',
  family_kids_preschool: '有学龄前孩子',
  family_kids_school: '有上学的小孩',
  family_pregnant: '自己或伴侣怀孕',
  health_chronic: '确诊慢性病',
  health_caregiver: '长期照护病人',
  money_buffer: '应急资金',
  smoke: '吸烟',
  drink: '饮酒',
  sedentary: '久坐',
  sleep: '睡眠',
  drive: '开车或骑车',
  tech: '工作与写代码/技术相关',
}

/** 校验 facts：未知键报错；值必须属于该键的枚举。 */
export function validateFacts(facts: FactValues): string[] {
  const errors: string[] = []
  for (const key of Object.keys(facts)) {
    if (!(key in FACT_ENUMS)) { errors.push(`未知事实键：${key}`); continue }
    const val = facts[key as FactKey]
    if (val !== undefined && !FACT_ENUMS[key as FactKey]!.includes(val)) {
      errors.push(`事实 ${key} 的值 "${val}" 不在枚举内`)
    }
  }
  return errors
}
