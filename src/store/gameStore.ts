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
  WeeklyChallenge,
  RaceHistoryEntry,
  TPMessage,
} from '../types';
import CALENDAR_2025 from '../data/calendar2025';
import { DRIVERS_2025, USER_DRIVER_ID } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { getCircuit } from '../data/circuits';
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

// Deterministic pool of weekly challenges seeded by race index.
const CHALLENGE_POOL: Omit<WeeklyChallenge, 'completed'>[] = [
  { id: 'quali_top10', description: 'Qualify in the top 10', target: 'quali_position', targetValue: 10, reward: '+$1.5M budget', rewardType: 'budget', rewardValue: 1.5 },
  { id: 'quali_top5',  description: 'Qualify in the top 5',  target: 'quali_position', targetValue: 5,  reward: '+$2M budget',   rewardType: 'budget', rewardValue: 2 },
  { id: 'focus_85',    description: 'Score 85+ focus on race day', target: 'focus_score', targetValue: 85, reward: '+0.02 strategy bonus', rewardType: 'strategy_bonus', rewardValue: 0.02 },
  { id: 'podium',      description: 'Finish on the podium',  target: 'race_position', targetValue: 3, reward: '+0.03 prep bonus next race', rewardType: 'prep_bonus', rewardValue: 0.03 },
  { id: 'sleep_8',     description: 'Score 8+ sleep on race day', target: 'sleep_score', targetValue: 8, reward: '+$1M budget', rewardType: 'budget', rewardValue: 1 },
  { id: 'top5',        description: 'Finish in the top 5',   target: 'race_position', targetValue: 5, reward: '+$2M budget', rewardType: 'budget', rewardValue: 2 },
  { id: 'score_10',    description: 'Score 10+ points',      target: 'points', targetValue: 10, reward: '+$1.5M budget', rewardType: 'budget', rewardValue: 1.5 },
  { id: 'win',         description: 'Win the race',          target: 'race_position', targetValue: 1, reward: '+0.04 prep bonus next race', rewardType: 'prep_bonus', rewardValue: 0.04 },
];

