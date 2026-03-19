import { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { useRaceResults, useQualifyingResults, useDriverStandings } from '@/hooks/useF1Data'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { drivers, getDriverByCode } from '@/utils'

const MAX_DRIVERS = 5

export function Compare() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const driverCodes = useMemo(() => {
    const raw = params.get('drivers') ?? ''
    return raw
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_DRIVERS)
  }, [params])

  const { data: races, isLoading: racesLoading } = useRaceResults()
  const { data: qualifyingRaces, isLoading: qualLoading } = useQualifyingResults()
  const { data: standings } = useDriverStandings()

  const isLoading = racesLoading || qualLoading

  const driverStats = useMemo(() => {
    if (!races || !qualifyingRaces) return []

    return driverCodes.map(code => {
      const driverInfo = getDriverByCode(code)
      if (!driverInfo) return null

      const standing = standings?.find(
        s => (s.Driver.code ?? '').toUpperCase() === code
      )
      const points = parseFloat(standing?.points ?? '0')
      const wins = parseInt(standing?.wins ?? '0')

      let podiums = 0
      let poles = 0
      let totalPos = 0
      let finishedCount = 0

      races.forEach(race => {
        const result = race.Results?.find(r => (r.Driver.code ?? '').toUpperCase() === code)
        if (!result) return
        const pos = parseInt(result.position)
        if (!isNaN(pos)) {
          if (pos <= 3) podiums++
          totalPos += pos
          finishedCount++
        }
      })

      qualifyingRaces.forEach(race => {
        const result = race.QualifyingResults?.find(r => (r.Driver.code ?? '').toUpperCase() === code)
        if (result?.position === '1') poles++
      })

      const avgFinish = finishedCount > 0 ? totalPos / finishedCount : 20

      return {
        code,
        driverInfo,
        points,
        wins,
        podiums,
        poles,
        avgFinish: Math.round((20 - avgFinish) * 10) / 10,
      }
    }).filter(Boolean)
  }, [driverCodes, races, qualifyingRaces, standings])

  const maxValues = useMemo(() => {
    if (driverStats.length === 0) return { points: 1, wins: 1, podiums: 1, poles: 1, avgFinish: 1 }
    return {
      points: Math.max(...driverStats.map(d => d!.points), 1),
      wins: Math.max(...driverStats.map(d => d!.wins), 1),
      podiums: Math.max(...driverStats.map(d => d!.podiums), 1),
      poles: Math.max(...driverStats.map(d => d!.poles), 1),
      avgFinish: Math.max(...driverStats.map(d => d!.avgFinish), 1),
    }
  }, [driverStats])

  const radarData = [
    { subject: 'Points', ...Object.fromEntries(driverStats.map(d => [d!.code, Math.round((d!.points / maxValues.points) * 100)])) },
    { subject: 'Wins', ...Object.fromEntries(driverStats.map(d => [d!.code, Math.round((d!.wins / maxValues.wins) * 100)])) },
    { subject: 'Podiums', ...Object.fromEntries(driverStats.map(d => [d!.code, Math.round((d!.podiums / maxValues.podiums) * 100)])) },
    { subject: 'Poles', ...Object.fromEntries(driverStats.map(d => [d!.code, Math.round((d!.poles / maxValues.poles) * 100)])) },
    { subject: 'Avg Finish', ...Object.fromEntries(driverStats.map(d => [d!.code, Math.round((d!.avgFinish / maxValues.avgFinish) * 100)])) },
  ]

  function addDriver(code: string) {
    if (driverCodes.includes(code) || driverCodes.length >= MAX_DRIVERS) return
    const newCodes = [...driverCodes, code]
    setParams({ drivers: newCodes.join(',') })
  }

  function removeDriver(code: string) {
    const newCodes = driverCodes.filter(c => c !== code)
    setParams({ drivers: newCodes.join(',') })
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
  }

  const availableToAdd = drivers.filter(d => !driverCodes.includes(d.code))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Driver Comparison</h1>
          <p className="text-sm text-gray-500 mt-0.5">2026 season stats</p>
        </div>
        <button
          onClick={copyLink}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
          style={{ backgroundColor: 'var(--border-default)', color: '#9ca3af' }}
        >
          Copy link
        </button>
      </div>

      {/* Driver selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {driverCodes.map(code => {
          const info = getDriverByCode(code)
          return (
            <span
              key={code}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{
                backgroundColor: info ? `${info.color}20` : 'var(--border-default)',
                color: info?.color ?? '#6b7280',
                border: `1px solid ${info ? `${info.color}40` : 'transparent'}`,
              }}
            >
              {code}
              <button onClick={() => removeDriver(code)} className="opacity-60 hover:opacity-100">
                ✕
              </button>
            </span>
          )
        })}
        {driverCodes.length < MAX_DRIVERS && (
          <select
            value=""
            onChange={e => { if (e.target.value) addDriver(e.target.value) }}
            className="text-xs px-2 py-1.5 rounded-lg border font-medium cursor-pointer"
            style={{ borderColor: 'var(--border-muted)', backgroundColor: 'var(--bg-card)', color: '#9ca3af' }}
          >
            <option value="">+ Add driver</option>
            {availableToAdd.map(d => (
              <option key={d.id} value={d.code} style={{ backgroundColor: 'var(--bg-card)' }}>
                {d.firstName} {d.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading stats..." />
      ) : driverStats.length < 2 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500">Select at least 2 drivers to compare</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {drivers.slice(0, 6).map(d => (
              <button
                key={d.id}
                onClick={() => addDriver(d.code)}
                disabled={driverCodes.includes(d.code)}
                className="text-xs px-3 py-1.5 rounded-lg font-bold transition-opacity disabled:opacity-30"
                style={{ backgroundColor: `${d.color}20`, color: d.color, border: `1px solid ${d.color}40` }}
              >
                {d.code}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Radar Chart */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Performance Radar (2026 season)</h2>
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a2a2a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                {driverStats.map(d => (
                  <Radar
                    key={d!.code}
                    name={d!.code}
                    dataKey={d!.code}
                    stroke={d!.driverInfo.color}
                    fill={d!.driverInfo.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">Driver</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Points</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Wins</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Podiums</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Poles</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-semibold">Avg Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {driverStats.map(d => (
                    <tr
                      key={d!.code}
                      className="hover:bg-white/3 cursor-pointer"
                      style={{ borderBottom: '1px solid #1f1f1f' }}
                      onClick={() => navigate(`/drivers/${d!.driverInfo.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1 h-5 rounded-full"
                            style={{ backgroundColor: d!.driverInfo.color }}
                          />
                          <span className="font-mono font-bold text-white">{d!.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white font-bold">{d!.points}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{d!.wins}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{d!.podiums}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{d!.poles}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">
                        {d!.podiums + d!.wins > 0 ? (20 - d!.avgFinish).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
