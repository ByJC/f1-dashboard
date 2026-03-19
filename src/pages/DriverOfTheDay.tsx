import { useSchedule } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getCountryCode, formatDate } from '@/utils'
import { useState } from 'react'

// DOTD data stored locally — updated manually after each race
const DOTD_DATA: Record<string, string> = {
  // "round": "driver code"
  // Example: "1": "NOR"
}

export function DriverOfTheDay() {
  const { data: schedule, isLoading, error } = useSchedule()
  const [editing, setEditing] = useState<string | null>(null)
  const [dotdMap, setDotdMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('f1-dotd-2026')
      return saved ? JSON.parse(saved) : DOTD_DATA
    } catch { return DOTD_DATA }
  })
  const [inputVal, setInputVal] = useState('')

  const now = new Date()

  const saveDotd = (round: string, code: string) => {
    const updated = { ...dotdMap, [round]: code.toUpperCase() }
    setDotdMap(updated)
    localStorage.setItem('f1-dotd-2026', JSON.stringify(updated))
    setEditing(null)
  }

  if (isLoading) return <LoadingSpinner message="Loading calendar..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Driver of the Day</h1>
        <p className="text-gray-500 text-sm mt-1">
          Click on a race to set the DOTD — saved locally in your browser
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {schedule?.map(race => {
          const isPast = new Date(race.date) < now
          const dotdCode = dotdMap[race.round]
          const dotdDriver = dotdCode ? getDriverByCode(dotdCode) : null
          const countryCode = getCountryCode(race.Circuit.Location.country)

          return (
            <div
              key={race.round}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: dotdDriver ? `${dotdDriver.color}50` : 'var(--border-default)',
                opacity: isPast ? 1 : 0.4,
              }}
            >
              {/* Header */}
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{ backgroundColor: dotdDriver ? `${dotdDriver.color}10` : '#ffffff05' }}
              >
                <span className="text-xs font-mono text-gray-500">R{race.round}</span>
                <img
                  src={`https://flagcdn.com/w20/${countryCode}.png`}
                  alt=""
                  className="h-3 w-auto rounded-sm opacity-60"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>

              {/* Content */}
              <div className="px-3 py-2">
                <p className="text-white text-xs font-semibold leading-tight mb-0.5">
                  {race.Circuit.Location.country}
                </p>
                <p className="text-gray-600 text-xs mb-2">{formatDate(race.date)}</p>

                {editing === race.round ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder="VER"
                      maxLength={3}
                      className="w-full text-xs px-2 py-1 rounded bg-black border text-white font-mono uppercase"
                      style={{ borderColor: 'var(--border-muted)' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveDotd(race.round, inputVal)
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveDotd(race.round, inputVal)}
                      className="text-xs px-2 rounded bg-red-600 text-white font-bold"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!isPast) return
                      setInputVal(dotdCode ?? '')
                      setEditing(race.round)
                    }}
                    disabled={!isPast}
                    className="w-full text-left"
                  >
                    {dotdDriver ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">⭐</span>
                        <div>
                          <p
                            className="text-xs font-bold font-mono"
                            style={{ color: dotdDriver.color }}
                          >
                            {dotdDriver.code}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {dotdDriver.firstName} {dotdDriver.lastName}
                          </p>
                        </div>
                      </div>
                    ) : isPast ? (
                      <p className="text-gray-600 text-xs italic">Click to set DOTD</p>
                    ) : (
                      <p className="text-gray-700 text-xs">TBD</p>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* DOTD Summary */}
      {Object.keys(dotdMap).length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-bold text-white text-sm">DOTD Leaderboard</h2>
          </div>
          <div className="p-4">
            {(() => {
              const counts: Record<string, number> = {}
              Object.values(dotdMap).forEach(code => {
                counts[code] = (counts[code] ?? 0) + 1
              })
              return Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => {
                  const driver = getDriverByCode(code)
                  return (
                    <div key={code} className="flex items-center gap-3 py-2">
                      {driver && <span className="w-1 h-5 rounded-full" style={{ backgroundColor: driver.color }} />}
                      <span className="text-white font-semibold text-sm flex-1">
                        {driver ? `${driver.firstName} ${driver.lastName}` : code}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: count }).map((_, i) => (
                            <span key={i} className="text-yellow-400 text-sm">⭐</span>
                          ))}
                        </div>
                        <span className="text-gray-500 text-sm font-mono">{count}x</span>
                      </div>
                    </div>
                  )
                })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
