/**
 * 契约：认知辩证、心智透镜、反思模型与抗脆弱元数据契约（只增不破）。
 * 遵循 erasable TypeScript，禁止 enum，纯数据类型。
 */
import type { Predicate } from './predicate.ts'

/** 核心思维模型标识符（精选 12 类高杠杆模型，拒绝名词泛滥） */
export type MentalModelId =
  | 'first-principles'    // 第一性原理
  | 'inversion'           // 逆向思维（芒格自毁清单）
  | 'second-order'        // 二阶思维（长远后果）
  | 'opportunity-cost'    // 机会成本
  | 'pareto'              // 帕累托法则（80/20）
  | 'dichotomy-of-control'// 控制二分法（斯多葛学派）
  | 'loss-aversion'       // 损失厌恶
  | 'signaling'           // 信号传递理论
  | 'activation-energy'   // 活化能与摩擦力
  | 'survivorship-bias'   // 幸存者偏差
  | 'chestertons-fence'   // 切斯特顿围栏（拆除前先理解为何存在）
  | 'margin-of-safety'    // 安全边际

export interface CognitiveLens {
  id: MentalModelId
  name: string
  coreQuestion: string    // 戴上该透镜时对建议提出的核心反思问题
}

/** 辩证审判席三维结构 */
export interface SteelmanArgument {
  thesis: string          // 核心论点（一句话精要）
  rationale: string       // 最强立论依据
}

export interface FailureBoundary {
  condition: string       // 在什么极端或边界条件下该建议完全失效
  consequence: string     // 强行套用会导致什么破坏性后果
  remedy: string          // 替代保底策略
}

export interface SocraticQuestion {
  level: 'belief' | 'contradiction' | 'origin' | 'action'
  prompt: string          // 发问语句
  clarification?: string  // 深度追问引导
}

/** 条目辩证包 */
export interface DialecticDebate {
  lenses: MentalModelId[]
  pro: SteelmanArgument              // 正方最强钢人（Steelman Pro）
  con: SteelmanArgument              // 反方最强钢人（Steelman Con）
  boundary: FailureBoundary          // 失效边界
  socratic: SocraticQuestion         // 苏格拉底深思反省镜
}

/** 弹性习惯与抗脆弱元数据 */
export interface HabitElasticity {
  ceiling: string         // 理想状态天花板动作（精力充沛时）
  floor: string           // 弹性地板保底微动作（状态最差时 30 秒内可做）
  locusOfControl: 'internal' | 'external' | 'shared' // 斯多葛控制点
}

/** 场景事前验尸逆向防线 */
export interface AntiPlaybookItem {
  trap: string            // 典型毁灭性误区
  mechanism: string       // 为何大多数人会陷入
  vetoRule: string        // 一票否决安全红线
}

/** 个人生活宪法编译规范 */
export interface ConstitutionRule {
  article: string         // 条款名称（如：健康第一底线）
  rationale: string       // 决策依据
  floorCommitment: string // 哪怕最忙也绝不妥协的保底微动作
  uids: string[]          // 对应原书 UID
}

export interface PersonalConstitutionSpec {
  userName?: string
  lastUpdated: string
  motto: string
  rules: ConstitutionRule[]
}
