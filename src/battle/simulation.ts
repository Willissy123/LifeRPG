import type { BattleSim, Regiment, Trooper, VisArrow, VisDust } from './battleTypes';
import { getFormationOffsets } from './formations';

// Canvas dimensions (must match BattleScreen)
const CANVAS_W = 900;
const BATTLEFIELD_H = 380;

let arrowIdCounter = 0;

// ── helpers ──────────────────────────────────────────────────────────────────

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function calcDamage(atk: number, def: number): number {
  const raw = Math.max(1, atk - def * 0.4);
  return Math.max(1, Math.floor(raw * (0.8 + Math.random() * 0.4)));
}

/** Rotate a formation offset by regiment facing angle */
function rotateOffset(ox: number, oy: number, angle: number): { rx: number; ry: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { rx: ox * cos - oy * sin, ry: ox * sin + oy * cos };
}

/** Update trooper formation positions for a regiment */
export function applyFormation(reg: Regiment): Regiment {
  const offsets = getFormationOffsets(reg.formation, reg.maxTroopers);
  const newTroopers = reg.troopers.map((t, i) => {
    const off = offsets[i] ?? { x: 0, y: 0 };
    const { rx, ry } = rotateOffset(off.x, off.y, reg.facing);
    return { ...t, formOffX: rx, formOffY: ry };
  });
  return { ...reg, troopers: newTroopers };
}

// ── main tick ────────────────────────────────────────────────────────────────

