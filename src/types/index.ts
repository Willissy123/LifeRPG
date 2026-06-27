export type TyreCompound = 'S' | 'M' | 'H' | 'W' | 'I';
export type Weather = 'dry' | 'light_rain' | 'heavy_rain';
export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'Race' | 'Sprint';
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
  overtakingDifficulty: number;
  weatherRainChance: number;
  points: TrackPoint[];
  viewBox: string;
  sectorBoundaries: [number, number];
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

export type UpgradeArea = 'aero' | 'engine' | 'chassis' | 'reliability' | 'tyreComp';

export interface UpgradeLevel {
  area: UpgradeArea;
  level: number;
  maxLevel: number;
  costPerLevel: number;
  effect: string;
}

export interface CarDevelopment {
  aero: number;
  engine: number;
  chassis: number;
  reliability: number;
  tyreComp: number;
  totalBudgetEarned: number;
  budgetSpent: number;
  effectiveCarRating: number;
  // Sponsor prize multiplier (1.0 = no boost)
  prizeMultiplier: number;
}

export const UPGRADE_COSTS: Record<UpgradeArea, number[]> = {
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
  const base = 75;
  const aeroBonus    = dev.aero    * 0.8;
  const engineBonus  = dev.engine  * 0.7;
  const chassisBonus = dev.chassis * 0.6;
  return Math.min(base + aeroBonus + engineBonus + chassisBonus, 90);
}

export function devLapTimeMultiplier(dev: CarDevelopment): number {
  const aeroEffect    = dev.aero    * 0.0018;
  const engineEffect  = dev.engine  * 0.0015;
  const chassisEffect = dev.chassis * 0.0012;
  return 1 - (aeroEffect + engineEffect + chassisEffect);
}

export function devReliabilityFactor(dev: CarDevelopment): number {
  return 1 - dev.reliability * 0.03;
}

export function devTyreDegFactor(dev: CarDevelopment): number {
  return 1 - dev.tyreComp * 0.05;
}

export const DEFAULT_CAR_DEVELOPMENT: CarDevelopment = {
  aero: 0, engine: 0, chassis: 0, reliability: 0, tyreComp: 0,
  totalBudgetEarned: 0, budgetSpent: 0, effectiveCarRating: 75,
  prizeMultiplier: 1.0,
};

// ---- Achievement System ----

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null; // ISO date or null
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_points',     name: 'Points on the Board', description: 'Finish in the top 10 for the first time',       icon: '🏁', unlockedAt: null },
  { id: 'first_podium',     name: 'Champagne Time',      description: 'Stand on the podium for the first time',         icon: '🥂', unlockedAt: null },
  { id: 'first_win',        name: 'Race Winner',         description: 'Win your first race',                             icon: '🏆', unlockedAt: null },
  { id: 'first_pole',       name: 'Pole Position',       description: 'Start from pole position',                        icon: '⚡', unlockedAt: null },
  { id: 'fastest_lap',      name: 'Purple Sector',       description: 'Set the fastest lap of the race',                 icon: '💜', unlockedAt: null },
  { id: 'points_streak_5',  name: 'On a Roll',           description: '5 consecutive points finishes',                   icon: '🔥', unlockedAt: null },
  { id: 'win_streak_3',     name: 'Hat-Trick Hero',      description: 'Win 3 races in a row',                            icon: '🎩', unlockedAt: null },
  { id: 'wet_master',       name: 'Rain God',            description: 'Gain 5+ positions in a wet race',                 icon: '🌧', unlockedAt: null },
  { id: 'champion',         name: 'World Champion',      description: 'Win the Drivers\' Championship',                  icon: '👑', unlockedAt: null },
  { id: 'perfect_score',    name: 'Perfect Day',         description: 'Enter a session with max hydration & meditation', icon: '💯', unlockedAt: null },
  { id: 'underdog',         name: 'Against All Odds',    description: 'Win a race starting outside the top 10',          icon: '🚀', unlockedAt: null },
  { id: 'comeback',         name: 'Phoenix Rising',      description: 'Score points the race after a DNF',               icon: '🛠', unlockedAt: null },
  { id: 'sprint_winner',    name: 'Sprint King',         description: 'Win a Sprint race',                               icon: '⚡', unlockedAt: null },
  { id: 'five_wins',        name: 'Serial Winner',       description: 'Win 5 races in a single season',                  icon: '🏅', unlockedAt: null },
];

