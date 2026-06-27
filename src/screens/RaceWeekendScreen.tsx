import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver, USER_DRIVER_ID } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';
import { PaddockNewsFeed } from '../components/PaddockNewsFeed';
import { Skeleton } from '../components/Skeleton';

export default function RaceWeekendScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();
  const { currentSeason, rivalInfo, playerName } = useGameStore();
  const [challengesOpen, setChallengesOpen] = useState(false);
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  const cal = CALENDAR_2025[raceIndex];
  if (!circuit || !cal || !weekend) return <Skeleton rows={4} />;

  const userStanding = currentSeason.driverStandings.find((d) => d.driverId === USER_DRIVER_ID);
  const userPoints = userStanding?.points ?? 0;
  const accentColor = circuit.weatherRainChance >= 0.4 ? '#0090FF' : '#E0C040';
  const weeklyChallenges = weekend.weeklyChallenges ?? [];

  const {
    practiceResults, qualifyingResult, raceResult, userGridPosition,
    sprintQualifyingResult, sprintGridPosition, sprintRaceResult, hasSprint,
  } = weekend;

  const fp1Done   = !!practiceResults.fp1;
  const fp2Done   = !!practiceResults.fp2;
  const fp3Done   = !!practiceResults.fp3;
  const qualiDone = !!qualifyingResult;
  const raceDone  = !!raceResult;
  const sprintQualiDone = !!sprintQualifyingResult;
  const sprintDone = !!sprintRaceResult;

  const userRaceResult = raceResult?.find((r) => getDriver(r.driverId)?.isUser);
  const userSprintResult = sprintRaceResult?.find((r) => getDriver(r.driverId)?.isUser);
  const rivalDriver = rivalInfo ? getDriver(rivalInfo.driverId) : null;
  const rivalRaceResult = raceResult?.find((r) => r.driverId === rivalInfo?.driverId);

  function getUserPracticePos(session: 'fp1' | 'fp2' | 'fp3'): string | null {
    const results = practiceResults[session];
    if (!results) return null;
    const r = results.find((r) => getDriver(r.driverId)?.isUser);
    return r ? `P${r.position}` : '?';
  }

  const prepPct = Math.round(weekend.prepBonus * 100 / 0.05);
  const rainPct = Math.round(circuit.weatherRainChance * 100);
  const weatherLabel = rainPct < 15 ? 'Low rain risk' : rainPct < 40 ? 'Possible showers' : 'High rain risk';
  const weatherColor = rainPct < 15 ? '#39B54A' : rainPct < 40 ? '#E0C040' : '#FF4444';
  const weatherIcon  = rainPct < 15 ? '☀️' : rainPct < 40 ? '⛅' : '🌧';

  // Build session list — sprint weekends replace FP2/FP3 with Sprint Quali + Sprint Race
  type SessionItem = {
    key: string; label: string; desc: string;
    done: boolean; result: string | null; unlocked: boolean; onPress: () => void;
  };

  const sessions: SessionItem[] = [];

  sessions.push({
    key: 'FP1', label: 'Free Practice 1', desc: 'Learn the circuit. Setup and baseline.',
    done: fp1Done, result: fp1Done ? getUserPracticePos('fp1') : null,
    unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP1`),
  });

  if (!hasSprint) {
    sessions.push({
      key: 'FP2', label: 'Free Practice 2', desc: 'Long-run simulation. Race setup work.',
      done: fp2Done, result: fp2Done ? getUserPracticePos('fp2') : null,
      unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP2`),
    });
    sessions.push({
      key: 'FP3', label: 'Free Practice 3', desc: 'Qualifying simulation. Tightest results.',
      done: fp3Done, result: fp3Done ? getUserPracticePos('fp3') : null,
      unlocked: true, onPress: () => navigate(`/practice/${raceIndex}/FP3`),
    });
  } else {
    // Sprint weekend: Sprint Quali → Sprint Race (no FP2/FP3)
    sessions.push({
      key: 'SQ', label: 'Sprint Qualifying', desc: '1 timed lap each, top 15 set sprint grid.',
      done: sprintQualiDone,
      result: sprintQualiDone ? `P${sprintGridPosition ?? '?'} on sprint grid` : null,
      unlocked: fp1Done, onPress: () => navigate(`/sprint-qualifying/${raceIndex}`),
    });
    sessions.push({
      key: 'SR', label: 'Sprint Race', desc: `${Math.round(circuit.laps * 0.33)} laps — P1 scores 8pts, P8 scores 1pt.`,
      done: sprintDone,
      result: sprintDone
        ? (userSprintResult?.dnfLap
          ? `DNF (Lap ${userSprintResult.dnfLap})`
          : `P${userSprintResult?.position ?? '?'} — +${userSprintResult?.points ?? 0}pts`)
        : null,
      unlocked: sprintQualiDone, onPress: () => navigate(`/sprint/${raceIndex}`),
    });
  }

  sessions.push({
    key: 'Q', label: 'Qualifying', desc: 'Q1 → Q2 → Q3. Sleep + focus = grid slot.',
    done: qualiDone, result: qualiDone ? `P${userGridPosition ?? '?'} on grid` : null,
    unlocked: true, onPress: () => navigate(`/qualifying/${raceIndex}`),
  });
  sessions.push({
    key: 'R', label: 'Race', desc: `${circuit.laps} laps · Strategy choice + live pit calls.`,
    done: raceDone,
    result: raceDone
      ? (userRaceResult?.dnfLap ? `DNF (Lap ${userRaceResult.dnfLap})` : `P${userRaceResult?.position ?? '?'} — +${userRaceResult?.points ?? 0}pts`)
      : null,
    unlocked: qualiDone, onPress: () => navigate(`/race/${raceIndex}`),
  });

  return (
    <div style={{ padding: 20, paddingBottom: 40, borderTop: `3px solid ${accentColor}` }}>
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', color: '#E0C040', fontSize: 14,
        cursor: 'pointer', marginBottom: 16, padding: 0,
      }}>← Back</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 44 }}>{circuit.flag}</span>
        <div>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 2 }}>ROUND {cal.round} · {cal.date}</div>
          <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 2 }}>{circuit.name}</div>
          <div style={{ color: '#AAA', fontSize: 13, marginTop: 2 }}>{circuit.location}, {circuit.country}</div>
          {hasSprint && (
            <div style={{ color: '#FF8800', fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 }}>⚡ SPRINT WEEKEND</div>
          )}
        </div>
      </div>

      {/* Paddock news feed */}
      <PaddockNewsFeed
        circuitId={circuit.id}
        raceIndex={raceIndex}
        userPoints={userPoints}
        rivalName={rivalDriver?.name ?? null}
        weather={circuit.weatherRainChance}
        playerName={playerName}
      />

      {/* Weekly challenges */}
      {weeklyChallenges.length > 0 && (
        <div style={{ background: '#111120', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
          <button
            onClick={() => setChallengesOpen((o) => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', padding: 14,
            }}
          >
            <span style={{ color: '#E0C040', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' }}>
              🎯 WEEKLY CHALLENGES ({weeklyChallenges.filter((c) => c.completed).length}/{weeklyChallenges.length})
            </span>
            <span style={{ color: '#888', fontSize: 16 }}>{challengesOpen ? '−' : '+'}</span>
          </button>
          {challengesOpen && (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weeklyChallenges.map((c) => (
                <div key={c.id} style={{
                  background: c.completed ? '#0d1a0d' : '#1a1a2a', borderRadius: 8, padding: 10,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{c.completed ? '✅' : '⬜'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: c.completed ? '#39B54A' : '#FFF', fontSize: 13, fontWeight: 600 }}>{c.description}</div>
                    <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{c.reward}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weather forecast */}
      <div style={{ background: '#111120', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>WEATHER FORECAST</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{weatherIcon}</span>
          <div>
            <div style={{ color: weatherColor, fontWeight: 'bold', fontSize: 15 }}>{weatherLabel}</div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{rainPct}% rain probability</div>
          </div>
          <div style={{ flex: 1, height: 8, background: '#1a1a2a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: 8, width: `${rainPct}%`, background: rainPct < 15 ? '#39B54A' : rainPct < 40 ? '#E0C040' : '#0090FF', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
          Track: {Math.round(28 + circuit.weatherRainChance * 20)}°C air · {Math.round(38 + circuit.weatherRainChance * 15)}°C surface
        </div>
      </div>

      {/* Circuit stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {[
          ['Laps', String(circuit.laps)],
          ['Length', `${circuit.lengthKm}km`],
          ['DRS', String(circuit.drsZones)],
          ['Overtaking', `${11 - circuit.overtakingDifficulty}/10`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#1a1a2a', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{value}</div>
            <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Rival tracker */}
      {rivalDriver && raceDone && rivalRaceResult && (
        <div style={{ background: '#1a0a0a', borderRadius: 10, padding: 12, marginBottom: 16, borderLeft: '3px solid #FF4444' }}>
          <div style={{ color: '#FF4444', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>RIVAL — {rivalDriver.name.toUpperCase()}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>
                Finished P{rivalRaceResult.position}
              </span>
              <span style={{ color: '#888', fontSize: 12 }}> · +{rivalRaceResult.points}pts</span>
            </div>
            <div style={{ color: rivalInfo!.gapToRival >= 0 ? '#39B54A' : '#FF4444', fontWeight: 'bold', fontSize: 14 }}>
              {rivalInfo!.gapToRival >= 0 ? `You +${rivalInfo!.gapToRival}` : `Rival +${Math.abs(rivalInfo!.gapToRival)}`}
            </div>
          </div>
        </div>
      )}

      {/* Prep bonus */}
      {weekend.prepBonus > 0 && (
        <div style={{ background: '#0f1a0f', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ color: '#39B54A', fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>PRACTICE PREP BONUS</div>
          <div style={{ height: 6, background: '#1a2a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: 6, width: `${prepPct}%`, background: '#39B54A', borderRadius: 3 }} />
          </div>
          <div style={{ color: '#39B54A', fontSize: 12, fontWeight: 600 }}>
            +{(weekend.prepBonus * 100).toFixed(1)}% speed advantage in quali & race
          </div>
        </div>
      )}

      <div style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, marginBottom: 4 }}>
        WEEKEND SCHEDULE
      </div>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
        Each session can be completed on its own day. Progress saves automatically.
      </div>

      {sessions.map((s) => (
        <button
          key={s.key}
          onClick={s.unlocked && !s.done ? s.onPress : s.done ? s.onPress : undefined}
          disabled={!s.unlocked && !s.done}
          style={{
            display: 'flex', alignItems: 'center', width: '100%',
            background: s.done ? '#0d1a0d' : '#1a1a2a', borderRadius: 12,
            marginBottom: 10, padding: 16, gap: 14,
            border: 'none', cursor: (s.unlocked || s.done) ? 'pointer' : 'not-allowed',
            opacity: (s.unlocked || s.done) ? 1 : 0.5, textAlign: 'left',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: s.done ? '#39B54A' : (s.unlocked ? '#E0C040' : '#333'),
          }}>
            <span style={{ color: s.done ? '#FFF' : '#000', fontWeight: 'bold', fontSize: 12 }}>
              {s.done ? '✓' : s.key}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: s.unlocked ? '#FFF' : '#555', fontWeight: 'bold', fontSize: 14 }}>{s.label}</div>
            <div style={{ color: s.unlocked ? '#888' : '#444', fontSize: 12, marginTop: 2 }}>{s.desc}</div>
            {s.result && <div style={{ color: '#E0C040', fontWeight: 600, fontSize: 12, marginTop: 4 }}>{s.result}</div>}
          </div>
          {s.unlocked && !s.done && <span style={{ color: '#E0C040', fontSize: 22 }}>›</span>}
          {!s.unlocked && <span style={{ fontSize: 18 }}>🔒</span>}
          {s.done && <span style={{ fontSize: 18 }}>✓</span>}
        </button>
      ))}
    </div>
  );
}
