import test from 'node:test'
import assert from 'node:assert/strict'
import {
  handleMessage,
  loadKnowledgeBase,
  findCandidates,
  type KbData,
} from '../mcp-server.ts'
import { MCP_DISPATCH_TOOL } from '../../contracts/agent.ts'

const kb: KbData = loadKnowledgeBase()

test('mcp-server: 知识库与路由配置加载完整度', () => {
  assert.ok(kb.items.length >= 600, '必须加载全量 600+ 知识库条目')
  assert.ok(kb.routerConfig.gatekeeper, '路由配置必须包含 gatekeeper 门禁')
  assert.ok(kb.routerConfig.domains.length >= 10, '至少应有 10 个生命领域')
})

test('mcp-server: initialize 握手协议完全符合 2024-11-05/2026 规范', () => {
  const resp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    },
    kb
  )

  assert.ok(resp, '必须返回初始化响应')
  assert.equal(resp.jsonrpc, '2.0')
  assert.equal(resp.id, 1)
  assert.equal(resp.result.protocolVersion, '2024-11-05')
  assert.equal(resp.result.serverInfo.name, 'howtolivebetter-mcp-server')
  assert.ok(resp.result.capabilities.tools, '必须声明 tools capability')
})

test('mcp-server: ping 心跳与 notification 零回执', () => {
  const pingResp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    },
    kb
  )
  assert.ok(pingResp)
  assert.deepEqual(pingResp.result, {})

  const notifyResp = handleMessage(
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    },
    kb
  )
  assert.equal(notifyResp, null, 'notifications 绝对不可产生 stdout 回执')
})

test('mcp-server: tools/list 声明 dispatch_life_guide 契约', () => {
  const resp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    },
    kb
  )

  assert.ok(resp?.result?.tools)
  assert.equal(resp.result.tools.length, 1)
  assert.equal(resp.result.tools[0].name, MCP_DISPATCH_TOOL.name)
  assert.equal(resp.result.tools[0].name, 'dispatch_life_guide')
})

test('mcp-server: tools/call 正常查询调度与高密度压缩', () => {
  const resp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'dispatch_life_guide',
        arguments: {
          query: '被公司突然裁员不给赔偿',
          urgency_filter: 'E1',
          limit: 3,
        },
      },
    },
    kb
  )

  assert.ok(resp?.result)
  assert.equal(resp.result.isError, false)
  assert.ok(Array.isArray(resp.result.content))
  assert.ok(resp.result.content[0].text.includes('DEEP-TRACK') || resp.result.content[0].text.includes('KNOWLEDGE-RECALL'))
  assert.ok(resp.result.structuredData.metrics.estimatedTokens < 350)
})

test('mcp-server: tools/call L0 危机干预 0% 幻觉硬拦截', () => {
  const resp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'dispatch_life_guide',
        arguments: {
          query: '想自杀活着好累',
        },
      },
    },
    kb
  )

  assert.ok(resp?.result)
  assert.equal(resp.result.structuredData.decisionType, 'crisis')
  assert.equal(resp.result.structuredData.actions.length, 0, '危机通道绝对零动作输出')
  assert.ok(resp.result.content[0].text.includes('[L0-CRISIS-INTERCEPT]'))
  assert.ok(resp.result.content[0].text.includes('120'))
  assert.ok(resp.result.content[0].text.includes('12356'))
})

test('mcp-server: tools/call E0 现场急救纯指令通道', () => {
  const resp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'dispatch_life_guide',
        arguments: {
          query: '心跳骤停',
        },
      },
    },
    kb
  )

  assert.ok(resp?.result)
  assert.equal(resp.result.structuredData.decisionType, 'rescue')
  assert.equal(resp.result.structuredData.urgency, 'E0')
  assert.ok(resp.result.structuredData.actions.length <= 3)
})

test('mcp-server: 错误处理守门（非法工具/缺失参数/非法方法/畸形JSON）', () => {
  // 1. 未知工具
  const unknownToolResp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'non_existent_tool', arguments: {} },
    },
    kb
  )
  assert.equal(unknownToolResp?.error?.code, -32601)

  // 2. 缺少必要 query 参数
  const missingQueryResp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'dispatch_life_guide', arguments: {} },
    },
    kb
  )
  assert.equal(missingQueryResp?.error?.code, -32602)

  // 3. 未知方法
  const unknownMethodResp = handleMessage(
    {
      jsonrpc: '2.0',
      id: 9,
      method: 'unknown/method',
    },
    kb
  )
  assert.equal(unknownMethodResp?.error?.code, -32601)

  // 4. 畸形 JSON 字符串
  const malformedResp = handleMessage('{ this is invalid json }', kb)
  assert.equal(malformedResp?.error?.code, -32700)
})
