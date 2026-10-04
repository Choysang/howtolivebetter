/**
 * Service Worker: 离线生存与本地优先缓存守卫
 * 遵循《AGENTS.md》全仓零外部依赖铁律，100% 纯原生 JavaScript 实现
 * 确保在无网络、飞机模式或极端网络瘫痪下，核心知识包与全站离线可用。
 */

const CACHE_VERSION = 'htlb-v1'
const CACHE_SHELL = `${CACHE_VERSION}-shell`
const CACHE_KB = `${CACHE_VERSION}-kb-immutable`
const CACHE_PAGES = `${CACHE_VERSION}-pages`

// 预缓存核心骨架资源（首屏核心交互岛与关键指南）
const PRECACHE_URLS = [
  '/',
  '/checkup/',
  '/checkin/',
  '/search/',
  '/scenario/laid-off/',
  '/stage/early/',
  '/about/',
  '/about/method/',
  '/kb/latest.json',
  '/llms.txt',
]

// 1. 安装生命周期：预拉取核心骨架并立刻激活
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// 2. 激活生命周期：清理旧版本缓存并声明控制权
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (
              key.startsWith('htlb-') &&
              key !== CACHE_SHELL &&
              key !== CACHE_KB &&
              key !== CACHE_PAGES
            ) {
              return caches.delete(key)
            }
          })
        )
      )
      .then(() => self.clients.claim())
  )
})

// 3. 拦截请求分级策略
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // 严格同源过滤，防止捕获非本站资源
  if (url.origin !== self.location.origin) return

  // 策略 A: 内容寻址的不可变知识包 (/kb/{hash}/*) 及 Astro 构建资源 (/_astro/*) -> Cache-First
  const isImmutableAsset =
    (url.pathname.startsWith('/kb/') && !url.pathname.endsWith('/latest.json')) ||
    url.pathname.startsWith('/_astro/')

  if (isImmutableAsset) {
    event.respondWith(
      caches.open(CACHE_KB).then((cache) =>
        cache.match(req).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          return fetch(req).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(req, networkResponse.clone())
            }
            return networkResponse
          })
        })
      )
    )
    return
  }

  // 策略 B: latest.json 版本指针 -> Network-First (带离线缓存回退)
  if (url.pathname === '/kb/latest.json') {
    event.respondWith(
      caches.open(CACHE_SHELL).then((cache) =>
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(req, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => cache.match(req))
      )
    )
    return
  }

  // 策略 C: 页面导航与普通静态资源 -> Stale-While-Revalidate with Offline Fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone()
            caches.open(CACHE_PAGES).then((cache) => cache.put(req, resClone))
          }
          return res
        })
        .catch(() => {
          if (cached) return cached
          // 若断网且未缓存此页，导航回退到离线首页
          if (req.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('网络离线且未缓存', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        })

      return cached || fetchPromise
    })
  )
})
