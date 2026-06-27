import React, { useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getTeam } from '../data/teams2025';
import { USER_TEAM_ID } from '../data/drivers2025';
import { UPGRADE_COSTS, UpgradeArea, CarDevelopment } from '../types';
import { RadarChart } from '../components/RadarChart';
import { CarDiagram } from '../components/CarDiagram';

const UPGRADE_META: Record<UpgradeArea, { label: string; description: string; icon: string; color: string }> = {
  aero:        { label: 'Aerodynamics',   description: '-0.18% lap time per level. Downforce and drag reduction.', icon: '🌬', color: '#0090FF' },
  engine:      { label: 'Engine Power',   description: '-0.15% lap time per level. Top speed on straights.',      icon: '⚡', color: '#FF8800' },
  chassis:     { label: 'Chassis',        description: '-0.12% lap time per level. Mechanical grip and balance.', icon: '🔧', color: '#39B54A' },
  reliability: { label: 'Reliability',    description: '-3% DNF probability per level. Fewer mechanical failures.',icon: '🛡', color: '#CC00FF' },
  tyreComp:    { label: 'Tyre Compounds', description: '-5% tyre deg per level. Extends stints significantly.',   icon: '🏎', color: '#FF2800' },
};

const AREA_ORDER: UpgradeArea[] = ['aero', 'engine', 'chassis', 'reliability', 'tyreComp'];

interface ConfirmDialogProps {
  area: UpgradeArea; current: number; cost: number; budgetAfter: number;
  onConfirm: () => void; onCancel: () => void;
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
        <h3 style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>Upgrade {meta.label}</h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Level {current} → {current + 1}<br />Cost: ${cost}M<br />Remaining: ${budgetAfter.toFixed(1)}M
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'none', border: '1px solid #333', borderRadius: 8, padding: 14, color: '#888', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: '#E0C040', border: 'none', borderRadius: 8, padding: 14, color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>Purchase</button>
        </div>
      </div>
    </div>
  );
}

type Tab = 'upgrades' | 'sponsors' | 'save';

