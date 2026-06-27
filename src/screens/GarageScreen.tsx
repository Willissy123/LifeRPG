import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getTeam } from '../data/teams2025';
import { USER_TEAM_ID } from '../data/drivers2025';
import { UPGRADE_COSTS, UpgradeArea, CarDevelopment } from '../types';

const UPGRADE_META: Record<UpgradeArea, { label: string; description: string; icon: string; color: string }> = {
  aero:        { label: 'Aerodynamics',   description: '-0.18% lap time per level. Downforce and drag reduction.', icon: '🌬', color: '#0090FF' },
  engine:      { label: 'Engine Power',   description: '-0.15% lap time per level. Top speed on straights.',      icon: '⚡', color: '#FF8800' },
  chassis:     { label: 'Chassis',        description: '-0.12% lap time per level. Mechanical grip and balance.', icon: '🔧', color: '#39B54A' },
  reliability: { label: 'Reliability',    description: '-3% DNF probability per level. Fewer mechanical failures.',icon: '🛡', color: '#CC00FF' },
  tyreComp:    { label: 'Tyre Compounds', description: '-5% tyre deg per level. Extends stints significantly.',   icon: '🏎', color: '#FF2800' },
};

const AREA_ORDER: UpgradeArea[] = ['aero', 'engine', 'chassis', 'reliability', 'tyreComp'];

interface ConfirmDialogProps {
  area: UpgradeArea;
  current: number;
  cost: number;
  budgetAfter: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ area, current, cost, budgetAfter, onConfirm, onCancel }: ConfirmDialogProps) {
  const meta = UPGRADE_META[area];
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
    }}>
      <div style={{ background: '#111120', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{meta.icon}</div>
        <h3 style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
          Upgrade {meta.label}
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Level {current} → {current + 1}<br />
          Cost: ${cost}M<br />
          Remaining after: ${budgetAfter.toFixed(1)}M
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: 'none', border: '1px solid #333', borderRadius: 8,
            padding: 14, color: '#888', fontSize: 14, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, background: '#E0C040', border: 'none', borderRadius: 8,
            padding: 14, color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
          }}>Purchase</button>
        </div>
      </div>
    </div>
  );
}

export default function GarageScreen() {
  const { currentSeason, purchaseUpgrade } = useGameStore();
  const { carDevelopment } = currentSeason;
  const userTeam = getTeam(USER_TEAM_ID);
  const teamColor = userTeam?.color ?? '#E0C040';
  const budget = carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent;

  const [pendingUpgrade, setPendingUpgrade] = useState<UpgradeArea | null>(null);

  const handleUpgrade = (area: UpgradeArea) => {
    const current = carDevelopment[area] as number;
    if (current >= 10) return;
    const cost = UPGRADE_COSTS[area][current];
    if (budget < cost) return;
    setPendingUpgrade(area);
  };

  const confirmUpgrade = () => {
    if (pendingUpgrade) {
      purchaseUpgrade(pendingUpgrade as keyof CarDevelopment);
      setPendingUpgrade(null);
    }
  };

  return (
    <div style={{ padding: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pendingUpgrade && (() => {
        const current = carDevelopment[pendingUpgrade] as number;
        const cost = UPGRADE_COSTS[pendingUpgrade][current];
        return (
          <ConfirmDialog
            area={pendingUpgrade}
            current={current}
            cost={cost}
            budgetAfter={budget - cost}
            onConfirm={confirmUpgrade}
            onCancel={() => setPendingUpgrade(null)}
          />
        );
      })()}

      {/* Header */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', borderLeft: `4px solid ${teamColor}` }}>
        <div>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 1 }}>{userTeam?.shortName}</div>
          <div style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
            Car Rating: <span style={{ color: teamColor, fontSize: 20 }}>{Math.round(carDevelopment.effectiveCarRating)}/100</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#888', fontSize: 9, letterSpacing: 1 }}>AVAILABLE BUDGET</div>
          <div style={{ color: '#E0C040', fontSize: 26, fontWeight: 'bold' }}>${budget.toFixed(1)}M</div>
          <div style={{ color: '#555', fontSize: 10 }}>Total earned: ${carDevelopment.totalBudgetEarned.toFixed(1)}M</div>
        </div>
      </div>

      <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>DEVELOPMENT PROGRAMME</div>
      <div style={{ color: '#555', fontSize: 11, lineHeight: 1.6, marginTop: -8 }}>
        Earn prize money by finishing in the points. Win: $8M · P2: $6M · P3: $5M · P10: $1M
      </div>

      {AREA_ORDER.map((area) => {
        const meta = UPGRADE_META[area];
        const current = carDevelopment[area] as number;
        const maxed = current >= 10;
        const nextCost = maxed ? null : UPGRADE_COSTS[area][current];
        const canAfford = nextCost !== null && budget >= nextCost;

        return (
          <div key={area} style={{ background: '#111120', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>{meta.label}</div>
                <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{meta.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ color: meta.color, fontSize: 26, fontWeight: 'bold' }}>{current}</span>
                <span style={{ color: '#555', fontSize: 14 }}>/10</span>
              </div>
            </div>

            {/* Level pips */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: i < current ? meta.color : '#222',
                }} />
              ))}
            </div>

            {/* Button */}
            {!maxed ? (
              <button
                onClick={() => handleUpgrade(area)}
                disabled={!canAfford}
                style={{
                  border: `1px solid ${canAfford ? meta.color : '#333'}`,
                  borderRadius: 8, padding: '12px 0',
                  background: 'none', cursor: canAfford ? 'pointer' : 'not-allowed',
                  color: canAfford ? '#FFF' : '#555',
                  fontWeight: 600, fontSize: 13, opacity: canAfford ? 1 : 0.5,
                }}
              >
                Upgrade to Lv{current + 1} — ${nextCost}M
              </button>
            ) : (
              <div style={{ background: '#1a2a1a', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <span style={{ color: '#39B54A', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>MAX LEVEL</span>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ background: '#111120', borderRadius: 12, padding: 16 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>MULTI-SEASON DEVELOPMENT</div>
        <p style={{ color: '#666', fontSize: 12, lineHeight: 1.6 }}>
          When you start a new season, you retain 50% of your upgrade levels.
          Your team grows with you over multiple seasons, just like a real F1 programme.
        </p>
      </div>
    </div>
  );
}
