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

// Mountain symbol positions: [x, y, scale]
const ALPS: [number, number][] = [
  [162,63],[188,59],[214,56],[242,55],[270,56],[298,57],[326,57],[355,58],[383,61],[408,66],[428,73],
];
const APENNINES: [number, number][] = [
  [302,98],[297,128],[294,160],[294,194],[298,226],[308,256],[320,283],[333,310],[347,335],[362,361],[377,387],[392,413],
];

export default function CampaignMap() {
  const {
    regions, factions, selectedRegionId, playerArmy, character, turn,
    selectRegion, moveArmyTo, attackRegion, endTurn, log,
  } = useGameStore();

  const selected = regions.find((r) => r.id === selectedRegionId) ?? null;
  const playerRegions = regions.filter((r) => r.owner === 'player');
  const goldPerTurn = playerRegions.reduce((s, r) => s + r.goldPerTurn, 0);
  const adjacentIds = selected ? new Set(selected.connections) : new Set<string>();
  const armyRegion = regions.find((r) => r.hasPlayerArmy);

  function handleRegionClick(region: Region) {
    selectRegion(selectedRegionId === region.id ? null : region.id);
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
        {/* ── MAP SVG ── */}
        <div className="xl:col-span-3 rounded-lg overflow-hidden"
          style={{ border: '2px solid #8b6914' }}>
          <svg viewBox="0 0 700 620" width="100%" style={{ display: 'block' }}>
            <defs>
              {/* Sea gradient */}
              <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a5e80"/>
                <stop offset="60%" stopColor="#1d4d6b"/>
                <stop offset="100%" stopColor="#163d58"/>
              </linearGradient>
              {/* Sea wave pattern */}
              <pattern id="seaWaves" width="44" height="22" patternUnits="userSpaceOnUse">
                <path d="M0,11 Q11,7 22,11 Q33,15 44,11" fill="none" stroke="#2d6b8a" strokeWidth="0.7" opacity="0.38"/>
              </pattern>
              {/* Land texture */}
              <pattern id="landTex" width="18" height="18" patternUnits="userSpaceOnUse">
                <rect width="18" height="18" fill="#c8ae76"/>
                <line x1="0" y1="9" x2="18" y2="9" stroke="#b89e60" strokeWidth="0.25" opacity="0.4"/>
              </pattern>
              <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="2" dy="3" stdDeviation="4" floodColor="#0a0505" floodOpacity="0.45"/>
              </filter>
              <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* === LAYER 1: SEA === */}
            <rect width="700" height="620" fill="url(#seaGrad)"/>
            <rect width="700" height="620" fill="url(#seaWaves)"/>

            {/* === LAYER 2: LANDMASSES === */}

            {/* Northern Europe / Gaul */}
            <path
              d="M0,0 L700,0 L700,68 L645,55 L468,58 L420,90 L375,70 L305,62
                 L230,63 L178,70 L155,57 L120,70 L75,52 L0,55 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="1.2" filter="url(#landShadow)"/>

            {/* Italian Peninsula */}
            <path
              d="M155,57 L178,70 L230,63 L305,62 L375,70 L420,90
                 L449,150 L451,210 L456,267 L466,308 L488,358
                 L468,408 L446,440 L418,460 L385,474 L350,467
                 L320,450 L300,416 L288,370 L278,324 L268,274
                 L244,220 L214,170 L178,132 L155,93 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="1" filter="url(#landShadow)"/>

            {/* Sicily */}
            <path
              d="M318,462 L400,458 L432,476 L415,510 L383,520 L348,518 L316,498 L308,478 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="0.9" filter="url(#landShadow)"/>

            {/* Sardinia (decorative) */}
            <path
              d="M170,342 L186,336 L196,356 L191,390 L176,398 L162,384 L159,364 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="0.7" opacity="0.9"/>

            {/* Corsica (decorative) */}
            <path
              d="M200,300 L213,294 L221,312 L215,336 L199,340 L188,325 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="0.7" opacity="0.9"/>

            {/* Balkans / Macedonia */}
            <path
              d="M468,58 L700,58 L700,420 L608,382 L568,400 L528,370
                 L508,314 L498,268 L476,200 L468,132 L458,90 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="1" filter="url(#landShadow)"/>

            {/* North Africa */}
            <path
              d="M0,518 L700,518 L700,620 L0,620 Z"
              fill="url(#landTex)" stroke="#8b6914" strokeWidth="1" filter="url(#landShadow)"/>

            {/* === LAYER 3: GEOGRAPHIC DETAIL === */}

            {/* Alps mountain symbols */}
            {ALPS.map(([mx, my], i) => (
              <g key={`alp${i}`}>
                <polygon points={`${mx},${my} ${mx-5.5},${my+9} ${mx+5.5},${my+9}`}
                  fill="#aaa" stroke="#7a7a7a" strokeWidth="0.5" opacity="0.65"/>
                {i % 2 === 0 && (
                  <polygon points={`${mx+7},${my+2} ${mx+2.5},${my+9} ${mx+11.5},${my+9}`}
                    fill="#bbb" stroke="#7a7a7a" strokeWidth="0.4" opacity="0.5"/>
                )}
              </g>
            ))}

            {/* Apennines chain */}
            {APENNINES.map(([mx, my], i) => (
              <polygon key={`apen${i}`}
                points={`${mx},${my-4.5} ${mx-4},${my+4} ${mx+4},${my+4}`}
                fill="#999" stroke="#777" strokeWidth="0.4" opacity="0.48"/>
            ))}

            {/* Balkan mountains */}
            {[[490,132],[510,158],[528,182],[544,204]].map(([mx, my], i) => (
              <polygon key={`balk${i}`}
                points={`${mx},${my-4} ${mx-3.5},${my+4} ${mx+3.5},${my+4}`}
                fill="#999" strokeWidth="0.4" opacity="0.45"/>
            ))}

            {/* Sea labels */}
            <text x="155" y="280" textAnchor="middle"
              fill="#1a4a62" fontSize="9.5" fontFamily="Georgia,serif" fontStyle="italic" opacity="0.72"
              transform="rotate(-14,155,280)">TYRRHENIAN SEA</text>
            <text x="492" y="222" textAnchor="middle"
              fill="#1a4a62" fontSize="9.5" fontFamily="Georgia,serif" fontStyle="italic" opacity="0.72"
              transform="rotate(12,492,222)">ADRIATIC SEA</text>
            <text x="350" y="506" textAnchor="middle"
              fill="#1a4a62" fontSize="11" fontFamily="Georgia,serif" fontStyle="italic" opacity="0.72"
            >MARE NOSTRUM</text>
            <text x="620" y="350" textAnchor="middle"
              fill="#1a4a62" fontSize="9" fontFamily="Georgia,serif" fontStyle="italic" opacity="0.55"
              transform="rotate(90,620,350)">AEGEAN SEA</text>

            {/* Compass rose */}
            <g transform="translate(655,94)">
              <circle cx="0" cy="0" r="23" fill="#c8ae7688" stroke="#8b6914" strokeWidth="1.2"/>
              <circle cx="0" cy="0" r="10" fill="none" stroke="#8b6914" strokeWidth="0.8" strokeOpacity="0.5"/>
              {/* N arrow red */}
              <polygon points="0,-21 2.5,-8 -2.5,-8" fill="#8b1a1a"/>
              {/* S arrow gold */}
              <polygon points="0,21 2.5,8 -2.5,8" fill="#8b6914"/>
              {/* E/W gold */}
              <polygon points="21,0 8,2.5 8,-2.5" fill="#8b6914"/>
              <polygon points="-21,0 -8,2.5 -8,-2.5" fill="#8b6914"/>
              {/* Center dot */}
              <circle cx="0" cy="0" r="3" fill="#8b6914"/>
              <text x="0" y="-25" textAnchor="middle" fill="#3a1810" fontSize="8"
                fontFamily="Georgia,serif" fontWeight="bold">N</text>
            </g>

            {/* Map title */}
            <text x="330" y="27" textAnchor="middle" fill="#f5e6c8"
              fontSize="13" fontFamily="Georgia,serif" fontWeight="bold" opacity="0.9">
              MEDITERRANEAN — Year of Rome
            </text>

            {/* === LAYER 4: TERRITORY AURAS === */}
            {regions.map((region) => (
              <circle
                key={`aura-${region.id}`}
                cx={region.x} cy={region.y} r={54}
                fill={FACTION_COLORS[region.owner]}
                fillOpacity={0.16}
                stroke="none"
              />
            ))}

            {/* === LAYER 5: ROMAN ROADS === */}
            {regions.map((region) =>
              region.connections.map((targetId) => {
                const target = regions.find((r) => r.id === targetId);
                if (!target || region.id > targetId) return null;
                return (
                  <g key={`road-${region.id}-${targetId}`}>
                    {/* Road border */}
                    <line x1={region.x} y1={region.y} x2={target.x} y2={target.y}
                      stroke="#6b4e1a" strokeWidth="3.5" opacity="0.5"/>
                    {/* Road surface */}
                    <line x1={region.x} y1={region.y} x2={target.x} y2={target.y}
                      stroke="#d4bc88" strokeWidth="1.5" opacity="0.55" strokeDasharray="7 4"/>
                  </g>
                );
              })
            )}

            {/* === LAYER 6: PROVINCE NODES === */}
            {regions.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const isAdjacent = adjacentIds.has(region.id);
              const movable = canMoveTo(region);
              const attackable = canAttack(region);
              const color = FACTION_COLORS[region.owner];
              const r = 28;

              return (
                <g key={region.id} onClick={() => handleRegionClick(region)} style={{ cursor: 'pointer' }}>
                  {/* Selection glow */}
                  {isSelected && (
                    <circle cx={region.x} cy={region.y} r={r + 9}
                      fill="none" stroke="#c9a84c" strokeWidth="3" strokeDasharray="6 3" opacity="0.9"/>
                  )}
                  {/* Adjacent action ring */}
                  {isAdjacent && !isSelected && (
                    <circle cx={region.x} cy={region.y} r={r + 7}
                      fill="none"
                      stroke={attackable ? '#ef4444' : movable ? '#22c55e' : '#c9a84c'}
                      strokeWidth="2" strokeDasharray="4 2" opacity="0.75"/>
                  )}
                  {/* Main node */}
                  <circle cx={region.x} cy={region.y} r={r}
                    fill={color} fillOpacity={0.9}
                    stroke={isSelected ? '#c9a84c' : '#1a0a04'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isSelected ? 'url(#nodeGlow)' : undefined}/>
                  {/* Inner detail ring */}
                  <circle cx={region.x} cy={region.y} r={r - 5}
                    fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.18"/>
                  {/* Region name */}
                  <text x={region.x} y={region.y - 1} textAnchor="middle"
                    fill="white" fontSize="7.5" fontFamily="Georgia,serif" fontWeight="bold">
                    {region.name}
                  </text>
                  <text x={region.x} y={region.y + 9.5} textAnchor="middle"
                    fill="white" fontSize="7" fillOpacity={0.82}>
                    +{region.goldPerTurn}g
                  </text>
                  {/* Player army marker */}
                  {region.hasPlayerArmy && (
                    <g>
                      <circle cx={region.x + r - 5} cy={region.y - r + 5} r={9.5}
                        fill="#c9a84c" stroke="white" strokeWidth="1.5"/>
                      <text x={region.x + r - 5} y={region.y - r + 9.5}
                        textAnchor="middle" fill="white" fontSize="9">⚔</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── SIDE PANEL ── */}
        <div className="flex flex-col gap-3">
          {/* Selected region */}
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
                  <div className="text-xs text-center" style={{ color: '#6b5030' }}>Not adjacent to your army</div>
                )}
                {playerArmy.length === 0 && selected.owner !== 'player' && (
                  <div className="text-xs text-center" style={{ color: '#ef4444' }}>No army to attack with</div>
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
                  <div className="text-xs" style={{ color: '#8a7050' }}>Located: {armyRegion.name}</div>
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
                      <div className="w-3 h-3 rounded-full" style={{ background: FACTION_COLORS[fid] }}/>
                      <span style={{ color: '#f5e6c8' }}>{FACTION_ICONS[fid]} {faction.name}</span>
                    </div>
                    <span style={{ color: '#8a7050' }}>{ownedCount} region{ownedCount !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign log */}
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
