import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  Season,
  RaceWeekend,
  PracticeResult,
  QualifyingResult,
  FinishedRaceResult,
  CarDevelopment,
  DEFAULT_CAR_DEVELOPMENT,
  calcEffectiveCarRating,
  DriverStanding,
  ConstructorStanding,
  PRIZE_MONEY_BY_POSITION,
  UPGRADE_COSTS,
  UpgradeArea,
} from '../types';
import CALENDAR_2025 from '../data/calendar2025';
import circuits from '../data/circuits';
import { DRIVERS_2025, USER_DRIVER_ID, USER_TEAM_ID } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { calcPrepBonus } from '../engine/utils';

const STORAGE_KEY = '@f1_liferpg_v1';

// ---- Initialisation helpers ----

function buildInitialStandings(): DriverStanding[] {
  return DRIVERS_2025.map((d) => ({
    driverId: d.id,
    points: 0,
    wins: 0,
    podiums: 0,
    fastestLaps: 0,
    position: 0,
    bestResult: 21,
  }));
}

function buildInitialConstructorStandings(): ConstructorStanding[] {
  return TEAMS_2025.map((t) => ({
    teamId: t.id,
    points: 0,
    wins: 0,
    position: 0,
  }));
}

function buildInitialWeekends(): RaceWeekend[] {
  return CALENDAR_2025.map((race) => ({
    circuitId: race.circuitId,
    raceIndex: race.raceIndex,
    sessionScores: { fp1: null, fp2: null, fp3: null, qualifying: null, race: null },
    practiceResults: { fp1: null, fp2: null, fp3: null },
    qualifyingResult: null,
    userGridPosition: null,
    raceResult: null,
    prepBonus: 0,
    strategyBonus: 0,
    completed: false,
  }));
}

function buildInitialSeason(seasonNumber: number): Season {
  return {
    year: 2024 + seasonNumber,
    seasonNumber,
    currentRaceIndex: 0,
    weekends: buildInitialWeekends(),
    driverStandings: buildInitialStandings(),
    constructorStandings: buildInitialConstructorStandings(),
    carDevelopment: { ...DEFAULT_CAR_DEVELOPMENT },
  };
}

function rebuildStandings(weekends: RaceWeekend[]): {
  driver: DriverStanding[];
  constructor: ConstructorStanding[];
} {
  const driverMap = new Map<string, DriverStanding>();
  DRIVERS_2025.forEach((d) => {
    driverMap.set(d.id, {
      driverId: d.id, points: 0, wins: 0, podiums: 0,
      fastestLaps: 0, position: 0, bestResult: 21,
    });
  });

  const ctorMap = new Map<string, ConstructorStanding>();
  TEAMS_2025.forEach((t) => {
    ctorMap.set(t.id, { teamId: t.id, points: 0, wins: 0, position: 0 });
  });

  for (const weekend of weekends) {
    if (!weekend.raceResult) continue;
    for (const r of weekend.raceResult) {
      const ds = driverMap.get(r.driverId);
      if (!ds) continue;
      ds.points += r.points;
      if (r.position === 1) { ds.wins += 1; }
      if (r.position <= 3) { ds.podiums += 1; }
      if (r.fastestLap) { ds.fastestLaps += 1; }
      if (r.position < ds.bestResult) { ds.bestResult = r.position; }

      const driver = DRIVERS_2025.find((d) => d.id === r.driverId);
      if (driver) {
        const cs = ctorMap.get(driver.teamId);
        if (cs) {
          cs.points += r.points;
          if (r.position === 1) cs.wins += 1;
        }
      }
    }
  }

  const driverArr = [...driverMap.values()].sort((a, b) => b.points - a.points);
  driverArr.forEach((d, i) => { d.position = i + 1; });

  const ctorArr = [...ctorMap.values()].sort((a, b) => b.points - a.points);
  ctorArr.forEach((c, i) => { c.position = i + 1; });

  return { driver: driverArr, constructor: ctorArr };
}

// ---- Store interface ----

interface GameStore extends GameState {
  // Init
  initGame: (playerName: string, playerNumber: number) => void;
  loadGame: () => Promise<void>;
  saveGame: () => Promise<void>;

