import React, { useState } from 'react';
import { buildDailyScore, computeDerivedScores, DailyScore } from '../types/scoreTypes';

interface ScoreEntryProps {
  sessionLabel: string;
  onConfirm: (score: DailyScore) => void;
  onCancel?: () => void;
  initialTodoist?: number;
  initialSleep?: number;
  initialTraining?: boolean;
  initialFocus?: number;
}

export const ScoreEntry: React.FC<ScoreEntryProps> = ({
  sessionLabel, onConfirm, onCancel,
  initialTodoist = 50, initialSleep = 7, initialTraining = false, initialFocus = 50,
}) => {
  const [todoist, setTodoist] = useState(String(initialTodoist));
  const [sleep, setSleep] = useState(String(initialSleep));
  const [training, setTraining] = useState(initialTraining);
  const [focus, setFocus] = useState(String(initialFocus));

  const todoistVal = Math.min(100, Math.max(0, Number(todoist) || 0));
  const sleepVal   = Math.min(10, Math.max(0, Number(sleep) || 0));
  const focusVal   = Math.min(100, Math.max(0, Number(focus) || 0));

  const derived = computeDerivedScores(todoistVal, sleepVal, training, focusVal);

  const bars = [
    { label: 'Qualifying Pace', value: derived.qualifyingPace, color: '#FF2800', desc: 'Raw speed in qualifying (sleep + focus)' },
    { label: 'Race Pace',       value: derived.racePace,       color: '#FF8800', desc: 'Sustained race performance (all inputs)' },
    { label: 'Tyre Management', value: derived.tyreMgmt,       color: '#39B54A', desc: 'Tyre conservation (training + sleep)' },
    { label: 'Wet Weather',     value: derived.wetWeather,     color: '#0067FF', desc: 'Wet conditions skill (focus + training)' },
    { label: 'Strategy',        value: derived.strategy,       color: '#CC00FF', desc: 'Pit timing precision (Todoist %)' },
  ];

  const handleConfirm = () => {
    onConfirm(buildDailyScore(todoistVal, sleepVal, training, focusVal));
  };

  const valid = !isNaN(todoistVal) && !isNaN(sleepVal) && !isNaN(focusVal);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100%', padding: 20, paddingBottom: 40 }}>
      <h2 style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
        Score Entry — {sessionLabel}
      </h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Your life performance drives your car for this session
      </p>

      {/* Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InputRow label="Todoist tasks completed" suffix="%" value={todoist}
          onChange={setTodoist} placeholder="0–100" hint="Maps to → Strategy & pit timing" />
        <InputRow label="Sleep quality" suffix="/ 10" value={sleep}
          onChange={setSleep} placeholder="0–10" hint="Maps to → Qualifying pace & race pace" />
        <InputRow label="Focus score" suffix="/ 100" value={focus}
          onChange={setFocus} placeholder="0–100" hint="Maps to → Wet weather & overtaking" />

        {/* Training toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>Trained today?</div>
            <div style={{ color: '#E0C040', fontSize: 11, marginTop: 2 }}>Maps to → Tyre management & endurance</div>
          </div>
          <Toggle value={training} onChange={setTraining} />
        </div>
      </div>

      {/* Derived attribute bars */}
      <div style={{ marginTop: 28 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
          CAR ATTRIBUTES THIS SESSION
        </div>
        {bars.map((bar) => (
          <div key={bar.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#CCC', fontSize: 12 }}>{bar.label}</span>
              <span style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{bar.value}</span>
            </div>
            <div style={{ height: 6, background: '#1a1a2a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${bar.value}%`, background: bar.color, borderRadius: 3 }} />
            </div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>{bar.desc}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={handleConfirm}
          disabled={!valid}
          style={{
            background: valid ? '#E0C040' : '#555', color: '#000', fontWeight: 'bold',
            fontSize: 15, borderRadius: 10, padding: '16px 0', border: 'none',
            opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed',
          }}
        >
          Lock In & Run {sessionLabel}
        </button>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', color: '#888', fontSize: 14,
            borderRadius: 10, padding: '14px 0',
            border: '1px solid #333', cursor: 'pointer',
          }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

function InputRow({ label, suffix, value, onChange, placeholder, hint }: {
  label: string; suffix: string; value: string;
  onChange: (v: string) => void; placeholder: string; hint: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#E0C040', fontSize: 11, marginTop: 2 }}>{hint}</div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', background: '#1a1a2a',
        borderRadius: 8, paddingLeft: 12, paddingRight: 8,
      }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#FFF', fontSize: 18, fontWeight: 'bold',
            width: 60, textAlign: 'center', padding: '10px 0',
          }}
        />
        <span style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>{suffix}</span>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer',
        background: value ? '#E0C040' : '#333', position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 25, height: 25, borderRadius: '50%',
        background: '#FFF', transition: 'left 0.2s',
      }} />
    </button>
  );
}
