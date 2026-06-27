import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RaceState, FinishedRaceResult, StrategyChoice, TyreCompound } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { TrackMap } from '../components/TrackMap';
import { TimingTower } from '../components/TimingTower';
import { LapChart } from '../components/LapChart';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import { initRace, tickRace, finaliseRace, buildRaceConditions } from '../engine/RaceEngine';
import { getTrackLayout } from '../data/trackLayouts';
import { positionAlongTrack, formatLapTime } from '../engine/utils';

type Phase = 'strategy' | 'score_entry' | 'racing' | 'finished';
const SPEED_OPTIONS = [30, 60, 120, 300] as const;
const SPEED_LABELS: Record<number, string> = { 30: '½×', 60: '1×', 120: '2×', 300: '5×' };

const COMPOUND_COLORS: Record<TyreCompound, string> = {
  S: '#FF2800', M: '#E0C040', H: '#EEE', W: '#0090FF', I: '#39B54A',
};
const COMPOUND_NAMES: Record<TyreCompound, string> = {
  S: 'Soft', M: 'Medium', H: 'Hard', W: 'Wet', I: 'Inter',
};

export default function RaceScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('strategy');
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [simSpeed, setSimSpeed] = useState(60);
  const [raceScore, setRaceScore] = useState<DailyScore | null>(null);
  const [finalResults, setFinalResults] = useState<FinishedRaceResult[] | null>(null);
  const [strategyChoice, setStrategyChoice] = useState<StrategyChoice>({ startingCompound: 'M', pitWindow: 'medium' });
  const [engineerPrompt, setEngineerPrompt] = useState<{ message: string; lap: number } | null>(null);
  const [pitPromptShown, setPitPromptShown] = useState(false);
  const [startGrid, setStartGrid] = useState(20);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });

  const { currentSeason, completeRace, setStrategyChoice: storeStrategyChoice, engineer, sponsorDeals } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  if (!circuit || !weekend) return null;

  // Apply sponsor bonuses
  const focusSponsor = sponsorDeals.find((s) => s.bonusType === 'focus_boost' && s.active);
  const sleepSponsor = sponsorDeals.find((s) => s.bonusType === 'sleep_boost' && s.active);
  const focusBonus = focusSponsor?.bonusValue ?? 0;
  const sleepBonus = sleepSponsor?.bonusValue ?? 0;

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDims({ w, h: Math.round(w * 0.55) });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const finishRace = useCallback((state: RaceState, score: DailyScore, grid: number) => {
    stopTick();
    const results = finaliseRace(state, circuit!, currentSeason.carDevelopment);
    const isWet = state.conditions.weather !== 'dry';
    completeRace(raceIndex, results, grid, isWet);
    setFinalResults(results);
    setPhase('finished');
  }, [circuit, currentSeason.carDevelopment, raceIndex, completeRace, stopTick]);

  const startTick = useCallback((state: RaceState, speed: number, score: DailyScore, grid: number) => {
    stopTick();
    tickRef.current = setInterval(() => {
      setRaceState((prev) => {
        if (!prev || prev.status === 'finished') return prev;
        const next = tickRace(
          prev, circuit!, speed, score,
          weekend.prepBonus, currentSeason.carDevelopment,
          weekend.strategyBonus ?? 0,
        );

        const layout = getTrackLayout(circuit!.id);
        const waypoints = layout?.waypoints ?? circuit!.points;
        const updatedCars = next.cars.map((car) => ({
          ...car,
          trackPosition: positionAlongTrack(car.lapProgress, waypoints),
        }));

        const updated = { ...next, cars: updatedCars };
        if (updated.status === 'finished') {
          setTimeout(() => finishRace(updated, score, grid), 50);
        }
        return updated;
      });
    }, 100);
  }, [circuit, weekend, currentSeason.carDevelopment, stopTick, finishRace]);

  useEffect(() => { return () => stopTick(); }, [stopTick]);

  // Engineer "Box now?" prompt
  useEffect(() => {
    if (!raceState || pitPromptShown || phase !== 'racing') return;
    const userCar = raceState.cars.find((c) => c.driverId === USER_DRIVER_ID);
    if (!userCar || userCar.pitStops.length > 0 || !userCar.pitLap) return;
    if (userCar.currentLap >= userCar.pitLap - 1 && userCar.status === 'racing') {
      stopTick();
      setRaceState((prev) => prev ? { ...prev, status: 'paused' } : prev);
      setPitPromptShown(true);
      setEngineerPrompt({
        message: `Box box box! Pit this lap for fresh tyres. Gap to car behind: ${userCar.gapToCarAhead > 0 ? userCar.gapToCarAhead.toFixed(1) + 's' : 'N/A'}`,
        lap: userCar.currentLap,
      });
    }
  }, [raceState, pitPromptShown, phase, stopTick]);

  const handleEngineerDecision = (decision: 'pit' | 'stay' | 'delay') => {
    setEngineerPrompt(null);
    if (decision === 'delay') {
      setRaceState((prev) => {
        if (!prev) return prev;
        const cars = prev.cars.map((c) =>
          c.driverId === USER_DRIVER_ID && c.pitLap
            ? { ...c, pitLap: c.pitLap + 4 }
            : c
        );
        return { ...prev, cars, status: 'running' };
      });
      setPitPromptShown(false); // allow re-prompt in 4 laps
    } else if (decision === 'stay') {
      setRaceState((prev) => {
        if (!prev) return prev;
        const cars = prev.cars.map((c) =>
          c.driverId === USER_DRIVER_ID ? { ...c, pitLap: null } : c
        );
        return { ...prev, cars, status: 'running' };
      });
    } else {
      // pit now - trigger immediately
      setRaceState((prev) => {
        if (!prev) return prev;
        const cars = prev.cars.map((c) =>
          c.driverId === USER_DRIVER_ID && !c.inPitLane
            ? { ...c, inPitLane: true, pitTimer: 2.5, pitLap: null, status: 'pitting' as const }
            : c
        );
        return { ...prev, cars, status: 'running' };
      });
    }
    if (raceScore) {
      setRaceState((prev) => {
        if (prev) startTick(prev, simSpeed, raceScore, startGrid);
        return prev;
      });
    }
  };

  const handleStrategyConfirm = () => {
    storeStrategyChoice(raceIndex, strategyChoice);
    setPhase('score_entry');
  };

  const handleScoreConfirm = (score: DailyScore) => {
    setRaceScore(score);
    const gridOrder = weekend.qualifyingResult
      ? [...weekend.qualifyingResult].sort((a, b) => a.gridPosition - b.gridPosition).map((r) => r.driverId)
      : [USER_DRIVER_ID];
    const grid = weekend.userGridPosition ?? 20;
    setStartGrid(grid);
    const conditions = buildRaceConditions(circuit!);
    const initial = initRace(circuit!, gridOrder, conditions, score, weekend.prepBonus, currentSeason.carDevelopment, strategyChoice);
    setRaceState(initial);
    setPhase('racing');
    setTimeout(() => startTick({ ...initial, status: 'running' }, simSpeed, score, grid), 100);
  };

  const handleSpeedChange = () => {
    const idx = SPEED_OPTIONS.indexOf(simSpeed as typeof SPEED_OPTIONS[number]);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSimSpeed(next);
    if (raceState && raceScore) startTick(raceState, next, raceScore, startGrid);
  };

  const handlePause = () => {
    if (raceState?.status === 'running') {
      stopTick();
      setRaceState((prev) => prev ? { ...prev, status: 'paused' } : prev);
    } else if (raceState?.status === 'paused' && raceScore && !engineerPrompt) {
      const resumed = { ...raceState, status: 'running' as const };
      setRaceState(resumed);
      startTick(resumed, simSpeed, raceScore, startGrid);
    }
  };

  // ---- Strategy choice screen ----
  if (phase === 'strategy') {
    const compounds: TyreCompound[] = ['S', 'M', 'H'];
    const windows = [
      { key: 'early' as const, label: 'Early stop', desc: `Lap ${Math.floor(circuit.laps * 0.28)}–${Math.floor(circuit.laps * 0.30)}` },
      { key: 'medium' as const, label: 'Standard', desc: `Lap ${Math.floor(circuit.laps * 0.35)}–${Math.floor(circuit.laps * 0.38)}` },
      { key: 'late' as const, label: 'Late stop', desc: `Lap ${Math.floor(circuit.laps * 0.44)}–${Math.floor(circuit.laps * 0.48)}` },
    ];
    return (
      <div style={{ background: '#0a0a0f', minHeight: '100%', padding: 20, paddingBottom: 40 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#E0C040', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>← Back</button>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>PRE-RACE</div>
        <h2 style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{engineer.name}: Race Strategy</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
          "{engineer.personality === 'calm'
            ? 'Take your time — pick what feels right for this circuit.'
            : engineer.personality === 'aggressive'
            ? 'We go aggressive. Maximum attack from lap one!'
            : 'Data suggests medium tyre on a standard one-stop.'}"
        </p>

        <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Starting compound</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {compounds.map((c) => (
            <button
              key={c}
              onClick={() => setStrategyChoice((s) => ({ ...s, startingCompound: c }))}
              style={{
                flex: 1, borderRadius: 12, padding: '16px 8px', cursor: 'pointer',
                border: `2px solid ${strategyChoice.startingCompound === c ? COMPOUND_COLORS[c] : '#222'}`,
                background: strategyChoice.startingCompound === c ? '#1a1a2a' : '#111120',
              }}
            >
              <div style={{ fontSize: 20 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: COMPOUND_COLORS[c], margin: '0 auto 6px' }} />
              </div>
              <div style={{ color: strategyChoice.startingCompound === c ? COMPOUND_COLORS[c] : '#888', fontWeight: 700, fontSize: 14 }}>{COMPOUND_NAMES[c]}</div>
              <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
                {c === 'S' ? 'Fast but fragile' : c === 'M' ? 'Balanced choice' : 'Long stint, slow'}
              </div>
            </button>
          ))}
        </div>

        <div style={{ color: '#FFF', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Pit window</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {windows.map((w) => (
            <button
              key={w.key}
              onClick={() => setStrategyChoice((s) => ({ ...s, pitWindow: w.key }))}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${strategyChoice.pitWindow === w.key ? '#E0C040' : '#222'}`,
                background: strategyChoice.pitWindow === w.key ? '#1a1a08' : '#111120',
              }}
            >
              <div>
                <div style={{ color: strategyChoice.pitWindow === w.key ? '#E0C040' : '#FFF', fontWeight: 600, fontSize: 14 }}>{w.label}</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{w.desc} of {circuit.laps} laps</div>
              </div>
              {strategyChoice.pitWindow === w.key && <span style={{ color: '#E0C040', fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>

        <button
          onClick={handleStrategyConfirm}
          style={{ background: '#E0C040', borderRadius: 12, padding: '16px 0', width: '100%', border: 'none', color: '#000', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
        >
          Confirm Strategy →
        </button>
      </div>
    );
  }

  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel="Race Day"
        onConfirm={handleScoreConfirm}
        onCancel={() => setPhase('strategy')}
        initialTodoist={70}
        initialSleep={8}
        initialFocus={70}
        initialHydration={7}
        initialMeditation={6}
        focusBonus={focusBonus}
        sleepBonus={sleepBonus}
      />
    );
  }

  // Finished screen
  if (phase === 'finished' && finalResults) {
    const userResult = finalResults.find((r) => r.driverId === USER_DRIVER_ID);
    return (
      <div style={{ padding: 20, paddingBottom: 60, background: '#0a0a0f', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ fontSize: 44 }}>{circuit.flag}</span>
          <div>
            <div style={{ color: '#888', fontSize: 11, letterSpacing: 2 }}>RACE RESULT</div>
            <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{circuit.name}</div>
          </div>
        </div>

        {/* Your result hero card */}
        <div style={{ background: '#1a1a08', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ color: '#E0C040', fontSize: 56, fontWeight: 'bold', lineHeight: 1 }}>
            {userResult?.dnfLap ? 'DNF' : `P${userResult?.position}`}
          </div>
          <div style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
            +{userResult?.points ?? 0} pts
          </div>
          {userResult?.fastestLap && (
            <div style={{ color: '#CC00FF', fontWeight: 'bold', fontSize: 13, marginTop: 8 }}>💜 FASTEST LAP BONUS</div>
          )}
          {userResult?.bestLapTime ? (
            <div style={{ color: '#888', fontSize: 13, marginTop: 6, fontVariant: 'tabular-nums' }}>
              Best lap: {formatLapTime(userResult.bestLapTime)}
            </div>
          ) : null}
          {userResult?.pitStops?.length > 0 && (
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              {userResult.pitStops.length} pit stop{userResult.pitStops.length > 1 ? 's' : ''}
              {' · '}Started {strategyChoice.startingCompound} → {userResult.pitStops.map((p) => p.toCompound).join(' → ')}
            </div>
          )}
          {userResult?.prizeMoneyM > 0 && (
            <div style={{ color: '#39B54A', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
              💰 +${(userResult.prizeMoneyM * currentSeason.carDevelopment.prizeMultiplier).toFixed(1)}M prize
            </div>
          )}
          {userResult?.dnfLap && (
            <div style={{ color: '#FF4444', fontSize: 13, marginTop: 8 }}>
              Retired on lap {userResult.dnfLap}
            </div>
          )}
        </div>

        {/* Lap Chart */}
        <div style={{ background: '#111120', borderRadius: 14, padding: 16, marginBottom: 20, overflowX: 'auto' }}>
          <LapChart results={finalResults} totalLaps={circuit.laps} width={Math.min(320, window.innerWidth - 72)} />
        </div>

        {/* Podium */}
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>PODIUM</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {finalResults.filter((r) => !r.dnfLap).slice(0, 3).map((r, i) => {
            const d = getDriver(r.driverId);
            const t = d ? getTeam(d.teamId) : null;
            return (
              <div key={r.driverId} style={{
                flex: 1, background: i === 0 ? '#1a1a08' : '#111120',
                borderRadius: 10, padding: 12, textAlign: 'center',
                border: d?.isUser ? `1px solid #E0C040` : 'none',
              }}>
                <div style={{ color: '#E0C040', fontSize: 20, fontWeight: 'bold' }}>{i + 1}</div>
                <div style={{ width: 20, height: 3, borderRadius: 1.5, background: t?.color ?? '#888', margin: '6px auto' }} />
                <div style={{ color: '#FFF', fontWeight: 600, fontSize: 12 }}>{d?.shortName ?? '?'}</div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{r.points}pts</div>
              </div>
            );
          })}
        </div>

        {/* Full results */}
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>FULL RESULTS</div>
        <div style={{ background: '#111120', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          {finalResults.slice(0, 10).map((r) => {
            const d = getDriver(r.driverId);
            const t = d ? getTeam(d.teamId) : null;
            return (
              <div key={r.driverId} style={{
                display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10,
                background: d?.isUser ? '#1a1a08' : 'transparent',
                borderBottom: '1px solid #1a1a2a',
              }}>
                <span style={{ color: d?.isUser ? '#E0C040' : '#888', width: 24, fontWeight: 'bold', fontSize: 13 }}>
                  {r.dnfLap ? 'DNF' : r.position}
                </span>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t?.color ?? '#888' }} />
                <span style={{ flex: 1, color: d?.isUser ? '#E0C040' : '#FFF', fontSize: 13, fontWeight: d?.isUser ? 'bold' : 'normal' }}>
                  {d?.shortName ?? r.driverId}
                </span>
                <span style={{ color: '#888', fontSize: 12 }}>{r.gap || 'LEADER'}</span>
                <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 12, width: 32, textAlign: 'right' }}>
                  {r.points > 0 ? `+${r.points}` : ''}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/home')}
          style={{
            background: '#E0C040', borderRadius: 12, padding: 18, width: '100%',
            border: 'none', color: '#000', fontWeight: 'bold', fontSize: 16, cursor: 'pointer',
          }}
        >
          Back to Season
        </button>
      </div>
    );
  }

  // Racing screen
  if (!raceState) return null;
  const userCar = raceState.cars.find((c) => c.driverId === USER_DRIVER_ID);
  const isPaused = raceState.status === 'paused';
  const recentEvents = raceState.events.slice(-5).reverse();

  return (
    <div ref={containerRef} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Engineer "Box now?" prompt */}
      {engineerPrompt && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ background: '#111120', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📻</div>
            <div style={{ color: '#888', fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>
              {engineer.name.toUpperCase()} — LAP {engineerPrompt.lap}
            </div>
            <div style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
              "{engineerPrompt.message}"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => handleEngineerDecision('pit')} style={{
                background: '#39B54A', borderRadius: 10, padding: '14px 0',
                border: 'none', color: '#FFF', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
              }}>✓ Box this lap</button>
              <button onClick={() => handleEngineerDecision('delay')} style={{
                background: '#1a1a2a', borderRadius: 10, padding: '14px 0',
                border: '1px solid #333', color: '#FFF', fontSize: 14, cursor: 'pointer',
              }}>Delay 4 laps</button>
              <button onClick={() => handleEngineerDecision('stay')} style={{
                background: 'none', borderRadius: 10, padding: '14px 0',
                border: '1px solid #333', color: '#888', fontSize: 14, cursor: 'pointer',
              }}>Stay out — no pit</button>
            </div>
          </div>
        </div>
      )}

      {/* Track map */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <TrackMap
          circuit={circuit}
          cars={raceState.cars}
          conditions={raceState.conditions}
          width={dims.w}
          height={dims.h}
        />
        {userCar && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            display: 'flex', gap: 12, background: 'rgba(0,0,0,0.75)',
            borderRadius: 8, padding: '6px 12px', alignItems: 'center',
          }}>
            <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 16 }}>P{userCar.position}</span>
            <span style={{ color: '#FFF', fontSize: 13 }}>L{Math.min(userCar.currentLap, circuit.laps)}/{circuit.laps}</span>
            <span style={{ color: '#AAA', fontSize: 13 }}>
              {userCar.position === 1 ? 'LEAD' : `+${userCar.gapToLeader.toFixed(1)}s`}
            </span>
            <span style={{
              background: COMPOUND_COLORS[userCar.tyreCompound], color: '#000',
              fontWeight: 'bold', fontSize: 11, borderRadius: 4, padding: '2px 5px',
            }}>
              {userCar.tyreCompound} {userCar.tyreAgeLaps}L
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 8 }}>
          <button onClick={handlePause} style={{
            background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '8px 14px',
            border: 'none', color: '#FFF', fontSize: 18, cursor: 'pointer',
          }}>{isPaused ? '▶' : '⏸'}</button>
          <button onClick={handleSpeedChange} style={{
            background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '8px 14px',
            border: 'none', color: '#E0C040', fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
          }}>{SPEED_LABELS[simSpeed]}</button>
        </div>
        {raceState.conditions.safetyCarActive && (
          <div style={{
            position: 'absolute', top: 8, left: 8, background: '#E0C040',
            borderRadius: 6, padding: '4px 10px',
          }}>
            <span style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>SC OUT</span>
          </div>
        )}
      </div>

      {/* Event feed - recent events */}
      <div style={{ background: '#0f0f1a', padding: '4px 12px', flexShrink: 0, minHeight: 30 }}>
        {recentEvents.slice(0, 1).map((ev, i) => (
          <span key={i} style={{
            color: ev.type === 'dnf' ? '#FF4444'
              : ev.type === 'safety_car' ? '#E0C040'
              : ev.type === 'fastest_lap' ? '#CC00FF'
              : ev.type === 'engineer_radio' ? '#0090FF'
              : ev.type === 'weather' ? '#00AAFF'
              : '#FFF',
            fontWeight: 'bold', fontSize: 12,
          }}>
            {ev.type === 'engineer_radio' ? '📻 ' : ''}
            {ev.message}
          </span>
        ))}
      </div>

      {/* Timing tower */}
      <div style={{ flex: 1, borderTop: '1px solid #1a1a2a', overflow: 'hidden' }}>
        <TimingTower
          cars={raceState.cars}
          conditions={raceState.conditions}
          currentLap={raceState.currentSimLap}
          totalLaps={raceState.totalLaps}
          fastestLapHolder={raceState.fastestLapHolder}
        />
      </div>
    </div>
  );
}
