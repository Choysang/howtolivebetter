/**
 * pipeline/precompute —— 构建期计算：阶段精华、漏斗数字、lite 视图、检索索引。
 */
import type { EditorialSpec, Item, Chapter, RankedEntry, StageId } from '../../contracts/kb.ts'
import { rankForStage, topPerChapter } from '../../kernel/rank.ts'
import { buildInverted, type InvertedIndex } from '../../kernel/tokenize.ts'

export interface StageComputed {
  id: StageId
  name: string
  ages: string
  thesis: string
  picks: string[]
  essence: RankedEntry[]
  funnel: { total: number; related: number; picks: number; essence: number }
}

export interface LiteItem {
  uid: string
  chapter: number
  index: number
  title: string
  plain?: string
  benefit?: string
  evidence: string
  evidenceBase: 'A' | 'B' | 'C'
  tags: Item['source']['tags']
  disputed: boolean
  unverified: boolean
  sensitive: boolean
  always: boolean
}

export interface Precomputed {
  stagesComputed: StageComputed[]
  lite: LiteItem[]
  index: InvertedIndex
  refLinks: number
}

export function precompute(
  items: Item[],
  chapters: Chapter[],
  ed: EditorialSpec,
): Precomputed {
  const byUid = new Map(items.map((i) => [i.uid, i]))
  const chapterTitle = new Map(chapters.map((c) => [c.n, c.title]))

  const stagesComputed: StageComputed[] = ed.stages.map((st) => {
    const ranked = rankForStage(items, st.id, ed.rankConfig)
    const essence = topPerChapter(ranked, items, ed.rankConfig.perChapterCap)
    const related = items.filter((i) => i.derived.stageTiers[st.id] !== undefined).length
    return {
      id: st.id,
      name: st.name,
      ages: st.ages,
      thesis: st.thesis,
      picks: ed.picks[st.id] ?? [],
      essence,
      funnel: { total: items.length, related, picks: (ed.picks[st.id] ?? []).length, essence: essence.length },
    }
  })

  const lite: LiteItem[] = items.map((it) => ({
    uid: it.uid,
    chapter: it.source.chapter,
    index: it.source.index,
    title: it.source.title,
    plain: it.source.plain,
    benefit: it.source.benefit,
    evidence: it.source.evidence,
    evidenceBase: it.source.evidenceBase,
    tags: it.source.tags,
    disputed: it.source.flags.disputed,
    unverified: it.source.flags.unverified,
    sensitive: it.overlay.sensitive === true,
    always: it.overlay.always === true,
  }))

  const index = buildInverted(
    items.map((it) => ({
      uid: it.uid,
      title: it.source.title,
      body: [chapterTitle.get(it.source.chapter) ?? '', it.source.plain, it.source.benefit, it.source.note, it.source.cost].join('\n'),
    })),
  )

  let refLinks = 0
  for (const it of items) {
    refLinks += (it.source.refs.match(/https?:\/\//g) ?? []).length
  }

  void byUid
  return { stagesComputed, lite, index, refLinks }
}
