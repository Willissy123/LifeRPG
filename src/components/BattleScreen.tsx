import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import type { BattleUnit } from '../types';
import type {
  BattleSim, Regiment, Trooper, VisArrow, VisDust,
  FormationType, UnitOrder,
} from '../battle/battleTypes';
import { tickSim, rebuildFormation } from '../battle/simulation';
import { getFormationOffsets } from '../battle/formations';

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const CW = 900;
const BATTLE_H = 380;
const PANEL_H = 140;
const CH = BATTLE_H + PANEL_H;

const MAX_TROOPERS = 120;

// ── Color tables ──────────────────────────────────────────────────────────────
type SC = { body: string; helmet: string; shield: string; crest: string };

function soldierColors(unitType: string, side: 'player' | 'enemy'): SC {
  if (side === 'player') {
    const body = unitType === 'Praetorian' ? '#6b0a0a' : '#8b1a1a';
    return { body, helmet: unitType === 'Praetorian' ? '#f0d080' : '#c9a84c', shield: '#7a1515', crest: '#cc2222' };
  }
  const map: Record<string, SC> = {
    Hastati:    { body: '#2d5a27', helmet: '#888', shield: '#2d5a27', crest: '' },
    Legionary:  { body: '#1a3a6b', helmet: '#6a6a6a', shield: '#1a3a6b', crest: '#661111' },
    Archer:     { body: '#5a3a1a', helmet: '#778877', shield: '#5a3a1a', crest: '' },
    Equites:    { body: '#6b3a1a', helmet: '#887755', shield: '#6b3a1a', crest: '' },
    Ballista:   { body: '#4a4a2a', helmet: '#666', shield: '#4a4a2a', crest: '' },
    Praetorian: { body: '#4a1a6b', helmet: '#aaa', shield: '#4a1a6b', crest: '#881188' },
  };
  return map[unitType] ?? { body: '#555', helmet: '#777', shield: '#555', crest: '' };
}

