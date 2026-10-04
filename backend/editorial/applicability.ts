/**
 * 编辑层：章级适用条件（体检匹配的默认谓词）。
 * 语义：无谓词 = 普适（相关档）；谓词真 = 核心；假 = 折叠；uncertain / 未答 = 通过（不折叠）。
 * 逐条覆盖在 overrides 中（picks / 场景 / 高频条目优先）。
 */
import type { ApplicabilitySpec } from '../../contracts/kb.ts'

export const applicability: ApplicabilitySpec = {
  chapterDefaults: {
    // 7 没钱的时候怎么活：没钱 / 失业的人最需要
    7: { any: [{ fact: 'money_buffer', in: ['none', 'debt'] }, { fact: 'occupation', in: ['unemployed'] }] },
    // 10 恋爱结婚：成年以后
    10: { any: [{ fact: 'age', in: ['18to22', '23to35', '36to55', '56plus'] }] },
    // 15 租房买房：租客与准备买房的人
    15: { any: [{ fact: 'housing', in: ['rent'] }, { fact: 'money_buffer', in: ['six-months', 'one-to-six'] }] },
    // 16 慢病：确诊 / 照护 / 有老人 / 年长
    16: { any: [{ fact: 'health_chronic', in: ['yes'] }, { fact: 'health_caregiver', in: ['yes'] }, { fact: 'family_elders', in: ['yes'] }, { fact: 'age', in: ['56plus'] }] },
    // 17 家里有老人
    17: { any: [{ fact: 'family_elders', in: ['yes'] }, { fact: 'age', in: ['56plus'] }] },
    // 18 养孩子划不划算：育龄决策
    18: { any: [{ fact: 'age', in: ['23to35', '36to55'] }, { fact: 'family_pregnant', in: ['yes'] }] },
    // 19 在职离职工伤：有工作或刚失去工作
    19: { any: [{ fact: 'occupation', in: ['employed', 'self-employed', 'unemployed'] }] },
    // 20 刚出生的孩子
    20: { any: [{ fact: 'family_pregnant', in: ['yes'] }, { fact: 'family_kids_preschool', in: ['yes'] }] },
    // 23 学什么技能：年轻 / 学生 / 待业转型
    23: { any: [{ fact: 'age', in: ['under18', '18to22', '23to35'] }, { fact: 'occupation', in: ['hs-student', 'college-student', 'unemployed'] }] },
    // 24 看病：慢病 / 年长 / 照护
    24: { any: [{ fact: 'health_chronic', in: ['yes'] }, { fact: 'health_caregiver', in: ['yes'] }, { fact: 'age', in: ['56plus'] }, { fact: 'family_elders', in: ['yes'] }] },
    // 25 人走了以后：有老人 / 年长（提前了解）
    25: { any: [{ fact: 'family_elders', in: ['yes'] }, { fact: 'age', in: ['36to55', '56plus'] }] },
    // 26 做网站平台：技术人
    26: { fact: 'tech', in: ['yes'] },
    // 27 怀孕和生产
    27: { fact: 'family_pregnant', in: ['yes'] },
    // 28 别为外形搞坏身体：年轻人高发
    28: { any: [{ fact: 'age', in: ['under18', '18to22', '23to35'] }] },
    // 30 上学以后的孩子
    30: { fact: 'family_kids_school', in: ['yes'] },
    // 31 十八岁之后有哪几条路：临近成年
    31: { any: [{ fact: 'age', in: ['under18', '18to22'] }, { fact: 'occupation', in: ['hs-student', 'college-student'] }] },
    // 32 出国留学
    32: { any: [{ fact: 'age', in: ['under18', '18to22', '23to35'] }, { fact: 'occupation', in: ['hs-student', 'college-student'] }] },
    // 33 残疾之后怎么活：普适了解（意外谁都可能遇上）
    // 1/2/3/4/5/6/8/9/11/12/13/14/21/22/29/34：普适（无谓词）
  },
  overrides: [],
}
