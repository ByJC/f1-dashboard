import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useSchedule, useOpenF1Sessions } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { formatDate, isSprintWeekend, getCountryCode } from '@/utils'
import { fetchWeather } from '@/api/openf1'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const STALE_TIME = 1000 * 60 * 30

export function Calendar() {
  const { data: schedule, isLoading, error } = useSchedule()
  const { data: openF1Sessions } = useOpenF1Sessions(2026)

  const now = new Date()

  // Build locality → session_key map from OpenF1 sessions
  const localityToSessionKey = useMemo(() => {
    if (!openF1Sessions) return {} as Record<string, number>
    return Object.fromEntries(
      openF1Sessions.map(s => [s.location.toLowerCase(), s.session_key])
    ) as Record<string, number>
  }, [openF1Sessions])

  // Completed races with their session keys
  const completedWithKeys = useMemo(() => {
    if (!schedule) return []
    return schedule
      .filter(r => new Date(r.date) < now)
      .map(r => ({
        round: r.round,
        sessionKey: localityToSessionKey[r.Circuit.Location.locality.toLowerCase()] ?? null,
      }))
      .filter(r => r.sessionKey !== null) as Array<{ round: string; sessionKey: number }>
  }, [schedule, localityToSessionKey])

  // Fetch weather for all completed races
  const weatherQueries = useQueries({
    queries: completedWithKeys.map(({ sessionKey, round }) => ({
      queryKey: ['openf1Weather', sessionKey],
      queryFn: async () => {
        const data = await fetchWeather(sessionKey)
        return { round, weather: data }
      },
      staleTime: STALE_TIME,
    })),
  })

  // Build round → weather summary
  const weatherByRound = useMemo(() => {
    const map: Record<string, { airTemp: number; trackTemp: number; rainfall: boolean }> = {}
    weatherQueries.forEach(q => {
      if (!q.data || q.data.weather.length === 0) return
      const { round, weather } = q.data
      const avgAir = weather.reduce((s, w) => s + w.air_temperature, 0) / weather.length
      const avgTrack = weather.reduce((s, w) => s + w.track_temperature, 0) / weather.length
      const hasRain = weather.some(w => w.rainfall > 0)
      map[round] = { airTemp: Math.round(avgAir), trackTemp: Math.round(avgTrack), rainfall: hasRain }
    })
    return map
  }, [weatherQueries])

  if (isLoading) return <LoadingSpinner message="Loading calendar..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">2026 Race Calendar</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {schedule?.map(race => {
          const raceDate = new Date(race.date)
          const isPast = raceDate < now
          const isNext = !isPast && schedule.find(r => new Date(r.date) >= now) === race
          const isSprint = race.Sprint !== undefined || isSprintWeekend(race.raceName)
          const countryCode = getCountryCode(race.Circuit.Location.country)
          const weather = weatherByRound[race.round]

          return (
            <motion.div
              key={race.round}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: isNext ? '#e10600' : isPast ? 'var(--border-default)' : 'var(--border-muted)',
                opacity: isPast ? 0.6 : 1,
              }}
            >
              {/* Card header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: isNext ? '#e1060015' : isPast ? 'transparent' : '#ffffff08',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-gray-500">
                    R{race.round}
                  </span>
                  {isSprint && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold">
                      SPRINT
                    </span>
                  )}
                  {isNext && (
                    <span className="text-xs bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded font-bold animate-pulse">
                      NEXT
                    </span>
                  )}
                  {isPast && (
                    <span className="text-xs text-green-500">✓</span>
                  )}
                </div>
                <img
                  src={`https://flagcdn.com/w40/${countryCode}.png`}
                  alt={race.Circuit.Location.country}
                  className="h-4 w-auto rounded-sm"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>

              {/* Race info */}
              <div className="px-4 pb-4">
                <h3 className="font-bold text-white text-sm leading-tight mb-0.5">
                  {race.raceName}
                </h3>
                <p className="text-gray-500 text-xs mb-3">
                  {race.Circuit.Location.locality}, {race.Circuit.Location.country}
                </p>
                <p className="text-xs text-gray-400 font-mono">{race.Circuit.circuitName}</p>

                {/* Weekend schedule */}
                <div className="mt-3 space-y-1">
                  {race.FirstPractice && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">FP1</span>
                      <span className="text-gray-400">{formatDate(race.FirstPractice.date)}</span>
                    </div>
                  )}
                  {race.Sprint && (
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-500">Sprint</span>
                      <span className="text-gray-400">{formatDate(race.Sprint.date)}</span>
                    </div>
                  )}
                  {race.Qualifying && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Qualifying</span>
                      <span className="text-gray-400">{formatDate(race.Qualifying.date)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-red-400">Race</span>
                    <span className="text-white">{formatDate(race.date)}</span>
                  </div>
                </div>

                {/* Weather badge for past races */}
                {isPast && weather && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <span>🌡️ {weather.airTemp}°/{weather.trackTemp}°C</span>
                    {weather.rainfall && <span>💧</span>}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <Link
                    to={`/weekend/${race.round}`}
                    className="text-xs font-semibold transition-colors hover:text-red-300"
                    style={{ color: '#ef4444' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Weekend Summary →
                  </Link>
                  <Link
                    to={`/circuits/${race.Circuit.circuitId}`}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    Circuit
                  </Link>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
