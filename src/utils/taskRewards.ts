import type { TaskCategory, TaskDifficulty, CharacterStats, CompletedTask, TaskTemplate } from '../types';

// Gold and XP rewards by difficulty
const DIFFICULTY_REWARDS: Record<TaskDifficulty, { gold: number; xp: number }> = {
  Easy: { gold: 15, xp: 20 },
  Medium: { gold: 30, xp: 45 },
  Hard: { gold: 60, xp: 90 },
  Epic: { gold: 120, xp: 200 },
};

// Stat bonuses by category
const CATEGORY_STATS: Record<TaskCategory, Partial<CharacterStats>> = {
  Exercise: { strength: 1, endurance: 1 },
  Sleep: { strength: 0, endurance: 1, intelligence: 0, willpower: 0, charisma: 0, leadership: 0 },
  Nutrition: { endurance: 1 },
  'Study/Work': { intelligence: 1 },
  Mindfulness: { willpower: 1 },
  Social: { charisma: 1 },
};

// Small all-stat bonus for Sleep specifically
const SLEEP_SMALL_ALL: Partial<CharacterStats> = {
  strength: 1,
  endurance: 1,
  intelligence: 1,
  willpower: 1,
  charisma: 1,
  leadership: 1,
};

export function computeTaskRewards(
  template: TaskTemplate
): Pick<CompletedTask, 'goldEarned' | 'xpEarned' | 'statGained'> {
  const base = DIFFICULTY_REWARDS[template.difficulty];
  let statGained: Partial<CharacterStats> =
    template.category === 'Sleep'
      ? { ...SLEEP_SMALL_ALL }
      : { ...CATEGORY_STATS[template.category] };

  // Scale stat bonus by difficulty
  const multiplier =
    template.difficulty === 'Easy'
      ? 1
      : template.difficulty === 'Medium'
      ? 2
      : template.difficulty === 'Hard'
      ? 3
      : 5;

  const scaledStats: Partial<CharacterStats> = {};
  for (const key of Object.keys(statGained) as (keyof CharacterStats)[]) {
    const val = statGained[key];
    if (val !== undefined) {
      scaledStats[key] = val * multiplier;
    }
  }

  return {
    goldEarned: base.gold,
    xpEarned: base.xp,
    statGained: scaledStats,
  };
}

export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
