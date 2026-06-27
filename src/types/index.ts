export type TyreCompound = 'S' | 'M' | 'H' | 'W' | 'I';
export type Weather = 'dry' | 'light_rain' | 'heavy_rain';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'Race';
export type CarStatus = 'racing' | 'pitting' | 'retired' | 'finished' | 'dnq';
export type RaceStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TrackPoint {
  x: number;
  y: number;
}

export interface Circuit {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  laps: number;
  lengthKm: number;
  poleTime: number;
  drsZones: number;
  overtakingDifficulty: number; // 1=easy to 10=Monaco
  weatherRainChance: number;
  points: TrackPoint[];
  viewBox: string;
  sectorBoundaries: [number, number]; // [S1_end_pct, S2_end_pct]
}

export interface Driver {
  id: string;
  name: string;
  shortName: string;
  number: number;
  teamId: string;
  nationality: string;
  skill: number;
  qualifyingSkill: number;
  racecraftSkill: number;
  tyreManagement: number;
  wetSkill: number;
  color: string;
  isUser: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  carRating: number;
  engineRating: number;
  aerodynamics: number;
  reliability: number;
  color: string;
  secondaryColor: string;
}

// ---- Car Development System ----
// Each upgrade area has a level (0-10) and each level costs progressively more.
// Levels feed directly into simulation math.

export type UpgradeArea = 'aero' | 'engine' | 'chassis' | 'reliability' | 'tyreComp';

export interface UpgradeLevel {
  area: UpgradeArea;
  level: number; // 0-10
  maxLevel: number; // 10
  costPerLevel: number; // prize money cost to reach next level
  effect: string; // human-readable description
}

export interface CarDevelopment {
  // Current upgrade levels
  aero: number;        // 0-10: each level → -0.18% laptime
  engine: number;      // 0-10: each level → -0.15% laptime (top speed)
  chassis: number;     // 0-10: each level → -0.12% laptime (mechanical grip)
  reliability: number; // 0-10: each level → -3% DNF probability
  tyreComp: number;    // 0-10: each level → -5% tyre degradation rate

  // Budget
  totalBudgetEarned: number;   // cumulative prize money from race results (fictional $M)
  budgetSpent: number;

  // Derived effective car rating (base + dev points)
  // Base midfield = 75. Max possible via dev alone = ~85
  effectiveCarRating: number;
}

export const UPGRADE_COSTS: Record<UpgradeArea, number[]> = {
  // Cost in $M to go from level N-1 → N
  aero:        [3, 5, 7, 10, 13, 17, 22, 28, 35, 45],
  engine:      [4, 6, 9, 12, 16, 21, 27, 34, 42, 52],
  chassis:     [3, 5, 7, 10, 14, 18, 23, 30, 38, 48],
  reliability: [2, 3, 5, 7,  10, 13, 17, 22, 28, 36],
  tyreComp:    [2, 3, 5, 7,  10, 13, 17, 22, 28, 36],
};

export const PRIZE_MONEY_BY_POSITION: Record<number, number> = {
  1: 8, 2: 6, 3: 5, 4: 4, 5: 3.5,
  6: 3, 7: 2.5, 8: 2, 9: 1.5, 10: 1,
};

export function calcEffectiveCarRating(dev: CarDevelopment): number {
  const base = 75; // Apex Racing base
  const aeroBonus     = dev.aero       * 0.8;
  const engineBonus   = dev.engine     * 0.7;
  const chassisBonus  = dev.chassis    * 0.6;
  return Math.min(base + aeroBonus + engineBonus + chassisBonus, 90);
}

// How much faster/slower the car is vs baseline given development levels
// Returns a lap time multiplier (<1 = faster)
export function devLapTimeMultiplier(dev: CarDevelopment): number {
  const aeroEffect    = dev.aero       * 0.0018;
  const engineEffect  = dev.engine     * 0.0015;
  const chassisEffect = dev.chassis    * 0.0012;
  return 1 - (aeroEffect + engineEffect + chassisEffect);
}

// DNF probability modifier (0 = no change, negative = less likely to DNF)
export function devReliabilityFactor(dev: CarDevelopment): number {
  return 1 - dev.reliability * 0.03;
}

// Tyre degradation multiplier (1 = no change, <1 = slower deg)
export function devTyreDegFactor(dev: CarDevelopment): number {
  return 1 - dev.tyreComp * 0.05;
}

export const DEFAULT_CAR_DEVELOPMENT: CarDevelopment = {
  aero: 0,
  engine: 0,
  chassis: 0,
  reliability: 0,
  tyreComp: 0,
  totalBudgetEarned: 0,
  budgetSpent: 0,
  effectiveCarRating: 75,
};

