/**
 * kernel/constitution.ts
 * 纯函数：将用户选定的关键原则编译为 Markdown 格式的《个人生活宪法》（零 I/O，≤ 60 行/函数）
 */
import type { PersonalConstitutionSpec } from '../contracts/cognitive.ts'

export function compilePersonalConstitution(spec: PersonalConstitutionSpec): string {
  const author = spec.userName?.trim() || '理性探索者'
  const lines: string[] = [
    `# 📜 《个人生活宪法》（MY_CONSTITUTION.md）`,
    `> 「${spec.motto}」`,
    ``,
    `- **签署立宪人**：${author}`,
    `- **最新生效日期**：${spec.lastUpdated}`,
    `- **存储属性**：物理级本地持久化 · 永不离开本设备`,
    ``,
    `---`,
    ``,
    `## 第一章：不可剥夺之底线与弹性保底行动（Floor Commitments）`,
    ``,
  ]

  spec.rules.forEach((rule, idx) => {
    lines.push(`### 第 ${idx + 1} 条：${rule.article}`)
    lines.push(`- **立宪依据**：${rule.rationale}`)
    lines.push(`- **【弹性地板】绝不妥协的 30 秒微动作**：\`${rule.floorCommitment}\``)
    if (rule.uids.length > 0) {
      lines.push(`- **循证支撑 UID**：${rule.uids.map((u) => `\`#${u}\``).join(', ')}`)
    }
    lines.push(``)
  })

  lines.push(`---`)
  lines.push(`## 第二章：斯多葛平静与免责条款`)
  lines.push(`1. 当遭遇不可抗力（疾病、突变、情绪崩溃）时，连续天数归零不构成自责理由。`)
  lines.push(`2. 只要在复原力潜伏期内执行一次【弹性地板微动作】，系统即判定为完全履约。`)
  lines.push(`3. 本宪法解释权完全归立宪人所有，每季度依据现实反馈修订一次。`)
  lines.push(``)

  return lines.join('\n')
}
