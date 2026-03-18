import { useRaceResults, useDriverStandings, useQualifyingResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, getTeamByConstructorId } from '@/utils'
import type { DriverInfo, TeamInfo } from '@/types/f1'

interface StatCardProps {
  label: string
  value: string
  subtitle: string
  color: string
  wide?: boolean
}

function StatCard({ label, value, subtitle, color, wide = false }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-2 ${wide ? 'col-span-2' : ''}`}
      style={{
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-gray-400 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function FunCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-2"
      style={{
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a',
        borderTop: `3px solid ${color}`,
      }}
    >
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-gray-400 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function driverLabel(driver: DriverInfo | undefined, fallback: string): string {
  return driver ? `${driver.firstName} ${driver.lastName}` : fallback
}

function driverColor(driver: DriverInfo | undefined): string {
  return driver?.color ?? '#e10600'
}

function teamColor(team: TeamInfo | undefined): string {
  return team?.color ?? '#e10600'
}

export function Records() {
  const { data: races, isLoading: racesLoading, error: racesError } = useRaceResults()
  const { data: standings, isLoading: standingsLoading, error: standingsError } = useDriverStandings()
  const { data: qualRaces, isLoading: qualLoading, error: qualError } = useQualifyingResults()

  const isLoading = racesLoading || standingsLoading || qualLoading
  const error = racesError ?? standingsError ?? qualError

  if (isLoading) return <LoadingSpinner message="Crunching the numbers..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  const noRaces = !races || races.length === 0

  if (noRaces) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Season Records</h1>
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <p className="text-gray-500">No race data yet. Records will appear after the first race.</p>
        </div>
      </div>
    )
  }

  // ── Aggregate ───────────────────────────────────────────────────────────────
  // Per-driver accumulation
  const winsMap: Record<string, number> = {}
  const poduimsMap: Record<string, number> = {}
  const ptsMap: Record<string, number> = {}
  const dnfMap: Record<string, number> = {}
  const fastestLapMap: Record<string, number> = {}
  const racesLedMap: Record<string, number> = {}

  // Best single-race points
  let bestSingleRacePts = 0
  let bestSingleRaceDriver = ''
  let bestSingleRaceCode = ''
  let bestSingleRaceName = ''

  // Biggest win margin (in seconds)
  let biggestMargin = 0
  let biggestMarginWinner = ''
  let biggestMarginWinnerCode = ''
  let biggestMarginRace = ''

  // 1-2 finishes per constructor
  const oneTwoMap: Record<string, number> = {}

  // Longest streak tracking (per driver)
  const streakMap: Record<string, { current: number; best: number }> = {}

  for (const race of races) {
    if (!race.Results) continue

    // Track who led each race (P1)
    const p1 = race.Results.find(r => r.position === '1')
    if (p1) {
      const id = p1.Driver.driverId
      racesLedMap[id] = (racesLedMap[id] ?? 0) + 1
    }

    for (const result of race.Results) {
      const id = result.Driver.driverId
      const pos = parseInt(result.position)
      const pts = parseFloat(result.points)
      const status = result.status

      ptsMap[id] = (ptsMap[id] ?? 0) + pts

      if (pos === 1) winsMap[id] = (winsMap[id] ?? 0) + 1
      if (pos <= 3) poduimsMap[id] = (poduimsMap[id] ?? 0) + 1

      const dnf =
        status !== 'Finished' && !status.startsWith('+') && status !== 'Disqualified'
      if (dnf) dnfMap[id] = (dnfMap[id] ?? 0) + 1

      if (result.FastestLap?.rank === '1') {
        fastestLapMap[id] = (fastestLapMap[id] ?? 0) + 1
      }

      // Best single race pts
      if (pts > bestSingleRacePts) {
        bestSingleRacePts = pts
        bestSingleRaceDriver = id
        bestSingleRaceCode = result.Driver.code ?? id
        bestSingleRaceName = race.raceName
      }

      // Winning streak
      if (!streakMap[id]) streakMap[id] = { current: 0, best: 0 }
      if (pos === 1) {
        streakMap[id].current++
        if (streakMap[id].current > streakMap[id].best)
          streakMap[id].best = streakMap[id].current
      } else {
        streakMap[id].current = 0
      }
    }

    // Win margin
    const sorted = [...(race.Results ?? [])].sort(
      (a, b) => parseInt(a.position) - parseInt(b.position)
    )
    const winner = sorted[0]
    const second = sorted[1]
    if (winner?.Time?.millis && second?.Time?.millis) {
      const margin =
        (parseInt(second.Time.millis) - parseInt(winner.Time.millis)) / 1000
      if (margin > biggestMargin) {
        biggestMargin = margin
        biggestMarginWinner = winner.Driver.driverId
        biggestMarginWinnerCode = winner.Driver.code ?? winner.Driver.driverId
        biggestMarginRace = race.raceName
      }
    }

    // 1-2 finishes per constructor
    if (sorted.length >= 2) {
      const c1 = sorted[0]?.Constructor.constructorId
      const c2 = sorted[1]?.Constructor.constructorId
      if (c1 && c1 === c2) {
        oneTwoMap[c1] = (oneTwoMap[c1] ?? 0) + 1
      }
    }
  }

  // Poles from qualifying
  const poleMap: Record<string, number> = {}
  if (qualRaces) {
    for (const race of qualRaces) {
      const pole = race.QualifyingResults?.find(r => r.position === '1')
      if (pole) {
        const id = pole.Driver.driverId
        poleMap[id] = (poleMap[id] ?? 0) + 1
      }
    }
  }

  // Most wins
  const [topWinId, topWins] = Object.entries(winsMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topWinDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topWinId)?.Driver.code ?? topWinId
  )

  // Most poles
  const [topPoleId, topPoles] = Object.entries(poleMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topPoleDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topPoleId)?.Driver.code ?? topPoleId
  )

  // Most podiums
  const [topPodId, topPodiums] = Object.entries(poduimsMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topPodDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topPodId)?.Driver.code ?? topPodId
  )

  // Best single race pts
  const bestRaceDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === bestSingleRaceDriver)?.Driver.code ??
      bestSingleRaceCode
  )

  // Win margin
  const marginWinnerDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === biggestMarginWinner)?.Driver.code ??
      biggestMarginWinnerCode
  )

  // Most fastest laps
  const [topFLId, topFL] = Object.entries(fastestLapMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topFLDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topFLId)?.Driver.code ?? topFLId
  )

  // Constructor most wins (from race results)
  const constrWinsMap: Record<string, number> = {}
  for (const race of races) {
    const p1 = race.Results?.find(r => r.position === '1')
    if (p1) {
      const cid = p1.Constructor.constructorId
      constrWinsMap[cid] = (constrWinsMap[cid] ?? 0) + 1
    }
  }
  const [topConstrId, topConstrWins] = Object.entries(constrWinsMap).sort(
    (a, b) => b[1] - a[1]
  )[0] ?? ['—', 0]
  const topConstrTeam = getTeamByConstructorId(topConstrId)

  // Constructor most 1-2s
  const [topOneTwoId, topOneTwo] = Object.entries(oneTwoMap).sort(
    (a, b) => b[1] - a[1]
  )[0] ?? ['—', 0]
  const topOneTwoTeam = getTeamByConstructorId(topOneTwoId)

  // Winning streak
  const [topStreakId, topStreakData] = Object.entries(streakMap).sort(
    (a, b) => b[1].best - a[1].best
  )[0] ?? ['—', { best: 0 }]
  const topStreakDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topStreakId)?.Driver.code ?? topStreakId
  )

  // Most races led (P1 finishes)
  const [topLedId, topLed] = Object.entries(racesLedMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topLedDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topLedId)?.Driver.code ?? topLedId
  )

  // ── Fun Records ─────────────────────────────────────────────────────────────
  // Most DNFs
  const [topDnfId, topDnfs] = Object.entries(dnfMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0]
  const topDnfDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topDnfId)?.Driver.code ?? topDnfId
  )

  // Best comeback: worst grid → best finish in one race (by difference)
  let bestComebackGain = 0
  let bestComebackDriver = ''
  let bestComebackCode = ''
  let bestComebackRace = ''
  let bestComebackGrid = 0
  let bestComebackFinish = 0

  // Most positions gained single race
  let mostGainedPositions = 0
  let mostGainedDriver = ''
  let mostGainedCode = ''
  let mostGainedRace = ''

  for (const race of races) {
    if (!race.Results) continue
    for (const result of race.Results) {
      const grid = parseInt(result.grid)
      const finish = parseInt(result.position)
      if (isNaN(grid) || isNaN(finish) || grid === 0) continue

      const gained = grid - finish
      if (gained > mostGainedPositions) {
        mostGainedPositions = gained
        mostGainedDriver = result.Driver.driverId
        mostGainedCode = result.Driver.code ?? result.Driver.driverId
        mostGainedRace = race.raceName
      }

      // Best comeback: started poorly, finished well
      if (grid >= 10 && finish <= 5) {
        const comebackScore = grid - finish
        if (comebackScore > bestComebackGain) {
          bestComebackGain = comebackScore
          bestComebackDriver = result.Driver.driverId
          bestComebackCode = result.Driver.code ?? result.Driver.driverId
          bestComebackRace = race.raceName
          bestComebackGrid = grid
          bestComebackFinish = finish
        }
      }
    }
  }

  const comebackDriverInfo = getDriverByCode(
    standings?.find(s => s.Driver.driverId === bestComebackDriver)?.Driver.code ??
      bestComebackCode
  )
  const mostGainedDriverInfo = getDriverByCode(
    standings?.find(s => s.Driver.driverId === mostGainedDriver)?.Driver.code ?? mostGainedCode
  )

  // Most diverse wins: driver who has beaten the most unique other winners
  const raceWinners = new Set<string>()
  const winnersList: string[] = []
  for (const race of races) {
    const p1 = race.Results?.find(r => r.position === '1')
    if (p1) {
      raceWinners.add(p1.Driver.driverId)
      winnersList.push(p1.Driver.driverId)
    }
  }

  // "Most diverse wins" — driver who appears in most races where different drivers won
  // Simplified: driver with most wins where other winners also won (i.e., most wins in multi-winner seasons)
  const diverseWinnersMap: Record<string, Set<string>> = {}
  for (const race of races) {
    const p1 = race.Results?.find(r => r.position === '1')
    if (!p1) continue
    const winnerId = p1.Driver.driverId
    if (!diverseWinnersMap[winnerId]) diverseWinnersMap[winnerId] = new Set()
    // Count other unique winners they "beat" (i.e., those other winners were in races this driver also competed in)
    for (const other of raceWinners) {
      if (other !== winnerId) diverseWinnersMap[winnerId].add(other)
    }
  }

  const [topDiverseId, topDiverseSet] = Object.entries(diverseWinnersMap).sort(
    (a, b) => b[1].size - a[1].size
  )[0] ?? ['—', new Set()]
  const topDiverseDriver = getDriverByCode(
    standings?.find(s => s.Driver.driverId === topDiverseId)?.Driver.code ?? topDiverseId
  )

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-white">Season Records</h1>

      {/* Main stats grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Season Highlights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Most Wins"
            value={String(topWins)}
            subtitle={driverLabel(topWinDriver, topWinId)}
            color={driverColor(topWinDriver)}
          />
          <StatCard
            label="Most Poles"
            value={String(topPoles)}
            subtitle={driverLabel(topPoleDriver, topPoleId)}
            color={driverColor(topPoleDriver)}
          />
          <StatCard
            label="Most Podiums"
            value={String(topPodiums)}
            subtitle={driverLabel(topPodDriver, topPodId)}
            color={driverColor(topPodDriver)}
          />
          <StatCard
            label="Most Fastest Laps"
            value={String(topFL)}
            subtitle={driverLabel(topFLDriver, topFLId)}
            color={driverColor(topFLDriver)}
          />
          <StatCard
            label="Best Single Race"
            value={`${bestSingleRacePts} pts`}
            subtitle={`${driverLabel(bestRaceDriver, bestSingleRaceCode)} · ${bestSingleRaceName}`}
            color={driverColor(bestRaceDriver)}
          />
          <StatCard
            label="Biggest Win Margin"
            value={biggestMargin > 0 ? `+${biggestMargin.toFixed(1)}s` : '—'}
            subtitle={
              biggestMargin > 0
                ? `${driverLabel(marginWinnerDriver, biggestMarginWinnerCode)} · ${biggestMarginRace}`
                : 'No gap data yet'
            }
            color={driverColor(marginWinnerDriver)}
          />
          <StatCard
            label="Constructor Wins"
            value={String(topConstrWins)}
            subtitle={topConstrTeam?.name ?? topConstrId}
            color={teamColor(topConstrTeam)}
          />
          <StatCard
            label="Most 1-2 Finishes"
            value={String(topOneTwo)}
            subtitle={topOneTwoTeam?.name ?? topOneTwoId}
            color={teamColor(topOneTwoTeam)}
          />
          <StatCard
            label="Winning Streak"
            value={`${topStreakData.best} races`}
            subtitle={driverLabel(topStreakDriver, topStreakId)}
            color={driverColor(topStreakDriver)}
          />
          <StatCard
            label="Most Races Led"
            value={String(topLed)}
            subtitle={driverLabel(topLedDriver, topLedId)}
            color={driverColor(topLedDriver)}
          />
        </div>
      </div>

      {/* Fun records */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Fun Records
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FunCard
            label="Most DNFs"
            value={`${topDnfs} retirements`}
            subtitle={driverLabel(topDnfDriver, topDnfId)}
            color={topDnfDriver?.color ?? '#ef4444'}
          />
          <FunCard
            label="Best Comeback"
            value={
              bestComebackGain > 0
                ? `P${bestComebackGrid} → P${bestComebackFinish}`
                : '—'
            }
            subtitle={
              bestComebackGain > 0
                ? `${driverLabel(comebackDriverInfo, bestComebackCode)} · ${bestComebackRace}`
                : 'None yet'
            }
            color={comebackDriverInfo?.color ?? '#6b7280'}
          />
          <FunCard
            label="Most Positions Gained"
            value={mostGainedPositions > 0 ? `+${mostGainedPositions}` : '—'}
            subtitle={
              mostGainedPositions > 0
                ? `${driverLabel(mostGainedDriverInfo, mostGainedCode)} · ${mostGainedRace}`
                : 'None yet'
            }
            color={mostGainedDriverInfo?.color ?? '#6b7280'}
          />
          <FunCard
            label="Diverse Winner"
            value={topDiverseSet.size > 0 ? `${topDiverseSet.size} rivals` : '—'}
            subtitle={
              topDiverseSet.size > 0
                ? `${driverLabel(topDiverseDriver, topDiverseId)} beat most unique winners`
                : 'None yet'
            }
            color={topDiverseDriver?.color ?? '#6b7280'}
          />
        </div>
      </div>

      {/* Win distribution table */}
      {Object.keys(winsMap).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Win Distribution
          </h2>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
          >
            {Object.entries(winsMap)
              .sort((a, b) => b[1] - a[1])
              .map(([driverId, wins]) => {
                const code =
                  standings?.find(s => s.Driver.driverId === driverId)?.Driver.code ?? driverId
                const driver = getDriverByCode(code)
                const pct = (wins / races.length) * 100
                return (
                  <div
                    key={driverId}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                  >
                    <div className="w-8 text-right font-mono font-bold text-white">{wins}</div>
                    <div className="w-24 font-semibold text-sm" style={{ color: driver?.color ?? '#9ca3af' }}>
                      {code}
                    </div>
                    <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: driver?.color ?? '#e10600' }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-gray-500 font-mono">
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