// ---- Simulation types ----

export interface PracticeResult {
  driverId: string;
  position: number;
  lapTime: number;
  gap: number;
  lapsCompleted: number;
}

export interface QualifyingResult {
  driverId: string;
  gridPosition: number;
  q1Time: number | null;
  q2Time: number | null;
  q3Time: number | null;
  eliminated: 'Q1' | 'Q2' | null;
}

export interface PitStop {
  lap: number;
  duration: number;
  fromCompound: TyreCompound;
  toCompound: TyreCompound;
}

export interface RaceCarState {
  driverId: string;
  position: number;
  totalDistanceM: number;
  currentLap: number;
  lapProgress: number;
  tyreCompound: TyreCompound;
  tyreAgeLaps: number;
  tyreHealth: number;
  fuelKg: number;
  status: CarStatus;
  gapToLeader: number;
  gapToCarAhead: number;
  lastLapTime: number;
  bestLapTime: number;
  pitStops: PitStop[];
  pitLap: number | null;
  inPitLane: boolean;
  pitTimer: number;
  dnfLap: number | null;
  points: number;
  fastestLap: boolean;
  trackPosition: TrackPoint;
}

export interface RaceConditions {
  weather: Weather;
  trackTemp: number;
  airTemp: number;
  lapOfWeatherChange: number | null;
  safetyCarActive: boolean;
  safetyCarLap: number | null;
  virtualSafetyCar: boolean;
}

export interface RaceState {
  circuitId: string;
  totalLaps: number;
  currentSimLap: number;
  raceTick: number;
  cars: RaceCarState[];
  conditions: RaceConditions;
  status: RaceStatus;
  elapsedRaceSeconds: number;
  leader: string;
  fastestLapHolder: string | null;
  fastestLapTime: number | null;
  events: RaceEvent[];
}

export interface RaceEvent {
  lap: number;
  type: 'overtake' | 'pit' | 'safety_car' | 'dnf' | 'weather' | 'fastest_lap' | 'finish';
  message: string;
}

export interface RaceWeekend {
  circuitId: string;
  raceIndex: number;
  // Each session has its own DailyScore (entered the day of that session)
  sessionScores: {
    fp1: import('./scoreTypes').DailyScore | null;
    fp2: import('./scoreTypes').DailyScore | null;
    fp3: import('./scoreTypes').DailyScore | null;
    qualifying: import('./scoreTypes').DailyScore | null;
    race: import('./scoreTypes').DailyScore | null;
  };
  practiceResults: {
    fp1: PracticeResult[] | null;
    fp2: PracticeResult[] | null;
    fp3: PracticeResult[] | null;
  };
  qualifyingResult: QualifyingResult[] | null;
  userGridPosition: number | null;
  raceResult: FinishedRaceResult[] | null;
  // Practice prep bonus: accumulated from FP sessions, reduces qualifying uncertainty
  prepBonus: number; // 0-0.05
  // Strategy bonus: from Todoist score in qualifying session
  strategyBonus: number; // 0-0.03 affects pit timing in race
  completed: boolean;
}

export interface FinishedRaceResult {
  driverId: string;
  position: number;
  lapsCompleted: number;
  totalTime: number;
  gap: string;
  points: number;
  fastestLap: boolean;
  pitStops: PitStop[];
  bestLapTime: number;
  dnfLap: number | null;
  prizeMoneyM: number;
}

export interface DriverStanding {
  driverId: string;
  points: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  position: number;
  bestResult: number;
}

export interface ConstructorStanding {
  teamId: string;
  points: number;
  wins: number;
  position: number;
}

export interface Season {
  year: number;
  seasonNumber: number; // 1 = first season, 2 = second, etc.
  currentRaceIndex: number; // next race to be run (0-23)
  weekends: RaceWeekend[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  carDevelopment: CarDevelopment; // user's car dev for this season
}

export interface GameState {
  initialized: boolean;
  playerName: string;
  playerNumber: number;
  currentSeason: Season;
  allSeasons: Season[];
  lifeScoreHistory: { date: string; score: number }[];
  settings: GameSettings;
}

export interface GameSettings {
  simSpeed: number; // 30 | 60 | 120 | 300
  soundEnabled: boolean;
}

export type RootStackParamList = {
  Main: undefined;
  RaceWeekend: { raceIndex: number };
  Practice: { raceIndex: number; session: 'FP1' | 'FP2' | 'FP3' };
  Qualifying: { raceIndex: number };
  Race: { raceIndex: number };
  Onboarding: undefined;
  Garage: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Standings: undefined;
  Garage: undefined;
};
