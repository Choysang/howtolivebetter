import React, { useState, useEffect } from 'react'
import { playSound } from '../lib/sound'

export interface BingoItem {
  uid: string
  title: string
  category: string
}

interface Props {
  initialItems: BingoItem[]
  allPool: BingoItem[]
}

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export default function BingoMatrixIsland({ initialItems, allPool }: Props) {
  const [boardItems, setBoardItems] = useState<BingoItem[]>(initialItems.slice(0, 9))
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(9).fill(false))
  const [completedLines, setCompletedLines] = useState<number[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [shareImage, setShareImage] = useState<string | null>(null)

  // 读取本地打卡状态
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      const saved = localStorage.getItem(`howtolivebetter:bingo:${todayStr}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.board)) setBoardItems(parsed.board)
        if (Array.isArray(parsed.checked)) setCheckedState(parsed.checked)
      }
    } catch {}
  }, [])

  // 判定胜利线
  useEffect(() => {
    const lines: number[] = []
    WINNING_LINES.forEach((line, idx) => {
      if (line.every((i) => checkedState[i])) {
        lines.push(idx)
      }
    })

    if (lines.length > completedLines.length) {
      playSound('celebrate')
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 4000)
    }
    setCompletedLines(lines)

    // 保存到本地
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      localStorage.setItem(
        `howtolivebetter:bingo:${todayStr}`,
        JSON.stringify({ board: boardItems, checked: checkedState })
      )
    } catch {}
  }, [checkedState, boardItems])

  const handleTileClick = (idx: number) => {
    const next = [...checkedState]
    next[idx] = !next[idx]
    setCheckedState(next)

    if (next[idx]) {
      playSound('done')
    } else {
      playSound('unmark')
    }
  }

  const handleReset = () => {
    playSound('unmark')
    setCheckedState(new Array(9).fill(false))
    setCompletedLines([])
  }

  const handleShuffle = () => {
    playSound('shuffle')
    const shuffled = [...allPool].sort(() => 0.5 - Math.random()).slice(0, 9)
    setBoardItems(shuffled)
    setCheckedState(new Array(9).fill(false))
    setCompletedLines([])
  }

  // 纯端侧 Canvas 生成 1080x1080 高清分享卡片
  const handleGenerateShareCard = () => {
    playSound('copy')
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 背景底色：自然浆纸色
    ctx.fillStyle = '#f7f7f0'
    ctx.fillRect(0, 0, 1080, 1350)

    // 顶部深林绿装饰顶条
    ctx.fillStyle = '#12382d'
    ctx.fillRect(60, 60, 960, 140)

    // 标头文字
    ctx.fillStyle = '#d5ed9e'
    ctx.font = 'bold 36px Georgia, serif'
    ctx.fillText('H✳ HOW TO LIVE BETTER', 100, 125)

    ctx.fillStyle = '#ffffff'
    ctx.font = '28px sans-serif'
    ctx.fillText('零元行动九宫格 · 每日生活实践', 100, 168)

    // 日期与连线成绩
    const todayStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    ctx.fillStyle = '#12382d'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(todayStr, 60, 260)

    ctx.font = '26px sans-serif'
    ctx.fillStyle = '#4b5563'
    ctx.fillText(
      `已达成 ${completedLines.length} 条连线 · 已完成 ${checkedState.filter(Boolean).length}/9 项`,
      60,
      305
    )

    // 绘制 3x3 矩阵
    const startX = 60
    const startY = 340
    const cellW = 300
    const cellH = 260
    const gap = 30

    boardItems.forEach((item, idx) => {
      const row = Math.floor(idx / 3)
      const col = idx % 3
      const x = startX + col * (cellW + gap)
      const y = startY + row * (cellH + gap)
      const isChecked = checkedState[idx]

      // 单元格背景
      ctx.fillStyle = isChecked ? '#d5ed9e' : '#ffffff'
      ctx.strokeStyle = isChecked ? '#245345' : '#dce4d5'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(x, y, cellW, cellH, 20)
      ctx.fill()
      ctx.stroke()

      // 勾选徽标
      if (isChecked) {
        ctx.fillStyle = '#12382d'
        ctx.font = 'bold 32px sans-serif'
        ctx.fillText('✓ 已践行', x + 25, y + 55)
      } else {
        ctx.fillStyle = '#9ca3af'
        ctx.font = '24px sans-serif'
        ctx.fillText(`0${idx + 1}`, x + 25, y + 55)
      }

      // 标题多行绘制
      ctx.fillStyle = isChecked ? '#12382d' : '#1f2937'
      ctx.font = 'bold 26px sans-serif'
      const title = item.title
      if (title.length > 9) {
        ctx.fillText(title.slice(0, 9), x + 25, y + 120)
        ctx.fillText(title.slice(9, 18) + (title.length > 18 ? '...' : ''), x + 25, y + 160)
      } else {
        ctx.fillText(title, x + 25, y + 130)
      }

      // 零成本标签
      ctx.fillStyle = isChecked ? '#245345' : '#6b7280'
      ctx.font = '20px sans-serif'
      ctx.fillText('¥0 零成本', x + 25, y + 215)
    })

    // 底部 Footer
    ctx.fillStyle = '#9ca3af'
    ctx.font = '22px monospace'
    ctx.fillText('https://howtolivebetter.net · 物理级零数据外发', 60, 1260)

    const url = canvas.toDataURL('image/png')
    setShareImage(url)
  }

  return (
    <div className="max-w-xl mx-auto w-full px-4">
      {/* 成绩看板 */}
      <div className="mb-6 p-4 rounded-2xl bg-[#edece1]/60 dark:bg-[#182820]/70 border border-[#dce4d5] dark:border-[#1c352a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#d5ed9e] text-[#12382d] flex items-center justify-center font-bold text-xl font-mono">
            {completedLines.length}
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900 dark:text-white">
              已达成 {completedLines.length} 组 Bingo 连线
            </div>
            <div className="text-xs text-gray-500">
              共完成 {checkedState.filter(Boolean).length} / 9 项零成本行动
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShuffle}
            className="p-2 rounded-xl border border-[#dce4d5] dark:border-[#1c352a] hover:bg-white dark:hover:bg-[#1c352a] text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
            title="随机刷新 9 项行动"
          >
            🎲 换一组
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl border border-[#dce4d5] dark:border-[#1c352a] hover:bg-white dark:hover:bg-[#1c352a] text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
            title="清空打卡状态"
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 庆祝 Banner */}
      {showCelebration && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-200 to-emerald-200 text-[#12382d] text-center font-bold text-sm shadow-md animate-bounce">
          🎉 太棒了！达成一组 Bingo 连线！今日高性价比充能完毕！
        </div>
      )}

      {/* 3x3 实体九宫格 */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-6">
        {boardItems.map((item, idx) => {
          const isChecked = checkedState[idx]
          return (
            <button
              key={`${item.uid}-${idx}`}
              type="button"
              onClick={() => handleTileClick(idx)}
              className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between min-h-[110px] sm:min-h-[135px] border cursor-pointer select-none ${
                isChecked
                  ? 'bg-[#d5ed9e] dark:bg-[#245345] border-[#18372d] dark:border-[#d5ed9e] shadow-md transform scale-[0.98]'
                  : 'bg-white dark:bg-[#131b17] border-[#dce4d5] dark:border-[#1c352a] hover:border-emerald-500 shadow-xs hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className={`font-mono font-bold ${isChecked ? 'text-[#12382d] dark:text-[#d5ed9e]' : 'text-gray-400'}`}>
                  0{idx + 1}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isChecked
                    ? 'bg-[#12382d] text-white dark:bg-[#d5ed9e] dark:text-[#12382d]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {isChecked ? '✓ 达成' : '¥0'}
                </span>
              </div>

              <div className={`font-serif font-bold text-xs sm:text-sm line-clamp-3 leading-snug ${
                isChecked
                  ? 'text-[#12382d] dark:text-white line-through decoration-emerald-900/50'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {item.title}
              </div>

              <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                <span>{item.category}</span>
                <a
                  href={`/q/${item.uid}/`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline"
                  title="查看循证条目"
                >
                  ↗
                </a>
              </div>
            </button>
          )
        })}
      </div>

      {/* 底部生成分享卡片 */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleGenerateShareCard}
          className="life-btn life-btn-deep px-6 py-3 text-sm"
        >
          🖼️ 生成今日朋友圈分享卡片
        </button>
      </div>

      {/* 分享弹窗 */}
      {shareImage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b17] rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
            <h3 className="font-bold text-base text-gray-900 dark:text-white font-serif">
              🖼️ 今日九宫格打卡海报
            </h3>
            <img
              src={shareImage}
              alt="Bingo 分享卡片"
              className="rounded-2xl border border-gray-200 dark:border-gray-800 max-h-[460px] mx-auto shadow-lg"
            />
            <p className="text-xs text-gray-500">
              长按或右键图片即可保存到手机相册
            </p>
            <div className="flex gap-2">
              <a
                href={shareImage}
                download={`howtolivebetter-bingo-${new Date().toISOString().slice(0, 10)}.png`}
                className="flex-1 life-btn life-btn-lime py-2.5 text-xs font-bold"
              >
                💾 下载保存
              </a>
              <button
                type="button"
                onClick={() => setShareImage(null)}
                className="flex-1 life-btn life-btn-outline py-2.5 text-xs"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
