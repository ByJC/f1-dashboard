import { useState, useEffect } from 'react'
import { useRaceResults, useQualifyingResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { drivers, teams } from '@/utils'
import type { DriverInfo } from '@/types/f1'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const STORAGE_KEY = 'f1-h2h-selection-2026'

function isDNF(status: string): boolean {
  return (
    status !== 'Finished' &&
    !status.startsWith('+') &&
    status !== 'Disqualified'
  )
}

interface DriverStats {
  points: number
  wins: number
  podiums: number
  poles: number
  bestFinish: number
  dnfs: number
  totalFinishes: number
  finishSum: number
}

function emptyStats(): DriverStats {
  return { points: 0, wins: 0, podiums: 0, poles: 0, bestFinish: 99, dnfs: 0, totalFinishes: 0, finishSum: 0 }
}

function StatRow({
  label,
  v1,
  v2,
  d1,
  d2,
  lowerIsBetter = false,
}: {
  label: string
  v1: number | string
  v2: number | string
  d1: DriverInfo
  d2: DriverInfo
  lowerIsBetter?: boolean
}) {
  const num1 = typeof v1 === 'number' ? v1 : parseFloat(v1)
  const num2 = typeof v2 === 'number' ? v2 : parseFloat(v2)
  const d1Wins = !lowerIsBetter ? num1 > num2 : num1 < num2
  const d2Wins = !lowerIsBetter ? num2 > num1 : num2 < num1

  return (
    <div
      className="flex items-center gap-4 px-5 py-3"
      style={{ borderBottom: '1px solid #1f1f1f' }}
    >
      <div className="flex-1 text-right">
        <span
          className="font-mono font-bold text-lg"
          style={{ color: d1Wins ? d1.color : 'var(--text-secondary)' }}
        >
          {typeof v1 === 'number' && !Number.isInteger(v1) ? v1.toFixed(2) : v1}
        </span>
      </div>
      <div className="w-40 text-center text-xs text-gray-500 font-semibold">{label}</div>
      <div className="flex-1 text-left">
        <span
          className="font-mono font-bold text-lg"
          style={{ color: d2Wins ? d2.color : 'var(--text-secondary)' }}
        >
          {typeof v2 === 'number' && !Number.isInteger(v2) ? v2.toFixed(2) : v2}
        </span>
      </div>
    </div>
  )
}

export function H2H() {
  const { data: races, isLoading: racesLoading, error: racesError } = useRaceResults()
  const { data: qualRaces, isLoading: qualLoading, error: qualError } = useQualifyingResults()

  const [driver1Id, setDriver1Id] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      return saved.d1 ?? 'norris'
    } catch {
      return 'norris'
    }
  })
  const [driver2Id, setDriver2Id] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      return saved.d2 ?? 'piastri'
    } catch {
      return 'piastri'
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ d1: driver1Id, d2: driver2Id }))
  }, [driver1Id, driver2Id])

  const d1 = drivers.find(d => d.id === driver1Id) ?? drivers[0]
  const d2 = drivers.find(d => d.id === driver2Id) ?? drivers[1]

  const isLoading = racesLoading || qualLoading
  const error = racesError ?? qualError

  if (isLoading) return <LoadingSpinner message="Loading head-to-head data..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  // Compute stats
  const stats1 = emptyStats()
  const stats2 = emptyStats()
  const h2hRaces: { round: string; raceName: string; p1: number; p2: number }[] = []
  const chartData: { race: string; [key: string]: number | string }[] = []

  const matchDriver = (apiDriverId: string, apiCode: string | undefined, local: DriverInfo) =>
    apiDriverId === local.id || apiCode?.toUpperCase() === local.code.toUpperCase()

  if (races) {
    for (const race of races) {
      const r1 = race.Results?.find(r => matchDriver(r.Driver.driverId, r.Driver.code, d1))
      const r2 = race.Results?.find(r => matchDriver(r.Driver.driverId, r.Driver.code, d2))

      const pts1 = parseFloat(r1?.points ?? '0')
      const pts2 = parseFloat(r2?.points ?? '0')
      stats1.points += pts1
      stats2.points += pts2

      if (r1) {
        const pos1 = parseInt(r1.position)
        if (pos1 === 1) stats1.wins++
        if (pos1 <= 3) stats1.podiums++
        if (pos1 < stats1.bestFinish) stats1.bestFinish = pos1
        if (isDNF(r1.status)) stats1.dnfs++
        else { stats1.finishSum += pos1; stats1.totalFinishes++ }
      }
      if (r2) {
        const pos2 = parseInt(r2.position)
        if (pos2 === 1) stats2.wins++
        if (pos2 <= 3) stats2.podiums++
        if (pos2 < stats2.bestFinish) stats2.bestFinish = pos2
        if (isDNF(r2.status)) stats2.dnfs++
        else { stats2.finishSum += pos2; stats2.totalFinishes++ }
      }

      if (r1 && r2) {
        h2hRaces.push({
          round: race.round,
          raceName: race.raceName,
          p1: parseInt(r1.position),
          p2: parseInt(r2.position),
        })
      }

      chartData.push({
        race: `R${race.round}`,
        [d1.id]: pts1,
        [d2.id]: pts2,
      })
    }
  }

  // Count poles from qualifying
  if (qualRaces) {
    for (const race of qualRaces) {
      const q1 = race.QualifyingResults?.find(r => matchDriver(r.Driver.driverId, r.Driver.code, d1))
      const q2 = race.QualifyingResults?.find(r => matchDriver(r.Driver.driverId, r.Driver.code, d2))
      if (q1?.position === '1') stats1.poles++
      if (q2?.position === '1') stats2.poles++
    }
  }

  const avg1 = stats1.totalFinishes > 0 ? stats1.finishSum / stats1.totalFinishes : 0
  const avg2 = stats2.totalFinishes > 0 ? stats2.finishSum / stats2.totalFinishes : 0
  const h2hWins1 = h2hRaces.filter(r => r.p1 < r.p2).length
  const h2hWins2 = h2hRaces.filter(r => r.p2 < r.p1).length

  const noRaces = !races || races.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Head-to-Head</h1>

      {/* Driver selectors */}
      <div className="grid grid-cols-2 gap-4">
        {([
          { driver: d1, setId: setDriver1Id, other: d2.id },
          { driver: d2, setId: setDriver2Id, other: d1.id },
        ] as const).map(({ driver, setId, other }, idx) => (
          <div
            key={idx}
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div
              className="h-1 rounded-full mb-3"
              style={{ backgroundColor: driver.color }}
            />
            <select
              className="w-full text-sm font-semibold rounded-lg px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--bg-base)',
                color: driver.color,
                border: `1px solid ${driver.color}50`,
              }}
              value={driver.id}
              onChange={e => setId(e.target.value)}
            >
              {drivers
                .filter(d => d.id !== other)
                .map(d => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} ({d.code})
                  </option>
                ))}
            </select>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl">{driver.flag ? `🏳️` : ''}</span>
              <div>
                <p className="text-white font-bold text-lg leading-tight">
                  {driver.firstName} {driver.lastName}
                </p>
                <p className="text-xs text-gray-500">{driver.nationality} · #{driver.number}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {noRaces ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">No race results available yet. Check back after the first race.</p>
        </div>
      ) : (
        <>
          {/* Stats comparison */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            {/* Header */}
            <div
              className="flex items-center px-5 py-4"
              style={{ borderBottom: '1px solid #2a2a2a' }}
            >
              <div className="flex-1 flex justify-end">
                <span className="font-bold text-white">{d1.code}</span>
              </div>
              <div className="w-40 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stat
              </div>
              <div className="flex-1 flex justify-start">
                <span className="font-bold text-white">{d2.code}</span>
              </div>
            </div>

            <StatRow label="Points" v1={stats1.points} v2={stats2.points} d1={d1} d2={d2} />
            <StatRow label="Wins" v1={stats1.wins} v2={stats2.wins} d1={d1} d2={d2} />
            <StatRow label="Podiums" v1={stats1.podiums} v2={stats2.podiums} d1={d1} d2={d2} />
            <StatRow label="Poles" v1={stats1.poles} v2={stats2.poles} d1={d1} d2={d2} />
            <StatRow label="Best Finish" v1={stats1.bestFinish === 99 ? '—' : stats1.bestFinish} v2={stats2.bestFinish === 99 ? '—' : stats2.bestFinish} d1={d1} d2={d2} lowerIsBetter />
            <StatRow label="DNFs" v1={stats1.dnfs} v2={stats2.dnfs} d1={d1} d2={d2} lowerIsBetter />
            <StatRow label="Avg Finish" v1={avg1 || '—'} v2={avg2 || '—'} d1={d1} d2={d2} lowerIsBetter />

            {/* H2H score */}
            <div className="flex items-center gap-4 px-5 py-4" style={{ borderTop: '1px solid #2a2a2a' }}>
              <div className="flex-1 text-right">
                <span
                  className="font-mono font-black text-3xl"
                  style={{ color: h2hWins1 > h2hWins2 ? d1.color : 'var(--text-secondary)' }}
                >
                  {h2hWins1}
                </span>
              </div>
              <div className="w-40 text-center text-xs text-gray-500 font-semibold">
                Head-to-Head
              </div>
              <div className="flex-1 text-left">
                <span
                  className="font-mono font-black text-3xl"
                  style={{ color: h2hWins2 > h2hWins1 ? d2.color : 'var(--text-secondary)' }}
                >
                  {h2hWins2}
                </span>
              </div>
            </div>
          </div>

          {/* Points per race bar chart */}
          {chartData.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Points Per Race</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="race" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid #3a3a3a',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      drivers.find(d => d.id === value)?.code ?? value
                    }
                  />
                  <Bar dataKey={d1.id} fill={d1.color} radius={[3, 3, 0, 0]} />
                  <Bar dataKey={d2.id} fill={d2.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Race-by-race H2H */}
          {h2hRaces.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
                <h2 className="font-bold text-white text-sm">Race-by-Race</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {h2hRaces.map(r => {
                  const d1Won = r.p1 < r.p2
                  return (
                    <div key={r.round} className="flex items-center px-5 py-2 text-sm gap-3">
                      <span className="text-gray-600 font-mono text-xs w-6">R{r.round}</span>
                      <span className="text-gray-400 flex-1 text-xs truncate">{r.raceName}</span>
                      <span
                        className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                        style={{
                          color: d1Won ? d1.color : '#6b7280',
                          backgroundColor: d1Won ? `${d1.color}20` : 'transparent',
                        }}
                      >
                        P{r.p1}
                      </span>
                      <span className="text-gray-600">vs</span>
                      <span
                        className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                        style={{
                          color: !d1Won ? d2.color : '#6b7280',
                          backgroundColor: !d1Won ? `${d2.color}20` : 'transparent',
                        }}
                      >
                        P{r.p2}
                      </span>
                      <span
                        className="text-xs font-bold w-8 text-right"
                        style={{ color: d1Won ? d1.color : d2.color }}
                      >
                        {d1Won ? d1.code : d2.code}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Teammate comparison */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Teammate Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => {
                const teamDrivers = drivers.filter(d => d.team === team.id)
                if (teamDrivers.length < 2) return null

                return (
                  <div
                    key={team.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                  >
                    <div
                      className="px-4 py-3 flex items-center gap-2"
                      style={{ borderBottom: '1px solid #2a2a2a' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-semibold text-white text-sm">{team.shortName}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border-default)' }}>
                      {teamDrivers.map(td => {
                        const tdStats = emptyStats()
                        if (races) {
                          for (const race of races) {
                            const r = race.Results?.find(res => matchDriver(res.Driver.driverId, res.Driver.code, td))
                            if (r) {
                              tdStats.points += parseFloat(r.points)
                              const pos = parseInt(r.position)
                              if (pos === 1) tdStats.wins++
                              if (pos <= 3) tdStats.podiums++
                              if (!isDNF(r.status)) {
                                tdStats.finishSum += pos
                                tdStats.totalFinishes++
                              }
                            }
                          }
                        }
                        const avg = tdStats.totalFinishes > 0
                          ? (tdStats.finishSum / tdStats.totalFinishes).toFixed(1)
                          : '—'
                        return (
                          <div key={td.id} className="p-4">
                            <p className="font-bold text-sm mb-1" style={{ color: td.color }}>
                              {td.code}
                            </p>
                            <p className="text-white text-xs text-gray-500 mb-3 truncate">
                              {td.firstName} {td.lastName}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Pts</span>
                                <span className="text-white font-mono font-bold">{tdStats.points}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Wins</span>
                                <span className="text-white font-mono">{tdStats.wins}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Podiums</span>
                                <span className="text-white font-mono">{tdStats.podiums}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Avg P</span>
                                <span className="text-white font-mono">{avg}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
