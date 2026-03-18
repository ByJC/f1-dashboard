import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSchedule, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId } from '@/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JolpicaPitStop {
  driverId: string
  lap: string
  stop: string
  time: string
  duration: string
}

interface JolpicaPitStopResponse {
  MRData: {
    RaceTable: {
      Races: Array<{
        PitStops?: JolpicaPitStop[]
        laps?: string
      }>
    }
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPOUND_COLORS: Record<string, { bg: string; label: string }> = {
  SOFT:         { bg: '#e10600', label: 'Soft' },
  MEDIUM:       { bg: '#fbbf24', label: 'Medium' },
  HARD:         { bg: '#d1d5db', label: 'Hard' },
  INTERMEDIATE: { bg: '#22c55e', label: 'Inter' },
  WET:          { bg: '#3b82f6', label: 'Wet' },
}

const STALE_TIME = 1000 * 60 * 30

// ─── Hook ─────────────────────────────────────────────────────────────────────

function usePitStops(round: string | null) {
  return useQuery<JolpicaPitStop[]>({
    queryKey: ['pitStops', round],
    queryFn: async () => {
      if (!round) return []
      const res = await fetch(
        `https://api.jolpi.ca/ergast/f1/current/${round}/pitstops.json?limit=100`,
      )
      if (!res.ok) throw new Error(`Pit stop API error: ${res.status}`)
      const data: JolpicaPitStopResponse = await res.json()
      return data.MRData.RaceTable.Races[0]?.PitStops ?? []
    },
    enabled: !!round,
    staleTime: STALE_TIME,
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TireStrategy() {
  const { data: schedule, isLoading: schedLoading, error: schedError } = useSchedule()
  const { data: raceResults, isLoading: resultsLoading, error: resultsError } = useRaceResults()

  const now = new Date()
  const completedRaces = useMemo(
    () => (schedule ?? []).filter(r => new Date(r.date) < now),
    [schedule, now],
  )

  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  // Auto-select the latest completed race
  const activeRound = selectedRound ?? completedRaces[completedRaces.length - 1]?.round ?? null

  const { data: pitStops, isLoading: pitLoading, error: pitError } = usePitStops(activeRound)

  const isLoading = schedLoading || resultsLoading
  const error = schedError || resultsError

  if (isLoading) return <LoadingSpinner message="Loading tire strategy..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  if (completedRaces.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div
          className="rounded-xl border p-12 text-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <div className="text-4xl mb-3">🏎️</div>
          <p className="text-gray-400 font-semibold">No completed races yet</p>
          <p className="text-gray-600 text-sm mt-1">Tire data will appear after races are completed.</p>
        </div>
      </div>
    )
  }

  // Find race result for selected round to get driver order and lap count
  const selectedRaceResult = (raceResults ?? []).find(r => r.round === activeRound)
  const totalLaps = selectedRaceResult?.Results
    ? Math.max(...selectedRaceResult.Results.map(r => parseInt(r.laps) || 0))
    : 70

  // Group pit stops by driver
  const pitsByDriver = useMemo<Record<string, JolpicaPitStop[]>>(() => {
    if (!pitStops) return {}
    const acc: Record<string, JolpicaPitStop[]> = {}
    pitStops.forEach(p => {
      if (!acc[p.driverId]) acc[p.driverId] = []
      acc[p.driverId].push(p)
    })
    return acc
  }, [pitStops])

  // Build synthetic stints from pit stop data
  const driverOrder = selectedRaceResult?.Results?.map(r => r.Driver.driverId) ?? Object.keys(pitsByDriver)

  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Round selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-400 text-sm font-semibold">Round:</span>
        <div className="flex flex-wrap gap-2">
          {completedRaces.map(race => (
            <button
              key={race.round}
              onClick={() => setSelectedRound(race.round)}
              className="text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors"
              style={{
                backgroundColor: activeRound === race.round ? '#e1060020' : 'transparent',
                borderColor: activeRound === race.round ? '#e10600' : '#3a3a3a',
                color: activeRound === race.round ? '#ef4444' : '#6b7280',
              }}
            >
              R{race.round}
            </button>
          ))}
        </div>
      </div>

      {activeRound && (
        <div className="text-sm text-gray-400">
          {completedRaces.find(r => r.round === activeRound)?.raceName}
        </div>
      )}

      {/* Compound legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(COMPOUND_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: val.bg }}
            />
            {val.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="text-gray-500 text-base leading-none">|</span>
          Pit stop
        </div>
      </div>

      {/* Strategy chart */}
      {pitLoading ? (
        <LoadingSpinner message="Loading pit stop data..." />
      ) : pitError ? (
        <ErrorMessage message={(pitError as Error).message} />
      ) : !pitStops || pitStops.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <p className="text-gray-500">No pit stop data available for this race.</p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <div className="p-4 space-y-1 overflow-x-auto">
            {driverOrder.map(driverId => {
              const stops = pitsByDriver[driverId]
              if (!stops && driverOrder === Object.keys(pitsByDriver)) return null

              const result = selectedRaceResult?.Results?.find(r => r.Driver.driverId === driverId)
              const driver = getDriverByCode(result?.Driver.code ?? driverId) ?? getDriverByCode(driverId)
              const team = result ? getTeamByConstructorId(result.Constructor.constructorId) : undefined

              // Build stints from pit stops
              const driverStops = (pitsByDriver[driverId] ?? []).sort(
                (a, b) => parseInt(a.lap) - parseInt(b.lap),
              )

              // Synthesize stints: assume compound is unknown (no compound data from Jolpica)
              const stintBoundaries = [1, ...driverStops.map(p => parseInt(p.lap)), totalLaps + 1]
              const stints = stintBoundaries
                .slice(0, -1)
                .map((start, i) => ({
                  start,
                  end: stintBoundaries[i + 1] - 1,
                  laps: stintBoundaries[i + 1] - start,
                  stopAfter: i < driverStops.length ? driverStops[i] : null,
                }))

              const driverColor = driver?.color ?? team?.color ?? '#6b7280'
              const driverName = driver
                ? `${driver.firstName[0]}. ${driver.lastName}`
                : result
                ? `${result.Driver.givenName[0]}. ${result.Driver.familyName}`
                : driverId

              return (
                <div key={driverId} className="flex items-center gap-2 min-w-[600px]">
                  {/* Driver name */}
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                    <span
                      className="w-1 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: driverColor }}
                    />
                    <span className="text-xs text-gray-300 truncate">{driverName}</span>
                  </div>

                  {/* Stint bars */}
                  <div className="flex items-center gap-0 flex-1 h-6 relative">
                    {stints.map((stint, idx) => {
                      // Assign alternating compound colors since Jolpica doesn't provide compound
                      const compoundKeys = ['SOFT', 'MEDIUM', 'HARD', 'MEDIUM', 'SOFT']
                      const compound = compoundKeys[idx % compoundKeys.length]
                      const color = COMPOUND_COLORS[compound]?.bg ?? '#6b7280'
                      const widthPct = (stint.laps / totalLaps) * 100

                      return (
                        <div key={idx} className="flex items-center h-full" style={{ width: `${widthPct}%` }}>
                          <div
                            className="h-5 rounded-sm flex-1"
                            style={{
                              backgroundColor: color,
                              opacity: 0.8,
                              marginRight: stint.stopAfter ? '0' : '0',
                            }}
                            title={`Stint ${idx + 1}: laps ${stint.start}–${stint.end}`}
                          />
                          {stint.stopAfter && (
                            <div
                              className="w-0.5 h-full flex-shrink-0"
                              style={{ backgroundColor: '#0f0f0f' }}
                              title={`Pit stop: ${stint.stopAfter.duration}s`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Pit stop count */}
                  <span className="text-xs text-gray-600 w-6 text-right flex-shrink-0">
                    {driverStops.length}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Lap axis */}
          <div className="px-4 pb-3 pl-[8.5rem]">
            <div className="flex justify-between text-xs text-gray-700 font-mono">
              <span>L1</span>
              <span>L{Math.round(totalLaps / 2)}</span>
              <span>L{totalLaps}</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Note: Compound data is not available from Jolpica. Stints are shown with alternating placeholder colors based on stop count. For real compound data, integrate OpenF1 API.
      </p>
    </div>
  )
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-black text-white">Tire Strategy</h1>
      <p className="text-gray-500 text-sm mt-1">Pit stops and stint visualization per race</p>
    </div>
  )
}
