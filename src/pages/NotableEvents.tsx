import { useState } from 'react'
import eventsData from '@/data/notable-events.json'
import type { NotableEvent } from '@/types/f1'
import { useSchedule } from '@/hooks/useF1Data'

const EVENT_TYPES = [
  { value: 'Red Flag', icon: '🚩', color: '#ef4444' },
  { value: 'Safety Car', icon: '🚗', color: '#f59e0b' },
  { value: 'VSC', icon: '🟡', color: '#eab308' },
  { value: 'Wet Race', icon: '🌧️', color: '#3b82f6' },
  { value: 'Home Win', icon: '🏠', color: '#10b981' },
  { value: 'Home Podium', icon: '🏠', color: '#34d399' },
  { value: 'DNF Leader', icon: '💥', color: '#ef4444' },
  { value: 'First Win', icon: '🏆', color: '#ffd700' },
  { value: 'Bad Pitstop', icon: '🔧', color: '#f97316' },
  { value: 'DSQ', icon: '⚫', color: '#6b7280' },
  { value: 'Double DSQ', icon: '⚫⚫', color: '#4b5563' },
  { value: 'Animal Track', icon: '🐾', color: '#a855f7' },
  { value: 'Lap 1 Chaos', icon: '💥', color: '#ef4444' },
  { value: 'Team Orders', icon: '📟', color: '#8b5cf6' },
  { value: 'Other', icon: '📝', color: '#6b7280' },
]

export function NotableEvents() {
  const { data: schedule } = useSchedule()
  const [events, setEvents] = useState<NotableEvent[]>(() => {
    try {
      const s = localStorage.getItem('f1-events-2026')
      return s ? JSON.parse(s) : eventsData
    } catch { return eventsData as NotableEvent[] }
  })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ round: '', race: '', type: 'Red Flag', description: '', icon: '🚩' })
  const [filter, setFilter] = useState<string | null>(null)

  const save = (updated: NotableEvent[]) => {
    setEvents(updated)
    localStorage.setItem('f1-events-2026', JSON.stringify(updated))
  }

  const addEvent = () => {
    if (!form.description) return
    const evt: NotableEvent = {
      id: `e${Date.now()}`,
      round: parseInt(form.round),
      race: form.race,
      type: form.type,
      description: form.description,
      icon: form.icon,
    }
    save([...events, evt])
    setForm({ round: '', race: '', type: 'Red Flag', description: '', icon: '🚩' })
    setAdding(false)
  }

  const filteredEvents = filter ? events.filter(e => e.type === filter) : events
  const byRound = filteredEvents.reduce<Record<number, NotableEvent[]>>((acc, e) => {
    if (!acc[e.round]) acc[e.round] = []
    acc[e.round].push(e)
    return acc
  }, {})
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

  // Count by type
  const typeCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Notable Events</h1>
          <p className="text-gray-500 text-sm mt-1">Season milestones and memorable moments</p>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors text-red-400 hover:text-red-300 font-semibold"
          style={{ borderColor: '#e1060040', backgroundColor: '#e1060010' }}
        >
          + Add Event
        </button>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className="text-xs px-3 py-1 rounded-full border transition-colors"
          style={{
            backgroundColor: !filter ? '#e1060020' : 'transparent',
            borderColor: !filter ? '#e10600' : 'var(--border-muted)',
            color: !filter ? '#ef4444' : '#6b7280',
          }}
        >
          All ({events.length})
        </button>
        {EVENT_TYPES.filter(t => typeCounts[t.value]).map(et => (
          <button
            key={et.value}
            onClick={() => setFilter(filter === et.value ? null : et.value)}
            className="text-xs px-3 py-1 rounded-full border transition-colors"
            style={{
              backgroundColor: filter === et.value ? `${et.color}20` : 'transparent',
              borderColor: filter === et.value ? et.color : 'var(--border-muted)',
              color: filter === et.value ? et.color : '#6b7280',
            }}
          >
            {et.icon} {et.value} ({typeCounts[et.value]})
          </button>
        ))}
      </div>

      {/* Add event form */}
      {adding && (
        <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-muted)' }}>
          <h3 className="text-white font-semibold text-sm">New Notable Event</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Round</label>
              <select
                value={form.round}
                onChange={e => {
                  const round = e.target.value
                  const race = schedule?.find(r => r.round === round)
                  setForm(f => ({ ...f, round, race: race?.raceName ?? '' }))
                }}
                className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                <option value="">Select round</option>
                {schedule?.map(r => (
                  <option key={r.round} value={r.round}>R{r.round} — {r.raceName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Event Type</label>
              <select
                value={form.type}
                onChange={e => {
                  const et = EVENT_TYPES.find(t => t.value === e.target.value)
                  setForm(f => ({ ...f, type: e.target.value, icon: et?.icon ?? '📝' }))
                }}
                className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                {EVENT_TYPES.map(et => (
                  <option key={et.value} value={et.value}>{et.icon} {et.value}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What happened?"
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white resize-none"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-sm px-4 py-2 rounded-lg border text-gray-400" style={{ borderColor: 'var(--border-muted)' }}>
              Cancel
            </button>
            <button onClick={addEvent} className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white font-semibold">
              Save Event
            </button>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <p className="text-gray-500">No events recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rounds.map(round => {
            return (
              <div key={round}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-600 text-xs font-mono">R{round}</span>
                  <h2 className="text-white font-bold text-sm">{byRound[round][0]?.race}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byRound[round].map(evt => {
                    const et = EVENT_TYPES.find(t => t.value === evt.type)
                    return (
                      <div
                        key={evt.id}
                        className="rounded-xl border p-4"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: et ? `${et.color}30` : 'var(--border-default)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0">{evt.icon}</span>
                          <div>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: et?.color ?? '#6b7280' }}
                            >
                              {evt.type}
                            </span>
                            <p className="text-gray-300 text-sm mt-0.5">{evt.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
