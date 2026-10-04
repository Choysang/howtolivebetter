# howtolivebetter · 混合栈实施计划（单会话 v1）

## Context

**为什么做**：上游开源知识库《高性价比人生指南》（github.com/eternity4719/HowToLiveBetter，CC BY 4.0）按主题组织（34 章 / 当前 654 条，用户记忆中的「630 条」是旧快照——这正是需要轮询同步的原因），而读者需要按人生阶段获取「现在最该做什么」。本项目把上游重新编排成四个进入方式：**阶段（年）· 处境（月）· 场景（分钟-天）· 习惯（天）**。

**唯一事实源**：根目录 `howtolivebetter · 项目文档 v1（从零重写）.md`（475 行，架构规范）。本计划是该文档在单会话内的落地范围。

**用户已决策**：混合栈——管线/内核/编辑层零依赖 Node 24 + Astro/React 前端。

**上游格式（已第一手验证）**：
- `book/01-….md` ~ `book/34-….md`；文件首行 `[← 回总目录](../README.md)`，次行 `# N. 节名`，导语行以 `口径：` 开头
- 条目：`### n. 标题` + 下一行 HTML 注释 `<!-- 成本标签: 钱=0 时间=少 毅力=些 收益=中 口径=金钱 -->` + 固定 6 字段 `成本/说人话/收益/证据等级(A|B|C)/来源/备注`（备注可缺省；`备注：争议。` 开头 = 争议条目；含「TODO 待核实」= 待核实条目）
- 成本标签值域：钱 0/少/多、时间 少/中/多、毅力 否/些/是、收益 大/中/小、口径 死亡率/金钱/时间/自由
- 条目按节内独立编号、按性价比降序；交叉引用三种：`见第 19 节`、`见第 8 节第 17 条`、同节 `见第 6 条（标题）`
- 上游 `docs/` 有现成长文：《被裁了之后先做什么》《孩子出生前后要办的事》《刚确诊慢性病之后》《家庭应急装备清单》等——场景页编辑素材

---

## 一、关键决策（写入 `docs/adr/0001-混合栈与零依赖.md`）

保留文档全部架构原则：契约先行、kernel 纯函数零 I/O、uid 稳定注册表、事实/判断/派生三命名空间、构建期计算一切（排序/索引/计数）、静态优先无状态、隐私靠架构（体检答案在 URL `#` 后、打卡在 localStorage）、机读面（llms.txt / items.json / 章节 .md 以 `text/markdown` 提供）、页脚署名+数据版本、sensitive 不入榜不进打卡并挂求助渠道（12356）、「每章必有阶段映射」为测试。

与文档技术栈的偏差（每条写明不用什么、为什么）：

| 文档规定 | 本版采用 | 理由 |
| --- | --- | --- |
| Zod 4 校验 | 手写严格校验器（contracts/kb.ts） | 无 API 面；等价约束靠校验器 + fixtures 黄金测试 |
| editorial 用 YAML | ESM 纯数据模块 .ts | 零依赖、可类型化、加载时校验「纯数据」（JSON 往返测试） |
| pnpm workspaces + Turborepo | 根 package.json 零依赖 + frontend/web 独立 npm 项目 | 只有一个需安装包的单元 |
| Hono + Workers + R2（api） | 纯静态（v1.1 再加） | 五大功能全部静态+本地计算即可满足 |
| shadcn/ui、React Compiler | Tailwind v4 + 手写组件 | 会话预算；组件源码同样在仓库可改 |
| Playwright 隐私闸 | 静态断言（岛源码无 fetch/XHR/sendBeacon）+ 白名单网络模块 | 浏览器自动化安装成本高；架构上答案只进 hash，静态可证 |
| fast-check | 自写 mulberry32 PRNG + forAll | 属性测试照做，零依赖 |

**语言策略**：全仓 erasable TypeScript + 显式 `.ts` 扩展名导入。Node 24 原生类型剥离直接跑管线；Vite/Astro 消费同一份 .ts。M0 先验证 `node script.ts` 可行，失败则整体回退 .mjs（30 秒验证，风险可控）。

**URL 规范（按文档冻结）**：`/` `/stage/{id}/` `/checkup/` `/scenario/{id}/` `/checkin/` `/q/{uid}/` `/chapter/{n}/` `/search/` `/about/` `/about/method/` `/llms.txt`。另加 3 条用户路径重定向：`/tools/assess`→`/checkup/`、`/tools/checkin`→`/checkin/`、`/moments`→`/`（Astro redirects，兼容旧称）。

---

## 二、架构与数据流

