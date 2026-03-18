import { useState, useEffect } from 'react'
import { useRaceResults, useDriverStandings } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { drivers } from '@/utils'
import type { DriverInfo } from '@/types/f1'

const STORAGE_KEY = 'f1-draft-2026'
const TOTAL_BUDGET = 100
const MAX_DRIVERS = 5

// Driver price tiers (in millions)
const TIER_1 = new Set(['max_verstappen', 'norris', 'hamilton', 'leclerc', 'george_russell'])
const TIER_2 = new Set(['piastri', 'sainz', 'alonso', 'gasly', 'tsunoda'])

function getDriverPrice(driverId: string): number {
  if (TIER_1.has(driverId)) return 25
  if (TIER_2.has(driverId)) return 18
  return 12
}

function loadDraft(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function saveDraft(team: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(team))
}

interface DriverPointsMap {
  [driverId: string]: number
}

function buildPointsMap(
  races: import('@/types/f1').Race[] | undefined
): DriverPointsMap {
  const map: DriverPointsMap = {}
  if (!races) return map
  for (const race of races) {
    if (!race.Results) continue
    for (const result of race.Results) {
      const id = result.Driver.driverId
      map[id] = (map[id] ?? 0) + parseFloat(result.points)
    }
  }
  return map
}

function bestTeam(pointsMap: DriverPointsMap): string[] {
  return drivers
    .slice()
    .sort((a, b) => (pointsMap[b.id] ?? 0) - (pointsMap[a.id] ?? 0))
    .slice(0, MAX_DRIVERS)
    .map(d => d.id)
}

function teamCost(driverIds: string[]): number {
  return driverIds.reduce((sum, id) => sum + getDriverPrice(id), 0)
}

function teamPoints(driverIds: string[], pointsMap: DriverPointsMap): number {
  return driverIds.reduce((sum, id) => sum + (pointsMap[id] ?? 0), 0)
}

interface DriverCardProps {
  driver: DriverInfo
  selected: boolean
  canAdd: boolean
  price: number
  points: number
  onToggle: () => void
}

function DriverCard({ driver, selected, canAdd, price, points, onToggle }: DriverCardProps) {
  const disabled = !selected && !canAdd

  return (
    <button
      className="rounded-xl border p-3 text-left transition-all relative overflow-hidden"
      style={{
        backgroundColor: selected ? `${driver.color}15` : '#1a1a1a',
        borderColor: selected ? driver.color : disabled ? '#1f1f1f' : '#2a2a2a',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={onToggle}
      disabled={disabled}
    >
      {selected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: driver.color, color: '#0f0f0f' }}
        >
          ✓
        </div>
      )}
      <div
        className="h-0.5 rounded-full mb-2"
        style={{ backgroundColor: driver.color, opacity: selected ? 1 : 0.3 }}
      />
      <p className="font-black text-sm" style={{ color: driver.color }}>
        {driver.code}
      </p>
      <p className="text-white text-xs font-semibold leading-tight mt-0.5">
        {driver.firstName}
        <br />
        {driver.lastName}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500 font-mono">{price}M</span>
        {points > 0 && (
          <span className="text-xs font-bold font-mono" style={{ color: driver.color }}>
            {points}pts
          </span>
        )}
      </div>
    </button>
  )
}

