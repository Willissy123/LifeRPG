// Each day's score is composed of weighted inputs that drive different car attributes.

export interface DailyScore {
  todoist: number;    // Todoist task completion % (0-100)
  sleep: number;      // Sleep quality score (0-10)
  training: boolean;  // Did you train today?
  focus: number;      // Manual focus score (0-100)
  hydration: number;  // Daily water intake (0-10) → late-race stamina
  meditation: number; // Mindfulness / mental clarity (0-10) → composure + wet weather
  date: string;       // ISO date string YYYY-MM-DD

  // Derived composite scores (computed at entry time)
  qualifyingPace: number;  // 0-100
  racePace: number;        // 0-100
  tyreMgmt: number;        // 0-100
  wetWeather: number;      // 0-100
  strategy: number;        // 0-100
}

export function computeDerivedScores(
  todoist: number,
  sleep: number,
  training: boolean,
  focus: number,
  hydration = 5,
  meditation = 5,
  fatigued = false,
): Pick<DailyScore, 'qualifyingPace' | 'racePace' | 'tyreMgmt' | 'wetWeather' | 'strategy'> {
  const sleepPct      = Math.min(sleep * 10, 100);
  const trainingPct   = training ? 100 : 30;
  const hydrationPct  = Math.min(hydration * 10, 100);
  const meditationPct = Math.min(meditation * 10, 100);

  // Sleep-debt fatigue penalties
  const qualiFatigueMult = fatigued ? 0.94 : 1;
  const raceFatigueMult = fatigued ? 0.96 : 1;

  // Meditation boosts qualifying composure and wet-weather focus
  const qualifyingPace = (sleepPct * 0.44 + focus * 0.27 + todoist * 0.17 + meditationPct * 0.12) * qualiFatigueMult;
  // Hydration sustains late-race pace (mapped into racePace baseline)
  const racePace = (sleepPct * 0.29 + focus * 0.22 + todoist * 0.21 + trainingPct * 0.14 + hydrationPct * 0.14) * raceFatigueMult;
  // Hydration boosts physical tyre endurance
  const tyreMgmt = trainingPct * 0.43 + sleepPct * 0.27 + focus * 0.17 + hydrationPct * 0.13;
  // Meditation improves wet-weather mental sharpness
  const wetWeather = focus * 0.38 + sleepPct * 0.22 + trainingPct * 0.17 + meditationPct * 0.23;
  const strategy = todoist * 0.50 + focus * 0.27 + sleepPct * 0.13 + meditationPct * 0.10;

  return {
    qualifyingPace: Math.min(Math.round(qualifyingPace), 100),
    racePace:       Math.min(Math.round(racePace),       100),
    tyreMgmt:       Math.min(Math.round(tyreMgmt),       100),
    wetWeather:     Math.min(Math.round(wetWeather),     100),
    strategy:       Math.min(Math.round(strategy),       100),
  };
}

export function buildDailyScore(
  todoist: number,
  sleep: number,
  training: boolean,
  focus: number,
  hydration = 5,
  meditation = 5,
  date?: string,
  fatigued = false,
): DailyScore {
  return {
    todoist, sleep, training, focus, hydration, meditation,
    date: date ?? new Date().toISOString().split('T')[0],
    ...computeDerivedScores(todoist, sleep, training, focus, hydration, meditation, fatigued),
  };
}

// Legacy single score for summary displays
export function overallScore(score: DailyScore): number {
  return Math.round(
    score.qualifyingPace * 0.25 +
    score.racePace       * 0.35 +
    score.tyreMgmt       * 0.20 +
    score.wetWeather     * 0.10 +
    score.strategy       * 0.10,
  );
}

export type SessionScoreKey = 'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'race' | 'sprint';
