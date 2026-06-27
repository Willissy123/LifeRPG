import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete: (bonusSeconds: number) => void;
}

// Zones as fractions of the bar width
const PERFECT = { start: 0.425, end: 0.575 }; // 15% centred
const GOOD_LEFT = { start: 0.325, end: 0.425 }; // 10%
const GOOD_RIGHT = { start: 0.575, end: 0.675 }; // 10%

export const PitStopMiniGame: React.FC<Props> = ({ onComplete }) => {
  const [pos, setPos] = useState(0); // 0..1
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<{ label: string; color: string; bonus: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());
  const dirRef = useRef<1 | -1>(1);

  useEffect(() => {
    const TRAVERSE_MS = 1200;
    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      // Triangle wave between 0 and 1 with period 2*TRAVERSE_MS
      const t = (elapsed % (TRAVERSE_MS * 2)) / TRAVERSE_MS;
      const value = t <= 1 ? t : 2 - t;
      setPos(value);
      dirRef.current = t <= 1 ? 1 : -1;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const handleLock = () => {
    if (locked) return;
    setLocked(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    let r: { label: string; color: string; bonus: number };
    if (pos >= PERFECT.start && pos <= PERFECT.end) {
      r = { label: 'Perfect Stop! -0.5s', color: '#39B54A', bonus: -0.5 };
    } else if ((pos >= GOOD_LEFT.start && pos < PERFECT.start) || (pos > PERFECT.end && pos <= GOOD_RIGHT.end)) {
      r = { label: 'Clean Stop', color: '#E0C040', bonus: 0 };
    } else {
      r = { label: 'Slow Stop! +1.5s', color: '#FF4444', bonus: 1.5 };
    }
    setResult(r);
    setTimeout(() => onComplete(r.bonus), 1400);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 24,
    }}>
      <div style={{ color: '#FF8800', fontSize: 12, letterSpacing: 4, fontWeight: 'bold' }}>PIT STOP — NAIL THE TIMING</div>
      <div style={{ color: '#888', fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
        Tap LOCK IN when the marker hits the green zone for a faster stop.
      </div>

      {/* The bar */}
      <div style={{ width: '100%', maxWidth: 360, position: 'relative', height: 60 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a2a', borderRadius: 10, overflow: 'hidden' }}>
          {/* Good left */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${GOOD_LEFT.start * 100}%`, width: `${(GOOD_LEFT.end - GOOD_LEFT.start) * 100}%`, background: '#5a5020' }} />
          {/* Perfect */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${PERFECT.start * 100}%`, width: `${(PERFECT.end - PERFECT.start) * 100}%`, background: '#1d5a2a' }} />
          {/* Good right */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${GOOD_RIGHT.start * 100}%`, width: `${(GOOD_RIGHT.end - GOOD_RIGHT.start) * 100}%`, background: '#5a5020' }} />
        </div>
        {/* Indicator */}
        <div style={{
          position: 'absolute', top: -4, bottom: -4, left: `calc(${pos * 100}% - 2px)`,
          width: 4, background: '#FFF', borderRadius: 2, boxShadow: '0 0 8px #FFF',
        }} />
      </div>

      <div style={{ height: 28, textAlign: 'center' }}>
        {result && (
          <div style={{ color: result.color, fontSize: 20, fontWeight: 'bold', animation: 'countUp 0.3s ease-out' }}>
            {result.label}
          </div>
        )}
      </div>

      <button
        onClick={handleLock}
        disabled={locked}
        style={{
          width: '100%', maxWidth: 360, padding: '18px 0', borderRadius: 12, border: 'none',
          background: locked ? '#333' : '#FF8800', color: '#FFF', fontWeight: 'bold', fontSize: 18,
          cursor: locked ? 'default' : 'pointer',
        }}
      >
        {locked ? '...' : 'LOCK IN'}
      </button>
    </div>
  );
};
