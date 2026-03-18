import { useSprintResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode } from '@/utils'

export function SprintResults() {
  const { data: sprints, isLoading, error } = useSprintResults()

  if (isLoading) return <LoadingSpinner message="Loading sprint results..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Sprint Results</h1>
        <p className="text-gray-500 text-sm mt-1">
          Sprint weekends: China · Miami · Canada · Britain · Netherlands · Singapore
        </p>
      </div>

      {(!sprints || sprints.length === 0) ? (
        <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-gray-500">No sprint results available yet for 2026</p>
        </div>
      ) : (
        <>
          {/* Sprint grid */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
            <div className="overflow-x-auto">
              <table className="text-xs whitespace-nowrap">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th className="sticky left-0 px-3 py-2 text-left text-gray-500 font-semibold" style={{ backgroundColor: 'var(--bg-card)', minWidth: 40 }}>
                      P
                    </th>
                    {sprints.map(s => (
                      <th key={s.round} className="px-2 py-2 text-center min-w-[60px]">
                        <div className="text-yellow-400 font-semibold">{s.Circuit.Location.country.slice(0, 3).toUpperCase()}</div>
                        <div className="text-gray-600 font-normal">R{s.round}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(pos => (
                    <tr key={pos} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td className="sticky left-0 px-3 py-1.5 font-mono font-bold text-gray-500" style={{ backgroundColor: 'var(--bg-card)' }}>
                        {pos}
                      </td>
                      {sprints.map(sprint => {
                        const result = sprint.SprintResults?.find(r => r.position === String(pos))
                        if (!result) return <td key={sprint.round} className="px-2 py-1.5 text-center text-gray-700">—</td>
                        const driver = getDriverByCode(result.Driver.code ?? '')
                        return (
                          <td key={sprint.round} className="px-1.5 py-1">
                            <div
                              className="text-center px-1.5 py-1 rounded font-mono font-bold"
                              style={{
                                backgroundColor: driver ? `${driver.color}25` : 'var(--border-default)',
                                color: driver?.color ?? '#6b7280',
                              }}
                              title={`${result.Driver.givenName} ${result.Driver.familyName}`}
                            >
                              {result.Driver.code}
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

          {/* Individual sprint cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sprints.map(sprint => (
              <div
                key={sprint.round}
                className="rounded-xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
              >
                <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-default)', backgroundColor: '#ffffff08' }}>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded font-bold">
                    SPRINT
                  </span>
                  <span className="text-white font-semibold text-sm">{sprint.raceName}</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {sprint.SprintResults?.slice(0, 8).map(result => {
                    const driver = getDriverByCode(result.Driver.code ?? '')
                    return (
                      <div key={result.Driver.driverId} className="flex items-center gap-2 px-4 py-2">
                        <span
                          className="text-xs font-mono font-bold w-5 text-right"
                          style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][parseInt(result.position) - 1] ?? '#6b7280' }}
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