// ---- Personal Bests ----

export interface PersonalBests {
  bestFinish: number;
  bestGridPosition: number;
  currentPointsStreak: number;
  longestPointsStreak: number;
  currentWinStreak: number;
  longestWinStreak: number;
  totalWins: number;
  totalPodiums: number;
  totalPoles: number;
  totalFastestLaps: number;
  hadDnfLastRace: boolean;
  trainingStreak: number;
  longestTrainingStreak: number;
}

export const DEFAULT_PERSONAL_BESTS: PersonalBests = {
  bestFinish: 99,
  bestGridPosition: 99,
  currentPointsStreak: 0,
  longestPointsStreak: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  totalWins: 0,
  totalPodiums: 0,
  totalPoles: 0,
  totalFastestLaps: 0,
  hadDnfLastRace: false,
  trainingStreak: 0,
  longestTrainingStreak: 0,
};

// ---- Sponsor Deals ----

export interface SponsorDeal {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  bonusDescription: string;
  bonusType: 'focus_boost' | 'strategy_boost' | 'prize_multiplier' | 'reliability_boost' | 'sleep_boost';
  bonusValue: number;
  requiredPoints: number;
  active: boolean;
}

export const AVAILABLE_SPONSORS: SponsorDeal[] = [
  {
    id: 'energy_drink',
    name: 'VoltMax Energy',
    icon: '⚡',
    tagline: 'Unleash Your Potential',
    bonusDescription: '+8 focus score on race day',
    bonusType: 'focus_boost',
    bonusValue: 8,
    requiredPoints: 0,
    active: false,
  },
  {
    id: 'sports_brand',
    name: 'Apex Athletics',
    icon: '🏃',
    tagline: 'Train Like a Champion',
    bonusDescription: '+5 tyre management from training days',
    bonusType: 'strategy_boost',
    bonusValue: 5,
    requiredPoints: 20,
    active: false,
  },
  {
    id: 'tech_firm',
    name: 'DataCore Systems',
    icon: '💻',
    tagline: 'Race Smarter, Not Harder',
    bonusDescription: '+20% prize money multiplier',
    bonusType: 'prize_multiplier',
    bonusValue: 0.2,
    requiredPoints: 50,
    active: false,
  },
  {
    id: 'pharma',
    name: 'RestoreFit Health',
    icon: '💊',
    tagline: 'Recovery is Performance',
    bonusDescription: '+1 sleep quality on race weekends',
    bonusType: 'sleep_boost',
    bonusValue: 1,
    requiredPoints: 30,
    active: false,
  },
];

// ---- Engineer Profile ----

export interface EngineerProfile {
  name: string;
  personality: 'calm' | 'aggressive' | 'analytical';
}

export const DEFAULT_ENGINEER: EngineerProfile = {
  name: 'James',
  personality: 'calm',
};

// ---- Rival ----

export interface RivalInfo {
  driverId: string;
  gapToRival: number; // points gap (positive = you're ahead)
  lastReaction: string | null;
  lastReactionRace: number;
  h2hWins: number;
  h2hLosses: number;
  h2hDraws: number;
}

// ---- Weekly Challenges ----

export interface WeeklyChallenge {
  id: string;
  description: string;
  target: 'quali_position' | 'race_position' | 'focus_score' | 'sleep_score' | 'points';
  targetValue: number;
  reward: string;
  rewardType: 'budget' | 'prep_bonus' | 'strategy_bonus';
  rewardValue: number;
  completed: boolean;
}

// ---- Team Principal Message ----

