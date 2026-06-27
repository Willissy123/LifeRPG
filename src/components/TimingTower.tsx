import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RaceCarState, RaceConditions } from '../types';
import { DRIVERS_2025 } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { formatGap, formatLapTime, tyreColor, tyreCompoundLabel } from '../engine/utils';

interface TimingTowerProps {
  cars: RaceCarState[];
  conditions: RaceConditions;
  currentLap: number;
  totalLaps: number;
  fastestLapHolder: string | null;
}

export const TimingTower: React.FC<TimingTowerProps> = ({
  cars,
  conditions,
  currentLap,
  totalLaps,
  fastestLapHolder,
}) => {
  const sorted = [...cars].sort((a, b) => {
    if (a.status === 'retired' && b.status !== 'retired') return 1;
    if (b.status === 'retired' && a.status !== 'retired') return -1;
    return a.position - b.position;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.lapCounter}>
          LAP {Math.min(currentLap, totalLaps)} / {totalLaps}
        </Text>
        <Text style={styles.weatherBadge}>
          {conditions.weather === 'dry' ? '☀️ DRY' :
           conditions.weather === 'light_rain' ? '🌧 INTER' : '⛈ WET'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sorted.map((car, idx) => {
          const driver = DRIVERS_2025.find((d) => d.id === car.driverId);
          const team = TEAMS_2025.find((t) => t.id === driver?.teamId);
          const teamColor = team?.color ?? '#888';
          const isUser = driver?.isUser ?? false;
          const isRetired = car.status === 'retired';
          const isFastestLap = fastestLapHolder === car.driverId;

          return (
            <View
              key={car.driverId}
              style={[
                styles.row,
                isUser && styles.userRow,
                isRetired && styles.retiredRow,
              ]}
            >
              {/* Position */}
              <View style={[styles.posBox, isRetired && styles.posRetired]}>
                <Text style={[styles.posText, isRetired && { color: '#666' }]}>
                  {isRetired ? 'OUT' : car.position}
                </Text>
              </View>

              {/* Team colour strip */}
              <View style={[styles.teamStrip, { backgroundColor: teamColor }]} />

              {/* Driver info */}
              <View style={styles.driverInfo}>
                <Text style={[styles.driverCode, isRetired && styles.retiredText]}>
                  {driver?.shortName ?? '???'}
                  {isFastestLap && !isRetired ? ' ⚡' : ''}
                </Text>
                <Text style={[styles.teamName, { color: teamColor }]}>
                  {team?.shortName ?? ''}
                </Text>
              </View>

              {/* Tyre */}
              <View style={[styles.tyreBadge, { backgroundColor: tyreColor(car.tyreCompound) + '22' }]}>
                <Text style={[styles.tyreText, { color: tyreColor(car.tyreCompound) }]}>
                  {car.tyreCompound}
                </Text>
                <Text style={styles.tyreAge}>{car.tyreAgeLaps}L</Text>
              </View>

              {/* Gap */}
              <Text style={[styles.gap, isRetired && styles.retiredText]}>
                {isRetired
                  ? `DNF L${car.dnfLap}`
                  : idx === 0
                  ? 'LEADER'
                  : formatGap(car.gapToLeader)}
              </Text>

              {/* Last lap */}
              <Text style={[styles.lapTime, isFastestLap && styles.fastestLapTime]}>
                {car.lastLapTime > 0 ? formatLapTime(car.lastLapTime) : '---'}
              </Text>

              {/* Pitting indicator */}
              {car.inPitLane && (
                <View style={styles.pitIndicator}>
                  <Text style={styles.pitText}>PIT</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d18',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  lapCounter: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  weatherBadge: {
    color: '#AAAAAA',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#181828',
  },
  userRow: {
    backgroundColor: '#1a1a08',
  },
  retiredRow: {
    opacity: 0.45,
  },
  posBox: {
    width: 28,
    alignItems: 'center',
  },
  posRetired: {
    opacity: 0.5,
  },
  posText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  teamStrip: {
    width: 3,
    height: 28,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  driverInfo: {
    flex: 1,
  },
  driverCode: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  teamName: {
    fontSize: 9,
    marginTop: 1,
  },
  tyreBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginHorizontal: 4,
    alignItems: 'center',
    minWidth: 30,
  },
  tyreText: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  tyreAge: {
    color: '#888',
    fontSize: 8,
  },
  gap: {
    color: '#FFFFFF',
    fontSize: 11,
    width: 56,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  lapTime: {
    color: '#AAAAAA',
    fontSize: 9,
    width: 60,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  fastestLapTime: {
    color: '#CC00FF',
  },
  retiredText: {
    color: '#666',
  },
  pitIndicator: {
    backgroundColor: '#FF8800',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 4,
  },
  pitText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
