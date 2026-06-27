import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useGameStore } from '../store/gameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('99');
  const { initGame } = useGameStore();

  const handleStart = () => {
    if (!name.trim()) return;
    const num = Math.min(99, Math.max(1, parseInt(number) || 99));
    initGame(name.trim(), num);
    navigation.replace('Main');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.logo}>🏎</Text>
      <Text style={styles.title}>F1 LIFE RPG</Text>
      <Text style={styles.subtitle}>
        Your daily performance drives your car.{'\n'}
        Build a midfield team across multiple seasons.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>YOUR NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
          maxLength={20}
          autoCapitalize="words"
        />

        <Text style={styles.label}>RACING NUMBER (1–99)</Text>
        <TextInput
          style={styles.input}
          placeholder="99"
          placeholderTextColor="#555"
          value={number}
          onChangeText={setNumber}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>HOW IT WORKS</Text>
        {[
          ['📋', 'Todoist %', 'Task completion → strategy & pit timing'],
          ['😴', 'Sleep score', 'Rest quality → qualifying pace & race speed'],
          ['💪', 'Training', 'Did you work out → tyre management & endurance'],
          ['🧠', 'Focus score', 'Mental sharpness → wet weather & overtaking'],
        ].map(([icon, name, desc]) => (
          <View key={name} style={styles.howRow}>
            <Text style={styles.howIcon}>{icon}</Text>
            <View>
              <Text style={styles.howName}>{name}</Text>
              <Text style={styles.howDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.startBtn, !name.trim() && styles.disabledBtn]}
        onPress={handleStart}
        disabled={!name.trim()}
      >
        <Text style={styles.startText}>Start Season 2025 →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 24, paddingBottom: 48, alignItems: 'center' },
  logo: { fontSize: 64, marginTop: 32 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', letterSpacing: 3, marginTop: 12 },
  subtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  form: { width: '100%', gap: 16, marginTop: 36 },
  label: { color: '#888', fontSize: 10, letterSpacing: 2 },
  input: {
    backgroundColor: '#1a1a2a', borderRadius: 10, padding: 16,
    color: '#FFFFFF', fontSize: 18, fontWeight: 'bold',
  },
  howItWorks: { width: '100%', backgroundColor: '#111120', borderRadius: 16, padding: 18, marginTop: 28, gap: 14 },
  howTitle: { color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  howIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  howName: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  howDesc: { color: '#E0C040', fontSize: 11, marginTop: 2 },
  startBtn: { marginTop: 32, backgroundColor: '#E0C040', borderRadius: 14, padding: 18, width: '100%', alignItems: 'center' },
  disabledBtn: { opacity: 0.4 },
  startText: { color: '#000', fontWeight: 'bold', fontSize: 17 },
});
