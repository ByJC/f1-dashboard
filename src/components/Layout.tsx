import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { CommandPalette } from '@/components/CommandPalette'
import { AnimatePresence, motion } from 'framer-motion'

const navItems = [
  { path: '/', label: 'Overview', icon: '🏁', end: true },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/map', label: 'World Map', icon: '🗺️' },
  { path: '/standings/drivers', label: 'Drivers', icon: '👨‍🏎️' },
  { path: '/standings/constructors', label: 'Constructors', icon: '🏗️' },
  { path: '/results/races', label: 'Race Results', icon: '🏆' },
  { path: '/results/sprints', label: 'Sprint Results', icon: '⚡' },
  { path: '/track-stats', label: 'Track Stats', icon: '📊' },
  { path: '/h2h', label: 'Head to Head', icon: '⚔️' },
  { path: '/records', label: 'Season Records', icon: '🏅' },
  { path: '/tire-strategy', label: 'Tire Strategy', icon: '🔴' },
  { path: '/pit-stops', label: 'Pit Stops', icon: '🔧' },
  { path: '/timeline', label: 'Timeline', icon: '📰' },
  { path: '/dotd', label: 'Driver of the Day', icon: '⭐' },
  { path: '/bingo', label: 'F1 Bingo', icon: '🎯' },
  { path: '/predictions', label: 'Predictions', icon: '🔮' },
  { path: '/draft', label: 'Draft', icon: '✏️' },
  { path: '/radio', label: 'Team Radio', icon: '📻' },
  { path: '/notable-events', label: 'Notable Events', icon: '🚩' },
  { path: '/drivers', label: 'Pilotes', icon: '🪖' },
  { path: '/compare', label: 'Compare', icon: '⚖️' },
]

// Bottom tab bar items for mobile (5 main ones)
const mobileMainItems = navItems.slice(0, 5)

export function Layout() {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      <CommandPalette />

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden transition-all duration-200 group/sidebar z-40"
        style={{
          width: '56px',
          borderRight: '1px solid #2a2a2a',
          backgroundColor: 'var(--bg-sidebar)',
        }}
        onMouseEnter={e => { e.currentTarget.style.width = '220px' }}
        onMouseLeave={e => { e.currentTarget.style.width = '56px' }}
      >
        {/* Logo */}
        <div
          className="flex items-center h-14 px-3.5 flex-shrink-0 overflow-hidden border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <span className="text-lg font-black text-red-600 flex-shrink-0">F1</span>
          <div className="ml-2.5 overflow-hidden whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
            <span className="text-sm font-bold text-white">DASHBOARD</span>
            <span className="text-xs text-gray-600 font-mono ml-1.5">2026</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center h-10 px-3.5 transition-colors overflow-hidden whitespace-nowrap ${
                  isActive
                    ? 'text-red-400 bg-red-600/10'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  <span
                    className="absolute left-0 w-0.5 h-5 rounded-r transition-all"
                    style={{ backgroundColor: isActive ? '#e10600' : 'transparent' }}
                  />
                  <span className="text-base flex-shrink-0 w-7 text-center">{item.icon}</span>
                  <span
                    className="ml-2 text-sm font-medium overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75"
                    style={{ color: isActive ? '#f87171' : 'inherit' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Theme toggle + Search hint */}
        <div
          className="flex-shrink-0 border-t overflow-hidden"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center h-10 w-full px-3.5 text-gray-600 hover:text-gray-300 transition-colors overflow-hidden whitespace-nowrap"
          >
            <span className="text-base flex-shrink-0 w-7 text-center">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="ml-2 text-xs overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            className="flex items-center h-10 w-full px-3.5 text-gray-600 hover:text-gray-300 transition-colors overflow-hidden whitespace-nowrap"
          >
            <span className="text-base flex-shrink-0 w-7 text-center">🔍</span>
            <span className="ml-2 text-xs overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-75">
              Search
              <kbd className="ml-2 text-gray-600 border rounded px-1 text-xs" style={{ borderColor: 'var(--border-muted)' }}>⌘K</kbd>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 py-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center border-t"
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-default)', height: '56px' }}
      >
        {mobileMainItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                isActive ? 'text-red-400' : 'text-gray-600'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-gray-600 hover:text-white transition-colors"
          onClick={() => setMobileMoreOpen(true)}
        >
          <span className="text-xl">⋯</span>
          <span className="text-xs">More</span>
        </button>
      </nav>

      {/* ── Mobile "More" drawer ── */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
            style={{ backgroundColor: 'var(--overlay)' }}
            onClick={() => setMobileMoreOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="rounded-t-2xl border-t overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-muted)', maxHeight: '70vh' }}
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-muted)' }} />
              </div>
              <div className="grid grid-cols-4 gap-1 p-3 pb-8">
                {navItems.slice(5).map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-colors ${
                        isActive
                          ? 'bg-red-600/15 text-red-400 font-semibold'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-center leading-tight px-1">{item.label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMobileMoreOpen(false) }}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-colors text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  <span className="text-2xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span className="text-center leading-tight px-1">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
