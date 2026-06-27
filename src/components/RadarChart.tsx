import React from 'react';

interface Axis {
  label: string;
  value: number; // 0..10
}

interface Props {
  axes: Axis[];
  color?: string;
  size?: number;
}

export const RadarChart: React.FC<Props> = ({ axes, color = '#E0C040', size = 200 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = axes.length;

  const pointFor = (value: number, i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (value / 10) * radius;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const axisEnd = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };
  const labelPos = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * (radius + 16), y: cy + Math.sin(angle) * (radius + 16) };
  };

  const dataPoints = axes.map((a, i) => pointFor(a.value, i));
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Concentric grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
    const pts = axes.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = frac * radius;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    }).join(' ');
    return pts;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {rings.map((r, i) => (
        <polygon key={i} points={r} fill="none" stroke="#222" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const e = axisEnd(i);
        return <line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke="#222" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill={color + '44'} stroke={color} strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {axes.map((a, i) => {
        const lp = labelPos(i);
        return (
          <text key={i} x={lp.x} y={lp.y} fill="#888" fontSize={9}
            textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
};
