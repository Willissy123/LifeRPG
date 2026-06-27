import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';

type Tab = 'drivers' | 'constructors';

export default function StandingsScreen() {
  const [tab, setTab] = useState<Tab>('drivers');
  const { currentSeason } = useGameStore();
  const { driverStandings, constructorStandings } = currentSeason;

  const completedRaces = currentSeason.weekends.filter((w) => w.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'drivers' && styles.activeTab]}
          onPress={() => setTab('drivers')}
        >
          <Text style={[styles.tabText, tab === 'drivers' && styles.activeTabText]}>DRIVERS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'constructors' && styles.activeTab]}
          onPress={() => setTab('constructors')}
        >
          <Text style={[styles.tabText, tab === 'constructors' && styles.activeTabText]}>CONSTRUCTORS</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.raceCount}>After {completedRaces} / 24 races</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'drivers' ? (
          driverStandings.map((ds) => {
            const driver = getDriver(ds.driverId);
            const team = driver ? getTeam(driver.teamId) : null;
            const isUser = driver?.isUser;
            return (
              <View key={ds.driverId} style={[styles.row, isUser && styles.userRow]}>
                <Text style={[styles.pos, isUser && styles.gold]}>{ds.position}</Text>
                <View style={[styles.teamStrip, { backgroundColor: team?.color ?? '#888' }]} />
                <View style={styles.info}>
                  <Text style={[styles.name, isUser && styles.gold]}>
                    {driver?.shortName ?? '?'}{isUser ? ' ★' : ''}
                  </Text>
                  <Text style={[styles.teamLabel, { color: team?.color ?? '#888' }]}>
                    {team?.shortName}
                  </Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={[styles.pts, isUser && styles.gold]}>{ds.points} pts</Text>
                  <View style={styles.miStats}>
                    {ds.wins > 0 && <Text style={styles.badge}>{ds.wins}W</Text>}
                    {ds.podiums > 0 && <Text style={[styles.badge, { backgroundColor: '#1a1a2a' }]}>{ds.podiums}P</Text>}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          constructorStandings.map((cs) => {
            const team = getTeam(cs.teamId);
            const isUser = cs.teamId === 'apex_racing';
            return (
              <View key={cs.teamId} style={[styles.row, isUser && styles.userRow]}>
                <Text style={[styles.pos, isUser && styles.gold]}>{cs.position}</Text>
                <View style={[styles.teamStrip, { backgroundColor: team?.color ?? '#888' }]} />
                <View style={styles.info}>
                  <Text style={[styles.name, isUser && styles.gold]}>
                    {team?.shortName ?? '?'}{isUser ? ' ★' : ''}
                  </Text>
                  <Text style={styles.teamLabel}>{team?.name}</Text>
                </View>
                <View style={styles.statsCol}>
                  <Text style={[styles.pts, isUser && styles.gold]}>{cs.points} pts</Text>
                  {cs.wins > 0 && <Text style={styles.badge}>{cs.wins} wins</Text>}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  tabs: { flexDirection: 'row', backgroundColor: '#111120' },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#E0C040' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  activeTabText: { color: '#FFFFFF' },
  raceCount: { color: '#555', fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  list: { padding: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#111', gap: 10 },
  userRow: { backgroundColor: '#1a1a08', borderRadius: 8 },
  pos: { color: '#888', fontWeight: 'bold', fontSize: 15, width: 28 },
  gold: { color: '#E0C040' },
  teamStrip: { width: 3, height: 30, borderRadius: 1.5 },
  info: { flex: 1 },
  name: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  teamLabel: { fontSize: 11, marginTop: 2 },
  statsCol: { alignItems: 'flex-end' },
  pts: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, fontVariant: ['tabular-nums'] },
  miStats: { flexDirection: 'row', gap: 4, marginTop: 2 },
  badge: { backgroundColor: '#E0C040', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: '#000', fontSize: 9, fontWeight: 'bold' },
});