```text
upstream (CC BY 4.0, 只读)
  │ ops/sync.ts（autocrlf=false 浅克隆/ls-remote 比较；--watch 轮询）
  ▼
.cache/upstream/book/*.md
  │ ops/build-kb.ts 管线：parse → register → resolve → overlay → precompute → emit
  ▼
frontend/web/public/kb/{hash}/…（不可变知识包）+ kb/latest.json（指针）
  │ Astro SSG（构建期 fs 读 kb）          │ 浏览器（运行期 fetch 同一批文件）
  ▼                                      ▼
frontend/web/dist/（全静态站点）──────► 交互岛：checkup / checkin / search / scenario
                                            │ kernel 纯函数在设备端计算（同一份 .ts）
                                            ▼
                                     体检报告 / 打卡记录（永不离开设备）
```

四条数据流与文档一致：编译流（管线）、阅读流（预渲染 HTML 近零 JS → 岛按需取 kb 分片）、私有计算流（facts + rules → kernel.match 设备端）、机读流（llms.txt、items.json、章节 .md）。

## 三、目录结构

```text
howtolivebetter/（= 当前目录）
├─ AGENTS.md                  # 全仓宪法：命令/目录/铁律（≤100 行）
├─ package.json               # 零依赖，仅 scripts
├─ .gitignore                 # .cache/ dist/ node_modules/
├─ docs/adr/0001-混合栈与零依赖.md
├─ contracts/                 # 契约层（W0 冻结）
│  ├─ routes.ts               # URL 构造与解析（全仓唯一拼 URL 处）
│  ├─ kb.ts                   # Item/Chapter/Bundle/Manifest 校验器
│  ├─ facts.ts                # 体检事实枚举（全部含 uncertain）
│  ├─ predicate.ts            # 适用条件 DSL（all/any/not/fact-in）
│  └─ fixtures/               # 迷你书（3 章 ~20 条：A/B/C、待核实、争议、缺备注）+ 期望产物
├─ kernel/                    # 纯函数（零 I/O、零依赖、单函数 ≤60 行）
│  ├─ uid.ts                  # FNV-1a 40bit → 8 位 Crockford（纯 JS，浏览器可用）
│  ├─ rank.ts                 # rankForStage + topPerChapter + 得分分解
│  ├─ match.ts                # evalPredicate / matchSituation（四轴×核心/相关/折叠/兜底）
│  ├─ schedule.ts             # planDeadlines / toICS
│  └─ tokenize.ts             # Intl.Segmenter 分词 + 倒排索引查询
├─ backend/
│  ├─ pipeline/               # parse.ts register.ts resolve.ts overlay.ts precompute.ts emit.ts + 字段普查脚本
│  └─ editorial/              # stages.ts picks.ts rank.config.ts scenarios/*.ts checkup.ts applicability.ts flags.ts checkin.ts（纯数据）
├─ frontend/web/              # Astro 应用（唯一 npm 安装单元）
│  ├─ astro.config.mjs        # react 集成 + tailwind v4 vite 插件 + trailingSlash:'always' + redirects
│  ├─ public/kb/              # 管线输出（构建产物）
│  └─ src/
│     ├─ sdk/load-kb.ts       # 构建期 fs / 运行期 fetch 共用入口
│     ├─ layouts/Base.astro   # 导航+页脚（署名/CC BY/非官方/120·119/数据版本/计数全取 manifest）
│     ├─ pages/               # index / stage/[id] / checkup / scenario/[id] / checkin / q/[uid] / chapter/[n] / search / about / about/method / 404
│     ├─ islands/             # React：Checkup.tsx Checkin.tsx SearchPalette.tsx ScenarioTimeline.tsx
│     ├─ components/          # ItemCard / EvidenceBadge / CostTags / Funnel 等
│     └─ styles/global.css    # Tailwind v4 + OKLCH 令牌 + 亮暗双主题 + 中文系统字体栈
├─ ops/
│  ├─ sync.ts                 # 克隆/轮询（--watch --interval=3600）
│  ├─ build-kb.ts             # 管线 CLI
│  ├─ build.ts                # build:kb → astro build 编排
│  ├─ serve.ts                # 零依赖静态服务器（.md→text/markdown; charset=utf-8；/kb/{hash}/→immutable）
│  ├─ dev.ts                  # build:kb + astro dev
│  └─ test/                   # node --test：golden / kernel 属性 / 冒烟 / 隐私静态断言 / 幂等闸
├─ data/
│  ├─ id-registry.jsonl       # 只追加「决策行」（改名别名/tombstone）；基础 uid 每次确定性重推导
│  └─ upstream.lock.json      # 上游 commit
└─ .cache/upstream/           # 浅克隆（不进构建、不入库）
```

## 四、模块 API 要点

