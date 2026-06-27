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

// Sprint points table: P1=8, P2=7, ..., P8=1
const SPRINT_POINTS: Record<number, number> = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

type Phase = 'score_entry' | 'racing' | 'finished';
const SPEED_OPTIONS = [60, 120, 300] as const;
const SPEED_LABELS: Record<number, string> = { 60: '1×', 120: '2×', 300: '5×' };

export default function SprintScreen() {
  const { raceIndex: raceIndexStr } = useParams<{ raceIndex: string }>();
  const raceIndex = Number(raceIndexStr);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('score_entry');
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [simSpeed, setSimSpeed] = useState(120);
  const [raceScore, setRaceScore] = useState<DailyScore | null>(null);
  const [finalResults, setFinalResults] = useState<FinishedRaceResult[] | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });

  const { currentSeason, completeSprintRace, sponsorDeals } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend?.circuitId ?? '');
  if (!circuit || !weekend) return null;

  const sprintLaps = Math.round(circuit.laps * 0.33);
  const sprintCircuit = { ...circuit, laps: sprintLaps };

  const focusSponsor = sponsorDeals.find((s) => s.bonusType === 'focus_boost' && s.active);
  const focusBonus = focusSponsor?.bonusValue ?? 0;

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

  const finishSprint = useCallback((state: RaceState, score: DailyScore) => {
    stopTick();
    const results = finaliseRace(state, sprintCircuit, currentSeason.carDevelopment);
    // Override points to sprint points table
    const sprintResults: FinishedRaceResult[] = results.map((r) => ({
      ...r,
      points: r.dnfLap ? 0 : (SPRINT_POINTS[r.position] ?? 0),
      prizeMoneyM: 0, // no prize for sprint
    }));
    completeSprintRace(raceIndex, sprintResults);
    setFinalResults(sprintResults);
    setPhase('finished');
  }, [sprintCircuit, currentSeason.carDevelopment, raceIndex, completeSprintRace, stopTick]);

  const startTick = useCallback((state: RaceState, speed: number, score: DailyScore) => {
    stopTick();
    tickRef.current = setInterval(() => {
      setRaceState((prev) => {
        if (!prev || prev.status === 'finished') return prev;
        const next = tickRace(prev, sprintCircuit, speed, score, weekend.prepBonus, currentSeason.carDevelopment, 0);
        const layout = getTrackLayout(circuit!.id);
        const waypoints = layout?.waypoints ?? circuit!.points;
        const updatedCars = next.cars.map((car) => ({
          ...car,
          trackPosition: positionAlongTrack(car.lapProgress, waypoints),
        }));
        const updated = { ...next, cars: updatedCars };
        if (updated.status === 'finished') {
          setTimeout(() => finishSprint(updated, score), 50);
        }
        return updated;
      });
    }, 100);
  }, [sprintCircuit, circuit, weekend, currentSeason.carDevelopment, stopTick, finishSprint]);

  useEffect(() => { return () => stopTick(); }, [stopTick]);

  const handleScoreConfirm = (score: DailyScore) => {
    setRaceScore(score);
    const gridOrder = weekend.sprintQualifyingResult
      ? [...weekend.sprintQualifyingResult].sort((a, b) => a.gridPosition - b.gridPosition).map((r) => r.driverId)
      : [USER_DRIVER_ID];
    const conditions = buildRaceConditions(circuit!);
    const initial = initRace(sprintCircuit, gridOrder, conditions, score, weekend.prepBonus, currentSeason.carDevelopment);
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

  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel="Sprint Race"
        onConfirm={handleScoreConfirm}
        onCancel={() => navigate(-1)}
        initialTodoist={65} initialSleep={7} initialFocus={75}
        initialHydration={7} initialMeditation={6}
        focusBonus={focusBonus}
      />
    );
  }

  if (phase === 'finished' && finalResults) {
    const userResult = finalResults.find((r) => r.driverId === USER_DRIVER_ID);
    return (
      <div style={{ padding: 20, paddingBottom: 60, background: '#0a0a0f', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <span style={{ fontSize: 44 }}>⚡</span>
          <div>
            <div style={{ color: '#FF8800', fontSize: 11, letterSpacing: 2 }}>SPRINT RESULT</div>
            <div style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{circuit.name}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{sprintLaps} laps</div>
          </div>
        </div>

        <div style={{ background: '#1a0a00', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 20, border: '1px solid #FF8800' }}>
          <div style={{ color: '#FF8800', fontSize: 56, fontWeight: 'bold', lineHeight: 1 }}>
            {userResult?.dnfLap ? 'DNF' : `P${userResult?.position}`}
          </div>
          <div style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>
            +{userResult?.points ?? 0} pts
          </div>
          {userResult?.dnfLap && (
            <div style={{ color: '#FF4444', fontSize: 13, marginTop: 6 }}>Retired on lap {userResult.dnfLap}</div>
          )}
        </div>

        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>SPRINT RESULTS</div>
        <div style={{ background: '#111120', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          {finalResults.slice(0, 8).map((r) => {
            const d = getDriver(r.driverId);
            const t = d ? getTeam(d.teamId) : null;
            return (
              <div key={r.driverId} style={{
                display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10,
                background: d?.isUser ? '#1a0a00' : 'transparent',
                borderBottom: '1px solid #1a1a2a',
              }}>
                <span style={{ color: d?.isUser ? '#FF8800' : '#888', width: 24, fontWeight: 'bold', fontSize: 13 }}>
                  {r.dnfLap ? 'DNF' : r.position}
                </span>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t?.color ?? '#888' }} />
                <span style={{ flex: 1, color: d?.isUser ? '#FF8800' : '#FFF', fontSize: 13, fontWeight: d?.isUser ? 'bold' : 'normal' }}>
                  {d?.shortName ?? r.driverId}
                </span>
                <span style={{ color: '#FF8800', fontWeight: 'bold', fontSize: 12, width: 32, textAlign: 'right' }}>
                  {r.points > 0 ? `+${r.points}` : ''}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate(`/race-weekend/${raceIndex}`)}
          style={{
            background: '#FF8800', borderRadius: 12, padding: 18, width: '100%',
            border: 'none', color: '#000', fontWeight: 'bold', fontSize: 16, cursor: 'pointer',
          }}
        >
          Back to Weekend
        </button>
      </div>
    );
  }

  if (!raceState) return null;
  const userCar = raceState.cars.find((c) => c.driverId === USER_DRIVER_ID);
  const lastEvent = raceState.events[raceState.events.length - 1];

  return (
    <div ref={containerRef} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1a0800', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#FF8800', fontWeight: 'bold', fontSize: 13 }}>⚡ SPRINT RACE</span>
        <span style={{ color: '#888', fontSize: 12 }}>{sprintLaps} laps</span>
      </div>

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
            borderRadius: 8, padding: '6px 12px',
          }}>
            <span style={{ color: '#FF8800', fontWeight: 'bold', fontSize: 16 }}>P{userCar.position}</span>
            <span style={{ color: '#FFF', fontSize: 13 }}>L{Math.min(userCar.currentLap, sprintLaps)}/{sprintLaps}</span>
            <span style={{ color: '#AAA', fontSize: 13 }}>
              {userCar.position === 1 ? 'LEAD' : `+${userCar.gapToLeader.toFixed(1)}s`}
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <button onClick={handleSpeedChange} style={{
            background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '8px 14px',
            border: 'none', color: '#FF8800', fontWeight: 'bold', fontSize: 14, cursor: 'pointer',
          }}>{SPEED_LABELS[simSpeed]}</button>
        </div>
      </div>

      {lastEvent && (
        <div style={{ background: 'rgba(255,136,0,0.15)', padding: '4px 12px', flexShrink: 0 }}>
          <span style={{ color: '#FF8800', fontWeight: 'bold', fontSize: 12 }}>{lastEvent.message}</span>
        </div>
      )}

      <div style={{ flex: 1, borderTop: '1px solid #1a1a2a', overflow: 'hidden' }}>
        <TimingTower
          cars={raceState.cars}
          conditions={raceState.conditions}
          currentLap={raceState.currentSimLap}
          totalLaps={sprintLaps}
          fastestLapHolder={raceState.fastestLapHolder}
        />
      </div>
    </div>
  );
}
