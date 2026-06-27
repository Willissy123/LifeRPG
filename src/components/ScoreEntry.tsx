/**
 * Multi-input daily score entry component.
 * Collects: Todoist %, sleep score (0-10), training boolean, focus score (0-100).
 * Shows live preview of derived car attributes.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView,
} from 'react-native';
import { buildDailyScore, computeDerivedScores, DailyScore } from '../types/scoreTypes';

interface ScoreEntryProps {
  sessionLabel: string; // e.g. "FP1", "Qualifying"
  onConfirm: (score: DailyScore) => void;
  onCancel?: () => void;
  // Optional: pre-fill values from today's log
  initialTodoist?: number;
  initialSleep?: number;
  initialTraining?: boolean;
  initialFocus?: number;
}

interface AttributeBar {
  label: string;
  value: number;
  color: string;
  description: string;
}

export const ScoreEntry: React.FC<ScoreEntryProps> = ({
  sessionLabel,
  onConfirm,
  onCancel,
  initialTodoist = 50,
  initialSleep = 7,
  initialTraining = false,
  initialFocus = 50,
}) => {
  const [todoist, setTodoist] = useState(String(initialTodoist));
  const [sleep, setSleep] = useState(String(initialSleep));
  const [training, setTraining] = useState(initialTraining);
  const [focus, setFocus] = useState(String(initialFocus));

  const todoistVal = Math.min(100, Math.max(0, Number(todoist) || 0));
  const sleepVal   = Math.min(10, Math.max(0, Number(sleep) || 0));
  const focusVal   = Math.min(100, Math.max(0, Number(focus) || 0));

  const derived = computeDerivedScores(todoistVal, sleepVal, training, focusVal);

  const bars: AttributeBar[] = [
    { label: 'Qualifying Pace', value: derived.qualifyingPace, color: '#FF2800', description: 'Raw speed in qualifying (sleep + focus)' },
    { label: 'Race Pace',       value: derived.racePace,       color: '#FF8800', description: 'Sustained race performance (all inputs)' },
    { label: 'Tyre Management', value: derived.tyreMgmt,       color: '#39B54A', description: 'Tyre conservation (training + sleep)' },
    { label: 'Wet Weather',     value: derived.wetWeather,     color: '#0067FF', description: 'Wet conditions skill (focus + training)' },
    { label: 'Strategy',        value: derived.strategy,       color: '#CC00FF', description: 'Pit timing precision (Todoist %)' },
  ];

  const handleConfirm = () => {
    const score = buildDailyScore(todoistVal, sleepVal, training, focusVal);
    onConfirm(score);
  };

  const valid = !isNaN(todoistVal) && !isNaN(sleepVal) && !isNaN(focusVal);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Score Entry — {sessionLabel}</Text>
      <Text style={styles.subtitle}>Your life performance drives your car for this session</Text>

      {/* Inputs */}
      <View style={styles.inputs}>
        <InputRow
          label="Todoist tasks completed"
          suffix="%"
          value={todoist}
          onChangeText={setTodoist}
          placeholder="0–100"
          keyboardType="numeric"
          hint="Maps to → Strategy & pit timing"
        />
        <InputRow
          label="Sleep quality"
          suffix="/ 10"
          value={sleep}
          onChangeText={setSleep}
          placeholder="0–10"
          keyboardType="decimal-pad"
          hint="Maps to → Qualifying pace & race pace"
        />
        <InputRow
          label="Focus score"
          suffix="/ 100"
          value={focus}
          onChangeText={setFocus}
          placeholder="0–100"
          keyboardType="numeric"
          hint="Maps to → Wet weather & overtaking"
        />

        <View style={styles.trainingRow}>
          <View style={styles.trainingLeft}>
            <Text style={styles.inputLabel}>Trained today?</Text>
            <Text style={styles.hint}>Maps to → Tyre management & endurance</Text>
          </View>
          <Switch
            value={training}
            onValueChange={setTraining}
            trackColor={{ true: '#E0C040', false: '#333' }}
            thumbColor={training ? '#FFF' : '#888'}
          />
        </View>
      </View>

      {/* Derived attribute bars */}
      <View style={styles.barsSection}>
        <Text style={styles.barsTitle}>CAR ATTRIBUTES THIS SESSION</Text>
        {bars.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <View style={styles.barMeta}>
              <Text style={styles.barLabel}>{bar.label}</Text>
              <Text style={styles.barValue}>{bar.value}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${bar.value}%`, backgroundColor: bar.color },
                ]}
              />
            </View>
            <Text style={styles.barDesc}>{bar.description}</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !valid && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={!valid}
        >
          <Text style={styles.confirmText}>Lock In & Run {sessionLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

interface InputRowProps {
  label: string;
  suffix: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType: 'numeric' | 'decimal-pad';
  hint: string;
}

const InputRow: React.FC<InputRowProps> = ({ label, suffix, value, onChangeText, placeholder, keyboardType, hint }) => (
  <View style={styles.inputRow}>
    <View style={styles.inputMeta}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
    <View style={styles.inputBox}>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#555"
        maxLength={5}
      />
      <Text style={styles.suffix}>{suffix}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { padding: 20, paddingBottom: 40 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 13, marginBottom: 24 },
  inputs: { gap: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputMeta: { flex: 1, marginRight: 12 },
  inputLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  hint: { color: '#E0C040', fontSize: 11, marginTop: 2 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2a', borderRadius: 8, paddingHorizontal: 12 },
  textInput: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', width: 60, textAlign: 'center', paddingVertical: 10 },
  suffix: { color: '#888', fontSize: 13, marginLeft: 4 },
  trainingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trainingLeft: { flex: 1, marginRight: 12 },
  barsSection: { marginTop: 28 },
  barsTitle: { color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 12 },
  barRow: { marginBottom: 14 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { color: '#CCCCCC', fontSize: 12 },
  barValue: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  barTrack: { height: 6, backgroundColor: '#1a1a2a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  barDesc: { color: '#555', fontSize: 10, marginTop: 3 },
  buttons: { marginTop: 32, gap: 12 },
  confirmBtn: { backgroundColor: '#E0C040', borderRadius: 10, padding: 16, alignItems: 'center' },
  disabledBtn: { opacity: 0.4 },
  confirmText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 14 },
});
