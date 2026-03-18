import { useDriverStandings, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId } from '@/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useState } from 'react'

export function DriverStandings() {
  const { data: standings, isLoading, error } = useDriverStandings()
  const { data: raceResults } = useRaceResults()
  const [showChart, setShowChart] = useState(true)

  if (isLoading) return <LoadingSpinner message="Loading standings..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  // Build evolution chart data: cumulative points per race per driver (top 6)
  const top6DriverIds = standings?.slice(0, 6).map(s => s.Driver.driverId) ?? []

  const chartData = raceResults?.map(race => {
    const point: Record<string, string | number> = { race: `R${race.round}` }
    top6DriverIds.forEach(driverId => {
      // Accumulate points up to this race
      let cumPoints = 0
      raceResults.forEach(r => {
        if (parseInt(r.round) <= parseInt(race.round)) {
          const result = r.Results?.find(res => res.Driver.driverId === driverId)
          if (result) cumPoints += parseFloat(result.points)
        }
      })
      point[driverId] = cumPoints
    })
    return point
  }) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Driver Championship</h1>
        <button
          onClick={() => setShowChart(v => !v)}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
        >
          {showChart ? 'Hide Chart' : 'Show Chart'}
        </button>
      </div>

      {/* Evolution Chart */}
      {showChart && chartData.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Points Evolution (Top 6)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="race" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend
                formatter={(value) => {
                  const driver = standings?.find(s => s.Driver.driverId === value)
                  return driver?.Driver.code ?? value
                }}
              />
              {top6DriverIds.map(driverId => {
                const driver = getDriverByCode(
                  standings?.find(s => s.Driver.driverId === driverId)?.Driver.code ?? ''
                )
                return (
                  <Line
                    key={driverId}
                    type="monotone"
                    dataKey={driverId}
                    stroke={driver?.color ?? '#6b7280'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Standings Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-10">Pos</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Driver</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Team</th>
                <th className="text-right px-4 py-3 text-gray-500 font-semibold">Wins</th>
                <th className="text-right px-4 py-3 text-gray-500 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings?.map((s, i) => {
                const driver = getDriverByCode(s.Driver.code ?? s.Driver.driverId)
                const team = getTeamByConstructorId(s.Constructors[0]?.constructorId ?? '')

                return (
                  <tr
                    key={s.Driver.driverId}
                    className="transition-colors hover:bg-white/3"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono font-bold text-base"
                        style={{ color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : '#6b7280' }}
                      >
                        {s.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {driver && (
                          <span
                            className="w-1 h-8 rounded-full flex-shrink-0"
                            style={{ backgroundColor: driver.color }}
                          />
                        )}
                        <div>
                          <p className="text-white font-semibold">
                            {s.Driver.givenName} {s.Driver.familyName}
                          </p>
                          <p className="text-gray-500 text-xs font-mono">{s.Driver.permanentNumber && `#${s.Driver.permanentNumber}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {team && (
                        <span
                          className="text-xs px-2 py-1 rounded font-semibold"
                          style={{
                            backgroundColor: `${team.color}20`,
                            color: team.color,
                            border: `1px solid ${team.color}40`,
                          }}
                        >
                          {team.shortName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{s.wins}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-bold font-mono text-base">{s.points}</span>
                    </td>
                  </tr>
                )
              })}
              {(!standings || standings.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No standings data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Points per race breakdown */}
      {raceResults && raceResults.length > 0 && standings && standings.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-bold text-white text-sm">Points per Race</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <th className="sticky left-0 px-3 py-2 text-left text-gray-500 font-semibold" style={{ backgroundColor: 'var(--bg-card)', minWidth: 140 }}>
                    Driver
                  </th>
                  {raceResults.map(r => (
                    <th key={r.round} className="px-2 py-2 text-center text-gray-500 font-semibold min-w-[36px]">
                      R{r.round}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-gray-500 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(s => (
                  <tr
                    key={s.Driver.driverId}
                    className="hover:bg-white/3"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                  >
                    <td className="sticky left-0 px-3 py-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const driver = getDriverByCode(s.Driver.code ?? '')
                          return driver ? (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: driver.color }} />
                          ) : null
                        })()}
                        <span className="text-white font-semibold">
                          {s.Driver.code ?? `${s.Driver.givenName[0]}${s.Driver.familyName[0]}`}
                        </span>
                      </div>
                    </td>
                    {raceResults.map(race => {
                      const result = race.Results?.find(r => r.Driver.driverId === s.Driver.driverId)
                      const pts = result ? parseFloat(result.points) : 0
                      return (
                        <td key={race.round} className="px-2 py-2 text-center font-mono">
                          {pts > 0 ? (
                            <span
                              className="inline-block px-1 rounded text-xs font-bold"
                              style={{
                                backgroundColor: '#e1060020',
                                color: pts >= 15 ? '#ef4444' : pts >= 10 ? '#f97316' : pts > 0 ? '#eab308' : '#6b7280',
                              }}
                            >
                              {pts}
                            </span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-right font-bold font-mono text-white">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
