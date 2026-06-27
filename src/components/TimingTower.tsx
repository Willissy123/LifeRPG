import React from 'react';
import { RaceCarState, RaceConditions } from '../types';
import { DRIVERS_2025 } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { formatGap, formatLapTime, tyreColor, tyreCompoundLabel } from '../engine/utils';

interface TimingTowerProps {
  cars: RaceCarState[];
  conditions: RaceConditions;
  currentLap: number;
  totalLaps: number;
  fastestLapHolder: string | null;
  raceFinished?: boolean;
}

export const TimingTower: React.FC<TimingTowerProps> = ({
  cars, conditions, currentLap, totalLaps, fastestLapHolder, raceFinished = false,
}) => {
  const sorted = [...cars].sort((a, b) => {
    if (a.status === 'retired' && b.status !== 'retired') return 1;
    if (b.status === 'retired' && a.status !== 'retired') return -1;
    return a.position - b.position;
  });

  return (
    <div style={{ flex: 1, background: '#0d0d18', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', borderBottom: '1px solid #222', flexShrink: 0,
      }}>
        <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>
          LAP {Math.min(currentLap, totalLaps)} / {totalLaps}
        </span>
        <span style={{ color: '#AAA', fontSize: 11 }}>
          {conditions.weather === 'dry' ? '☀️ DRY' :
           conditions.weather === 'light_rain' ? '🌧 INTER' : '⛈ WET'}
        </span>
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {sorted.map((car, idx) => {
          const driver = DRIVERS_2025.find((d) => d.id === car.driverId);
          const team = TEAMS_2025.find((t) => t.id === driver?.teamId);
          const teamColor = team?.color ?? '#888';
          const isUser = driver?.isUser ?? false;
          const isRetired = car.status === 'retired';
          const isFastestLap = fastestLapHolder === car.driverId;
          // Position change from race start (lap 1)
          const startPos = car.positionHistory && car.positionHistory.length > 0
            ? car.positionHistory[0]
            : car.position;
          const delta = startPos - car.position; // positive = gained places
          const showDelta = !raceFinished && !isRetired && delta !== 0;

          return (
            <div key={car.driverId} style={{
              display: 'flex', alignItems: 'center',
              padding: '5px 4px',
              borderBottom: '1px solid #181828',
              background: isUser ? '#1a1a08' : 'transparent',
              opacity: isRetired ? 0.45 : 1,
            }}>
              {/* Position */}
              <div style={{ width: 28, textAlign: 'center', position: 'relative' }}>
                <span style={{ color: isRetired ? '#666' : '#FFF', fontWeight: 'bold', fontSize: 13 }}>
                  {isRetired ? 'OUT' : car.position}
                </span>
                {showDelta && (
                  <span style={{
                    display: 'block', fontSize: 8, fontWeight: 'bold', lineHeight: 1,
                    color: delta > 0 ? '#39B54A' : '#FF4444',
                  }}>
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                )}
              </div>

              {/* Team colour strip */}
              <div style={{ width: 3, height: 28, borderRadius: 1.5, background: teamColor, margin: '0 4px', flexShrink: 0 }} />

              {/* Driver info */}
              <div style={{ flex: 1 }}>
                <div style={{ color: isRetired ? '#666' : '#FFF', fontWeight: 'bold', fontSize: 12 }}>
                  {driver?.shortName ?? '???'}{isFastestLap && !isRetired ? ' ⚡' : ''}
                </div>
                <div style={{ color: teamColor, fontSize: 9, marginTop: 1 }}>{team?.shortName ?? ''}</div>
              </div>

              {/* Tyre */}
              <div style={{
                background: tyreColor(car.tyreCompound) + '22',
                borderRadius: 4, padding: '2px 5px', margin: '0 4px',
                textAlign: 'center', minWidth: 30,
              }}>
                <div style={{ color: tyreColor(car.tyreCompound), fontWeight: 'bold', fontSize: 11 }}>
                  {car.tyreCompound}
                </div>
                <div style={{ color: '#888', fontSize: 8 }}>{car.tyreAgeLaps}L</div>
              </div>

              {/* Gap */}
              <span style={{
                color: isRetired ? '#666' : '#FFF', fontSize: 11,
                width: 56, textAlign: 'right', fontVariant: 'tabular-nums',
              }}>
                {isRetired ? `DNF L${car.dnfLap}` : idx === 0 ? 'LEADER' : formatGap(car.gapToLeader)}
              </span>

              {/* Last lap */}
              <span style={{
                color: isFastestLap ? '#CC00FF' : '#AAA', fontSize: 9,
                width: 60, textAlign: 'right', fontVariant: 'tabular-nums',
              }}>
                {car.lastLapTime > 0 ? formatLapTime(car.lastLapTime) : '---'}
              </span>

              {/* Pit indicator */}
              {car.inPitLane && (
                <div style={{
                  background: '#FF8800', borderRadius: 3,
                  padding: '1px 4px', marginLeft: 4,
                }}>
                  <span style={{ color: '#000', fontSize: 9, fontWeight: 'bold' }}>PIT</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
