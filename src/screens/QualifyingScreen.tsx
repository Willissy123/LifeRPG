import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QualifyingResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { simulateQualifying } from '../engine/QualifyingEngine';
import { formatLapTime } from '../engine/utils';

type Phase = 'score_entry' | 'simulating' | 'results';

export default function QualifyingScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('score_entry');
  const [results, setResults] = useState<QualifyingResult[] | null>(null);

  const { completeQualifying, currentSeason } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  if (!circuit || !weekend) return null;

  const handleScoreConfirm = (score: DailyScore) => {
    setPhase('simulating');
    setTimeout(() => {
      const sim = simulateQualifying({
        circuit,
        lifeScore: score.qualifyingPace,
        prepBonus: weekend.prepBonus,
        carDev: currentSeason.carDevelopment,
      });
      completeQualifying(raceIndex, sim);
      setResults(sim);
      setPhase('results');
    }, 1000);
  };

  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel="Qualifying"
        onConfirm={handleScoreConfirm}
        onCancel={() => navigate(-1)}
        initialTodoist={70}
        initialSleep={8}
      />
    );
  }

  if (phase === 'simulating') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, background: '#0a0a0f',
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #333',
          borderTopColor: '#E0C040', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Running Q1 → Q2 → Q3...</div>
      </div>
    );
  }

  const userResult = results?.find((r) => getDriver(r.driverId)?.isUser);
  const q3Results = results?.filter((r) => !r.eliminated);
  const q2Results = results?.filter((r) => r.eliminated === 'Q2');
  const q1Results = results?.filter((r) => r.eliminated === 'Q1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #222', flexShrink: 0 }}>
        <div style={{ color: '#E0C040', fontSize: 11, letterSpacing: 2, fontWeight: 'bold' }}>QUALIFYING</div>
        <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>{circuit.name}</div>
        {userResult && (
          <div style={{ marginTop: 12, background: '#1a1a08', borderRadius: 8, padding: 14, textAlign: 'center' }}>
            <div style={{ color: '#888', fontSize: 10, letterSpacing: 2 }}>YOUR GRID POSITION</div>
            <div style={{ color: '#E0C040', fontSize: 48, fontWeight: 'bold', lineHeight: '52px' }}>
              P{userResult.gridPosition}
            </div>
            <div style={{ color: '#FFF', fontSize: 18, fontVariant: 'tabular-nums' }}>
              {formatLapTime(userResult.q3Time ?? userResult.q2Time ?? userResult.q1Time ?? 0)}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <QSection title="Q3 — TOP 10" items={q3Results} color="#FFFFFF" />
        <QSection title="Q2 ELIMINATED" items={q2Results} color="#FF8800" />
        <QSection title="Q1 ELIMINATED" items={q1Results} color="#FF4444" />
      </div>

      <button
        onClick={() => navigate(-1)}
        style={{
          margin: 16, background: '#E0C040', borderRadius: 10, padding: 16,
          border: 'none', color: '#000', fontWeight: 'bold', fontSize: 15, cursor: 'pointer',
        }}
      >
        Back to Race Weekend
      </button>
    </div>
  );
}

function QSection({ title, items, color }: { title: string; items: QualifyingResult[] | undefined; color: string }) {
  if (!items?.length) return null;
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ color, fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 }}>{title}</div>
      {items.map((r) => {
        const driver = getDriver(r.driverId);
        const team = driver ? getTeam(driver.teamId) : null;
        const isUser = driver?.isUser ?? false;
        const bestTime = r.q3Time ?? r.q2Time ?? r.q1Time;
        return (
          <div key={r.driverId} style={{
            display: 'flex', alignItems: 'center',
            padding: '9px 0', borderBottom: '1px solid #111',
            background: isUser ? '#1a1a08' : 'transparent',
          }}>
            <span style={{ color: isUser ? '#E0C040' : '#888', width: 36, fontSize: 13 }}>P{r.gridPosition}</span>
            <div style={{ width: 3, height: 26, borderRadius: 1.5, background: team?.color ?? '#888', margin: '0 8px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: isUser ? '#E0C040' : '#FFF', fontWeight: 600, fontSize: 13 }}>
                {driver?.shortName ?? '?'}{isUser ? ' (YOU)' : ''}
              </div>
              <div style={{ color: team?.color ?? '#888', fontSize: 10, marginTop: 1 }}>{team?.shortName}</div>
            </div>
            <span style={{ color: isUser ? '#E0C040' : '#CCC', fontSize: 13, fontVariant: 'tabular-nums' }}>
              {bestTime ? formatLapTime(bestTime) : '---'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
