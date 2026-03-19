import { useState, useMemo } from 'react'
import radioData from '@/data/radio.json'
import type { RadioQuote } from '@/types/f1'
import { getDriver, drivers } from '@/utils'
import { useSchedule, useOpenF1Sessions, useOpenF1TeamRadio } from '@/hooks/useF1Data'

// ─── Audio player ──────────────────────────────────────────────────────────────

function AudioButton({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const [audio] = useState(() => new Audio(url))

  const toggle = () => {
    if (playing) {
      audio.pause()
      audio.currentTime = 0
      setPlaying(false)
    } else {
      audio.play().catch(() => setPlaying(false))
      audio.onended = () => setPlaying(false)
      setPlaying(true)
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
      style={{
        backgroundColor: playing ? '#e1060020' : '#ffffff10',
        color: playing ? '#ef4444' : '#9ca3af',
        border: `1px solid ${playing ? '#e1060040' : '#3a3a3a'}`,
      }}
      title={playing ? 'Stop' : 'Play radio message'}
    >
      {playing ? '⏹' : '▶'} {playing ? 'Stop' : 'Play'}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TeamRadio() {
  const [quotes, setQuotes] = useState<RadioQuote[]>(radioData as RadioQuote[])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ driverId: '', round: '', race: '', quote: '', context: '' })

  // OpenF1 live radio
  const { data: schedule } = useSchedule()
  const { data: openF1Sessions } = useOpenF1Sessions(2026)
  const [liveRound, setLiveRound] = useState<string | null>(null)

  const now = new Date()
  const completedRaces = useMemo(
    () => (schedule ?? []).filter(r => new Date(r.date) < now),
    [schedule, now],
  )

  // Build locality → session_key map
  const localityToSessionKey = useMemo(() => {
    if (!openF1Sessions) return {} as Record<string, number>
    return Object.fromEntries(
      openF1Sessions.map(s => [s.location.toLowerCase(), s.session_key])
    ) as Record<string, number>
  }, [openF1Sessions])

  // Active round defaults to last completed race
  const activeLiveRound = liveRound ?? completedRaces[completedRaces.length - 1]?.round ?? null
  const activeLiveRace = completedRaces.find(r => r.round === activeLiveRound)

  const liveSessionKey = useMemo(() => {
    if (!activeLiveRace) return null
    return localityToSessionKey[activeLiveRace.Circuit.Location.locality.toLowerCase()] ?? null
  }, [activeLiveRace, localityToSessionKey])

  const { data: liveRadio, isLoading: liveLoading } = useOpenF1TeamRadio(liveSessionKey)

  const addQuote = () => {
    if (!form.quote || !form.driverId) return
    const newQuote: RadioQuote = {
      id: `r${Date.now()}`,
      driverId: form.driverId,
      round: parseInt(form.round),
      race: form.race,
      quote: form.quote,
      context: form.context || undefined,
    }
    const updated = [...quotes, newQuote]
    setQuotes(updated)
    localStorage.setItem('f1-radio-2026', JSON.stringify(updated))
    setForm({ driverId: '', round: '', race: '', quote: '', context: '' })
    setAdding(false)
  }

  // Load from localStorage on mount
  const storedQuotes = (() => {
    try {
      const s = localStorage.getItem('f1-radio-2026')
      return s ? JSON.parse(s) as RadioQuote[] : quotes
    } catch { return quotes }
  })()

  const [displayQuotes] = useState<RadioQuote[]>(storedQuotes)

  const byRound = displayQuotes.reduce<Record<number, RadioQuote[]>>((acc, q) => {
    if (!acc[q.round]) acc[q.round] = []
    acc[q.round].push(q)
    return acc
  }, {})

  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Team Radio</h1>
          <p className="text-gray-500 text-sm mt-1">Memorable quotes from the 2026 season</p>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors text-red-400 hover:text-red-300 font-semibold"
          style={{ borderColor: '#e1060040', backgroundColor: '#e1060010' }}
        >
          + Add Quote
        </button>
      </div>

      {/* Add quote form */}
      {adding && (
        <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-muted)' }}>
          <h3 className="text-white font-semibold text-sm">New Radio Quote</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Driver Code (e.g. VER)</label>
              <input
                type="text"
                value={form.driverId}
                onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                placeholder="VER"
                className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white font-mono uppercase"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Round</label>
              <input
                type="number"
                value={form.round}
                onChange={e => setForm(f => ({ ...f, round: e.target.value }))}
                placeholder="1"
                className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white"
                style={{ borderColor: 'var(--border-muted)' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Race Name</label>
            <input
              type="text"
              value={form.race}
              onChange={e => setForm(f => ({ ...f, race: e.target.value }))}
              placeholder="Australian GP"
              className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Quote *</label>
            <textarea
              value={form.quote}
              onChange={e => setForm(f => ({ ...f, quote: e.target.value }))}
              placeholder="What did they say?"
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white resize-none"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Context (optional)</label>
            <input
              type="text"
              value={form.context}
              onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
              placeholder="What was happening at the time?"
              className="w-full text-sm px-3 py-2 rounded-lg bg-black border text-white"
              style={{ borderColor: 'var(--border-muted)' }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="text-sm px-4 py-2 rounded-lg border text-gray-400"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={addQuote}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white font-semibold"
            >
              Save Quote
            </button>
          </div>
        </div>
      )}

      {/* ── Official Radio (OpenF1) ── */}
      {completedRaces.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Official Radio</h2>
            <div className="flex flex-wrap gap-1.5">
              {completedRaces.map(race => (
                <button
                  key={race.round}
                  onClick={() => setLiveRound(race.round)}
                  className="text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors"
                  style={{
                    backgroundColor: activeLiveRound === race.round ? '#e1060020' : 'transparent',
                    borderColor: activeLiveRound === race.round ? '#e10600' : 'var(--border-muted)',
                    color: activeLiveRound === race.round ? '#ef4444' : '#6b7280',
                  }}
                >
                  R{race.round}
                </button>
              ))}
            </div>
          </div>

          {liveLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <div className="w-4 h-4 rounded-full border border-gray-700 border-t-red-600 animate-spin" />
              Loading radio messages…
            </div>
          )}

          {!liveLoading && liveRadio && liveRadio.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveRadio.slice(0, 30).map((entry, i) => {
                const driver = drivers.find(d => parseInt(d.number) === entry.driver_number)
                  ?? getDriver(String(entry.driver_number))
                const time = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                return (
                  <div
                    key={i}
                    className="rounded-xl border p-4 space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: driver ? `${driver.color}30` : 'var(--border-default)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {driver ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                            style={{ backgroundColor: `${driver.color}20`, color: driver.color }}
                          >
                            {driver.code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 font-mono">#{entry.driver_number}</span>
                        )}
                        <span className="text-xs text-gray-600">📻</span>
                      </div>
                      <span className="text-xs text-gray-700 font-mono">{time}</span>
                    </div>
                    <AudioButton url={entry.recording_url} />
                  </div>
                )
              })}
            </div>
          )}

          {!liveLoading && liveRadio && liveRadio.length === 0 && liveSessionKey && (
            <p className="text-gray-500 text-sm py-4">No radio messages found for this race.</p>
          )}

          {!liveSessionKey && !liveLoading && (
            <p className="text-gray-600 text-xs py-2">Session data not yet available for this race.</p>
          )}
        </div>
      )}

      <div className="border-t pt-6" style={{ borderColor: 'var(--border-default)' }}>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Fan Quotes</h2>

        {rounds.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
            <p className="text-gray-500 text-lg mb-2">📻</p>
            <p className="text-gray-500">No radio quotes yet — add the first one!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {rounds.map(round => (
              <div key={round}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-white font-bold">Round {round}</h3>
                  <span className="text-gray-600 text-sm">—</span>
                  <span className="text-gray-500 text-sm">{byRound[round][0]?.race}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byRound[round].map(quote => {
                    const driver = getDriver(quote.driverId)
                    return (
                      <div
                        key={quote.id}
                        className="rounded-xl border p-4 space-y-2"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: driver ? `${driver.color}30` : 'var(--border-default)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {driver && (
                            <span
                              className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                              style={{ backgroundColor: `${driver.color}20`, color: driver.color }}
                            >
                              {driver.code}
                            </span>
                          )}
                          {!driver && (
                            <span className="text-xs text-gray-500 font-mono">{quote.driverId}</span>
                          )}
                          <span className="text-xs text-gray-600">📻</span>
                        </div>
                        <blockquote
                          className="text-white text-sm leading-relaxed italic"
                          style={{ borderLeft: `2px solid ${driver?.color ?? '#e10600'}`, paddingLeft: '0.75rem' }}
                        >
                          "{quote.quote}"
                        </blockquote>
                        {quote.context && (
                          <p className="text-gray-600 text-xs">{quote.context}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
