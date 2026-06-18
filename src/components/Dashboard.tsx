import { useGameStore } from '../store/useGameStore';
import { armySizeCap } from '../store/useGameStore';

const STAT_LABELS: Record<string, string> = {
  strength: 'Strength',
  endurance: 'Endurance',
  intelligence: 'Intelligence',
  willpower: 'Willpower',
  charisma: 'Charisma',
  leadership: 'Leadership',
};

const STAT_COLORS: Record<string, string> = {
  strength: '#ef4444',
  endurance: '#22c55e',
  intelligence: '#3b82f6',
  willpower: '#a855f7',
  charisma: '#f97316',
  leadership: '#c9a84c',
};

const STAT_ICONS: Record<string, string> = {
  strength: '💪',
  endurance: '🏃',
  intelligence: '📚',
  willpower: '🧘',
  charisma: '💬',
  leadership: '👑',
};

export default function Dashboard() {
  const { character, turn, regions, playerArmy, completedTasksToday, setScreen, log } = useGameStore();
  const playerRegions = regions.filter((r) => r.owner === 'player');
  const goldPerTurn = playerRegions.reduce((s, r) => s + r.goldPerTurn, 0);
  const armyCap = armySizeCap(character.stats.leadership);
  const xpPct = Math.round((character.xp / character.xpToNext) * 100);

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold glow-gold mb-1" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
          {character.name}
        </h1>
        <p className="text-sm" style={{ color: '#8a7050' }}>Turn {turn} · Roman Republic Campaign</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Character Stats */}
        <div className="lg:col-span-2 rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Character — Level {character.level}
            </h2>
            <button
              onClick={() => setScreen('character')}
              className="text-xs px-2 py-1 rounded"
              style={{ background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44' }}
            >
              Full Sheet →
            </button>
          </div>

          {/* XP bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#8a7050' }}>
              <span>XP Progress</span>
              <span>{character.xp} / {character.xpToNext}</span>
            </div>
            <div className="w-full rounded-full h-3" style={{ background: '#1a0f0a' }}>
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${xpPct}%`,
                  background: 'linear-gradient(to right, #c9a84c, #f0d080)',
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(character.stats).map(([key, val]) => (
              <div key={key} className="rounded p-2" style={{ background: '#1a0f0a', border: '1px solid #3a2010' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: '#8a7050' }}>
                    {STAT_ICONS[key]} {STAT_LABELS[key]}
                  </span>
                  <span className="font-bold text-sm" style={{ color: STAT_COLORS[key] }}>{val}</span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ background: '#2c1810' }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${val}%`, background: STAT_COLORS[key] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: resources + quick stats */}
        <div className="flex flex-col gap-4">
          {/* Resources */}
          <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Resources
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#8a7050' }}>💰 Treasury</span>
                <span style={{ color: '#c9a84c', fontWeight: 'bold' }}>{character.gold}g</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8a7050' }}>📈 Income/Turn</span>
                <span style={{ color: '#22c55e' }}>+{goldPerTurn}g</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8a7050' }}>🏛️ Territories</span>
                <span style={{ color: '#f5e6c8' }}>{playerRegions.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8a7050' }}>🛡️ Army</span>
                <span style={{ color: playerArmy.length >= armyCap ? '#ef4444' : '#f5e6c8' }}>
                  {playerArmy.length} / {armyCap}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#8a7050' }}>📋 Tasks Today</span>
                <span style={{ color: '#22c55e' }}>{completedTasksToday.length}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setScreen('tasks')}
                className="w-full py-2 rounded text-sm font-medium transition-colors"
                style={{ background: '#4a2c1a', color: '#f5e6c8', border: '1px solid #c9a84c55' }}
              >
                📋 Log Daily Tasks
              </button>
              <button
                onClick={() => setScreen('army')}
                className="w-full py-2 rounded text-sm font-medium transition-colors"
                style={{ background: '#4a2c1a', color: '#f5e6c8', border: '1px solid #c9a84c55' }}
              >
                🛡️ Manage Army
              </button>
              <button
                onClick={() => setScreen('campaign')}
                className="w-full py-2 rounded text-sm font-medium transition-colors"
                style={{ background: '#8b1a1a', color: '#f5e6c8', border: '1px solid #ef444455' }}
              >
                🗺️ Campaign Map
              </button>
            </div>
          </div>
        </div>

        {/* Event log */}
        <div className="lg:col-span-3 rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Campaign Log
          </h2>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {[...log].reverse().map((entry, i) => (
              <p key={i} className="text-xs" style={{ color: i === 0 ? '#f5e6c8' : '#6b5030' }}>
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
