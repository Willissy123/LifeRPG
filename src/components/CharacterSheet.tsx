import { useGameStore, armySizeCap } from '../store/useGameStore';

const STAT_DESCRIPTIONS: Record<string, string> = {
  strength: 'Adds attack bonus to all infantry units',
  endurance: 'Increases max HP of all units, improves army stamina',
  intelligence: 'Improves siege effectiveness and battle tactics',
  willpower: 'Boosts unit morale and task discipline multiplier',
  charisma: 'Reduces recruitment costs and improves diplomacy',
  leadership: 'Increases army size cap (+1 slot per 5 points)',
};

const STAT_ICONS: Record<string, string> = {
  strength: '💪',
  endurance: '🏃',
  intelligence: '📚',
  willpower: '🧘',
  charisma: '💬',
  leadership: '👑',
};

const STAT_COLORS: Record<string, string> = {
  strength: '#ef4444',
  endurance: '#22c55e',
  intelligence: '#3b82f6',
  willpower: '#a855f7',
  charisma: '#f97316',
  leadership: '#c9a84c',
};

const STAT_GAINS_FROM: Record<string, string> = {
  strength: 'Exercise tasks',
  endurance: 'Exercise & Nutrition tasks',
  intelligence: 'Study/Work tasks',
  willpower: 'Mindfulness tasks',
  charisma: 'Social tasks',
  leadership: 'Hard/Epic tasks across all categories',
};

export default function CharacterSheet() {
  const { character, playerArmy, completedTasksToday } = useGameStore();
  const armyCap = armySizeCap(character.stats.leadership);
  const xpPct = Math.round((character.xp / character.xpToNext) * 100);
  const costReduction = Math.floor(character.stats.charisma / 10) * 5;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="rounded-lg p-6 mb-4 text-center"
        style={{ background: 'linear-gradient(to bottom, #2c1810, #1a0f0a)', border: '2px solid #c9a84c44' }}>
        <div className="text-5xl mb-2">⚔️</div>
        <h1 className="text-3xl font-bold glow-gold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
          {character.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8a7050' }}>Roman Imperator · Level {character.level}</p>

        {/* XP Bar */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#8a7050' }}>
            <span>Experience</span>
            <span>{character.xp.toLocaleString()} / {character.xpToNext.toLocaleString()} XP</span>
          </div>
          <div className="w-full rounded-full h-4" style={{ background: '#1a0f0a', border: '1px solid #3a2010' }}>
            <div
              className="h-4 rounded-full transition-all duration-700 flex items-center justify-center text-xs font-bold"
              style={{
                width: `${xpPct}%`,
                background: 'linear-gradient(to right, #c9a84c, #f0d080)',
                color: '#1a0f0a',
                minWidth: '2rem',
              }}
            >
              {xpPct}%
            </div>
          </div>
        </div>

        {/* Key stats summary */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div>
            <div style={{ color: '#c9a84c', fontWeight: 'bold' }}>{character.gold}g</div>
            <div style={{ color: '#8a7050' }}>Treasury</div>
          </div>
          <div>
            <div style={{ color: '#c9a84c', fontWeight: 'bold' }}>{playerArmy.length}/{armyCap}</div>
            <div style={{ color: '#8a7050' }}>Army</div>
          </div>
          <div>
            <div style={{ color: '#c9a84c', fontWeight: 'bold' }}>{completedTasksToday.length}</div>
            <div style={{ color: '#8a7050' }}>Tasks Today</div>
          </div>
          {costReduction > 0 && (
            <div>
              <div style={{ color: '#22c55e', fontWeight: 'bold' }}>-{costReduction}%</div>
              <div style={{ color: '#8a7050' }}>Recruit Cost</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-lg p-4 mb-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
          Attributes
        </h2>
        <div className="space-y-4">
          {Object.entries(character.stats).map(([key, val]) => (
            <div key={key}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-bold text-sm" style={{ color: STAT_COLORS[key] }}>
                    {STAT_ICONS[key]} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: '#6b5030' }}>
                    {STAT_DESCRIPTIONS[key]}
                  </p>
                  <p className="text-xs" style={{ color: '#4a3020' }}>
                    Gained from: {STAT_GAINS_FROM[key]}
                  </p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <span className="text-2xl font-bold" style={{ color: STAT_COLORS[key] }}>{val}</span>
                  <div className="text-xs" style={{ color: '#6b5030' }}>/ 100</div>
                </div>
              </div>
              <div className="w-full rounded-full h-2.5" style={{ background: '#1a0f0a' }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-700"
                  style={{
                    width: `${val}%`,
                    background: `linear-gradient(to right, ${STAT_COLORS[key]}88, ${STAT_COLORS[key]})`,
                  }}
                />
              </div>

              {/* Bonus info */}
              <div className="text-xs mt-0.5" style={{ color: '#5a4030' }}>
                {key === 'strength' && `Unit attack bonus: +${Math.floor(val / 10)}`}
                {key === 'endurance' && `Unit HP bonus: +${Math.floor(val / 5)}`}
                {key === 'intelligence' && `Siege power: +${Math.floor(val / 8)}%`}
                {key === 'willpower' && `Morale bonus: +${Math.floor(val / 10)}`}
                {key === 'charisma' && `Recruit cost reduction: ${Math.floor(val / 10) * 5}%`}
                {key === 'leadership' && `Army cap: ${armySizeCap(val)} units`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level progression */}
      <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
          Level Milestones
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {[1, 5, 10, 15, 20, 25, 30, 35, 40, 50].map((lvl) => (
            <div
              key={lvl}
              className="rounded p-2 text-center"
              style={{
                background: character.level >= lvl ? '#3a2010' : '#1a0f0a',
                border: `1px solid ${character.level >= lvl ? '#c9a84c55' : '#2a1a0a'}`,
              }}
            >
              <div
                className="text-sm font-bold"
                style={{ color: character.level >= lvl ? '#c9a84c' : '#3a2810' }}
              >
                Lv.{lvl}
              </div>
              {character.level >= lvl && (
                <div className="text-xs" style={{ color: '#22c55e' }}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
