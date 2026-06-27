import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { currentSeason } = useGameStore();
  const { weekends, currentRaceIndex } = currentSeason;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>2025 SEASON CALENDAR</Text>
      <Text style={styles.subtitle}>24 Grand Prix · Tap to open race weekend</Text>

      {CALENDAR_2025.map((race) => {
        const circuit = getCircuit(race.circuitId);
        const weekend = weekends[race.raceIndex];
        if (!circuit || !weekend) return null;

        const isNext = race.raceIndex === currentRaceIndex;
        const isComplete = weekend.completed;
        const userResult = weekend.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
        const qualiPos = weekend.userGridPosition;

        return (
          <TouchableOpacity
            key={race.circuitId}
            style={[
              styles.raceCard,
              isNext && styles.nextRace,
              isComplete && styles.completedRace,
            ]}
            onPress={() => navigation.navigate('RaceWeekend', { raceIndex: race.raceIndex })}
          >
            <View style={styles.roundBadge}>
              <Text style={[styles.roundNum, isComplete && styles.gold]}>
                {isComplete ? '✓' : race.round}
              </Text>
            </View>

            <Text style={styles.flagText}>{circuit.flag}</Text>

            <View style={styles.raceInfo}>
              <Text style={[styles.raceName, isNext && styles.nextText]}>
                {circuit.location}
                {isNext ? ' ←' : ''}
                {race.hasSprint ? ' 🏃' : ''}
              </Text>
              <Text style={styles.raceDate}>{race.date}</Text>
            </View>

            {isComplete && userResult ? (
              <View style={styles.resultBadge}>
                <Text style={[styles.resultPos, userResult.dnfLap ? { color: '#FF4444' } : styles.gold]}>
                  {userResult.dnfLap ? 'DNF' : `P${userResult.position}`}
                </Text>
                <Text style={styles.resultPts}>+{userResult.points}pts</Text>
              </View>
            ) : qualiPos ? (
              <View style={styles.resultBadge}>
                <Text style={styles.qualiPos}>Q: P{qualiPos}</Text>
              </View>
            ) : (
              <Text style={styles.arrow}>›</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 16, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, letterSpacing: 1, marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 12, marginBottom: 20 },
  raceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111120',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  nextRace: {
    borderColor: '#E0C040',
    borderWidth: 1.5,
  },
  completedRace: {
    opacity: 0.7,
  },
  roundBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNum: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  gold: { color: '#E0C040' },
  flagText: { fontSize: 24 },
  raceInfo: { flex: 1 },
  raceName: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  nextText: { color: '#E0C040' },
  raceDate: { color: '#666', fontSize: 11, marginTop: 2 },
  resultBadge: { alignItems: 'flex-end' },
  resultPos: { fontWeight: 'bold', fontSize: 15 },
  resultPts: { color: '#888', fontSize: 10 },
  qualiPos: { color: '#39B54A', fontSize: 13, fontWeight: '600' },
  arrow: { color: '#444', fontSize: 22 },
});
