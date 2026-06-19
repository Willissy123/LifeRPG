import type { BattleUnit, Projectile, BattleState } from '../types';

// Constants
const ATTACK_COOLDOWN_BASE = 60; // frames (~2s at 30fps)
const BATTLE_WIDTH = 800;
const BATTLE_HEIGHT = 400;
const UNIT_WIDTH = 36;
const UNIT_HEIGHT = 36;

let projectileCounter = 0;
function newProjectileId() {
  return `proj_${projectileCounter++}`;
}

// Find the nearest living enemy for a given unit
function findNearestEnemy(unit: BattleUnit, enemies: BattleUnit[]): BattleUnit | null {
  const alive = enemies.filter((e) => e.isAlive);
  if (alive.length === 0) return null;
  let nearest = alive[0];
  let minDist = dist(unit, nearest);
  for (const e of alive) {
    const d = dist(unit, e);
    if (d < minDist) {
      minDist = d;
      nearest = e;
    }
  }
  return nearest;
}

function dist(a: BattleUnit, b: BattleUnit) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Compute actual damage considering defense
function calcDamage(atk: number, def: number): number {
  const raw = atk - def * 0.4;
  const dmg = Math.max(2, Math.floor(raw + (Math.random() * 4 - 2)));
  return dmg;
}

