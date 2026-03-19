import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSchedule, useRaceResults, useQualifyingResults, useSprintResults, useOpenF1Sessions, useOpenF1Weather } from '@/hooks/useF1Data'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getDriverByCode, getCountryCode, formatDate, isSprintWeekend } from '@/utils'

const DOTD_STORAGE_KEY = 'f1-dotd-2026'

const POSITION_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
}

export function WeekendSummary() {
  const { round } = useParams<{ round: string }>()
  const { data: schedule, isLoading: scheduleLoading } = useSchedule()
  const { data: races } = useRaceResults()
  const { data: qualifyingRaces } = useQualifyingResults()
  const { data: sprintRaces } = useSprintResults()
  const { data: sessions } = useOpenF1Sessions(2026)

  const race = useMemo(
    () => schedule?.find(r => r.round === round),
    [schedule, round]
  )
  const raceWithResults = useMemo(
    () => races?.find(r => r.round === round),
    [races, round]
  )
  const qualifying = useMemo(
    () => qualifyingRaces?.find(r => r.round === round),
    [qualifyingRaces, round]
  )
  const sprint = useMemo(
    () => sprintRaces?.find(r => r.round === round),
    [sprintRaces, round]
  )

  // Find OpenF1 race session key by matching circuit + year
  const raceSessionKey = useMemo(() => {
    if (!sessions || !race) return null
    const found = sessions.find(
      s => s.session_type === 'Race' && s.year === 2026 &&
        s.circuit_short_name?.toLowerCase().includes(
          race.Circuit.Location.locality.toLowerCase().split(' ')[0]
        )
    )
    return found?.session_key ?? null
  }, [sessions, race])

  const { data: weatherData } = useOpenF1Weather(raceSessionKey)

  const avgWeather = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return null
    const avg = weatherData.reduce((sum, w) => sum + (w.air_temperature ?? 0), 0) / weatherData.length
    const rainfall = weatherData.some(w => w.rainfall)
    return { temp: Math.round(avg), rainfall }
  }, [weatherData])

  const dotdVotes = useMemo(() => {
    try {
      const raw = localStorage.getItem(DOTD_STORAGE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Record<string, string>
      const key = `r${round}`
      return data[key] ?? null
    } catch {
      return null
    }
  }, [round])

  if (scheduleLoading) return <LoadingSpinner message="Loading weekend..." />

  if (!race) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Weekend Summary</h1>
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">Race round {round} not found</p>
          <Link to="/calendar" className="text-red-400 text-sm mt-2 inline-block hover:text-red-300">
            ← Back to Calendar
          </Link>
        </div>
      </div>
    )
  }

  const countryCode = getCountryCode(race.Circuit.Location.country)
  const isPast = new Date(race.date) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-start gap-4">
          <img
            src={`https://flagcdn.com/w80/${countryCode}.png`}
            alt={race.Circuit.Location.country}
            className="w-12 h-auto rounded flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
              Round {race.round} · {formatDate(race.date)}
            </p>
            <h1 className="text-2xl font-black text-white">{race.raceName}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {race.Circuit.circuitName} · {race.Circuit.Location.locality}, {race.Circuit.Location.country}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {isSprintWeekend(race.raceName) && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-semibold">
                SPRINT
              </span>
            )}
            {avgWeather && (
              <span className="text-xs px-2 py-0.5 rounded font-semibold"
                style={{
                  backgroundColor: avgWeather.rainfall ? '#3b82f620' : '#10b98120',
                  color: avgWeather.rainfall ? '#60a5fa' : '#34d399',
                  border: `1px solid ${avgWeather.rainfall ? '#3b82f640' : '#10b98140'}`,
                }}
              >
                {avgWeather.rainfall ? '🌧' : '☀️'} {avgWeather.temp}°C
              </span>
            )}
            {dotdVotes && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-semibold">
                ⭐ DOTD: {dotdVotes}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Link
            to={`/circuits/${race.Circuit.circuitId}`}
            className="text-xs text-red-400 hover:text-red-300"
          >
            View Circuit →
          </Link>
        </div>
      </div>

      {!isPast && (
        <div
          className="rounded-xl border p-5 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">Race not yet completed</p>
        </div>
      )}

      {isPast && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Race Results */}
          {raceWithResults?.Results && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <h2 className="font-bold text-white text-sm">Race Results</h2>
              </div>
              {/* Podium */}
              <div className="flex items-end justify-center gap-2 p-4">
                {[1, 0, 2].map(i => {
                  const result = raceWithResults.Results![i]
                  if (!result) return null
                  const pos = parseInt(result.position)
                  const heights = { 1: 'h-16', 2: 'h-12', 3: 'h-10' }
                  const height = heights[pos as keyof typeof heights] ?? 'h-8'
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-white font-semibold">{result.Driver.code}</span>
                      <div
                        className={`w-16 ${height} rounded-t flex items-end justify-center pb-1`}
                        style={{ backgroundColor: POSITION_COLORS[pos] ?? '#6b7280', opacity: 0.8 }}
                      >
                        <span className="text-black text-xs font-black">P{pos}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {raceWithResults.Results.slice(0, 10).map(result => {
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
                        <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />
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
          )}

          {/* Qualifying */}
          {qualifying?.QualifyingResults && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <h2 className="font-bold text-white text-sm">Qualifying</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th className="text-left px-3 py-2 text-gray-500">P</th>
                      <th className="text-left px-3 py-2 text-gray-500">Driver</th>
                      <th className="text-right px-3 py-2 text-gray-500">Q1</th>
                      <th className="text-right px-3 py-2 text-gray-500">Q2</th>
                      <th className="text-right px-3 py-2 text-gray-500">Q3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualifying.QualifyingResults.slice(0, 10).map(result => {
                      const driver = getDriverByCode(result.Driver.code ?? '')
                      return (
                        <tr key={result.Driver.driverId} style={{ borderBottom: '1px solid #1f1f1f' }}>
                          <td className="px-3 py-2 font-mono font-bold"
                            style={{ color: POSITION_COLORS[parseInt(result.position)] ?? '#6b7280' }}>
                            {result.position}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {driver && <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />}
                              <span className="text-white font-semibold">{result.Driver.code}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-400">{result.Q1 ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-400">{result.Q2 ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-300">{result.Q3 ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sprint */}
          {sprint?.SprintResults && sprint.SprintResults.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <h2 className="font-bold text-white text-sm">
                  Sprint <span className="text-yellow-400 text-xs font-medium ml-1">⚡</span>
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {sprint.SprintResults.slice(0, 8).map(result => {
                  const driver = getDriverByCode(result.Driver.code ?? '')
                  return (
                    <div key={result.Driver.driverId} className="flex items-center gap-2 px-4 py-2">
                      <span className="text-xs font-mono font-bold w-6 text-right"
                        style={{ color: POSITION_COLORS[parseInt(result.position)] ?? '#6b7280' }}>
                        {result.position}
                      </span>
                      {driver && <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />}
                      <span className="text-white text-xs font-semibold flex-1">
                        {result.Driver.givenName} {result.Driver.familyName}
                      </span>
                      <span className="text-gray-500 text-xs font-mono">{result.points}pts</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
