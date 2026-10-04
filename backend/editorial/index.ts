/** 编辑层入口：只导出纯数据（JSON 可往返）。 */
import type { EditorialSpec } from '../../contracts/kb.ts'
import { stages } from './stages.ts'
import { picks } from './picks.ts'
import { rankConfig } from './rank.config.ts'
import { scenarios } from './scenarios.ts'
import { checkup } from './checkup.ts'
import { applicability } from './applicability.ts'
import { flags } from './flags.ts'
import { checkin } from './checkin.ts'

const editorial: EditorialSpec = {
  stages,
  picks,
  rankConfig,
  scenarios,
  checkup,
  applicability,
  flags,
  checkin,
}

export default editorial
