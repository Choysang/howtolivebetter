#!/usr/bin/env node
/**
 * ops/mcp-server.ts · 生产级零根依赖 Stdio MCP Server (Model Context Protocol)
 * 
 * 核心特性:
 * 1. 2026 Model Context Protocol (MCP) 工业规范：Newline-Delimited JSON-RPC 2.0
 * 2. 严格 Stdio 隔离：stdout 独占传输 JSON-RPC 报文，所有诊断日志全部走 stderr
 * 3. 零外部依赖：纯原生 Node >= 24 (readline/fs/path)，不引入任何 @modelcontextprotocol SDK 外部冗余
 * 4. 内核直通：直连 @kernel/dispatcher 与 @kernel/agent，提供 L0 危机 0% 幻觉硬拦截与 E0 现场急救纯动作分流
 * 
 * 启动方式:
 *   node ops/mcp-server.ts
 * 调试测试:
 *   node ops/mcp-server.ts --query "心跳骤停"
 */

import { createInterface } from 'node:readline'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MCP_DISPATCH_TOOL } from '../contracts/agent.ts'
import type { RouterConfig, RouterDecision } from '../contracts/router.ts'
import type { LiteItem } from '../contracts/kb.ts'
import { dispatchQuery } from '../kernel/dispatcher.ts'
import { formatAgentContext } from '../kernel/agent.ts'
import type { AgentToolResultPayload } from '../contracts/agent.ts'

const ROOT = resolve(import.meta.dirname, '..')

export interface KbData {
  readonly routerConfig: RouterConfig
  readonly items: readonly LiteItem[]
}

export interface JsonRpcRequest {
  readonly jsonrpc: string
  readonly id?: string | number | null
  readonly method: string
  readonly params?: Record<string, any>
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0'
  readonly id: string | number | null
  readonly result?: any
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: any
  }
}

/** 零 I/O 候选条目打分排序 */
export function findCandidates(query: string, items: readonly LiteItem[]): LiteItem[] {
  if (!query.trim() || !items.length) return []
  const qLower = query.toLowerCase().trim()
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
}

/** 加载已编译的知识库数据（支持构建包及本地测试多重 fallback） */
export function loadKnowledgeBase(baseDir = ROOT): KbData {
  // 1. 尝试从 frontend/web/public/kb/latest.json 加载
  const pubLatest = join(baseDir, 'frontend', 'web', 'public', 'kb', 'latest.json')
  if (existsSync(pubLatest)) {
    try {
      const { hash } = JSON.parse(readFileSync(pubLatest, 'utf8'))
      const hashDir = join(baseDir, 'frontend', 'web', 'public', 'kb', hash)
      const rPath = join(hashDir, 'router.json')
      const lPath = join(hashDir, 'lite.json')
      if (existsSync(rPath) && existsSync(lPath)) {
        return {
          routerConfig: JSON.parse(readFileSync(rPath, 'utf8')),
          items: JSON.parse(readFileSync(lPath, 'utf8')),
        }
      }
    } catch (e) {
      console.error('[mcp-server] 从 public/kb hash 目录加载失败，尝试备选路径:', e)
    }
  }

  // 2. 尝试从 frontend/web/public/kb/ 根下直接加载
  const pubRouter = join(baseDir, 'frontend', 'web', 'public', 'kb', 'router.json')
  const pubLite = join(baseDir, 'frontend', 'web', 'public', 'kb', 'lite.json')
  if (existsSync(pubRouter) && existsSync(pubLite)) {
    return {
      routerConfig: JSON.parse(readFileSync(pubRouter, 'utf8')),
      items: JSON.parse(readFileSync(pubLite, 'utf8')),
    }
  }

  // 3. 尝试从 .cache/kb-fixtures/ 加载
  const fixRouter = join(baseDir, '.cache', 'kb-fixtures', 'router.json')
  const fixLite = join(baseDir, '.cache', 'kb-fixtures', 'lite.json')
  if (existsSync(fixRouter) && existsSync(fixLite)) {
    return {
      routerConfig: JSON.parse(readFileSync(fixRouter, 'utf8')),
      items: JSON.parse(readFileSync(fixLite, 'utf8')),
    }
  }

  throw new Error('未找到已编译的知识库数据，请先在根目录运行 npm run build:kb')
}

