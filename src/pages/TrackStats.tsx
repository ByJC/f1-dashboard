import { useQualifyingResults, useRaceResults, useFastestLaps } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getCountryCode } from '@/utils'

export function TrackStats() {
  const { data: qualifying, isLoading: qLoading } = useQualifyingResults()
  const { data: races, isLoading: rLoading, error } = useRaceResults()
  const { data: fastestLaps } = useFastestLaps()

  if (qLoading || rLoading) return <LoadingSpinner message="Loading track stats..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  if (!races || races.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Track Stats</h1>
        <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-gray-500">No race data available yet for 2026</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Track Stats</h1>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Track</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Pole Sitter</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Pole Time</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Winner</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Fastest Lap</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Fastest Time</th>
              </tr>
            </thead>
            <tbody>
              {races.map(race => {
                const quali = qualifying?.find(q => q.round === race.round)
                const fastest = fastestLaps?.find(f => f.round === race.round)

                const poleSitter = quali?.QualifyingResults?.[0]
                const winner = race.Results?.[0]
                const fastestDriver = fastest?.Results?.[0]
                const fastestInRace = race.Results?.find(r => r.FastestLap?.rank === '1')

                const poleDriver = poleSitter ? getDriverByCode(poleSitter.Driver.code ?? '') : null
                const winnerDriver = winner ? getDriverByCode(winner.Driver.code ?? '') : null
                const fastestLapDriver = fastestInRace ? getDriverByCode(fastestInRace.Driver.code ?? '') : null
                const countryCode = getCountryCode(race.Circuit.Location.country)

                return (
                  <tr
                    key={race.round}
                    className="hover:bg-white/3"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://flagcdn.com/w20/${countryCode}.png`}
                          alt=""
                          className="h-3 w-auto rounded-sm opacity-70"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <div>
                          <p className="text-white font-semibold text-xs">{race.raceName}</p>
                          <p className="text-gray-600 text-xs">{race.Circuit.circuitName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {poleSitter ? (
                        <DriverCell
                          name={`${poleSitter.Driver.givenName} ${poleSitter.Driver.familyName}`}
                          color={poleDriver?.color}
                        />
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">
                      {poleSitter?.Q3 ?? poleSitter?.Q2 ?? poleSitter?.Q1 ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {winner ? (
                        <DriverCell
                          name={`${winner.Driver.givenName} ${winner.Driver.familyName}`}
                          color={winnerDriver?.color}
                        />
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {fastestInRace ? (
                        <DriverCell
                          name={`${fastestInRace.Driver.givenName} ${fastestInRace.Driver.familyName}`}
                          color={fastestLapDriver?.color}
                        />
                      ) : fastestDriver ? (
                        <DriverCell
                          name={`${fastestDriver.Driver.givenName} ${fastestDriver.Driver.familyName}`}
                          color={getDriverByCode(fastestDriver.Driver.code ?? '')?.color}
                        />
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">
                      {fastestInRace?.FastestLap?.Time?.time ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DriverCell({ name, color }: { name: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {color && <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-white text-xs">{name}</span>
    </div>
  )
}
