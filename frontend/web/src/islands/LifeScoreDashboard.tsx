import React, { useState, useEffect } from 'react'
import { playSound } from '../lib/sound'

interface StageSummary {
  id: string
  name: string
  ages: string
  total: number
  uids: string[]
}

interface Props {
  totalCount: number
  stages: StageSummary[]
}

type ItemStatus = 'none' | 'todo' | 'done'

export default function LifeScoreDashboard({ totalCount, stages }: Props) {
  const [checklist, setChecklist] = useState<Record<string, ItemStatus>>({})
  const [activeTab, setActiveTab] = useState<'overview' | 'stages' | 'export'>('overview')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('howtolivebetter:checklist')
      if (saved) {
        setChecklist(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // 计算打分
  const doneCount = Object.values(checklist).filter((v) => v === 'done').length
  const todoCount = Object.values(checklist).filter((v) => v === 'todo').length

  // 公式：(done*1.0 + todo*0.4) / totalCount * 100
  const rawScore = totalCount > 0 ? ((doneCount * 1.0 + todoCount * 0.4) / totalCount) * 100 : 0
  const score = Math.round(rawScore * 10) / 10

  // 评价称号
  let rankTitle = '直觉探索者 · 初探循证生活'
  let rankDesc = '你已开启科学审视生活的旅程。从先做 5 件零成本小事开始，建立第一道安全垫。'
  if (score >= 20 && score < 50) {
    rankTitle = '理性实践派 · 筑牢生活底线'
    rankDesc = '你已经在关键风险与日常精力上建立了反脆弱机制，正在摆脱被动消费内耗。'
  } else if (score >= 50 && score < 80) {
    rankTitle = '高性价比践行官 · 掌握核心复利'
    rankDesc = '生活中的大部分不可逆风险已被你化解，健康与财务正在享受低阻抗复利。'
  } else if (score >= 80) {
    rankTitle = '自主立法大师 · 真正掌控人生'
    rankDesc = '斯多葛接纳与跨学科模型已融会贯通。世界以主题铺陈，你已按阶段完全自主决断！'
  }

  // 导出 JSON 数据包
  const handleExportJson = () => {
    playSound('copy')
    const backup = {
      version: 'htlb-v1',
      exportedAt: new Date().toISOString(),
      score,
      doneCount,
      todoCount,
      totalCount,
      checklist,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `howtolivebetter-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  // 导入 JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.checklist) {
          setChecklist(data.checklist)
          localStorage.setItem('howtolivebetter:checklist', JSON.stringify(data.checklist))
          playSound('celebrate')
          alert('数据恢复成功！')
        }
      } catch {
        alert('文件解析失败，请确认是正确的 JSON 备份包')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4">
      {/* 核心得分英雄区 */}
      <div className="mb-8 p-7 sm:p-9 rounded-3xl bg-[#12382d] text-white shadow-xl relative overflow-hidden">
        {/* 背景轻微高光 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#d5ed9e]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#d5ed9e] text-[#12382d]">
              <span>📊 个人性价比生活得分</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              {rankTitle}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-lg leading-relaxed">
              {rankDesc}
            </p>
          </div>

          {/* 圆环/数字大仪表盘 */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#18372d] border border-[#245345] min-w-[190px]">
            <span className="text-5xl sm:text-6xl font-mono font-extrabold text-[#d5ed9e] tracking-tight">
              {score}
            </span>
            <span className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-mono">
              / 100 分 (加权得分)
            </span>
          </div>
        </div>

        {/* 关键统计子卡 */}
        <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-[#245345] text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
              {doneCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">已践行 (计 1.0)</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300">
              {todoCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">待做储备 (计 0.4)</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-gray-400">
              {totalCount - doneCount - todoCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">未标记 (待探索)</div>
          </div>
        </div>
      </div>

      {/* 选项卡切换 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <button
          type="button"
          onClick={() => {
            playSound('tap')
            setActiveTab('overview')
          }}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#12382d] text-white dark:bg-[#d5ed9e] dark:text-[#12382d]'
              : 'bg-white dark:bg-[#131b17] text-gray-600 dark:text-gray-300 border border-[#dce4d5] dark:border-[#1c352a]'
          }`}
        >
          🔍 五大阶段完成率
        </button>
        <button
          type="button"
          onClick={() => {
            playSound('tap')
            setActiveTab('export')
          }}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === 'export'
              ? 'bg-[#12382d] text-white dark:bg-[#d5ed9e] dark:text-[#12382d]'
              : 'bg-white dark:bg-[#131b17] text-gray-600 dark:text-gray-300 border border-[#dce4d5] dark:border-[#1c352a]'
          }`}
        >
          💾 数据备份与恢复
        </button>
      </div>

      {/* Tab 1: 五大阶段进度 */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stages.map((st) => {
              const stageDone = st.uids.filter((uid) => checklist[uid] === 'done').length
              const stageTodo = st.uids.filter((uid) => checklist[uid] === 'todo').length
              const stageRate = st.total > 0 ? Math.round((stageDone / st.total) * 100) : 0

              return (
                <div
                  key={st.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#131b17] border border-[#dce4d5] dark:border-[#1c352a] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-base text-gray-900 dark:text-white">
                        {st.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-mono">{st.ages}</p>
                    </div>
                    <span className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {stageRate}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${stageRate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>已做 {stageDone} 项 · 待办 {stageTodo} 项</span>
                    <a
                      href={`/stage/${st.id}/`}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      查阅手册 ↗
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 2: 导出与备份 */}
      {activeTab === 'export' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-[#131b17] border border-[#dce4d5] dark:border-[#1c352a] text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-serif font-bold text-xl text-gray-900 dark:text-white">
              主权个人数据备份
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              全仓贯彻《AGENTS.md》铁律第四条：用户数据永不出设备。你可以将所有打卡、笔记与生活宪法导出为本地 JSON 文件，换设备随时导入。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleExportJson}
              className="life-btn life-btn-deep px-6 py-3 text-sm font-bold"
            >
              💾 导出全息备份包 (JSON)
            </button>

            <label className="life-btn life-btn-outline px-6 py-3 text-sm font-semibold cursor-pointer">
              <span>📥 导入恢复历史数据</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
