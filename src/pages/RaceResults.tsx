import { useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode } from '@/utils'
import type { DriverInfo } from '@/types/f1'

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
