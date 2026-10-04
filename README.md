# H✳ HowToLiveBetter · 高性价比人生指南

> **「世界以主题铺陈，生命按阶段决断。」**  
> *以循证为度刺破噪音，在不可逆的时流中筑牢反脆弱。*

[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A524.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Astro 5](https://img.shields.io/badge/Astro-5.x-BC52EE?logo=astro&logoColor=white)](https://astro.build/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Local--First Privacy](https://img.shields.io/badge/Privacy-100%25%20Local--First-10B981)](https://howtolivebetter.net)
[![Tests Passing](https://img.shields.io/badge/Tests-96%2F96%20Pass-brightgreen)](ops/test/)
[![Static Pages](https://img.shields.io/badge/Static%20Pages-717%20Pre--rendered-blue)](frontend/web/dist/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Choysang/howtolivebetter)
[![License](https://img.shields.io/badge/License-MIT%20%2F%20CC%20BY--NC%204.0-orange)](LICENSE)

---

## 🌟 项目简介

《高性价比人生指南》（**HowToLiveBetter**）是一套面向现代人抗内耗、防风险与高杠杆行动的**本地优先（Local-First）循证生活操作系统**。

原书 34 卷横向展开，收录了 654 条涵盖健康、睡眠、财务、人际、居住、防诈的循证建议。然而，**现实生活不是平铺的知识库，而是纵向展开的人生旅程**：
- 同一句「现在最该做什么」，17 岁的高中生、24 岁刚工作的年轻人与 45 岁的中年人，答案截然相反；
- 面临突然被裁员、遭遇劳动纠纷或确诊疾病时，用户不需要翻阅整本字典，而是需要**以小时计、具有法律红线的行动剧本**。

本项目从零重构，采用**自然主义书卷美学（Natural Book Aesthetics）× 极客精密交互**，完整实现了：
1. **五大人群生命阶段手册**（高中、大学、刚工作、中年、退休）；
2. **八大紧急时刻救命剧本**（法定红线倒计时、一键日历导出）；
3. **四大高频微应用矩阵**（每日抽签、零元九宫格、精选 50 条、个人看板）；
4. **布鲁姆 L6 心智演化雷达与个人生活宪法起草器**；
5. **物理级 Local-First 零数据外发硬闸**。

---

## 🎨 视觉美学与声学系统

- **自然主义书卷调色板**：柔韧米浆纸底（`#f7f7f0`）、深林松针绿（`#12382d` / `#18372d`）、有机青柠高光（`#d5ed9e`）与发丝细线（`#dce4d5`），消除长时间阅读的数字眩光。
- **实体卡片甲板（Card Deck）**：利用 `-4°` 与 `+4°` 双层斜切阴影几何，在屏幕上复刻实体扑克与纸牌的层叠触感。
- **程序化 Web Audio API 晶体微音效**：**100% 零外部音频文件加载（0 MP3/WAV 依赖）**，通过 5200Hz 低通滤波器与双轨谐波合成纯数学声学反馈（点触、达成、待办、洗牌、大调凯旋连奏、快门白噪声），并配备顶栏独立持久化静音开关。
- **殿堂级单行流体大标题**：采用 Fluid Typography `clamp()` 响应式字阶，确保核心元宪法金句「世界以主题铺陈，生命按阶段决断」在桌面端与移动端始终单行贯通。

---

## 🚀 核心功能矩阵

### 1. 🧭 五大生命阶段手册 (`/stage/`)
打破静态目录平铺，按生理年龄与核心矛盾重排知识库：
- **🎓 高中生 (15–18 岁)**：填报志愿、视力保护与作息底线；
- **🏫 大学生 (18–22 岁)**：实习试错、技能复利与低成本探索；
- **💼 刚工作 (22–28 岁)**：租房签约避坑、试用期法律维权与 6 个月应急备用金；
- **👔 中年期 (28–55 岁)**：婚育抚养、大病风控、资产配置与抗中年危机；
- **🌅 退休前后 (55 岁+)**：养老医保、防金融诈骗与代际边界。

### 2. ⚡ 八大紧急时刻救命剧本 (`/scenario/`)
面对人生黑天鹅，按 1 小时内、24 小时、7 天、30 天法定红线倒排行动：
- 被裁员维权 (N+1 谈判定式) · 被欠薪维权 · 遭遇电信诈骗止损 · 租房突发退租纠纷
- 婚育关键决断 · 慢病早期确诊 · 亲人突然离世事务指引 · 紧急心理疏导

### 3. 🎲 每日微决断抽签 (`/daily/`)
- 基于 UTC+8 日期确定性哈希，每天指派 1 件可落地的生活小事；
- **3D 纸牌正面与背面翻转**：正面看行动与成本，背面查验顶刊循证医学与统计学依据；
- 支持「🎲 换一换」随机重抽与一键复制分享。

### 4. 🎯 零元行动九宫格 (`/bingo/`)
- 3x3 纯零成本（`¥0`）高杠杆生活行动网格；
- **8 组连线判定引擎**（3 横、3 竖、2 对角线），连通时触发凯旋金色辉光与和弦音效；
- **纯端侧 1080px Canvas 导出分享海报**，长按保存朋友圈打卡图。

### 5. ⭐ 精选 50 条核心行动 (`/top-50/`)
- 二八定律核心盘：全书 654 条中确定性最高、阻抗最小的 50 条行动；
- 50 磁贴蜂窝图，三态切换（未做 / 待做 / 已做到）；
- **一键导出符合 RFC 5545 规范的手机日历排期包（`.ics`）**。

### 6. 📊 个人生活性价比仪表盘 (`/dashboard/`)
- 加权度量衡：$\text{Score} = (\sum \text{Done} \times 1.0 + \sum \text{Todo} \times 0.4) / N_{\text{total}} \times 100$；
- 五大阶段完成率环形图与心智等级评定；
- **主权个人数据备份**：一键导出/导入本地全息 JSON，换设备无损漫游。

### 7. 🩺 处境体检与布鲁姆工具箱
- **🩺 苏格拉底处境体检 (`/checkup/`)**：17 题本地纯函数实时剪枝，无关条目自动折叠；
- **📜 个人生活宪法起草器 (`/tools/constitution/`)**：布鲁姆 L6 创造层，确立底线原则，端侧生成 `MY_CONSTITUTION.md` 并导出箴言卡片；
- **🌱 习惯工作台 (`/tools/habits/`)**：28 天热力网格与连续打卡；
- **⏳ 科学番茄钟 (`/tools/focus/`)**：25 分钟专注 + 5 分钟强制 20-20-20 护眼拉伸；
- **🤖 AI Agent 技能中心 (`/tools/agent/`)**：一键导出 Claude / Cursor / GPTs 规则与 MCP 配置。

---

## 🔒 隐私铁律（Local-First Hard Guard）

全仓严格贯彻《AGENTS.md》第四条铁律：**用户数据绝对不出设备**。
1. **体检答案**：仅保存在 URL `#` Hash 锚点后，遵循 RFC 3986 规范，浏览器原生绝不将其作为 HTTP 请求发送至任何服务器；
2. **打卡与笔记**：仅存储于用户当前浏览器的 `localStorage` 中；
3. **零外部网络原语**：全站静态扫描除 `frontend/web/src/lib/net.ts`（用于同步上游锁文件）外，严禁任何 `fetch`、`XMLHttpRequest` 或第三方遥测 SDK 存在，代码库包含自动化隐私拦截测试。

---

## 📂 目录架构

符合高内聚、单向依赖架构（依赖方向：`frontend/backend → kernel → contracts`，禁止跨层逆向 import）：

```text
gaoxingjiabirenshengzhinan/
├── contracts/          # 核心契约与 Schema 校验器（零依赖，TypeScript 原生）
│   ├── kb.ts           # 知识包、阶段、场景剧本数据结构契约
│   ├── cognitive.ts    # 辩证审判席、心智模型、弹性打卡契约
│   ├── bloom.ts        # 布鲁姆认知跃迁方程 CBI 契约
│   └── facts.ts        # 处境体检谓词系统
├── kernel/             # 纯函数业务内核（零 I/O、无外部依赖，单函数 ≤ 60 行）
│   ├── bloom.ts        # CBI 双曲饱和与心智位阶计算
│   ├── radar.ts        # 极坐标投影、香农均衡熵与微阻抗推荐算法
│   ├── shortcuts.ts    # 全域快捷键网络状态机
│   └── tokenize.ts     # 中文分词与全文倒排检索纯算法
├── backend/            # 上游知识编译管线
│   ├── pipeline/       # 知识包解析、UID 注册、关联消解与派生计算
│   └── editorial/      # 站方编辑层（纯数据 .ts，JSON 可往返）
├── frontend/web/       # Astro 静态渲染前端（唯一 npm 单元）
│   ├── src/
│   │   ├── components/ # Astro 高性能静态组件 (Navbar, ItemCard 等)
│   │   ├── islands/    # React 19 独立轻量交互岛屿 (HeroCardDeck, Radar 等)
│   │   ├── lib/        # 声音引擎 (sound.ts)、知识加载 (kb.ts)
│   │   ├── pages/      # 静态路由 (/index, /stage, /scenario, /daily 等)
│   │   └── styles/     # 全局自然主义样式 (global.css)
│   └── public/         # 编译后的不可变知识包 (/kb/{hash}/manifest.json)
├── ops/                # 运维与工程闸口（只读全仓）
│   ├── test/           # node --test 原生全套自动化测试 (96 项测试)
│   ├── build.ts        # 知识包编译 + Astro 静态预渲染
│   └── serve.ts        # 零依赖 HTTP 静态预览服务器
└── data/               # 8 位 Crockford UID 注册表与 upstream.lock
```

---

## 🛠️ 快速开始

### 环境要求
- **Node.js ≥ 24.0.0**（利用原生 TypeScript 类型剥离执行内核与测试，全仓根目录零依赖）；
- **npm**（仅用于 `frontend/web/` 目录下的 Astro 构建环境）。

### 1. 克隆仓库
```bash
git clone https://github.com/Choysang/howtolivebetter.git
cd howtolivebetter
```

### 2. 初始化前端依赖
```bash
cd frontend/web
npm install
cd ../..
```

### 3. 本地启动开发环境
```bash
npm run dev
```
打开浏览器访问：`http://localhost:4321`

### 4. 生产全量构建与本地不可变预览
```bash
# 全量构建：编译知识包 + 静态预渲染 717 个页面
npm run build

# 启动零依赖生产级静态预览服务器（带不可变缓存头与 MIME 校验）
npm run preview
```
预览服务将运行在：`http://localhost:3000`

### 5. 运行全套自动化测试
```bash
# 运行 96 项单元测试、集成测试与隐私硬闸
npm test

# 测试 + 知识库构建幂等闸（全绿通过）
npm run check
```

---

## ⌨️ 全域快捷键支持

站点内置了类 Linear / Raycast 的无冲突键盘流导航：
- <kbd>?</kbd> ：随时唤起全域快捷键速查 HUD 弹窗
- <kbd>g</kbd> <kbd>h</kbd> ：直达首页（Home）
- <kbd>g</kbd> <kbd>s</kbd> ：直达五大人群阶段手册（Stages）
- <kbd>g</kbd> <kbd>c</kbd> ：直达处境体检自测（Checkup）
- <kbd>g</kbd> <kbd>k</kbd> ：直达微习惯打卡（Checkin）
- <kbd>g</kbd> <kbd>l</kbd> ：直达个人生活宪法起草器（Law/Constitution）
- <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>/</kbd> ：全局 654 条建议全文秒级检索

---

## 🤖 AI 原生接口（Agent-Native）

站点对现代大语言模型与 Agent 完全原生友好：
- **`https://howtolivebetter.net/llms.txt`**：提供标准的 LLM 上下文导引与高密度内容映射；
- **MCP Server 支持**：项目根目录包含 `router_config.yaml`，可通过 Model Context Protocol 无缝挂载至 Claude Desktop、Cursor、Windsurf，实现多层意图分流与 L0 危机热线硬拦截；
- **结构化导出**：访问 `/tools/agent/` 可一键导出为通用 System Prompt、Claude Projects 技能包或 GPTs Action 契约。

---

## 📄 开源许可与致谢

- 核心架构代码与纯函数引擎遵循 **[MIT License](LICENSE)** 开源；
- 知识库整理内容遵循 **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**（知识共享 署名-非商业性使用 4.0 国际许可协议）；
- 灵感致敬：Derek Sivers《How to Live》、Tim Ferriss、循证医学文献库以及开放网络上的先行思考者。

---

<p align="center">
  <b>H✳ HowToLiveBetter · 让每一次决断都有证据，让每一个阶段都有底牌</b>
</p>
