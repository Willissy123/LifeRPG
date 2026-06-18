import { useGameStore } from '../store/useGameStore';
import { FACTION_COLORS } from '../utils/mapData';
import type { FactionId, Region } from '../types';

const FACTION_LABELS: Record<FactionId, string> = {
  player: 'Roman Republic',
  gauls: 'Gallic Tribes',
  carthage: 'Carthage',
  macedon: 'Macedon',
  neutral: 'Independent',
};

const FACTION_ICONS: Record<FactionId, string> = {
  player: '🏛️',
  gauls: '🌲',
  carthage: '🐘',
  macedon: '⚡',
  neutral: '⚪',
};

export default function CampaignMap() {
  const {
    regions,
    factions,
    selectedRegionId,
    playerArmy,
    character,
    turn,
    selectRegion,
    moveArmyTo,
    attackRegion,
    endTurn,
    log,
  } = useGameStore();

  const selected = regions.find((r) => r.id === selectedRegionId) ?? null;
  const playerRegions = regions.filter((r) => r.owner === 'player');
  const goldPerTurn = playerRegions.reduce((s, r) => s + r.goldPerTurn, 0);

  // Adjacent to selected region
  const adjacentIds = selected ? new Set(selected.connections) : new Set<string>();

  // Where the player army is
  const armyRegion = regions.find((r) => r.hasPlayerArmy);

  function handleRegionClick(region: Region) {
    if (selectedRegionId === region.id) {
      selectRegion(null);
      return;
    }
    selectRegion(region.id);
  }

  function canMoveTo(region: Region): boolean {
    if (!armyRegion) return false;
    if (region.owner !== 'player') return false;
    if (region.id === armyRegion.id) return false;
    return armyRegion.connections.includes(region.id);
  }

  function canAttack(region: Region): boolean {
    if (!armyRegion) return false;
    if (region.owner === 'player') return false;
    if (playerArmy.length === 0) return false;
    return armyRegion.connections.includes(region.id);
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
            Campaign Map
          </h1>
          <p className="text-sm" style={{ color: '#8a7050' }}>
            Turn {turn} · {character.gold}g Treasury · +{goldPerTurn}g/turn
          </p>
        </div>
        <button
          onClick={endTurn}
          className="px-6 py-3 rounded-lg font-bold text-sm"
          style={{ background: '#8b1a1a', color: '#f5e6c8', border: '2px solid #c9a84c' }}
        >
          ⏭ End Turn
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Map */}
        <div className="xl:col-span-3 rounded-lg overflow-hidden"
          style={{ background: '#d4b896', border: '2px solid #8b6914' }}>
          <svg viewBox="0 0 700 620" width="100%" style={{ display: 'block' }}>
            {/* Parchment background */}
            <rect width="700" height="620" fill="#d4b896" />
            {/* Grid texture */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c9a07044" strokeWidth="0.5" />
            </pattern>
            <rect width="700" height="620" fill="url(#grid)" />

            {/* Title */}
            <text x="350" y="30" textAnchor="middle" fill="#5a3010" fontSize="16"
              fontFamily="Georgia,serif" fontWeight="bold">
              MEDITERRANEAN — Year of Rome
            </text>

            {/* Connections */}
            {regions.map((region) =>
              region.connections.map((targetId) => {
                const target = regions.find((r) => r.id === targetId);
                if (!target) return null;
                if (region.id > targetId) return null; // draw each connection once
                return (
                  <line
                    key={`${region.id}-${targetId}`}
                    x1={region.x} y1={region.y}
                    x2={target.x} y2={target.y}
                    stroke="#8b691466"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                );
              })
            )}

            {/* Regions */}
            {regions.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const isAdjacent = adjacentIds.has(region.id);
              const movable = canMoveTo(region);
              const attackable = canAttack(region);
              const color = FACTION_COLORS[region.owner];
              const r = 28;

              return (
                <g key={region.id} onClick={() => handleRegionClick(region)} style={{ cursor: 'pointer' }}>
                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={region.x} cy={region.y} r={r + 7}
                      fill="none" stroke="#c9a84c" strokeWidth="3"
                      strokeDasharray="6 3" />
                  )}
                  {/* Adjacent highlight */}
                  {isAdjacent && !isSelected && (
                    <circle cx={region.x} cy={region.y} r={r + 5}
                      fill="none"
                      stroke={attackable ? '#ef4444' : movable ? '#22c55e' : '#c9a84c88'}
                      strokeWidth="2"
                      strokeDasharray="4 2" />
                  )}
                  {/* Region circle */}
                  <circle cx={region.x} cy={region.y} r={r}
                    fill={color}
                    fillOpacity={0.85}
                    stroke={isSelected ? '#c9a84c' : '#5a3010'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  {/* Region name */}
                  <text x={region.x} y={region.y - 2} textAnchor="middle"
                    fill="white" fontSize="8" fontFamily="Georgia,serif" fontWeight="bold">
                    {region.name}
                  </text>
                  <text x={region.x} y={region.y + 9} textAnchor="middle"
                    fill="white" fontSize="7" fillOpacity={0.8}>
                    +{region.goldPerTurn}g
                  </text>
                  {/* Army marker */}
                  {region.hasPlayerArmy && (
                    <g>
                      <circle cx={region.x + r - 6} cy={region.y - r + 6} r={9}
                        fill="#c9a84c" stroke="white" strokeWidth="1.5" />
                      <text x={region.x + r - 6} y={region.y - r + 10}
                        textAnchor="middle" fill="white" fontSize="9">⚔</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3">
          {/* Selected region actions */}
          {selected ? (
            <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
              <h3 className="font-bold mb-1" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                {selected.name}
              </h3>
              <div className="text-xs mb-3" style={{ color: '#8a7050' }}>
                {FACTION_ICONS[selected.owner]} {FACTION_LABELS[selected.owner]}
              </div>
              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between">
                  <span style={{ color: '#8a7050' }}>Income</span>
                  <span style={{ color: '#f0d080' }}>+{selected.goldPerTurn}g/turn</span>
                </div>
                {selected.hasPlayerArmy && (
                  <div className="flex justify-between">
                    <span style={{ color: '#8a7050' }}>Garrison</span>
                    <span style={{ color: '#c9a84c' }}>Your Army ⚔</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {canMoveTo(selected) && (
                  <button
                    onClick={() => moveArmyTo(selected.id)}
                    className="w-full py-2 rounded text-sm font-medium"
                    style={{ background: '#1a3a1a', color: '#22c55e', border: '1px solid #22c55e44' }}
                  >
                    🚶 Move Army Here
                  </button>
                )}
                {canAttack(selected) && (
                  <button
                    onClick={() => attackRegion(selected.id)}
                    className="w-full py-2 rounded text-sm font-medium"
                    style={{ background: '#3a1010', color: '#ef4444', border: '1px solid #ef444444' }}
                  >
                    ⚔️ Attack!
                  </button>
                )}
                {selected.owner !== 'player' && !canAttack(selected) && armyRegion && !armyRegion.connections.includes(selected.id) && (
                  <div className="text-xs text-center" style={{ color: '#6b5030' }}>
                    Not adjacent to your army
                  </div>
                )}
                {playerArmy.length === 0 && selected.owner !== 'player' && (
                  <div className="text-xs text-center" style={{ color: '#ef4444' }}>
                    No army to attack with
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-4 text-center" style={{ background: '#2c1810', border: '1px solid #3a2010' }}>
              <div className="text-2xl mb-2">🗺️</div>
              <div className="text-sm" style={{ color: '#8a7050' }}>Click a region to see options</div>
            </div>
          )}

          {/* Army status */}
          <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Your Army
            </h3>
            {playerArmy.length === 0 ? (
              <div className="text-xs" style={{ color: '#8a7050' }}>No units recruited.</div>
            ) : (
              <div>
                <div className="text-sm mb-1" style={{ color: '#f5e6c8' }}>{playerArmy.length} units</div>
                {armyRegion && (
                  <div className="text-xs" style={{ color: '#8a7050' }}>
                    Located: {armyRegion.name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Faction legend */}
          <div className="rounded-lg p-4" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Factions
            </h3>
            <div className="space-y-2">
              {(['player', 'gauls', 'carthage', 'macedon', 'neutral'] as FactionId[]).map((fid) => {
                const faction = factions[fid];
                const ownedCount = regions.filter((r) => r.owner === fid).length;
                return (
                  <div key={fid} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: FACTION_COLORS[fid] }} />
                      <span style={{ color: '#f5e6c8' }}>{FACTION_ICONS[fid]} {faction.name}</span>
                    </div>
                    <span style={{ color: '#8a7050' }}>{ownedCount} region{ownedCount !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event log */}
          <div className="rounded-lg p-4 flex-1" style={{ background: '#2c1810', border: '1px solid #c9a84c44' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              Campaign Log
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...log].reverse().slice(0, 15).map((entry, i) => (
                <p key={i} className="text-xs" style={{ color: i === 0 ? '#f5e6c8' : '#6b5030' }}>
                  {entry}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
