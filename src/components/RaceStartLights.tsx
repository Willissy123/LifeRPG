import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onResult: (penalty: number) => void;
}

type Phase = 'lighting' | 'lit' | 'go' | 'result';

interface ResultInfo {
  penalty: number;
  label: string;
  color: string;
}

function resultFor(reactionMs: number): ResultInfo {
  if (reactionMs < 0) return { penalty: -5, label: 'Jump Start! -5 grid places', color: '#FF4444' };
  if (reactionMs <= 250) return { penalty: 2, label: 'Perfect Launch! +2 positions', color: '#39B54A' };
  if (reactionMs <= 500) return { penalty: 1, label: 'Good Start! +1 position', color: '#39B54A' };
  if (reactionMs <= 900) return { penalty: 0, label: 'Slow Reaction. No change', color: '#E0C040' };
  return { penalty: -2, label: 'Very Slow! -2 positions', color: '#FF8800' };
}

export const RaceStartLights: React.FC<Props> = ({ onResult }) => {
  const [litCount, setLitCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('lighting');
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [pressed, setPressed] = useState(false);
  const goTimeRef = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    // Light up 5 lights one by one, 700ms apart
    for (let i = 1; i <= 5; i++) {
      timers.push(setTimeout(() => setLitCount(i), 700 * i));
    }
    timers.push(setTimeout(() => setPhase('lit'), 700 * 5));
    // After all lit, random delay 800-2500ms then go dark
    const randomDelay = 800 + Math.random() * 1700;
    timers.push(setTimeout(() => {
      setLitCount(0);
      setPhase('go');
      goTimeRef.current = performance.now();
    }, 700 * 5 + randomDelay));
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const handleLaunch = () => {
    if (phase === 'result') return;
    let reactionMs: number;
    if (phase === 'go' && goTimeRef.current != null) {
      reactionMs = performance.now() - goTimeRef.current;
    } else {
      reactionMs = -1; // jumped the start
    }
    timersRef.current.forEach(clearTimeout);
    const r = resultFor(reactionMs);
    setResult(r);
    setPhase('result');
    setTimeout(() => onResult(r.penalty), 1900);
  };

  const goActive = phase === 'go';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 28,
    }}>
      <div style={{ color: '#888', fontSize: 12, letterSpacing: 4, fontWeight: 'bold' }}>LIGHTS OUT</div>

      {/* Light gantry */}
      <div style={{
        display: 'flex', gap: 14, background: '#0a0a0a',
        padding: '20px 22px', borderRadius: 16, border: '2px solid #1a1a1a',
      }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const on = i < litCount;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: on ? '#FF2222' : '#1c1c1c',
                boxShadow: on ? '0 0 18px #FF2222' : 'none',
                transition: 'background 0.1s, box-shadow 0.1s',
              }} />
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: on ? '#FF2222' : '#1c1c1c',
                boxShadow: on ? '0 0 18px #FF2222' : 'none',
                transition: 'background 0.1s, box-shadow 0.1s',
              }} />
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      <div style={{ height: 40, textAlign: 'center' }}>
        {phase === 'result' && result ? (
          <div style={{ color: result.color, fontSize: 22, fontWeight: 'bold', animation: 'countUp 0.3s ease-out' }}>
            {result.label}
          </div>
        ) : goActive ? (
          <div style={{ color: '#39B54A', fontSize: 24, fontWeight: 'bold', animation: 'pulse 0.4s infinite' }}>GO! GO! GO!</div>
        ) : (
          <div style={{ color: '#555', fontSize: 14 }}>
            {phase === 'lighting' ? 'Lights coming on...' : 'Wait for lights out...'}
          </div>
        )}
      </div>

      {/* Launch button */}
      <button
        onClick={handleLaunch}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        disabled={phase === 'result'}
        style={{
          width: 200, height: 200, borderRadius: '50%', border: 'none',
          background: goActive ? '#39B54A' : '#E0C040',
          color: '#000', fontSize: 32, fontWeight: 'bold', cursor: 'pointer',
          boxShadow: goActive ? '0 0 40px rgba(57,181,74,0.6)' : '0 0 20px rgba(224,192,64,0.3)',
          transform: pressed ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.1s, background 0.1s',
          opacity: phase === 'result' ? 0.5 : 1,
        }}
      >
        LAUNCH!
      </button>
      <div style={{ color: '#444', fontSize: 11 }}>Tap the instant the lights go out</div>
    </div>
  );
};
