import type { JolpicaResponse, Race, DriverStanding, ConstructorStanding, Driver } from '@/types/f1'

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

async function fetchJolpica<T>(path: string, limit = 100, offset = 0): Promise<JolpicaResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}.json?limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`)
  return res.json()
}

// Fetches all pages for endpoints that cap at 100 records
async function fetchAllPages<T>(
  path: string,
  getItems: (data: JolpicaResponse<T>) => T[]
): Promise<T[]> {
  const PAGE_SIZE = 100
  const first = await fetchJolpica<T>(path, PAGE_SIZE, 0)
  const total = parseInt(first.MRData.total)
  const items = getItems(first)

  if (total <= PAGE_SIZE) return items

  const offsets = Array.from(
    { length: Math.ceil((total - PAGE_SIZE) / PAGE_SIZE) },
    (_, i) => (i + 1) * PAGE_SIZE
  )
  const pages = await Promise.all(
    offsets.map(offset => fetchJolpica<T>(path, PAGE_SIZE, offset).then(getItems))
  )
  return items.concat(...pages)
}

export async function fetchSchedule(season = 'current'): Promise<Race[]> {
  const data = await fetchJolpica<Race>(`/${season}`)
  return data.MRData.RaceTable?.Races ?? []
}

export async function fetchRaceResults(season = 'current'): Promise<Race[]> {
  const data = await fetchJolpica<Race>(`/${season}/results`)
  return data.MRData.RaceTable?.Races ?? []
}

export async function fetchSprintResults(season = 'current'): Promise<Race[]> {
  const data = await fetchJolpica<Race>(`/${season}/sprint`)
  return data.MRData.RaceTable?.Races ?? []
}

export async function fetchQualifyingResults(season = 'current'): Promise<Race[]> {
  const data = await fetchJolpica<Race>(`/${season}/qualifying`)
  return data.MRData.RaceTable?.Races ?? []
}

export async function fetchDriverStandings(season = 'current'): Promise<DriverStanding[]> {
  const data = await fetchJolpica<never>(`/${season}/driverStandings`)
  return data.MRData.StandingsTable?.StandingsLists[0]?.DriverStandings ?? []
}

export async function fetchConstructorStandings(season = 'current'): Promise<ConstructorStanding[]> {
  const data = await fetchJolpica<never>(`/${season}/constructorStandings`)
  return data.MRData.StandingsTable?.StandingsLists[0]?.ConstructorStandings ?? []
}

export async function fetchFastestLaps(season = 'current'): Promise<Race[]> {
  const data = await fetchJolpica<Race>(`/${season}/fastest/1/results`)
  return data.MRData.RaceTable?.Races ?? []
}

export async function fetchDriverCareerResults(driverId: string): Promise<Race[]> {
  return fetchAllPages<Race>(
    `/drivers/${driverId}/results`,
    d => d.MRData.RaceTable?.Races ?? []
  )
}

export async function fetchDriverCareerQualifying(driverId: string): Promise<Race[]> {
  return fetchAllPages<Race>(
    `/drivers/${driverId}/qualifying`,
    d => d.MRData.RaceTable?.Races ?? []
  )
}

export async function fetchDriverSeasonStanding(
  driverId: string,
  season: string
): Promise<{ season: string; standing: DriverStanding | null }> {
  const data = await fetchJolpica<never>(`/${season}/drivers/${driverId}/driverStandings`)
  return {
    season,
    standing: data.MRData.StandingsTable?.StandingsLists[0]?.DriverStandings?.[0] ?? null,
  }
}

export async function fetchDriverInfo(driverId: string): Promise<Driver | null> {
  const data = await fetchJolpica<never>(`/drivers/${driverId}`, 1)
  return data.MRData.DriverTable?.Drivers[0] ?? null
}