function buildWeeklyChallenges(raceIndex: number): WeeklyChallenge[] {
  const n = CHALLENGE_POOL.length;
  const picks = [
    CHALLENGE_POOL[raceIndex % n],
    CHALLENGE_POOL[(raceIndex * 3 + 2) % n],
    CHALLENGE_POOL[(raceIndex * 5 + 4) % n],
  ];
  // De-dupe in case the seeds collide
  const seen = new Set<string>();
  const unique: Omit<WeeklyChallenge, 'completed'>[] = [];
  for (const p of picks) {
    if (!seen.has(p.id)) { seen.add(p.id); unique.push(p); }
  }
  let i = 0;
  while (unique.length < 3) {
    const c = CHALLENGE_POOL[i++ % n];
    if (!seen.has(c.id)) { seen.add(c.id); unique.push(c); }
  }
  return unique.map((c) => ({ ...c, completed: false }));
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
    weeklyChallenges: buildWeeklyChallenges(race.raceIndex),
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

function rebuildStandings(weekends: RaceWeekend[], prevDriver?: DriverStanding[]): {
  driver: DriverStanding[];
  constructor: ConstructorStanding[];
} {
  const prevPosMap = new Map<string, number>();
  (prevDriver ?? []).forEach((d) => prevPosMap.set(d.driverId, d.position));
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
  driverArr.forEach((d, i) => {
    d.position = i + 1;
    const prev = prevPosMap.get(d.driverId);
    if (prev) d.previousPosition = prev;
  });
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
  completeQualifying: (raceIndex: number, results: QualifyingResult[], score?: import('../types/scoreTypes').DailyScore) => void;
  completeSprintQualifying: (raceIndex: number, results: QualifyingResult[]) => void;
  completeSprintRace: (raceIndex: number, results: FinishedRaceResult[]) => void;
  completeRace: (raceIndex: number, results: FinishedRaceResult[], startGrid: number, isWet: boolean, score?: import('../types/scoreTypes').DailyScore) => void;

  purchaseUpgrade: (area: keyof CarDevelopment) => boolean;
  activateSponsor: (sponsorId: string) => void;
  deactivateSponsor: (sponsorId: string) => void;
  startNewSeason: () => void;
  logLifeScore: (score: number) => void;
  unlockAchievement: (id: string) => void;
  setTransferOffer: (offer: TeamTransferOffer | null) => void;
  acceptTransferOffer: () => void;
  updateEngineer: (engineer: EngineerProfile) => void;
  dismissTpMessage: () => void;

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
  sleepHistory: [],
  raceHistory: [],
  tpMessage: null,
  recentLifeScores: [],
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
    rivalInfo: raw.rivalInfo
      ? {
          driverId: raw.rivalInfo.driverId,
          gapToRival: raw.rivalInfo.gapToRival ?? 0,
          lastReaction: raw.rivalInfo.lastReaction ?? null,
          lastReactionRace: raw.rivalInfo.lastReactionRace ?? -1,
          h2hWins: raw.rivalInfo.h2hWins ?? 0,
          h2hLosses: raw.rivalInfo.h2hLosses ?? 0,
          h2hDraws: raw.rivalInfo.h2hDraws ?? 0,
        }
      : null,
    sponsorDeals: raw.sponsorDeals ?? base.sponsorDeals,
    transferOffer: raw.transferOffer ?? null,
    sleepHistory: raw.sleepHistory ?? [],
    raceHistory: raw.raceHistory ?? [],
    tpMessage: raw.tpMessage ?? null,
    recentLifeScores: raw.recentLifeScores ?? [],
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
            weeklyChallenges: w.weeklyChallenges ?? buildWeeklyChallenges(w.raceIndex),
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
        setTransferOffer, acceptTransferOffer, updateEngineer, dismissTpMessage,
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

  completeQualifying: (raceIndex, results, score) => {
    const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
    const gridPos = userResult?.gridPosition ?? 20;
    set((state) => {
      let extraBudget = 0;
      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex !== raceIndex) return w;
        // Complete quali-position challenges
        const weeklyChallenges = w.weeklyChallenges.map((c) => {
          if (c.completed || c.target !== 'quali_position') return c;
          if (gridPos <= c.targetValue) {
            if (c.rewardType === 'budget') extraBudget += c.rewardValue;
            return { ...c, completed: true };
          }
          return c;
        });
        return {
          ...w, qualifyingResult: results, userGridPosition: gridPos, weeklyChallenges,
          sessionScores: { ...w.sessionScores, qualifying: score ?? w.sessionScores.qualifying },
        };
      });
      const sleepHistory = score ? [...state.sleepHistory, score.sleep].slice(-5) : state.sleepHistory;
      const recentLifeScores = score ? [...state.recentLifeScores, score.qualifyingPace].slice(-8) : state.recentLifeScores;
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
      } else {
        personalBests = {
          ...personalBests,
          bestGridPosition: Math.min(personalBests.bestGridPosition, gridPos),
        };
      }
      const dev = { ...state.currentSeason.carDevelopment };
      if (extraBudget > 0) {
        dev.totalBudgetEarned += extraBudget;
        dev.effectiveCarRating = calcEffectiveCarRating(dev);
      }
      return {
        currentSeason: { ...state.currentSeason, weekends, carDevelopment: dev },
        personalBests, achievements, sleepHistory, recentLifeScores,
      };
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

  completeRace: (raceIndex, results, startGrid, isWet, score) => {
    set((state) => {
      const userResult = results.find((r) => r.driverId === USER_DRIVER_ID);
      const isDnf = !!userResult?.dnfLap;
      const pos = userResult?.position ?? 20;
      const raceScore = score ?? state.currentSeason.weekends[raceIndex]?.sessionScores.race;
      const trainedThisRace = !!raceScore?.training;

      // ---- Weekly challenge completion (race-side) + reward accumulation ----
      let extraBudget = 0;
      let extraStrategyBonus = 0;
      let extraPrepBonusNext = 0;
      const completeRaceChallenges = (cs: WeeklyChallenge[]): WeeklyChallenge[] =>
        cs.map((c) => {
          if (c.completed) return c;
          let met = false;
          if (c.target === 'race_position') met = !isDnf && pos <= c.targetValue;
          else if (c.target === 'points') met = (userResult?.points ?? 0) >= c.targetValue;
          else if (c.target === 'focus_score') met = (raceScore?.focus ?? 0) >= c.targetValue;
          else if (c.target === 'sleep_score') met = (raceScore?.sleep ?? 0) >= c.targetValue;
          if (!met) return c;
          if (c.rewardType === 'budget') extraBudget += c.rewardValue;
          else if (c.rewardType === 'strategy_bonus') extraStrategyBonus += c.rewardValue;
          else if (c.rewardType === 'prep_bonus') extraPrepBonusNext += c.rewardValue;
          return { ...c, completed: true };
        });

      const nextIndex = Math.min(raceIndex + 1, CALENDAR_2025.length - 1);

      const weekends = state.currentSeason.weekends.map((w) => {
        if (w.raceIndex === raceIndex) {
          return {
            ...w,
            raceResult: results,
            completed: true,
            weeklyChallenges: completeRaceChallenges(w.weeklyChallenges),
            strategyBonus: w.strategyBonus + extraStrategyBonus,
            sessionScores: { ...w.sessionScores, race: raceScore ?? w.sessionScores.race },
          };
        }
        return w;
      });

      // Apply prep-bonus reward to the next race
      if (extraPrepBonusNext > 0 && nextIndex !== raceIndex) {
        const nw = weekends[nextIndex];
        if (nw) weekends[nextIndex] = { ...nw, prepBonus: nw.prepBonus + extraPrepBonusNext };
      }

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

      // Training streak
      if (trainedThisRace) {
        pb.trainingStreak += 1;
        if (pb.trainingStreak > pb.longestTrainingStreak) pb.longestTrainingStreak = pb.trainingStreak;
      } else {
        pb.trainingStreak = 0;
      }
      // Every 3 consecutive training races -> +0.01 tyre-mgmt (strategy) bonus next race
      if (trainedThisRace && pb.trainingStreak > 0 && pb.trainingStreak % 3 === 0 && nextIndex !== raceIndex) {
        const nw = weekends[nextIndex];
        if (nw) weekends[nextIndex] = { ...nw, strategyBonus: nw.strategyBonus + 0.01 };
      }

      // Sleep history (max 5)
      const sleepHistory = raceScore
        ? [...state.sleepHistory, raceScore.sleep].slice(-5)
        : state.sleepHistory;

      // Recent life scores (qualifying pace, max 8)
      const recentLifeScores = raceScore
        ? [...state.recentLifeScores, raceScore.qualifyingPace].slice(-8)
        : state.recentLifeScores;

      // Update achievements
      let ach = checkAndUnlockAchievements(
        state.achievements, pb, userResult,
        state.currentSeason.weekends[raceIndex]?.userGridPosition ?? null,
        state.currentSeason.driverStandings.find((d) => d.driverId === USER_DRIVER_ID)?.points ?? 0,
        isWet,
        startGrid,
        state.personalBests.hadDnfLastRace,
      );

      // Prize money with sponsor multiplier + challenge budget rewards
      const dev = { ...state.currentSeason.carDevelopment };
      const prize = (userResult?.prizeMoneyM ?? 0) * dev.prizeMultiplier;
      dev.totalBudgetEarned += prize + extraBudget;
      dev.effectiveCarRating = calcEffectiveCarRating(dev);

      const allComplete = weekends.every((w) => w.completed);
      const { driver, constructor: ctor } = rebuildStandings(weekends, state.currentSeason.driverStandings);

      // Rival tracking
      const userStanding = driver.find((d) => d.driverId === USER_DRIVER_ID);
      const userPos = userStanding?.position ?? 20;
      let rivalInfo = state.rivalInfo;
      if (!rivalInfo && userPos > 1) {
        const aheadDriver = driver[userPos - 2];
        if (aheadDriver && aheadDriver.driverId !== USER_DRIVER_ID) {
          rivalInfo = {
            driverId: aheadDriver.driverId,
            gapToRival: (userStanding?.points ?? 0) - (aheadDriver.points ?? 0),
            lastReaction: null, lastReactionRace: -1,
            h2hWins: 0, h2hLosses: 0, h2hDraws: 0,
          };
        }
      } else if (rivalInfo) {
        const rivalStanding = driver.find((d) => d.driverId === rivalInfo!.driverId);
        rivalInfo = {
          ...rivalInfo,
          gapToRival: (userStanding?.points ?? 0) - (rivalStanding?.points ?? 0),
        };
      }

      // Rival head-to-head + reaction quote
      if (rivalInfo) {
        const rivalResult = results.find((r) => r.driverId === rivalInfo!.driverId);
        const rivalDnf = !!rivalResult?.dnfLap;
        const rivalDriver = DRIVERS_2025.find((d) => d.id === rivalInfo!.driverId);
        const rivalName = rivalDriver?.name ?? 'Rival';
        const playerName = state.playerName;
        let h2hWins = rivalInfo.h2hWins;
        let h2hLosses = rivalInfo.h2hLosses;
        let h2hDraws = rivalInfo.h2hDraws;
        let reaction: string | null = rivalInfo.lastReaction;
        if (userResult && rivalResult) {
          if (isDnf && rivalDnf) {
            h2hDraws += 1;
            reaction = `${rivalName}: "Racing, eh? At least we're both suffering."`;
          } else if (rivalDnf || (!isDnf && pos < rivalResult.position)) {
            h2hWins += 1;
            if (!isDnf && pos <= 3) reaction = `${rivalName}: "Impressive pace today. We'll have an answer next race."`;
            else reaction = `${rivalName}: "Lucky today, ${playerName}. Don't get comfortable."`;
          } else {
            h2hLosses += 1;
            if (!rivalDnf && rivalResult.position + 3 < pos) reaction = `${rivalName}: "This is just the beginning of my comeback."`;
            else reaction = `${rivalName}: "Better luck next time, ${playerName}."`;
          }
        }
        rivalInfo = { ...rivalInfo, h2hWins, h2hLosses, h2hDraws, lastReaction: reaction, lastReactionRace: raceIndex };
      }

      // Team principal message
      let tpMessage: TPMessage | null = state.tpMessage;
      const circuitName = getCircuit(weekends[raceIndex]?.circuitId ?? '')?.name ?? 'the next race';
      const name = state.playerName;
      const newTp = (msg: string, type: TPMessage['type']): TPMessage => ({ message: msg, type, raceIndex });
      if (userResult?.position === 1 && pb.totalWins === 1) {
        tpMessage = newTp(`The team is over the moon, ${name}! Your first win — savour it.`, 'positive');
      } else if (isDnf) {
        tpMessage = newTp(`We need reliability from you, ${name}. A DNF hurts the whole team.`, 'warning');
      } else if (userPos >= 10) {
        tpMessage = newTp(`We need to talk about your results. P${userPos} isn't where we should be.`, 'warning');
      }
      // Mid/late-season check-ins keyed off standing (override single-event ones if hit)
      if (raceIndex === 8 || raceIndex === 16) {
        const phaseLabel = raceIndex === 8 ? 'mid-season' : 'late-season';
        if (userPos <= 3) tpMessage = newTp(`You're flying ${name}! Keep this up and the championship is ours. (${phaseLabel} review)`, 'positive');
        else if (userPos <= 8) tpMessage = newTp(`Good work, but we need more. The top 3 is within reach. (${phaseLabel} review)`, 'neutral');
        else tpMessage = newTp(`We need to discuss your targets. The board wants results by ${circuitName}. (${phaseLabel} review)`, 'warning');
      }

      // Race history entry
      const grid = state.currentSeason.weekends[raceIndex]?.userGridPosition ?? startGrid;
      const circuitForHistory = getCircuit(weekends[raceIndex]?.circuitId ?? '');
      const historyEntry: RaceHistoryEntry = {
        raceIndex,
        circuitName: circuitForHistory?.name ?? '',
        circuitFlag: circuitForHistory?.flag ?? '🏁',
        season: state.currentSeason.seasonNumber,
        position: isDnf ? null : pos,
        points: userResult?.points ?? 0,
        gridPosition: grid,
        fastestLap: !!userResult?.fastestLap,
        dnf: isDnf,
      };
      const raceHistory = [...state.raceHistory, historyEntry];

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
          const topTeams = [
            { teamId: 'red_bull', teamName: 'Oracle Red Bull Racing', carRatingBonus: 8 },
            { teamId: 'ferrari', teamName: 'Scuderia Ferrari', carRatingBonus: 7 },
            { teamId: 'mclaren', teamName: 'McLaren F1 Team', carRatingBonus: 6 },
          ];
          transferOffer = topTeams[Math.floor(Math.random() * topTeams.length)];
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
        sleepHistory,
        recentLifeScores,
        raceHistory,
        tpMessage,
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

  dismissTpMessage: () => {
    set({ tpMessage: null });
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
      setTransferOffer, acceptTransferOffer, updateEngineer, dismissTpMessage,
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
