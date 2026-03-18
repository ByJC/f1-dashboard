import type { DriverInfo, TeamInfo } from '@/types/f1'
import driversData from '@/data/drivers.json'
import teamsData from '@/data/teams.json'

export const drivers: DriverInfo[] = driversData as DriverInfo[]
export const teams: TeamInfo[] = teamsData as TeamInfo[]

export function getDriver(id: string): DriverInfo | undefined {
  return drivers.find(d => d.id === id)
}

export function getDriverByCode(code: string): DriverInfo | undefined {
  return drivers.find(d => d.code.toLowerCase() === code.toLowerCase())
}

export function getTeam(id: string): TeamInfo | undefined {
  return teams.find(t => t.id === id)
}

export function getTeamByConstructorId(constructorId: string): TeamInfo | undefined {
  // Map Jolpica constructor IDs to our team IDs
  const mapping: Record<string, string> = {
    'red_bull': 'red_bull',
    'mercedes': 'mercedes',
    'ferrari': 'ferrari',
    'mclaren': 'mclaren',
    'aston_martin': 'aston_martin',
    'alpine': 'alpine',
    'williams': 'williams',
    'haas': 'haas',
    'sauber': 'sauber',
    'rb': 'racing_bulls',
    'racing_bulls': 'racing_bulls',
  }
  return teams.find(t => t.id === (mapping[constructorId] ?? constructorId))
}

export function getDriverColor(driverId: string): string {
  const driver = getDriver(driverId)
  if (driver) return driver.color
  const byCode = getDriverByCode(driverId)
  return byCode?.color ?? '#6b7280'
}

export function getTeamColor(teamId: string): string {
  return getTeam(teamId)?.color ?? '#6b7280'
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
  }
  return `${seconds}.${millis.toString().padStart(3, '0')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function getCountryCode(country: string): string {
  const codes: Record<string, string> = {
    'Australia': 'au',
    'China': 'cn',
    'Japan': 'jp',
    'Bahrain': 'bh',
    'Saudi Arabia': 'sa',
    'USA': 'us',
    'United States': 'us',
    'Italy': 'it',
    'Monaco': 'mc',
    'Canada': 'ca',
    'Spain': 'es',
    'Austria': 'at',
    'United Kingdom': 'gb',
    'Hungary': 'hu',
    'Belgium': 'be',
    'Netherlands': 'nl',
    'Singapore': 'sg',
    'Azerbaijan': 'az',
    'Mexico': 'mx',
    'Brazil': 'br',
    'Las Vegas': 'us',
    'Qatar': 'qa',
    'Abu Dhabi': 'ae',
    'Miami': 'us',
  }
  return codes[country] ?? 'un'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Sprint weekend circuits for 2026 season
export const SPRINT_WEEKENDS = ['China', 'Miami', 'Canada', 'Britain', 'Netherlands', 'Singapore']

export function isSprintWeekend(raceName: string): boolean {
  return SPRINT_WEEKENDS.some(name => raceName.toLowerCase().includes(name.toLowerCase()))
}
