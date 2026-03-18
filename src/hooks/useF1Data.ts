import { useQuery } from '@tanstack/react-query'
import {
  fetchSchedule,
  fetchRaceResults,
  fetchSprintResults,
  fetchQualifyingResults,
  fetchDriverStandings,
  fetchConstructorStandings,
  fetchFastestLaps,
} from '@/api/jolpica'

const STALE_TIME = 1000 * 60 * 30 // 30 minutes

export function useSchedule(season = 'current') {
  return useQuery({
    queryKey: ['schedule', season],
    queryFn: () => fetchSchedule(season),
    staleTime: STALE_TIME,
  })
}

export function useRaceResults(season = 'current') {
  return useQuery({
    queryKey: ['raceResults', season],
    queryFn: () => fetchRaceResults(season),
    staleTime: STALE_TIME,
  })
}

export function useSprintResults(season = 'current') {
  return useQuery({
    queryKey: ['sprintResults', season],
    queryFn: () => fetchSprintResults(season),
    staleTime: STALE_TIME,
  })
}

export function useQualifyingResults(season = 'current') {
  return useQuery({
    queryKey: ['qualifyingResults', season],
    queryFn: () => fetchQualifyingResults(season),
    staleTime: STALE_TIME,
  })
}

export function useDriverStandings(season = 'current') {
  return useQuery({
    queryKey: ['driverStandings', season],
    queryFn: () => fetchDriverStandings(season),
    staleTime: STALE_TIME,
  })
}

export function useConstructorStandings(season = 'current') {
  return useQuery({
    queryKey: ['constructorStandings', season],
    queryFn: () => fetchConstructorStandings(season),
    staleTime: STALE_TIME,
  })
}

export function useFastestLaps(season = 'current') {
  return useQuery({
    queryKey: ['fastestLaps', season],
    queryFn: () => fetchFastestLaps(season),
    staleTime: STALE_TIME,
  })
}