- `contracts/routes.ts`：`qUrl(uid)` `chapterUrl(n)` `stageUrl(id)` `scenarioUrl(id)` `parsePath(p)`
- `kernel/uid.ts`：`uidFor(chapter, title)`（标题 NFC 规范化后哈希）、`isValidUid(s)`；碰撞即构建失败；固化测试向量
- `kernel/rank.ts`：`rankForStage(items, stage, cfg) → {uid, score, breakdown}[]`；性质：证据 A≥B≥C 得分不降、sensitive/待核实不入榜、每章 ≤4 条
- `kernel/match.ts`：`matchSituation(facts, rules)` 输出按寿命/金钱/时间/人身自由分组，每条标 核心/相关/折叠/兜底；性质：输出是输入的划分（只折叠不删除）、`always` 条目必在、`uncertain` 不触发任何折叠
- `kernel/schedule.ts`：`planDeadlines(steps, start)`（PT24H/P7D 等 ISO-8601 时限）、`toICS(events)`
- `pipeline/parse.ts`：行级严格解析，未知/缺字段直接抛错（含章·行号）；剥 `\r`；跳过首行回目录链接
- `pipeline/emit.ts`：知识包 = items.json / chapters.json / stages.json / scenarios.json / rules.json / search-index.json / manifest.json（counts、上游 commit、attribution）+ 机读面（llms.txt、llms-full.txt、items.json、md/chapter-{n}.md）；**构建幂等**：同输入同输出哈希（硬闸）

## 五、编辑层内容方案（产品灵魂，M4 用真实数据精修）

**排序公式**（rank.config.ts，生成 /about/method/ 页）：收益 大30/中20/小10 + 证据 A8/B4/C0 + 阶段加成 核心+15/相关+6 + 成本罚分（钱=多 −6 / 钱=少 −2；时间=多 −3；毅力=是 −2）+ 每章 ≤4 条。

**5 阶段章级映射草案**（M4 依据全条目清单精修 + 逐条覆盖）：

| 阶段 | 核心章（+15） | 相关章（+6） |
| --- | --- | --- |
| 高中生 | 01 02 03 04 31 23 13 28 | 32 06 34 10 14 |
| 大学生 | 31 32 23 14 04 03 09 07 | 01 02 10 12 26 |
| 刚工作 | 19 15 05 07 09 13 14 22 | 10 06 23 12 21 |
| 中年 | 17 20 30 16 08 05 24 27 | 12 02 01 11 26 29 18 |
| 退休前后 | 02 16 24 34 06 17 05 25 | 22 29 33 01 |

每阶段另配「先做 5 件」（picks：零/近零成本、主题各异、高频踩坑，人工精选）。

**8 个场景**（步骤 = 条目 uid + 编辑钩子 + within 时限，按时间顺序）：被裁（19/07 + 上游长文）、被欠薪（19/07/08）、租房签约与退租（15/09/13）、准备结婚（10/05/08）、要生孩子（27/20 + 上游长文）、确诊慢性病（16/24/34 + 上游长文）、家人走了（25/17/29）、被骗了（13/14/05/09）。

**体检约 16 题 → facts**（全部枚举含「不确定」）：年龄段、身份（学生/在职/自由职业/失业/退休）、住处（自有/租房/与家人同住/宿舍）、通勤、家庭构成（独居/伴侣/学龄前孩子/学龄孩子/同住老人/孕妇）、健康（慢病/怀孕/照护病人）、资金（6 个月应急金/负债/无结余）、行为（吸烟、饮酒、久坐、睡 <7h）。`applicability`：章级默认 predicate + 逐条覆盖（预计 ~100 条：picks/scenarios/敏感条目涉及的）。

**打卡 17 件**（零成本、可自检、只有做了/没做）：睡够 7–8h、走 7000 步、不喝含糖饮料、久坐起身、防晒、刷牙用牙线、服药前核说明书、系安全带、限酒、晒太阳、记账、燃气电器检查……（M4 从原书逐条筛，全部带 uid 出处）。复查/证件到期可导出 .ics。

**flags**：`sensitive`（关键词扫描：自我伤害相关条目 → 不入榜/不进打卡，页面挂 12356 等求助渠道）、`always`（急救、防骗、法律红线兜底）。

## 六、前端要点

