import { useMemo } from 'react'
import { useSchedule, useRaceResults } from '@/hooks/useF1Data'
import { LoadingSpinner, ErrorMessage } from '@/components/LoadingSpinner'
import { getDriverByCode, formatDate } from '@/utils'
import type { NotableEvent, RadioQuote } from '@/types/f1'

const EVENT_TYPE_COLORS: Record<string, string> = {
  'Red Flag': '#ef4444',
  'Safety Car': '#f59e0b',
  'VSC': '#eab308',
  'Wet Race': '#3b82f6',
  'Home Win': '#10b981',
  'Home Podium': '#34d399',
  'DNF Leader': '#ef4444',
  'First Win': '#ffd700',
  'Bad Pitstop': '#f97316',
  'DSQ': '#6b7280',
  'Double DSQ': '#4b5563',
  'Animal Track': '#a855f7',
  'Lap 1 Chaos': '#ef4444',
  'Team Orders': '#8b5cf6',
  'Other': '#6b7280',
}

interface TimelineItem {
  id: string
  type: 'winner' | 'dotd' | 'event' | 'radio'
  icon: string
  color: string
  title: string
  subtitle?: string
}

export function Timeline() {
  const { data: schedule, isLoading: schedLoading, error: schedError } = useSchedule()
  const { data: raceResults, isLoading: resultsLoading, error: resultsError } = useRaceResults()

  const events = useMemo<NotableEvent[]>(() => {
    try {
      const s = localStorage.getItem('f1-events-2026')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  }, [])

  const radioQuotes = useMemo<RadioQuote[]>(() => {
    try {
      const s = localStorage.getItem('f1-radio-2026')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  }, [])

  const dotdMap = useMemo<Record<string, string>>(() => {
    try {
      const s = localStorage.getItem('f1-dotd-2026')
      return s ? JSON.parse(s) : {}
    } catch { return {} }
  }, [])

  const isLoading = schedLoading || resultsLoading
  const error = schedError || resultsError

  if (isLoading) return <LoadingSpinner message="Loading timeline..." />
  if (error) return <ErrorMessage message={(error as Error).message} />

  const completedRaces = raceResults ?? []
  const allRounds = schedule ?? []

  const now = new Date()
  const pastRaces = allRounds.filter(r => new Date(r.date) < now)

  const hasAnyData =
    completedRaces.length > 0 ||
    events.length > 0 ||
    radioQuotes.length > 0 ||
    Object.keys(dotdMap).length > 0

  if (pastRaces.length === 0 && !hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Season Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">Chronological overview of the 2026 season</p>
        </div>
        <div
          className="rounded-xl border p-12 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="text-5xl mb-4">🏎️</div>
          <p className="text-white font-semibold mb-2">The season hasn't started yet</p>
          <p className="text-gray-500 text-sm">
            Once races are completed, this timeline will show race winners, notable events, radio quotes and Driver of the Day.
          </p>
        </div>
      </div>
    )
  }

  // Map race results by round
  const resultsByRound: Record<string, typeof completedRaces[0]> = {}
  completedRaces.forEach(r => { resultsByRound[r.round] = r })

  // Map events by round
  const eventsByRound: Record<number, NotableEvent[]> = {}
  events.forEach(e => {
    if (!eventsByRound[e.round]) eventsByRound[e.round] = []
    eventsByRound[e.round].push(e)
  })

  // Map radio by round
  const radioByRound: Record<number, RadioQuote[]> = {}
  radioQuotes.forEach(q => {
    if (!radioByRound[q.round]) radioByRound[q.round] = []
    radioByRound[q.round].push(q)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Season Timeline</h1>
        <p className="text-gray-500 text-sm mt-1">Chronological overview of the 2026 season</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { icon: '🏆', label: 'Race Winner', color: '#ffd700' },
          { icon: '⭐', label: 'Driver of the Day', color: '#f59e0b' },
          { icon: '📋', label: 'Notable Event', color: '#e10600' },
          { icon: '📻', label: 'Radio Quote', color: '#8b5cf6' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Center line — desktop only */}
        <div
          className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ backgroundColor: 'var(--border-default)' }}
        />
        {/* Left line — mobile */}
        <div
          className="md:hidden absolute left-4 top-0 bottom-0 w-px"
          style={{ backgroundColor: 'var(--border-default)' }}
        />

        <div className="space-y-0">
          {pastRaces.map((race, raceIdx) => {
            const roundNum = parseInt(race.round)
            const result = resultsByRound[race.round]
            const winner = result?.Results?.[0]
            const winnerDriver = winner ? getDriverByCode(winner.Driver.code ?? '') : null
            const dotdCode = dotdMap[race.round]
            const dotdDriver = dotdCode ? getDriverByCode(dotdCode) : null
            const roundEvents = eventsByRound[roundNum] ?? []
            const roundRadio = radioByRound[roundNum] ?? []

            const items: TimelineItem[] = []

            if (winner) {
              items.push({
                id: `winner-${race.round}`,
                type: 'winner',
                icon: '🏆',
                color: winnerDriver?.color ?? '#ffd700',
                title: winnerDriver
                  ? `${winnerDriver.firstName} ${winnerDriver.lastName}`
                  : `${winner.Driver.givenName} ${winner.Driver.familyName}`,
                subtitle: `P1 · ${winner.Constructor.name} · ${winner.laps} laps`,
              })
            }

            if (dotdDriver) {
              items.push({
                id: `dotd-${race.round}`,
                type: 'dotd',
                icon: '⭐',
                color: dotdDriver.color,
                title: `${dotdDriver.firstName} ${dotdDriver.lastName}`,
                subtitle: 'Driver of the Day',
              })
            }

            roundEvents.forEach(evt => {
              items.push({
                id: evt.id,
                type: 'event',
                icon: evt.icon,
                color: EVENT_TYPE_COLORS[evt.type] ?? '#6b7280',
                title: evt.description,
                subtitle: evt.type,
              })
            })

            roundRadio.forEach(q => {
              const driver = getDriverByCode(q.driverId)
              items.push({
                id: q.id,
                type: 'radio',
                icon: '📻',
                color: driver?.color ?? '#8b5cf6',
                title: `"${q.quote}"`,
                subtitle: driver ? `${driver.firstName} ${driver.lastName}` : q.driverId,
              })
            })

            const isLeft = raceIdx % 2 === 0

            return (
              <div key={race.round} className="relative mb-8">
                {/* Race header — mobile: offset to right of line */}
                <div className="md:hidden pl-10 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#e10600' }}
                    />
                    <h2 className="text-white font-bold text-sm">{race.raceName}</h2>
                  </div>
                  <p className="text-gray-500 text-xs ml-4">{formatDate(race.date)} · Round {race.round}</p>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:flex items-start gap-4">
                  {/* Left side content (even rounds) */}
                  <div className="flex-1 flex flex-col items-end">
                    {isLeft ? (
                      <div className="w-full max-w-sm">
                        <RaceSection
                          race={race}
                          items={items}
                          align="right"
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Center dot */}
                  <div className="flex-shrink-0 flex flex-col items-center" style={{ width: '2rem' }}>
                    <div
                      className="w-3 h-3 rounded-full border-2 mt-1"
                      style={{ backgroundColor: 'var(--bg-base)', borderColor: '#e10600' }}
                    />
                  </div>

                  {/* Right side content (odd rounds) */}
                  <div className="flex-1">
                    {!isLeft ? (
                      <div className="w-full max-w-sm">
                        <RaceSection
                          race={race}
                          items={items}
                          align="left"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Mobile items */}
                {items.length > 0 && (
                  <div className="md:hidden pl-10 space-y-2">
                    {items.map(item => (
                      <TimelineCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!hasAnyData && pastRaces.length > 0 && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-gray-500 text-sm">
            No events, radio quotes or Driver of the Day recorded yet.
            Use the Notable Events, Team Radio, and DOTD pages to track season moments.
          </p>
        </div>
      )}
    </div>
  )
}

function RaceSection({
  race,
  items,
  align,
}: {
  race: { round: string; raceName: string; date: string }
  items: TimelineItem[]
  align: 'left' | 'right'
}) {
  return (
    <div className={`space-y-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div>
        <h2 className="text-white font-bold text-sm">{race.raceName}</h2>
        <p className="text-gray-500 text-xs">{formatDate(race.date)} · Round {race.round}</p>
      </div>
      {items.map(item => (
        <TimelineCard key={item.id} item={item} align={align} />
      ))}
    </div>
  )
}

function TimelineCard({
  item,
  align = 'left',
}: {
  item: TimelineItem
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: `${item.color}30`,
      }}
    >
      <span className="flex-shrink-0 text-base leading-none mt-0.5">{item.icon}</span>
      <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
        {item.subtitle && (
          <p className="text-xs font-semibold mb-0.5" style={{ color: item.color }}>
            {item.subtitle}
          </p>
        )}
        <p className="text-gray-300 text-xs leading-snug break-words">{item.title}</p>
      </div>
    </div>
  )
}
