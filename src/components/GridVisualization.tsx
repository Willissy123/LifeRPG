import React, { useEffect, useState } from 'react';
import { QualifyingResult } from '../types';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';

interface Props {
  results: QualifyingResult[];
  maxRows?: number;
}

export const GridVisualization: React.FC<Props> = ({ results, maxRows = 10 }) => {
  const sorted = [...results].sort((a, b) => a.gridPosition - b.gridPosition).slice(0, maxRows * 2);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    sorted.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 50 * i));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return (
    <div style={{ background: '#0d0d18', borderRadius: 12, padding: 14 }}>
      <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 12 }}>
        STARTING GRID
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: maxRows }).map((_, row) => {
          // F1 staggered grid: pole (left) slightly ahead; alternate columns
          const leftIdx = row * 2;
          const rightIdx = row * 2 + 1;
          return (
            <div key={row} style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center' }}>
              <GridSlot result={sorted[leftIdx]} visible={leftIdx < revealed} offset />
              <GridSlot result={sorted[rightIdx]} visible={rightIdx < revealed} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

function GridSlot({ result, visible, offset }: { result?: QualifyingResult; visible: boolean; offset?: boolean }) {
  if (!result) return <div style={{ width: 110, height: 38 }} />;
  const driver = getDriver(result.driverId);
  const team = driver ? getTeam(driver.teamId) : null;
  const isUser = driver?.isUser ?? false;
  return (
    <div style={{
      width: 110, height: 38, marginTop: offset ? 0 : 16,
      display: 'flex', alignItems: 'center', gap: 6,
      background: isUser ? '#1a1a08' : '#15151f',
      border: isUser ? '1px solid #E0C040' : '1px solid #222',
      borderRadius: 6, padding: '0 6px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
    }}>
      <span style={{ color: isUser ? '#E0C040' : '#888', fontWeight: 'bold', fontSize: 12, width: 22 }}>
        P{result.gridPosition}
      </span>
      <div style={{ width: 3, height: 22, borderRadius: 2, background: team?.color ?? '#888' }} />
      <span style={{ color: isUser ? '#E0C040' : '#FFF', fontSize: 12, fontWeight: 600 }}>
        {driver?.shortName ?? '?'}
      </span>
    </div>
  );
}
