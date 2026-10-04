import React, { useState, useEffect } from 'react'
import type { PersonalConstitutionSpec, ConstitutionRule } from '@contracts/cognitive.ts'
import type { SovereignBackupData } from '@contracts/bloom.ts'
import { compilePersonalConstitution } from '@kernel/constitution.ts'

const DEFAULT_RULES: ConstitutionRule[] = [
  {
    article: '生理稳态第零定律（睡眠与精力）',
    rationale: '身体是承载认知与决策的唯一物理硬件，缺乏睡眠的勤奋是认知毒药。',
    floorCommitment: '晚间熄灯，将手机物理放置于隔壁房间，闭目平躺做 5 次深呼吸。',
    uids: ['083TMQ1Z'],
  },
  {
    article: '财务反脆弱底线（应急储备）',
    rationale: '现金储备买断了个人在劳动力市场上的断粮恐慌，赋予拒绝剥削的底气。',
    floorCommitment: '每月发薪日优先确认活期应急账户未被逆向挪用。',
    uids: ['02-01'],
  },
  {
    article: '危机事前验尸原则（不自毁）',
    rationale: '在重大冲突或裁员面谈现场，人在休克防御时极易盲从顺从。',
    floorCommitment: '离职面谈现场决不落笔签字，声明 24 小时后再行答复。',
    uids: ['7WB0GXS8'],
  },
  {
    article: '低阻抗行动法则（微习惯）',
    rationale: '习惯的本质是环境与活化能设计，意志力是不可靠的消耗品。',
    floorCommitment: '无论多累，至少完成 30 秒弹性地板动作，不中断复原力。',
    uids: ['3W2GSHAH'],
  },
]