// ── Soldier drawing ───────────────────────────────────────────────────────────
function drawTrooper(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number,
  unitType: string,
  side: 'player' | 'enemy',
  state: string,
  animTimer: number,
) {
  ctx.save();
  ctx.translate(x, y);
  // Rotate so player (facing=0 = right) and enemy (facing=PI = left) draw correctly
  const facingRight = Math.cos(facing) >= 0;
  ctx.scale(facingRight ? 1 : -1, 1);

  const t = animTimer;
  const walking = state === 'march' || state === 'rout';
  const fighting = state === 'fight';
  const walkCycle = walking ? Math.sin(t * 0.13) : 0;
  const bob = walking ? Math.abs(Math.sin(t * 0.13)) * 1.5 : 0;
  const swing = fighting ? Math.sin(t * 0.25) * 0.6 : 0;
  const c = soldierColors(unitType, side);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);

  // Legs / horse
  if (unitType === 'Equites') {
    ctx.fillStyle = '#7a5518';
    ctx.beginPath();
    ctx.ellipse(5, 5, 11, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [ox, dir] of [[-4, 1], [4, -1], [10, 1], [16, -1]] as [number, number][]) {
      ctx.beginPath(); ctx.moveTo(ox, 8); ctx.lineTo(ox + walkCycle * 5 * dir, 16); ctx.stroke();
    }
    ctx.fillStyle = '#7a5518';
    ctx.beginPath(); ctx.ellipse(18, 0, 6, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(14, 0); ctx.stroke();
  } else if (unitType === 'Ballista') {
    // Crew with siege machine
    ctx.strokeStyle = c.body; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-3 + walkCycle * 3, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(3 - walkCycle * 3, 13); ctx.stroke();
    // Ballista frame
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(6, -10); ctx.stroke();
  } else {
    ctx.strokeStyle = c.body; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-3 + walkCycle * 4, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(3 - walkCycle * 4, 13); ctx.stroke();
  }

  // Torso
  ctx.fillStyle = c.body;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-5, -14, 10, 18, 2);
  else ctx.rect(-5, -14, 10, 18);
  ctx.fill();

  // Shield (melee units)
  if (unitType !== 'Archer' && unitType !== 'Ballista') {
    ctx.fillStyle = c.shield;
    if (ctx.roundRect) ctx.roundRect(-13, -18, 8, 21, 2);
    else ctx.rect(-13, -18, 8, 21);
    ctx.fill();
    ctx.strokeStyle = '#c9a84c55'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-13, -18, 8, 21);
    ctx.fillStyle = '#c9a84c';
    ctx.beginPath(); ctx.arc(-9, -7, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a84c33'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(-5, -7); ctx.stroke();
  }

  // Weapon
  ctx.save();
  ctx.rotate(swing);
  if (unitType === 'Archer') {
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(8, -8, 9, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#d4a843'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8 + 9 * Math.cos(-1.1), -8 + 9 * Math.sin(-1.1));
    ctx.lineTo(8 + 9 * Math.cos(1.1), -8 + 9 * Math.sin(1.1));
    ctx.stroke();
  } else if (unitType === 'Equites') {
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(25, -28); ctx.stroke();
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(25, -28); ctx.lineTo(20, -23); ctx.lineTo(27, -23); ctx.fill();
  } else if (unitType !== 'Ballista') {
    // Gladius
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(16, -21); ctx.stroke();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(13, -17); ctx.stroke();
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(7, -13); ctx.stroke();
  }
  ctx.restore();

  // Helmet
  ctx.fillStyle = c.helmet;
  ctx.beginPath(); ctx.arc(0, -20, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-7, -22, 3, 7);
  ctx.fillRect(4, -22, 3, 7);
  ctx.fillRect(-5, -13, 10, 3);

  // Crest
  if (c.crest) {
    ctx.fillStyle = c.crest;
    ctx.beginPath();
    ctx.moveTo(-3, -27); ctx.lineTo(3, -27);
    ctx.bezierCurveTo(3, -37, -3, -37, -3, -27);
    ctx.fill();
  }

  // Face
  ctx.fillStyle = '#c4855a';
  ctx.beginPath(); ctx.arc(1, -20, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a1a08';
  ctx.beginPath(); ctx.arc(-0.5, -21, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5, -21, 0.9, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawDeadTrooper(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: number,
  unitType: string,
  side: 'player' | 'enemy',
) {
  const c = soldierColors(unitType, side);
  ctx.save();
  ctx.translate(x, y + 8);
  ctx.rotate(facing + Math.PI / 2 + 0.3);
  ctx.fillStyle = c.body; ctx.fillRect(-3, -3, 16, 7);
  ctx.fillStyle = c.helmet; ctx.beginPath(); ctx.arc(11, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c4855a'; ctx.beginPath(); ctx.arc(11, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Ground / sky ──────────────────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D) {
  const skyH = BATTLE_H * 0.25;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, '#87CEEB');
  sky.addColorStop(1, '#b8d8e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, skyH);

  // Hills
  ctx.fillStyle = '#3e6b28';
  ctx.beginPath();
  ctx.moveTo(0, skyH);
  ctx.bezierCurveTo(180, skyH - 55, 350, skyH - 30, 500, skyH - 48);
  ctx.bezierCurveTo(650, skyH - 65, 780, skyH - 25, CW, skyH - 38);
  ctx.lineTo(CW, skyH); ctx.closePath(); ctx.fill();

  // Grass
  const gr = ctx.createLinearGradient(0, skyH, 0, BATTLE_H);
  gr.addColorStop(0, '#5a8a38');
  gr.addColorStop(0.3, '#4d7a2a');
  gr.addColorStop(0.7, '#4a6820');
  gr.addColorStop(1, '#3a5210');
  ctx.fillStyle = gr;
  ctx.fillRect(0, skyH, CW, BATTLE_H - skyH);

  // Dirt battle patch
  const dirt = ctx.createLinearGradient(0, skyH + 40, 0, BATTLE_H - 20);
  dirt.addColorStop(0, 'rgba(120,90,40,0)');
  dirt.addColorStop(0.4, 'rgba(120,90,40,0.28)');
  dirt.addColorStop(1, 'rgba(120,90,40,0)');
  ctx.fillStyle = dirt;
  ctx.fillRect(CW * 0.1, skyH, CW * 0.8, BATTLE_H - skyH);

  // Grass tufts
  ctx.fillStyle = '#2a5a10';
  for (let i = 0; i < 36; i++) {
    const gx = (i * 67 + 20) % CW;
    const gy = skyH + 10 + ((i * 43) % 70);
    ctx.fillRect(gx, gy, 2, 5);
    ctx.fillRect(gx + 4, gy + 2, 2, 4);
  }

  // Dividing line in center
  ctx.strokeStyle = 'rgba(180,140,60,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(CW * 0.1, BATTLE_H / 2);
  ctx.lineTo(CW * 0.9, BATTLE_H / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Arrow ─────────────────────────────────────────────────────────────────────
function drawArrowVis(ctx: CanvasRenderingContext2D, a: VisArrow) {
  const t = a.progress;
  const bx = (a.sx + a.ex) / 2;
  const by = Math.min(a.sy, a.ey) - 80;
  const px = (1 - t) * (1 - t) * a.sx + 2 * (1 - t) * t * bx + t * t * a.ex;
  const py = (1 - t) * (1 - t) * a.sy + 2 * (1 - t) * t * by + t * t * a.ey;
  const dx2 = 2 * (1 - t) * (bx - a.sx) + 2 * t * (a.ex - bx);
  const dy2 = 2 * (1 - t) * (by - a.sy) + 2 * t * (a.ey - by);
  const angle = Math.atan2(dy2, dx2);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.fillStyle = '#bbb';
  ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(2, -2); ctx.lineTo(2, 2); ctx.fill();
  ctx.fillStyle = a.side === 'player' ? '#ef4444' : '#22aa22';
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-4, -2.5); ctx.lineTo(-4, 2.5); ctx.fill();
  ctx.restore();
}

// ── Dust / particles ──────────────────────────────────────────────────────────
function drawDust(ctx: CanvasRenderingContext2D, dusts: VisDust[]) {
  for (const d of dusts) {
    const a = d.life / d.maxLife;
    ctx.globalAlpha = a * 0.7;
    if (d.kind === 'dust') ctx.fillStyle = '#c4a870';
    else if (d.kind === 'blood') ctx.fillStyle = '#cc1111';
    else ctx.fillStyle = '#f0d080';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Regiment initialization ───────────────────────────────────────────────────
function buildRegiment(unit: BattleUnit, index: number, total: number): Regiment {
  const side = unit.side;
  // Spread regiments across X, Y based on side
  const xSpacing = Math.min(160, (CW - 120) / Math.max(1, total - 1));
  const startX = CW / 2 - ((total - 1) * xSpacing) / 2;
  const rx = startX + index * xSpacing;
  const ry = side === 'player' ? 310 + (index % 2) * 30 : 80 + (index % 2) * 25;
  const facing = side === 'player' ? -Math.PI / 2 : Math.PI / 2; // player faces up, enemy down

  const formation: FormationType = 'line';
  const offsets = getFormationOffsets(formation, MAX_TROOPERS);

  const troopers: Trooper[] = offsets.map((off, i) => {
    const { rx: ox, ry: oy } = rotateOff(off.x, off.y, facing);
    return {
      id: i,
      formOffX: ox,
      formOffY: oy,
      x: rx + ox,
      y: ry + oy,
      hp: 1,
      maxHp: 1,
      state: 'march',
      animTimer: Math.random() * 60,
      deathTimer: 0,
    };
  });

  // Scale speed from unit definition pixel-per-frame to pixels-per-tick
  const speed = unit.speed * 40;
  const attackRange = unit.isRanged ? 200 : 45;

  return {
    id: unit.id,
    name: `${unit.type} ${index + 1}`,
    unitType: unit.type,
    side,
    x: rx,
    y: ry,
    facing,
    formation,
    order: 'advance',
    state: 'advancing',
    totalHp: unit.hp,
    maxTotalHp: unit.maxHp,
    atk: unit.atk,
    def: unit.def,
    speed,
    attackRange,
    isRanged: unit.isRanged,
    morale: 100,
    color: unit.color,
    isSelected: false,
    targetId: null,
    moveTarget: null,
    attackCooldown: unit.isRanged ? 60 : 30,
    troopers,
    aliveTroopers: MAX_TROOPERS,
    maxTroopers: MAX_TROOPERS,
  };
}

function rotateOff(ox: number, oy: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { rx: ox * cos - oy * sin, ry: ox * sin + oy * cos };
}

function buildInitialSim(
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  goldReward: number,
): BattleSim {
  const playerRegiments = playerUnits.map((u, i) => buildRegiment(u, i, playerUnits.length));
  const enemyRegiments = enemyUnits.map((u, i) => buildRegiment(u, i, enemyUnits.length));

  return {
    regiments: [...playerRegiments, ...enemyRegiments],
    arrows: [],
    dusts: [],
    frame: 0,
    selectedId: playerRegiments.length > 0 ? playerRegiments[0].id : null,
    commandMode: 'none',
    wave: 1,
    battleOver: false,
    winner: null,
    goldReward,
  };
}

// ── unit icon emojis ──────────────────────────────────────────────────────────
function unitIcon(type: string): string {
  const icons: Record<string, string> = {
    Hastati: '🗡️', Legionary: '🛡️', Archer: '🏹',
    Equites: '🐎', Ballista: '⚙️', Praetorian: '👑',
  };
  return icons[type] ?? '⚔️';
}

// ── wave spawn ────────────────────────────────────────────────────────────────
function spawnEnemyWave(
  sim: BattleSim,
  originalEnemyUnits: BattleUnit[],
  waveNum: number,
): BattleSim {
  const hpMult = 1 + (waveNum - 1) * 0.2;
  // Add one extra random unit per extra wave
  let units = originalEnemyUnits.map(u => ({
    ...u,
    hp: Math.round(u.hp * hpMult),
    maxHp: Math.round(u.maxHp * hpMult),
    atk: Math.round(u.atk * (1 + (waveNum - 1) * 0.1)),
  }));
  if (waveNum > 1) {
    // Add extra unit (copy first)
    const extra: BattleUnit = {
      ...units[0],
      id: `extra_wave${waveNum}_${Date.now()}`,
      x: CW / 2,
      y: 60,
    };
    units = [...units, extra];
  }

  const newEnemyRegiments = units.map((u, i) => buildRegiment(u, i, units.length));

  // Replenish player troopers by 30%
  const repairedPlayer = sim.regiments
    .filter(r => r.side === 'player')
    .map(r => {
      const restore = Math.round(r.maxTroopers * 0.3);
      const currentAlive = r.aliveTroopers;
      const newAlive = Math.min(r.maxTroopers, currentAlive + restore);
      const deadCount = r.maxTroopers - newAlive;
      let revived = newAlive - currentAlive;
      const newTroopers = [...r.troopers].map(t => {
        if (t.state === 'dead' && revived > 0) {
          revived--;
          return { ...t, state: 'march' as const, deathTimer: 0 };
        }
        return t;
      });
      return {
        ...r,
        troopers: newTroopers,
        aliveTroopers: newAlive,
        totalHp: Math.round(r.maxTotalHp * (newAlive / r.maxTroopers)),
        state: 'advancing' as const,
        order: 'advance' as const,
        morale: Math.min(100, r.morale + 30),
      };
    });

  return {
    ...sim,
    regiments: [...repairedPlayer, ...newEnemyRegiments],
    arrows: [],
    battleOver: false,
    winner: null,
    wave: waveNum,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BattleScreen() {
  const store = useGameStore();
  const { battle } = store;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const simRef = useRef<BattleSim>(
    buildInitialSim(battle.playerUnits, battle.enemyUnits, battle.goldReward)
  );
  const origEnemyUnits = useRef<BattleUnit[]>(battle.enemyUnits);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(0); // countdown after wave win
  const waveTimerActiveRef = useRef<boolean>(false);

  // React state only for UI panel re-renders (minimised to avoid canvas lag)
  const [selectedId, setSelectedId] = useState<string | null>(simRef.current.selectedId);
  const [uiTick, setUiTick] = useState(0); // increment to force re-render
  const [waveMsg, setWaveMsg] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultWinner, setResultWinner] = useState<'player' | 'enemy' | null>(null);

  // ── Canvas loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaMs = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16.67;
    lastTimeRef.current = ts;
    frameRef.current++;

    const sim = simRef.current;

    // Tick simulation unless over
    if (!sim.battleOver) {
      simRef.current = tickSim(sim, deltaMs);
    } else if (!waveTimerActiveRef.current && sim.winner === 'player') {
      // Wave won — start 3s countdown to next wave (up to 3 waves, then end)
      waveTimerActiveRef.current = true;
      waveTimerRef.current = 180; // ~3 seconds at 60fps
      const wn = sim.wave;
      setWaveMsg(wn < 3 ? `Wave ${wn} complete! Reinforcements incoming…` : `All waves defeated!`);
      setShowResult(false);
    }

    // Wave countdown
    if (waveTimerActiveRef.current && waveTimerRef.current > 0) {
      waveTimerRef.current--;
      if (waveTimerRef.current === 0) {
        waveTimerActiveRef.current = false;
        const sim2 = simRef.current;
        if (sim2.wave < 3) {
          // Next wave
          simRef.current = spawnEnemyWave(sim2, origEnemyUnits.current, sim2.wave + 1);
          setWaveMsg('');
        } else {
          // Game over — player won all waves
          setShowResult(true);
          setResultWinner('player');
          setWaveMsg('');
        }
      }
    }

    // Enemy defeat
    if (sim.battleOver && sim.winner === 'enemy' && !showResult) {
      setShowResult(true);
      setResultWinner('enemy');
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const { regiments, arrows, dusts } = simRef.current;
    const totalTroopers = regiments.reduce((s, r) => s + r.maxTroopers, 0);
    const simpleDraw = totalTroopers > 3000;

    ctx.clearRect(0, 0, CW, CH);

    drawGround(ctx);

    // Dust particles (below soldiers)
    drawDust(ctx, dusts);

    // Sort regiments back-to-front for depth
    const sortedRegs = [...regiments].sort((a, b) => a.y - b.y);

    for (const reg of sortedRegs) {
      // Draw dead troopers first (corpses)
      for (const t of reg.troopers) {
        if (t.state !== 'dead') continue;
        if (t.x < -20 || t.x > CW + 20 || t.y < -20 || t.y > BATTLE_H + 20) continue;
        ctx.globalAlpha = 0.5;
        if (simpleDraw) {
          ctx.fillStyle = reg.color;
          ctx.fillRect(t.x - 1.5, t.y - 3, 3, 6);
        } else {
          drawDeadTrooper(ctx, t.x, t.y, reg.facing, reg.unitType, reg.side);
        }
        ctx.globalAlpha = 1;
      }
    }

    for (const reg of sortedRegs) {
      for (const t of reg.troopers) {
        if (t.state === 'dead') {
          if (t.deathTimer > 0) {
            // Fading out
            ctx.globalAlpha = t.deathTimer / 30;
            if (simpleDraw) {
              ctx.fillStyle = reg.color;
              ctx.fillRect(t.x - 1.5, t.y - 3, 3, 6);
            } else {
              drawTrooper(ctx, t.x, t.y, reg.facing, reg.unitType, reg.side, t.state, t.animTimer);
            }
            ctx.globalAlpha = 1;
          }
          continue;
        }
        if (t.x < -20 || t.x > CW + 20 || t.y < -20 || t.y > BATTLE_H + 20) continue;

        if (simpleDraw) {
          ctx.fillStyle = reg.color;
          ctx.fillRect(t.x - 1.5, t.y - 3, 3, 4);
        } else {
          drawTrooper(ctx, t.x, t.y, reg.facing, reg.unitType, reg.side, t.state, t.animTimer);
        }
      }

      // Regiment HP bar
      const hpRatio = reg.totalHp / Math.max(1, reg.maxTotalHp);
      const barW = 44;
      const bx = reg.x - barW / 2;
      const by = reg.y - 40;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, 6);
      const hpColor = hpRatio > 0.6 ? '#4ade80' : hpRatio > 0.3 ? '#facc15' : '#ef4444';
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, barW * hpRatio, 4);

      // Morale bar (blue)
      const moraleRatio = reg.morale / 100;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx - 1, by + 5, barW + 2, 4);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(bx, by + 6, barW * moraleRatio, 2);

      // Routing label
      if (reg.state === 'routing') {
        ctx.font = 'bold 10px Georgia';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('ROUTING', reg.x, reg.y - 48);
        ctx.textAlign = 'left';
      }

      // Selection ring + direction arrow
      if (reg.id === simRef.current.selectedId && reg.side === 'player') {
        ctx.save();
        ctx.strokeStyle = '#c9a84c';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(reg.x, reg.y, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Direction arrow
        const arrowLen = 45;
        const ex2 = reg.x + Math.cos(reg.facing) * arrowLen;
        const ey2 = reg.y + Math.sin(reg.facing) * arrowLen;
        ctx.strokeStyle = '#c9a84c88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(reg.x, reg.y);
        ctx.lineTo(ex2, ey2);
        ctx.stroke();
        // Arrow head
        const headAngle = reg.facing;
        ctx.fillStyle = '#c9a84c88';
        ctx.beginPath();
        ctx.moveTo(ex2, ey2);
        ctx.lineTo(
          ex2 - 10 * Math.cos(headAngle - 0.4),
          ey2 - 10 * Math.sin(headAngle - 0.4)
        );
        ctx.lineTo(
          ex2 - 10 * Math.cos(headAngle + 0.4),
          ey2 - 10 * Math.sin(headAngle + 0.4)
        );
        ctx.fill();
        // Formation label
        ctx.font = '10px Georgia';
        ctx.fillStyle = '#c9a84c';
        ctx.textAlign = 'center';
        ctx.fillText(reg.formation.toUpperCase(), reg.x, reg.y - 55);
        ctx.textAlign = 'left';
        ctx.restore();
      }
    }

    // Arrows
    for (const a of arrows) drawArrowVis(ctx, a);

    // HUD overlays
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CW, 26);
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#c9a84c';
    ctx.textAlign = 'left';
    ctx.fillText(`Wave ${simRef.current.wave}`, 10, 17);
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'right';
    ctx.fillText(`Frame ${simRef.current.frame}`, CW - 10, 17);
    ctx.textAlign = 'left';

    // Wave message
    if (waveMsg) {
      ctx.font = 'bold 20px Georgia';
      ctx.fillStyle = '#c9a84c';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#c9a84c';
      ctx.shadowBlur = 10;
      ctx.fillText(waveMsg, CW / 2, BATTLE_H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }

    // Battle result overlay
    if (showResult) {
      const isVictory = resultWinner === 'player';
      ctx.fillStyle = isVictory ? 'rgba(0,30,0,0.7)' : 'rgba(50,0,0,0.7)';
      ctx.fillRect(0, 0, CW, BATTLE_H);
      ctx.textAlign = 'center';
      ctx.font = 'bold 58px Georgia';
      ctx.fillStyle = isVictory ? '#c9a84c' : '#ef4444';
      ctx.shadowColor = isVictory ? '#c9a84c' : '#ef4444';
      ctx.shadowBlur = 22;
      ctx.fillText(isVictory ? 'VICTORIA!' : 'DEFEAT', CW / 2, BATTLE_H / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.font = '20px Georgia';
      ctx.fillStyle = '#f5e6c8';
      ctx.fillText(
        isVictory
          ? `${simRef.current.wave} wave${simRef.current.wave > 1 ? 's' : ''} won! +${simRef.current.goldReward}g`
          : 'Your legion has been destroyed.',
        CW / 2, BATTLE_H / 2 + 35
      );
      ctx.textAlign = 'left';
    }

    // Panel background (below battle area)
    ctx.fillStyle = '#1a0d07';
    ctx.fillRect(0, BATTLE_H, CW, PANEL_H);
    ctx.strokeStyle = '#c9a84c44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BATTLE_H); ctx.lineTo(CW, BATTLE_H);
    ctx.stroke();

    // Update UI panel (throttled to every 6 frames)
    if (frameRef.current % 6 === 0) {
      setSelectedId(simRef.current.selectedId);
      setUiTick(f => f + 1);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [showResult, waveMsg]); // deps kept minimal

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-start loop when showResult/waveMsg changes (deps in loop)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [loop]);

  // ── Canvas click / tap ────────────────────────────────────────────────────
  const handleCanvasInput = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    if (cy > BATTLE_H) return; // click in panel area — handled by HTML buttons

    const sim = simRef.current;
    const selectedReg = sim.regiments.find(r => r.id === sim.selectedId && r.side === 'player');

    // 1. Check if click hits a player regiment
    for (const reg of sim.regiments) {
      if (reg.side !== 'player' || reg.state === 'dead') continue;
      if (Math.hypot(cx - reg.x, cy - reg.y) < 50) {
        simRef.current = { ...sim, selectedId: reg.id };
        setSelectedId(reg.id);
        return;
      }
    }

    if (!selectedReg) return;

    // 2. Click on enemy → attack
    for (const reg of sim.regiments) {
      if (reg.side !== 'enemy' || reg.state === 'dead') continue;
      if (Math.hypot(cx - reg.x, cy - reg.y) < 50) {
        simRef.current = {
          ...sim,
          commandMode: 'attack',
          regiments: sim.regiments.map(r =>
            r.id === selectedReg.id
              ? { ...r, targetId: reg.id, order: 'charge' }
              : r
          ),
        };
        return;
      }
    }

    // 3. Click on ground → move
    simRef.current = {
      ...sim,
      commandMode: 'move',
      regiments: sim.regiments.map(r =>
        r.id === selectedReg.id
          ? { ...r, moveTarget: { x: cx, y: cy }, order: 'advance', targetId: null }
          : r
      ),
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasInput(e.clientX, e.clientY);
  }, [handleCanvasInput]);

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch) handleCanvasInput(touch.clientX, touch.clientY);
  }, [handleCanvasInput]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const formations: FormationType[] = ['line', 'wedge', 'testudo', 'loose', 'square', 'skirmish'];

    const onKey = (e: KeyboardEvent) => {
      const sim = simRef.current;
      const selId = sim.selectedId;
      if (!selId) return;

      const issueOrder = (order: UnitOrder, extra?: Partial<Regiment>) => {
        simRef.current = {
          ...sim,
          regiments: sim.regiments.map(r =>
            r.id === selId && r.side === 'player'
              ? { ...r, order, ...extra }
              : r
          ),
        };
      };

      switch (e.key.toLowerCase()) {
        case 'a': {
          // Attack nearest enemy
          const enemies = sim.regiments.filter(r => r.side === 'enemy' && r.state !== 'dead');
          const sel = sim.regiments.find(r => r.id === selId);
          if (sel && enemies.length > 0) {
            const nearest = enemies.reduce((best, r) =>
              Math.hypot(r.x - sel.x, r.y - sel.y) < Math.hypot(best.x - sel.x, best.y - sel.y) ? r : best
            );
            issueOrder('charge', { targetId: nearest.id });
          }
          break;
        }
        case 's': issueOrder('hold', { moveTarget: null }); break;
        case 'f': {
          const sel = sim.regiments.find(r => r.id === selId);
          if (sel) {
            const idx = formations.indexOf(sel.formation);
            const next = formations[(idx + 1) % formations.length];
            const updated = rebuildFormation({ ...sel, formation: next });
            simRef.current = {
              ...sim,
              regiments: sim.regiments.map(r => r.id === selId ? updated : r),
            };
          }
          break;
        }
        case 'r': issueOrder('retreat'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Handlers for panel buttons ────────────────────────────────────────────
  const selectRegiment = (id: string) => {
    simRef.current = { ...simRef.current, selectedId: id };
    setSelectedId(id);
  };

  const issueFormation = (f: FormationType) => {
    const sim = simRef.current;
    const selId = sim.selectedId;
    if (!selId) return;
    const sel = sim.regiments.find(r => r.id === selId);
    if (!sel) return;
    const updated = rebuildFormation({ ...sel, formation: f });
    simRef.current = { ...sim, regiments: sim.regiments.map(r => r.id === selId ? updated : r) };
    setUiTick(t => t + 1);
  };

  const issueOrder = (order: UnitOrder) => {
    const sim = simRef.current;
    const selId = sim.selectedId;
    if (!selId) return;
    simRef.current = {
      ...sim,
      regiments: sim.regiments.map(r =>
        r.id === selId && r.side === 'player'
          ? { ...r, order, ...(order === 'hold' ? { moveTarget: null } : {}) }
          : r
      ),
    };
    setUiTick(t => t + 1);
  };

  const handleReturnToCampaign = () => {
    const sim = simRef.current;
    const { battle: b } = useGameStore.getState();
    const survivorRatio = sim.regiments
      .filter(r => r.side === 'player')
      .reduce((sum, r) => sum + r.aliveTroopers / r.maxTroopers, 0) /
      Math.max(1, sim.regiments.filter(r => r.side === 'player').length);

    const store2 = useGameStore.getState();
    store2.updateBattleState({
      ...b,
      result: sim.winner === 'player' ? 'victory' : 'defeat',
      playerUnits: b.playerUnits.map(u => ({
        ...u,
        hp: Math.round(u.maxHp * Math.max(0.05, survivorRatio)),
        isAlive: survivorRatio > 0.05,
      })),
    });
    store2.resolveBattle();
  };

  const handleFightMore = () => {
    const sim = simRef.current;
    simRef.current = spawnEnemyWave(sim, origEnemyUnits.current, sim.wave + 1);
    setShowResult(false);
    setResultWinner(null);
  };

  // ── Panel data ────────────────────────────────────────────────────────────
  const sim = simRef.current;
  const playerRegs = sim.regiments.filter(r => r.side === 'player');
  const selectedReg = playerRegs.find(r => r.id === selectedId);

  const formations: FormationType[] = ['line', 'wedge', 'testudo', 'loose', 'square', 'skirmish'];
  const orders: UnitOrder[] = ['advance', 'hold', 'charge', 'retreat'];

  const btnStyle = (active: boolean, color = '#c9a84c'): React.CSSProperties => ({
    padding: '3px 8px',
    fontSize: '0.7rem',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal',
    background: active ? color : '#2c1810',
    color: active ? '#1a0f0a' : color,
    border: `1px solid ${color}55`,
    transition: 'background 0.15s',
  });

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '0.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia,serif', fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
          Battle — Wave {sim.wave}
        </h1>
        <span style={{ color: '#8a7050', fontSize: '0.75rem' }}>
          [A] Attack  [S] Hold  [F] Formation  [R] Retreat
        </span>
      </div>

      {/* Canvas */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #c9a84c44', marginBottom: '0.4rem', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: 'block', width: '100%', cursor: sim.commandMode === 'attack' ? 'crosshair' : 'default' }}
          onClick={handleClick}
          onTouchEnd={handleTouch}
        />
      </div>

      {/* Bottom UI panel — unit cards + commands */}
      <div style={{
        background: '#1a0d07',
        border: '1px solid #c9a84c33',
        borderRadius: 8,
        padding: '0.5rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'stretch',
      }}>
        {/* Unit cards scrollable */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}>
          {playerRegs.map(reg => {
            const hpRatio = reg.totalHp / Math.max(1, reg.maxTotalHp);
            const isSelected = reg.id === selectedId;
            const isRouting = reg.state === 'routing';
            return (
              <button
                key={reg.id}
                onClick={() => selectRegiment(reg.id)}
                style={{
                  minWidth: 70,
                  width: 70,
                  padding: '4px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isSelected ? '#2c1a0a' : '#1a0d07',
                  border: `2px solid ${isRouting ? '#ef4444' : isSelected ? '#c9a84c' : '#c9a84c33'}`,
                  color: '#f5e6c8',
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: '1.2rem' }}>{unitIcon(reg.unitType)}</div>
                <div style={{ fontSize: '0.6rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {reg.unitType}
                </div>
                {/* HP bar */}
                <div style={{ height: 4, background: '#2c1810', borderRadius: 2, marginBottom: 2 }}>
                  <div style={{
                    height: 4, borderRadius: 2,
                    width: `${hpRatio * 100}%`,
                    background: hpRatio > 0.6 ? '#4ade80' : hpRatio > 0.3 ? '#facc15' : '#ef4444',
                  }} />
                </div>
                {/* Morale bar */}
                <div style={{ height: 3, background: '#2c1810', borderRadius: 2, marginBottom: 2 }}>
                  <div style={{ height: 3, borderRadius: 2, width: `${reg.morale}%`, background: '#60a5fa' }} />
                </div>
                <div style={{ fontSize: '0.58rem', color: '#8a7050' }}>
                  {reg.aliveTroopers}/{reg.maxTroopers}
                </div>
                {isRouting && (
                  <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 'bold' }}>ROUTING</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Command panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 200 }}>
          {/* Formation buttons */}
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8a7050', marginBottom: 2 }}>FORMATION</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {formations.map(f => (
                <button
                  key={f}
                  onClick={() => issueFormation(f)}
                  style={btnStyle(selectedReg?.formation === f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {/* Order buttons */}
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8a7050', marginBottom: 2 }}>ORDER</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {orders.map(o => (
                <button
                  key={o}
                  onClick={() => issueOrder(o)}
                  style={btnStyle(
                    selectedReg?.order === o,
                    o === 'retreat' ? '#ef4444' : o === 'charge' ? '#f97316' : '#c9a84c'
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          {/* Selected unit info */}
          {selectedReg && (
            <div style={{ fontSize: '0.65rem', color: '#8a7050', borderTop: '1px solid #c9a84c22', paddingTop: 4 }}>
              <span style={{ color: '#c9a84c' }}>{selectedReg.name}</span>
              {' · '}{selectedReg.formation}{' · '}{selectedReg.order}
              {' · '}Morale {Math.round(selectedReg.morale)}
            </div>
          )}
        </div>
      </div>

      {/* Result overlay (HTML fallback / buttons) */}
      {showResult && (
        <div style={{
          marginTop: '0.5rem',
          background: resultWinner === 'player' ? '#0a1a0a' : '#1a0a0a',
          border: `2px solid ${resultWinner === 'player' ? '#c9a84c' : '#ef4444'}`,
          borderRadius: 8,
          padding: '1rem',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            fontFamily: 'Georgia,serif',
            color: resultWinner === 'player' ? '#c9a84c' : '#ef4444',
            marginBottom: '0.5rem',
          }}>
            {resultWinner === 'player'
              ? `VICTORIA! +${sim.goldReward}g`
              : 'DEFEAT — Your legion has fallen'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {resultWinner === 'player' && (
              <button
                onClick={handleFightMore}
                style={{
                  padding: '0.5rem 1.2rem', borderRadius: 6, cursor: 'pointer',
                  background: '#1a3a1a', color: '#4ade80',
                  border: '2px solid #4ade8055', fontWeight: 'bold',
                }}
              >
                Fight More Waves
              </button>
            )}
            <button
              onClick={handleReturnToCampaign}
              style={{
                padding: '0.5rem 1.4rem', borderRadius: 6, cursor: 'pointer',
                background: resultWinner === 'player' ? '#c9a84c' : '#8b1a1a',
                color: resultWinner === 'player' ? '#1a0f0a' : '#f5e6c8',
                border: `2px solid ${resultWinner === 'player' ? '#c9a84c' : '#ef4444'}`,
                fontWeight: 'bold', fontSize: '1rem',
              }}
            >
              {resultWinner === 'player' ? 'Return to Campaign' : 'Retreat to Map'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
