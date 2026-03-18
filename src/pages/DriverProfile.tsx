import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import {
  useDriverCareerResults,
  useDriverCareerQualifying,
  useDriverAllSeasonStandings,
} from '@/hooks/useF1Data'
import { drivers, getDriver, getTeamByConstructorId } from '@/utils'
import type { RaceResult, QualifyingResult } from '@/types/f1'

const STORAGE_KEY = 'f1-driver-profile-2026'

function isDNF(status: string): boolean {
  return (
    status !== 'Finished' &&
    !status.startsWith('+') &&
    status !== 'Disqualified'
  )
}

interface StatCardProps {
  label: string
  value: string
  subtitle?: string
  color: string
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1.5"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}

export function DriverProfile() {
  const { driverId } = useParams<{ driverId: string }>()
  const navigate = useNavigate()

  const effectiveDriverId = driverId ?? localStorage.getItem(STORAGE_KEY) ?? 'norris'

  const {
    data: results,
    isLoading: loadingResults,
    error: errorResults,
  } = useDriverCareerResults(effectiveDriverId)

  const { data: qualifyingData, isLoading: loadingQual } = useDriverCareerQualifying(effectiveDriverId)

  // Extract seasons from results to fetch standings per season
  const seasons = useMemo(
    () => [...new Set(results?.map(r => r.season) ?? [])].sort(),
    [results]
  )

  const { data: seasonStandings, isLoading: loadingStandings } = useDriverAllSeasonStandings(
    effectiveDriverId,
    seasons
  )

  const isLoading = loadingResults || loadingQual || loadingStandings

  const localDriver = getDriver(effectiveDriverId)
  const driverColor = localDriver?.color ?? '#e10600'

  const raceResults = useMemo(
    () =>
      results
        ?.map(r => r.Results?.[0])
        .filter((r): r is RaceResult => Boolean(r)) ?? [],
    [results]
  )

  const qualResults = useMemo(
    () =>
      qualifyingData
        ?.map(r => r.QualifyingResults?.[0])
        .filter((r): r is QualifyingResult => Boolean(r)) ?? [],
    [qualifyingData]
  )

  // Stats
  const totalGPs = raceResults.length
  const wins = raceResults.filter(r => r.position === '1').length
  const podiums = raceResults.filter(r => ['1', '2', '3'].includes(r.position)).length
  const poles = qualResults.filter(r => r.position === '1').length
  const careerPoints = raceResults.reduce((sum, r) => sum + parseFloat(r.points || '0'), 0)
  const champTitles = seasonStandings?.filter(s => s.standing?.position === '1').length ?? 0
  const fastestLaps = raceResults.filter(r => r.FastestLap?.rank === '1').length
  const dnfs = raceResults.filter(r => isDNF(r.status)).length
  const finishedRaces = raceResults.filter(r => !isDNF(r.status) && r.position && !isNaN(parseInt(r.position)))
  const avgFinish =
    finishedRaces.length > 0
      ? finishedRaces.reduce((sum, r) => sum + parseInt(r.position), 0) / finishedRaces.length
      : 0
  const frontRowStarts = qualResults.filter(r => ['1', '2'].includes(r.position)).length

  // Chart data
  const seasonPoints = useMemo(() => {
    const map: Record<string, number> = {}
    results?.forEach(race => {
      const pts = parseFloat(race.Results?.[0]?.points ?? '0')
      map[race.season] = (map[race.season] ?? 0) + pts
    })
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, points]) => ({ season, points: Math.round(points * 10) / 10 }))
  }, [results])

  const winsPerSeason = useMemo(() => {
    const map: Record<string, number> = {}
    results?.forEach(race => {
      if (race.Results?.[0]?.position === '1') {
        map[race.season] = (map[race.season] ?? 0) + 1
      }
    })
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([season, wins]) => ({ season, wins }))
  }, [results])

  const seasonPositions = useMemo(
    () =>
      (seasonStandings ?? [])
        .filter(s => s.standing !== null)
        .map(s => ({
          season: s.season,
          position: parseInt(s.standing!.position),
        }))
        .sort((a, b) => parseInt(a.season) - parseInt(b.season)),
    [seasonStandings]
  )

  const winsList = useMemo(
    () =>
      [...(results?.filter(r => r.Results?.[0]?.position === '1') ?? [])].reverse().map(r => ({
        season: r.season,
        raceName: r.raceName,
        circuitName: r.Circuit.circuitName,
        date: r.date,
        constructorId: r.Results?.[0]?.Constructor.constructorId ?? '',
        constructorName: r.Results?.[0]?.Constructor.name ?? '',
        hasFastestLap: r.Results?.[0]?.FastestLap?.rank === '1',
      })),
    [results]
  )

  function handleDriverChange(newId: string) {
    localStorage.setItem(STORAGE_KEY, newId)
    navigate(`/drivers/${newId}`)
  }

  if (isLoading) return <LoadingSpinner message="Loading driver profile..." />
  if (errorResults) return <ErrorMessage message={(errorResults as Error).message} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">Driver Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Career statistics</p>
        </div>
        <select
          value={effectiveDriverId}
          onChange={e => handleDriverChange(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-white cursor-pointer"
          style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--bg-card)' }}
        >
          {drivers.map(d => (
            <option key={d.id} value={d.id} style={{ backgroundColor: 'var(--bg-card)' }}>
              {d.firstName} {d.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Hero */}
      {localDriver && (
        <div
          className="rounded-xl border p-5 flex items-center gap-5"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-default)',
            borderLeft: `4px solid ${driverColor}`,
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
            style={{ backgroundColor: `${driverColor}20`, color: driverColor }}
          >
            #{localDriver.number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <img
                src={`https://flagcdn.com/w40/${localDriver.flag}.png`}
                alt={localDriver.nationality}
                className="h-4 rounded-sm flex-shrink-0"
              />
              <h2 className="text-xl font-black text-white">
                {localDriver.firstName} {localDriver.lastName}
              </h2>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{localDriver.nationality}</p>
          </div>
          {(() => {
            const team = getTeamByConstructorId(localDriver.team)
            return team ? (
              <span
                className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0"
                style={{
                  backgroundColor: `${team.color}20`,
                  color: team.color,
                  border: `1px solid ${team.color}40`,
                }}
              >
                {team.name}
              </span>
            ) : null
          })()}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Grands Prix" value={totalGPs.toString()} color={driverColor} />
        <StatCard
          label="Victories"
          value={wins.toString()}
          subtitle={totalGPs > 0 ? `${((wins / totalGPs) * 100).toFixed(1)}% win rate` : undefined}
          color={driverColor}
        />
        <StatCard
          label="Podiums"
          value={podiums.toString()}
          subtitle={totalGPs > 0 ? `${((podiums / totalGPs) * 100).toFixed(1)}% podium rate` : undefined}
          color={driverColor}
        />
        <StatCard
          label="Pole Positions"
          value={poles.toString()}
          subtitle={qualResults.length > 0 ? `${((poles / qualResults.length) * 100).toFixed(1)}% pole rate` : undefined}
          color={driverColor}
        />
        <StatCard
          label="Career Points"
          value={careerPoints % 1 === 0 ? careerPoints.toString() : careerPoints.toFixed(1)}
          color={driverColor}
        />
        <StatCard label="Championships" value={champTitles.toString()} color={driverColor} />
        <StatCard label="Fastest Laps" value={fastestLaps.toString()} color={driverColor} />
        <StatCard
          label="DNFs"
          value={dnfs.toString()}
          subtitle={totalGPs > 0 ? `${((dnfs / totalGPs) * 100).toFixed(1)}% DNF rate` : undefined}
          color={driverColor}
        />
        <StatCard
          label="Avg Finish"
          value={avgFinish > 0 ? avgFinish.toFixed(1) : '—'}
          color={driverColor}
        />
        <StatCard label="Front Row Starts" value={frontRowStarts.toString()} color={driverColor} />
      </div>

      {/* Charts */}
      {seasonPoints.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Points per season */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Points per Season</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seasonPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="season" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="points" fill={driverColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wins per season */}
          {winsPerSeason.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Wins per Season</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={winsPerSeason}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="season" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="wins" fill={driverColor} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Championship position per season */}
          {seasonPositions.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <h2 className="text-sm font-semibold text-gray-400 mb-4">Championship Position per Season</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={seasonPositions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="season" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis reversed domain={[1, 'dataMax']} tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke={driverColor}
                    strokeWidth={2}
                    dot={{ fill: driverColor, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Season history table */}
      {seasonStandings && seasonStandings.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-bold text-white text-sm">Season History ({seasonStandings.length} seasons)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Season</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Team</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Pos</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Points</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Wins</th>
                </tr>
              </thead>
              <tbody>
                {[...seasonStandings]
                  .sort((a, b) => parseInt(b.season) - parseInt(a.season))
                  .map(s => {
                    const standing = s.standing
                    if (!standing) return null
                    const pos = parseInt(standing.position)
                    const team = getTeamByConstructorId(standing.Constructors?.[0]?.constructorId ?? '')
                    return (
                      <tr
                        key={s.season}
                        className="transition-colors hover:bg-white/3"
                        style={{ borderBottom: '1px solid #1f1f1f' }}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-white">{s.season}</td>
                        <td className="px-4 py-3">
                          {team ? (
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
                          ) : (
                            <span className="text-gray-500 text-xs">
                              {standing.Constructors?.[0]?.name ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className="font-mono font-bold"
                            style={{
                              color:
                                pos === 1 ? '#ffd700'
                                : pos === 2 ? '#c0c0c0'
                                : pos === 3 ? '#cd7f32'
                                : 'var(--text-secondary)',
                            }}
                          >
                            P{standing.position}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">{standing.points}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-300">{standing.wins}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wins table */}
      {winsList.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-bold text-white text-sm">Victories ({wins})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Season</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Grand Prix</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden sm:table-cell">Circuit</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Team</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-semibold">FL</th>
                </tr>
              </thead>
              <tbody>
                {winsList.map((w, i) => {
                  const team = getTeamByConstructorId(w.constructorId)
                  return (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-white/3"
                      style={{ borderBottom: '1px solid #1f1f1f' }}
                    >
                      <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{w.season}</td>
                      <td className="px-4 py-2.5 text-white font-medium">{w.raceName}</td>
                      <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{w.circuitName}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs hidden md:table-cell">{w.date}</td>
                      <td className="px-4 py-2.5">
                        {team ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{
                              backgroundColor: `${team.color}20`,
                              color: team.color,
                              border: `1px solid ${team.color}40`,
                            }}
                          >
                            {team.shortName}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">{w.constructorName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {w.hasFastestLap ? (
                          <span className="text-purple-400 text-xs font-bold">FL</span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalGPs === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          No race data found for this driver.
        </div>
      )}
    </div>
  )
}
