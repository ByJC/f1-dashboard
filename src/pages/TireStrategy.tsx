import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSchedule, useRaceResults, useOpenF1Sessions, useOpenF1Stints } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId, drivers } from '@/utils'
import type { OpenF1Stint } from '@/api/openf1'

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
  SOFT:         { bg: '#e8002d', label: 'Soft' },
  MEDIUM:       { bg: '#ffd600', label: 'Medium' },
  HARD:         { bg: '#f0f0ec', label: 'Hard' },
  INTERMEDIATE: { bg: '#39b54a', label: 'Inter' },
  WET:          { bg: '#0067ff', label: 'Wet' },
  UNKNOWN:      { bg: '#6b7280', label: 'Unknown' },
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
  const { data: openF1Sessions } = useOpenF1Sessions(2026)

  const now = new Date()
  const completedRaces = useMemo(
    () => (schedule ?? []).filter(r => new Date(r.date) < now),
    [schedule, now],
  )

  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  // Auto-select the latest completed race
  const activeRound = selectedRound ?? completedRaces[completedRaces.length - 1]?.round ?? null

  const { data: pitStops, isLoading: pitLoading, error: pitError } = usePitStops(activeRound)

  // Find the active race info
  const activeRace = completedRaces.find(r => r.round === activeRound)

  // Find matching OpenF1 session key for the active race
  const sessionKey = useMemo(() => {
    if (!openF1Sessions || !activeRace) return null
    const match = openF1Sessions.find(
      s =>
        s.location.toLowerCase() === activeRace.Circuit.Location.locality.toLowerCase() ||
        s.country_name.toLowerCase() === activeRace.Circuit.Location.country.toLowerCase(),
    )
    return match?.session_key ?? null
  }, [openF1Sessions, activeRace])

  const { data: openF1Stints } = useOpenF1Stints(sessionKey)

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
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
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

  // Build driver number → driverId map from local drivers data
  const numberToDriverId = useMemo(() => {
    const map: Record<number, string> = {}
    drivers.forEach(d => {
      if (d.number != null) map[parseInt(d.number)] = d.id
    })
    // Also add from race results permanentNumber for accuracy
    selectedRaceResult?.Results?.forEach(r => {
      if (r.Driver.permanentNumber) {
        map[parseInt(r.Driver.permanentNumber)] = r.Driver.driverId
      }
    })
    return map
  }, [selectedRaceResult])

  // Group OpenF1 stints by driverId
  const openF1StintsByDriver = useMemo<Record<string, OpenF1Stint[]>>(() => {
    if (!openF1Stints) return {}
    const acc: Record<string, OpenF1Stint[]> = {}
    openF1Stints.forEach(stint => {
      const driverId = numberToDriverId[stint.driver_number]
      if (driverId) {
        if (!acc[driverId]) acc[driverId] = []
        acc[driverId].push(stint)
      }
    })
    return acc
  }, [openF1Stints, numberToDriverId])

  const hasOpenF1Data = Object.keys(openF1StintsByDriver).length > 0

  // Group pit stops by driver (fallback)
  const pitsByDriver = useMemo<Record<string, JolpicaPitStop[]>>(() => {
    if (!pitStops) return {}
    const acc: Record<string, JolpicaPitStop[]> = {}
    pitStops.forEach(p => {
      if (!acc[p.driverId]) acc[p.driverId] = []
      acc[p.driverId].push(p)
    })
    return acc
  }, [pitStops])

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
                borderColor: activeRound === race.round ? '#e10600' : 'var(--border-muted)',
                color: activeRound === race.round ? '#ef4444' : '#6b7280',
              }}
            >
              R{race.round}
            </button>
          ))}
        </div>
      </div>

      {activeRound && (
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>{completedRaces.find(r => r.round === activeRound)?.raceName}</span>
          {hasOpenF1Data && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              Live compound data
            </span>
          )}
        </div>
      )}

      {/* Compound legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(COMPOUND_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([key, val]) => (
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
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">No pit stop data available for this race.</p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="p-4 space-y-1 overflow-x-auto">
            {driverOrder.map(driverId => {
              const result = selectedRaceResult?.Results?.find(r => r.Driver.driverId === driverId)
              const driver = getDriverByCode(result?.Driver.code ?? driverId) ?? getDriverByCode(driverId)
              const team = result ? getTeamByConstructorId(result.Constructor.constructorId) : undefined

              const driverColor = driver?.color ?? team?.color ?? '#6b7280'
              const driverName = driver
                ? `${driver.firstName[0]}. ${driver.lastName}`
                : result
                ? `${result.Driver.givenName[0]}. ${result.Driver.familyName}`
                : driverId

              // Use OpenF1 stints if available, otherwise fall back to Jolpica pit stops
              if (hasOpenF1Data) {
                const stints = (openF1StintsByDriver[driverId] ?? []).sort(
                  (a, b) => a.stint_number - b.stint_number,
                )
                if (stints.length === 0) return null

                return (
                  <div key={driverId} className="flex items-center gap-2 min-w-[600px]">
                    <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                      <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: driverColor }} />
                      <span className="text-xs text-gray-300 truncate">{driverName}</span>
                    </div>
                    <div className="flex items-center gap-0 flex-1 h-6 relative">
                      {stints.map((stint, idx) => {
                        const lapCount = (stint.lap_end - stint.lap_start) + 1
                        const widthPct = (lapCount / totalLaps) * 100
                        const compound = stint.compound?.toUpperCase() ?? 'UNKNOWN'
                        const color = COMPOUND_COLORS[compound]?.bg ?? COMPOUND_COLORS.UNKNOWN.bg

                        return (
                          <div key={idx} className="flex items-center h-full" style={{ width: `${widthPct}%` }}>
                            <div
                              className="h-5 rounded-sm flex-1"
                              style={{ backgroundColor: color, opacity: 0.85, marginRight: idx < stints.length - 1 ? '1px' : 0 }}
                              title={`${COMPOUND_COLORS[compound]?.label ?? compound}: L${stint.lap_start}–${stint.lap_end} (${lapCount} laps, age ${stint.tyre_age_at_start})`}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <span className="text-xs text-gray-600 w-6 text-right flex-shrink-0">{stints.length}</span>
                  </div>
                )
              }

              // Fallback: Jolpica pit stop based stints
              const driverStops = (pitsByDriver[driverId] ?? []).sort(
                (a, b) => parseInt(a.lap) - parseInt(b.lap),
              )
              const stintBoundaries = [1, ...driverStops.map(p => parseInt(p.lap)), totalLaps + 1]
              const stints = stintBoundaries
                .slice(0, -1)
                .map((start, i) => ({
                  start,
                  end: stintBoundaries[i + 1] - 1,
                  laps: stintBoundaries[i + 1] - start,
                  stopAfter: i < driverStops.length ? driverStops[i] : null,
                }))

              if (stints.length === 0) return null

              return (
                <div key={driverId} className="flex items-center gap-2 min-w-[600px]">
                  <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                    <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: driverColor }} />
                    <span className="text-xs text-gray-300 truncate">{driverName}</span>
                  </div>
                  <div className="flex items-center gap-0 flex-1 h-6 relative">
                    {stints.map((stint, idx) => {
                      const compoundKeys = ['SOFT', 'MEDIUM', 'HARD', 'MEDIUM', 'SOFT']
                      const compound = compoundKeys[idx % compoundKeys.length]
                      const color = COMPOUND_COLORS[compound]?.bg ?? '#6b7280'
                      const widthPct = (stint.laps / totalLaps) * 100

                      return (
                        <div key={idx} className="flex items-center h-full" style={{ width: `${widthPct}%` }}>
                          <div
                            className="h-5 rounded-sm flex-1"
                            style={{ backgroundColor: color, opacity: 0.8 }}
                            title={`Stint ${idx + 1}: laps ${stint.start}–${stint.end}`}
                          />
                          {stint.stopAfter && (
                            <div
                              className="w-0.5 h-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--bg-base)' }}
                              title={`Pit stop: ${stint.stopAfter.duration}s`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-xs text-gray-600 w-6 text-right flex-shrink-0">{driverStops.length}</span>
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

      {!hasOpenF1Data && (
        <p className="text-xs text-gray-600">
          Note: Compound data not available from OpenF1 for this race. Showing alternating placeholder colors based on pit stop count.
        </p>
      )}
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
