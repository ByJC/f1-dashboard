import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useSchedule, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { formatDate, isSprintWeekend, getCountryCode } from '@/utils'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'

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

// Fix Leaflet default icon in Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export function WorldMap() {
  const { data: schedule, isLoading } = useSchedule()
  const { data: races } = useRaceResults()
  const navigate = useNavigate()

  const now = new Date()

  if (isLoading) return <LoadingSpinner message="Loading map..." />

  const upcoming = schedule?.find(r => new Date(r.date) >= now)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">World Circuit Map</h1>
        <p className="text-gray-500 text-sm mt-1">
          {schedule?.length ?? 0} Grands Prix · {schedule?.filter(r => new Date(r.date) < now).length ?? 0} completed
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-2xl font-black text-white">{schedule?.length ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total GPs</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-2xl font-black text-green-400">
            {schedule?.filter(r => new Date(r.date) < now).length ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-2xl font-black text-yellow-400">
            {schedule?.filter(r => r.Sprint !== undefined || isSprintWeekend(r.raceName)).length ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Sprint WEs</p>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)', height: 480 }}>
        <MapContainer
          center={[20, 10]}
          zoom={2}
          style={{ height: '100%', width: '100%', backgroundColor: 'var(--bg-base)' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {schedule?.map(race => {
            const lat = parseFloat(race.Circuit.Location.lat)
            const lng = parseFloat(race.Circuit.Location.long)
            if (isNaN(lat) || isNaN(lng)) return null

            const isPast = new Date(race.date) < now
            const isNext = race === upcoming
            const winner = races?.find(r => r.round === race.round)?.Results?.[0]

            const color = isNext ? '#e10600' : isPast ? '#10b981' : '#6b7280'
            const radius = isNext ? 10 : 7

            return (
              <CircleMarker
                key={race.round}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: isNext ? 0.9 : 0.7,
                  weight: isNext ? 2 : 1,
                }}
              >
                <Popup>
                  <div style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px', minWidth: 180 }}>
                    {CIRCUIT_SVG_MAP[race.Circuit.circuitId] && (
                      <img
                        src={`/tracks/${CIRCUIT_SVG_MAP[race.Circuit.circuitId]}.svg`}
                        alt={race.Circuit.circuitName}
                        style={{ width: '100%', height: 80, objectFit: 'contain', filter: 'invert(1)', marginBottom: 6 }}
                      />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <img
                        src={`https://flagcdn.com/w20/${getCountryCode(race.Circuit.Location.country)}.png`}
                        alt=""
                        style={{ height: 12, borderRadius: 2 }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>R{race.round} · {race.raceName}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>
                      {race.Circuit.circuitName}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>
                      📅 {formatDate(race.date)}
                    </p>
                    {isNext && (
                      <span style={{ backgroundColor: '#e1060020', color: '#ef4444', border: '1px solid #e1060040', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                        NEXT RACE
                      </span>
                    )}
                    {winner && (
                      <p style={{ color: '#10b981', fontSize: 11, marginTop: 4 }}>
                        🏆 {winner.Driver.givenName} {winner.Driver.familyName}
                      </p>
                    )}
                    {isSprintWeekend(race.raceName) && (
                      <span style={{ backgroundColor: '#eab30820', color: '#fbbf24', border: '1px solid #eab30840', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginTop: 4, display: 'inline-block' }}>
                        SPRINT
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/circuits/${race.Circuit.circuitId}`)}
                      style={{ marginTop: 8, display: 'block', width: '100%', padding: '4px 0', borderRadius: 4, backgroundColor: '#e1060015', color: '#ef4444', border: '1px solid #e1060030', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      View Circuit →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-gray-400">Next race</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-gray-400">Upcoming</span>
        </div>
      </div>

      {/* GP List */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 className="font-bold text-white text-sm">Full Calendar</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {schedule?.map(race => {
            const isPast = new Date(race.date) < now
            const isNext = race === upcoming
            const winner = races?.find(r => r.round === race.round)?.Results?.[0]
            const countryCode = getCountryCode(race.Circuit.Location.country)
            return (
              <div
                key={race.round}
                className="flex items-center gap-3 px-5 py-2.5"
                style={{ opacity: isPast ? 0.7 : 1 }}
              >
                <span className="text-gray-600 font-mono text-xs w-6">R{race.round}</span>
                <img src={`https://flagcdn.com/w20/${countryCode}.png`} alt="" className="h-3 w-auto rounded-sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-semibold">{race.raceName}</span>
                  {isNext && <span className="ml-2 text-xs text-red-400 font-bold">NEXT</span>}
                  {isSprintWeekend(race.raceName) && <span className="ml-2 text-xs text-yellow-400">⚡ Sprint</span>}
                </div>
                <span className="text-gray-500 text-xs font-mono">{formatDate(race.date)}</span>
                {winner && (
                  <span className="text-green-400 text-xs hidden sm:block">🏆 {winner.Driver.code}</span>
                )}
                {isPast && !winner && <span className="text-green-500 text-xs">✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
