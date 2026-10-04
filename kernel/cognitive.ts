/**
 * kernel/cognitive.ts
 * 纯函数：认知模型解析、辩证审判与发问匹配（零 I/O，≤ 60 行/函数）
 */
import type { Item } from '../contracts/kb.ts'
import type { MentalModelId, DialecticDebate, SocraticQuestion } from '../contracts/cognitive.ts'

export const MENTAL_MODELS: Record<MentalModelId, { name: string; coreQuestion: string }> = {
  'first-principles': { name: '第一性原理', coreQuestion: '抛开惯例，这件事最底层的物理或生理事实是什么？' },
  'inversion': { name: '逆向思维', coreQuestion: '如果想让这件事彻底失败，最有效的做法是什么？' },
  'second-order': { name: '二阶思维', coreQuestion: '短期收益兑现之后，6 个月至 3 年后会引发什么副作用？' },
  'opportunity-cost': { name: '机会成本', coreQuestion: '花在这上面的时间与金钱，放弃了哪项最高价值的替代方案？' },
  'pareto': { name: '帕累托 80/20', coreQuestion: '产生该收益的核心 20% 关键抓手具体是哪一个微动作？' },
  'dichotomy-of-control': { name: '控制二分法', coreQuestion: '这里面哪些部分完全由我掌控，哪些我根本无法改变？' },
  'loss-aversion': { name: '损失厌恶', coreQuestion: '我是为了避免某种潜在损失，才过度投入资源的吗？' },
  'signaling': { name: '信号传递', coreQuestion: '这一行为是在真实改善生活，还是在向他人传递虚荣信号？' },
  'activation-energy': { name: '活化能门槛', coreQuestion: '执行此建议的起始物理摩擦阻力能否压缩到 20 秒以内？' },
  'survivorship-bias': { name: '幸存者偏差', coreQuestion: '那些照做却失败的大多数人，他们的沉默数据在哪里？' },
  'chestertons-fence': { name: '切斯特顿围栏', coreQuestion: '在改变旧习惯前，旧习惯曾保护了我免受什么伤害？' },
  'margin-of-safety': { name: '安全边际', coreQuestion: '如果现实情况比预期恶化 50%，这个方案还能兜底吗？' },
}

/** 提取条目的辩证审判包 */
export function resolveDialectic(item: Item): DialecticDebate | null {
  return item.overlay?.dialectic ?? null
}

/** 按特定心智透镜过滤条目 */
export function filterItemsByMentalModel(items: Item[], modelId: MentalModelId): Item[] {
  return items.filter((it) => it.overlay?.dialectic?.lenses?.includes(modelId))
}

/** 依据用户反思阶段获取发问提示 */
export function getSocraticPrompt(item: Item): SocraticQuestion | null {
  return item.overlay?.dialectic?.socratic ?? null
}

import type { AntiPlaybookItem } from '../contracts/cognitive.ts'

export const SCENARIO_ANTI_PLAYBOOKS: Record<string, AntiPlaybookItem[]> = {
  'laid-off': [
    {
      trap: '被通知当天在慌乱与自责中，立刻签署任何「主动离职」或「协商一致免责」协议。',
      mechanism: '人在突遭打击时急于逃离压抑尴尬的谈判现场，潜意识顺从 HR 话术以换取解脱。',
      vetoRule: '【一票否决】离职面谈现场决不落笔签字，一律答复「我需带回仔细阅读协议并咨询律师，24 小时后再行答复」。',
    },
    {
      trap: '把精力全部耗费在与管理层争吵、公开社交媒体发表未经实证的情绪控诉。',
      mechanism: '将冰冷的商业成本裁剪归因于针对个人的道德迫害，沉溺于受害者内耗。',
      vetoRule: '【一票否决】禁止向前同事或社交圈发表攻击性言论，静默备份考勤、绩效与工资流水。',
    },
  ],
  'owed-wages': [
    {
      trap: '轻信老板私下“下个月一定补齐，大家一起共克时艰”的口头承诺，不留任何书面证据继续无薪工作。',
      mechanism: '沉没成本谬误与盲目乐观偏差，害怕撕破脸导致彻底拿不到钱。',
      vetoRule: '【一票否决】拖欠工资满 30 天必须取得加盖公章的欠条或书面确认函，否则立即启动劳动监察投诉。',
    },
  ],
  'renting': [
    {
      trap: '退租前直接交还钥匙，未在退租当天拍摄全屋带时间水印的高清视频与电表读数。',
      mechanism: '认为房东口头说“没事押金随后退”就足够，失去关键现场留存。',
      vetoRule: '【一票否决】退租现场必须双方共同在场验收并签署交接清单，全程一镜到底录像存档。',
    },
  ],
  'scammed': [
    {
      trap: '发现受骗后试图与骗子私下理论、质问，甚至相信“再转一笔保证金就能把钱解冻退回”。',
      mechanism: '认知失调与绝望侥幸，试图通过沟通挽回损失，导致遭受二次诈骗。',
      vetoRule: '【一票否决】严禁向对方追加任何一分钱，黄金 30 分钟内立即拨打 110 反诈专线并请求银行紧急冻结对手方账户。',
    },
  ],
}