/** 核心纯函数：处理单条 JSON-RPC 消息并生成响应 */
export function handleMessage(
  raw: string | JsonRpcRequest,
  kb: KbData
): JsonRpcResponse | null {
  let req: JsonRpcRequest
  if (typeof raw === 'string') {
    try {
      req = JSON.parse(raw)
    } catch {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      }
    }
  } else {
    req = raw
  }

  // 通知类消息（无 id）无需回执
  const isNotification = req.id === undefined || req.id === null

  // 1. 初始化握手
  if (req.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: req.id ?? null,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'howtolivebetter-mcp-server',
          version: '1.0.0',
        },
      },
    }
  }

  // 2. 客户端完成握手通知
  if (req.method === 'notifications/initialized') {
    return null
  }

  // 3. Ping 心跳
  if (req.method === 'ping') {
    return {
      jsonrpc: '2.0',
      id: req.id ?? null,
      result: {},
    }
  }

  // 4. 工具列表查询
  if (req.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: req.id ?? null,
      result: {
        tools: [MCP_DISPATCH_TOOL],
      },
    }
  }

  // 5. 核心工具调用 (dispatch_life_guide)
  if (req.method === 'tools/call') {
    const params = req.params || {}
    const toolName = params.name

    if (toolName !== 'dispatch_life_guide') {
      return {
        jsonrpc: '2.0',
        id: req.id ?? null,
        error: {
          code: -32601,
          message: `Tool not found: "${toolName}"`,
        },
      }
    }

    const args = params.arguments || {}
    const query = String(args.query || '').trim()

    if (!query) {
      return {
        jsonrpc: '2.0',
        id: req.id ?? null,
        error: {
          code: -32602,
          message: 'Invalid params: "query" is required',
        },
      }
    }

    // 执行纯函数双速分发器
    const decision: RouterDecision = dispatchQuery(query, kb.routerConfig, kb.items)
    const candidates = findCandidates(query, kb.items)
    const payload: AgentToolResultPayload = formatAgentContext(decision, candidates, {
      query,
      urgency_filter: args.urgency_filter,
      min_evidence_grade: args.min_evidence_grade,
      limit: typeof args.limit === 'number' ? args.limit : 3,
    })

    return {
      jsonrpc: '2.0',
      id: req.id ?? null,
      result: {
        content: [
          {
            type: 'text',
            text: payload.compactPromptContext,
          },
        ],
        structuredData: payload,
        isError: false,
      },
    }
  }

  // 通知无需回执，普通请求返回未知方法错误
  if (isNotification) return null

  return {
    jsonrpc: '2.0',
    id: req.id,
    error: {
      code: -32601,
      message: `Method not found: "${req.method}"`,
    },
  }
}

/** 启动 Stdio 常驻服务 */
export function startStdioServer(kb?: KbData) {
  const loadedKb = kb ?? loadKnowledgeBase()
  console.error('[mcp-server] 《高性价比人生指南》Stdio MCP Server 2026 已就绪 (PID: %d)', process.pid)
  console.error('[mcp-server] 知识库已加载: %d 条项目, 规则门禁已锁定', loadedKb.items.length)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    const response = handleMessage(trimmed, loadedKb)
    if (response !== null) {
      process.stdout.write(JSON.stringify(response) + '\n')
    }
  })

  rl.on('close', () => {
    console.error('[mcp-server] Stdio 通道关闭，MCP Server 平稳退出。')
    process.exit(0)
  })
}

// —— CLI 直接运行判定 —— //
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isDirectRun) {
  const queryArgIdx = process.argv.indexOf('--query')
  if (queryArgIdx >= 0 && process.argv[queryArgIdx + 1]) {
    // 快速 CLI 调试模式
    const testQuery = process.argv[queryArgIdx + 1]
    const kb = loadKnowledgeBase()
    const response = handleMessage(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'dispatch_life_guide',
          arguments: { query: testQuery },
        },
      },
      kb
    )
    console.log(JSON.stringify(response, null, 2))
    process.exit(0)
  }

  startStdioServer()
}
