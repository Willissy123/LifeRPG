import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

export default function RaceWeekendScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();
  const { currentSeason } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  const cal = CALENDAR_2025[raceIndex];
  if (!circuit || !cal || !weekend) return null;

  const { practiceResults, qualifyingResult, raceResult, userGridPosition } = weekend;
  const fp1Done = !!practiceResults.fp1;
  const fp2Done = !!practiceResults.fp2;
  const fp3Done = !!practiceResults.fp3;
  const qualiDone = !!qualifyingResult;
  const raceDone = !!raceResult;

  const userRaceResult = raceResult?.find((r) => getDriver(r.driverId)?.isUser);

  function getUserPracticePos(session: 'fp1' | 'fp2' | 'fp3'): string | null {
    const results = practiceResults[session];
    if (!results) return null;
    const r = results.find((r) => getDriver(r.driverId)?.isUser);
    return r ? `P${r.position}` : '?';
  }

  const sessions = [
    {
      key: 'FP1', label: 'Free Practice 1', desc: 'Learn the circuit. High variance, setup testing.',
      done: fp1Done, result: fp1Done ? getUserPracticePos('fp1') : null,
      unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP1`),
    },
    {
      key: 'FP2', label: 'Free Practice 2', desc: 'Long-run pace simulation. Race setup work.',
      done: fp2Done, result: fp2Done ? getUserPracticePos('fp2') : null,
      unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP2`),
    },
    {
      key: 'FP3', label: 'Free Practice 3', desc: 'Qualifying simulation. Tightest results.',
      done: fp3Done, result: fp3Done ? getUserPracticePos('fp3') : null,
      unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP3`),
    },
    {
      key: 'Q', label: 'Qualifying', desc: 'Q1 → Q2 → Q3. Your sleep + focus determines grid position.',
      done: qualiDone, result: qualiDone ? `P${userGridPosition ?? '?'} on grid` : null,
      unlocked: true, onPress: () => navigate(`/qualifying/${raceIndex}`),
    },
    {
      key: 'R', label: 'Race', desc: `${circuit.laps} laps of ${circuit.location}. Real weather, tyres & strategy.`,
      done: raceDone,
      result: raceDone
        ? (userRaceResult?.dnfLap ? `DNF (Lap ${userRaceResult.dnfLap})` : `P${userRaceResult?.position ?? '?'} — +${userRaceResult?.points ?? 0} pts`)
        : null,
      unlocked: qualiDone, onPress: () => navigate(`/race/${raceIndex}`),
    },
  ];

  const prepPct = Math.round(weekend.prepBonus * 100 / 0.05);

  return (
    <div style={{ padding: 20, paddingBottom: 40 }}>
      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', color: '#E0C040', fontSize: 14,
        cursor: 'pointer', marginBottom: 16, padding: 0,
      }}>← Back</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 44 }}>{circuit.flag}</span>
        <div>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 2 }}>ROUND {cal.round} · {cal.date}</div>
          <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 2 }}>{circuit.name}</div>
          <div style={{ color: '#AAA', fontSize: 13, marginTop: 2 }}>{circuit.location}, {circuit.country}</div>
        </div>
      </div>

      {/* Circuit stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {[
          ['Laps', String(circuit.laps)],
          ['Length', `${circuit.lengthKm}km`],
          ['DRS Zones', String(circuit.drsZones)],
          ['Overtaking', `${11 - circuit.overtakingDifficulty}/10`],
          ['Rain Risk', `${Math.round(circuit.weatherRainChance * 100)}%`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#1a1a2a', borderRadius: 8, padding: 10, minWidth: 70, textAlign: 'center' }}>
            <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{value}</div>
            <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Prep bonus */}
      {weekend.prepBonus > 0 && (
        <div style={{ background: '#0f1a0f', borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <div style={{ color: '#39B54A', fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>Practice Prep Bonus</div>
          <div style={{ height: 6, background: '#1a2a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: 6, width: `${prepPct}%`, background: '#39B54A', borderRadius: 3 }} />
          </div>
          <div style={{ color: '#39B54A', fontSize: 12, fontWeight: 600 }}>
            +{(weekend.prepBonus * 100).toFixed(1)}% speed advantage
          </div>
        </div>
      )}

      <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, marginBottom: 4 }}>
        RACE WEEKEND SESSIONS
      </div>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
        Complete each session on its own day. Results save automatically.
      </div>

      {/* Session cards */}
      {sessions.map((s) => (
        <button
          key={s.key}
          onClick={s.unlocked ? s.onPress : undefined}
          disabled={!s.unlocked}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            background: s.done ? '#0d1a0d' : '#1a1a2a', borderRadius: 12,
            marginBottom: 10, padding: 16, gap: 14,
            border: 'none', cursor: s.unlocked ? 'pointer' : 'not-allowed',
            opacity: s.unlocked ? 1 : 0.5, textAlign: 'left',
          }}
        >
          <div>
            <div style={{
              width: 40, height: 40, borderRadius: 20, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: s.done ? '#39B54A' : s.unlocked ? '#E0C040' : '#333',
            }}>
              <span style={{ color: s.done ? '#FFF' : '#000', fontWeight: 'bold', fontSize: 13 }}>
                {s.done ? '✓' : s.key}
              </span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: s.unlocked ? '#FFF' : '#555', fontWeight: 'bold', fontSize: 14 }}>{s.label}</div>
            <div style={{ color: s.unlocked ? '#888' : '#444', fontSize: 12, marginTop: 2 }}>{s.desc}</div>
            {s.result && <div style={{ color: '#E0C040', fontWeight: 600, fontSize: 12, marginTop: 4 }}>{s.result}</div>}
          </div>
          {s.unlocked && !s.done && <span style={{ color: '#E0C040', fontSize: 22 }}>›</span>}
          {!s.unlocked && <span style={{ fontSize: 18 }}>🔒</span>}
        </button>
      ))}
    </div>
  );
}
