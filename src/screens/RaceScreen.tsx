/**
 * Race Screen — the main virtual environment.
 * Shows the 2D animated track map + live timing tower.
 * Race runs in real-time at simSpeed (configurable).
 * Each tick = 100ms real time. Cars move along the SVG path.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, RaceState, FinishedRaceResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { TrackMap } from '../components/TrackMap';
import { TimingTower } from '../components/TimingTower';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import {
  initRace, tickRace, finaliseRace, buildRaceConditions,
} from '../engine/RaceEngine';
import { getTrackLayout } from '../data/trackLayouts';
import { positionAlongTrack, formatLapTime } from '../engine/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Race'>;
type Phase = 'score_entry' | 'racing' | 'finished';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_H = SCREEN_H * 0.40;
const TIMING_H = SCREEN_H * 0.40;

const SPEED_OPTIONS = [30, 60, 120, 300] as const;
const SPEED_LABELS: Record<number, string> = { 30: '½×', 60: '1×', 120: '2×', 300: '5×' };

export default function RaceScreen({ route, navigation }: Props) {
  const { raceIndex } = route.params;
  const [phase, setPhase] = useState<Phase>('score_entry');
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [simSpeed, setSimSpeed] = useState(60);
  const [raceScore, setRaceScore] = useState<DailyScore | null>(null);
  const [finalResults, setFinalResults] = useState<FinishedRaceResult[] | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { currentSeason, setLifeScore, completeRace } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend.circuitId);
  if (!circuit) return null;

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback((state: RaceState, speed: number, score: DailyScore) => {
    stopTick();
    tickRef.current = setInterval(() => {
      setRaceState((prev) => {
        if (!prev || prev.status === 'finished') {
          return prev;
        }
        const next = tickRace(
          prev, circuit!, speed, score,
          weekend.prepBonus, currentSeason.carDevelopment,
          weekend.strategyBonus ?? 0,
        );

        // Update track positions for all cars
        const layout = getTrackLayout(circuit!.id);
        const waypoints = layout?.waypoints ?? circuit!.points;
        const updatedCars = next.cars.map((car) => ({
          ...car,
          trackPosition: positionAlongTrack(car.lapProgress, waypoints),
        }));

        const updated = { ...next, cars: updatedCars };

        if (updated.status === 'finished') {
          // Handle finish on next render cycle
          setTimeout(() => finishRace(updated, score), 50);
        }

        return updated;
      });
    }, 100);
  }, [circuit, weekend, currentSeason.carDevelopment, stopTick]);

  const finishRace = useCallback((state: RaceState, score: DailyScore) => {
    stopTick();
    const results = finaliseRace(state, circuit!, currentSeason.carDevelopment);
    completeRace(raceIndex, results);
    setFinalResults(results);
    setPhase('finished');
  }, [circuit, currentSeason.carDevelopment, raceIndex, completeRace, stopTick]);

  useEffect(() => {
    return () => stopTick();
  }, [stopTick]);

  const handleScoreConfirm = (score: DailyScore) => {
    setRaceScore(score);
    setLifeScore(raceIndex, 'race', score.racePace);

    const gridOrder = weekend.qualifyingResult
      ? weekend.qualifyingResult.sort((a, b) => a.gridPosition - b.gridPosition).map((r) => r.driverId)
      : [USER_DRIVER_ID]; // fallback

    const conditions = buildRaceConditions(circuit!);
    const initial = initRace(circuit!, gridOrder, conditions, score, weekend.prepBonus, currentSeason.carDevelopment);

    setRaceState(initial);
    setPhase('racing');
    // Give one frame before starting tick
    setTimeout(() => startTick({ ...initial, status: 'running' }, simSpeed, score), 100);
  };

  const handleSpeedChange = () => {
    const idx = SPEED_OPTIONS.indexOf(simSpeed as any);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSimSpeed(next);
    if (raceState && raceScore) {
      startTick(raceState, next, raceScore);
    }
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

  // ---- Score entry ----
  if (phase === 'score_entry') {
    return (
      <ScoreEntry
        sessionLabel="Race Day"
        onConfirm={handleScoreConfirm}
        onCancel={() => navigation.goBack()}
        initialTodoist={70}
        initialSleep={8}
        initialFocus={70}
      />
    );
  }

  // ---- Finished ----
  if (phase === 'finished' && finalResults) {
    const userResult = finalResults.find((r) => r.driverId === USER_DRIVER_ID);
    const userDriver = getDriver(USER_DRIVER_ID);
    const userTeam = getTeam(userDriver?.teamId ?? '');
    return (
      <View style={styles.finishedContainer}>
        <Text style={styles.finishedFlag}>{circuit.flag}</Text>
        <Text style={styles.finishedTitle}>{circuit.name}</Text>
        <Text style={styles.finishedSub}>RACE RESULT</Text>

        <View style={styles.userResultBox}>
          <Text style={styles.finishedPos}>
            {userResult?.dnfLap ? 'DNF' : `P${userResult?.position}`}
          </Text>
          <Text style={styles.finishedPoints}>+{userResult?.points ?? 0} pts</Text>
          {userResult?.fastestLap && (
            <Text style={styles.flBadge}>⚡ FASTEST LAP</Text>
          )}
          {userResult?.bestLapTime ? (
            <Text style={styles.bestLap}>Best: {formatLapTime(userResult.bestLapTime)}</Text>
          ) : null}
        </View>

        <View style={styles.podium}>
          {finalResults.slice(0, 3).map((r, i) => {
            const d = getDriver(r.driverId);
            const t = d ? getTeam(d.teamId) : null;
            return (
              <View key={r.driverId} style={[styles.podiumCard, i === 0 && styles.podium1, i === 2 && styles.podium3]}>
                <Text style={styles.podiumPos}>{i + 1}</Text>
                <View style={[styles.podiumStrip, { backgroundColor: t?.color ?? '#888' }]} />
                <Text style={styles.podiumName}>{d?.shortName ?? '?'}</Text>
                <Text style={styles.podiumPoints}>{r.points}pts</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.doneBtnText}>Back to Season</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Racing ----
  if (!raceState) return null;

  const userCar = raceState.cars.find((c) => c.driverId === USER_DRIVER_ID);
  const isPaused = raceState.status === 'paused';

  return (
    <View style={styles.raceContainer}>
      {/* Track map */}
      <View style={styles.mapArea}>
        <TrackMap
          circuit={circuit}
          cars={raceState.cars}
          conditions={raceState.conditions}
          width={SCREEN_W}
          height={MAP_H}
        />
        {/* User car telemetry overlay */}
        {userCar && (
          <View style={styles.telemetryOverlay}>
            <Text style={styles.telPos}>P{userCar.position}</Text>
            <Text style={styles.telLap}>
              LAP {Math.min(userCar.currentLap, circuit.laps)}/{circuit.laps}
            </Text>
            <Text style={styles.telGap}>
              {userCar.position === 1 ? 'LEADER' : `+${userCar.gapToLeader.toFixed(2)}s`}
            </Text>
          </View>
        )}
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={handlePause}>
            <Text style={styles.controlText}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={handleSpeedChange}>
            <Text style={styles.controlText}>{SPEED_LABELS[simSpeed]}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timing tower */}
      <View style={styles.timingArea}>
        <TimingTower
          cars={raceState.cars}
          conditions={raceState.conditions}
          currentLap={raceState.currentSimLap}
          totalLaps={raceState.totalLaps}
          fastestLapHolder={raceState.fastestLapHolder}
        />
      </View>

      {/* Live event feed */}
      {raceState.events.length > 0 && (
        <View style={styles.eventFeed}>
          <Text style={styles.eventText} numberOfLines={1}>
            {raceState.events[raceState.events.length - 1].message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  raceContainer: { flex: 1, backgroundColor: '#0a0a0f' },
  mapArea: { position: 'relative' },
  telemetryOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  telPos: { color: '#E0C040', fontWeight: 'bold', fontSize: 16 },
  telLap: { color: '#FFFFFF', fontSize: 13 },
  telGap: { color: '#AAAAAA', fontSize: 13 },
  controls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  controlText: { color: '#FFFFFF', fontSize: 18 },
  timingArea: { flex: 1, borderTopWidth: 1, borderTopColor: '#1a1a2a' },
  eventFeed: {
    position: 'absolute',
    bottom: TIMING_H + 2,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(224,192,64,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  eventText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

  // Finished screen
  finishedContainer: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  finishedFlag: { fontSize: 48 },
  finishedTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  finishedSub: { color: '#888', fontSize: 12, letterSpacing: 2, marginTop: 4 },
  userResultBox: { marginTop: 24, backgroundColor: '#1a1a08', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%' },
  finishedPos: { color: '#E0C040', fontSize: 60, fontWeight: 'bold', lineHeight: 64 },
  finishedPoints: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  flBadge: { color: '#CC00FF', fontWeight: 'bold', fontSize: 13, marginTop: 8 },
  bestLap: { color: '#888', fontSize: 13, marginTop: 4, fontVariant: ['tabular-nums'] },
  podium: { flexDirection: 'row', gap: 8, marginTop: 24, justifyContent: 'center' },
  podiumCard: { flex: 1, backgroundColor: '#1a1a2a', borderRadius: 10, padding: 12, alignItems: 'center', opacity: 0.8 },
  podium1: { opacity: 1, backgroundColor: '#1a1a08' },
  podium3: { opacity: 0.65 },
  podiumPos: { color: '#E0C040', fontSize: 22, fontWeight: 'bold' },
  podiumStrip: { width: 24, height: 3, borderRadius: 1.5, marginVertical: 6 },
  podiumName: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  podiumPoints: { color: '#888', fontSize: 11, marginTop: 2 },
  doneBtn: { marginTop: 32, backgroundColor: '#E0C040', borderRadius: 12, padding: 18, width: '100%', alignItems: 'center' },
  doneBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