export default function ConstitutionForge() {
  const [userName, setUserName] = useState('理性探索者')
  const [motto, setMotto] = useState('实事求是 · 向内观照 · 绝不自毁')
  const [rules, setRules] = useState<ConstitutionRule[]>(DEFAULT_RULES)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview')
  const [copied, setCopied] = useState(false)
  const [addedToast, setAddedToast] = useState<string | null>(null)

  // 1. 初始化从 localStorage 加载保存的宪法配置，并响应来自辩证审判席的立宪导入参数
  useEffect(() => {
    let currentRules = DEFAULT_RULES
    try {
      const saved = localStorage.getItem('htlb-my-constitution')
      if (saved) {
        const parsed: PersonalConstitutionSpec = JSON.parse(saved)
        if (parsed.userName) setUserName(parsed.userName)
        if (parsed.motto) setMotto(parsed.motto)
        if (parsed.rules && parsed.rules.length > 0) {
          currentRules = parsed.rules
          setRules(parsed.rules)
        }
      }
    } catch (e) {
      console.error(e)
    }

    // 检查是否有来自辩证审判席的快速立宪注入
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const addUid = params.get('addUid')
      const addTitle = params.get('title')

      if (addUid) {
        const alreadyExists = currentRules.some((r) => r.uids.includes(addUid))
        if (!alreadyExists) {
          const newRule: ConstitutionRule = {
            article: `关于【${addTitle || addUid}】之底线立宪`,
            rationale: `源自条目 #${addUid} 之辩证审判与理性权衡，确立为不可动摇之行动基准。`,
            floorCommitment: '状态低迷时执行 30 秒保底微动作，绝不妥协复原力。',
            uids: [addUid],
          }
          const updated = [...currentRules, newRule]
          setRules(updated)
          setActiveTab('edit')
          setAddedToast(`已成功将 #${addUid}「${addTitle || ''}」铸入立宪草案！`)
          setTimeout(() => setAddedToast(null), 4000)
          try {
            localStorage.setItem('htlb-my-constitution', JSON.stringify({
              userName,
              lastUpdated: new Date().toISOString().slice(0, 10),
              motto,
              rules: updated,
            }))
          } catch {}
        }
        // 清理 query 参数避免刷新重复触发
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const [constitutionHash, setConstitutionHash] = useState<string>('')

  const spec: PersonalConstitutionSpec = {
    userName,
    lastUpdated: new Date().toISOString().slice(0, 10),
    motto,
    rules,
  }

  const compiledMarkdown = compilePersonalConstitution(spec)

  useEffect(() => {
    const calcHash = async () => {
      try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder()
          const data = encoder.encode(compiledMarkdown)
          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
          setConstitutionHash(hashHex.slice(0, 16))
        }
      } catch {}
    }
    calcHash()
  }, [compiledMarkdown])

  const saveToLocal = () => {
    try {
      localStorage.setItem('htlb-my-constitution', JSON.stringify(spec))
      alert('已成功保存至当前浏览器本地存储！数据永不离端。')
    } catch (e) {
      alert('保存失败')
    }
  }

  const copyMarkdown = () => {
    const finalContent = constitutionHash
      ? `${compiledMarkdown}\n\n<!-- 物理防伪验真指纹 [SHA-256]: ${constitutionHash} · 物理级零离端防伪签章 -->\n`
      : compiledMarkdown
    navigator.clipboard.writeText(finalContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadFile = async () => {
    const finalContent = `${compiledMarkdown}\n\n<!-- 物理防伪验真指纹 [SHA-256]: ${constitutionHash || 'LOCAL-SEAL'} · 物理级零离端防伪签章 -->\n`
    const blob = new Blob([finalContent], { type: 'text/markdown;charset=utf-8' })
    const fileName = `MY_CONSTITUTION_${spec.lastUpdated}.md`

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'Markdown 个人宪法文档', accept: { 'text/markdown': ['.md'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (e: any) {
        if (e.name === 'AbortError') return
      }
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const printPoster = () => {
    window.print()
  }

  const exportCardPng = () => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.max(2, window.devicePixelRatio || 2)
      const width = 800
      const height = 1000
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, '#0c0e14')
      bgGrad.addColorStop(1, '#161922')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 3
      ctx.strokeRect(30, 30, width - 60, height - 60)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(38, 38, width - 76, height - 76)

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText('📜 高性价比人生指南 · 个人生活宪法', 60, 90)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px monospace'
      ctx.fillText(`立宪人：${userName}  |  生效日期：${spec.lastUpdated}`, 60, 120)

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
      ctx.fillRect(60, 150, width - 120, 100)
      ctx.strokeStyle = '#059669'
      ctx.lineWidth = 2
      ctx.strokeRect(60, 150, width - 120, 100)

      ctx.fillStyle = '#f8fafc'
      ctx.font = 'italic bold 22px serif'
      ctx.fillText(`“${motto}”`, 80, 210)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.fillText('【不可剥夺之底线与保底微行动】', 60, 300)

      let curY = 340
      const displayRules = rules.slice(0, 4)
      displayRules.forEach((r, idx) => {
        ctx.fillStyle = '#38bdf8'
        ctx.font = 'bold 15px sans-serif'
        ctx.fillText(`第 ${idx + 1} 条：${r.article}`, 60, curY)

        ctx.fillStyle = '#94a3b8'
        ctx.font = '13px sans-serif'
        const rationaleText = r.rationale.length > 38 ? r.rationale.slice(0, 36) + '…' : r.rationale
        ctx.fillText(`依据：${rationaleText}`, 60, curY + 24)

        ctx.fillStyle = '#a5b4fc'
        ctx.font = 'bold 13px sans-serif'
        const floorText = r.floorCommitment.length > 36 ? r.floorCommitment.slice(0, 34) + '…' : r.floorCommitment
        ctx.fillText(`【保底地板】：${floorText}`, 60, curY + 48)

        curY += 90
      })

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.beginPath()
      ctx.moveTo(60, height - 120)
      ctx.lineTo(width - 60, height - 120)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '12px monospace'
      ctx.fillText(`🛡️ 物理级零离端 · 客户端本地主权全息卡片 · SHA-256: ${constitutionHash || 'VALID'}`, 60, height - 85)
      ctx.fillText('原书按主题写，人按阶段活 · howtolivebetter.local', 60, height - 60)

      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `CONSTITUTION_CARD_${userName}_${spec.lastUpdated}.png`
      a.click()
    } catch {
      alert('卡片生成失败')
    }
  }

  const exportSovereignBackup = () => {
    try {
      const readItems = JSON.parse(localStorage.getItem('htlb-read-items') || '[]')
      const favItems = JSON.parse(localStorage.getItem('htlb-fav-items') || '[]')
      const habits = JSON.parse(localStorage.getItem('htlb-my-habits') || '[]')
      const checkinHistory: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('checkin-')) {
          checkinHistory[k] = localStorage.getItem(k) || ''
        }
      }
      const backup: SovereignBackupData = {
        schemaVersion: 1,
        appName: 'howtolivebetter',
        exportedAt: new Date().toISOString(),
        readItems,
        favItems,
        habits,
        constitution: spec,
        checkinHistory,
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `htlb-sovereign-backup-${spec.lastUpdated}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('备份导出失败')
    }
  }

  const importSovereignBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as SovereignBackupData
        if (data.appName !== 'howtolivebetter' || data.schemaVersion !== 1) {
          alert('无效或不受支持的备份文件格式！')
          return
        }
        if (Array.isArray(data.readItems)) {
          localStorage.setItem('htlb-read-items', JSON.stringify(data.readItems))
        }
        if (Array.isArray(data.favItems)) {
          localStorage.setItem('htlb-fav-items', JSON.stringify(data.favItems))
        }
        if (Array.isArray(data.habits)) {
          localStorage.setItem('htlb-my-habits', JSON.stringify(data.habits))
        }
        if (data.constitution) {
          localStorage.setItem('htlb-my-constitution', JSON.stringify(data.constitution))
          if (data.constitution.userName) setUserName(data.constitution.userName)
          if (data.constitution.motto) setMotto(data.constitution.motto)
          if (data.constitution.rules) setRules(data.constitution.rules)
        }
        if (data.checkinHistory && typeof data.checkinHistory === 'object') {
          for (const [k, v] of Object.entries(data.checkinHistory)) {
            if (k.startsWith('checkin-') && typeof v === 'string') {
              localStorage.setItem(k, v)
            }
          }
        }
        window.dispatchEvent(new CustomEvent('htlb:storage-sync', { detail: { key: 'all' } }))
        setAddedToast('全息主权备份已成功恢复！')
      } catch {
        alert('备份文件解析失败，请检查文件是否损坏')
      }
    }
    reader.readAsText(file)
  }

  const addRule = () => {
    const newRule: ConstitutionRule = {
      article: `生活守则第 ${rules.length + 1} 条`,
      rationale: '基于理性证据的决策依据',
      floorCommitment: '绝不妥协的 30 秒微动作',
      uids: [],
    }
    setRules([...rules, newRule])
  }

  const updateRule = (idx: number, patch: Partial<ConstitutionRule>) => {
    const next = [...rules]
    next[idx] = { ...next[idx], ...patch }
    setRules(next)
  }

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl mx-auto">
      {/* 审判席一键铸入微通知 */}
      {addedToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-up">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span>{addedToast}</span>
          </div>
          <button 
            onClick={() => setAddedToast(null)} 
            className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:opacity-80 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 头部立宪宣告 */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📜</span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 font-serif">
              布鲁姆 L6 创造层 · 个人生活宪法起草器
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 font-sans">
              把 650+ 条外部建议，内化为你个人不可动摇的底层原则与弹性地板保底承诺（数据物理级零离端）
            </p>
          </div>
        </div>

        {/* 顶部操作条 */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              📄 宪法全景视窗
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              ✏️ 自定义立宪条款 ({rules.length})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={exportCardPng}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              title="纯端侧 Canvas 高 DPI 导出生活原则箴言卡片 (PNG)"
            >
              <span>🎨 箴言卡片 (PNG)</span>
            </button>
            <button
              onClick={exportSovereignBackup}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              title="导出所有已读、收藏、打卡与宪法的端侧全息备份包"
            >
              <span>📦 全息备份 (JSON)</span>
            </button>
            <label
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
              title="从 JSON 备份文件恢复全部端侧数据"
            >
              <span>📥 恢复备份</span>
              <input
                type="file"
                accept=".json"
                onChange={importSovereignBackup}
                className="hidden"
              />
            </label>
            <button
              onClick={printPoster}
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
              title="打印装裱海报"
            >
              <span>🖨️ 打印海报</span>
            </button>
            <button
              onClick={saveToLocal}
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer"
            >
              💾 暂存本地
            </button>
            <button
              onClick={copyMarkdown}
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer"
            >
              {copied ? '✓ 已复制' : '📋 复制 Markdown'}
            </button>
            <button
              onClick={downloadFile}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all tactile-press cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>📥 导出 .md</span>
            </button>
          </div>
        </div>
      </div>

      {/* 视图 1：宪法 Markdown 全景预览 */}
      {activeTab === 'preview' && (
        <div className="p-6 sm:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12151c] shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                MY_CONSTITUTION.md
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-serif">
                {userName} 的个人生活宪法
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {constitutionHash && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  🛡️ SHA-256: {constitutionHash}
                </span>
              )}
              <span className="text-xs text-gray-400 font-mono">
                生效于 {spec.lastUpdated}
              </span>
            </div>
          </div>

          <blockquote className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-sm font-serif italic text-gray-700 dark:text-gray-300">
            "{motto}"
          </blockquote>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              第一章：不可剥夺之底线与弹性保底行动
            </h4>
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151820] space-y-1.5 text-xs"
                >
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span>第 {i + 1} 条：{r.article}</span>
                    {r.uids.length > 0 && (
                      <span className="font-mono text-[10px] text-gray-400">
                        {r.uids.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 leading-relaxed">
                    依据：{r.rationale}
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-semibold">
                    【弹性地板】绝不妥协的 30 秒微动作：{r.floorCommitment}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-[#12151c] text-xs text-gray-500 space-y-1">
            <div className="font-bold text-gray-700 dark:text-gray-300">第二章：斯多葛平静与免责条款</div>
            <p>1. 遭遇不可抗力时，连续天数中断不构成自我谴责的理由。</p>
            <p>2. 只要在复原力潜伏期内执行一次【弹性地板微动作】，即判定为完全守约。</p>
            <p>3. 本宪法解释权完全归立宪人所有，每季度依据现实反馈修订一次。</p>
          </div>
        </div>
      )}

      {/* 视图 2：条款编辑器 */}
      {activeTab === 'edit' && (
        <div className="p-6 sm:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#12141a] shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">签署立宪人称呼：</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">个人核心座右铭：</label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-serif">
                立宪条款列表（{rules.length} 条）
              </h4>
              <button
                onClick={addRule}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white cursor-pointer"
              >
                ➕ 添加新条款
              </button>
            </div>

            {rules.map((r, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151820] space-y-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={r.article}
                    onChange={(e) => updateRule(i, { article: e.target.value })}
                    className="font-bold text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 flex-1 outline-none"
                  />
                  <button
                    onClick={() => removeRule(i)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer p-1"
                  >
                    ✕ 删除
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-0.5">立宪依据：</label>
                  <input
                    type="text"
                    value={r.rationale}
                    onChange={(e) => updateRule(i, { rationale: e.target.value })}
                    className="w-full bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">
                    【弹性地板】哪怕最忙也绝不妥协的 30 秒微动作：
                  </label>
                  <input
                    type="text"
                    value={r.floorCommitment}
                    onChange={(e) => updateRule(i, { floorCommitment: e.target.value })}
                    className="w-full bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 outline-none font-semibold text-indigo-700 dark:text-indigo-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
