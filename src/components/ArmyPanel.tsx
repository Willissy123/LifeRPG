import { useGameStore, armySizeCap } from '../store/useGameStore';
import { UNIT_DEFINITIONS, UNIT_ORDER } from '../utils/unitDefinitions';

export default function ArmyPanel() {
  const { character, playerArmy, recruitUnit, dismissUnit } = useGameStore();
  const armyCap = armySizeCap(character.stats.leadership);
  const atBonus = Math.floor(character.stats.strength / 10);
  const hpBonus = Math.floor(character.stats.endurance / 5);
  const costReduction = Math.floor(character.stats.charisma / 10) * 0.05;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Army Command
          </h1>
          <p className="text-sm" style={{ color: '#8a7050' }}>
            Army: {playerArmy.length} / {armyCap} units · Treasury: {character.gold}g
          </p>
        </div>
        {playerArmy.length >= armyCap && (
          <div className="text-sm px-3 py-1 rounded" style={{ background: '#8b1a1a22', color: '#ef4444', border: '1px solid #ef444444' }}>
            ⚠️ Army at capacity — raise Leadership to recruit more
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recruit roster */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Recruitment Roster
          </h2>
          <div className="space-y-2">
            {UNIT_ORDER.map((type) => {
              const def = UNIT_DEFINITIONS[type];
              const effectiveCost = Math.max(
                10,
                Math.round(def.cost * (1 - costReduction))
              );
              const canAfford = character.gold >= effectiveCost;
              const hasRoom = playerArmy.length < armyCap;
              const canRecruit = canAfford && hasRoom;

              return (
                <div
                  key={type}
                  className="rounded-lg p-3"
                  style={{
                    background: '#2c1810',
                    border: `1px solid ${canRecruit ? '#c9a84c44' : '#3a2010'}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Color swatch */}
                      <div
                        className="w-8 h-8 rounded flex-shrink-0"
                        style={{ background: def.color, border: '1px solid #ffffff22' }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm" style={{ color: '#f5e6c8' }}>
                            {def.label}
                          </span>
                          {def.isRanged && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f9731622', color: '#f97316' }}>
                              Ranged
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#6b5030' }}>
                          {def.description}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs flex-wrap">
                          <span style={{ color: '#ef4444' }}>
                            ⚔ {def.baseAtk + atBonus} ATK
                          </span>
                          <span style={{ color: '#3b82f6' }}>
                            🛡 {def.baseDef} DEF
                          </span>
                          <span style={{ color: '#22c55e' }}>
                            ❤ {def.baseHp + hpBonus} HP
                          </span>
                          <span style={{ color: '#8a7050' }}>
                            Spd {def.speed.toFixed(1)}
                          </span>
                          {def.isRanged && (
                            <span style={{ color: '#f97316' }}>
                              Range {def.range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right">
                      <div
                        className="text-sm font-bold mb-1"
                        style={{ color: canAfford ? '#c9a84c' : '#8b1a1a' }}
                      >
                        {effectiveCost}g
                        {costReduction > 0 && (
                          <span className="text-xs ml-1 line-through" style={{ color: '#6b5030' }}>
                            {def.cost}g
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => recruitUnit(type)}
                        disabled={!canRecruit}
                        className="px-3 py-1.5 rounded text-sm font-bold transition-all"
                        style={{
                          background: canRecruit ? '#c9a84c' : '#2a1a0a',
                          color: canRecruit ? '#1a0f0a' : '#4a3020',
                          cursor: canRecruit ? 'pointer' : 'not-allowed',
                          border: '1px solid transparent',
                        }}
                      >
                        Recruit
                      </button>
                      {!canAfford && hasRoom && (
                        <div className="text-xs mt-0.5" style={{ color: '#8b1a1a' }}>
                          Need {effectiveCost - character.gold}g more
                        </div>
                      )}
                      {!hasRoom && (
                        <div className="text-xs mt-0.5" style={{ color: '#8b1a1a' }}>
                          Army full
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current army */}
        <div>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Your Legion ({playerArmy.length}/{armyCap})
          </h2>

          {playerArmy.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ background: '#2c1810', border: '1px dashed #3a2010' }}
            >
              <div className="text-4xl mb-2">🛡️</div>
              <p style={{ color: '#6b5030' }}>No units yet. Recruit soldiers to build your legion.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playerArmy.map((unit) => {
                const hpPct = Math.round((unit.hp / unit.maxHp) * 100);
                return (
                  <div
                    key={unit.id}
                    className="rounded-lg p-3"
                    style={{ background: '#2c1810', border: '1px solid #3a2010' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-7 h-7 rounded flex-shrink-0"
                          style={{ background: unit.color, border: '1px solid #ffffff22' }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium" style={{ color: '#f5e6c8' }}>
                              {unit.type}
                            </span>
                            {unit.isRanged && (
                              <span className="text-xs px-1 py-0.5 rounded" style={{ background: '#f9731622', color: '#f97316' }}>
                                Ranged
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-0.5 text-xs">
                            <span style={{ color: '#ef4444' }}>⚔ {unit.atk}</span>
                            <span style={{ color: '#3b82f6' }}>🛡 {unit.def}</span>
                            <span style={{ color: '#22c55e' }}>❤ {unit.hp}/{unit.maxHp}</span>
                          </div>
                          {/* HP bar */}
                          <div className="w-full rounded-full h-1.5 mt-1" style={{ background: '#1a0f0a' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${hpPct}%`,
                                background: hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f97316' : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Dismiss this ${unit.type}?`)) {
                            dismissUnit(unit.id);
                          }
                        }}
                        className="ml-2 px-2 py-1 rounded text-xs flex-shrink-0"
                        style={{ background: '#8b1a1a22', color: '#ef4444', border: '1px solid #8b1a1a44' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stat bonuses from character */}
          {(atBonus > 0 || hpBonus > 0) && (
            <div
              className="mt-3 rounded p-2 text-xs"
              style={{ background: '#1a2010', border: '1px solid #22c55e33' }}
            >
              <div style={{ color: '#22c55e' }}>Character bonuses applied to all units:</div>
              {atBonus > 0 && <div style={{ color: '#22c55e88' }}>+{atBonus} ATK from Strength ({character.stats.strength})</div>}
              {hpBonus > 0 && <div style={{ color: '#22c55e88' }}>+{hpBonus} Max HP from Endurance ({character.stats.endurance})</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
