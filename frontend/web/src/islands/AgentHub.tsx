import React, { useState, useEffect, useMemo } from 'react'
import { safeFetchKb } from '../lib/net.ts'
import { dispatchQuery } from '@kernel/dispatcher.ts'
import { PHENOMENON_CHIPS } from '@contracts/router.ts'
import type { RouterConfig, RouterDecision } from '@contracts/router.ts'
import type { LiteItem } from '@contracts/kb.ts'
import {
  MCP_DISPATCH_TOOL,
  OPENAI_DISPATCH_TOOL,
  CLAUDE_DISPATCH_TOOL,
} from '@contracts/agent.ts'
import { formatAgentContext } from '@kernel/agent.ts'
import type { AgentToolResultPayload } from '@contracts/agent.ts'

export default function AgentHub() {
  const [items, setItems] = useState<LiteItem[]>([])
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null)
  const [userQuery, setUserQuery] = useState('公司突然提裁员不给补偿金')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  type ProtocolTab = 'mcp' | 'host' | 'cursor_rules' | 'xml_system' | 'openai' | 'payload' | 'system'
  const [activeProtocolTab, setActiveProtocolTab] = useState<ProtocolTab>('mcp')

  // 加载全量轻量条目与不可变路由配置
  useEffect(() => {
    safeFetchKb<{ hash: string }>('/kb/latest.json')
      .then(({ hash }) =>
        Promise.all([
          safeFetchKb<LiteItem[]>(`/kb/${hash}/lite.json`),
          safeFetchKb<RouterConfig | null>(`/kb/${hash}/router.json`).catch(() => null),
        ])
      )
      .then(([kbItems, rConfig]) => {
        setItems(kbItems)
        if (rConfig) setRouterConfig(rConfig)
      })
      .catch((e) => console.error('AgentHub 数据初始化异常:', e))
  }, [])

  // 纯函数双速分发器实时运算 (0ms 零 I/O 确定性)
  const decision: RouterDecision | null = useMemo(() => {
    if (!userQuery.trim() || !routerConfig) return null
    return dispatchQuery(userQuery, routerConfig, items)
  }, [userQuery, routerConfig, items])

  // 计算候选相关条目（基于关键词与 Grade A 循证加权）
  const candidateItems: LiteItem[] = useMemo(() => {
    if (!userQuery.trim() || !items.length) return []
    const qLower = userQuery.toLowerCase().trim()
    const tokens = qLower.split(/[\s,，。、]+/).filter((t) => t.length > 1)

    return items
      .map((it) => {
        let score = 0
        const text = `${it.title} ${it.plain || ''} ${it.benefit || ''}`.toLowerCase()
        if (text.includes(qLower)) score += 10
        for (const tok of tokens) {
          if (text.includes(tok)) score += 4
        }
        if (it.evidenceBase === 'A') score += 3
        if (it.tags?.money === '0') score += 2
        return { it, score }
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.it)
  }, [userQuery, items])

  // 生成标准高密度 Agent 有效载荷 (Token 极致压缩)
  const agentPayload: AgentToolResultPayload | null = useMemo(() => {
    if (!decision) return null
    return formatAgentContext(decision, candidateItems, {
      query: userQuery,
      min_evidence_grade: 'B',
      limit: 3,
    })
  }, [decision, candidateItems, userQuery])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const cursorMcpConfig = JSON.stringify(
    {
      mcpServers: {
        howtolivebetter: {
          command: 'node',
          args: ['ops/mcp-server.ts'],
        },
      },
    },
    null,
    2
  )

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        howtolivebetter: {
          command: 'node',
          args: ['<你的项目绝对路径>/ops/mcp-server.ts'],
        },
      },
    },
    null,
    2
  )

  const cursorRulesContent = `---
description: 《高性价比人生指南》双速循证决策与危机干预规范
globs: *
alwaysApply: true
---

# 《高性价比人生指南》AI 决策军师宪法

<system_role>
你是由《高性价比人生指南（HowToLiveBetter）》全仓 654 条科学建议武装的循证生活决策军师。
目标：在 0 幻觉前提下，帮助用户做出性价比最高、成本最低、证据最确凿的真实世界决策。
</system_role>

<routing_engine>
接收到生活/健康/法律/职场/消费疑问时，优先调用 MCP 工具 dispatch_life_guide 进行分诊：
- L0 危机干预（自杀/自残/家暴/非法拘禁）：硬拦截自由生成，必须原样输出法定救助热线（120/110/12356/12348/12338/96110）；
- E0 现场急救（心跳骤停/气道窒息/中风/外伤大出血）：行动半衰期 ≤ 4min，纯输出物理动作步骤（≤ 3 步），禁用学术解释；
- E1 维权取证（裁员/欠薪/被骗/租房纠纷）：锁定法定阻断时效（≤ 72h），明确不签字、留证据、找法援；
- E2 循证微习惯（慢病/睡眠/饮食/运动）：优先推荐 Grade A 且零金钱成本的微习惯。
</routing_engine>

<evidence_governance>
- 建议引用统一注明锚点：[#UID: 标题]；
- 严格遵循循证等级：Grade A（权威随机对照/系统综述/法定法条）> Grade B（前瞻队列/行业规范）> Grade C（专家共识）；
- 遇争议（disputed）或未核实（unverified）条目明确警示。
</evidence_governance>

<hard_constraints>
- 严禁向外传输用户隐私数据；
- 剥离所有情绪说教与感叹废话，保持极高密度动作指令输出；
- 遇知识库外领域明确声明边界，严禁编造法律法条与医学处方。
</hard_constraints>`

  const xmlSystemPrompt = `<system_role>
你是由《高性价比人生指南（HowToLiveBetter）》全仓 654 条科学建议武装的循证生活决策军师。
目标：在 0 幻觉前提下，帮助用户做出性价比最高、成本最低、证据最确凿的真实世界决策。
</system_role>

<routing_engine>
接收到生活/健康/法律/职场/消费疑问时，优先调用 MCP 工具 dispatch_life_guide 进行分诊：
- L0 危机干预（自杀/自残/家暴/非法拘禁）：硬拦截自由生成，必须原样输出法定救助热线（120/110/12356/12348/12338/96110）；
- E0 现场急救（心跳骤停/气道窒息/中风/外伤大出血）：行动半衰期 ≤ 4min，纯输出物理动作步骤（≤ 3 步），禁用学术解释；
- E1 维权取证（裁员/欠薪/被骗/租房纠纷）：锁定法定阻断时效（≤ 72h），明确不签字、留证据、找法援；
- E2 循证微习惯（慢病/睡眠/饮食/运动）：优先推荐 Grade A 且零金钱成本的微习惯。
</routing_engine>

<evidence_governance>
- 建议引用统一注明锚点：[#UID: 标题]；
- 严格遵循循证等级：Grade A（权威随机对照/系统综述/法定法条）> Grade B（前瞻队列/行业规范）> Grade C（专家共识）；
- 遇争议（disputed）或未核实（unverified）条目明确警示。
</evidence_governance>

<hard_constraints>
- 严禁向外传输用户隐私数据；
- 剥离所有情绪说教与感叹废话，保持极高密度动作指令输出；
- 遇知识库外领域明确声明边界，严禁编造法律法条与医学处方。
</hard_constraints>`

  // 全局生产级 Agent Skill System Prompt

  const agentSystemPrompt = `你是由《高性价比人生指南（HowToLiveBetter）》全仓知识库武装的「循证生活决策军师」。
你的任务是运用全书 650+ 条科学建议与双速分发器，在 0 幻觉的前提下帮助用户做出性价比最高、成本最低、证据最确凿的决策。

【双速分发与安全拦截铁律】
1. L0 危机干预 0% 幻觉拦截：
   - 当用户遭遇自杀、自残、家庭暴力、非法拘禁或恶性人身侵害时，必须立即中止任何自主推理与安慰废话；
   - 必须原样输出国家法定求助热线（120急救 / 110报警 / 12356心理危机 / 12348法援 / 12338妇联 / 96110反诈）。
2. E0 黄金急救秒级直通：
   - 心跳骤停、气道窒息、中风、严重大出血等秒级半衰期场景，仅输出极简物理动作指令；
   - 绝不罗列任何研究背景、金钱时间成本或文献出处，消除一切认知干扰。
3. E1/E2 循证决策与微习惯：
   - 维权/博弈场景严格明确法定红线与不可逆取证动作；
   - 日常习惯优先输出「零金钱成本、免意志力」的 Grade A 科学微习惯。
4. 证据标注规范：
   - 关键建议必须注明依据来源格式：[#UID: 建议标题]；
   - 遇学术争议或待核实条目，必须向用户明确提示现状。

【工具调用接口】
- 官方知识库入口: https://how2livebetter.net
- 规范工具: dispatch_life_guide(query, urgency_filter, min_evidence_grade)`

  // 晨午晚日常定时提醒 Prompt
  const morningPrompt = `请扮演循证生活助手。现在是早晨 08:00，请为我生成今天的【晨起低阻三步法】：
1. ☀️ 15分钟自然光暴晒重置视交叉上核生物钟（#Z771429V）
2. 💧 饮用200-300ml温水唤醒肠胃与脑脊液循环（#CD87ZRAP）
3. 🎯 确定今天唯一不可妥协的 1 件事（消除多任务认知过载）
用极简、有力、充满能量的语气输出，不超过 100 字。`

  const noonPrompt = `请扮演循证生活助手。现在是午餐时间 12:30，请提醒我：
1. 🥗 进食顺序：先绿叶蔬菜与蛋白质，最后碳水，平抑餐后血糖峰值（#4N958DQB）
2. 👀 工间 20-20-20 护眼法：向 6 米外远眺 20 秒放松睫状肌（#7CATT2GF）
3. 🚶 午饭后原地慢走或站立 10 分钟，杜绝立刻伏案。
用温和亲切的口吻提醒，带点幽默感。`

  const nightPrompt = `请扮演循证生活助手。现在是晚间 22:30，请提醒我【睡前 1 小时降噪仪式】：
1. 💡 关暗顶灯，只留低位暖色间接光源（防止抑制褪黑素释放 #083TMQ1Z）
2. 📱 手机开启护眼灰度或置于伸手不可及处（阻断多巴胺刺激）
3. ❄️ 卧室温度调至适宜微凉（19-21℃最佳入睡体温）。
晚安，明天又是高效的一天。`

  return (
    <div className="space-y-12 animate-fade-up">
      {/* 头部说明 */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span>🤖 2026 Agent-Native 协议中心 · 双速分发内核</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-serif">
          将 654 条循证建议接入任意智能体
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          贯通底层数学分发器与 2026 Model Context Protocol (MCP)。L0 危机 0% 幻觉硬拦截、E0 现场急救纯动作卡、Deep-Track 意图跃迁与按行动半衰期压缩的零 Token 浪费上下文。
        </p>
      </div>

      {/* 互动演示：双速分发器与高密度上下文实时模拟器 */}
      <div className="p-6 sm:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 font-serif flex items-center gap-2">
              <span>🧭 双速分发内核实时分诊台</span>
              <span className="text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                0ms 纯函数端侧直分
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              点击下方口语现象芯片或输入处境，查看分发器如何分流危机、急救、专项剧本与提取高密度动作
            </p>
          </div>
        </div>

        {/* 预置现象级口语芯片 (Phenomenon Chips) */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span>⚡ 常见生活痛点现象直达（点击立即测试分发）：</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PHENOMENON_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setUserQuery(chip.query)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                  chip.urgency === 'E0'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80'
                    : chip.urgency === 'E1'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 查询输入框 */}
        <div className="relative">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="例如：公司突然要裁员不给补偿 / 倒地没呼吸 / 退租房东扣押金 / 每天失眠..."
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 outline-none text-sm transition-all shadow-inner"
          />
          {userQuery && (
            <button
              onClick={() => setUserQuery('')}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* 1. L0 危机干预 0% 幻觉硬拦截卡 */}
        {decision && decision.type === 'crisis' && (
          <div
            role="alert"
            className="p-5 sm:p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 space-y-3.5 animate-fade-up"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                <span>🚨</span>
                <span>L0 危机干预安全短路拦截 · 命中词「{decision.matchedTrigger}」</span>
              </span>
              <span className="text-xs text-rose-600 dark:text-rose-300 font-semibold">
                生命安全红线 · 阻断 AI 自由生成
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-100 leading-relaxed font-medium">
              系统已检测到高危人身安全或绝望处境。根据全仓安全宪法，大模型自主生成已被完全抑制，请直接拨打以下国家法定救助热线：
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {decision.hotlines.map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex flex-col p-3 rounded-xl bg-white dark:bg-[#1a1d26] border border-rose-300 dark:border-rose-800 hover:scale-[1.02] active:scale-[0.98] transition-transform text-center shadow-xs"
                >
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">{h.name}</span>
                  <span className="font-mono text-lg font-black text-rose-600 dark:text-rose-400">{h.number}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{h.desc}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 2. E0 黄金急救现场通道卡 */}
        {decision && decision.type === 'rescue' && (
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800/80 space-y-3.5 animate-fade-up">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <span>⚡</span>
                <span>E0 黄金急救现场通道 · 命中「{decision.matchedTrigger}」</span>
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">{decision.banner}</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200">
              行动半衰期 ≤ 4 分钟。已过滤所有成本、文献与标签，仅保留纯物理急救动作（≤ 3 条）：
            </p>
            <div className="space-y-2 pt-1">
              {decision.items.map((item, idx) => (
                <div
                  key={item.uid}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#1a1d26] border border-amber-300 dark:border-amber-800 flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <a
                      href={`/q/${item.uid}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                    >
                      <span>{item.title}</span>
                      <span className="text-[11px] font-mono text-gray-400 font-normal">#{item.uid}</span>
                    </a>
                    {item.plain && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        {item.plain}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Deep-Track 专项意图与情境跃迁看板 */}
        {decision && decision.type === 'deep_track' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/90 dark:bg-black/40 border border-gray-200 dark:border-gray-800 space-y-4 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-gray-500">双速分流输出：</span>
                <span className="px-2.5 py-1 rounded-lg font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  生命大域: {decision.domainId}
                </span>
                <span className="px-2.5 py-1 rounded-lg font-mono font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  意图分类: {decision.intent === 'instant' ? '现场处置 (instant)' : decision.intent === 'remedy' ? '事后维权 (remedy)' : '预防常备 (prevent)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  紧急等级: {decision.urgency}
                </span>
              </div>

              {decision.scenarioId && (
                <a
                  href={`/scenario/${decision.scenarioId}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>📌 挂载专项应对剧本: {decision.scenarioId} →</span>
                </a>
              )}
            </div>

            {/* 高杠杆召回建议条目展示 */}
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>🎯 精选高杠杆循证切片（优先 Grade A / 零金钱成本）：</span>
                <span className="text-[11px] text-gray-400 font-normal">
                  已匹配 {candidateItems.slice(0, 4).length} 条建议
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidateItems.slice(0, 4).map((it) => (
                  <a
                    key={it.uid}
                    href={`/q/${it.uid}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#12151c] hover:border-emerald-500 transition-colors block group"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-gray-400">#{it.uid}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {it.evidence}
                        </span>
                        <span className="text-gray-400 text-[10px]">
                          钱{it.tags?.money}/毅{it.tags?.willpower}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {it.title}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                      {it.plain || it.benefit}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 高密度 Agent 上下文载荷指标 (Token Density Monitor) */}
        {agentPayload && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <span>零 Token 浪费高密度压缩完成</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                    压缩比: {agentPayload.metrics.compressionRatio}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  预估上下文消耗仅 <strong className="font-mono">{agentPayload.metrics.estimatedTokens}</strong> Tokens (原始知识库条目约 {agentPayload.metrics.rawKbTokensEstimate} Tokens)
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(agentPayload.compactPromptContext, 'compact-context')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{copiedKey === 'compact-context' ? '✓ 已复制 Payload' : '📋 复制高密度 Context'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2026 Agent Native 协议规范展台 */}
      <div className="p-6 sm:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 font-serif">
              📦 2026 智能体协议规范 (MCP & Function Calling)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              直接导入 Claude Desktop、Cursor、OpenAI Agents SDK、LangChain 或 Dify
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
            {[
              { id: 'mcp', label: 'MCP Tool' },
              { id: 'host', label: 'Cursor / Claude 配置' },
              { id: 'cursor_rules', label: 'Cursor Rules (.mdc)' },
              { id: 'xml_system', label: 'XML System Prompt' },
              { id: 'openai', label: 'OpenAI Schema' },
              { id: 'payload', label: '实时高密 Payload' },
              { id: 'system', label: '常规 Prompt' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveProtocolTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeProtocolTab === tab.id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 选项卡内容区 */}
        <div className="relative">
          {activeProtocolTab === 'mcp' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Model Context Protocol 标准工具规范 (JSON)</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(MCP_DISPATCH_TOOL, null, 2), 'mcp-json')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  {copiedKey === 'mcp-json' ? '✓ 已复制！' : '复制 MCP JSON'}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-72">
                {JSON.stringify(MCP_DISPATCH_TOOL, null, 2)}
              </pre>
            </div>
          )}

          {activeProtocolTab === 'host' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span>⚡ Cursor 本地集成规范</span>
                    <span className="font-mono text-[10px] text-gray-500">.cursor/mcp.json</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(cursorMcpConfig, 'cursor-mcp')}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-xs cursor-pointer"
                  >
                    {copiedKey === 'cursor-mcp' ? '✓ 已复制！' : '复制 Cursor MCP 配置'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-gray-900 text-gray-200 text-xs font-mono overflow-x-auto">
                  {cursorMcpConfig}
                </pre>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span>⚡ Claude Desktop 接入规范</span>
                    <span className="font-mono text-[10px] text-gray-500">claude_desktop_config.json</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(claudeDesktopConfig, 'claude-desktop')}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-xs cursor-pointer"
                  >
                    {copiedKey === 'claude-desktop' ? '✓ 已复制！' : '复制 Claude Desktop 配置'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-gray-900 text-gray-200 text-xs font-mono overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>
            </div>
          )}

          {activeProtocolTab === 'cursor_rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-gray-500">
                  Cursor Rules 形式化规范 (<code className="font-mono text-emerald-600 dark:text-emerald-400">.cursor/rules/howtolivebetter.mdc</code>)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(cursorRulesContent, 'cursor-rules')}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedKey === 'cursor-rules' ? '✓ 已复制！' : '复制 Rules'}
                  </button>
                  <button
                    onClick={() => downloadFile(cursorRulesContent, 'howtolivebetter.mdc')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
                  >
                    📥 下载 .mdc 规则文件
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-80 whitespace-pre-wrap">
                {cursorRulesContent}
              </pre>
            </div>
          )}

          {activeProtocolTab === 'xml_system' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>形式化 XML 结构化 System Prompt（防越狱与强约束）</span>
                <button
                  onClick={() => copyToClipboard(xmlSystemPrompt, 'xml-prompt')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  {copiedKey === 'xml-prompt' ? '✓ 已复制！' : '复制 XML Prompt'}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-72 whitespace-pre-wrap">
                {xmlSystemPrompt}
              </pre>
            </div>
          )}

          {activeProtocolTab === 'openai' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>OpenAI / Claude Tools Function Calling 规范 (JSON)</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(OPENAI_DISPATCH_TOOL, null, 2), 'openai-json')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  {copiedKey === 'openai-json' ? '✓ 已复制！' : '复制 OpenAI JSON'}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-72">
                {JSON.stringify(OPENAI_DISPATCH_TOOL, null, 2)}
              </pre>
            </div>
          )}

          {activeProtocolTab === 'payload' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>当前查询产生的超高密度 Context Payload (JSON)</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(agentPayload, null, 2), 'payload-json')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  {copiedKey === 'payload-json' ? '✓ 已复制！' : '复制 Payload JSON'}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-72">
                {JSON.stringify(agentPayload, null, 2)}
              </pre>
            </div>
          )}

          {activeProtocolTab === 'system' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>智能体全局 System Prompt</span>
                <button
                  onClick={() => copyToClipboard(agentSystemPrompt, 'system-prompt')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  {copiedKey === 'system-prompt' ? '✓ 已复制！' : '复制 Prompt'}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-200 text-xs font-mono leading-relaxed overflow-x-auto border border-gray-800 max-h-72 whitespace-pre-wrap">
                {agentSystemPrompt}
              </pre>
            </div>
          )}

        </div>
      </div>

      {/* 日常定时提醒 Cron Prompt 模版 */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 font-serif">
          ⏰ AI 助手日常定时提醒模版（早/中/晚）
        </h3>
        <p className="text-xs text-gray-500">
          把以下提示词设定到手机快捷指令（Siri）、飞书机器人或每日定时 AI 任务中，享受全天候循证关怀
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 早晨 */}
          <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                ☀️ 晨起 08:00 唤醒
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                零意志力微启动三步
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                {morningPrompt}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(morningPrompt, 'morning')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 hover:text-emerald-600 transition-colors tactile-press cursor-pointer"
            >
              {copiedKey === 'morning' ? '✓ 已复制' : '复制晨起 Prompt'}
            </button>
          </div>

          {/* 中午 */}
          <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                🥗 午餐 12:30 续航
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                控血糖与护眼抗疲劳
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                {noonPrompt}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(noonPrompt, 'noon')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 hover:text-emerald-600 transition-colors tactile-press cursor-pointer"
            >
              {copiedKey === 'noon' ? '✓ 已复制' : '复制午间 Prompt'}
            </button>
          </div>

          {/* 晚上 */}
          <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                🌙 睡前 22:30 修复
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                避蓝光与体温降噪仪式
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                {nightPrompt}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(nightPrompt, 'night')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-gray-700 dark:text-gray-300 hover:text-emerald-600 transition-colors tactile-press cursor-pointer"
            >
              {copiedKey === 'night' ? '✓ 已复制' : '复制睡前 Prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
