/**
 * 契约：URL 规范与构造函数（冻结）。
 * 全仓唯一允许拼站点 URL 的地方；任何代码不得手拼。
 */

export const qUrl = (uid: string): string => `/q/${uid}/`
export const chapterUrl = (n: number): string => `/chapter/${n}/`
export const chapterMdUrl = (n: number): string => `/md/chapter-${n}.md`
export const stageUrl = (id: string): string => `/stage/${id}/`
export const scenarioUrl = (id: string): string => `/scenario/${id}/`
export const checkupUrl = (): string => '/checkup/'
export const checkinUrl = (): string => '/checkin/'
export const searchUrl = (): string => '/search/'
export const aboutUrl = (): string => '/about/'
export const methodUrl = (): string => '/about/method/'
export const constitutionUrl = (): string => '/tools/constitution/'
export const habitsUrl = (): string => '/tools/habits/'
export const focusUrl = (): string => '/tools/focus/'
export const agentUrl = (): string => '/tools/agent/'
export const kbUrl = (hash: string, file: string): string => `/kb/${hash}/${file}`
export const kbLatestUrl = (): string => '/kb/latest.json'

/** 解析站点路径（机读面/测试用）。返回 null 表示非规范路径。 */
export function parsePath(p: string): { kind: string; id?: string } | null {
  let m = p.match(/^\/q\/([A-Z0-9]{8})\/?$/)
  if (m) return { kind: 'q', id: m[1] }
  m = p.match(/^\/chapter\/(\d+)\/?$/)
  if (m) return { kind: 'chapter', id: m[1] }
  m = p.match(/^\/stage\/([a-z-]+)\/?$/)
  if (m) return { kind: 'stage', id: m[1] }
  m = p.match(/^\/scenario\/([a-z0-9-]+)\/?$/)
  if (m) return { kind: 'scenario', id: m[1] }
  for (const [path, kind] of [
    ['/', 'home'], ['/checkup/', 'checkup'], ['/checkin/', 'checkin'],
    ['/search/', 'search'], ['/about/', 'about'], ['/about/method/', 'method'],
    ['/tools/constitution/', 'constitution'], ['/tools/habits/', 'habits'],
    ['/tools/focus/', 'focus'], ['/tools/agent/', 'agent'],
    ['/llms.txt', 'llms'],
  ] as const) {
    if (p === path) return { kind }
  }
  return null
}
