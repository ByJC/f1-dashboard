import { useState, useEffect } from 'react'
import bingoData from '@/data/bingo.json'
import type { BingoCard } from '@/types/f1'

const CATEGORY_COLORS = {
  drama: '#ef4444',
  safety: '#f59e0b',
  weather: '#3b82f6',
  achievement: '#10b981',
  fun: '#a855f7',
}

const CATEGORY_LABELS = {
  drama: '🔥 Drama',
  safety: '🚗 Safety',
  weather: '🌧️ Weather',
  achievement: '🏆 Win',
  fun: '🎉 Fun',
}

const STORAGE_KEY = 'f1-bingo-2026'

export function Bingo() {
  const [cards, setCards] = useState<BingoCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return bingoData as BingoCard[]
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  }, [cards])

  const toggle = (id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))
  }

  const reset = () => {
    if (confirm('Reset all bingo cards?')) {
      setCards(bingoData.map(c => c.id === 'b12' ? { ...c, checked: true } : { ...c, checked: false }) as BingoCard[])
    }
  }

  const checkedCount = cards.filter(c => c.checked).length
  const totalCount = cards.length

  // Check for bingo (5 in a row, column, or diagonal in 5x5 grid)
  const grid = cards.slice(0, 25)
  const hasBingo = checkBingo(grid.map(c => c.checked))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">F1 Bingo 2026</h1>
          <p className="text-gray-500 text-sm mt-1">
            {checkedCount}/{totalCount} checked · {hasBingo ? '🎉 BINGO!' : 'Keep watching!'}
          </p>
        </div>
        <button
          onClick={reset}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors text-gray-400 hover:text-white"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          Reset
        </button>
      </div>

      {hasBingo && (
        <div className="rounded-xl p-4 text-center border animate-pulse" style={{ backgroundColor: '#ffd70015', borderColor: '#ffd70040' }}>
          <p className="text-yellow-400 text-xl font-black">🎉 BINGO! 🎉</p>
          <p className="text-yellow-200 text-sm mt-1">You got 5 in a row!</p>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(checkedCount / totalCount) * 100}%`,
              backgroundColor: '#e10600',
            }}
          />
        </div>
      </div>

      {/* 5x5 Bingo grid */}
      <div className="grid grid-cols-5 gap-2">
        {grid.map((card) => {
          const color = CATEGORY_COLORS[card.category]
          const isFree = card.id === 'b12'
          return (
            <button
              key={card.id}
              onClick={() => !isFree && toggle(card.id)}
              className="relative aspect-square rounded-xl border text-center p-2 transition-all select-none cursor-pointer"
              style={{
                backgroundColor: card.checked
                  ? `${color}25`
                  : 'var(--bg-card)',
                borderColor: card.checked
                  ? `${color}60`
                  : 'var(--border-default)',
                transform: card.checked ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              {card.checked && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <span className="text-2xl opacity-50">✓</span>
                </div>
              )}
              <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
                <span
                  className="text-xs leading-tight font-medium"
                  style={{ color: card.checked ? color : 'var(--text-secondary)' }}
                >
                  {card.text}
                </span>
                <span className="text-xs" style={{ color: color, opacity: 0.6 }}>
                  {card.checked ? '✓' : ''}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map(cat => (
          <span
            key={cat}
            className="text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: `${CATEGORY_COLORS[cat]}20`, color: CATEGORY_COLORS[cat] }}
          >
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>
    </div>
  )
}

function checkBingo(checked: boolean[]): boolean {
  const size = 5
  // Rows
  for (let r = 0; r < size; r++) {
    if (Array.from({ length: size }, (_, c) => checked[r * size + c]).every(Boolean)) return true
  }
  // Columns
  for (let c = 0; c < size; c++) {
    if (Array.from({ length: size }, (_, r) => checked[r * size + c]).every(Boolean)) return true
  }
  // Diagonal TL-BR
  if (Array.from({ length: size }, (_, i) => checked[i * size + i]).every(Boolean)) return true
  // Diagonal TR-BL
  if (Array.from({ length: size }, (_, i) => checked[i * size + (size - 1 - i)]).every(Boolean)) return true
  return false
}
