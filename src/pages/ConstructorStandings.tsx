import { useConstructorStandings, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getTeamByConstructorId } from '@/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useState } from 'react'

export function ConstructorStandings() {
  const { data: standings, isLoading, error } = useConstructorStandings()
  const { data: raceResults } = useRaceResults()
  const [showChart, setShowChart] = useState(true)

  if (isLoading) return <LoadingSpinner message="Loading standings..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  const top6Constructors = standings?.slice(0, 6).map(s => s.Constructor.constructorId) ?? []

  const chartData = raceResults?.map(race => {
    const point: Record<string, string | number> = { race: `R${race.round}` }
    top6Constructors.forEach(constructorId => {
      let cumPoints = 0
      raceResults.forEach(r => {
        if (parseInt(r.round) <= parseInt(race.round)) {
          r.Results?.forEach(res => {
            if (res.Constructor.constructorId === constructorId) {
              cumPoints += parseFloat(res.points)
            }
          })
        }
      })
      point[constructorId] = cumPoints
    })
    return point
  }) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Constructor Championship</h1>
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
                  const s = standings?.find(s => s.Constructor.constructorId === value)
                  return s?.Constructor.name ?? value
                }}
              />
              {top6Constructors.map(constructorId => {
                const team = getTeamByConstructorId(constructorId)
                return (
                  <Line
                    key={constructorId}
                    type="monotone"
                    dataKey={constructorId}
                    stroke={team?.color ?? '#6b7280'}
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
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Constructor</th>
                <th className="text-right px-4 py-3 text-gray-500 font-semibold">Wins</th>
                <th className="text-right px-4 py-3 text-gray-500 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings?.map((s, i) => {
                const team = getTeamByConstructorId(s.Constructor.constructorId)
                return (
                  <tr
                    key={s.Constructor.constructorId}
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
                      <div className="flex items-center gap-3">
                        {team && (
                          <span
                            className="w-1 h-10 rounded-full flex-shrink-0"
                            style={{ backgroundColor: team.color }}
                          />
                        )}
                        <div>
                          <p className="text-white font-semibold">{s.Constructor.name}</p>
                          {team && (
                            <div className="flex gap-1 mt-1">
                              {team.drivers.map(dId => {
                                const driverColor = team.color
                                return (
                                  <span
                                    key={dId}
                                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                                    style={{ backgroundColor: `${driverColor}20`, color: driverColor }}
                                  >
                                    {dId.toUpperCase().slice(0, 3)}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
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
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
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
                  <th className="sticky left-0 px-3 py-2 text-left text-gray-500 font-semibold" style={{ backgroundColor: 'var(--bg-card)', minWidth: 160 }}>
                    Constructor
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
                {standings.map(s => {
                  const team = getTeamByConstructorId(s.Constructor.constructorId)
                  return (
                    <tr
                      key={s.Constructor.constructorId}
                      className="hover:bg-white/3"
                      style={{ borderBottom: '1px solid #1f1f1f' }}
                    >
                      <td className="sticky left-0 px-3 py-2" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="flex items-center gap-1.5">
                          {team && (
                            <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: team.color }} />
                          )}
                          <span className="text-white font-semibold">{team?.shortName ?? s.Constructor.name}</span>
                        </div>
                      </td>
                      {raceResults.map(race => {
                        const pts = race.Results?.reduce((sum, r) => {
                          return r.Constructor.constructorId === s.Constructor.constructorId
                            ? sum + parseFloat(r.points)
                            : sum
                        }, 0) ?? 0
                        return (
                          <td key={race.round} className="px-2 py-2 text-center font-mono">
                            {pts > 0 ? (
                              <span
                                className="inline-block px-1 rounded text-xs font-bold"
                                style={{
                                  backgroundColor: `${team?.color ?? '#e10600'}20`,
                                  color: team?.color ?? '#e10600',
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
