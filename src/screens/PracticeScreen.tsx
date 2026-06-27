import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, PracticeResult } from '../types';
import { DailyScore } from '../types/scoreTypes';
import { ScoreEntry } from '../components/ScoreEntry';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { simulatePractice } from '../engine/PracticeEngine';
import { formatLapTime } from '../engine/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Practice'>;

type Phase = 'score_entry' | 'simulating' | 'results';

export default function PracticeScreen({ route, navigation }: Props) {
  const { raceIndex, session } = route.params;
  const [phase, setPhase] = useState<Phase>('score_entry');
  const [results, setResults] = useState<PracticeResult[] | null>(null);

  const { setLifeScore, completePractice, currentSeason } = useGameStore();

  const weekend = currentSeason.weekends[raceIndex];
  const circuit = getCircuit(weekend.circuitId);

  if (!circuit) return null;

  const sessionKey = session.toLowerCase() as 'fp1' | 'fp2' | 'fp3';
  const sessionIndex = { fp1: 0, fp2: 1, fp3: 2 }[sessionKey];
  const prepBonus = weekend.prepBonus;

  const handleScoreConfirm = (score: DailyScore) => {
    setLifeScore(raceIndex, sessionKey, score.racePace); // legacy compat
    setPhase('simulating');

    // Simulate asynchronously (short delay for UX)
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
        sessionLabel={session}
        onConfirm={handleScoreConfirm}
        onCancel={() => navigation.goBack()}
      />
    );
  }

  if (phase === 'simulating') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#E0C040" size="large" />
        <Text style={styles.loadingText}>Simulating {session}...</Text>
        <Text style={styles.loadingSubtext}>{circuit.name}</Text>
      </View>
    );
  }

  // Results phase
  const userResult = results?.find((r) => {
    const d = getDriver(r.driverId);
    return d?.isUser;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSession}>{session}</Text>
        <Text style={styles.headerCircuit}>{circuit.name}</Text>
        {userResult && (
          <View style={styles.userResult}>
            <Text style={styles.userPos}>P{userResult.position}</Text>
            <Text style={styles.userTime}>{formatLapTime(userResult.lapTime)}</Text>
            <Text style={styles.userGap}>
              {userResult.position === 1 ? 'FASTEST' : `+${userResult.gap.toFixed(3)}s`}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.list}>
        {results?.map((r, idx) => {
          const driver = getDriver(r.driverId);
          const team = driver ? getTeam(driver.teamId) : null;
          const isUser = driver?.isUser ?? false;
          return (
            <View key={r.driverId} style={[styles.resultRow, isUser && styles.userRow]}>
              <Text style={[styles.pos, isUser && styles.userPosText]}>P{r.position}</Text>
              <View style={[styles.teamStrip, { backgroundColor: team?.color ?? '#888' }]} />
              <View style={styles.driverInfo}>
                <Text style={[styles.driverName, isUser && styles.userPosText]}>
                  {driver?.shortName ?? '???'}
                  {isUser ? ' (YOU)' : ''}
                </Text>
                <Text style={[styles.teamName, { color: team?.color ?? '#888' }]}>
                  {team?.shortName ?? ''}
                </Text>
              </View>
              <Text style={[styles.lapTimeText, isUser && styles.userPosText]}>
                {formatLapTime(r.lapTime)}
              </Text>
              <Text style={styles.gapText}>
                {idx === 0 ? '' : `+${r.gap.toFixed(3)}`}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.doneBtnText}>Done — Back to Race Weekend</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loadingSubtext: { color: '#888', fontSize: 14 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerSession: { color: '#E0C040', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  headerCircuit: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  userResult: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, backgroundColor: '#1a1a08', borderRadius: 8, padding: 12 },
  userPos: { color: '#E0C040', fontSize: 28, fontWeight: 'bold' },
  userTime: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  userGap: { color: '#888', fontSize: 14 },
  list: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  userRow: { backgroundColor: '#1a1a08' },
  pos: { color: '#888', fontSize: 13, width: 32 },
  userPosText: { color: '#E0C040' },
  teamStrip: { width: 3, height: 28, borderRadius: 1.5, marginHorizontal: 8 },
  driverInfo: { flex: 1 },
  driverName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  teamName: { fontSize: 10, marginTop: 2 },
  lapTimeText: { color: '#CCCCCC', fontSize: 13, fontVariant: ['tabular-nums'] },
  gapText: { color: '#666', fontSize: 11, width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
  doneBtn: { margin: 16, backgroundColor: '#1a1a2a', borderRadius: 10, padding: 16, alignItems: 'center' },
  doneBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
