import { useSchedule, useDriverStandings, useConstructorStandings } from '@/hooks/useF1Data'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId, formatDate, isSprintWeekend } from '@/utils'
import { Link } from 'react-router-dom'

export function Home() {
  const { data: schedule, isLoading: scheduleLoading } = useSchedule()
  const { data: driverStandings } = useDriverStandings()
  const { data: constructorStandings } = useConstructorStandings()

  const now = new Date()
  const upcoming = schedule?.find(r => new Date(r.date) >= now)
  const lastRace = schedule?.filter(r => new Date(r.date) < now).pop()
  const completedRaces = schedule?.filter(r => new Date(r.date) < now).length ?? 0
  const totalRaces = schedule?.length ?? 0

  const top3Drivers = driverStandings?.slice(0, 3) ?? []
  const top3Constructors = constructorStandings?.slice(0, 3) ?? []

  return (
    <div className="space-y-8">
      {/* Season Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white">
          2026 Formula 1 Season
        </h1>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="font-mono">
            {completedRaces}/{totalRaces} races completed
          </span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <div className="flex-1 max-w-xs h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${totalRaces ? (completedRaces / totalRaces) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {scheduleLoading ? (
        <LoadingSpinner message="Loading season data..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Next Race */}
          {upcoming && (
            <Link
              to="/calendar"
              className="block rounded-xl p-5 border transition-colors hover:border-red-600/50"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">
                    Next Race
                  </p>
                  <h2 className="text-lg font-bold text-white">{upcoming.raceName}</h2>
                  <p className="text-gray-400 text-sm">{upcoming.Circuit.Location.locality}, {upcoming.Circuit.Location.country}</p>
                </div>
                <img
                  src={`https://flagcdn.com/w40/${getCountryFlag(upcoming.Circuit.Location.country)}.png`}
                  alt={upcoming.Circuit.Location.country}
                  className="w-8 h-auto rounded-sm opacity-80"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white font-mono">
                  Round {upcoming.round}
                </span>
                <span className="text-gray-400 text-sm">{formatDate(upcoming.date)}</span>
                {isSprintWeekend(upcoming.raceName) && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-semibold">
                    SPRINT
                  </span>
                )}
              </div>
            </Link>
          )}

          {/* Last Race */}
          {lastRace && (
            <Link
              to="/results/races"
              className="block rounded-xl p-5 border transition-colors hover:border-gray-600"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                    Last Race
                  </p>
                  <h2 className="text-lg font-bold text-white">{lastRace.raceName}</h2>
                  <p className="text-gray-400 text-sm">{lastRace.Circuit.Location.locality}, {lastRace.Circuit.Location.country}</p>
                </div>
                <img
                  src={`https://flagcdn.com/w40/${getCountryFlag(lastRace.Circuit.Location.country)}.png`}
                  alt={lastRace.Circuit.Location.country}
                  className="w-8 h-auto rounded-sm opacity-80"
                />
              </div>
              {lastRace.Results?.[0] && (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold text-sm">Winner:</span>
                  <span className="text-white font-semibold">
                    {lastRace.Results[0].Driver.givenName} {lastRace.Results[0].Driver.familyName}
                  </span>
                </div>
              )}
            </Link>
          )}

          {/* Season progress */}
          <div
            className="rounded-xl p-5 border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
              Season Progress
            </p>
            <div className="flex gap-1 flex-wrap">
              {schedule?.map((race) => {
                const done = new Date(race.date) < now
                const isNext = race === upcoming
                return (
                  <div
                    key={race.round}
                    className="w-4 h-4 rounded-sm transition-all"
                    style={{
                      backgroundColor: done ? '#e10600' : isNext ? '#e1060040' : 'var(--border-default)',
                      border: isNext ? '1px solid #e10600' : '1px solid transparent',
                    }}
                    title={`R${race.round} ${race.raceName}`}
                  />
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {completedRaces} done · {totalRaces - completedRaces} remaining
            </p>
          </div>
        </div>
      )}

      {/* Standings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Driver Standings */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-bold text-white">Driver Championship</h3>
            <Link to="/standings/drivers" className="text-xs text-red-400 hover:text-red-300">
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {top3Drivers.map(s => {
              const driver = getDriverByCode(s.Driver.code ?? s.Driver.driverId)
              return (
                <div key={s.Driver.driverId} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-gray-500 font-mono text-sm w-5">{s.position}</span>
                  {driver && (
                    <span
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: driver.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {s.Driver.givenName} {s.Driver.familyName}
                    </p>
                    <p className="text-gray-500 text-xs">{s.Constructors[0]?.name}</p>
                  </div>
                  <span className="text-white font-mono font-bold">{s.points}</span>
                </div>
              )
            })}
            {top3Drivers.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                No standings yet
              </div>
            )}
          </div>
        </div>

        {/* Constructor Standings */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-bold text-white">Constructor Championship</h3>
            <Link to="/standings/constructors" className="text-xs text-red-400 hover:text-red-300">
              View all →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
            {top3Constructors.map(s => {
              const team = getTeamByConstructorId(s.Constructor.constructorId)
              return (
                <div key={s.Constructor.constructorId} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-gray-500 font-mono text-sm w-5">{s.position}</span>
                  {team && (
                    <span
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{s.Constructor.name}</p>
                  </div>
                  <span className="text-white font-mono font-bold">{s.points}</span>
                </div>
              )
            })}
            {top3Constructors.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-500 text-sm">
                No standings yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getCountryFlag(country: string): string {
  const codes: Record<string, string> = {
    'Australia': 'au', 'China': 'cn', 'Japan': 'jp', 'Bahrain': 'bh',
    'Saudi Arabia': 'sa', 'USA': 'us', 'United States': 'us', 'Italy': 'it',
    'Monaco': 'mc', 'Canada': 'ca', 'Spain': 'es', 'Austria': 'at',
    'United Kingdom': 'gb', 'Hungary': 'hu', 'Belgium': 'be', 'Netherlands': 'nl',
    'Singapore': 'sg', 'Azerbaijan': 'az', 'Mexico': 'mx', 'Brazil': 'br',
    'Qatar': 'qa', 'Abu Dhabi': 'ae', 'Miami': 'us',
  }
  return codes[country] ?? 'un'
}
