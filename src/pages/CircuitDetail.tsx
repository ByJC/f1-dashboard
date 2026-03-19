import { useParams, Link } from 'react-router-dom'
import { useCircuitResults, useCircuitQualifying } from '@/hooks/useF1Data'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getDriverByCode, getCountryCode } from '@/utils'

const CIRCUIT_SVG_MAP: Record<string, string> = {
  albert_park: 'australia',
  bahrain: 'bahrain',
  suzuka: 'japan',
  shanghai: 'china',
  monaco: 'monaco',
  catalunya: 'spain',
  red_bull_ring: 'austria',
  silverstone: 'greatbritain',
  hungaroring: 'hungary',
  spa: 'belgium',
  zandvoort: 'netherlands',
  monza: 'italy',
  baku: 'azerbaijan',
  marina_bay: 'singapore',
  rodriguez: 'mexico',
  interlagos: 'brazil',
  yas_marina: 'abudhabi',
}

const POSITION_COLORS: Record<number, string> = {
  1: '#ffd700',
  2: '#c0c0c0',
  3: '#cd7f32',
}

export function CircuitDetail() {
  const { circuitId } = useParams<{ circuitId: string }>()
  const { data: races, isLoading: racesLoading } = useCircuitResults(circuitId ?? '')
  const { data: qualifyingRaces, isLoading: qualLoading } = useCircuitQualifying(circuitId ?? '')

  const isLoading = racesLoading || qualLoading

  if (isLoading) return <LoadingSpinner message="Loading circuit data..." />

  if (!races || races.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Circuit Detail</h1>
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">No data found for circuit: {circuitId}</p>
          <Link to="/map" className="text-red-400 text-sm mt-2 inline-block hover:text-red-300">
            ← Back to Map
          </Link>
        </div>
      </div>
    )
  }

  const circuit = races[0].Circuit
  const countryCode = getCountryCode(circuit.Location.country)
  const svgFile = circuitId ? CIRCUIT_SVG_MAP[circuitId] : null

  // Most recent winners (latest race first)
  const recentRaces = [...races].sort((a, b) => parseInt(b.season) - parseInt(a.season))

  // Record pole position holder
  const poleCounts: Record<string, number> = {}
  qualifyingRaces?.forEach(r => {
    const pole = r.QualifyingResults?.find(q => q.position === '1')
    if (pole) {
      const name = `${pole.Driver.givenName} ${pole.Driver.familyName}`
      poleCounts[name] = (poleCounts[name] ?? 0) + 1
    }
  })
  const recordPole = Object.entries(poleCounts).sort(([, a], [, b]) => b - a)[0]

  // Win counts
  const winCounts: Record<string, number> = {}
  races.forEach(r => {
    const winner = r.Results?.[0]
    if (winner) {
      const name = `${winner.Driver.givenName} ${winner.Driver.familyName}`
      winCounts[name] = (winCounts[name] ?? 0) + 1
    }
  })
  const recordWinner = Object.entries(winCounts).sort(([, a], [, b]) => b - a)[0]

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
            alt={circuit.Location.country}
            className="w-12 h-auto rounded flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white">{circuit.circuitName}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {circuit.Location.locality}, {circuit.Location.country}
            </p>
          </div>
          <Link to="/map" className="text-xs text-gray-500 hover:text-gray-300">
            ← Map
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Track SVG */}
        {svgFile && (
          <div
            className="rounded-xl border p-5 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)', minHeight: 200 }}
          >
            <img
              src={`/tracks/${svgFile}.svg`}
              alt={circuit.circuitName}
              style={{ maxHeight: 200, width: '100%', objectFit: 'contain', filter: 'invert(1) opacity(0.8)' }}
            />
          </div>
        )}

        {/* Records */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <h2 className="text-sm font-semibold text-gray-400">Circuit Records</h2>
          {recordWinner && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Most Wins</p>
              <p className="text-white font-bold">{recordWinner[0]}</p>
              <p className="text-yellow-400 text-xs font-mono">{recordWinner[1]} wins</p>
            </div>
          )}
          {recordPole && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Most Poles</p>
              <p className="text-white font-bold">{recordPole[0]}</p>
              <p className="text-purple-400 text-xs font-mono">{recordPole[1]} poles</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Races Held</p>
            <p className="text-white font-mono font-black text-xl">{races.length}</p>
          </div>
        </div>

        {/* Recent winners */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-bold text-white text-sm">Recent Winners</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {recentRaces.slice(0, 5).map(race => {
              const winner = race.Results?.[0]
              if (!winner) return null
              const driver = getDriverByCode(winner.Driver.code ?? '')
              return (
                <div key={`${race.season}-${race.round}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-gray-500 font-mono text-xs w-10">{race.season}</span>
                  {driver && (
                    <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: driver.color }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {winner.Driver.givenName} {winner.Driver.familyName}
                    </p>
                    <p className="text-gray-500 text-xs">{winner.Constructor.name}</p>
                  </div>
                  <span className="text-yellow-400 text-xs">🏆</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Full winners table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="font-bold text-white text-sm">All Results ({races.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Year</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Race</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">P1</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden sm:table-cell">P2</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold hidden md:table-cell">P3</th>
              </tr>
            </thead>
            <tbody>
              {recentRaces.map(race => {
                const top3 = race.Results?.slice(0, 3) ?? []
                return (
                  <tr
                    key={`${race.season}-${race.round}`}
                    className="hover:bg-white/3"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                  >
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-xs">{race.season}</td>
                    <td className="px-4 py-2.5 text-white text-xs font-medium">{race.raceName}</td>
                    {[0, 1, 2].map(i => {
                      const result = top3[i]
                      const driver = result ? getDriverByCode(result.Driver.code ?? '') : null
                      const pos = i + 1
                      if (i > 0 && i === 1) {
                        return (
                          <td key={i} className="px-4 py-2.5 hidden sm:table-cell">
                            {result ? (
                              <span className="flex items-center gap-1.5">
                                {driver && <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />}
                                <span style={{ color: POSITION_COLORS[pos] ?? '#6b7280' }} className="font-semibold text-xs">
                                  {result.Driver.code ?? result.Driver.familyName}
                                </span>
                              </span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>
                        )
                      }
                      if (i === 2) {
                        return (
                          <td key={i} className="px-4 py-2.5 hidden md:table-cell">
                            {result ? (
                              <span className="flex items-center gap-1.5">
                                {driver && <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />}
                                <span style={{ color: POSITION_COLORS[pos] ?? '#6b7280' }} className="font-semibold text-xs">
                                  {result.Driver.code ?? result.Driver.familyName}
                                </span>
                              </span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>
                        )
                      }
                      return (
                        <td key={i} className="px-4 py-2.5">
                          {result ? (
                            <span className="flex items-center gap-1.5">
                              {driver && <span className="w-1 h-4 rounded-full" style={{ backgroundColor: driver.color }} />}
                              <span style={{ color: POSITION_COLORS[pos] ?? '#6b7280' }} className="font-semibold text-xs">
                                {result.Driver.code ?? result.Driver.familyName}
                              </span>
                            </span>
                          ) : <span className="text-gray-700">—</span>}
                        </td>
                      )
                    })}
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
