import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, QualifyingResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { simulateQualifying } from '../engine/QualifyingEngine';
import { formatLapTime } from '../engine/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Qualifying'>;
type Phase = 'score_entry' | 'simulating' | 'results';

export default function QualifyingScreen({ route, navigation }: Props) {
  const { raceIndex } = route.params;
  const [phase, setPhase] = useState<Phase>('score_entry');
  const [results, setResults] = useState<QualifyingResult[] | null>(null);

  const { setLifeScore, completeQualifying, currentSeason } = useGameStore();
  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend.circuitId);
  if (!circuit) return null;

  const handleScoreConfirm = (score: DailyScore) => {
    setLifeScore(raceIndex, 'qualifying', score.qualifyingPace);
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
        onCancel={() => navigation.goBack()}
        initialTodoist={70}
        initialSleep={8}
      />
    );
  }

  if (phase === 'simulating') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#E0C040" size="large" />
        <Text style={styles.loadingText}>Running Q1 → Q2 → Q3...</Text>
      </View>
    );
  }

  const userResult = results?.find((r) => {
    const d = getDriver(r.driverId);
    return d?.isUser;
  });

  const q3Results = results?.filter((r) => !r.eliminated);
  const q2Results = results?.filter((r) => r.eliminated === 'Q2');
  const q1Results = results?.filter((r) => r.eliminated === 'Q1');

  const QSection = ({ title, items, color }: { title: string; items: QualifyingResult[] | undefined; color: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {items?.map((r) => {
        const driver = getDriver(r.driverId);
        const team = driver ? getTeam(driver.teamId) : null;
        const isUser = driver?.isUser ?? false;
        const bestTime = r.q3Time ?? r.q2Time ?? r.q1Time;
        return (
          <View key={r.driverId} style={[styles.resultRow, isUser && styles.userRow]}>
            <Text style={[styles.grid, isUser && styles.gold]}>P{r.gridPosition}</Text>
            <View style={[styles.teamStrip, { backgroundColor: team?.color ?? '#888' }]} />
            <View style={styles.info}>
              <Text style={[styles.code, isUser && styles.gold]}>
                {driver?.shortName ?? '?'}{isUser ? ' (YOU)' : ''}
              </Text>
              <Text style={[styles.teamLabel, { color: team?.color ?? '#888' }]}>{team?.shortName}</Text>
            </View>
            <Text style={[styles.time, isUser && styles.gold]}>
              {bestTime ? formatLapTime(bestTime) : '---'}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSub}>QUALIFYING</Text>
        <Text style={styles.headerTitle}>{circuit.name}</Text>
        {userResult && (
          <View style={styles.userSummary}>
            <Text style={styles.userGridLabel}>YOUR GRID POSITION</Text>
            <Text style={styles.userGridPos}>P{userResult.gridPosition}</Text>
            <Text style={styles.userBestTime}>
              {formatLapTime(userResult.q3Time ?? userResult.q2Time ?? userResult.q1Time ?? 0)}
            </Text>
          </View>
        )}
      </View>

      <ScrollView>
        <QSection title="Q3 — TOP 10" items={q3Results} color="#FFFFFF" />
        <QSection title="Q2 ELIMINATED" items={q2Results} color="#FF8800" />
        <QSection title="Q1 ELIMINATED" items={q1Results} color="#FF4444" />
      </ScrollView>

      <TouchableOpacity style={styles.raceBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.raceBtnText}>Back to Race Weekend</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loading: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerSub: { color: '#E0C040', fontSize: 11, letterSpacing: 2, fontWeight: 'bold' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  userSummary: { marginTop: 12, backgroundColor: '#1a1a08', borderRadius: 8, padding: 14, alignItems: 'center' },
  userGridLabel: { color: '#888', fontSize: 10, letterSpacing: 2 },
  userGridPos: { color: '#E0C040', fontSize: 48, fontWeight: 'bold', lineHeight: 52 },
  userBestTime: { color: '#FFFFFF', fontSize: 18, fontVariant: ['tabular-nums'] },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#111' },
  userRow: { backgroundColor: '#1a1a08' },
  grid: { color: '#888', width: 36, fontSize: 13 },
  gold: { color: '#E0C040' },
  teamStrip: { width: 3, height: 26, borderRadius: 1.5, marginHorizontal: 8 },
  info: { flex: 1 },
  code: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  teamLabel: { fontSize: 10, marginTop: 1 },
  time: { color: '#CCCCCC', fontSize: 13, fontVariant: ['tabular-nums'] },
  raceBtn: { margin: 16, backgroundColor: '#E0C040', borderRadius: 10, padding: 16, alignItems: 'center' },
  raceBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
});
