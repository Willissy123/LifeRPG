import React, { useEffect, useMemo } from 'react';

interface Props {
  position: number;
  driverName: string;
  teamColor?: string;
  onDismiss: () => void;
}

const THEMES: Record<number, { bg: string; accent: string; emoji: string; title: string; colors: string[] }> = {
  1: { bg: 'radial-gradient(circle at 50% 30%, #3a2e00 0%, #0a0a0f 70%)', accent: '#E0C040', emoji: '🏆', title: 'RACE WINNER!', colors: ['#E0C040', '#FFD700', '#FFF4C0'] },
  2: { bg: 'radial-gradient(circle at 50% 30%, #2a2a30 0%, #0a0a0f 70%)', accent: '#C0C0C8', emoji: '🥈', title: 'PODIUM FINISH!', colors: ['#C0C0C8', '#E8E8F0', '#A0A0AA'] },
  3: { bg: 'radial-gradient(circle at 50% 30%, #2e1a0a 0%, #0a0a0f 70%)', accent: '#CD7F32', emoji: '🥉', title: 'PODIUM FINISH!', colors: ['#CD7F32', '#E0A060', '#A05A20'] },
};

export const PodiumCelebration: React.FC<Props> = ({ position, driverName, teamColor, onDismiss }) => {
  const theme = THEMES[position] ?? THEMES[3];

  const confetti = useMemo(() => {
    const palette = [...theme.colors, teamColor ?? theme.accent];
    return Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 1.5,
      rotation: Math.random() * 360,
      color: palette[i % palette.length],
      size: 6 + Math.random() * 8,
    }));
  }, [theme, teamColor]);

  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 250, background: theme.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', cursor: 'pointer',
      }}
    >
      {/* Confetti */}
      {confetti.map((c) => (
        <div key={c.id} style={{
          position: 'absolute', top: -20, left: `${c.left}%`,
          width: c.size, height: c.size * 1.6, background: c.color,
          borderRadius: 2,
          animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
          transform: `rotate(${c.rotation}deg)`,
        }} />
      ))}

      <div style={{ fontSize: 90, animation: 'countUp 0.5s ease-out' }}>{theme.emoji}</div>
      <div style={{
        color: theme.accent, fontSize: 40, fontWeight: 'bold', letterSpacing: 1,
        textAlign: 'center', marginTop: 8, textShadow: `0 0 24px ${theme.accent}`,
        animation: 'countUp 0.5s ease-out',
      }}>
        {theme.title}
      </div>
      <div style={{ color: '#FFF', fontSize: 22, fontWeight: 600, marginTop: 12 }}>P{position} · {driverName}</div>
      <div style={{ color: '#888', fontSize: 13, marginTop: 28 }}>Tap to continue</div>
    </div>
  );
};