export interface TPMessage {
  message: string;
  type: 'positive' | 'warning' | 'neutral';
  raceIndex: number;
}

// ---- Strategy Choice ----

export interface StrategyChoice {
  startingCompound: TyreCompound;
  pitWindow: 'early' | 'medium' | 'late';
}

// ---- Team Transfer Offer ----

export interface TeamTransferOffer {
  teamId: string;
  teamName: string;
  carRatingBonus: number; // how much better the offered team car is
}

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
  // Lap-by-lap position history for lap chart
  positionHistory: number[];
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
  type: 'overtake' | 'pit' | 'safety_car' | 'dnf' | 'weather' | 'fastest_lap' | 'finish' | 'engineer_radio';
  message: string;
}

export interface RaceWeekend {
  circuitId: string;
  raceIndex: number;
  hasSprint: boolean;
  sessionScores: {
    fp1: import('./scoreTypes').DailyScore | null;
    fp2: import('./scoreTypes').DailyScore | null;
    fp3: import('./scoreTypes').DailyScore | null;
    qualifying: import('./scoreTypes').DailyScore | null;
    race: import('./scoreTypes').DailyScore | null;
    sprint: import('./scoreTypes').DailyScore | null;
  };
  practiceResults: {
    fp1: PracticeResult[] | null;
    fp2: PracticeResult[] | null;
    fp3: PracticeResult[] | null;
  };
  qualifyingResult: QualifyingResult[] | null;
  userGridPosition: number | null;
  raceResult: FinishedRaceResult[] | null;
  // Sprint
  sprintQualifyingResult: QualifyingResult[] | null;
  sprintGridPosition: number | null;
  sprintRaceResult: FinishedRaceResult[] | null;
  // Strategy
  strategyChoice: StrategyChoice | null;
  prepBonus: number;
  strategyBonus: number;
  weeklyChallenges: WeeklyChallenge[];
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
  // Lap-by-lap positions for chart
  positionHistory: number[];
}

export interface DriverStanding {
  driverId: string;
  points: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  position: number;
  bestResult: number;
  previousPosition?: number;
}

// ---- Career Race History ----

export interface RaceHistoryEntry {
  raceIndex: number;
  circuitName: string;
  circuitFlag: string;
  season: number;
  position: number | null; // null = DNF
  points: number;
  gridPosition: number;
  fastestLap: boolean;
  dnf: boolean;
}

export interface ConstructorStanding {
  teamId: string;
  points: number;
  wins: number;
  position: number;
}

export interface Season {
  year: number;
  seasonNumber: number;
  currentRaceIndex: number;
  weekends: RaceWeekend[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  carDevelopment: CarDevelopment;
  sprintPoints: Record<string, number>; // driverId → sprint points
}

export interface GameState {
  initialized: boolean;
  playerName: string;
  playerNumber: number;
  currentSeason: Season;
  allSeasons: Season[];
  lifeScoreHistory: { date: string; score: number }[];
  settings: GameSettings;
  // New systems
  achievements: Achievement[];
  personalBests: PersonalBests;
  engineer: EngineerProfile;
  rivalInfo: RivalInfo | null;
  sponsorDeals: SponsorDeal[];
  transferOffer: TeamTransferOffer | null;
  // New expansion systems
  sleepHistory: number[]; // last 5 sleep scores
  raceHistory: RaceHistoryEntry[];
  tpMessage: TPMessage | null;
  recentLifeScores: number[]; // last 8 qualifying pace scores
}

export interface GameSettings {
  simSpeed: number;
  soundEnabled: boolean;
}

export type RootStackParamList = {
  Main: undefined;
  RaceWeekend: { raceIndex: number };
  Practice: { raceIndex: number; session: 'FP1' | 'FP2' | 'FP3' };
  Qualifying: { raceIndex: number };
  Race: { raceIndex: number };
  Sprint: { raceIndex: number };
  SeasonEnd: undefined;
  Onboarding: undefined;
  Garage: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Standings: undefined;
  Garage: undefined;
};
