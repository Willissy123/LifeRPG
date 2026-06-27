import { create } from 'zustand';
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
  Achievement,
  ALL_ACHIEVEMENTS,
  DEFAULT_PERSONAL_BESTS,
  PersonalBests,
  DEFAULT_ENGINEER,
  EngineerProfile,
  RivalInfo,
  SponsorDeal,
  AVAILABLE_SPONSORS,
  TeamTransferOffer,
  StrategyChoice,
} from '../types';
import CALENDAR_2025 from '../data/calendar2025';
import { DRIVERS_2025, USER_DRIVER_ID } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { calcPrepBonus } from '../engine/utils';

const STORAGE_KEY = '@f1_liferpg_v2';

function buildInitialStandings(): DriverStanding[] {
  return DRIVERS_2025.map((d) => ({
    driverId: d.id, points: 0, wins: 0, podiums: 0,
    fastestLaps: 0, position: 0, bestResult: 21,
  }));
}

function buildInitialConstructorStandings(): ConstructorStanding[] {
  return TEAMS_2025.map((t) => ({
    teamId: t.id, points: 0, wins: 0, position: 0,
  }));
}

function buildInitialWeekends(): RaceWeekend[] {
  return CALENDAR_2025.map((race) => ({
    circuitId: race.circuitId,
    raceIndex: race.raceIndex,
    hasSprint: race.hasSprint,
    sessionScores: { fp1: null, fp2: null, fp3: null, qualifying: null, race: null, sprint: null },
    practiceResults: { fp1: null, fp2: null, fp3: null },
    qualifyingResult: null,
    userGridPosition: null,
    raceResult: null,
    sprintQualifyingResult: null,
    sprintGridPosition: null,
    sprintRaceResult: null,
    strategyChoice: null,
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
    sprintPoints: {},
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
    // Count sprint points
    if (weekend.sprintRaceResult) {
      for (const r of weekend.sprintRaceResult) {
        const ds = driverMap.get(r.driverId);
        if (ds) ds.points += r.points;
        const driver = DRIVERS_2025.find((d) => d.id === r.driverId);
        if (driver) {
          const cs = ctorMap.get(driver.teamId);
          if (cs) cs.points += r.points;
        }
      }
    }
    // Count race points
    if (!weekend.raceResult) continue;
    for (const r of weekend.raceResult) {
      const ds = driverMap.get(r.driverId);
      if (!ds) continue;
      ds.points += r.points;
      if (r.position === 1) ds.wins += 1;
      if (r.position <= 3) ds.podiums += 1;
      if (r.fastestLap) ds.fastestLaps += 1;
      if (r.position < ds.bestResult) ds.bestResult = r.position;
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

function checkAndUnlockAchievements(
  achievements: Achievement[],
  personalBests: PersonalBests,
  raceResult: FinishedRaceResult | undefined,
  gridPos: number | null,
  seasonPoints: number,
  isWet: boolean,
  startGrid: number,
  hasDnfLastRace: boolean,
): Achievement[] {
  if (!raceResult) return achievements;
  const today = new Date().toISOString().split('T')[0];
  const unlock = (id: string) => {
    return achievements.map((a) =>
      a.id === id && !a.unlockedAt ? { ...a, unlockedAt: today } : a
    );
  };

  let updated = [...achievements];
  const pos = raceResult.position;
  const isDnf = !!raceResult.dnfLap;

  if (!isDnf) {
    if (pos <= 10) updated = unlock('first_points');
    if (pos <= 3) updated = unlock('first_podium');
    if (pos === 1) updated = unlock('first_win');
    if (raceResult.fastestLap) updated = unlock('fastest_lap');
    if (personalBests.currentPointsStreak >= 5) updated = unlock('points_streak_5');
    if (personalBests.currentWinStreak >= 3) updated = unlock('win_streak_3');
    if (pos === 1 && startGrid > 10) updated = unlock('underdog');
    if (hasDnfLastRace && pos <= 10) updated = unlock('comeback');
    if (isWet && startGrid - pos >= 5) updated = unlock('wet_master');
    if (personalBests.totalWins >= 5) updated = unlock('five_wins');
  }
  if (gridPos === 1) updated = unlock('first_pole');
  if (seasonPoints > 0 && updated.every((a) => a.id !== 'champion' || a.unlockedAt)) {
    // champion checked externally
  }
  return updated;
}

// ---- Store interface ----

interface GameStore extends GameState {
  initGame: (playerName: string, playerNumber: number, engineerName?: string, engineerPersonality?: EngineerProfile['personality']) => void;
  loadGame: () => Promise<void>;
  saveGame: () => Promise<void>;

  setLifeScore: (raceIndex: number, session: 'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'race' | 'sprint', score: number) => void;
  setStrategyChoice: (raceIndex: number, choice: StrategyChoice) => void;

  completePractice: (raceIndex: number, session: 'fp1' | 'fp2' | 'fp3', results: PracticeResult[]) => void;
  completeQualifying: (raceIndex: number, results: QualifyingResult[]) => void;
  completeSprintQualifying: (raceIndex: number, results: QualifyingResult[]) => void;
  completeSprintRace: (raceIndex: number, results: FinishedRaceResult[]) => void;
  completeRace: (raceIndex: number, results: FinishedRaceResult[], startGrid: number, isWet: boolean) => void;

  purchaseUpgrade: (area: keyof CarDevelopment) => boolean;
  activateSponsor: (sponsorId: string) => void;
  deactivateSponsor: (sponsorId: string) => void;
  startNewSeason: () => void;
  logLifeScore: (score: number) => void;
  unlockAchievement: (id: string) => void;
  setTransferOffer: (offer: TeamTransferOffer | null) => void;
  acceptTransferOffer: () => void;
  updateEngineer: (engineer: EngineerProfile) => void;

  getCurrentWeekend: () => RaceWeekend | null;
  getWeekend: (raceIndex: number) => RaceWeekend | null;
  exportSave: () => string;
  importSave: (json: string) => boolean;
}

const DEFAULT_STATE: GameState = {
  initialized: false,
  playerName: 'Driver',
  playerNumber: 99,
  currentSeason: buildInitialSeason(1),
  allSeasons: [],
  lifeScoreHistory: [],
  settings: { simSpeed: 60, soundEnabled: false },
  achievements: ALL_ACHIEVEMENTS.map((a) => ({ ...a })),
  personalBests: { ...DEFAULT_PERSONAL_BESTS },
  engineer: { ...DEFAULT_ENGINEER },
  rivalInfo: null,
  sponsorDeals: AVAILABLE_SPONSORS.map((s) => ({ ...s })),
  transferOffer: null,
};

// Migrate old saves gracefully
function migrateState(raw: Partial<GameState>): GameState {
  const base = { ...DEFAULT_STATE };
  const merged: GameState = {
    ...base,
    ...raw,
    achievements: raw.achievements ?? base.achievements,
    personalBests: { ...base.personalBests, ...(raw.personalBests ?? {}) },
    engineer: raw.engineer ?? base.engineer,
    rivalInfo: raw.rivalInfo ?? null,
    sponsorDeals: raw.sponsorDeals ?? base.sponsorDeals,
    transferOffer: raw.transferOffer ?? null,
    currentSeason: raw.currentSeason
      ? {
          ...raw.currentSeason,
          sprintPoints: raw.currentSeason.sprintPoints ?? {},
          weekends: (raw.currentSeason.weekends ?? []).map((w) => ({
            ...w,
            hasSprint: w.hasSprint ?? false,
            sessionScores: { ...w.sessionScores, sprint: (w.sessionScores as any).sprint ?? null },
            sprintQualifyingResult: w.sprintQualifyingResult ?? null,
            sprintGridPosition: w.sprintGridPosition ?? null,
            sprintRaceResult: w.sprintRaceResult ?? null,
            strategyChoice: w.strategyChoice ?? null,
          })),
          carDevelopment: {
            ...raw.currentSeason.carDevelopment,
            prizeMultiplier: raw.currentSeason.carDevelopment?.prizeMultiplier ?? 1.0,
          },
        }
      : base.currentSeason,
  };
  return merged;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...DEFAULT_STATE,

  initGame: (playerName, playerNumber, engineerName = 'James', engineerPersonality = 'calm') => {
    const season = buildInitialSeason(1);
    const state: GameState = {
      ...DEFAULT_STATE,
      initialized: true,
      playerName,
      playerNumber,
      currentSeason: season,
      engineer: { name: engineerName, personality: engineerPersonality },
      achievements: ALL_ACHIEVEMENTS.map((a) => ({ ...a })),
      personalBests: { ...DEFAULT_PERSONAL_BESTS },
      sponsorDeals: AVAILABLE_SPONSORS.map((s) => ({ ...s })),
    };
    set(state);
    get().saveGame();
  },

  loadGame: async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateState(parsed);
        set(migrated);
      }
    } catch (e) {
      console.warn('Failed to load game:', e);
    }
  },

  saveGame: async () => {
    try {
      const state = get();
      const {
        initGame, loadGame, saveGame, setLifeScore, setStrategyChoice,
        completePractice, completeQualifying, completeSprintQualifying,
        completeSprintRace, completeRace, purchaseUpgrade, activateSponsor,
        deactivateSponsor, startNewSeason, logLifeScore, unlockAchievement,
        setTransferOffer, acceptTransferOffer, updateEngineer,
        getCurrentWeekend, getWeekend, exportSave, importSave,
        ...data
      } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  },

  setLifeScore: (_raceIndex, _session, _score) => {
    get().saveGame();
  },

  setStrategyChoice: (raceIndex, choice) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) =>
        w.raceIndex !== raceIndex ? w : { ...w, strategyChoice: choice }
      );
      return { currentSeason: { ...state.currentSeason, weekends } };
    });
    get().saveGame();
  },

  completePractice: (raceIndex, session, results) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex !== raceIndex) return w;
        const practiceResults = { ...w.practiceResults, [session]: results };
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
    const gridPos = userResult?.gridPosition ?? 20;
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) =>
        w.raceIndex !== raceIndex ? w : {
          ...w, qualifyingResult: results, userGridPosition: gridPos,
        }
      );
      let { personalBests, achievements } = state;
      if (gridPos === 1) {
        personalBests = {
          ...personalBests,
          totalPoles: personalBests.totalPoles + 1,
          bestGridPosition: Math.min(personalBests.bestGridPosition, gridPos),
        };
        achievements = achievements.map((a) =>
          a.id === 'first_pole' && !a.unlockedAt
            ? { ...a, unlockedAt: new Date().toISOString().split('T')[0] }
            : a
        );
      }
      return { currentSeason: { ...state.currentSeason, weekends }, personalBests, achievements };
    });
    get().saveGame();
  },

  completeSprintQualifying: (raceIndex, results) => {
    const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) =>
        w.raceIndex !== raceIndex ? w : {
          ...w,
          sprintQualifyingResult: results,
          sprintGridPosition: userResult?.gridPosition ?? 20,
        }
      );
      return { currentSeason: { ...state.currentSeason, weekends } };
    });
    get().saveGame();
  },

  completeSprintRace: (raceIndex, results) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) =>
        w.raceIndex !== raceIndex ? w : { ...w, sprintRaceResult: results }
      );
      const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
      const sprintPoints = { ...state.currentSeason.sprintPoints };
      for (const r of results) {
        sprintPoints[r.driverId] = (sprintPoints[r.driverId] ?? 0) + r.points;
      }

      let { achievements } = state;
      if (userResult?.position === 1) {
        achievements = achievements.map((a) =>
          a.id === 'sprint_winner' && !a.unlockedAt
            ? { ...a, unlockedAt: new Date().toISOString().split('T')[0] }
            : a
        );
      }

      return {
        currentSeason: { ...state.currentSeason, weekends, sprintPoints },
        achievements,
      };
    });
    get().saveGame();
  },

  completeRace: (raceIndex, results, startGrid, isWet) => {
    set((state) => {
      const weekends = state.currentSeason.weekends.map((w) =>
        w.raceIndex !== raceIndex ? w : { ...w, raceResult: results, completed: true }
      );

      const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
      const isDnf = !!userResult?.dnfLap;
      const pos = userResult?.position ?? 20;

      // Update personal bests
      let pb = { ...state.personalBests };
      if (userResult) {
        if (!isDnf) {
          if (pos < pb.bestFinish) pb.bestFinish = pos;
          if (pos <= 10) {
            pb.currentPointsStreak += 1;
            if (pb.currentPointsStreak > pb.longestPointsStreak) pb.longestPointsStreak = pb.currentPointsStreak;
          } else {
            pb.currentPointsStreak = 0;
          }
          if (pos === 1) {
            pb.totalWins += 1;
            pb.currentWinStreak += 1;
            if (pb.currentWinStreak > pb.longestWinStreak) pb.longestWinStreak = pb.currentWinStreak;
          } else {
            pb.currentWinStreak = 0;
          }
          if (pos <= 3) pb.totalPodiums += 1;
          if (userResult.fastestLap) pb.totalFastestLaps += 1;
        } else {
          pb.currentPointsStreak = 0;
          pb.currentWinStreak = 0;
        }
        pb.hadDnfLastRace = isDnf;
      }

      // Update achievements
      let ach = checkAndUnlockAchievements(
        state.achievements, pb, userResult,
        state.currentSeason.weekends[raceIndex]?.userGridPosition ?? null,
        state.currentSeason.driverStandings.find((d) => d.driverId === USER_DRIVER_ID)?.points ?? 0,
        isWet,
        startGrid,
        state.personalBests.hadDnfLastRace,
      );

      // Prize money with sponsor multiplier
      const dev = { ...state.currentSeason.carDevelopment };
      const prize = (userResult?.prizeMoneyM ?? 0) * dev.prizeMultiplier;
      dev.totalBudgetEarned += prize;
      dev.effectiveCarRating = calcEffectiveCarRating(dev);

      const nextIndex = Math.min(raceIndex + 1, CALENDAR_2025.length - 1);
      const allComplete = weekends.every((w) => w.completed);
      const { driver, constructor: ctor } = rebuildStandings(weekends);

      // Rival tracking
      const userStanding = driver.find((d) => d.driverId === USER_DRIVER_ID);
      const userPos = userStanding?.position ?? 20;
      let rivalInfo = state.rivalInfo;
      if (!rivalInfo && userPos > 1) {
        // Assign rival as driver directly ahead in standings
        const aheadDriver = driver[userPos - 2];
        if (aheadDriver && aheadDriver.driverId !== USER_DRIVER_ID) {
          rivalInfo = {
            driverId: aheadDriver.driverId,
            gapToRival: (userStanding?.points ?? 0) - (aheadDriver.points ?? 0),
          };
        }
      } else if (rivalInfo) {
        const rivalStanding = driver.find((d) => d.driverId === rivalInfo!.driverId);
        rivalInfo = {
          ...rivalInfo,
          gapToRival: (userStanding?.points ?? 0) - (rivalStanding?.points ?? 0),
        };
      }

      // Check champion achievement
      if (allComplete && driver[0]?.driverId === USER_DRIVER_ID) {
        const today = new Date().toISOString().split('T')[0];
        ach = ach.map((a) => a.id === 'champion' && !a.unlockedAt ? { ...a, unlockedAt: today } : a);
      }

      // Check for team transfer offer
      let transferOffer = state.transferOffer;
      if (allComplete && !transferOffer) {
        const userPts = driver.find((d) => d.driverId === USER_DRIVER_ID)?.points ?? 0;
        const maxPts = driver[0]?.points ?? 1;
        if (userPts / maxPts > 0.4) {
          // Offer from a top team
          const topTeams = [
            { teamId: 'red_bull', teamName: 'Oracle Red Bull Racing', carRatingBonus: 8 },
            { teamId: 'ferrari', teamName: 'Scuderia Ferrari', carRatingBonus: 7 },
            { teamId: 'mclaren', teamName: 'McLaren F1 Team', carRatingBonus: 6 },
          ];
          const offer = topTeams[Math.floor(Math.random() * topTeams.length)];
          transferOffer = offer;
        }
      }

      return {
        currentSeason: {
          ...state.currentSeason,
          weekends,
          currentRaceIndex: allComplete ? state.currentSeason.currentRaceIndex : nextIndex,
          driverStandings: driver,
          constructorStandings: ctor,
          carDevelopment: dev,
        },
        personalBests: pb,
        achievements: ach,
        rivalInfo,
        transferOffer,
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
      return { currentSeason: { ...state.currentSeason, carDevelopment: d } };
    });
    get().saveGame();
    return true;
  },

  activateSponsor: (sponsorId) => {
    set((state) => {
      const deals = state.sponsorDeals.map((s) =>
        s.id === sponsorId ? { ...s, active: true } : s
      );
      // Apply prize multiplier if relevant
      const deal = deals.find((s) => s.id === sponsorId);
      let dev = { ...state.currentSeason.carDevelopment };
      if (deal?.bonusType === 'prize_multiplier') {
        dev.prizeMultiplier = 1 + deal.bonusValue;
      }
      return {
        sponsorDeals: deals,
        currentSeason: { ...state.currentSeason, carDevelopment: dev },
      };
    });
    get().saveGame();
  },

  deactivateSponsor: (sponsorId) => {
    set((state) => {
      const deals = state.sponsorDeals.map((s) =>
        s.id === sponsorId ? { ...s, active: false } : s
      );
      const anyMultiplier = deals.find((s) => s.bonusType === 'prize_multiplier' && s.active);
      let dev = { ...state.currentSeason.carDevelopment };
      if (!anyMultiplier) dev.prizeMultiplier = 1.0;
      return {
        sponsorDeals: deals,
        currentSeason: { ...state.currentSeason, carDevelopment: dev },
      };
    });
    get().saveGame();
  },

  startNewSeason: () => {
    set((state) => {
      const finishedSeason = state.currentSeason;
      const nextNumber = finishedSeason.seasonNumber + 1;
      const newSeason = buildInitialSeason(nextNumber);
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
        prizeMultiplier: prevDev.prizeMultiplier,
      };
      newSeason.carDevelopment.effectiveCarRating = calcEffectiveCarRating(newSeason.carDevelopment);
      return {
        allSeasons: [...state.allSeasons, finishedSeason],
        currentSeason: newSeason,
        transferOffer: null,
        rivalInfo: null,
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

  unlockAchievement: (id) => {
    const today = new Date().toISOString().split('T')[0];
    set((state) => ({
      achievements: state.achievements.map((a) =>
        a.id === id && !a.unlockedAt ? { ...a, unlockedAt: today } : a
      ),
    }));
    get().saveGame();
  },

  setTransferOffer: (offer) => {
    set({ transferOffer: offer });
    get().saveGame();
  },

  acceptTransferOffer: () => {
    const { transferOffer } = get();
    if (!transferOffer) return;
    set((state) => {
      const dev = { ...state.currentSeason.carDevelopment };
      dev.effectiveCarRating = Math.min(dev.effectiveCarRating + transferOffer.carRatingBonus, 95);
      return {
        currentSeason: { ...state.currentSeason, carDevelopment: dev },
        transferOffer: null,
      };
    });
    get().saveGame();
  },

  updateEngineer: (engineer) => {
    set({ engineer });
    get().saveGame();
  },

  getCurrentWeekend: () => {
    const state = get();
    return state.currentSeason.weekends[state.currentSeason.currentRaceIndex] ?? null;
  },

  getWeekend: (raceIndex) => {
    return get().currentSeason.weekends[raceIndex] ?? null;
  },

  exportSave: () => {
    const state = get();
    const {
      initGame, loadGame, saveGame, setLifeScore, setStrategyChoice,
      completePractice, completeQualifying, completeSprintQualifying,
      completeSprintRace, completeRace, purchaseUpgrade, activateSponsor,
      deactivateSponsor, startNewSeason, logLifeScore, unlockAchievement,
      setTransferOffer, acceptTransferOffer, updateEngineer,
      getCurrentWeekend, getWeekend, exportSave, importSave,
      ...data
    } = state;
    return JSON.stringify(data, null, 2);
  },

  importSave: (json) => {
    try {
      const parsed = JSON.parse(json);
      const migrated = migrateState(parsed);
      set(migrated);
      get().saveGame();
      return true;
    } catch {
      return false;
    }
  },
}));
