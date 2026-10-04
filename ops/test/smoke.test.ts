import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createStaticServer } from '../serve.ts'

let server: ReturnType<typeof createStaticServer>
let baseUrl: string
let latestHash: string = ''

before(async () => {
  server = createStaticServer('frontend/web/dist')
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const addr = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${addr.port}`
})

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
})

test('冒烟闸: / 首页 200 与 HTML 结构完备性', async () => {
  const res = await fetch(`${baseUrl}/`)
  assert.equal(res.status, 200, '首页 HTTP 状态码必须为 200')
  assert.match(res.headers.get('content-type') || '', /text\/html/, '首页必须返回 HTML MIME')
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN')

  const text = await res.text()
  assert.ok(text.includes('<!DOCTYPE html>') || text.includes('<html'), '首页必须包含标准 HTML 标签')
  assert.ok(text.includes('高性价比人生指南') || text.includes('howtolivebetter'), '首页必须渲染站点主标识')
})

test('冒烟闸: /stage/early/ 与 /scenario/laid-off/ 200 预渲染有效性', async () => {
  const resStage = await fetch(`${baseUrl}/stage/early/`)
  assert.equal(resStage.status, 200, '青年/初入社会阶段页必须返回 200')
  assert.match(resStage.headers.get('content-type') || '', /text\/html/)
  const textStage = await resStage.text()
  assert.ok(textStage.length > 500, '阶段页内容不可为空')

  const resScenario = await fetch(`${baseUrl}/scenario/laid-off/`)
  assert.equal(resScenario.status, 200, '被裁场景应对指南必须返回 200')
  assert.match(resScenario.headers.get('content-type') || '', /text\/html/)
  const textScenario = await resScenario.text()
  assert.ok(textScenario.length > 500, '场景页内容不可为空')
})

test('冒烟闸: /checkup/ 处境体检与 /checkin/ 微习惯打卡 200', async () => {
  const resCheckup = await fetch(`${baseUrl}/checkup/`)
  assert.equal(resCheckup.status, 200, '体检交互岛宿主页必须为 200')
  assert.match(resCheckup.headers.get('content-type') || '', /text\/html/)

  const resCheckin = await fetch(`${baseUrl}/checkin/`)
  assert.equal(resCheckin.status, 200, '打卡交互岛宿主页必须为 200')
  assert.match(resCheckin.headers.get('content-type') || '', /text\/html/)
})

test('冒烟闸: /daily/, /bingo/, /top-50/, /dashboard/ 四大微应用 200 预渲染有效性', async () => {
  for (const path of ['/daily/', '/bingo/', '/top-50/', '/dashboard/']) {
    const res = await fetch(`${baseUrl}${path}`)
    assert.equal(res.status, 200, `${path} 页面必须为 200`)
    assert.match(res.headers.get('content-type') || '', /text\/html/)
    const text = await res.text()
    assert.ok(text.length > 500, `${path} 页面内容不可为空`)
  }
})

test('冒烟闸: /search/ 与带 query /search/?q=心跳骤停 200 (服务端规范化 URL 剥离 query)', async () => {
  const resSearch = await fetch(`${baseUrl}/search/`)
  assert.equal(resSearch.status, 200, '独立搜索页必须为 200')
  assert.match(resSearch.headers.get('content-type') || '', /text\/html/)

  // 测试服务端处理带 query 参数的请求能够正确路由至静态 index.html
  const queryUrl = `${baseUrl}/search/?q=${encodeURIComponent('心跳骤停')}`
  const resSearchQ = await fetch(queryUrl)
  assert.equal(resSearchQ.status, 200, '带查询参数的搜索请求必须正确响应 200')
  assert.match(resSearchQ.headers.get('content-type') || '', /text\/html/)
  const textSearch = await resSearchQ.text()
  assert.ok(textSearch.includes('<!DOCTYPE html>'), '搜索页必须正确吐出完整 HTML')
})

test('冒烟闸: /q/41VQRBC6/ 条目详情页 200 与元信息核验', async () => {
  const resQ = await fetch(`${baseUrl}/q/41VQRBC6/`)
  assert.equal(resQ.status, 200, '条目详情页必须为 200')
  assert.match(resQ.headers.get('content-type') || '', /text\/html/)
  const textQ = await resQ.text()
  assert.ok(textQ.includes('41VQRBC6'), '条目页必须包含该条目的永久稳定 uid')
})

test('冒烟闸: /kb/latest.json 200 与版本指针合法性', async () => {
  const res = await fetch(`${baseUrl}/kb/latest.json`)
  assert.equal(res.status, 200, 'latest.json 指针必须存在且 200')
  assert.match(res.headers.get('content-type') || '', /application\/json/)
  assert.match(
    res.headers.get('cache-control') || '',
    /stale-while-revalidate/,
    'latest.json 作为可变指针文件不得设置 immutable，必须具备再验证策略'
  )

  const body = (await res.json()) as { hash: string; upstreamCommit?: string }
  assert.ok(body.hash, 'latest.json 必须包含 hash 字段')
  assert.match(body.hash, /^[a-f0-9]{16}$/, 'hash 必须为 16 位小写十六进制字符串')
  latestHash = body.hash
})

test('冒烟闸: /kb/{hash}/manifest.json 带有 Cache-Control: public, max-age=31536000, immutable 强缓存头', async () => {
  assert.ok(latestHash, '必须先获取 latest.json 的 hash 指针')
  const manifestUrl = `${baseUrl}/kb/${latestHash}/manifest.json`
  const res = await fetch(manifestUrl)
  assert.equal(res.status, 200, '版本哈希目录下的 manifest.json 必须 200')
  assert.match(res.headers.get('content-type') || '', /application\/json/)

  const cc = res.headers.get('cache-control')
  assert.equal(
    cc,
    'public, max-age=31536000, immutable',
    '内容寻址的不可变知识包必须配置 1 年强缓存与 immutable 响应头'
  )

  const manifest = (await res.json()) as { hash: string; counts: { items: number } }
  assert.ok(manifest.counts.items > 0, '知识包 manifest 内 counts.items 必须大于 0')
  assert.equal(manifest.hash, latestHash, 'manifest hash 必须与 latestHash 一致')
})

test('冒烟闸: /llms.txt AI 原生文本接口 200 与纯文本规范', async () => {
  const res = await fetch(`${baseUrl}/llms.txt`)
  assert.equal(res.status, 200, '/llms.txt 必须存在且 200')
  assert.match(res.headers.get('content-type') || '', /text\/plain/)
  const text = await res.text()
  assert.ok(text.length > 100, '/llms.txt 必须包含有效内容导引')
})

test('冒烟闸: 防御性核验 (404 捕获与路径穿越 403 阻断)', async () => {
  const res404 = await fetch(`${baseUrl}/path-never-exists-404`)
  assert.equal(res404.status, 404, '不存在的路径必须返回 404')

  const resTraversal = await fetch(`${baseUrl}/../../package.json`)
  assert.ok(
    [400, 403, 404].includes(resTraversal.status),
    '路径穿越尝试必须被安全沙箱坚决拦截'
  )
})