export function Draft() {
  const { data: races, isLoading: racesLoading, error: racesError } = useRaceResults()
  const { data: standings, isLoading: standingsLoading, error: standingsError } = useDriverStandings()

  const [myTeam, setMyTeam] = useState<string[]>(loadDraft)

  const isLoading = racesLoading || standingsLoading
  const error = racesError ?? standingsError

  useEffect(() => {
    saveDraft(myTeam)
  }, [myTeam])

  if (isLoading) return <LoadingSpinner message="Loading fantasy data..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  const pointsMap = buildPointsMap(races)
  const optimal = bestTeam(pointsMap)
  const myPoints = teamPoints(myTeam, pointsMap)
  const optPoints = teamPoints(optimal, pointsMap)
  const myCost = teamCost(myTeam)
  const budget = TOTAL_BUDGET - myCost
  const canAddMore = myTeam.length < MAX_DRIVERS

  function toggle(driverId: string) {
    if (myTeam.includes(driverId)) {
      setMyTeam(prev => prev.filter(id => id !== driverId))
    } else if (myTeam.length < MAX_DRIVERS) {
      const newTeam = [...myTeam, driverId]
      if (teamCost(newTeam) <= TOTAL_BUDGET) {
        setMyTeam(newTeam)
      }
    }
  }

  function clearTeam() {
    setMyTeam([])
  }

  // Per-race cumulative points for chart data (my team vs optimal)
  const chartRaces = races ?? []

  // Group drivers by team for display
  const driversByTeam: Record<string, DriverInfo[]> = {}
  for (const driver of drivers) {
    if (!driversByTeam[driver.team]) driversByTeam[driver.team] = []
    driversByTeam[driver.team].push(driver)
  }

  // Standings lookup for rank badges
  const rankMap: Record<string, number> = {}
  if (standings) {
    for (const s of standings) {
      rankMap[s.Driver.driverId] = parseInt(s.position)
    }
  }

  const noRaces = !races || races.length === 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-black text-white">Fantasy Draft</h1>
        {myTeam.length > 0 && (
          <button
            className="text-xs px-3 py-1.5 rounded-lg border text-gray-500 hover:text-red-400 hover:border-red-900 transition-colors"
            style={{ borderColor: '#3a3a3a' }}
            onClick={clearTeam}
          >
            Clear team
          </button>
        )}
      </div>

      {/* Budget bar */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-white">
              Budget: <span style={{ color: budget < 0 ? '#ef4444' : '#22c55e' }}>{budget}M</span>{' '}
              remaining
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {myCost}M spent · {MAX_DRIVERS - myTeam.length} slots left
            </p>
          </div>
          <p className="text-xs text-gray-600">Total: {TOTAL_BUDGET}M</p>
        </div>
        <div className="h-2 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min((myCost / TOTAL_BUDGET) * 100, 100)}%`,
              backgroundColor: budget < 10 ? '#ef4444' : '#e10600',
            }}
          />
        </div>
      </div>

      {/* My team vs optimal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My team */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #2a2a2a' }}
          >
            <h2 className="font-bold text-white text-sm">My Team</h2>
            <span
              className="text-2xl font-black font-mono"
              style={{ color: '#e10600' }}
            >
              {myPoints}
              <span className="text-xs font-normal text-gray-500 ml-1">pts</span>
            </span>
          </div>

          {myTeam.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">
              Pick 5 drivers from the grid below
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#1f1f1f' }}>
              {myTeam.map((driverId, i) => {
                const driver = drivers.find(d => d.id === driverId)
                if (!driver) return null
                const pts = pointsMap[driverId] ?? 0
                const rank = rankMap[driverId]

                return (
                  <div
                    key={driverId}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="text-gray-700 font-mono text-xs w-4">{i + 1}</span>
                    <span
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: driver.color }}
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {driver.code} · {getDriverPrice(driverId)}M
                        {rank ? ` · P${rank} in standings` : ''}
                      </p>
                    </div>
                    <span
                      className="font-bold font-mono text-sm"
                      style={{ color: pts > 0 ? driver.color : '#6b7280' }}
                    >
                      {pts > 0 ? `${pts}pts` : '—'}
                    </span>
                    <button
                      className="text-gray-600 hover:text-red-400 text-xs transition-colors ml-1"
                      onClick={() => toggle(driverId)}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {myTeam.length > 0 && myTeam.length < MAX_DRIVERS && (
            <div
              className="px-5 py-3 text-xs text-gray-600 italic"
              style={{ borderTop: '1px solid #1f1f1f' }}
            >
              {MAX_DRIVERS - myTeam.length} more driver{MAX_DRIVERS - myTeam.length > 1 ? 's' : ''} needed
            </div>
          )}
        </div>

        {/* Optimal team */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid #2a2a2a' }}
          >
            <div>
              <h2 className="font-bold text-white text-sm">Optimal Team</h2>
              <p className="text-xs text-gray-600 mt-0.5">Best possible 5 by actual points</p>
            </div>
            <span
              className="text-2xl font-black font-mono"
              style={{ color: '#22c55e' }}
            >
              {optPoints > 0 ? optPoints : '—'}
              {optPoints > 0 && <span className="text-xs font-normal text-gray-500 ml-1">pts</span>}
            </span>
          </div>

          {noRaces ? (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">
              Optimal team will appear after races start
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#1f1f1f' }}>
              {optimal.map((driverId, i) => {
                const driver = drivers.find(d => d.id === driverId)
                if (!driver) return null
                const pts = pointsMap[driverId] ?? 0
                const inMyTeam = myTeam.includes(driverId)

                return (
                  <div key={driverId} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-gray-700 font-mono text-xs w-4">{i + 1}</span>
                    <span
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: driver.color }}
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {driver.code} · {getDriverPrice(driverId)}M
                      </p>
                    </div>
                    <span
                      className="font-bold font-mono text-sm"
                      style={{ color: driver.color }}
                    >
                      {pts}pts
                    </span>
                    {inMyTeam && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: '#22c55e20',
                          color: '#22c55e',
                          border: '1px solid #22c55e40',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Gap comparison */}
          {!noRaces && myTeam.length === MAX_DRIVERS && (
            <div
              className="px-5 py-3 text-sm"
              style={{ borderTop: '1px solid #2a2a2a' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Your gap to optimal</span>
                <span
                  className="font-bold font-mono"
                  style={{ color: optPoints - myPoints > 0 ? '#ef4444' : '#22c55e' }}
                >
                  {optPoints - myPoints > 0 ? `-${optPoints - myPoints}` : '+0'} pts
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Points race progress */}
      {!noRaces && myTeam.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Race-by-Race Points</h2>
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <th className="text-left text-gray-500 py-2 pr-4 font-semibold">Driver</th>
                  {chartRaces.map(r => (
                    <th key={r.round} className="text-center text-gray-500 px-2 py-2 font-semibold min-w-[40px]">
                      R{r.round}
                    </th>
                  ))}
                  <th className="text-right text-gray-500 px-2 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {myTeam.map(driverId => {
                  const driver = drivers.find(d => d.id === driverId)
                  if (!driver) return null
                  const total = pointsMap[driverId] ?? 0
                  return (
                    <tr
                      key={driverId}
                      className="hover:bg-white/3"
                      style={{ borderBottom: '1px solid #1f1f1f' }}
                    >
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: driver.color }}
                          />
                          <span className="font-semibold" style={{ color: driver.color }}>
                            {driver.code}
                          </span>
                        </div>
                      </td>
                      {chartRaces.map(race => {
                        const result = race.Results?.find(r => r.Driver.driverId === driverId)
                        const pts = result ? parseFloat(result.points) : 0
                        return (
                          <td key={race.round} className="text-center px-2 py-2 font-mono">
                            {pts > 0 ? (
                              <span
                                className="inline-block px-1 rounded font-bold"
                                style={{
                                  backgroundColor: `${driver.color}20`,
                                  color: driver.color,
                                }}
                              >
                                {pts}
                              </span>
                            ) : (
                              <span className="text-gray-700">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-right px-2 py-2 font-bold font-mono text-white">{total}</td>
                    </tr>
                  )
                })}
                {/* Team total row */}
                <tr style={{ borderTop: '1px solid #3a3a3a' }}>
                  <td className="py-2 pr-4 font-semibold text-gray-400">Team Total</td>
                  {chartRaces.map(race => {
                    const racePts = myTeam.reduce((sum, driverId) => {
                      const result = race.Results?.find(r => r.Driver.driverId === driverId)
                      return sum + (result ? parseFloat(result.points) : 0)
                    }, 0)
                    return (
                      <td key={race.round} className="text-center px-2 py-2 font-mono font-bold" style={{ color: '#e10600' }}>
                        {racePts > 0 ? racePts : <span className="text-gray-700">—</span>}
                      </td>
                    )
                  })}
                  <td className="text-right px-2 py-2 font-black font-mono text-xl" style={{ color: '#e10600' }}>
                    {myPoints}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Driver picker grid */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Driver Grid
          </h2>
          <div className="flex gap-4 text-xs text-gray-600">
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: '#e10600' }}
              />
              Tier 1 — 25M
            </span>
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: '#f97316' }}
              />
              Tier 2 — 18M
            </span>
            <span>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: '#6b7280' }}
              />
              Tier 3 — 12M
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {drivers.map(driver => {
            const price = getDriverPrice(driver.id)
            const pts = pointsMap[driver.id] ?? 0
            const selected = myTeam.includes(driver.id)
            const wouldExceedBudget = !selected && teamCost([...myTeam, driver.id]) > TOTAL_BUDGET
            const canAdd = canAddMore && !wouldExceedBudget

            return (
              <DriverCard
                key={driver.id}
                driver={driver}
                selected={selected}
                canAdd={canAdd}
                price={price}
                points={pts}
                onToggle={() => toggle(driver.id)}
              />
            )
          })}
        </div>

        {myTeam.length > 0 && (
          <p className="text-xs text-gray-600 mt-3 text-center">
            {myTeam.length}/{MAX_DRIVERS} drivers · {myCost}/{TOTAL_BUDGET}M spent
            {budget < 0 && (
              <span className="text-red-500 ml-2">Over budget!</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
