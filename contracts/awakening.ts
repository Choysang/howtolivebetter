/**
 * contracts/awakening.ts
 * 认知觉醒入场动画、物理流场与交互状态机契约（只增不破）。
 * 遵循 erasable TypeScript，禁止 enum，纯数据类型与常量。
 */

/** 认知觉醒演化三阶段及终态 */
export type AwakeningPhase =
  | 'chaos'         // 阶段一：混沌熵增（0.0s - 2.4s）
  | 'attractors'    // 阶段二：五阶段吸引子与旋度流场（2.4s - 5.2s）
  | 'mobius'        // 阶段三：莫比乌斯罗盘点亮与量子字素凝结（5.2s - 8.0s）
  | 'crystallized'  // 终态：觉醒完成 / 极速直通（> 8.0s）

/** 五大生命阶段空间吸引子规范 */
export interface StageAttractorConfig {
  id: 'hs' | 'college' | 'early' | 'mid' | 'retire'
  name: string
  ageSpan: string
  thesis: string
  color: string        // CSS / Canvas 粒子高光色
  normalizedX: number  // 相对画布归一化坐标 [-1.0, 1.0]
  normalizedY: number
}

/** 觉醒入场物理与时间线配置 */
export interface AwakeningTimelineConfig {
  chaosDurationMs: number
  attractorDurationMs: number
  mobiusDurationMs: number
  totalDurationMs: number
  escapeWheelDelta: number
  escapeTouchDelta: number
}

/** 终极导引金句规范 */
export interface MasterMaxim {
  title: string
  subtitle: string
  philosophicalContext: {
    ontology: string      // 本体论：世界以主题铺陈
    existentialism: string // 存在论：生命按阶段决断
    epistemology: string   // 认识论：以循证为度刺破噪音
    cybernetics: string    // 控制论与系统论：在不可逆的时流中筑牢反脆弱
  }
}

/** 觉醒状态机客户端存储键 */
export const AWAKENING_STORAGE_KEY = 'htlb-awakened-v1'

/** 觉醒自定义事件名称 */
export const AWAKENING_EVENT_OPEN = 'open-awakening'

/** 终极导引金句只读常量 */
export const MASTER_MAXIM: MasterMaxim = {
  title: '世界以主题铺陈，生命按阶段决断。',
  subtitle: '以循证为度刺破噪音，在不可逆的时流中筑牢反脆弱。',
  philosophicalContext: {
    ontology: '客观现实的知识体系与社会规则按卫生、财富、职业等主题横向展开，浩瀚繁杂；',
    existentialism: '生命的体验与抉择受单向时间箭头制约，每个阶段面临非对称代价，必须在当下做出决断；',
    epistemology: '在信息爆炸与幸存者偏差的噪音丛林中，唯有严谨循证医学与统计学作为度量衡；',
    cybernetics: '直面系统的不确定性与冲击，建立弹性保底与斯多葛心理控制，化被动防御为反脆弱生长。',
  },
}

/** 默认演化时间轴常数（毫秒） */
export const DEFAULT_AWAKENING_TIMELINE: AwakeningTimelineConfig = {
  chaosDurationMs: 2400,
  attractorDurationMs: 2800,
  mobiusDurationMs: 2800,
  totalDurationMs: 8000,
  escapeWheelDelta: 35,
  escapeTouchDelta: 45,
}

/** 五大生命阶段空间吸引子拓扑配置 */
export const STAGE_ATTRACTORS: readonly StageAttractorConfig[] = [
  {
    id: 'hs',
    name: '高中生',
    ageSpan: '15-18 岁',
    thesis: '填报志愿与习惯底线',
    color: '#38bdf8', // 天空蓝
    normalizedX: -0.62,
    normalizedY: -0.38,
  },
  {
    id: 'college',
    name: '大学生',
    ageSpan: '18-22 岁',
    thesis: '实习试错与技能复利',
    color: '#34d399', // 翡翠绿
    normalizedX: 0.62,
    normalizedY: -0.38,
  },
  {
    id: 'early',
    name: '刚工作',
    ageSpan: '22-28 岁',
    thesis: '租房试用期与应急储蓄',
    color: '#10b981', // 核心翠绿
    normalizedX: -0.55,
    normalizedY: 0.42,
  },
  {
    id: 'mid',
    name: '中年期',
    ageSpan: '28-55 岁',
    thesis: '婚育养育与资产风控',
    color: '#f59e0b', // 琥珀金
    normalizedX: 0.55,
    normalizedY: 0.42,
  },
  {
    id: 'retire',
    name: '退休前后',
    ageSpan: '55 岁+',
    thesis: '养老医保与防诈防骗',
    color: '#a855f7', // 智慧紫
    normalizedX: 0.0,
    normalizedY: -0.65,
  },
]