- 阅读页（/q/ /chapter/ /stage/ /about/）：纯 HTML 零岛；条目页 = 原文六字段原样 + 证据/成本徽章 + 交叉引用真链接 + 反向索引（章节/阶段/场景）+ 同章上下条 + 「纠错」指向上游 issue；站方内容标「编辑」徽章
- 岛（client:load 或 visible）：Checkup（分步表单→facts→URL hash→matchSituation→分组报告+打印样式）、Checkin（localStorage+今日/本周+JSON 导入导出）、SearchPalette（Ctrl/⌘-K，首次触发才 fetch search-index.json，离线可用）、ScenarioTimeline（「从现在起算」+ .ics 导出）
- 全站网络出口收敛到 `src/lib/net.ts` 白名单（仅 /kb/ 同源）；隐私静态断言测试 grep 岛源码
- View Transitions（Astro ClientRouter）渐进增强；Service Worker 预缓存场景页（P1，最后做）
- 页脚：作者+仓库+CC BY 4.0+「本站重排并新增编辑层」+非官方+免责声明+急症 120/119+数据版本（上游 commit 短哈希）——所有计数取自 manifest，文案零手写数字

## 七、同步与轮询（用户核心诉求）

- `npm run sync`：ls-remote 比对 data/upstream.lock.json → 变化才 `git -c core.autocrlf=false fetch` 更新 .cache/upstream
- `npm run sync -- --watch --interval 3600`：常驻轮询；上游变化 → 自动跑 build:kb（uid 注册表自动续接改名；被删且被编辑层引用的条目出 tombstone 页「上游已移除」）→ 提示重新 build 或在 dev 模式自动生效
- 幂等硬闸：连续两次 build:kb 产物哈希必须相等（防 CRLF/时序污染）

## 八、测试与验收

1. **单测/golden**（node --test）：fixtures 迷你书解析期望值；uid 固化向量（确定性/改名续接/碰撞失败）
2. **kernel 属性测试**（mulberry32 + forAll，n=200）：rank 单调/sensitive 不入榜/每章≤4；match 划分性/always 必在/uncertain 不折叠；schedule 时限换算
3. **契约测试**：「每章必有阶段映射」「所有 uid 引用可解析」缺失即红
4. **冒烟**：serve.ts 起服务 → 断言各路由 200、`/md/chapter-1.md` 返回 `text/markdown; charset=utf-8`、`/kb/{hash}/` 带 immutable、页脚含署名与数据版本
5. **隐私静态断言**：checkup/checkin 岛源码无 `fetch|XMLHttpRequest|sendBeacon|WebSocket`；网络仅 net.ts 白名单
6. **人工验收**：`npm run sync` → `npm run build` → `npm run preview`（或双击 `启动网站.bat`）→ 浏览器全功能走查 + DevTools Network 面板确认体检/打卡全程零携带数据的请求
7. 浏览器代理实测五个入口各一条路径（含 Ctrl-K 搜索、体检出报告、打卡勾选、场景时间线、条目页交叉链接）

## 九、实施顺序（依赖图）

```text
M0 骨架：git init + 目录 + package.json + AGENTS.md + ADR + Node 跑 .ts 验证 + frontend/web 脚手架安装（后台）
M1 contracts + fixtures（冻结）
   ├─(并行) M2 kernel 全量 + 测试
   └─(并行) M3 pipeline：先对真实上游跑「字段普查」固化值域 → parse→emit 全链路
M4 编辑层撰写（最大内容块；子代理从克隆仓库按主题抽候选条目，我定稿）
M5 Astro 前端：布局/页脚 → q/chapter/stage 阅读页 → checkup/checkin/scenario/search 岛 → 首页/about/method
M6 构建编排 + serve + 全部测试绿 + 幂等闸 + 浏览器走查
M7 sync --watch 轮询 + 启动网站.bat + 收尾（SW/P1 视余力）
```

## 十、风险与对策

| 风险 | 对策 |
| --- | --- |
| Node 类型剥离与预期不符 | M0 首先验证；失败全局改 .mjs（机械替换，不影响设计） |
| 上游格式长尾（字段缺失/新字段） | M3 开工即字段普查，真实数据先于解析器定稿；严格模式抛错带章·行号 |
| 编辑层工作量爆表 | 章级默认权重兜底 + 逐条覆盖只覆盖 picks/scenarios/sensitive/always 涉及条目 |
| 构建不可复现 | autocrlf=false + 剥 \r + NFC + 注册表只追加 + 幂等硬闸 |
| npm 安装慢/失败 | M0 后台尽早安装；失败则前端降级为手写静态模板（管线与内核不受影响） |

## 十一、范围外（v1.1 候选，不做进本次）

api（Hono/Workers）/MCP/ask 语义问答、Playwright 运行时隐私闸、GitHub Actions 定时同步、浏览器端「检查上游更新」现场解析（解析器已按可共享设计，随时可加）。

## 验证命令速查

```bash
npm run sync            # 同步上游（首次克隆）
npm run build           # 管线 + Astro 全量构建 → frontend/web/dist/
npm run preview         # 零依赖静态服务器（正确 MIME + 不可变缓存）
npm run test            # node --test 全套
npm run sync -- --watch --interval 3600   # 常驻轮询
```