export function tickSim(sim: BattleSim, deltaMs: number): BattleSim {
  if (sim.battleOver) return sim;

  const dt = Math.min(deltaMs / 16.67, 3); // normalize to ~60fps ticks, cap at 3x
  let regiments = sim.regiments.map(r => ({ ...r, troopers: r.troopers.map(t => ({ ...t })) }));
  let arrows = sim.arrows.map(a => ({ ...a }));
  let dusts = sim.dusts.map(d => ({ ...d }));

  // ── per-regiment update ──────────────────────────────────────────────────
  for (let ri = 0; ri < regiments.length; ri++) {
    const reg = regiments[ri];

    if (reg.state === 'dead') continue;

    // Check if all troopers dead
    const alive = reg.troopers.filter(t => t.state !== 'dead').length;
    if (alive === 0) {
      regiments[ri] = { ...reg, state: 'dead', aliveTroopers: 0 };
      continue;
    }

    // Morale rout check
    let updatedReg = { ...reg };
    if (updatedReg.morale < 20 && updatedReg.state !== 'routing') {
      updatedReg = { ...updatedReg, state: 'routing', order: 'retreat' };
    }

    // Routing: flee toward spawn edge
    if (updatedReg.state === 'routing') {
      const fleeDir = updatedReg.side === 'player' ? BATTLEFIELD_H + 50 : -50;
      const dy = fleeDir - updatedReg.y;
      const len = Math.abs(dy) || 1;
      updatedReg = {
        ...updatedReg,
        y: updatedReg.y + (dy / len) * updatedReg.speed * 1.5 * dt,
      };
      // Update trooper positions while routing
      updatedReg = moveTroopers(updatedReg, dt);
      // Remove if off-screen
      if (updatedReg.y > BATTLEFIELD_H + 100 || updatedReg.y < -100) {
        updatedReg = { ...updatedReg, state: 'dead' };
      }
      regiments[ri] = updatedReg;
      continue;
    }

    // Find target
    const enemies = regiments.filter(r =>
      r.side !== updatedReg.side &&
      r.state !== 'dead' &&
      r.aliveTroopers > 0
    );

    let targetReg: Regiment | null = null;
    if (updatedReg.targetId) {
      targetReg = regiments.find(r =>
        r.id === updatedReg.targetId &&
        r.state !== 'dead' &&
        r.aliveTroopers > 0
      ) ?? null;
    }
    if (!targetReg) {
      // Find closest enemy
      let minDist = Infinity;
      for (const e of enemies) {
        const d = dist2(updatedReg.x, updatedReg.y, e.x, e.y);
        if (d < minDist) { minDist = d; targetReg = e; }
      }
    }

    const targetDist = targetReg
      ? dist2(updatedReg.x, updatedReg.y, targetReg.x, targetReg.y)
      : Infinity;

    const engageRange = updatedReg.isRanged ? updatedReg.attackRange : 45;

    // ── Movement ──────────────────────────────────────────────────────────
    if (updatedReg.order !== 'hold' && updatedReg.order !== 'retreat') {
      if (updatedReg.moveTarget && !targetReg) {
        // Move to move target
        const dx = updatedReg.moveTarget.x - updatedReg.x;
        const dy = updatedReg.moveTarget.y - updatedReg.y;
        const d = Math.hypot(dx, dy);
        if (d > 5) {
          const spd = getSpeed(updatedReg) * dt;
          updatedReg = {
            ...updatedReg,
            x: updatedReg.x + (dx / d) * spd,
            y: updatedReg.y + (dy / d) * spd,
            facing: Math.atan2(dy, dx),
          };
        } else {
          updatedReg = { ...updatedReg, moveTarget: null };
        }
      } else if (targetReg && targetDist > engageRange) {
        // Advance toward enemy
        const dx = targetReg.x - updatedReg.x;
        const dy = targetReg.y - updatedReg.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = getSpeed(updatedReg) * dt;
        const newFacing = Math.atan2(dy, dx);
        updatedReg = {
          ...updatedReg,
          x: updatedReg.x + (dx / d) * spd,
          y: updatedReg.y + (dy / d) * spd,
          facing: newFacing,
          state: 'advancing',
        };
      }
    }

    // ── Attack ────────────────────────────────────────────────────────────
    if (targetReg && targetDist <= engageRange) {
      updatedReg = { ...updatedReg, state: 'fighting' };

      // Decrement cooldown
      const newCooldown = Math.max(0, updatedReg.attackCooldown - dt);
      updatedReg = { ...updatedReg, attackCooldown: newCooldown };

      if (newCooldown === 0) {
        // Deal damage to target
        const dmg = calcDamage(updatedReg.atk, targetReg.def);
        const tIdx = regiments.findIndex(r => r.id === targetReg!.id);
        if (tIdx >= 0) {
          const newHp = Math.max(0, regiments[tIdx].totalHp - dmg);
          const newMorale = Math.max(0, regiments[tIdx].morale - dmg * 0.15);
          regiments[tIdx] = { ...regiments[tIdx], totalHp: newHp, morale: newMorale };
          // Synchronize trooper deaths on target
          regiments[tIdx] = updateTrooperDeaths(regiments[tIdx]);
        }

        // Spawn arrow for ranged units
        if (updatedReg.isRanged && targetReg) {
          arrows.push({
            id: arrowIdCounter++,
            sx: updatedReg.x,
            sy: updatedReg.y,
            ex: targetReg.x,
            ey: targetReg.y,
            progress: 0,
            side: updatedReg.side,
            active: true,
          });
          // Dust on hit
          if (Math.random() < 0.3) {
            dusts.push(makeDust(targetReg.x + (Math.random() - 0.5) * 30, targetReg.y + (Math.random() - 0.5) * 20, 'dust'));
          }
        }

        // Reload
        const baseCooldown = updatedReg.isRanged ? 90 : 45;
        updatedReg = { ...updatedReg, attackCooldown: baseCooldown / dt };
      }
    } else if (updatedReg.state !== 'advancing') {
      updatedReg = { ...updatedReg, state: 'holding' };
    }

    // ── Flanking morale penalty ────────────────────────────────────────────
    let moraleFlankPenalty = 0;
    if (targetReg) {
      const dx = targetReg.x - updatedReg.x;
      const dy = targetReg.y - updatedReg.y;
      const angleToTarget = Math.atan2(dy, dx);
      const angleDiff = Math.abs(normalizeAngle(angleToTarget - updatedReg.facing));
      if (angleDiff > Math.PI * 0.6) moraleFlankPenalty = 0.17 * dt; // being attacked from flank/rear
    }
    if (moraleFlankPenalty > 0) {
      updatedReg = { ...updatedReg, morale: Math.max(0, updatedReg.morale - moraleFlankPenalty) };
    }

    // ── Handle order: retreat ──────────────────────────────────────────────
    if (updatedReg.order === 'retreat') {
      const fleeDir = updatedReg.side === 'player' ? BATTLEFIELD_H + 20 : -20;
      const dy = fleeDir - updatedReg.y;
      const len = Math.abs(dy) || 1;
      updatedReg = {
        ...updatedReg,
        y: updatedReg.y + (dy / len) * updatedReg.speed * dt,
      };
    }

    // Dust while advancing
    if (updatedReg.state === 'advancing' && Math.random() < 0.08 * dt) {
      dusts.push(makeDust(
        updatedReg.x + (Math.random() - 0.5) * 40,
        updatedReg.y + 10 + (Math.random() - 0.5) * 10,
        'dust'
      ));
    }

    // Combat sparks
    if (updatedReg.state === 'fighting' && Math.random() < 0.05 * dt) {
      dusts.push(makeDust(updatedReg.x + (Math.random() - 0.5) * 20, updatedReg.y, 'spark'));
    }

    // ── Update trooper world positions ────────────────────────────────────
    updatedReg = moveTroopers(updatedReg, dt);
    updatedReg = { ...updatedReg, aliveTroopers: updatedReg.troopers.filter(t => t.state !== 'dead').length };

    regiments[ri] = updatedReg;
  }

  // ── Advance arrows ──────────────────────────────────────────────────────
  arrows = arrows
    .map(a => ({ ...a, progress: a.progress + 0.04 * dt }))
    .filter(a => a.progress < 1.0);

  // ── Age dust ────────────────────────────────────────────────────────────
  dusts = dusts
    .map(d => ({
      ...d,
      x: d.x + d.vx * dt,
      y: d.y + d.vy * dt,
      vy: d.vy + 0.08 * dt,
      life: d.life - dt,
    }))
    .filter(d => d.life > 0);

  if (dusts.length > 300) dusts = dusts.slice(-300);

  // ── Death timer countdown ────────────────────────────────────────────────
  for (let ri = 0; ri < regiments.length; ri++) {
    const reg = regiments[ri];
    regiments[ri] = {
      ...reg,
      troopers: reg.troopers.map(t => {
        if (t.state === 'dead' && t.deathTimer > 0) {
          return { ...t, deathTimer: Math.max(0, t.deathTimer - dt) };
        }
        return t;
      }),
    };
  }

  // ── Win condition ───────────────────────────────────────────────────────
  const playerAlive = regiments.filter(r => r.side === 'player' && r.state !== 'dead' && r.aliveTroopers > 0).length;
  const enemyAlive = regiments.filter(r => r.side === 'enemy' && r.state !== 'dead' && r.aliveTroopers > 0).length;

  let battleOver = false;
  let winner: BattleSim['winner'] = null;

  if (enemyAlive === 0 && playerAlive > 0) {
    battleOver = true;
    winner = 'player';
  } else if (playerAlive === 0) {
    battleOver = true;
    winner = 'enemy';
  }

  return {
    ...sim,
    regiments,
    arrows,
    dusts,
    frame: sim.frame + 1,
    battleOver,
    winner,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getSpeed(reg: Regiment): number {
  const chargeMultiplier = reg.order === 'charge' ? 2 : 1;
  return reg.speed * chargeMultiplier;
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function makeDust(x: number, y: number, kind: VisDust['kind']): VisDust {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -Math.random() * 1.2,
    life: 20 + Math.random() * 15,
    maxLife: 35,
    kind,
    size: 2 + Math.random() * 3,
  };
}

/** Kill off troopers proportional to regiment HP loss */
function updateTrooperDeaths(reg: Regiment): Regiment {
  const shouldAlive = Math.round((reg.totalHp / Math.max(1, reg.maxTotalHp)) * reg.maxTroopers);
  let killCount = reg.aliveTroopers - shouldAlive;

  if (killCount <= 0) return reg;

  const newTroopers = reg.troopers.map(t => {
    if (killCount > 0 && t.state !== 'dead') {
      killCount--;
      return { ...t, state: 'dead' as const, deathTimer: 30 };
    }
    return t;
  });

  const newAlive = newTroopers.filter(t => t.state !== 'dead').length;
  return { ...reg, troopers: newTroopers, aliveTroopers: newAlive };
}

/** Lerp troopers toward their formation positions */
function moveTroopers(reg: Regiment, dt: number): Regiment {
  const isRouting = reg.state === 'routing';
  const lerpSpeed = 2 * dt;

  const newTroopers: Trooper[] = reg.troopers.map(t => {
    if (t.state === 'dead') return t;

    const targetX = isRouting
      ? t.x + (reg.side === 'player' ? 0 : 0) + (Math.random() - 0.5) * 3
      : reg.x + t.formOffX;
    const targetY = isRouting
      ? t.y + (reg.side === 'player' ? 2 : -2) * dt
      : reg.y + t.formOffY;

    const dx = targetX - t.x;
    const dy = targetY - t.y;
    const d = Math.hypot(dx, dy);

    let nx = t.x;
    let ny = t.y;
    if (d > 0.5) {
      const step = Math.min(lerpSpeed, d);
      nx = t.x + (dx / d) * step;
      ny = t.y + (dy / d) * step;
    }

    const newState: Trooper['state'] = isRouting
      ? 'rout'
      : reg.state === 'fighting' ? 'fight' : 'march';

    return { ...t, x: nx, y: ny, animTimer: t.animTimer + 1, state: newState };
  });

  return { ...reg, troopers: newTroopers };
}

/** Rebuild trooper formation offsets when formation changes */
export function rebuildFormation(reg: Regiment): Regiment {
  const offsets = getFormationOffsets(reg.formation, reg.maxTroopers);
  const newTroopers = reg.troopers.map((t, i) => {
    const off = offsets[i] ?? { x: 0, y: 0 };
    const { rx, ry } = rotateOff(off.x, off.y, reg.facing);
    return { ...t, formOffX: rx, formOffY: ry };
  });
  return { ...reg, troopers: newTroopers };
}

function rotateOff(ox: number, oy: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { rx: ox * cos - oy * sin, ry: ox * sin + oy * cos };
}