  // Legacy shim - kept for compatibility
  setLifeScore: (raceIndex: number, session: 'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'race', score: number) => void;

  // Session completion
  completePractice: (raceIndex: number, session: 'fp1' | 'fp2' | 'fp3', results: PracticeResult[]) => void;
  completeQualifying: (raceIndex: number, results: QualifyingResult[]) => void;
  completeRace: (raceIndex: number, results: FinishedRaceResult[]) => void;

  // Car development
  purchaseUpgrade: (area: keyof CarDevelopment) => boolean;

  // Season advance
  startNewSeason: () => void;

  // Life score log
  logLifeScore: (score: number) => void;

  // Getters
  getCurrentWeekend: () => RaceWeekend | null;
  getWeekend: (raceIndex: number) => RaceWeekend | null;
}

const DEFAULT_STATE: GameState = {
  initialized: false,
  playerName: 'Driver',
  playerNumber: 99,
  currentSeason: buildInitialSeason(1),
  allSeasons: [],
  lifeScoreHistory: [],
  settings: { simSpeed: 60, soundEnabled: false },
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,

  initGame: (playerName, playerNumber) => {
    // Update user driver name + number
    const season = buildInitialSeason(1);
    const state: GameState = {
      ...DEFAULT_STATE,
      initialized: true,
      playerName,
      playerNumber,
      currentSeason: season,
    };
    set(state);
    get().saveGame();
  },

  loadGame: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: GameState = JSON.parse(raw);
        set(saved);
      }
    } catch (e) {
      console.warn('Failed to load game:', e);
    }
  },

  saveGame: async () => {
    try {
      const state = get();
      const { initGame, loadGame, saveGame, setLifeScore, completePractice,
              completeQualifying, completeRace, purchaseUpgrade, startNewSeason,
              logLifeScore, getCurrentWeekend, getWeekend, ...data } = state;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  },

  setLifeScore: (raceIndex, session, score) => {
    // No-op: sessions now tracked via sessionScores in completePractice/completeQualifying/completeRace
    get().saveGame();
  },

  completePractice: (raceIndex, session, results) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex !== raceIndex) return w;
        const practiceResults = { ...w.practiceResults, [session]: results };
        // Recalculate prep bonus from all completed FP sessions
        const fp1Score = w.sessionScores.fp1?.racePace ?? null;
        const fp2Score = w.sessionScores.fp2?.racePace ?? null;
        const fp3Score = w.sessionScores.fp3?.racePace ?? null;
        const prepBonus = calcPrepBonus(fp1Score, fp2Score, fp3Score);
        return { ...w, practiceResults, prepBonus };
      });
      return { currentSeason: { ...state.currentSeason, weekends } };
    });
    get().saveGame();
  },

  completeQualifying: (raceIndex, results) => {
    const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex !== raceIndex) return w;
        return {
          ...w,
          qualifyingResult: results,
          userGridPosition: userResult?.gridPosition ?? 20,
        };
      });
      return { currentSeason: { ...state.currentSeason, weekends } };
    });
    get().saveGame();
  },

  completeRace: (raceIndex, results) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex !== raceIndex) return w;
        return { ...w, raceResult: results, completed: true };
      });

      // Update car development budget from prize money
      const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
      const prizeMoneyM = userResult?.prizeMoneyM ?? 0;
      const dev = { ...state.currentSeason.carDevelopment };
      dev.totalBudgetEarned += prizeMoneyM;
      dev.effectiveCarRating = calcEffectiveCarRating(dev);

      // Advance current race index
      const nextIndex = Math.min(raceIndex + 1, CALENDAR_2025.length - 1);
      const allComplete = weekends.every((w) => w.completed);

      const { driver, constructor: ctor } = rebuildStandings(weekends);

      return {
        currentSeason: {
          ...state.currentSeason,
          weekends,
          currentRaceIndex: allComplete ? state.currentSeason.currentRaceIndex : nextIndex,
          driverStandings: driver,
          constructorStandings: ctor,
          carDevelopment: dev,
        },
      };
    });
    get().saveGame();
  },

  purchaseUpgrade: (area) => {
    const state = get();
    const dev = state.currentSeason.carDevelopment;

    const areaKey = area as UpgradeArea;
    if (!(areaKey in UPGRADE_COSTS)) return false;

    const currentLevel = dev[area as keyof CarDevelopment] as number;
    if (currentLevel >= 10) return false;

    const cost = UPGRADE_COSTS[areaKey][currentLevel];
    const available = dev.totalBudgetEarned - dev.budgetSpent;
    if (available < cost) return false;

    set((state) => {
      const d = { ...state.currentSeason.carDevelopment };
      (d[area] as number) += 1;
      d.budgetSpent += cost;
      d.effectiveCarRating = calcEffectiveCarRating(d);
      return {
        currentSeason: { ...state.currentSeason, carDevelopment: d },
      };
    });
    get().saveGame();
    return true;
  },

  startNewSeason: () => {
    set((state) => {
      const finishedSeason = state.currentSeason;
      const nextNumber = finishedSeason.seasonNumber + 1;
      const newSeason = buildInitialSeason(nextNumber);

      // Carry over car dev level (partial reset - you keep half the upgrades)
      const prevDev = finishedSeason.carDevelopment;
      newSeason.carDevelopment = {
        aero:        Math.floor(prevDev.aero        / 2),
        engine:      Math.floor(prevDev.engine      / 2),
        chassis:     Math.floor(prevDev.chassis     / 2),
        reliability: Math.floor(prevDev.reliability / 2),
        tyreComp:    Math.floor(prevDev.tyreComp    / 2),
        totalBudgetEarned: prevDev.totalBudgetEarned,
        budgetSpent:  prevDev.budgetSpent,
        effectiveCarRating: 0,
      };
      newSeason.carDevelopment.effectiveCarRating = calcEffectiveCarRating(newSeason.carDevelopment);

      return {
        allSeasons: [...state.allSeasons, finishedSeason],
        currentSeason: newSeason,
      };
    });
    get().saveGame();
  },

  logLifeScore: (score) => {
    const today = new Date().toISOString().split('T')[0];
    set((state) => ({
      lifeScoreHistory: [
        ...state.lifeScoreHistory.filter((h) => h.date !== today),
        { date: today, score },
      ],
    }));
    get().saveGame();
  },

  getCurrentWeekend: () => {
    const state = get();
    return state.currentSeason.weekends[state.currentSeason.currentRaceIndex] ?? null;
  },

  getWeekend: (raceIndex) => {
    return get().currentSeason.weekends[raceIndex] ?? null;
  },
}));
