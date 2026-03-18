import { useState, useEffect } from 'react'
import { useSchedule, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { drivers, getDriverByCode } from '@/utils'
import type { Race } from '@/types/f1'

const STORAGE_KEY = 'f1-predictions-2026'

interface Prediction {
  round: string
  p1: string // driverId
  p2: string
  p3: string
}

interface StoredPredictions {
  [round: string]: Prediction
}

function loadPredictions(): StoredPredictions {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function savePredictions(predictions: StoredPredictions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions))
}

function scorePrediction(
  pred: Prediction,
  actual: { p1: string; p2: string; p3: string }
): number {
  let score = 0
  const podium = [actual.p1, actual.p2, actual.p3]

  if (pred.p1 === actual.p1) score += 3
  else if (podium.includes(pred.p1)) score += 1

  if (pred.p2 === actual.p2) score += 3
  else if (podium.includes(pred.p2)) score += 1

  if (pred.p3 === actual.p3) score += 3
  else if (podium.includes(pred.p3)) score += 1

  return score
}

function isRacePast(race: Race): boolean {
  const raceDate = new Date(`${race.date}T${race.time ?? '00:00:00'}`)
  return raceDate < new Date()
}

function getActualPodium(race: Race): { p1: string; p2: string; p3: string } | null {
  if (!race.Results || race.Results.length < 3) return null
  const sorted = [...race.Results].sort((a, b) => parseInt(a.position) - parseInt(b.position))
  return {
    p1: sorted[0]?.Driver.driverId ?? '',
    p2: sorted[1]?.Driver.driverId ?? '',
    p3: sorted[2]?.Driver.driverId ?? '',
  }
}

function DriverSelect({
  value,
  onChange,
  exclude,
  label,
}: {
  value: string
  onChange: (id: string) => void
  exclude: string[]
  label: string
}) {
  const selected = drivers.find(d => d.id === value)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 font-semibold">{label}</label>
      <select
        className="text-sm font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer"
        style={{
          backgroundColor: '#0f0f0f',
          color: selected?.color ?? '#9ca3af',
          border: `1px solid ${selected ? `${selected.color}50` : '#3a3a3a'}`,
        }}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Pick driver —</option>
        {drivers
          .filter(d => !exclude.includes(d.id) || d.id === value)
          .map(d => (
            <option key={d.id} value={d.id}>
              {d.firstName} {d.lastName}
            </option>
          ))}
      </select>
    </div>
  )
}

function PredictionRow({
  position,
  predictedId,
  actualId,
  isPast,
}: {
  position: 1 | 2 | 3
  predictedId: string
  actualId: string
  isPast: boolean
}) {
  const predicted = drivers.find(d => d.id === predictedId)
  const actual = drivers.find(d => d.id === actualId)
  const exact = isPast && predictedId === actualId
  const podium = isPast && actualId !== '' && [actualId].includes(predictedId)
  const posColors: Record<number, string> = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' }

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: `${posColors[position]}20`, color: posColors[position] }}
      >
        {position}
      </span>

      {/* Predicted */}
      <div
        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{
          backgroundColor: predicted ? `${predicted.color}15` : '#2a2a2a',
          color: predicted?.color ?? '#6b7280',
          border: `1px solid ${predicted ? `${predicted.color}30` : '#3a3a3a'}`,
        }}
      >
        {predicted ? `${predicted.code} — ${predicted.firstName} ${predicted.lastName}` : '—'}
      </div>

      {/* Actual / result */}
      {isPast && (
        <>
          <span
            className="text-lg flex-shrink-0"
            title={exact ? 'Exact match (+3pts)' : podium ? 'Podium match (+1pt)' : 'Miss'}
          >
            {exact ? '✓' : podium ? '~' : '✗'}
          </span>
          <div
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: actual ? `${actual.color}15` : '#2a2a2a',
              color: actual?.color ?? '#6b7280',
              border: `1px solid ${actual ? `${actual.color}30` : '#3a3a3a'}`,
            }}
          >
            {actual ? `${actual.code} — ${actual.firstName} ${actual.lastName}` : '—'}
          </div>
        </>
      )}
    </div>
  )
}

