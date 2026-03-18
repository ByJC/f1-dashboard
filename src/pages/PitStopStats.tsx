import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useSchedule, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId } from '@/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JolpicaPitStop {
  driverId: string
  lap: string
  stop: string
  time: string
  duration: string
}

interface JolpicaPitStopResponse {
  MRData: {
    RaceTable: {
      Races: Array<{ PitStops?: JolpicaPitStop[] }>
    }
  }
}

interface EnrichedStop {
  driverId: string
  round: string
  raceName: string
  lap: number
  duration: number
  constructorId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STALE_TIME = 1000 * 60 * 30

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipPayload {
  value: number
  payload: { teamId: string; color: string }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-muted)' }}
    >
      <p className="text-white font-semibold">{label}</p>
      <p className="text-gray-400 mt-0.5">{payload[0].value.toFixed(3)}s avg</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PitStopStats() {
  const { data: schedule, isLoading: schedLoading, error: schedError } = useSchedule()
  const { data: raceResults, isLoading: resultsLoading, error: resultsError } = useRaceResults()

  const now = new Date()
  const completedRaces = useMemo(
    () => (schedule ?? []).filter(r => new Date(r.date) < now),
    [schedule, now],
  )

  // Build constructor map from race results
  const driverConstructorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    ;(raceResults ?? []).forEach(race => {
      race.Results?.forEach(r => {
        map[r.Driver.driverId] = r.Constructor.constructorId
      })
    })
    return map
  }, [raceResults])

  // Race name map
  const raceNameMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    ;(schedule ?? []).forEach(r => { map[r.round] = r.raceName })
    return map
  }, [schedule])

  // Fetch pit stops for all completed races
  const pitStopQueries = useQueries({
    queries: completedRaces.map(race => ({
      queryKey: ['pitStops', race.round],
      queryFn: async (): Promise<{ round: string; stops: JolpicaPitStop[] }> => {
        const res = await fetch(
          `https://api.jolpi.ca/ergast/f1/current/${race.round}/pitstops.json?limit=100`,
        )
        if (!res.ok) throw new Error(`Pit stop API error: ${res.status}`)
        const data: JolpicaPitStopResponse = await res.json()
        return {
          round: race.round,
          stops: data.MRData.RaceTable.Races[0]?.PitStops ?? [],
        }
      },
      enabled: completedRaces.length > 0,
      staleTime: STALE_TIME,
    })),
  })

  const isLoading = schedLoading || resultsLoading
  const error = schedError || resultsError
  const anyPitLoading = pitStopQueries.some(q => q.isLoading)

  // Flatten all valid pit stops
  const allStops = useMemo<EnrichedStop[]>(() => {
    const result: EnrichedStop[] = []
    pitStopQueries.forEach(q => {
      if (!q.data) return
      const { round, stops } = q.data
      stops.forEach(s => {
        const dur = parseFloat(s.duration)
        if (isNaN(dur) || dur <= 0 || dur > 120) return // filter bogus values
        result.push({
          driverId: s.driverId,
          round,
          raceName: raceNameMap[round] ?? `Round ${round}`,
          lap: parseInt(s.lap),
          duration: dur,
          constructorId: driverConstructorMap[s.driverId] ?? '',
        })
      })
    })
    return result
  }, [pitStopQueries, raceNameMap, driverConstructorMap])

  // ── Stats per driver ────────────────────────────────────────────────────────
  const driverStats = useMemo(() => {
    const map: Record<string, { durations: number[]; driverId: string }> = {}
    allStops.forEach(s => {
      if (!map[s.driverId]) map[s.driverId] = { durations: [], driverId: s.driverId }
      map[s.driverId].durations.push(s.duration)
    })
    return Object.values(map).map(d => {
      const sorted = [...d.durations].sort((a, b) => a - b)
      return {
        driverId: d.driverId,
        avg: d.durations.reduce((a, b) => a + b, 0) / d.durations.length,
        fastest: sorted[0],
        total: d.durations.length,
      }
    }).sort((a, b) => a.avg - b.avg)
  }, [allStops])

  // ── Stats per team ──────────────────────────────────────────────────────────
  const teamStats = useMemo(() => {
    const map: Record<string, { durations: number[]; constructorId: string }> = {}
    allStops.forEach(s => {
      if (!s.constructorId) return
      if (!map[s.constructorId]) map[s.constructorId] = { durations: [], constructorId: s.constructorId }
      map[s.constructorId].durations.push(s.duration)
    })
    return Object.values(map).map(t => {
      const sorted = [...t.durations].sort((a, b) => a - b)
      return {
        constructorId: t.constructorId,
        avg: t.durations.reduce((a, b) => a + b, 0) / t.durations.length,
        fastest: sorted[0],
        total: t.durations.length,
      }
    }).sort((a, b) => a.avg - b.avg)
  }, [allStops])

  // ── Best and worst stops ────────────────────────────────────────────────────
  const sortedStops = useMemo(
    () => [...allStops].sort((a, b) => a.duration - b.duration),
    [allStops],
  )
  const top10 = sortedStops.slice(0, 10)
  const worst5 = sortedStops.filter(s => s.duration > 4).slice(-5).reverse()

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = teamStats.map(t => {
    const team = getTeamByConstructorId(t.constructorId)
    return {
      name: team?.shortName ?? t.constructorId,
      avg: parseFloat(t.avg.toFixed(3)),
      teamId: t.constructorId,
      color: team?.color ?? '#6b7280',
    }
  })

  if (isLoading) return <LoadingSpinner message="Loading pit stop stats..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  if (completedRaces.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div
          className="rounded-xl border p-12 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="text-4xl mb-3">🔧</div>
          <p className="text-gray-400 font-semibold">No completed races yet</p>
          <p className="text-gray-600 text-sm mt-1">Pit stop statistics will appear after races are completed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {anyPitLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded-full border border-gray-700 border-t-red-600 animate-spin" />
          Loading pit stop data for {completedRaces.length} races…
        </div>
      )}

      {allStops.length === 0 && !anyPitLoading ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">No pit stop data available yet.</p>
        </div>
      ) : (
        <>
          {/* Top row stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Pit Stops" value={allStops.length.toString()} />
            <StatCard
              label="Fastest Stop"
              value={top10[0] ? `${top10[0].duration.toFixed(3)}s` : '—'}
              sub={top10[0] ? getDriverByCode(top10[0].driverId)?.code ?? top10[0].driverId : undefined}
            />
            <StatCard
              label="Avg Stop Duration"
              value={
                allStops.length > 0
                  ? `${(allStops.reduce((a, b) => a + b.duration, 0) / allStops.length).toFixed(3)}s`
                  : '—'
              }
            />
            <StatCard label="Races Tracked" value={`${completedRaces.length}`} />
          </div>

          {/* Team avg chart */}
          {chartData.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <h2 className="font-bold text-white text-sm">Average Pit Stop Duration by Team</h2>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v: number) => `${v}s`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Best 10 / Worst 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Best stops */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}>
                <span className="text-yellow-400">⚡</span>
                <h2 className="font-bold text-white text-sm">Top 10 Fastest Stops</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {top10.map((s, i) => {
                  const driver = getDriverByCode(s.driverId)
                  const team = getTeamByConstructorId(s.constructorId)
                  return (
                    <StopRow
                      key={`${s.round}-${s.driverId}-${s.lap}`}
                      rank={i + 1}
                      driverId={s.driverId}
                      driverLabel={
                        driver
                          ? `${driver.firstName[0]}. ${driver.lastName}`
                          : s.driverId
                      }
                      driverColor={driver?.color ?? team?.color ?? '#6b7280'}
                      raceName={s.raceName}
                      lap={s.lap}
                      duration={s.duration}
                      highlight={i === 0}
                    />
                  )
                })}
                {top10.length === 0 && (
                  <p className="text-gray-500 text-sm p-4">No data yet.</p>
                )}
              </div>
            </div>

            {/* Worst stops */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}>
                <span>🐢</span>
                <h2 className="font-bold text-white text-sm">Worst Stops (&gt;4s)</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                {worst5.map((s, i) => {
                  const driver = getDriverByCode(s.driverId)
                  const team = getTeamByConstructorId(s.constructorId)
                  return (
                    <StopRow
                      key={`${s.round}-${s.driverId}-${s.lap}`}
                      rank={i + 1}
                      driverId={s.driverId}
                      driverLabel={
                        driver
                          ? `${driver.firstName[0]}. ${driver.lastName}`
                          : s.driverId
                      }
                      driverColor={driver?.color ?? team?.color ?? '#6b7280'}
                      raceName={s.raceName}
                      lap={s.lap}
                      duration={s.duration}
                    />
                  )
                })}
                {worst5.length === 0 && (
                  <p className="text-gray-500 text-sm p-4">
                    {allStops.length > 0 ? 'No stops longer than 4s recorded.' : 'No data yet.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Driver stats */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <h2 className="font-bold text-white text-sm">Driver Pit Stop Stats</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <th className="text-left px-5 py-2 text-gray-500 font-medium text-xs">Driver</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium text-xs">Stops</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium text-xs">Fastest</th>
                    <th className="text-right px-5 py-2 text-gray-500 font-medium text-xs">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {driverStats.map(d => {
                    const driver = getDriverByCode(d.driverId)
                    const constructorId = driverConstructorMap[d.driverId] ?? ''
                    const team = getTeamByConstructorId(constructorId)
                    const color = driver?.color ?? team?.color ?? '#6b7280'
                    return (
                      <tr
                        key={d.driverId}
                        className="border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-white text-xs">
                              {driver
                                ? `${driver.firstName[0]}. ${driver.lastName}`
                                : d.driverId}
                            </span>
                            {team && (
                              <span className="text-gray-600 text-xs hidden sm:inline">
                                {team.shortName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right px-4 py-2.5 text-gray-400 text-xs font-mono">{d.total}</td>
                        <td className="text-right px-4 py-2.5 text-xs font-mono" style={{ color }}>
                          {d.fastest.toFixed(3)}s
                        </td>
                        <td className="text-right px-5 py-2.5 text-gray-300 text-xs font-mono">
                          {d.avg.toFixed(3)}s
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team stats */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <h2 className="font-bold text-white text-sm">Team Pit Stop Stats</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <th className="text-left px-5 py-2 text-gray-500 font-medium text-xs">Team</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium text-xs">Stops</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium text-xs">Fastest</th>
                    <th className="text-right px-5 py-2 text-gray-500 font-medium text-xs">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map(t => {
                    const team = getTeamByConstructorId(t.constructorId)
                    return (
                      <tr
                        key={t.constructorId}
                        className="border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                        style={{ borderColor: 'var(--border-default)' }}
                      >
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team?.color ?? '#6b7280' }}
                            />
                            <span className="text-white text-xs">
                              {team?.name ?? t.constructorId}
                            </span>
                          </div>
                        </td>
                        <td className="text-right px-4 py-2.5 text-gray-400 text-xs font-mono">{t.total}</td>
                        <td
                          className="text-right px-4 py-2.5 text-xs font-mono"
                          style={{ color: team?.color ?? '#6b7280' }}
                        >
                          {t.fastest.toFixed(3)}s
                        </td>
                        <td className="text-right px-5 py-2.5 text-gray-300 text-xs font-mono">
                          {t.avg.toFixed(3)}s
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-black text-white">Pit Stop Statistics</h1>
      <p className="text-gray-500 text-sm mt-1">Stop durations and performance analysis across the season</p>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-xl font-mono">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5 font-mono">{sub}</p>}
    </div>
  )
}

function StopRow({
  rank,
  driverLabel,
  driverColor,
  raceName,
  lap,
  duration,
  highlight = false,
}: {
  rank: number
  driverId: string
  driverLabel: string
  driverColor: string
  raceName: string
  lap: number
  duration: number
  highlight?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
      style={highlight ? { backgroundColor: '#ffd70008' } : undefined}
    >
      <span className="text-gray-600 text-xs font-mono w-5 text-right flex-shrink-0">{rank}</span>
      <span
        className="w-1 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: driverColor }}
      />
      <span className="text-white text-xs flex-1 truncate">{driverLabel}</span>
      <span className="text-gray-500 text-xs hidden sm:block truncate max-w-[120px]">{raceName}</span>
      <span className="text-gray-600 text-xs font-mono">L{lap}</span>
      <span
        className="text-xs font-mono font-bold"
        style={{ color: highlight ? '#ffd700' : driverColor }}
      >
        {duration.toFixed(3)}s
      </span>
    </div>
  )
}
