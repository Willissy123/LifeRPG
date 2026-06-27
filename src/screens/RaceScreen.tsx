import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RaceState, FinishedRaceResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { TrackMap } from '../components/TrackMap';
import { TimingTower } from '../components/TimingTower';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import { initRace, tickRace, finaliseRace, buildRaceConditions } from '../engine/RaceEngine';
import { getTrackLayout } from '../data/trackLayouts';
import { positionAlongTrack, formatLapTime } from '../engine/utils';

type Phase = 'score_entry' | 'racing' | 'finished';
const SPEED_OPTIONS = [30, 60, 120, 300] as const;
const SPEED_LABELS: Record<number, string> = { 30: '½×', 60: '1×', 120: '2×', 300: '5×' };

export default function RaceScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('score_entry');
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [simSpeed, setSimSpeed] = useState(60);
  const [raceScore, setRaceScore] = useState<DailyScore | null>(null);
  const [finalResults, setFinalResults] = useState<FinishedRaceResult[] | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Container ref for responsive map sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });

  const { currentSeason, completeRace } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  if (!circuit || !weekend) return null;

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

  const finishRace = useCallback((state: RaceState, score: DailyScore) => {
    stopTick();
    const results = finaliseRace(state, circuit!, currentSeason.carDevelopment);
    completeRace(raceIndex, results);
    setFinalResults(results);
    setPhase('finished');
  }, [circuit, currentSeason.carDevelopment, raceIndex, completeRace, stopTick]);

  const startTick = useCallback((state: RaceState, speed: number, score: DailyScore) => {
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
          setTimeout(() => finishRace(updated, score), 50);
        }
        return updated;
      });
    }, 100);
  }, [circuit, weekend, currentSeason.carDevelopment, stopTick, finishRace]);

  useEffect(() => { return () => stopTick(); }, [stopTick]);

  const handleScoreConfirm = (score: DailyScore) => {
    setRaceScore(score);
    const gridOrder = weekend.qualifyingResult
      ? [...weekend.qualifyingResult].sort((a, b) => a.gridPosition - b.gridPosition).map((r) => r.driverId)
      : [USER_DRIVER_ID];
    const conditions = buildRaceConditions(circuit!);
    const initial = initRace(circuit!, gridOrder, conditions, score, weekend.prepBonus, currentSeason.carDevelopment);
    setRaceState(initial);
    setPhase('racing');
    setTimeout(() => startTick({ ...initial, status: 'running' }, simSpeed, score), 100);
  };

  const handleSpeedChange = () => {
    const idx = SPEED_OPTIONS.indexOf(simSpeed as typeof SPEED_OPTIONS[number]);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSimSpeed(next);
    if (raceState && raceScore) startTick(raceState, next, raceScore);
  };

  const handlePause = () => {
    if (raceState?.status === 'running') {
      stopTick();
      setRaceState((prev) => prev ? { ...prev, status: 'paused' } : prev);
    } else if (raceState?.status === 'paused' && raceScore) {
      const resumed = { ...raceState, status: 'running' as const };
      setRaceState(resumed);
      startTick(resumed, simSpeed, raceScore);
    }
  };

  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel="Race Day"
        onConfirm={handleScoreConfirm}
        onCancel={() => navigate(-1)}
        initialTodoist={70}
        initialSleep={8}
        initialFocus={70}
      />
    );
  }

  // Finished screen
  if (phase === 'finished' && finalResults) {
    const userResult = finalResults.find((r) => r.driverId === USER_DRIVER_ID);
    const userDriver = getDriver(USER_DRIVER_ID);
    const userTeam = getTeam(userDriver?.teamId ?? '');
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, minHeight: '100%', background: '#0a0a0f',
      }}>
        <span style={{ fontSize: 48 }}>{circuit.flag}</span>
        <div style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>{circuit.name}</div>
        <div style={{ color: '#888', fontSize: 12, letterSpacing: 2, marginTop: 4 }}>RACE RESULT</div>

        <div style={{ marginTop: 24, background: '#1a1a08', borderRadius: 16, padding: 24, textAlign: 'center', width: '100%' }}>
          <div style={{ color: '#E0C040', fontSize: 60, fontWeight: 'bold', lineHeight: '64px' }}>
            {userResult?.dnfLap ? 'DNF' : `P${userResult?.position}`}
          </div>
          <div style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
            +{userResult?.points ?? 0} pts
          </div>
          {userResult?.fastestLap && (
            <div style={{ color: '#CC00FF', fontWeight: 'bold', fontSize: 13, marginTop: 8 }}>⚡ FASTEST LAP</div>
          )}
          {userResult?.bestLapTime ? (
            <div style={{ color: '#888', fontSize: 13, marginTop: 4, fontVariant: 'tabular-nums' }}>
              Best: {formatLapTime(userResult.bestLapTime)}
            </div>
          ) : null}
        </div>

        {/* Podium */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'center', width: '100%' }}>
          {finalResults.slice(0, 3).map((r, i) => {
            const d = getDriver(r.driverId);
            const t = d ? getTeam(d.teamId) : null;
            return (
              <div key={r.driverId} style={{
                flex: 1, background: i === 0 ? '#1a1a08' : '#1a1a2a',
                borderRadius: 10, padding: 12, textAlign: 'center',
                opacity: i === 2 ? 0.65 : i === 1 ? 0.8 : 1,
              }}>
                <div style={{ color: '#E0C040', fontSize: 22, fontWeight: 'bold' }}>{i + 1}</div>
                <div style={{ width: 24, height: 3, borderRadius: 1.5, background: t?.color ?? '#888', margin: '6px auto' }} />
                <div style={{ color: '#FFF', fontWeight: 600, fontSize: 13 }}>{d?.shortName ?? '?'}</div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{r.points}pts</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/home')}
          style={{
            marginTop: 32, background: '#E0C040', borderRadius: 12, padding: 18,
            width: '100%', border: 'none', color: '#000', fontWeight: 'bold',
            fontSize: 16, cursor: 'pointer',
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
  const lastEvent = raceState.events[raceState.events.length - 1];

  return (
    <div ref={containerRef} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Track map area */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <TrackMap
          circuit={circuit}
          cars={raceState.cars}
          conditions={raceState.conditions}
          width={dims.w}
          height={dims.h}
        />

        {/* Telemetry overlay */}
        {userCar && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            display: 'flex', gap: 12, background: 'rgba(0,0,0,0.7)',
            borderRadius: 8, padding: '6px 12px',
          }}>
            <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 16 }}>P{userCar.position}</span>
            <span style={{ color: '#FFF', fontSize: 13 }}>
              LAP {Math.min(userCar.currentLap, circuit.laps)}/{circuit.laps}
            </span>
            <span style={{ color: '#AAA', fontSize: 13 }}>
              {userCar.position === 1 ? 'LEADER' : `+${userCar.gapToLeader.toFixed(2)}s`}
            </span>
          </div>
        )}

        {/* Controls */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 8 }}>
          <button onClick={handlePause} style={{
            background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 14px',
            border: 'none', color: '#FFF', fontSize: 18, cursor: 'pointer',
          }}>
            {isPaused ? '▶' : '⏸'}
          </button>
          <button onClick={handleSpeedChange} style={{
            background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 14px',
            border: 'none', color: '#FFF', fontSize: 18, cursor: 'pointer',
          }}>
            {SPEED_LABELS[simSpeed]}
          </button>
        </div>
      </div>

      {/* Event feed */}
      {lastEvent && (
        <div style={{
          background: 'rgba(224,192,64,0.9)', padding: '4px 12px', flexShrink: 0,
        }}>
          <span style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }} key={lastEvent.message}>
            {lastEvent.message}
          </span>
        </div>
      )}

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
