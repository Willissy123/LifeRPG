/**
 * Garage / Car Development screen.
 * Shows upgrades tree, available budget, and what each upgrade does.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { getTeam } from '../data/teams2025';
import { USER_TEAM_ID } from '../data/drivers2025';
import { UPGRADE_COSTS, UpgradeArea, CarDevelopment } from '../types';

const UPGRADE_META: Record<UpgradeArea, { label: string; description: string; icon: string; color: string }> = {
  aero:        { label: 'Aerodynamics',    description: '-0.18% lap time per level. Downforce and drag reduction.', icon: '🌬', color: '#0090FF' },
  engine:      { label: 'Engine Power',    description: '-0.15% lap time per level. Top speed on straights.', icon: '⚡', color: '#FF8800' },
  chassis:     { label: 'Chassis',         description: '-0.12% lap time per level. Mechanical grip and balance.', icon: '🔧', color: '#39B54A' },
  reliability: { label: 'Reliability',     description: '-3% DNF probability per level. Fewer mechanical failures.', icon: '🛡', color: '#CC00FF' },
  tyreComp:    { label: 'Tyre Compounds',  description: '-5% tyre deg per level. Extends stints significantly.', icon: '🏎', color: '#FF2800' },
};

const AREA_ORDER: UpgradeArea[] = ['aero', 'engine', 'chassis', 'reliability', 'tyreComp'];

export default function GarageScreen() {
  const { currentSeason, purchaseUpgrade } = useGameStore();
  const { carDevelopment } = currentSeason;
  const userTeam = getTeam(USER_TEAM_ID);
  const teamColor = userTeam?.color ?? '#E0C040';

  const budget = carDevelopment.totalBudgetEarned - carDevelopment.budgetSpent;

  const handleUpgrade = (area: UpgradeArea) => {
    const current = carDevelopment[area] as number;
    if (current >= 10) {
      Alert.alert('Max Level', 'This upgrade is already at maximum level.');
      return;
    }
    const cost = UPGRADE_COSTS[area][current];
    if (budget < cost) {
      Alert.alert('Insufficient Budget', `You need $${cost}M but only have $${budget.toFixed(1)}M.\n\nEarn more by finishing in the points!`);
      return;
    }
    Alert.alert(
      `Upgrade ${UPGRADE_META[area].label}`,
      `Level ${current} → ${current + 1}\nCost: $${cost}M\nRemaining after: $${(budget - cost).toFixed(1)}M`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Purchase', onPress: () => purchaseUpgrade(area as keyof CarDevelopment) },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={[styles.header, { borderColor: teamColor }]}>
        <View>
          <Text style={styles.teamLabel}>{userTeam?.shortName}</Text>
          <Text style={styles.carRating}>
            Car Rating: <Text style={[styles.carRatingNum, { color: teamColor }]}>
              {Math.round(carDevelopment.effectiveCarRating)}/100
            </Text>
          </Text>
        </View>
        <View style={styles.budget}>
          <Text style={styles.budgetLabel}>AVAILABLE BUDGET</Text>
          <Text style={styles.budgetAmount}>${budget.toFixed(1)}M</Text>
          <Text style={styles.budgetTotal}>Total earned: ${carDevelopment.totalBudgetEarned.toFixed(1)}M</Text>
        </View>
      </View>

      {/* Upgrade areas */}
      <Text style={styles.sectionLabel}>DEVELOPMENT PROGRAMME</Text>
      <Text style={styles.sectionSub}>
        Earn prize money by finishing in the points. Each position pays out in $M.
        Win: $8M · P2: $6M · P3: $5M · P10: $1M
      </Text>

      {AREA_ORDER.map((area) => {
        const meta = UPGRADE_META[area];
        const current = carDevelopment[area] as number;
        const maxed = current >= 10;
        const nextCost = maxed ? null : UPGRADE_COSTS[area][current];
        const canAfford = nextCost !== null && budget >= nextCost;

        return (
          <View key={area} style={styles.upgradeCard}>
            <View style={styles.upgradeHeader}>
              <Text style={styles.upgradeIcon}>{meta.icon}</Text>
              <View style={styles.upgradeMeta}>
                <Text style={styles.upgradeName}>{meta.label}</Text>
                <Text style={styles.upgradeDesc}>{meta.description}</Text>
              </View>
              <View style={styles.upgradeLevel}>
                <Text style={[styles.levelNum, { color: meta.color }]}>{current}</Text>
                <Text style={styles.levelMax}>/10</Text>
              </View>
            </View>

            {/* Level progress bar */}
            <View style={styles.levelBar}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.levelPip,
                    i < current && { backgroundColor: meta.color },
                  ]}
                />
              ))}
            </View>

            {/* Buy button */}
            {!maxed ? (
              <TouchableOpacity
                style={[
                  styles.buyBtn,
                  { borderColor: meta.color },
                  !canAfford && styles.buyBtnDisabled,
                ]}
                onPress={() => handleUpgrade(area)}
              >
                <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
                  Upgrade to Lv{current + 1} — ${nextCost}M
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.maxedBadge}>
                <Text style={styles.maxedText}>MAX LEVEL</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Season info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>MULTI-SEASON DEVELOPMENT</Text>
        <Text style={styles.infoText}>
          When you start a new season, you retain 50% of your upgrade levels.
          Your team grows with you over multiple seasons, just like a real F1 programme.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { backgroundColor: '#111120', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', borderLeftWidth: 4 },
  teamLabel: { color: '#888', fontSize: 11, letterSpacing: 1 },
  carRating: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  carRatingNum: { fontSize: 20 },
  budget: { alignItems: 'flex-end' },
  budgetLabel: { color: '#888', fontSize: 9, letterSpacing: 1 },
  budgetAmount: { color: '#E0C040', fontSize: 26, fontWeight: 'bold' },
  budgetTotal: { color: '#555', fontSize: 10 },
  sectionLabel: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  sectionSub: { color: '#555', fontSize: 11, lineHeight: 18 },
  upgradeCard: { backgroundColor: '#111120', borderRadius: 14, padding: 16, gap: 12 },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeIcon: { fontSize: 28 },
  upgradeMeta: { flex: 1 },
  upgradeName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  upgradeDesc: { color: '#666', fontSize: 11, marginTop: 2 },
  upgradeLevel: { flexDirection: 'row', alignItems: 'baseline' },
  levelNum: { fontSize: 26, fontWeight: 'bold' },
  levelMax: { color: '#555', fontSize: 14 },
  levelBar: { flexDirection: 'row', gap: 4 },
  levelPip: { flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3 },
  buyBtn: { borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  buyBtnDisabled: { borderColor: '#333', opacity: 0.5 },
  buyBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  buyBtnTextDisabled: { color: '#555' },
  maxedBadge: { backgroundColor: '#1a2a1a', borderRadius: 8, padding: 10, alignItems: 'center' },
  maxedText: { color: '#39B54A', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  infoBox: { backgroundColor: '#111120', borderRadius: 12, padding: 16 },
  infoTitle: { color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  infoText: { color: '#666', fontSize: 12, lineHeight: 18 },
});
