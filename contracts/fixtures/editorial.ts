/**
 * fixtures 编辑层：迷你书的编辑数据（供管线测试与前端早期开发）。
 * 纯数据模块（uid 由确定性函数派生）。
 */
import { uidFor } from '../../kernel/uid.ts'
import type { EditorialSpec } from '../kb.ts'

const u = (ch: number, title: string): string => uidFor(ch, title)

const defaultEditorial: EditorialSpec = {
  stages: [
    {
      id: 'early',
      name: '刚工作',
      ages: '约 22–30 岁',
      thesis: '先守住工资、押金和账号，再谈增值。',
      chapters: { core: [3], related: [1, 2] },
    },
  ],
  picks: {
    early: [u(3, '押金数额、退还时间和扣减情形写进合同')],
  },
  rankConfig: {
    benefit: { 大: 30, 中: 20, 小: 10 },
    evidence: { A: 8, B: 4, C: 0 },
    stageBoost: { core: 15, related: 6 },
    penalty: { moneyHigh: -6, moneyLow: -2, timeHigh: -3, willpowerYes: -2 },
    perChapterCap: 4,
  },
  scenarios: [
    {
      id: 'renting',
      title: '租房签约与退租',
      subtitle: '从看房到退租，按顺序做',
      sources: ['演示场景'],
      steps: [
        { item: u(3, '签约前核对产权证和抵押情况'), hook: '签字前最后一道保险', within: 'PT1H' },
        { item: u(3, '押金数额、退还时间和扣减情形写进合同'), hook: '没写进合同的扣款理由都不算数', within: 'PT24H' },
        { item: u(3, '房租直接付给产权人'), hook: '钱不过中介的手', within: 'P7D' },
        { item: u(3, '水电表读数拍照留证'), hook: '入住退租各拍一遍', within: 'P30D' },
      ],
    },
    {
      id: 'home-safety',
      title: '家里防意外',
      subtitle: '花小钱防大灾',
      steps: [
        { item: u(1, '家里装个烟雾报警器'), hook: '先把自己喊醒', within: 'P7D' },
        { item: u(1, '电动车电池别进屋充电'), hook: '几秒钟的事，别赌', within: 'P1D' },
        { item: u(1, '家里常备应急包'), hook: '断电断水时不慌', within: 'P30D' },
      ],
    },
  ],
  checkup: {
    intro: '几个问题，答案只存在你的浏览器里。',
    questions: [
      {
        id: 'housing',
        fact: 'housing',
        q: '你现在住哪？',
        options: [
          { label: '自己家', facts: { housing: 'own' } },
          { label: '租房', facts: { housing: 'rent' } },
          { label: '跟家人住', facts: { housing: 'with-family' } },
          { label: '宿舍', facts: { housing: 'dorm' } },
          { label: '不确定 / 不想说', facts: { housing: 'uncertain' } },
        ],
      },
      {
        id: 'money_buffer',
        fact: 'money_buffer',
        q: '手头的应急钱能撑多久？',
        options: [
          { label: '半年以上', facts: { money_buffer: 'six-months' } },
          { label: '一到六个月', facts: { money_buffer: 'one-to-six' } },
          { label: '几乎没有', facts: { money_buffer: 'none' } },
          { label: '欠着债', facts: { money_buffer: 'debt' } },
          { label: '不确定', facts: { money_buffer: 'uncertain' } },
        ],
      },
      {
        id: 'family_elders',
        fact: 'family_elders',
        q: '家里有老人需要你照应吗？',
        options: [
          { label: '有', facts: { family_elders: 'yes' } },
          { label: '没有', facts: { family_elders: 'no' } },
          { label: '不确定', facts: { family_elders: 'uncertain' } },
        ],
      },
    ],
  },
  applicability: {
    chapterDefaults: {
      3: { any: [{ fact: 'housing', in: ['rent', 'dorm'] }] },
      2: { fact: 'money_buffer', in: ['none', 'debt', 'one-to-six'] },
    },
    overrides: [
      {
        uid: u(1, '家里装个烟雾报警器'),
        applies: { fact: 'housing', in: ['own', 'rent', 'with-family', 'dorm'] },
        confidence: 0.95,
      },
    ],
  },
  flags: {
    autoScanKeywords: ['自杀', '自残'],
    sensitive: [],
    always: [u(1, '开车系安全带，后排也要系')],
  },
  checkin: {
    intro: '只记「做了 / 没做」，不搞打卡惩罚。',
    items: [
      { id: 'seatbelt', label: '坐车系了安全带（前排后排）', item: u(1, '开车系安全带，后排也要系') },
      { id: 'alarm-test', label: '按了烟雾报警器测试键', item: u(1, '家里装个烟雾报警器') },
    ],
  },
}

export default defaultEditorial
