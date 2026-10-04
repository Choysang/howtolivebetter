/**
 * 编辑层：标记。
 * sensitive：不进精华榜、不进打卡、不进体检（页面常驻求助渠道 12356）；autoScanKeywords 兜底自动扫描。
 * always：任何处境都该知道的兜底条目，体检报告常驻「兜底」区。
 */
import type { EditorialSpec } from '../../contracts/kb.ts'

export const flags: EditorialSpec['flags'] = {
  autoScanKeywords: ['自杀', '自残', '轻生', '结束自己的生命'],
  sensitive: [],
  always: [
    'KRS4W7WX', // 13-1 有人倒地没呼吸，立刻按压，让旁人打 120 找 AED
    'NKBYM262', // 13-3 卒中三征：嘴歪、一侧没劲、说不清，立刻 120
    'QNA0RZQE', // 13-7 胸口压着疼超 15 分钟不缓解，打 120 别自己开车
    '6WC54GJX', // 13-12 大出血先死死压住，同时打 120
    '7WSBJSGD', // 13-14 烫伤立刻凉水冲 20 分钟，别抹牙膏酱油
    'CYTDQWCP', // 13-26 噎住：5 次拍背加 5 次腹部冲击
    'ABBNJ2VW', // 8-1 交通事故先停车、救人、报警，不要跑
    'D0XKG7DG', // 8-2 被骗立刻打 110/96110 要求止付
    'MH89YZBC', // 8-10 起了冲突先报警不动手
    'N2F53VVH', // 8-41 可能翻脸的谈话直接开录音
    '04ER4HY3', // 8-42 现场留证：先全景、再位置、后细节，原图别删
    'S1RRBFHS', // 8-39 报警当场要受案回执
  ],
}
