import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { tickBattle } from '../utils/battleEngine';
import type { BattleState, UnitType } from '../types';

const W = 800;
const H = 450;
const GROUND_Y = H * 0.42; // horizon line

// --- Visual types (client-only, not in store) ---
interface VSoldier {
  id: string;
  unitId: string;
  side: 'player' | 'enemy';
  type: UnitType;
  formOffsetX: number; // fixed offset from unit center
  formOffsetY: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: 'march' | 'idle' | 'fight' | 'dying' | 'dead';
  animTimer: number;
  deathTimer: number;
  facing: 1 | -1;
  isRanged: boolean;
  deadSoldierIndex: number; // order within unit for death progression
}

interface VArrow {
  id: string;
  sx: number; sy: number; // start
  ex: number; ey: number; // end
  progress: number;
  side: 'player' | 'enemy';
}

interface VParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  kind: 'dust' | 'blood' | 'spark';
  size: number;
}

// soldiers spawned per unit type
const SOLDIERS: Record<UnitType, number> = {
  Hastati: 9, Legionary: 7, Archer: 10,
  Equites: 5, Ballista: 4, Praetorian: 6,
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawGround(ctx: CanvasRenderingContext2D) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#6aaecc');
  sky.addColorStop(1, '#b8d8e8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // Far hills
  ctx.fillStyle = '#5a7a4a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.bezierCurveTo(150, GROUND_Y - 50, 300, GROUND_Y - 30, 400, GROUND_Y - 45);
  ctx.bezierCurveTo(550, GROUND_Y - 60, 700, GROUND_Y - 25, W, GROUND_Y - 35);
  ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

  // Ground
  const gr = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  gr.addColorStop(0, '#5a8a38'); gr.addColorStop(0.25, '#4d7a2a');
  gr.addColorStop(0.6, '#4a6820'); gr.addColorStop(1, '#5a4518');
  ctx.fillStyle = gr; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Dirt patch (battleground)
  const dirt = ctx.createLinearGradient(0, GROUND_Y + 30, 0, H - 30);
  dirt.addColorStop(0, 'rgba(120,90,40,0)');
  dirt.addColorStop(0.4, 'rgba(120,90,40,0.35)');
  dirt.addColorStop(1, 'rgba(120,90,40,0)');
  ctx.fillStyle = dirt;
  ctx.fillRect(W * 0.15, GROUND_Y, W * 0.7, H - GROUND_Y);

  // Grass tufts
  ctx.fillStyle = '#3a6a18';
  for (let i = 0; i < 28; i++) {
    const gx = ((i * 57 + 15) % W);
    const gy = GROUND_Y + 8 + ((i * 31) % 60);
    ctx.fillRect(gx, gy, 2, 5);
    ctx.fillRect(gx + 3, gy + 2, 2, 4);
  }

  // Battle line labels
  ctx.font = 'bold 11px Georgia';
  ctx.fillStyle = '#c9a84caa'; ctx.textAlign = 'left';
  ctx.fillText('ROMAN LEGIONS', 8, 18);
  ctx.fillStyle = '#ff444488'; ctx.textAlign = 'right';
  ctx.fillText('ENEMY FORCES', W - 8, 18);
  ctx.textAlign = 'left';
}

type SoldierColors = { body: string; helmet: string; shield: string; crest: string };
function soldierColors(type: UnitType, side: 'player' | 'enemy'): SoldierColors {
  if (side === 'player') {
    const body = type === 'Praetorian' ? '#6b0a0a' : '#8b1a1a';
    return { body, helmet: type === 'Praetorian' ? '#f0d080' : '#c9a84c', shield: '#7a1515', crest: '#cc2222' };
  }
  const map: Record<UnitType, SoldierColors> = {
    Hastati:    { body: '#2d5a27', helmet: '#888', shield: '#2d5a27', crest: '' },
    Legionary:  { body: '#1a3a6b', helmet: '#6a6a6a', shield: '#1a3a6b', crest: '#661111' },
    Archer:     { body: '#5a3a1a', helmet: '#778877', shield: '#5a3a1a', crest: '' },
    Equites:    { body: '#6b3a1a', helmet: '#887755', shield: '#6b3a1a', crest: '' },
    Ballista:   { body: '#4a4a2a', helmet: '#666', shield: '#4a4a2a', crest: '' },
    Praetorian: { body: '#4a1a6b', helmet: '#aaa', shield: '#4a1a6b', crest: '#881188' },
  };
  return map[type];
}

function drawSoldier(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  facing: 1 | -1,
  type: UnitType,
  side: 'player' | 'enemy',
  state: string,
  frame: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  const t = frame;
  const walking = state === 'march';
  const fighting = state === 'fight';
  const walkCycle = walking ? Math.sin(t * 0.13) : 0;
  const bob = walking ? Math.abs(Math.sin(t * 0.13)) * 1.8 : 0;
  const swing = fighting ? Math.sin(t * 0.28) * 0.7 : 0;
  const c = soldierColors(type, side);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);

  // ── Legs ──
  if (type === 'Equites') {
    // Horse body
    ctx.fillStyle = '#7a5518';
    ctx.beginPath();
    ctx.ellipse(5, 5, 12, 6, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Horse legs
    ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-5 + walkCycle * 5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(5 - walkCycle * 5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(11 + walkCycle * 5, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(17 - walkCycle * 5, 16); ctx.stroke();
    // Horse head
    ctx.fillStyle = '#7a5518';
    ctx.beginPath(); ctx.ellipse(18, 0, 6, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    // Reins
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(14, 0); ctx.stroke();
  } else {
    ctx.strokeStyle = c.body; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-3 + walkCycle * 4, 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(3 - walkCycle * 4, 13); ctx.stroke();
  }

  // ── Torso ──
  ctx.fillStyle = c.body;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-5, -14, 10, 18, 2);
  else ctx.rect(-5, -14, 10, 18);
  ctx.fill();

  // ── Shield (melee) ──
  if (type !== 'Archer' && type !== 'Ballista') {
    ctx.fillStyle = c.shield;
    if (ctx.roundRect) ctx.roundRect(-13, -18, 8, 21, 2);
    else ctx.rect(-13, -18, 8, 21);
    ctx.fill();
    ctx.strokeStyle = '#c9a84c66'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-13, -18, 8, 21);
    // Shield boss
    ctx.fillStyle = '#c9a84c';
    ctx.beginPath(); ctx.arc(-9, -7, 2.5, 0, Math.PI * 2); ctx.fill();
    // Design stripe
    ctx.strokeStyle = '#c9a84c44'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(-5, -7); ctx.stroke();
  }

  // ── Weapon / attack arm ──
  ctx.save();
  ctx.rotate(swing);

  if (type === 'Archer') {
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(8, -8, 10, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#d4a843'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8 + 10 * Math.cos(-1.1), -8 + 10 * Math.sin(-1.1));
    ctx.lineTo(8 + 10 * Math.cos(1.1), -8 + 10 * Math.sin(1.1));
    ctx.stroke();
  } else if (type === 'Equites') {
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(26, -30); ctx.stroke();
    ctx.fillStyle = '#cccccc';
    ctx.beginPath(); ctx.moveTo(26, -30); ctx.lineTo(20, -24); ctx.lineTo(28, -24); ctx.fill();
  } else if (type === 'Ballista') {
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(15, -20); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.moveTo(15, -20); ctx.lineTo(11, -16); ctx.lineTo(17, -16); ctx.fill();
  } else {
    // Gladius
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(17, -22); ctx.stroke();
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(14, -18); ctx.stroke(); // guard
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(7, -13); ctx.stroke(); // handle
  }
  ctx.restore();

  // ── Helmet ──
  ctx.fillStyle = c.helmet;
  ctx.beginPath(); ctx.arc(0, -20, 7, 0, Math.PI * 2); ctx.fill();
  // Cheek guards
  ctx.fillRect(-7, -22, 3, 7); ctx.fillRect(4, -22, 3, 7);
  // Neck guard
  ctx.fillRect(-5, -13, 10, 3);

  // ── Crest ──
  if (c.crest) {
    ctx.fillStyle = c.crest;
    ctx.beginPath();
    ctx.moveTo(-3, -27); ctx.lineTo(3, -27);
    ctx.bezierCurveTo(3, -37, -3, -37, -3, -27);
    ctx.fill();
  }

  // ── Face ──
  ctx.fillStyle = '#c4855a';
  ctx.beginPath(); ctx.arc(1, -20, 5, 0, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#3a1a08';
  ctx.beginPath(); ctx.arc(-0.5, -21, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5, -21, 0.9, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawDeadSoldier(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, type: UnitType, side: 'player' | 'enemy', alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + 8);
  ctx.rotate(facing * (Math.PI / 2 + 0.3));
  const c = soldierColors(type, side);
  ctx.fillStyle = c.body; ctx.fillRect(-4, -4, 18, 8);
  ctx.fillStyle = c.helmet; ctx.beginPath(); ctx.arc(12, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c4855a'; ctx.beginPath(); ctx.arc(12, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, arrow: VArrow) {
  const t = arrow.progress;
  const bx = (arrow.sx + arrow.ex) / 2;
  const by = Math.min(arrow.sy, arrow.ey) - 70;
  const px = (1 - t) * (1 - t) * arrow.sx + 2 * (1 - t) * t * bx + t * t * arrow.ex;
  const py = (1 - t) * (1 - t) * arrow.sy + 2 * (1 - t) * t * by + t * t * arrow.ey;
  const dx = 2 * (1 - t) * (bx - arrow.sx) + 2 * t * (arrow.ex - bx);
  const dy = 2 * (1 - t) * (by - arrow.sy) + 2 * t * (arrow.ey - by);
  const angle = Math.atan2(dy, dx);

  ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(2, -2); ctx.lineTo(2, 2); ctx.fill();
  ctx.fillStyle = arrow.side === 'player' ? '#ef4444' : '#22aa22';
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3); ctx.fill();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: VParticle[]) {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    if (p.kind === 'dust') { ctx.fillStyle = '#c4a870'; }
    else if (p.kind === 'blood') { ctx.fillStyle = '#cc1111'; }
    else { ctx.fillStyle = '#f0d080'; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawBattleResult(ctx: CanvasRenderingContext2D, result: 'victory' | 'defeat', gold: number) {
  ctx.fillStyle = result === 'victory' ? 'rgba(0,40,0,0.72)' : 'rgba(60,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px Georgia';
  ctx.fillStyle = result === 'victory' ? '#c9a84c' : '#ef4444';
  ctx.shadowColor = result === 'victory' ? '#c9a84c' : '#ef4444';
  ctx.shadowBlur = 20;
  ctx.fillText(result === 'victory' ? 'VICTORIA!' : 'DEFEAT', W / 2, H / 2 - 15);
  ctx.shadowBlur = 0;
  ctx.font = '20px Georgia'; ctx.fillStyle = '#f5e6c8';
  ctx.fillText(
    result === 'victory' ? `Territory captured! +${gold}g` : 'Your legion has been destroyed.',
    W / 2, H / 2 + 30
  );
  ctx.textAlign = 'left';
}

// Build initial visual soldiers from a BattleUnit
function spawnSoldiersForUnit(unitId: string, side: 'player' | 'enemy', type: UnitType, ux: number, uy: number, hp: number, maxHp: number, isRanged: boolean): VSoldier[] {
  const count = SOLDIERS[type];
  const cols = Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  const soldiers: VSoldier[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = (col - (cols - 1) / 2) * 22;
    const oy = (row - (rows - 1) / 2) * 28;
    // Start off-screen
    const startX = side === 'player' ? -80 : W + 80;
    soldiers.push({
      id: `vs_${unitId}_${i}`,
      unitId,
      side,
      type,
      formOffsetX: ox,
      formOffsetY: oy,
      x: startX,
      y: uy + oy,
      hp: hp / count,
      maxHp: maxHp / count,
      state: 'march',
      animTimer: Math.random() * 60,
      deathTimer: 0,
      facing: side === 'player' ? 1 : -1,
      isRanged,
      deadSoldierIndex: i,
    });
  }
  return soldiers;
}

let arrowCounter = 0;
let particleTime = 0;

// ─── Component ────────────────────────────────────────────────────────────────
export default function BattleScreen() {
  const { battle, updateBattleState, resolveBattle } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const battleRef = useRef<BattleState>(battle);
  const frameRef = useRef(0);
  const isRunning = useRef(false);
  const soldiersRef = useRef<VSoldier[]>([]);
  const arrowsRef = useRef<VArrow[]>([]);
  const particlesRef = useRef<VParticle[]>([]);
  const shakeRef = useRef({ x: 0, y: 0, life: 0 });

  // initialise visual soldiers once
  useEffect(() => {
    const all: VSoldier[] = [];
    for (const u of battle.playerUnits) {
      all.push(...spawnSoldiersForUnit(u.id, 'player', u.type, u.x, u.y, u.hp, u.maxHp, u.isRanged));
    }
    for (const u of battle.enemyUnits) {
      all.push(...spawnSoldiersForUnit(u.id, 'enemy', u.type, u.x, u.y, u.hp, u.maxHp, u.isRanged));
    }
    soldiersRef.current = all;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loop = useCallback(() => {
    const frame = ++frameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tick game engine every 2 frames
    if (!battleRef.current.result) {
      if (frame % 2 === 0) {
        const next = tickBattle(battleRef.current);
        updateBattleState(next);
        battleRef.current = next;
        // Camera shake on big damage events
        if (next.turn % 60 < 2) shakeRef.current = { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 4, life: 8 };
      }
    }

    const b = battleRef.current;
    const allUnits = [...b.playerUnits, ...b.enemyUnits];

    // ── Update visual soldiers ──────────────────────────────────────────────
    const updatedSoldiers = soldiersRef.current.map(s => {
      const ns = { ...s, animTimer: frame };
      if (ns.state === 'dead') return ns;

      const unit = allUnits.find(u => u.id === s.unitId);
      if (!unit) return ns;

      const hpRatio = unit.hp / unit.maxHp;
      const totalSoldiers = SOLDIERS[s.type];
      const shouldDie = s.deadSoldierIndex >= Math.round(hpRatio * totalSoldiers);

      if ((!unit.isAlive || shouldDie) && ns.state !== 'dying') {
        ns.state = 'dying';
        ns.deathTimer = 40 + Math.random() * 20;
        // Blood burst
        for (let i = 0; i < 4; i++) {
          particlesRef.current.push({
            x: ns.x, y: ns.y,
            vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1,
            life: 28, maxLife: 28, kind: 'blood', size: Math.random() * 3 + 1,
          });
        }
        shakeRef.current = { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 3, life: 6 };
      }

      if (ns.state === 'dying') {
        ns.deathTimer -= 1;
        if (ns.deathTimer <= 0) ns.state = 'dead';
        return ns;
      }

      // Update formation target based on unit position
      const targetFX = unit.x + s.formOffsetX;
      const targetFY = unit.y + s.formOffsetY;
      const dx = targetFX - ns.x;
      const dy = targetFY - ns.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const spd = ns.state === 'march' ? 1.8 : 0.8;
        ns.x += (dx / dist) * Math.min(spd, dist);
        ns.y += (dy / dist) * Math.min(spd, dist);
      }

      // State from engine
      const hasTarget = unit.targetId !== null;
      const target = hasTarget ? allUnits.find(u => u.id === unit.targetId) : null;
      const inRange = target ? Math.hypot(unit.x - target.x, unit.y - target.y) <= unit.range : false;
      ns.state = inRange ? 'fight' : 'march';

      // Dust when marching
      if (ns.state === 'march' && frame % 12 === 0 && Math.random() < 0.3) {
        particlesRef.current.push({
          x: ns.x, y: ns.y + 12,
          vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 0.8,
          life: 20, maxLife: 20, kind: 'dust', size: 3 + Math.random() * 2,
        });
      }

      // Spark on clash
      if (ns.state === 'fight' && frame % 8 === 0 && Math.random() < 0.15) {
        particlesRef.current.push({
          x: ns.x + (ns.facing === 1 ? 14 : -14), y: ns.y - 10,
          vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3,
          life: 12, maxLife: 12, kind: 'spark', size: 2,
        });
      }

      return ns;
    });
    soldiersRef.current = updatedSoldiers;

    // ── Spawn arrows from ranged units ──────────────────────────────────────
    for (const unit of allUnits) {
      if (!unit.isRanged || !unit.isAlive || !unit.targetId) continue;
      const target = allUnits.find(u => u.id === unit.targetId && u.isAlive);
      if (!target) continue;
      if (frame % 45 === Math.floor(unit.attackCooldown % 45)) {
        arrowsRef.current.push({
          id: `arrow_${arrowCounter++}`,
          sx: unit.x, sy: unit.y,
          ex: target.x, ey: target.y,
          progress: 0,
          side: unit.side,
        });
      }
    }

    // Advance arrows
    arrowsRef.current = arrowsRef.current
      .map(a => ({ ...a, progress: a.progress + 0.035 }))
      .filter(a => a.progress < 1.05);

    // Age particles
    particleTime++;
    particlesRef.current = particlesRef.current
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, vy: p.vy + 0.15 }))
      .filter(p => p.life > 0);
    if (particlesRef.current.length > 200) particlesRef.current = particlesRef.current.slice(-200);

    // Camera shake decay
    const sh = shakeRef.current;
    if (sh.life > 0) { sh.life--; sh.x *= 0.7; sh.y *= 0.7; }

    // ── Render ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (sh.life > 0) ctx.translate(sh.x, sh.y);

    drawGround(ctx);
    drawParticles(ctx, particlesRef.current);

    // Sort soldiers back-to-front by y for correct layering
    const sorted = [...soldiersRef.current].sort((a, b) => a.y - b.y);
    for (const s of sorted) {
      if (s.state === 'dead') {
        const alpha = Math.min(1, (s.animTimer - (s.animTimer - 40)) / 40); // fade slowly
        drawDeadSoldier(ctx, s.x, s.y, s.facing, s.type, s.side, 0.5);
      }
    }
    for (const s of sorted) {
      if (s.state === 'dead') continue;
      if (s.state === 'dying') {
        ctx.save(); ctx.globalAlpha = Math.max(0, s.deathTimer / 40);
        drawSoldier(ctx, s.x, s.y + (40 - s.deathTimer) * 0.15, s.facing, s.type, s.side, s.state, s.animTimer);
        ctx.restore();
      } else {
        drawSoldier(ctx, s.x, s.y, s.facing, s.type, s.side, s.state, s.animTimer);
      }
    }

    for (const arrow of arrowsRef.current) drawArrow(ctx, arrow);

    // HUD bottom bar
    const playerAlive = b.playerUnits.filter(u => u.isAlive).length;
    const enemyAlive = b.enemyUnits.filter(u => u.isAlive).length;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, H - 28, W, 28);
    ctx.font = 'bold 13px Georgia';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c9a84c';
    ctx.fillText(`⚔ Rome: ${playerAlive}/${b.playerUnits.length} units`, 10, H - 10);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ef4444';
    ctx.fillText(`Enemy: ${enemyAlive}/${b.enemyUnits.length} units ⚔`, W - 10, H - 10);
    ctx.textAlign = 'left';

    if (b.result === 'victory' || b.result === 'defeat') {
      drawBattleResult(ctx, b.result as 'victory' | 'defeat', b.goldReward);
    }

    ctx.restore();

    if (!b.result) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      isRunning.current = false;
    }
  }, [updateBattleState]);

  useEffect(() => {
    battleRef.current = battle;
    if (battle.isActive && !battle.result && !isRunning.current) {
      isRunning.current = true;
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(rafRef.current); isRunning.current = false; };
  }, [battle.isActive, loop]);

  useEffect(() => {
    if (battle.result) {
      cancelAnimationFrame(rafRef.current);
      isRunning.current = false;
      // Draw final frame with result overlay
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) drawBattleResult(ctx, battle.result as 'victory' | 'defeat', battle.goldReward);
    }
  }, [battle.result, battle.goldReward]);

  const pAlive = battle.playerUnits.filter(u => u.isAlive).length;
  const eAlive = battle.enemyUnits.filter(u => u.isAlive).length;
  const pTotalHp = battle.playerUnits.reduce((s, u) => s + u.hp, 0);
  const pMaxHp = battle.playerUnits.reduce((s, u) => s + u.maxHp, 0);
  const eTotalHp = battle.enemyUnits.reduce((s, u) => s + u.hp, 0);
  const eMaxHp = battle.enemyUnits.reduce((s, u) => s + u.maxHp, 0);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0.75rem' }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>
          ⚔ Battle!
        </h1>
        <span style={{ color: '#8a7050', fontSize: '0.8rem' }}>Turn {battle.turn}</span>
      </div>

      {/* Canvas */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #c9a84c', marginBottom: '0.6rem' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%' }} />
      </div>

      {/* HP bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
        {[
          { label: '🛡️ Rome', alive: pAlive, total: battle.playerUnits.length, hp: pTotalHp, maxHp: pMaxHp, color: '#c9a84c', grad: 'linear-gradient(to right, #c9a84c, #f0d080)' },
          { label: '⚔ Enemy', alive: eAlive, total: battle.enemyUnits.length, hp: eTotalHp, maxHp: eMaxHp, color: '#ef4444', grad: 'linear-gradient(to right, #8b1a1a, #ef4444)' },
        ].map(panel => (
          <div key={panel.label} style={{ background: '#2c1810', border: `1px solid ${panel.color}44`, borderRadius: 8, padding: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
              <span style={{ color: panel.color }}>{panel.label}</span>
              <span style={{ color: '#f5e6c8' }}>{panel.alive}/{panel.total}</span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#1a0f0a' }}>
              <div style={{ width: panel.maxHp > 0 ? `${(panel.hp / panel.maxHp) * 100}%` : '0%', height: 8, borderRadius: 4, background: panel.grad, transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Result */}
      {battle.result && (
        <div style={{ textAlign: 'center', padding: '0.75rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.6rem', color: battle.result === 'victory' ? '#c9a84c' : '#ef4444', fontFamily: 'Georgia, serif' }}>
            {battle.result === 'victory' ? `🏆 VICTORIA! +${battle.goldReward}g` : '💀 DEFEAT — Your army has fallen'}
          </div>
          <button
            onClick={resolveBattle}
            style={{ padding: '0.6rem 2rem', borderRadius: 8, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', background: battle.result === 'victory' ? '#c9a84c' : '#8b1a1a', color: battle.result === 'victory' ? '#1a0f0a' : '#f5e6c8', border: '2px solid #c9a84c55' }}
          >
            {battle.result === 'victory' ? '→ Claim Victory' : '→ Retreat to Map'}
          </button>
        </div>
      )}
    </div>
  );
}
