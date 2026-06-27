import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PracticeResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { simulatePractice } from '../engine/PracticeEngine';
import { formatLapTime } from '../engine/utils';

type Phase = 'score_entry' | 'simulating' | 'results';

export default function PracticeScreen() {
  const { raceIndex: raceIndexStr, session } = useParams<{ raceIndex: string; session: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('score_entry');
  const [results, setResults] = useState<PracticeResult[] | null>(null);

  const { completePractice, currentSeason } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  if (!circuit || !weekend) return null;

  const sessionKey = (session ?? 'FP1').toLowerCase() as 'fp1' | 'fp2' | 'fp3';
  const sessionIndex = { fp1: 0, fp2: 1, fp3: 2 }[sessionKey] ?? 0;
  const prepBonus = weekend.prepBonus;

  const handleScoreConfirm = (score: DailyScore) => {
    setPhase('simulating');
    setTimeout(() => {
      const sim = simulatePractice({
        circuit,
        lifeScore: score.racePace,
        prepBonus,
        sessionIndex,
      });
      completePractice(raceIndex, sessionKey, sim);
      setResults(sim);
      setPhase('results');
    }, 800);
  };

  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel={session ?? 'FP1'}
        onConfirm={handleScoreConfirm}
        onCancel={() => navigate(-1)}
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
        <div style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Simulating {session}...</div>
        <div style={{ color: '#888', fontSize: 14 }}>{circuit.name}</div>
      </div>
    );
  }

  const userResult = results?.find((r) => getDriver(r.driverId)?.isUser);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f' }}>
      <div style={{ padding: 20, borderBottom: '1px solid #222', flexShrink: 0 }}>
        <div style={{ color: '#E0C040', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 }}>{session}</div>
        <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>{circuit.name}</div>
        {userResult && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginTop: 12,
            background: '#1a1a08', borderRadius: 8, padding: 12,
          }}>
            <span style={{ color: '#E0C040', fontSize: 28, fontWeight: 'bold' }}>P{userResult.position}</span>
            <span style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', fontVariant: 'tabular-nums' }}>
              {formatLapTime(userResult.lapTime)}
            </span>
            <span style={{ color: '#888', fontSize: 14 }}>
              {userResult.position === 1 ? 'FASTEST' : `+${userResult.gap.toFixed(3)}s`}
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {results?.map((r, idx) => {
          const driver = getDriver(r.driverId);
          const team = driver ? getTeam(driver.teamId) : null;
          const isUser = driver?.isUser ?? false;
          return (
            <div key={r.driverId} style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 16px', borderBottom: '1px solid #111',
              background: isUser ? '#1a1a08' : 'transparent',
            }}>
              <span style={{ color: isUser ? '#E0C040' : '#888', fontSize: 13, width: 32 }}>P{r.position}</span>
              <div style={{ width: 3, height: 28, borderRadius: 1.5, background: team?.color ?? '#888', margin: '0 8px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: 600 }}>
                  {driver?.shortName ?? '???'}{isUser ? ' (YOU)' : ''}
                </div>
                <div style={{ color: team?.color ?? '#888', fontSize: 10, marginTop: 2 }}>{team?.shortName ?? ''}</div>
              </div>
              <span style={{ color: isUser ? '#E0C040' : '#CCC', fontSize: 13, fontVariant: 'tabular-nums' }}>
                {formatLapTime(r.lapTime)}
              </span>
              <span style={{ color: '#666', fontSize: 11, width: 64, textAlign: 'right', fontVariant: 'tabular-nums' }}>
                {idx === 0 ? '' : `+${r.gap.toFixed(3)}`}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate(-1)}
        style={{
          margin: 16, background: '#1a1a2a', borderRadius: 10, padding: 16,
          border: 'none', color: '#FFF', fontWeight: 600, fontSize: 15, cursor: 'pointer',
        }}
      >
        Done — Back to Race Weekend
      </button>
    </div>
  );
}
