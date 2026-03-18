import type { JolpicaResponse, Race, DriverStanding, ConstructorStanding } from '@/types/f1'

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

async function fetchJolpica<T>(path: string): Promise<JolpicaResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}.json?limit=100`)
  if (!res.ok) throw new Error(`Jolpica API error: ${res.status}`)
  return res.json()
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
