/**
 * 编辑层：五个人生阶段（章级映射 + 逐条覆盖）。
 * 章号对照上游 book/01-34；「每章必有映射」由 validateBundle 强制。
 */
import type { Stage } from '../../contracts/kb.ts'

export const stages: Stage[] = [
  {
    id: 'hs',
    name: '高中生',
    ages: '约 15–18 岁',
    thesis: '先把身体和时间的底子打好，升学路径早知道一步就少走弯路。',
    chapters: {
      core: [1, 2, 3, 4, 31, 23, 13, 28],
      related: [32, 6, 34, 10, 14],
    },
  },
  {
    id: 'college',
    name: '大学生',
    ages: '约 18–23 岁',
    thesis: '毕业后的路在大二就该开始铺：技能、信息卫生和第一批法律常识。',
    chapters: {
      core: [31, 32, 23, 14, 4, 3, 9, 7],
      related: [1, 2, 10, 12, 26],
    },
  },
  {
    id: 'early',
    name: '刚工作',
    ages: '约 22–32 岁',
    thesis: '守住工资、押金和账号，把应急金攒出来，再谈增值。',
    chapters: {
      core: [19, 15, 5, 7, 9, 13, 14, 22],
      related: [10, 6, 23, 12, 21],
    },
  },
  {
    id: 'mid',
    name: '中年',
    ages: '约 30–55 岁',
    thesis: '上有老下有小：把父母的字签好、孩子的钱花对、自己的体检做上。',
    chapters: {
      core: [17, 20, 30, 16, 8, 5, 24, 27],
      related: [12, 2, 1, 10, 11, 26, 29, 18],
    },
  },
  {
    id: 'retire',
    name: '退休前后',
    ages: '约 55 岁以上',
    thesis: '慢病管起来、骗局挡在外面、药别吃出事，再帮家人把身后事提前理清。',
    chapters: {
      core: [2, 16, 24, 34, 6, 17, 5, 25],
      related: [22, 29, 33, 1],
    },
  },
]
