/**
 * backend/editorial/cognitive.ts
 * 纯数据：为核心/高频/争议条目注入认知辩证元数据与抗脆弱弹性地板（纯数据，JSON 可往返）。
 */
import type { DialecticDebate, HabitElasticity, AntiPlaybookItem } from '../../contracts/cognitive.ts'

export const EDITORIAL_DIALECTICS: Record<string, DialecticDebate> = {
  // 083TMQ1Z：保证 7–8 小时规律睡眠
  '083TMQ1Z': {
    lenses: ['first-principles', 'dichotomy-of-control', 'activation-energy'],
    pro: {
      thesis: '睡眠是大脑淋巴系统清理代谢废物、固化长期记忆的唯一物理窗口。',
      rationale: '循证医学 A 级证据：长期睡眠不足 7 小时直接导致免疫细胞活性骤降，全因死亡率与心血管风险激增。',
    },
    con: {
      thesis: '机械强求固定 8 小时睡眠容易引发「完美睡眠焦虑症」（Orthosomnia），适得其反。',
      rationale: '在应对突发危机、夜班轮值或不可抗力时，对睡眠时长的刻板执念会诱发强烈的自责与失眠恶性循环。',
    },
    boundary: {
      condition: '处于不可抗力危机、轮班看护期或严重急性应激阶段。',
      consequence: '卧床辗转反侧强行命令大脑入睡，交感神经亢进导致入睡阻抗无限放大。',
      remedy: '转为非睡眠深度休息（NSDR）或日间 20 分钟补盹，只要闭目平躺即可保护 80% 基础静息。',
    },
    socratic: {
      level: 'contradiction',
      prompt: '你是在为睡眠创造清凉暗光的适合环境，还是在试图用意志力「逼迫」大脑休眠？',
      clarification: '入睡是副交感神经激活的自然副产物，无法被理性命令直接控制。',
    },
  },

  // 3W2GSHAH：每天步行达到 7000–8000 步
  '3W2GSHAH': {
    lenses: ['pareto', 'first-principles', 'activation-energy'],
    pro: {
      thesis: '无需昂贵健身房与大段时间，日常碎片化步行即可收获绝大部分心血管与代谢收益。',
      rationale: '柳叶刀大型前瞻队列证实：从 3000 步提升至 7500 步区间，全因死亡率下降斜率最陡峭（性价比最高）。',
    },
    con: {
      thesis: '单纯追求步数数字可能导致关节过度磨损或忽视了肌肉力量阻抗训练的不可替代性。',
      rationale: '对于存在严重膝关节软骨退变或下肢畸形者，盲目走 8000 步的关节磨损成本大于心血管边际获益。',
    },
    boundary: {
      condition: '下肢急性损伤期、严重退行性关节炎急性发作期、或极端重度雾霾暴雨天气。',
      consequence: '机械凑步数导致韧带撕裂或吸入大量细颗粒物（PM2.5）。',
      remedy: '室内改为靠墙静蹲 3 组或轻度腹桥核心激活，彻底免除膝盖冲击力。',
    },
    socratic: {
      level: 'origin',
      prompt: '你是在把日常通勤自然拆解为步行，还是在睡前为了填满圆环强行制造疲惫？',
      clarification: '最高性价比的健康行为必须与生活环境融为一体，而不是额外附带痛苦惩罚。',
    },
  },

  // 4N958DQB：完全杜绝含糖饮料
  '4N958DQB': {
    lenses: ['loss-aversion', 'first-principles', 'inversion'],
    pro: {
      thesis: '液体糖绕过咀嚼饱腹感中枢，导致果糖在肝脏以极高速度直接转化为脂肪肝。',
      rationale: '戒除含糖饮料是成本为 0 元、直接杜绝 2 型糖尿病与痛风的最快手段。',
    },
    con: {
      thesis: '极端绝对化的戒绝可能导致报复性暴食反弹，或在关键社交场合带来过高的社交摩擦。',
      rationale: '彻底隔离含糖可能造成心理匮乏感累积，一旦意志力崩溃极易引发夜间暴饮暴食。',
    },
    boundary: {
      condition: '长时间高强度耐力运动中（如长跑脱水低血糖）需要紧急快速补充葡萄糖。',
      consequence: '此时拒绝糖分摄入可能引发急性低血糖晕厥与脑损伤。',
      remedy: '严格区分日常解渴与急性低血糖补能：日常 100% 饮用白水或茶，运动极度消耗时科学补电解质水。',
    },
    socratic: {
      level: 'belief',
      prompt: '你手里的含糖饮料，是在犒劳你的味蕾，还是在帮你掩盖当下的工作无聊与精力枯竭？',
      clarification: '很多时候对糖的渴望本质上是对休息和多巴胺释放的代偿。',
    },
  },

  // GQM41JFB：系安全带，前排后排都系
  'GQM41JFB': {
    lenses: ['margin-of-safety', 'first-principles'],
    pro: {
      thesis: '系安全带是人类交通史上投资回报率最高的安全装置，耗时 3 秒，降低 50% 致命伤。',
      rationale: '车辆发生剧烈碰撞时，惯性使未系安全带的后排乘员成为致命的“人体炮弹”，摧毁前排与自身。',
    },
    con: {
      thesis: '在极端罕见的车辆落水或起火卡扣机械卡死情境下，安全带可能阻碍瞬间逃生。',
      rationale: '但统计学概率表明，落水起火卡死概率不足万分之一，碰撞抛掷致死率却高达数十倍。',
    },
    boundary: {
      condition: '汽车在极其低速的封闭冰面极低速作业随时有破冰落水风险（特殊极限场景）。',
      consequence: '极低速下防落水自救优先级可能临时变化。',
      remedy: '车内常备破窗器与割带刀，消除唯一极端边界隐患。',
    },
    socratic: {
      level: 'contradiction',
      prompt: '后排不系安全带是因为「不舒服」，还是因为潜意识里把对司机技术的信任误当作了物理定律？',
      clarification: '牛顿第一运动定律不因任何驾驶技巧或亲疏关系而暂停。',
    },
  },

  // JKTS940F：量血压，高了就吃药降到达标
  'JKTS940F': {
    lenses: ['second-order', 'first-principles'],
    pro: {
      thesis: '高血压是无声的动脉血管硬化加速器，长期达标可断崖式减少脑出血与心梗发生。',
      rationale: '权威医学指南：收缩压每降低 10mmHg，主要心血管事件风险相对降低 20%。',
    },
    con: {
      thesis: '仅凭单次诊室偶测血压过高（白大衣高血压）盲目服药，可能导致过度降压出现直立性低血压晕厥。',
      rationale: '情绪激动、劳累或剧烈运动后的生理性一过性升高不等于原发性高血压。',
    },
    boundary: {
      condition: '未做 24 小时动态血压监测或家庭连续晨起静息复测，仅在紧张情绪下单次测量偏高。',
      consequence: '误诊后错误加药导致脑灌注不足与跌倒。',
      remedy: '遵循规范：连续 7 天家庭清晨静息排尿后测量，取后 6 天平均值作为医疗决策依据。',
    },
    socratic: {
      level: 'belief',
      prompt: '你抗拒吃降压药是因为害怕「终身服药依赖」，还是逃避直面血管已经受损的事实？',
      clarification: '降压药不是成瘾品，它是帮已经老化的血管管道减压的物理防护垫。',
    },
  },
}

