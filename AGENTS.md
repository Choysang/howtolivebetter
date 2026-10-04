# AGENTS.md · 全仓宪法

唯一事实源：根目录《howtolivebetter · 项目文档 v1（从零重写）.md》。本文件只写五件事：命令、目录、铁律、协议、当前状态。

## 命令

```bash
npm run sync            # 同步上游（浅克隆/比对 commit，autocrlf=false）
npm run sync:watch      # 常驻轮询上游（默认 1h，--interval N 秒可调）
npm run build:kb        # 管线：parse→register→resolve→overlay→precompute→emit
npm run build           # build:kb + Astro 全量构建 → frontend/web/dist/
npm run dev             # build:kb + astro dev（本地开发）
npm run preview         # 零依赖静态服务器（正确 MIME、不可变缓存头）
npm run test            # node --test 全套
npm run check           # 测试 + 构建幂等闸
```

前置：Node ≥ 24（原生 TS 类型剥离，全仓无根依赖）；首次需 `cd frontend/web && npm install`。

## 目录地图

| 目录 | 职责 | 允许依赖 |
| --- | --- | --- |
| `contracts/` | schema 校验器、URL 规范、fixtures | 无 |
| `kernel/` | 纯函数：uid/rank/match/schedule/tokenize | contracts |
| `backend/pipeline/` | 上游编译为知识包 | contracts、kernel |
| `backend/editorial/` | 编辑层（纯数据 .ts） | contracts、kernel |
| `frontend/web/` | Astro 应用（唯一 npm 单元） | contracts、kernel、sdk |
| `ops/` | sync/build/serve/test | 全仓（只读） |
| `data/` | uid 注册表、upstream.lock | —（管线读写） |

## 铁律

1. 依赖单向：frontend/backend → kernel → contracts；frontend 与 backend 之间零 import。
2. 契约（contracts/、URL 规范）冻结后只增不破；破坏性变更先写 ADR。
3. 上游原文一字不改；站方判断只进 editorial；计数只来自 manifest，文案不手写数字。
4. 用户数据不出设备：体检答案只在 URL `#` 后，打卡只在 localStorage；网络出口仅 `frontend/web/src/lib/net.ts` 白名单。
5. 完成 = 验收命令全绿，不是「我觉得好了」。

## 工作单协议

改动以里程碑/工作单为最小单位；`writes` 之外不动文件；kernel 单函数 ≤ 60 行、零 I/O；editorial 模块只导出纯数据（JSON 可往返）。

## 当前状态

- 波次：M0-M7 见 `.trae/documents/howtolivebetter混合栈实施计划.md`
- 技术栈决策：`docs/adr/0001-混合栈与零依赖.md`
