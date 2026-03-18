const BASE_URL = 'https://api.openf1.org/v1'

async function fetchOpenF1<T>(path: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`OpenF1 API error: ${res.status}`)
  return res.json()
}

export interface OpenF1Session {
  session_key: number
  session_name: string
  date_start: string
  date_end: string
  gmt_offset: string
  session_type: string
  meeting_key: number
  location: string
  country_name: string
  year: number
  circuit_short_name: string
}

export interface OpenF1Stint {
  driver_number: number
  stint_number: number
  lap_start: number
  lap_end: number
  compound: string // SOFT, MEDIUM, HARD, INTERMEDIATE, WET
  tyre_age_at_start: number
  session_key: number
}

export interface OpenF1Pit {
  driver_number: number
  lap_number: number
  pit_duration: number // seconds
  session_key: number
  date: string
}

export interface OpenF1Weather {
  session_key: number
  date: string
  air_temperature: number
  track_temperature: number
  humidity: number
  pressure: number
  rainfall: number
  wind_direction: number
  wind_speed: number
}

export interface OpenF1TeamRadio {
  session_key: number
  driver_number: number
  date: string
  recording_url: string
}

export async function fetchPitStops(sessionKey: number): Promise<OpenF1Pit[]> {
  return fetchOpenF1<OpenF1Pit>(`/pit?session_key=${sessionKey}`)
}

export async function fetchStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return fetchOpenF1<OpenF1Stint>(`/stints?session_key=${sessionKey}`)
}

export async function fetchSessions(year: number): Promise<OpenF1Session[]> {
  return fetchOpenF1<OpenF1Session>(`/sessions?year=${year}&session_type=Race`)
}

export async function fetchWeather(sessionKey: number): Promise<OpenF1Weather[]> {
  return fetchOpenF1<OpenF1Weather>(`/weather?session_key=${sessionKey}`)
}

export async function fetchTeamRadio(sessionKey: number): Promise<OpenF1TeamRadio[]> {
  return fetchOpenF1<OpenF1TeamRadio>(`/team_radio?session_key=${sessionKey}`)
}
