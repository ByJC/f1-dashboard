import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode } from '@/utils'
import type { DriverInfo } from '@/types/f1'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface LapTiming {
  driverId: string
  position: string
  time: string
}

interface LapData {
  number: string
  Timings: LapTiming[]
}

function useLapPositions(round: string | null) {
  return useQuery({
    queryKey: ['lapPositions', round],
    queryFn: async () => {
      const res = await fetch(
        `https://api.jolpi.ca/ergast/f1/current/${round}/laps.json?limit=2000`
      )
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const json = await res.json()
      const laps: LapData[] = json.MRData?.RaceTable?.Races?.[0]?.Laps ?? []
      return laps.map(lap => {
        const entry: Record<string, number | string> = { lap: parseInt(lap.number) }
        lap.Timings.forEach(t => {
          entry[t.driverId] = parseInt(t.position)
        })
        return entry
      })
    },
    enabled: round !== null,
    staleTime: 1000 * 60 * 30,
  })
}

const POSITION_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
}

function getPositionLabel(position: string, status: string): string {
  if (status === 'Finished' || status.startsWith('+')) return position
  if (status === 'Disqualified') return 'DSQ'
  if (status.includes('Lap')) return 'DNF'
  return 'RET'
}

export function RaceResults() {
  const { data: races, isLoading, error } = useRaceResults()
  const [openLapChart, setOpenLapChart] = useState<string | null>(null)
  const { data: lapData, isLoading: lapLoading } = useLapPositions(openLapChart)

  if (isLoading) return <LoadingSpinner message="Loading race results..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  if (!races || races.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Race Results Grid</h1>
        <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-gray-500">No race results available yet for 2026</p>
        </div>
      </div>
    )
  }

  // All unique driver IDs that appeared in races
  const driverIdsInRaces = new Set<string>()
  races.forEach(r => r.Results?.forEach(res => driverIdsInRaces.add(res.Driver.driverId)))

  // Build driver list from race data
  const raceDrivers: { id: string; code: string; info?: DriverInfo }[] = []
  races[races.length - 1]?.Results?.forEach(res => {
    const info = getDriverByCode(res.Driver.code ?? '')
    raceDrivers.push({
      id: res.Driver.driverId,
      code: res.Driver.code ?? res.Driver.driverId,
      info,
    })
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Race Results Grid</h1>

      {/* Driver legend */}
      <div className="flex flex-wrap gap-2">
        {raceDrivers.map(d => (
          <span
            key={d.id}
            className="text-xs px-2 py-1 rounded font-mono font-bold"
            style={{
              backgroundColor: d.info ? `${d.info.color}20` : 'var(--border-default)',
              color: d.info?.color ?? '#6b7280',
              border: `1px solid ${d.info ? `${d.info.color}40` : 'var(--border-muted)'}`,
            }}
          >
            {d.code}
          </span>
        ))}
      </div>

      {/* Results grid */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="overflow-x-auto">
          <table className="text-xs whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th className="sticky left-0 px-3 py-2 text-left text-gray-500 font-semibold" style={{ backgroundColor: 'var(--bg-card)', minWidth: 60 }}>
                  P
                </th>
                {races.map(r => (
                  <th key={r.round} className="px-2 py-2 text-center text-gray-500 font-semibold min-w-[52px]">
                    <div>R{r.round}</div>
                    <div className="text-gray-600 font-normal">{r.Circuit.Location.country.slice(0, 3).toUpperCase()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(pos => (
                <tr
                  key={pos}
                  className="hover:bg-white/3"
                  style={{ borderBottom: '1px solid #1f1f1f' }}
                >
                  <td className="sticky left-0 px-3 py-1.5 font-mono font-bold" style={{
                    backgroundColor: 'var(--bg-card)',
                    color: POSITION_COLORS[pos] ?? '#6b7280'
                  }}>
                    {pos}
                  </td>
                  {races.map(race => {
                    const result = race.Results?.find(r => r.position === String(pos))
                    if (!result) {
                      return (
                        <td key={race.round} className="px-2 py-1.5 text-center">
                          <span className="text-gray-700">—</span>
                        </td>
                      )
                    }
                    const driver = getDriverByCode(result.Driver.code ?? '')
                    const label = getPositionLabel(result.position, result.status)
                    const isRetired = label !== result.position

                    return (
                      <td key={race.round} className="px-1.5 py-1">
                        <div
                          className="text-center px-1.5 py-1 rounded font-mono font-bold text-xs"
                          style={{
                            backgroundColor: driver ? `${driver.color}25` : 'var(--border-default)',
                            color: driver?.color ?? '#6b7280',
                            opacity: isRetired ? 0.5 : 1,
                          }}
                          title={`${result.Driver.givenName} ${result.Driver.familyName} — ${result.status}`}
                        >
                          {result.Driver.code ?? result.Driver.driverId.slice(0, 3).toUpperCase()}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lap Chart Modal */}
      {openLapChart !== null && (() => {
        const race = races.find(r => r.round === openLapChart)
        const top10DriverIds = race?.Results?.slice(0, 10).map(r => r.Driver.driverId) ?? []
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            onClick={() => setOpenLapChart(null)}
          >
            <div
              className="rounded-xl border w-full max-w-3xl p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white text-sm">{race?.raceName} — Lap Chart</h2>
                <button
                  onClick={() => setOpenLapChart(null)}
                  className="text-gray-500 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
              {lapLoading ? (
                <div className="text-center py-8 text-gray-500">Loading lap data...</div>
              ) : !lapData || lapData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No lap data available</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lapData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis
                        dataKey="lap"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        label={{ value: 'Lap', position: 'insideBottomRight', fill: '#6b7280', fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        domain={[1, 10]}
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                        labelFormatter={v => `Lap ${v}`}
                      />
                      {top10DriverIds.map(driverId => {
                        const info = getDriverByCode(driverId) ?? getDriverByCode(driverId.slice(0, 3).toUpperCase())
                        const color = info?.color ?? '#6b7280'
                        return (
                          <Line
                            key={driverId}
                            type="monotone"
                            dataKey={driverId}
                            stroke={color}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        )
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {top10DriverIds.map(driverId => {
                      const result = race?.Results?.find(r => r.Driver.driverId === driverId)
                      const info = result ? getDriverByCode(result.Driver.code ?? '') : null
                      const color = info?.color ?? '#6b7280'
                      return (
                        <span
                          key={driverId}
                          className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                          style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          {result?.Driver.code ?? driverId.slice(0, 3).toUpperCase()}
                        </span>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Individual race results */}
      <h2 className="text-lg font-bold text-white mt-8">Race Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {races.map(race => (
          <div
            key={race.round}
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
              <div>
                <span className="text-gray-500 text-xs font-mono mr-2">R{race.round}</span>
                <span className="text-white font-semibold text-sm">{race.raceName}</span>
              </div>
              <button
                onClick={() => setOpenLapChart(openLapChart === race.round ? null : race.round)}
                className="text-xs px-2 py-1 rounded font-semibold transition-colors"
                style={{
                  backgroundColor: openLapChart === race.round ? '#e1060020' : 'var(--border-default)',
                  color: openLapChart === race.round ? '#ef4444' : '#6b7280',
                  border: `1px solid ${openLapChart === race.round ? '#e1060040' : 'transparent'}`,
                }}
              >
                Lap Chart
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {race.Results?.slice(0, 10).map(result => {
                const driver = getDriverByCode(result.Driver.code ?? '')
                return (
                  <div key={result.Driver.driverId} className="flex items-center gap-2 px-4 py-2">
                    <span
                      className="text-xs font-mono font-bold w-6 text-right"
                      style={{ color: POSITION_COLORS[parseInt(result.position)] ?? '#6b7280' }}
                    >
                      {result.position}
                    </span>
                    {driver && (
                      <span className="w-1 h-5 rounded-full" style={{ backgroundColor: driver.color }} />
                    )}
                    <span className="text-white text-xs font-semibold flex-1">
                      {result.Driver.givenName} {result.Driver.familyName}
                    </span>
                    <span className="text-gray-500 text-xs font-mono">{result.points}pts</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
