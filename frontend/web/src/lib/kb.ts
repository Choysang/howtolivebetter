import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Manifest,
  Stage,
  Scenario,
  CheckinSpec,
  CheckupSpec,
  Item,
  LiteItem,
  Chapter,
} from '@contracts/kb.ts'

export interface PrecomputedStage extends Stage {
  picks: string[]
  essence: Array<{
    uid: string
    score: number
    breakdown: { benefit: number; evidence: number; stage: number; penalty: number }
  }>
  funnel: { total: number; related: number; picks: number; essence: number }
}

import { fileURLToPath } from 'node:url'

function resolvePublicDir(): string {
  const metaDir = fileURLToPath(new URL('../../public', import.meta.url))
  if (existsSync(metaDir)) return metaDir
  const cwdDirect = join(process.cwd(), 'public')
  if (existsSync(cwdDirect)) return cwdDirect
  const cwdWeb = join(process.cwd(), 'frontend', 'web', 'public')
  if (existsSync(cwdWeb)) return cwdWeb
  return metaDir
}

const PUBLIC_DIR = resolvePublicDir()
const LATEST_PATH = join(PUBLIC_DIR, 'kb', 'latest.json')

let cachedHash: string | null = null

export function getLatestHash(): string {
  if (cachedHash) return cachedHash
  if (!existsSync(LATEST_PATH)) {
    throw new Error(`找不到 ${LATEST_PATH}，请先运行 npm run build:kb`)
  }
  const raw = readFileSync(LATEST_PATH, 'utf8')
  const { hash } = JSON.parse(raw) as { hash: string }
  cachedHash = hash
  return hash
}

function loadKbJson<T>(filename: string): T {
  const hash = getLatestHash()
  const filePath = join(PUBLIC_DIR, 'kb', hash, filename)
  if (!existsSync(filePath)) {
    throw new Error(`找不到知识包文件: ${filePath}`)
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

// 缓存加速静态构建
let manifestCache: Manifest | null = null
let stagesCache: PrecomputedStage[] | null = null
let scenariosCache: Scenario[] | null = null
let checkinCache: CheckinSpec | null = null
let checkupCache: CheckupSpec | null = null
let itemsCache: Item[] | null = null
let itemsMapCache: Map<string, Item> | null = null
let liteItemsCache: LiteItem[] | null = null
let chaptersCache: Chapter[] | null = null

export function getManifest(): Manifest {
  if (!manifestCache) manifestCache = loadKbJson<Manifest>('manifest.json')
  return manifestCache
}

export function getStages(): PrecomputedStage[] {
  if (!stagesCache) stagesCache = loadKbJson<PrecomputedStage[]>('stages.json')
  return stagesCache
}

export function getScenarios(): Scenario[] {
  if (!scenariosCache) scenariosCache = loadKbJson<Scenario[]>('scenarios.json')
  return scenariosCache
}

export function getCheckinSpec(): CheckinSpec {
  if (!checkinCache) checkinCache = loadKbJson<CheckinSpec>('checkin.json')
  return checkinCache
}

export function getCheckupSpec(): CheckupSpec {
  if (!checkupCache) checkupCache = loadKbJson<CheckupSpec>('checkup.json')
  return checkupCache
}

export function getItems(): Item[] {
  if (!itemsCache) itemsCache = loadKbJson<Item[]>('items.json')
  return itemsCache
}

export function getItemsMap(): Map<string, Item> {
  if (!itemsMapCache) {
    const list = getItems()
    itemsMapCache = new Map(list.map((it) => [it.uid, it]))
  }
  return itemsMapCache
}

export function getItemByUid(uid: string): Item | undefined {
  return getItemsMap().get(uid)
}

export function getLiteItems(): LiteItem[] {
  if (!liteItemsCache) liteItemsCache = loadKbJson<LiteItem[]>('lite.json')
  return liteItemsCache
}

export function getChapters(): Chapter[] {
  if (!chaptersCache) chaptersCache = loadKbJson<Chapter[]>('chapters.json')
  return chaptersCache
}

export function getChapterByN(n: number): Chapter | undefined {
  return getChapters().find((c) => c.n === n)
}

export function getChapterMarkdown(n: number): string {
  const mdPath = join(PUBLIC_DIR, 'md', `chapter-${n}.md`)
  if (!existsSync(mdPath)) return ''
  return readFileSync(mdPath, 'utf8')
}
