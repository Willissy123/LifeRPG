import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('99');
  const { initGame } = useGameStore();
  const navigate = useNavigate();

  const handleStart = () => {
    if (!name.trim()) return;
    const num = Math.min(99, Math.max(1, parseInt(number) || 99));
    initGame(name.trim(), num);
    navigate('/home', { replace: true });
  };

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100%', padding: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 64, marginTop: 32 }}>🏎</span>
      <h1 style={{ color: '#FFF', fontSize: 32, fontWeight: 'bold', letterSpacing: 3, marginTop: 12 }}>F1 LIFE RPG</h1>
      <p style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
        Your daily performance drives your car.{'\n'}
        Build a midfield team across multiple seasons.
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
        <div>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>YOUR NAME</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            style={{
              width: '100%', background: '#1a1a2a', borderRadius: 10, padding: '16px',
              color: '#FFF', fontSize: 18, fontWeight: 'bold', border: 'none',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>RACING NUMBER (1–99)</div>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="99"
            min={1} max={99}
            style={{
              width: '100%', background: '#1a1a2a', borderRadius: 10, padding: '16px',
              color: '#FFF', fontSize: 18, fontWeight: 'bold', border: 'none',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ width: '100%', background: '#111120', borderRadius: 16, padding: 18, marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>HOW IT WORKS</div>
        {[
          ['📋', 'Todoist %', 'Task completion → strategy & pit timing'],
          ['😴', 'Sleep score', 'Rest quality → qualifying pace & race speed'],
          ['💪', 'Training', 'Did you work out → tyre management & endurance'],
          ['🧠', 'Focus score', 'Mental sharpness → wet weather & overtaking'],
        ].map(([icon, n, desc]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</span>
            <div>
              <div style={{ color: '#FFF', fontWeight: 600, fontSize: 13 }}>{n}</div>
              <div style={{ color: '#E0C040', fontSize: 11, marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        disabled={!name.trim()}
        style={{
          marginTop: 32, background: '#E0C040', color: '#000', fontWeight: 'bold',
          fontSize: 17, borderRadius: 14, padding: '18px 0', width: '100%',
          border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed',
          opacity: name.trim() ? 1 : 0.4,
        }}
      >
        Start Season 2025 →
      </button>
    </div>
  );
}
