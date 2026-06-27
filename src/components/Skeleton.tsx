import React from 'react';

export const Skeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{
        height: 60, background: '#111120', borderRadius: 12,
        animation: 'shimmer 1.5s infinite',
        backgroundImage: 'linear-gradient(90deg, #111120 0%, #1a1a2a 50%, #111120 100%)',
        backgroundSize: '200px 100%',
      }} />
    ))}
  </div>
);
