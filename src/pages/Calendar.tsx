import { useSchedule } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { formatDate, isSprintWeekend, getCountryCode } from '@/utils'

export function Calendar() {
  const { data: schedule, isLoading, error } = useSchedule()

  if (isLoading) return <LoadingSpinner message="Loading calendar..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  const now = new Date()

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

          return (
            <div
              key={race.round}
              className="rounded-xl border overflow-hidden transition-all"
              style={{
                backgroundColor: '#1a1a1a',
                borderColor: isNext ? '#e10600' : isPast ? '#2a2a2a' : '#3a3a3a',
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
