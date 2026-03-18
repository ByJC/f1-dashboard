// Jolpica/Ergast API Types

export interface Driver {
  driverId: string
  permanentNumber?: string
  code?: string
  url?: string
  givenName: string
  familyName: string
  dateOfBirth?: string
  nationality?: string
}

export interface Constructor {
  constructorId: string
  url?: string
  name: string
  nationality?: string
}

export interface Circuit {
  circuitId: string
  url?: string
  circuitName: string
  Location: {
    lat: string
    long: string
    locality: string
    country: string
  }
}

export interface Race {
  season: string
  round: string
  url?: string
  raceName: string
  Circuit: Circuit
  date: string
  time?: string
  FirstPractice?: { date: string; time: string }
  SecondPractice?: { date: string; time: string }
  ThirdPractice?: { date: string; time: string }
  Qualifying?: { date: string; time: string }
  Sprint?: { date: string; time: string }
  SprintQualifying?: { date: string; time: string }
  Results?: RaceResult[]
  SprintResults?: SprintResult[]
  QualifyingResults?: QualifyingResult[]
}

export interface RaceResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: Driver
  Constructor: Constructor
  grid: string
  laps: string
  status: string
  Time?: { millis: string; time: string }
  FastestLap?: {
    rank: string
    lap: string
    Time: { time: string }
    AverageSpeed: { units: string; speed: string }
  }
}

export interface SprintResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: Driver
  Constructor: Constructor
  grid: string
  laps: string
  status: string
  Time?: { millis: string; time: string }
  FastestLap?: {
    rank: string
    lap: string
    Time: { time: string }
  }
}

export interface QualifyingResult {
  number: string
  position: string
  Driver: Driver
  Constructor: Constructor
  Q1?: string
  Q2?: string
  Q3?: string
}

export interface DriverStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Driver: Driver
  Constructors: Constructor[]
}

export interface ConstructorStanding {
  position: string
  positionText: string
  points: string
  wins: string
  Constructor: Constructor
}

export interface StandingsTable {
  season: string
  round?: string
  DriverStandings?: DriverStanding[]
  ConstructorStandings?: ConstructorStanding[]
}

export type StandingsListItem = {
  season: string
  round: string
  DriverStandings?: DriverStanding[]
  ConstructorStandings?: ConstructorStanding[]
}

export interface JolpicaResponse<T> {
  MRData: {
    xmlns: string
    series: string
    url: string
    limit: string
    offset: string
    total: string
    RaceTable?: {
      season: string
      round?: string
      driverId?: string
      Races: T[]
    }
    StandingsTable?: {
      season: string
      driverId?: string
      StandingsLists: StandingsListItem[]
    }
    DriverTable?: {
      driverId?: string
      Drivers: Driver[]
    }
  }
}

// Local static data types

export interface TeamInfo {
  id: string
  name: string
  shortName: string
  color: string
  secondaryColor?: string
  drivers: string[]
}

export interface DriverInfo {
  id: string
  code: string
  initials: string
  number: string
  firstName: string
  lastName: string
  team: string
  color: string
  nationality: string
  flag: string
}

export interface BingoCard {
  id: string
  text: string
  checked: boolean
  category: 'drama' | 'safety' | 'weather' | 'achievement' | 'fun'
}

export interface RadioQuote {
  id: string
  driverId: string
  round: number
  race: string
  quote: string
  context?: string
}

export interface NotableEvent {
  id: string
  round: number
  race: string
  type: string
  description: string
  icon: string
}
