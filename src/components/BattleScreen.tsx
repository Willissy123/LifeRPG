import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { tickBattle } from '../utils/battleEngine';
import type { BattleState, BattleUnit, Projectile } from '../types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const UNIT_SIZE = 32;

function drawBattlefield(ctx: CanvasRenderingContext2D) {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.35);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(1, '#b0d4e8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.35);

  // Ground
  const groundGrad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.35, 0, CANVAS_HEIGHT);
  groundGrad.addColorStop(0, '#5a8a3a');
  groundGrad.addColorStop(0.3, '#4a7a2a');
  groundGrad.addColorStop(1, '#6b4a2a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, CANVAS_HEIGHT * 0.35, CANVAS_WIDTH, CANVAS_HEIGHT * 0.65);

  // Dirt strip
  ctx.fillStyle = '#8b6a3a';
  ctx.fillRect(0, CANVAS_HEIGHT * 0.6, CANVAS_WIDTH, CANVAS_HEIGHT * 0.08);

  // Center line
  ctx.strokeStyle = '#ffffff33';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  // Side labels
  ctx.font = 'bold 11px Georgia';
  ctx.fillStyle = '#c9a84caa';
  ctx.textAlign = 'left';
  ctx.fillText('ROME', 10, 20);
  ctx.fillStyle = '#ff444488';
  ctx.textAlign = 'right';
  ctx.fillText('ENEMY', CANVAS_WIDTH - 10, 20);
  ctx.textAlign = 'left';
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: BattleUnit) {
  if (!unit.isAlive) return;

  const x = unit.x - UNIT_SIZE / 2;
  const y = unit.y - UNIT_SIZE / 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 2, y + 2, UNIT_SIZE, UNIT_SIZE);

  // Unit body
  ctx.fillStyle = unit.color;
  ctx.strokeStyle = unit.side === 'player' ? '#c9a84c' : '#ff4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, UNIT_SIZE, UNIT_SIZE, 4);
  } else {
    ctx.rect(x, y, UNIT_SIZE, UNIT_SIZE);
  }
  ctx.fill();
  ctx.stroke();

  // HP bar background
  const barW = UNIT_SIZE + 4;
  const barX = x - 2;
  const barY = y - 8;
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(barX, barY, barW, 4);

  const hpPct = unit.hp / unit.maxHp;
  const barColor = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#f97316' : '#ef4444';
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, Math.round(barW * hpPct), 4);

  // HP text
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${unit.hp}`, unit.x, barY - 1);

  // Unit type initial
  ctx.font = 'bold 12px Georgia';
  ctx.fillStyle = '#ffffffcc';
  ctx.fillText(unit.type[0], unit.x, unit.y + 5);

  ctx.textAlign = 'left';
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = proj.side === 'player' ? '#fbbf24' : '#f87171';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(proj.x, proj.y);
  ctx.lineTo(proj.x - proj.dx * 3, proj.y - proj.dy * 3);
  ctx.strokeStyle = proj.side === 'player' ? '#fbbf2455' : '#f8717155';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawOverlay(ctx: CanvasRenderingContext2D, result: 'victory' | 'defeat', goldReward: number) {
  ctx.fillStyle = result === 'victory' ? 'rgba(0,50,0,0.65)' : 'rgba(80,0,0,0.65)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.textAlign = 'center';
  ctx.font = 'bold 60px Georgia';
  ctx.fillStyle = result === 'victory' ? '#c9a84c' : '#ef4444';
  ctx.fillText(result === 'victory' ? 'VICTORIA!' : 'DEFEAT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  ctx.font = '20px Georgia';
  ctx.fillStyle = '#f5e6c8';
  ctx.fillText(
    result === 'victory'
      ? `The enemy has been routed! +${goldReward}g`
      : 'Your legion has been destroyed!',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 35
  );

  ctx.textAlign = 'left';
}

export default function BattleScreen() {
  const { battle, updateBattleState, resolveBattle } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const battleRef = useRef<BattleState>(battle);
  const isRunning = useRef(false);

  battleRef.current = battle;

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const b = battleRef.current;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBattlefield(ctx);

    for (const unit of b.playerUnits) drawUnit(ctx, unit);
    for (const unit of b.enemyUnits) drawUnit(ctx, unit);
    for (const proj of b.projectiles) drawProjectile(ctx, proj);

    // Stats HUD
    const playerAlive = b.playerUnits.filter((u) => u.isAlive).length;
    const enemyAlive = b.enemyUnits.filter((u) => u.isAlive).length;
    ctx.font = '12px Georgia';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a84c';
    ctx.fillText(`Rome: ${playerAlive}/${b.playerUnits.length}`, 10, CANVAS_HEIGHT - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Enemy: ${enemyAlive}/${b.enemyUnits.length}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
    ctx.textAlign = 'left';

    if (b.result === 'victory' || b.result === 'defeat') {
      drawOverlay(ctx, b.result, b.goldReward);
    }
  }, []);

  const loop = useCallback(() => {
    const b = battleRef.current;
    if (!b.isActive || b.result) {
      isRunning.current = false;
      renderFrame();
      return;
    }
    const next = tickBattle(b);
    updateBattleState(next);
    battleRef.current = next;
    renderFrame();
    rafRef.current = requestAnimationFrame(loop);
  }, [renderFrame, updateBattleState]);

  useEffect(() => {
    if (battle.isActive && !battle.result && !isRunning.current) {
      isRunning.current = true;
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      isRunning.current = false;
    };
  }, [battle.isActive, loop]);

  useEffect(() => {
    if (battle.result) {
      cancelAnimationFrame(rafRef.current);
      isRunning.current = false;
      renderFrame();
    }
  }, [battle.result, renderFrame]);

  // Initial render
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  const playerAlive = battle.playerUnits.filter((u) => u.isAlive).length;
  const enemyAlive = battle.enemyUnits.filter((u) => u.isAlive).length;
  const totalPlayerHp = battle.playerUnits.reduce((s, u) => s + u.hp, 0);
  const totalPlayerMaxHp = battle.playerUnits.reduce((s, u) => s + u.maxHp, 0);
  const totalEnemyHp = battle.enemyUnits.reduce((s, u) => s + u.hp, 0);
  const totalEnemyMaxHp = battle.enemyUnits.reduce((s, u) => s + u.maxHp, 0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h1 style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
          ⚔ Battle!
        </h1>
        <div style={{ color: '#8a7050', fontSize: '0.875rem' }}>
          Frame {battle.turn}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.75rem', border: '2px solid #c9a84c44' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      {/* HP bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#2c1810', border: '1px solid #c9a84c44', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#c9a84c' }}>🛡️ Rome</span>
            <span style={{ color: '#f5e6c8' }}>{playerAlive}/{battle.playerUnits.length} units</span>
          </div>
          <div style={{ width: '100%', borderRadius: '9999px', height: '0.75rem', background: '#1a0f0a' }}>
            <div style={{
              width: totalPlayerMaxHp > 0 ? `${(totalPlayerHp / totalPlayerMaxHp) * 100}%` : '0%',
              height: '0.75rem', borderRadius: '9999px', transition: 'width 0.3s',
              background: 'linear-gradient(to right, #c9a84c, #f0d080)'
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b5030', marginTop: '0.25rem' }}>
            {totalPlayerHp} / {totalPlayerMaxHp} HP
          </div>
        </div>

        <div style={{ background: '#2c1810', border: '1px solid #ef444444', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#ef4444' }}>⚔ Enemy</span>
            <span style={{ color: '#f5e6c8' }}>{enemyAlive}/{battle.enemyUnits.length} units</span>
          </div>
          <div style={{ width: '100%', borderRadius: '9999px', height: '0.75rem', background: '#1a0f0a' }}>
            <div style={{
              width: totalEnemyMaxHp > 0 ? `${(totalEnemyHp / totalEnemyMaxHp) * 100}%` : '0%',
              height: '0.75rem', borderRadius: '9999px', transition: 'width 0.3s',
              background: 'linear-gradient(to right, #8b1a1a, #ef4444)'
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b5030', marginTop: '0.25rem' }}>
            {totalEnemyHp} / {totalEnemyMaxHp} HP
          </div>
        </div>
      </div>

      {/* Unit lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#2c1810', border: '1px solid #c9a84c44', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <h3 style={{ color: '#c9a84c', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>Your Units</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {battle.playerUnits.map((unit) => (
              <div key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: unit.isAlive ? unit.color : '#3a2010' }} />
                <span style={{ color: unit.isAlive ? '#f5e6c8' : '#4a3020', textDecoration: unit.isAlive ? 'none' : 'line-through' }}>
                  {unit.type}
                </span>
                {unit.isAlive && (
                  <span style={{ color: unit.hp < unit.maxHp * 0.3 ? '#ef4444' : '#6b5030' }}>
                    {unit.hp}hp
                  </span>
                )}
                {!unit.isAlive && <span style={{ color: '#8b1a1a' }}>†</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#2c1810', border: '1px solid #ef444444', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <h3 style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Enemy Units</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {battle.enemyUnits.map((unit) => (
              <div key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: unit.isAlive ? unit.color : '#3a2010' }} />
                <span style={{ color: unit.isAlive ? '#f5e6c8' : '#4a3020', textDecoration: unit.isAlive ? 'none' : 'line-through' }}>
                  {unit.type}
                </span>
                {unit.isAlive && (
                  <span style={{ color: unit.hp < unit.maxHp * 0.3 ? '#ef4444' : '#6b5030' }}>
                    {unit.hp}hp
                  </span>
                )}
                {!unit.isAlive && <span style={{ color: '#8b1a1a' }}>†</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {battle.result && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem',
            color: battle.result === 'victory' ? '#c9a84c' : '#ef4444',
            fontFamily: 'Georgia, serif'
          }}>
            {battle.result === 'victory'
              ? `🏆 VICTORIA! +${battle.goldReward}g`
              : '💀 DEFEAT — Your army has fallen'}
          </div>
          <button
            onClick={resolveBattle}
            style={{
              padding: '0.75rem 2rem', borderRadius: '0.5rem', fontWeight: 'bold',
              fontSize: '1rem', cursor: 'pointer',
              background: battle.result === 'victory' ? '#c9a84c' : '#8b1a1a',
              color: battle.result === 'victory' ? '#1a0f0a' : '#f5e6c8',
              border: '2px solid #c9a84c55'
            }}
          >
            {battle.result === 'victory' ? '→ Claim Victory' : '→ Retreat to Map'}
          </button>
        </div>
      )}

      {battle.isActive && !battle.result && (
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#8a7050' }}>
          Battle in progress… {battle.turn} frames elapsed
        </div>
      )}
    </div>
  );
}
