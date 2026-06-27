import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGameStore } from '../store/gameStore';
import { getCircuit } from '../data/circuits';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';
import CALENDAR_2025 from '../data/calendar2025';
import { formatLapTime } from '../engine/utils';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: NavProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { currentSeason, playerName, playerNumber } = useGameStore();
  const { driverStandings, constructorStandings, weekends, carDevelopment, currentRaceIndex } = currentSeason;

  const userStanding = driverStandings.find((s) => s.driverId === USER_DRIVER_ID);
  const userDriver = getDriver(USER_DRIVER_ID);
  const userTeam = getTeam(userDriver?.teamId ?? '');

  const nextRace = weekends[currentRaceIndex];
  const nextCircuit = nextRace ? getCircuit(nextRace.circuitId) : null;
  const nextCal = nextRace ? CALENDAR_2025[currentRaceIndex] : null;

  // Season progress
  const completedRaces = weekends.filter((w) => w.completed).length;

  // Recent results (last 5)
  const recentResults = weekends
    .filter((w) => w.completed && w.raceResult)
    .slice(-5)
    .reverse();

  const topDrivers = [...driverStandings].slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Driver card */}
      <View style={[styles.driverCard, { borderColor: userTeam?.color ?? '#E0C040' }]}>
        <View style={styles.driverCardTop}>
          <View>
            <Text style={styles.driverNumber}>#{playerNumber}</Text>
            <Text style={styles.driverName}>{playerName}</Text>
            <Text style={[styles.teamName, { color: userTeam?.color ?? '#E0C040' }]}>
              {userTeam?.shortName ?? 'Apex Racing'}
            </Text>
          </View>
          <View style={styles.driverStats}>
            <StatBox label="Position" value={`P${userStanding?.position ?? '—'}`} />
            <StatBox label="Points" value={String(userStanding?.points ?? 0)} />
            <StatBox label="Wins" value={String(userStanding?.wins ?? 0)} />
          </View>
        </View>

        {/* Car development bar */}
        <View style={styles.carDevRow}>
          <Text style={styles.carDevLabel}>Car: {Math.round(carDevelopment.effectiveCarRating)}/100</Text>
          <View style={styles.carDevBar}>
            <View style={[styles.carDevFill, { width: `${carDevelopment.effectiveCarRating}%`, backgroundColor: userTeam?.color ?? '#E0C040' }]} />
          </View>
          <Text style={styles.carDevBudget}>${carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent}M</Text>
        </View>
      </View>

      {/* Season progress */}
      <View style={styles.seasonProgress}>
        <Text style={styles.sectionLabel}>SEASON {currentSeason.year}</Text>
        <Text style={styles.progressText}>{completedRaces} / 24 races</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedRaces / 24) * 100}%` }]} />
        </View>
      </View>

      {/* Next race */}
      {nextCircuit && nextCal && (
        <TouchableOpacity
          style={styles.nextRaceCard}
          onPress={() => navigation.navigate('RaceWeekend', { raceIndex: currentRaceIndex })}
        >
          <View style={styles.nextRaceHeader}>
            <Text style={styles.nextLabel}>NEXT RACE</Text>
            <Text style={styles.nextFlag}>{nextCircuit.flag}</Text>
          </View>
          <Text style={styles.nextCircuit}>{nextCircuit.name}</Text>
          <Text style={styles.nextDate}>{nextCal.date} · Round {nextCal.round}</Text>
          <View style={styles.nextMeta}>
            <Text style={styles.nextMetaItem}>{nextCircuit.laps} laps · {nextCircuit.lengthKm}km</Text>
            <Text style={styles.nextMetaItem}>
              Rain: {Math.round(nextCircuit.weatherRainChance * 100)}%
            </Text>
          </View>
          {nextRace.userGridPosition && (
            <Text style={styles.qualifiedBadge}>
              Qualified P{nextRace.userGridPosition} ✓
            </Text>
          )}
          <View style={styles.goButton}>
            <Text style={styles.goButtonText}>Open Race Weekend →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Championship standings top 5 */}
      <View style={styles.standings}>
        <Text style={styles.sectionLabel}>CHAMPIONSHIP — TOP 5</Text>
        {topDrivers.map((ds, i) => {
          const d = getDriver(ds.driverId);
          const t = d ? getTeam(d.teamId) : null;
          const isUser = d?.isUser;
          return (
            <View key={ds.driverId} style={[styles.standingRow, isUser && styles.userStandingRow]}>
              <Text style={[styles.standingPos, isUser && styles.gold]}>{i + 1}</Text>
              <View style={[styles.teamDot, { backgroundColor: t?.color ?? '#888' }]} />
              <Text style={[styles.standingName, isUser && styles.gold]}>
                {d?.shortName ?? '?'}{isUser ? ' ★' : ''}
              </Text>
              <Text style={[styles.standingPts, isUser && styles.gold]}>{ds.points} pts</Text>
            </View>
          );
        })}
      </View>

      {/* Recent results */}
      {recentResults.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.sectionLabel}>RECENT RESULTS</Text>
          {recentResults.map((w) => {
            const c = getCircuit(w.circuitId);
            const ur = w.raceResult?.find((r) => getDriver(r.driverId)?.isUser);
            return (
              <View key={w.circuitId} style={styles.recentRow}>
                <Text style={styles.recentFlag}>{c?.flag}</Text>
                <Text style={styles.recentCircuit}>{c?.location}</Text>
                <Text style={[styles.recentResult, ur?.dnfLap ? { color: '#FF4444' } : {}]}>
                  {ur?.dnfLap ? 'DNF' : `P${ur?.position ?? '?'}`}
                </Text>
                <Text style={styles.recentPoints}>+{ur?.points ?? 0} pts</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 16, paddingBottom: 40, gap: 16 },
  driverCard: {
    backgroundColor: '#111120', borderRadius: 16, padding: 18,
    borderLeftWidth: 4, borderLeftColor: '#E0C040',
  },
  driverCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  driverNumber: { color: '#444', fontSize: 36, fontWeight: 'bold' },
  driverName: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  teamName: { fontSize: 13, marginTop: 2 },
  driverStats: { flexDirection: 'row', gap: 12 },
  statBox: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  statLabel: { color: '#666', fontSize: 10, marginTop: 2 },
  carDevRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  carDevLabel: { color: '#888', fontSize: 11, width: 80 },
  carDevBar: { flex: 1, height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  carDevFill: { height: 4, borderRadius: 2 },
  carDevBudget: { color: '#E0C040', fontSize: 11, width: 50, textAlign: 'right' },
  seasonProgress: { backgroundColor: '#111120', borderRadius: 12, padding: 14 },
  sectionLabel: { color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold', marginBottom: 8 },
  progressText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: '#222', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#E0C040', borderRadius: 2 },
  nextRaceCard: { backgroundColor: '#111120', borderRadius: 16, padding: 18 },
  nextRaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nextLabel: { color: '#888', fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  nextFlag: { fontSize: 28 },
  nextCircuit: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  nextDate: { color: '#888', fontSize: 12, marginTop: 2 },
  nextMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  nextMetaItem: { color: '#666', fontSize: 11 },
  qualifiedBadge: { color: '#39B54A', fontSize: 12, fontWeight: '600', marginTop: 8 },
  goButton: { backgroundColor: '#E0C040', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  goButtonText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  standings: { backgroundColor: '#111120', borderRadius: 12, padding: 14 },
  standingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  userStandingRow: { backgroundColor: '#1a1a08', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 6 },
  standingPos: { color: '#888', width: 24, fontSize: 14, fontWeight: 'bold' },
  gold: { color: '#E0C040' },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  standingName: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  standingPts: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  recent: { backgroundColor: '#111120', borderRadius: 12, padding: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  recentFlag: { fontSize: 20, width: 28 },
  recentCircuit: { flex: 1, color: '#CCCCCC', fontSize: 13 },
  recentResult: { color: '#E0C040', fontWeight: 'bold', fontSize: 14, width: 40, textAlign: 'center' },
  recentPoints: { color: '#888', fontSize: 12, width: 44, textAlign: 'right' },
});
