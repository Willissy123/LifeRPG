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
  initialHydration?: number;
  initialMeditation?: number;
  // Sponsor bonuses applied transparently
  focusBonus?: number;
  sleepBonus?: number;
  // Sleep-debt fatigue (3+ of last 3 sleep scores < 6.5)
  fatigued?: boolean;
}

function sleepEmoji(v: number) { return v < 6 ? '😴' : v < 7 ? '😐' : v < 8.5 ? '😊' : '🌟'; }
function hydrationEmoji(v: number) { return v < 5 ? '🏜️' : v < 7 ? '💧' : v < 9 ? '💦' : '🌊'; }
function meditationEmoji(v: number) { return v < 4 ? '😤' : v <= 7 ? '🧘' : '🌙'; }
function focusEmoji(v: number) { return v < 60 ? '😵' : v < 80 ? '🎯' : v < 95 ? '💡' : '🔥'; }

export const ScoreEntry: React.FC<ScoreEntryProps> = ({
  sessionLabel, onConfirm, onCancel,
  initialTodoist = 50, initialSleep = 7, initialTraining = false,
  initialFocus = 50, initialHydration = 5, initialMeditation = 5,
  focusBonus = 0, sleepBonus = 0, fatigued = false,
}) => {
  const [todoist, setTodoist]       = useState(String(initialTodoist));
  const [sleep, setSleep]           = useState(String(initialSleep));
  const [training, setTraining]     = useState(initialTraining);
  const [focus, setFocus]           = useState(String(initialFocus));
  const [hydration, setHydration]   = useState(String(initialHydration));
  const [meditation, setMeditation] = useState(String(initialMeditation));

  const todoistVal   = Math.min(100, Math.max(0, Number(todoist) || 0));
  const sleepRaw     = Math.min(10, Math.max(0, Number(sleep) || 0));
  const sleepVal     = Math.min(10, sleepRaw + sleepBonus);
  const focusRaw     = Math.min(100, Math.max(0, Number(focus) || 0));
  const focusVal     = Math.min(100, focusRaw + focusBonus);
  const hydrationVal = Math.min(10, Math.max(0, Number(hydration) || 0));
  const meditationVal = Math.min(10, Math.max(0, Number(meditation) || 0));

  const derived = computeDerivedScores(todoistVal, sleepVal, training, focusVal, hydrationVal, meditationVal, fatigued);

  const bars = [
    { label: 'Qualifying Pace', value: derived.qualifyingPace, color: '#FF2800', desc: 'Sleep + meditation + focus → raw speed' },
    { label: 'Race Pace',       value: derived.racePace,       color: '#FF8800', desc: 'Hydration + sleep + focus → sustained pace' },
    { label: 'Tyre Management', value: derived.tyreMgmt,       color: '#39B54A', desc: 'Training + hydration → physical endurance' },
    { label: 'Wet Weather',     value: derived.wetWeather,     color: '#0067FF', desc: 'Meditation + focus → mental sharpness' },
    { label: 'Strategy',        value: derived.strategy,       color: '#CC00FF', desc: 'Todoist % + meditation → pit decision quality' },
  ];

  const handleConfirm = () => {
    onConfirm(buildDailyScore(todoistVal, sleepRaw, training, focusRaw, hydrationVal, meditationVal, undefined, fatigued));
  };

  const valid = !isNaN(todoistVal) && !isNaN(sleepRaw) && !isNaN(focusRaw) && !isNaN(hydrationVal) && !isNaN(meditationVal);

  const isPerfect = hydrationVal === 10 && meditationVal === 10 && sleepRaw >= 9 && focusRaw >= 90 && todoistVal === 100;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100%', padding: 20, paddingBottom: 40 }}>
      <h2 style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
        Score Entry — {sessionLabel}
      </h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Your life performance drives your car for this session
      </p>

      {isPerfect && (
        <div style={{ background: '#1a1a08', borderRadius: 10, padding: 12, marginBottom: 20, textAlign: 'center' }}>
          <span style={{ color: '#E0C040', fontWeight: 'bold', fontSize: 13 }}>💯 Perfect Day — Max performance unlocked!</span>
        </div>
      )}

      {(focusBonus > 0 || sleepBonus > 0) && (
        <div style={{ background: '#0a1520', borderRadius: 10, padding: 10, marginBottom: 16 }}>
          <span style={{ color: '#0090FF', fontSize: 12 }}>
            🏷 Sponsor bonus active:
            {focusBonus > 0 && ` +${focusBonus} Focus`}
            {sleepBonus > 0 && ` +${sleepBonus} Sleep`}
          </span>
        </div>
      )}

      {fatigued && (
        <div style={{ background: '#1a0a0a', borderRadius: 10, padding: 12, marginBottom: 16, borderLeft: '3px solid #FF4444' }}>
          <span style={{ color: '#FF4444', fontSize: 12, fontWeight: 600 }}>
            ⚠️ Sleep debt — qualifying pace -6%, race pace -4%
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InputRow label="Todoist tasks completed" suffix="%" value={todoist}
          onChange={setTodoist} placeholder="0–100" hint="→ Strategy & pit timing" emoji={focusEmoji(todoistVal)} />
        <InputRow label="Sleep quality" suffix="/ 10" value={sleep}
          onChange={setSleep} placeholder="0–10" hint="→ Qualifying pace & race pace"
          bonus={sleepBonus} emoji={sleepEmoji(sleepRaw)} />
        <InputRow label="Focus score" suffix="/ 100" value={focus}
          onChange={setFocus} placeholder="0–100" hint="→ Wet weather & overtaking"
          bonus={focusBonus} emoji={focusEmoji(focusRaw)} />
        <InputRow label="Hydration" suffix="/ 10" value={hydration}
          onChange={setHydration} placeholder="0–10" hint="💧 → Late-race stamina & tyre management" color="#00AAFF" emoji={hydrationEmoji(hydrationVal)} />
        <InputRow label="Meditation / clarity" suffix="/ 10" value={meditation}
          onChange={setMeditation} placeholder="0–10" hint="🧘 → Composure, wet weather, pit strategy" color="#AA44FF" emoji={meditationEmoji(meditationVal)} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>
              Trained today? <span style={{ fontSize: 16 }}>{training ? '💪' : '🛋️'}</span>
            </div>
            <div style={{ color: '#E0C040', fontSize: 11, marginTop: 2 }}>→ Tyre management & endurance</div>
          </div>
          <Toggle value={training} onChange={setTraining} />
        </div>
      </div>

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
            borderRadius: 10, padding: '14px 0', border: '1px solid #333', cursor: 'pointer',
          }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

function InputRow({ label, suffix, value, onChange, placeholder, hint, bonus = 0, color = '#E0C040', emoji }: {
  label: string; suffix: string; value: string;
  onChange: (v: string) => void; placeholder: string; hint: string;
  bonus?: number; color?: string; emoji?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ color: '#FFF', fontSize: 14, fontWeight: 600 }}>
          {label}{emoji ? <span style={{ fontSize: 16, marginLeft: 6 }}>{emoji}</span> : null}
        </div>
        <div style={{ color, fontSize: 11, marginTop: 2 }}>{hint}</div>
        {bonus > 0 && <div style={{ color: '#0090FF', fontSize: 10, marginTop: 1 }}>+{bonus} from sponsor</div>}
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