export default function GarageScreen() {
  const { currentSeason, purchaseUpgrade, activateSponsor, deactivateSponsor, sponsorDeals, exportSave, importSave, achievements } = useGameStore();
  const { carDevelopment, driverStandings } = currentSeason;
  const userTeam = getTeam(USER_TEAM_ID);
  const teamColor = userTeam?.color ?? '#E0C040';
  const budget = carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent;
  const userPoints = driverStandings.find((d) => d.driverId === 'user_player')?.points ?? 0;

  const [pendingUpgrade, setPendingUpgrade] = useState<UpgradeArea | null>(null);
  const [tab, setTab] = useState<Tab>('upgrades');
  const [importResult, setImportResult] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<UpgradeArea | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const upgradeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSelectPart = (area: UpgradeArea) => {
    setSelectedPart(area);
    const el = upgradeRefs.current[area];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const radarLevels: Record<UpgradeArea, number> = {
    aero: carDevelopment.aero, engine: carDevelopment.engine, chassis: carDevelopment.chassis,
    reliability: carDevelopment.reliability, tyreComp: carDevelopment.tyreComp,
  };

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

  const handleExport = () => {
    const json = exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liferpg-save-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const success = importSave(json);
      setImportResult(success ? 'Save imported successfully!' : 'Import failed — invalid save file.');
      setTimeout(() => setImportResult(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = achievements.filter((a) => !a.unlockedAt);

  return (
    <div style={{ padding: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pendingUpgrade && (() => {
        const current = carDevelopment[pendingUpgrade] as number;
        const cost = UPGRADE_COSTS[pendingUpgrade][current];
        return (
          <ConfirmDialog
            area={pendingUpgrade} current={current} cost={cost} budgetAfter={budget - cost}
            onConfirm={confirmUpgrade} onCancel={() => setPendingUpgrade(null)}
          />
        );
      })()}

      {/* Header */}
      <div style={{ background: '#111120', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', borderLeft: `4px solid ${teamColor}` }}>
        <div>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 1 }}>{userTeam?.shortName}</div>
          <div style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
            Car: <span style={{ color: teamColor, fontSize: 20 }}>{Math.round(carDevelopment.effectiveCarRating)}/100</span>
          </div>
          {carDevelopment.prizeMultiplier > 1 && (
            <div style={{ color: '#0090FF', fontSize: 11, marginTop: 4 }}>
              💼 Prize ×{carDevelopment.prizeMultiplier.toFixed(1)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#888', fontSize: 9, letterSpacing: 1 }}>BUDGET</div>
          <div style={{ color: '#E0C040', fontSize: 26, fontWeight: 'bold' }}>${budget.toFixed(1)}M</div>
          <div style={{ color: '#555', fontSize: 10 }}>Earned: ${carDevelopment.totalBudgetEarned.toFixed(1)}M</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#111120', borderRadius: 10, padding: 4, gap: 4 }}>
        {(['upgrades', 'sponsors', 'save'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, borderRadius: 8, padding: '10px 0', border: 'none', cursor: 'pointer',
            background: tab === t ? '#E0C040' : 'none',
            color: tab === t ? '#000' : '#888', fontWeight: tab === t ? 'bold' : 'normal', fontSize: 13,
            textTransform: 'capitalize',
          }}>
            {t === 'upgrades' ? '🔧 Dev' : t === 'sponsors' ? '💼 Sponsors' : '💾 Save'}
          </button>
        ))}
      </div>

      {/* Development tab */}
      {tab === 'upgrades' && (
        <>
          {/* Radar + car diagram */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, background: '#111120', borderRadius: 14, padding: 16 }}>
              <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>CAR PROFILE</div>
              <RadarChart
                color={teamColor}
                axes={[
                  { label: 'AERO', value: radarLevels.aero },
                  { label: 'ENGINE', value: radarLevels.engine },
                  { label: 'CHASSIS', value: radarLevels.chassis },
                  { label: 'RELIAB', value: radarLevels.reliability },
                  { label: 'TYRE', value: radarLevels.tyreComp },
                ]}
              />
            </div>
            <div style={{ flex: 1, minWidth: 150, background: '#111120', borderRadius: 14, padding: 16 }}>
              <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>TAP A PART</div>
              <CarDiagram levels={radarLevels} teamColor={teamColor} onSelectPart={handleSelectPart} selected={selectedPart} />
            </div>
          </div>

          <div style={{ color: '#555', fontSize: 11, lineHeight: 1.6 }}>
            Earn prize money by finishing in the points. Win: $8M · P2: $6M · P10: $1M
          </div>
          {AREA_ORDER.map((area) => {
            const meta = UPGRADE_META[area];
            const current = carDevelopment[area] as number;
            const maxed = current >= 10;
            const nextCost = maxed ? null : UPGRADE_COSTS[area][current];
            const canAfford = nextCost !== null && budget >= nextCost;
            return (
              <div
                key={area}
                ref={(el) => { upgradeRefs.current[area] = el; }}
                style={{
                  background: '#111120', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                  border: selectedPart === area ? `1px solid ${meta.color}` : '1px solid transparent',
                  transition: 'border 0.2s',
                }}
              >
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
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < current ? meta.color : '#222' }} />
                  ))}
                </div>
                {!maxed ? (
                  <button
                    onClick={() => handleUpgrade(area)} disabled={!canAfford}
                    style={{
                      border: `1px solid ${canAfford ? meta.color : '#333'}`,
                      borderRadius: 8, padding: '12px 0', background: 'none',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
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
              50% of upgrade levels carry over each season. Your team grows with you.
            </p>
          </div>

          {/* Achievements in dev tab */}
          {unlockedAchievements.length > 0 && (
            <div style={{ background: '#111120', borderRadius: 12, padding: 16 }}>
              <div style={{ color: '#E0C040', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
                ACHIEVEMENTS ({unlockedAchievements.length}/{achievements.length})
              </div>
              {unlockedAchievements.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <div>
                    <div style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 13 }}>{a.name}</div>
                    <div style={{ color: '#888', fontSize: 11 }}>{a.description}</div>
                  </div>
                </div>
              ))}
              {lockedAchievements.slice(0, 3).map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, opacity: 0.4 }}>
                  <span style={{ fontSize: 22 }}>🔒</span>
                  <div>
                    <div style={{ color: '#888', fontWeight: 'bold', fontSize: 13 }}>{a.name}</div>
                    <div style={{ color: '#555', fontSize: 11 }}>{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sponsors tab */}
      {tab === 'sponsors' && (
        <>
          <div style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
            Activate sponsor deals to get passive bonuses. Some deals require season points to unlock.
          </div>
          {sponsorDeals.map((deal) => {
            const unlocked = userPoints >= deal.requiredPoints;
            return (
              <div key={deal.id} style={{
                background: '#111120', borderRadius: 14, padding: 16,
                opacity: unlocked ? 1 : 0.5,
                border: deal.active ? '1px solid #E0C040' : '1px solid transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{deal.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>{deal.name}</div>
                    <div style={{ color: '#888', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>"{deal.tagline}"</div>
                  </div>
                  {deal.active && <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 11 }}>ACTIVE</span>}
                </div>
                <div style={{ background: '#1a1a2a', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <div style={{ color: '#39B54A', fontSize: 12, fontWeight: 600 }}>{deal.bonusDescription}</div>
                </div>
                {!unlocked ? (
                  <div style={{ color: '#555', fontSize: 12, textAlign: 'center' }}>
                    Requires {deal.requiredPoints} season points to unlock
                    {userPoints > 0 && ` (${deal.requiredPoints - userPoints} more needed)`}
                  </div>
                ) : (
                  <button
                    onClick={() => deal.active ? deactivateSponsor(deal.id) : activateSponsor(deal.id)}
                    style={{
                      width: '100%', borderRadius: 8, padding: '12px 0',
                      border: `1px solid ${deal.active ? '#FF4444' : '#E0C040'}`,
                      background: 'none', cursor: 'pointer',
                      color: deal.active ? '#FF4444' : '#E0C040',
                      fontWeight: 'bold', fontSize: 13,
                    }}
                  >
                    {deal.active ? 'Remove Sponsor' : 'Activate Sponsor'}
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Save tab */}
      {tab === 'save' && (
        <>
          {importResult && (
            <div style={{
              background: importResult.includes('success') ? '#0f1a0f' : '#1a0a0a',
              borderRadius: 10, padding: 12, textAlign: 'center',
            }}>
              <span style={{ color: importResult.includes('success') ? '#39B54A' : '#FF4444', fontWeight: 'bold' }}>
                {importResult}
              </span>
            </div>
          )}

          <div style={{ background: '#111120', borderRadius: 14, padding: 20 }}>
            <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Export Save</div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
              Download your complete save file as JSON. Use this to back up your progress or transfer to another device.
            </div>
            <button onClick={handleExport} style={{
              width: '100%', background: '#E0C040', borderRadius: 10, padding: '14px 0',
              border: 'none', color: '#000', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
            }}>
              📥 Download Save File
            </button>
          </div>

          <div style={{ background: '#111120', borderRadius: 14, padding: 20 }}>
            <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Import Save</div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
              Load a previously exported save file. This will replace your current progress.
            </div>
            <input type="file" ref={fileRef} accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', background: 'none', borderRadius: 10, padding: '14px 0',
              border: '1px solid #E0C040', color: '#E0C040', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
            }}>
              📤 Import Save File
            </button>
          </div>

          <div style={{ background: '#111120', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>SAVE INFO</div>
            <p style={{ color: '#666', fontSize: 12, lineHeight: 1.6 }}>
              Your game auto-saves after every session. Progress is stored in your browser's local storage and persists across sessions. Use export/import to move saves between browsers or devices.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
