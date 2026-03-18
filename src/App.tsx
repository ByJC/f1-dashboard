import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Layout } from '@/components/Layout'
import { Home } from '@/pages/Home'
import { Calendar } from '@/pages/Calendar'
import { WorldMap } from '@/pages/WorldMap'
import { DriverStandings } from '@/pages/DriverStandings'
import { ConstructorStandings } from '@/pages/ConstructorStandings'
import { RaceResults } from '@/pages/RaceResults'
import { SprintResults } from '@/pages/SprintResults'
import { TrackStats } from '@/pages/TrackStats'
import { H2H } from '@/pages/H2H'
import { Records } from '@/pages/Records'
import { TireStrategy } from '@/pages/TireStrategy'
import { PitStopStats } from '@/pages/PitStopStats'
import { Timeline } from '@/pages/Timeline'
import { Bingo } from '@/pages/Bingo'
import { DriverOfTheDay } from '@/pages/DriverOfTheDay'
import { Predictions } from '@/pages/Predictions'
import { Draft } from '@/pages/Draft'
import { TeamRadio } from '@/pages/TeamRadio'
import { NotableEvents } from '@/pages/NotableEvents'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 30,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/map" element={<WorldMap />} />
            <Route path="/standings/drivers" element={<DriverStandings />} />
            <Route path="/standings/constructors" element={<ConstructorStandings />} />
            <Route path="/results/races" element={<RaceResults />} />
            <Route path="/results/sprints" element={<SprintResults />} />
            <Route path="/track-stats" element={<TrackStats />} />
            <Route path="/h2h" element={<H2H />} />
            <Route path="/records" element={<Records />} />
            <Route path="/tire-strategy" element={<TireStrategy />} />
            <Route path="/pit-stops" element={<PitStopStats />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/bingo" element={<Bingo />} />
            <Route path="/dotd" element={<DriverOfTheDay />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="/radio" element={<TeamRadio />} />
            <Route path="/notable-events" element={<NotableEvents />} />
          </Route>
        </Routes>
        <Analytics />
        <SpeedInsights />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
