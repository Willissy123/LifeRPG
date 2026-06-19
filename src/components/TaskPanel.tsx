import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { TaskCategory } from '../types';

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Exercise: '#ef4444',
  Sleep: '#3b82f6',
  Nutrition: '#22c55e',
  'Study/Work': '#a855f7',
  Mindfulness: '#f97316',
  Social: '#ec4899',
};

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  Exercise: '💪',
  Sleep: '😴',
  Nutrition: '🥗',
  'Study/Work': '📚',
  Mindfulness: '🧘',
  Social: '🤝',
};

const DIFFICULTY_COLORS = {
  Easy: '#22c55e',
  Medium: '#f97316',
  Hard: '#ef4444',
  Epic: '#a855f7',
};

const DIFFICULTY_REWARDS = {
  Easy: { gold: 15, xp: 20 },
  Medium: { gold: 30, xp: 45 },
  Hard: { gold: 60, xp: 90 },
  Epic: { gold: 120, xp: 200 },
};

const ALL_CATEGORIES: TaskCategory[] = [
  'Exercise', 'Sleep', 'Nutrition', 'Study/Work', 'Mindfulness', 'Social',
];

export default function TaskPanel() {
  const {
    taskTemplates,
    completedTasksToday,
    completeTask,
    autoFillSampleTasks,
    character,
  } = useGameStore();

  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'All'>('All');

  const filteredTemplates = taskTemplates.filter((t) =>
    filterCategory === 'All' ? true : t.category === filterCategory
  );

  const isCompleted = (id: string) => completedTasksToday.some((c) => c.templateId === id);

  const totalGoldToday = completedTasksToday.reduce((s, t) => s + t.goldEarned, 0);
  const totalXpToday = completedTasksToday.reduce((s, t) => s + t.xpEarned, 0);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Daily Tasks
          </h1>
          <p className="text-sm" style={{ color: '#8a7050' }}>
            Complete real-life tasks to earn gold, XP, and character stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div style={{ color: '#c9a84c' }}>Today: +{totalGoldToday}g / +{totalXpToday}xp</div>
            <div style={{ color: '#8a7050' }}>{completedTasksToday.length} tasks done</div>
          </div>
          <button
            onClick={autoFillSampleTasks}
            className="px-3 py-2 rounded text-sm font-medium"
            style={{ background: '#4a2c1a', color: '#c9a84c', border: '1px solid #c9a84c55' }}
          >
            ⚡ Auto-fill Sample Tasks
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('All')}
          className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            background: filterCategory === 'All' ? '#c9a84c' : '#2c1810',
            color: filterCategory === 'All' ? '#1a0f0a' : '#8a7050',
            border: '1px solid #c9a84c44',
          }}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: filterCategory === cat ? CATEGORY_COLORS[cat] + '33' : '#2c1810',
              color: filterCategory === cat ? CATEGORY_COLORS[cat] : '#8a7050',
              border: `1px solid ${CATEGORY_COLORS[cat]}44`,
            }}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {filteredTemplates.map((template) => {
          const done = isCompleted(template.id);
          const rewards = DIFFICULTY_REWARDS[template.difficulty];
          return (
            <div
              key={template.id}
              className="rounded-lg p-3 flex items-center justify-between"
              style={{
                background: done ? '#1a3020' : '#2c1810',
                border: `1px solid ${done ? '#22c55e44' : '#c9a84c22'}`,
                opacity: done ? 0.75 : 1,
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{CATEGORY_ICONS[template.category]}</span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: done ? '#6b9070' : '#f5e6c8' }}
                  >
                    {template.name}
                  </span>
                  {done && <span className="text-xs" style={{ color: '#22c55e' }}>✓ Done</span>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      background: CATEGORY_COLORS[template.category] + '22',
                      color: CATEGORY_COLORS[template.category],
                    }}
                  >
                    {template.category}
                  </span>
                  <span style={{ color: DIFFICULTY_COLORS[template.difficulty] }}>
                    {template.difficulty}
                  </span>
                  <span style={{ color: '#c9a84c' }}>+{rewards.gold}g</span>
                  <span style={{ color: '#a855f7' }}>+{rewards.xp}xp</span>
                </div>
              </div>
              {!done && (
                <button
                  onClick={() => completeTask(template.id)}
                  className="ml-3 px-3 py-1.5 rounded text-sm font-bold transition-all"
                  style={{
                    background: '#c9a84c',
                    color: '#1a0f0a',
                  }}
                >
                  Complete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Today's completed log */}
      {completedTasksToday.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Today's Achievements
          </h2>
          <div className="space-y-2">
            {completedTasksToday.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[task.category]}</span>
                  <span style={{ color: '#f5e6c8' }}>{task.name}</span>
                  <span
                    className="px-1 py-0.5 rounded"
                    style={{
                      background: DIFFICULTY_COLORS[task.difficulty] + '22',
                      color: DIFFICULTY_COLORS[task.difficulty],
                    }}
                  >
                    {task.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: '#c9a84c' }}>+{task.goldEarned}g</span>
                  <span style={{ color: '#a855f7' }}>+{task.xpEarned}xp</span>
                  {Object.entries(task.statGained).map(([k, v]) =>
                    v ? (
                      <span key={k} style={{ color: '#22c55e' }}>
                        +{v} {k.slice(0, 3)}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-3 pt-3 text-sm font-bold flex justify-between"
            style={{ borderTop: '1px solid #3a2010' }}
          >
            <span style={{ color: '#8a7050' }}>Total earned today</span>
            <div className="flex gap-4">
              <span style={{ color: '#c9a84c' }}>+{totalGoldToday}g</span>
              <span style={{ color: '#a855f7' }}>+{totalXpToday}xp</span>
            </div>
          </div>
        </div>
      )}

      {/* Character gold context */}
      <div className="mt-3 text-center text-sm" style={{ color: '#8a7050' }}>
        Current treasury: <span style={{ color: '#c9a84c', fontWeight: 'bold' }}>{character.gold}g</span>
      </div>
    </div>
  );
}
