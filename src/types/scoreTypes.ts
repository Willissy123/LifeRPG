// Each day's score is composed of 4 weighted inputs that drive different car attributes.

export interface DailyScore {
  todoist: number;   // Todoist task completion % (0-100)
  sleep: number;     // Sleep quality score (0-10, we scale to 0-100)
  training: boolean; // Did you train today?
  focus: number;     // Manual focus score (0-100)
  date: string;      // ISO date string YYYY-MM-DD

  // Derived composite scores (computed at entry time)
  qualifyingPace: number;  // 0-100: how fast you are in qualifying
  racePace: number;        // 0-100: raw race pace
  tyreMgmt: number;        // 0-100: tyre conservation ability
  wetWeather: number;      // 0-100: wet weather / focus / racecraft
  strategy: number;        // 0-100: pit timing accuracy, decision making
}

export function computeDerivedScores(
  todoist: number,
  sleep: number, // raw 0-10 score, converted to 0-100
  training: boolean,
  focus: number,
): Pick<DailyScore, 'qualifyingPace' | 'racePace' | 'tyreMgmt' | 'wetWeather' | 'strategy'> {
  const sleepPct = Math.min(sleep * 10, 100); // 0-10 → 0-100
  const trainingPct = training ? 100 : 30;     // boolean → 30 baseline if not training

  // Qualifying pace: sleep is king (rested = fast reactions), focus helps, prep (todoist) matters
  const qualifyingPace = sleepPct * 0.50 + focus * 0.30 + todoist * 0.20;

  // Race pace: balanced across all inputs
  const racePace = sleepPct * 0.35 + focus * 0.25 + todoist * 0.25 + trainingPct * 0.15;

  // Tyre management: training = physical endurance, sleep = fatigue resistance
  const tyreMgmt = trainingPct * 0.50 + sleepPct * 0.30 + focus * 0.20;

  // Wet weather: focus = mental sharpness under pressure, sleep + training for stamina
  const wetWeather = focus * 0.50 + sleepPct * 0.30 + trainingPct * 0.20;

  // Strategy: todoist = task/habit completion maps to pit execution quality, focus helps
  const strategy = todoist * 0.55 + focus * 0.30 + sleepPct * 0.15;

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
  date?: string,
): DailyScore {
  return {
    todoist,
    sleep,
    training,
    focus,
    date: date ?? new Date().toISOString().split('T')[0],
    ...computeDerivedScores(todoist, sleep, training, focus),
  };
}

// Legacy single score for summary displays (e.g. standings, history chart)
export function overallScore(score: DailyScore): number {
  return Math.round(
    score.qualifyingPace * 0.25 +
    score.racePace       * 0.35 +
    score.tyreMgmt       * 0.20 +
    score.wetWeather     * 0.10 +
    score.strategy       * 0.10,
  );
}

export type SessionScoreKey = 'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'race';