export function tickBattle(state: BattleState): BattleState {
  if (!state.isActive || state.result !== null) return state;

  let playerUnits = state.playerUnits.map((u) => ({ ...u }));
  let enemyUnits = state.enemyUnits.map((u) => ({ ...u }));
  let projectiles: Projectile[] = state.projectiles.map((p) => ({ ...p }));
  const newProjectiles: Projectile[] = [];

  // Move and process each player unit
  for (const unit of playerUnits) {
    if (!unit.isAlive) continue;

    const target = enemyUnits.find((e) => e.id === unit.targetId && e.isAlive)
      ?? findNearestEnemy(unit, enemyUnits);

    unit.targetId = target?.id ?? null;

    if (!target) continue;

    const d = dist(unit, target);

    // Advance toward target if not in range
    if (d > unit.range) {
      const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      unit.x += Math.cos(angle) * unit.speed;
      unit.y += Math.sin(angle) * unit.speed;
      // Clamp
      unit.x = Math.max(UNIT_WIDTH / 2, Math.min(BATTLE_WIDTH / 2 - UNIT_WIDTH, unit.x));
    } else {
      // In range — attack
      unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
      if (unit.attackCooldown === 0) {
        unit.attackCooldown = ATTACK_COOLDOWN_BASE;
        const dmg = calcDamage(unit.atk, target.def);

        if (unit.isRanged) {
          // Fire projectile
          const speed = 4;
          const dx = (target.x - unit.x) / Math.max(1, Math.hypot(target.x - unit.x, target.y - unit.y)) * speed;
          const dy = (target.y - unit.y) / Math.max(1, Math.hypot(target.x - unit.x, target.y - unit.y)) * speed;
          newProjectiles.push({
            id: newProjectileId(),
            x: unit.x + UNIT_WIDTH,
            y: unit.y + UNIT_HEIGHT / 2,
            targetX: target.x,
            targetY: target.y + UNIT_HEIGHT / 2,
            dx,
            dy,
            damage: dmg,
            targetId: target.id,
            side: 'player',
          });
        } else {
          // Melee hit
          const tIdx = enemyUnits.findIndex((e) => e.id === target.id);
          if (tIdx >= 0) {
            enemyUnits[tIdx].hp = Math.max(0, enemyUnits[tIdx].hp - dmg);
            if (enemyUnits[tIdx].hp === 0) enemyUnits[tIdx].isAlive = false;
          }
        }
      }
    }
  }

  // Move and process each enemy unit
  for (const unit of enemyUnits) {
    if (!unit.isAlive) continue;

    const target = playerUnits.find((e) => e.id === unit.targetId && e.isAlive)
      ?? findNearestEnemy(unit, playerUnits);

    unit.targetId = target?.id ?? null;

    if (!target) continue;

    const d = dist(unit, target);

    if (d > unit.range) {
      const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      unit.x += Math.cos(angle) * unit.speed;
      unit.y += Math.sin(angle) * unit.speed;
      // Clamp
      unit.x = Math.max(BATTLE_WIDTH / 2 + UNIT_WIDTH, Math.min(BATTLE_WIDTH - UNIT_WIDTH, unit.x));
    } else {
      unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
      if (unit.attackCooldown === 0) {
        unit.attackCooldown = ATTACK_COOLDOWN_BASE;
        const dmg = calcDamage(unit.atk, target.def);

        if (unit.isRanged) {
          const speed = 4;
          const dx = (target.x - unit.x) / Math.max(1, Math.hypot(target.x - unit.x, target.y - unit.y)) * speed;
          const dy = (target.y - unit.y) / Math.max(1, Math.hypot(target.x - unit.x, target.y - unit.y)) * speed;
          newProjectiles.push({
            id: newProjectileId(),
            x: unit.x - UNIT_WIDTH,
            y: unit.y + UNIT_HEIGHT / 2,
            targetX: target.x,
            targetY: target.y + UNIT_HEIGHT / 2,
            dx,
            dy,
            damage: dmg,
            targetId: target.id,
            side: 'enemy',
          });
        } else {
          const tIdx = playerUnits.findIndex((e) => e.id === target.id);
          if (tIdx >= 0) {
            playerUnits[tIdx].hp = Math.max(0, playerUnits[tIdx].hp - dmg);
            if (playerUnits[tIdx].hp === 0) playerUnits[tIdx].isAlive = false;
          }
        }
      }
    }
  }

  // Move existing projectiles and apply hit
  const survivingProjectiles: Projectile[] = [];
  for (const proj of projectiles) {
    proj.x += proj.dx;
    proj.y += proj.dy;

    const arrived =
      Math.hypot(proj.x - proj.targetX, proj.y - proj.targetY) < 8;

    if (arrived) {
      // Apply damage
      if (proj.side === 'player') {
        const tIdx = enemyUnits.findIndex((e) => e.id === proj.targetId);
        if (tIdx >= 0 && enemyUnits[tIdx].isAlive) {
          enemyUnits[tIdx].hp = Math.max(0, enemyUnits[tIdx].hp - proj.damage);
          if (enemyUnits[tIdx].hp === 0) enemyUnits[tIdx].isAlive = false;
        }
      } else {
        const tIdx = playerUnits.findIndex((e) => e.id === proj.targetId);
        if (tIdx >= 0 && playerUnits[tIdx].isAlive) {
          playerUnits[tIdx].hp = Math.max(0, playerUnits[tIdx].hp - proj.damage);
          if (playerUnits[tIdx].hp === 0) playerUnits[tIdx].isAlive = false;
        }
      }
    } else {
      survivingProjectiles.push(proj);
    }
  }

  const allProjectiles = [...survivingProjectiles, ...newProjectiles];

  // Check battle end condition
  const playerAlive = playerUnits.filter((u) => u.isAlive).length;
  const enemyAlive = enemyUnits.filter((u) => u.isAlive).length;

  let result: BattleState['result'] = null;
  if (playerAlive === 0) result = 'defeat';
  else if (enemyAlive === 0) result = 'victory';

  return {
    ...state,
    playerUnits,
    enemyUnits,
    projectiles: allProjectiles,
    turn: state.turn + 1,
    result,
  };
}

export function buildBattleUnits(
  armyUnits: import('../types').ArmyUnit[],
  side: 'player' | 'enemy',
  count: number
): BattleUnit[] {
  const units = armyUnits.slice(0, count);
  const rows = Math.ceil(units.length / 2);
  const startX = side === 'player' ? 60 : BATTLE_WIDTH - 100;

  return units.map((u, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const spacingX = side === 'player' ? col * 50 : -col * 50;
    const spacingY = (row - rows / 2 + 0.5) * 60;

    return {
      id: u.id,
      type: u.type,
      side,
      x: startX + spacingX,
      y: BATTLE_HEIGHT / 2 + spacingY,
      hp: u.hp,
      maxHp: u.maxHp,
      atk: u.atk,
      def: u.def,
      isRanged: u.isRanged,
      speed: u.speed,
      range: u.range,
      color: u.color,
      attackCooldown: Math.floor(Math.random() * ATTACK_COOLDOWN_BASE),
      isAlive: true,
      targetId: null,
    };
  });
}
