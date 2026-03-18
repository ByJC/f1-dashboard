import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { drivers, teams } from '@/utils'

const PAGES = [
  { label: 'Overview', path: '/', icon: '🏁', group: 'Pages' },
  { label: 'Calendar', path: '/calendar', icon: '📅', group: 'Pages' },
  { label: 'Driver Standings', path: '/standings/drivers', icon: '👨‍🏎️', group: 'Pages' },
  { label: 'Constructor Standings', path: '/standings/constructors', icon: '🏗️', group: 'Pages' },
  { label: 'Race Results Grid', path: '/results/races', icon: '🏆', group: 'Pages' },
  { label: 'Sprint Results', path: '/results/sprints', icon: '⚡', group: 'Pages' },
  { label: 'Track Stats', path: '/track-stats', icon: '📊', group: 'Pages' },
  { label: 'World Map', path: '/map', icon: '🗺️', group: 'Pages' },
  { label: 'Head to Head', path: '/h2h', icon: '⚔️', group: 'Pages' },
  { label: 'Season Records', path: '/records', icon: '🏅', group: 'Pages' },
  { label: 'Tire Strategy', path: '/tire-strategy', icon: '🔴', group: 'Pages' },
  { label: 'Pit Stop Stats', path: '/pit-stops', icon: '🔧', group: 'Pages' },
  { label: 'Timeline', path: '/timeline', icon: '📰', group: 'Pages' },
  { label: 'Driver of the Day', path: '/dotd', icon: '⭐', group: 'Pages' },
  { label: 'F1 Bingo', path: '/bingo', icon: '🎯', group: 'Pages' },
  { label: 'Predictions', path: '/predictions', icon: '🔮', group: 'Pages' },
  { label: 'Draft', path: '/draft', icon: '✏️', group: 'Pages' },
  { label: 'Team Radio', path: '/radio', icon: '📻', group: 'Pages' },
  { label: 'Notable Events', path: '/notable-events', icon: '🚩', group: 'Pages' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const go = (path: string) => {
    navigate(path)
    setOpen(false)
    setSearch('')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #3a3a3a' }}
        onClick={e => e.stopPropagation()}
      >
        <Command label="F1 Dashboard Search">
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
            <span className="text-gray-500">🔍</span>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages, drivers, teams..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
              style={{ caretColor: '#e10600' }}
            />
            <kbd className="text-xs text-gray-600 border rounded px-1.5 py-0.5" style={{ borderColor: 'var(--border-muted)' }}>ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-gray-500 text-sm">
              No results found
            </Command.Empty>

            <Command.Group heading="Pages">
              {PAGES.map(page => (
                <Command.Item
                  key={page.path}
                  value={page.label}
                  onSelect={() => go(page.path)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
                  style={{ color: '#d1d5db' }}
                >
                  <span className="w-5 text-center">{page.icon}</span>
                  <span>{page.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Drivers">
              {drivers.map(driver => (
                <Command.Item
                  key={driver.id}
                  value={`${driver.firstName} ${driver.lastName} ${driver.code}`}
                  onSelect={() => go('/standings/drivers')}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${driver.color}30`, color: driver.color }}
                  >
                    {driver.code[0]}
                  </span>
                  <span style={{ color: driver.color }}>{driver.code}</span>
                  <span className="text-gray-400">{driver.firstName} {driver.lastName}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Teams">
              {teams.map(team => (
                <Command.Item
                  key={team.id}
                  value={`${team.name} ${team.shortName}`}
                  onSelect={() => go('/standings/constructors')}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm"
                >
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: team.color }}
                  />
                  <span style={{ color: team.color }}>{team.shortName}</span>
                  <span className="text-gray-500 text-xs">{team.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-gray-600" style={{ borderColor: 'var(--border-default)' }}>
            <span><kbd className="border rounded px-1" style={{ borderColor: 'var(--border-muted)' }}>↑↓</kbd> navigate</span>
            <span><kbd className="border rounded px-1" style={{ borderColor: 'var(--border-muted)' }}>↵</kbd> select</span>
            <span><kbd className="border rounded px-1" style={{ borderColor: 'var(--border-muted)' }}>⌘K</kbd> toggle</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
