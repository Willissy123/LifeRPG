import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import CALENDAR_2025_IMPORT from '../data/calendar2025';

type Props = NativeStackScreenProps<RootStackParamList, 'RaceWeekend'>;

interface SessionCard {
  session: string;
  label: string;
  description: string;
  unlocked: boolean;
  completed: boolean;
  result: string | null;
  onPress: () => void;
}

export default function RaceWeekendScreen({ route, navigation }: Props) {
  const { raceIndex } = route.params;
  const { currentSeason } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend.circuitId);
  const cal = CALENDAR_2025_IMPORT[raceIndex];
  if (!circuit || !cal) return null;

  const { practiceResults, qualifyingResult, raceResult, userGridPosition } = weekend;
  const fp1Done = !!practiceResults.fp1;
  const fp2Done = !!practiceResults.fp2;
  const fp3Done = !!practiceResults.fp3;
  const qualiDone = !!qualifyingResult;
  const raceDone = !!raceResult;

  const userRaceResult = raceResult?.find((r) => {
    const { getDriver } = require('../data/drivers2025');
    return getDriver(r.driverId)?.isUser;
  });

  const sessions: SessionCard[] = [
    {
      session: 'FP1',
      label: 'Free Practice 1',
      description: 'Learn the circuit. High variance, setup testing.',
      unlocked: true,
      completed: fp1Done,
      result: fp1Done
        ? `P${practiceResults.fp1?.find((r) => { const {getDriver} = require('../data/drivers2025'); return getDriver(r.driverId)?.isUser; })?.position ?? '?'}`
        : null,
      onPress: () => navigation.navigate('Practice', { raceIndex, session: 'FP1' }),
    },
    {
      session: 'FP2',
      label: 'Free Practice 2',
      description: 'Long-run pace simulation. Race setup work.',
      unlocked: true,
      completed: fp2Done,
      result: fp2Done
        ? `P${practiceResults.fp2?.find((r) => { const {getDriver} = require('../data/drivers2025'); return getDriver(r.driverId)?.isUser; })?.position ?? '?'}`
        : null,
      onPress: () => navigation.navigate('Practice', { raceIndex, session: 'FP2' }),
    },
    {
      session: 'FP3',
      label: 'Free Practice 3',
      description: 'Qualifying simulation. Tightest results.',
      unlocked: true,
      completed: fp3Done,
      result: fp3Done
        ? `P${practiceResults.fp3?.find((r) => { const {getDriver} = require('../data/drivers2025'); return getDriver(r.driverId)?.isUser; })?.position ?? '?'}`
        : null,
      onPress: () => navigation.navigate('Practice', { raceIndex, session: 'FP3' }),
    },
    {
      session: 'Q',
      label: 'Qualifying',
      description: 'Q1 → Q2 → Q3. Your sleep + focus determines grid position.',
      unlocked: true, // sessions are independent
      completed: qualiDone,
      result: qualiDone ? `P${userGridPosition ?? '?'} on grid` : null,
      onPress: () => navigation.navigate('Qualifying', { raceIndex }),
    },
    {
      session: 'R',
      label: 'Race',
      description: `${circuit.laps} laps of ${circuit.location}. Real weather, tyres & strategy.`,
      unlocked: qualiDone, // must qualify first
      completed: raceDone,
      result: raceDone
        ? (userRaceResult?.dnfLap
          ? `DNF (Lap ${userRaceResult.dnfLap})`
          : `P${userRaceResult?.position ?? '?'} — +${userRaceResult?.points ?? 0} pts`)
        : null,
      onPress: () => navigation.navigate('Race', { raceIndex }),
    },
  ];

  const prepPct = Math.round(weekend.prepBonus * 100 / 0.05);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.flag}>{circuit.flag}</Text>
        <View style={styles.headerText}>
          <Text style={styles.round}>ROUND {cal.round} · {cal.date}</Text>
          <Text style={styles.circuitName}>{circuit.name}</Text>
          <Text style={styles.location}>{circuit.location}, {circuit.country}</Text>
        </View>
      </View>

      {/* Circuit stats */}
      <View style={styles.stats}>
        <Stat label="Laps" value={String(circuit.laps)} />
        <Stat label="Length" value={`${circuit.lengthKm}km`} />
        <Stat label="DRS Zones" value={String(circuit.drsZones)} />
        <Stat label="Overtaking" value={`${11 - circuit.overtakingDifficulty}/10`} />
        <Stat label="Rain Risk" value={`${Math.round(circuit.weatherRainChance * 100)}%`} />
      </View>

      {/* Prep bonus */}
      {weekend.prepBonus > 0 && (
        <View style={styles.prepBanner}>
          <Text style={styles.prepLabel}>Practice Prep Bonus</Text>
          <View style={styles.prepBar}>
            <View style={[styles.prepFill, { width: `${prepPct}%` }]} />
          </View>
          <Text style={styles.prepValue}>+{(weekend.prepBonus * 100).toFixed(1)}% speed advantage</Text>
        </View>
      )}

      {/* Sessions */}
      <Text style={styles.sessionsTitle}>RACE WEEKEND SESSIONS</Text>
      <Text style={styles.sessionsSubtitle}>Complete each session on its own day. Results save automatically.</Text>

      {sessions.map((s) => (
        <TouchableOpacity
          key={s.session}
          style={[
            styles.sessionCard,
            s.completed && styles.completedCard,
            !s.unlocked && styles.lockedCard,
          ]}
          onPress={s.unlocked && !s.completed ? s.onPress : s.completed ? s.onPress : undefined}
          activeOpacity={s.unlocked ? 0.7 : 1}
        >
          <View style={styles.sessionLeft}>
            <View style={[
              styles.sessionBadge,
              s.completed && styles.completedBadge,
              !s.unlocked && styles.lockedBadge,
            ]}>
              <Text style={[
                styles.sessionCode,
                s.completed && styles.completedCode,
              ]}>
                {s.completed ? '✓' : s.session}
              </Text>
            </View>
          </View>
          <View style={styles.sessionBody}>
            <Text style={[styles.sessionLabel, !s.unlocked && styles.lockedText]}>
              {s.label}
            </Text>
            <Text style={[styles.sessionDesc, !s.unlocked && styles.lockedText]}>
              {s.description}
            </Text>
            {s.result && (
              <Text style={styles.sessionResult}>{s.result}</Text>
            )}
          </View>
          {s.unlocked && !s.completed && (
            <Text style={styles.arrow}>›</Text>
          )}
          {!s.unlocked && (
            <Text style={styles.locked}>🔒</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  flag: { fontSize: 44 },
  headerText: { flex: 1 },
  round: { color: '#888', fontSize: 11, letterSpacing: 2 },
  circuitName: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  location: { color: '#AAAAAA', fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statItem: { backgroundColor: '#1a1a2a', borderRadius: 8, padding: 10, minWidth: 70, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  statLabel: { color: '#888', fontSize: 10, marginTop: 2 },
  prepBanner: { backgroundColor: '#0f1a0f', borderRadius: 8, padding: 12, marginBottom: 20 },
  prepLabel: { color: '#39B54A', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  prepBar: { height: 6, backgroundColor: '#1a2a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  prepFill: { height: 6, backgroundColor: '#39B54A', borderRadius: 3 },
  prepValue: { color: '#39B54A', fontSize: 12, fontWeight: '600' },
  sessionsTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, marginBottom: 4 },
  sessionsSubtitle: { color: '#666', fontSize: 12, marginBottom: 16 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2a', borderRadius: 12, marginBottom: 10, padding: 16, gap: 14 },
  completedCard: { backgroundColor: '#0d1a0d' },
  lockedCard: { opacity: 0.5 },
  sessionLeft: { alignItems: 'center' },
  sessionBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0C040', alignItems: 'center', justifyContent: 'center' },
  completedBadge: { backgroundColor: '#39B54A' },
  lockedBadge: { backgroundColor: '#333' },
  sessionCode: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  completedCode: { color: '#FFF' },
  sessionBody: { flex: 1 },
  sessionLabel: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  sessionDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  sessionResult: { color: '#E0C040', fontWeight: '600', fontSize: 12, marginTop: 4 },
  lockedText: { color: '#555' },
  arrow: { color: '#E0C040', fontSize: 22 },
  locked: { fontSize: 18 },
});
