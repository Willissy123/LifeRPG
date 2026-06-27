import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function RaceHistoryScreen() {
  const navigate = useNavigate();
  const { raceHistory } = useGameStore();

  const totalRaces = raceHistory.length;
  const wins = raceHistory.filter((r) => r.position === 1).length;
  const podiums = raceHistory.filter((r) => r.position !== null && r.position <= 3).length;
  const fastestLaps = raceHistory.filter((r) => r.fastestLap).length;

  // Newest first
  const ordered = [...raceHistory].reverse();

  return (
    <div style={{ padding: 20, paddingBottom: 60, background: '#0a0a0f', minHeight: '100%' }}>
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', color: '#E0C040', fontSize: 14,
        cursor: 'pointer', marginBottom: 16, padding: 0,
      }}>← Back</button>

      <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>CAREER</div>
      <h2 style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Career History</h2>

      {/* Stat summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <CareerStat label="Races" value={String(totalRaces)} color="#FFF" />
        <CareerStat label="Wins" value={String(wins)} color="#E0C040" />
        <CareerStat label="Podiums" value={String(podiums)} color="#39B54A" />
        <CareerStat label="FL" value={String(fastestLaps)} color="#CC00FF" />
      </div>

      {ordered.length === 0 && (
        <div style={{ color: '#666', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          No races completed yet. Get out on track!
        </div>
      )}

      {ordered.map((r, i) => {
        const prev = ordered[i - 1];
        const showSeasonDivider = !prev || prev.season !== r.season;
        const isWin = r.position === 1;
        const isPodium = r.position !== null && r.position <= 3;
        return (
          <React.Fragment key={`${r.season}-${r.raceIndex}-${i}`}>
            {showSeasonDivider && (
              <div style={{ color: '#555', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', margin: '16px 0 8px' }}>
                SEASON {r.season}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderRadius: 10, marginBottom: 8,
              background: isWin ? '#1a1a08' : isPodium ? '#10160f' : '#111120',
              border: isWin ? '1px solid #E0C040' : 'none',
            }}>
              <span style={{ fontSize: 24, width: 30 }}>{r.circuitFlag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>{r.circuitName}</div>
                <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                  Started P{r.gridPosition}{r.fastestLap ? ' · 💜 Fastest Lap' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 16, fontWeight: 'bold',
                  color: r.dnf ? '#FF4444' : isWin ? '#E0C040' : '#FFF',
                }}>
                  {r.dnf ? 'DNF' : `P${r.position}`}
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>+{r.points}pts</div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function CareerStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: '#111120', borderRadius: 10, padding: '12px 0', textAlign: 'center' }}>
      <div style={{ color, fontSize: 20, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>{label}</div>
    </div>
  );
}