export function Predictions() {
  const { data: schedule, isLoading: schedLoading, error: schedError } = useSchedule()
  const { data: raceResults, isLoading: resultsLoading, error: resultsError } = useRaceResults()

  const [predictions, setPredictions] = useState<StoredPredictions>(loadPredictions)
  const [activeRound, setActiveRound] = useState<string | null>(null)

  const isLoading = schedLoading || resultsLoading
  const error = schedError ?? resultsError

  useEffect(() => {
    savePredictions(predictions)
  }, [predictions])

  if (isLoading) return <LoadingSpinner message="Loading predictions..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  if (!schedule || schedule.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white">Race Predictions</h1>
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <p className="text-gray-500">No schedule available yet.</p>
        </div>
      </div>
    )
  }

  // Results keyed by round
  const resultsByRound: Record<string, Race> = {}
  if (raceResults) {
    for (const race of raceResults) {
      resultsByRound[race.round] = race
    }
  }

  // Total score
  let totalScore = 0
  let totalPossible = 0
  const history: {
    round: string
    raceName: string
    pred: Prediction | null
    actual: { p1: string; p2: string; p3: string } | null
    pts: number
    maxPts: number
  }[] = []

  for (const race of schedule) {
    const isPast = isRacePast(race)
    const resultRace = resultsByRound[race.round]
    const actual = resultRace ? getActualPodium(resultRace) : null
    const pred = predictions[race.round] ?? null

    let pts = 0
    if (isPast && pred && actual) {
      pts = scorePrediction(pred, actual)
      totalScore += pts
      totalPossible += 9
    } else if (isPast && actual) {
      totalPossible += 9
    }

    history.push({ round: race.round, raceName: race.raceName, pred, actual, pts, maxPts: 9 })
  }

  const upcomingRaces = schedule.filter(r => !isRacePast(r))
  const pastRaces = schedule.filter(r => isRacePast(r))

  function setPred(round: string, field: 'p1' | 'p2' | 'p3', driverId: string) {
    setPredictions(prev => ({
      ...prev,
      [round]: {
        round,
        p1: prev[round]?.p1 ?? '',
        p2: prev[round]?.p2 ?? '',
        p3: prev[round]?.p3 ?? '',
        [field]: driverId,
      },
    }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-black text-white">Race Predictions</h1>

        {/* Score display */}
        <div
          className="rounded-xl border px-6 py-3 flex items-center gap-3"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        >
          <div className="text-center">
            <p className="text-3xl font-black" style={{ color: '#e10600' }}>
              {totalScore}
            </p>
            <p className="text-xs text-gray-500">Season Score</p>
          </div>
          <div className="text-gray-700 text-xl">/</div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-400">{totalPossible}</p>
            <p className="text-xs text-gray-600">Available</p>
          </div>
        </div>
      </div>

      {/* Scoring key */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap gap-6 text-xs text-gray-400"
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      >
        <span>
          <span className="text-green-400 font-bold">✓ Exact position</span> = 3 pts
        </span>
        <span>
          <span className="text-yellow-400 font-bold">~ Right podium, wrong position</span> = 1 pt
        </span>
        <span>
          <span className="text-red-400 font-bold">✗ Miss</span> = 0 pts
        </span>
        <span className="text-gray-600">Max 9 pts per race</span>
      </div>

      {/* Upcoming races — prediction input */}
      {upcomingRaces.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Upcoming Races
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingRaces.slice(0, 4).map(race => {
              const pred = predictions[race.round]
              const isOpen = activeRound === race.round
              const p1 = pred?.p1 ?? ''
              const p2 = pred?.p2 ?? ''
              const p3 = pred?.p3 ?? ''

              return (
                <div
                  key={race.round}
                  className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/3 transition-colors"
                    onClick={() => setActiveRound(isOpen ? null : race.round)}
                  >
                    <div>
                      <span className="text-gray-500 text-xs font-mono mr-2">R{race.round}</span>
                      <span className="text-white font-semibold">{race.raceName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {pred && (p1 || p2 || p3) && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{
                            backgroundColor: '#e1060020',
                            color: '#e10600',
                            border: '1px solid #e1060040',
                          }}
                        >
                          Saved
                        </span>
                      )}
                      <span className="text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className="px-5 pb-5 space-y-3"
                      style={{ borderTop: '1px solid #2a2a2a' }}
                    >
                      <p className="text-xs text-gray-600 pt-4">
                        Predict the podium for {race.Circuit.Location.locality},{' '}
                        {race.Circuit.Location.country}
                      </p>
                      <DriverSelect
                        label="P1 — Race Winner"
                        value={p1}
                        onChange={id => setPred(race.round, 'p1', id)}
                        exclude={[p2, p3].filter(Boolean)}
                      />
                      <DriverSelect
                        label="P2 — Second Place"
                        value={p2}
                        onChange={id => setPred(race.round, 'p2', id)}
                        exclude={[p1, p3].filter(Boolean)}
                      />
                      <DriverSelect
                        label="P3 — Third Place"
                        value={p3}
                        onChange={id => setPred(race.round, 'p3', id)}
                        exclude={[p1, p2].filter(Boolean)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past races — results */}
      {pastRaces.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Prediction History
          </h2>

          {/* Summary table */}
          <div
            className="rounded-xl border overflow-hidden mb-6"
            style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">Round</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">Race</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Pred P1</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Pred P2</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Pred P3</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Actual P1</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Actual P2</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Actual P3</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .filter(h => pastRaces.some(r => r.round === h.round))
                    .map(h => {
                      const predP1 = drivers.find(d => d.id === h.pred?.p1)
                      const predP2 = drivers.find(d => d.id === h.pred?.p2)
                      const predP3 = drivers.find(d => d.id === h.pred?.p3)
                      const actP1 = h.actual ? getDriverByCode(
                        drivers.find(d => d.id === h.actual!.p1)?.code ?? ''
                      ) ?? drivers.find(d => d.id === h.actual!.p1) : null
                      const actP2 = h.actual ? getDriverByCode(
                        drivers.find(d => d.id === h.actual!.p2)?.code ?? ''
                      ) ?? drivers.find(d => d.id === h.actual!.p2) : null
                      const actP3 = h.actual ? getDriverByCode(
                        drivers.find(d => d.id === h.actual!.p3)?.code ?? ''
                      ) ?? drivers.find(d => d.id === h.actual!.p3) : null

                      const noPred = !h.pred || (!h.pred.p1 && !h.pred.p2 && !h.pred.p3)

                      function CodeBadge({ driver, match }: { driver: typeof predP1; match?: boolean }) {
                        if (!driver) return <span className="text-gray-600">—</span>
                        return (
                          <span
                            className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs"
                            style={{
                              backgroundColor: `${driver.color}20`,
                              color: driver.color,
                              border: `1px solid ${driver.color}40`,
                              opacity: match === false ? 0.4 : 1,
                            }}
                          >
                            {driver.code}
                          </span>
                        )
                      }

                      return (
                        <tr
                          key={h.round}
                          className="hover:bg-white/3 transition-colors"
                          style={{ borderBottom: '1px solid #1f1f1f' }}
                        >
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">R{h.round}</td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{h.raceName}</td>
                          <td className="px-4 py-3 text-center">
                            {noPred ? <span className="text-gray-600">—</span> : <CodeBadge driver={predP1} />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {noPred ? <span className="text-gray-600">—</span> : <CodeBadge driver={predP2} />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {noPred ? <span className="text-gray-600">—</span> : <CodeBadge driver={predP3} />}
                          </td>
                          <td className="px-4 py-3 text-center"><CodeBadge driver={actP1 ?? undefined} /></td>
                          <td className="px-4 py-3 text-center"><CodeBadge driver={actP2 ?? undefined} /></td>
                          <td className="px-4 py-3 text-center"><CodeBadge driver={actP3 ?? undefined} /></td>
                          <td className="px-4 py-3 text-right">
                            {noPred ? (
                              <span className="text-gray-600 text-xs">—</span>
                            ) : (
                              <span
                                className="font-bold font-mono"
                                style={{
                                  color:
                                    h.pts >= 7
                                      ? '#22c55e'
                                      : h.pts >= 4
                                      ? '#eab308'
                                      : h.pts > 0
                                      ? '#f97316'
                                      : '#6b7280',
                                }}
                              >
                                {h.pts}/{h.maxPts}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed past race predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastRaces.map(race => {
              const resultRace = resultsByRound[race.round]
              const actual = resultRace ? getActualPodium(resultRace) : null
              const pred = predictions[race.round]
              const pts = pred && actual ? scorePrediction(pred, actual) : 0
              const hasPred = pred && (pred.p1 || pred.p2 || pred.p3)

              return (
                <div
                  key={race.round}
                  className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: '1px solid #2a2a2a' }}
                  >
                    <div>
                      <span className="text-gray-500 text-xs font-mono mr-2">R{race.round}</span>
                      <span className="text-white font-semibold text-sm">{race.raceName}</span>
                    </div>
                    {hasPred && actual && (
                      <span
                        className="text-sm font-bold font-mono px-2 py-0.5 rounded"
                        style={{
                          color: pts >= 6 ? '#22c55e' : pts >= 3 ? '#eab308' : '#6b7280',
                          backgroundColor:
                            pts >= 6 ? '#22c55e20' : pts >= 3 ? '#eab30820' : '#6b728020',
                        }}
                      >
                        {pts}/9 pts
                      </span>
                    )}
                    {!hasPred && (
                      <span className="text-xs text-gray-600 italic">No prediction</span>
                    )}
                  </div>

                  <div className="px-5 py-4">
                    {hasPred ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                          <span>Prediction</span>
                          {actual && <span>Actual</span>}
                        </div>
                        <PredictionRow position={1} predictedId={pred.p1 ?? ''} actualId={actual?.p1 ?? ''} isPast={!!actual} />
                        <PredictionRow position={2} predictedId={pred.p2 ?? ''} actualId={actual?.p2 ?? ''} isPast={!!actual} />
                        <PredictionRow position={3} predictedId={pred.p3 ?? ''} actualId={actual?.p3 ?? ''} isPast={!!actual} />
                      </>
                    ) : actual ? (
                      <div className="space-y-2">
                        {(['p1', 'p2', 'p3'] as const).map((pos, i) => {
                          const d = drivers.find(dr => dr.id === actual[pos])
                          return (
                            <div key={pos} className="flex items-center gap-3">
                              <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                              <span
                                className="font-mono font-bold text-xs px-2 py-0.5 rounded"
                                style={{
                                  color: d?.color ?? '#6b7280',
                                  backgroundColor: d ? `${d.color}20` : '#2a2a2a',
                                }}
                              >
                                {d?.code ?? '—'}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {d ? `${d.firstName} ${d.lastName}` : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-xs">Results not yet available.</p>
                    )}
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