export const EDITORIAL_ELASTICITY: Record<string, HabitElasticity> = {
  '083TMQ1Z': {
    ceiling: '提前 60 分钟关闭光源，温水沐浴后在 20℃ 卧室入睡，睡足 7.5 小时。',
    floor: '将手机物理放置于隔壁房间或伸手不可及处，闭目平躺做 5 次 4-7-8 箱式呼吸。',
    locusOfControl: 'internal',
  },
  '3W2GSHAH': {
    ceiling: '把通勤其中 2 站改为快步走，傍晚完成 30 分钟户外快走，步数达到 8000 步。',
    floor: '下楼倒垃圾或原地站立踏步 3 分钟，打断连续久坐。',
    locusOfControl: 'internal',
  },
  '4N958DQB': {
    ceiling: '全天只饮用白开水、淡茶或黑咖啡，完全杜绝添加糖与代糖饮品。',
    floor: '在想买奶茶的瞬间，强制自己先喝下 300ml 纯温水并等待 5 分钟。',
    locusOfControl: 'internal',
  },
  'GQM41JFB': {
    ceiling: '上车坐稳后第一秒立刻顺手拉下拉扣安全带，并主动提醒同车所有乘员系好。',
    floor: '自己落座后 3 秒内咔哒一声扣好安全带。',
    locusOfControl: 'internal',
  },
  'JKTS940F': {
    ceiling: '晨起排尿后静坐 5 分钟，测量两次血压记录于健康日记，按医嘱固定时间服药。',
    floor: '将降压药与早晨洗漱水杯放在一起，按时温水吞服。',
    locusOfControl: 'internal',
  },
}

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
