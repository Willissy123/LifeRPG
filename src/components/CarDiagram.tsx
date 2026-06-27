import React from 'react';
import { UpgradeArea } from '../types';

interface Props {
  levels: Record<UpgradeArea, number>;
  teamColor?: string;
  onSelectPart?: (area: UpgradeArea) => void;
  selected?: UpgradeArea | null;
}

function dotColor(level: number): string {
  if (level === 0) return '#555';
  if (level <= 3) return '#39B54A';
  if (level <= 6) return '#E0C040';
  if (level <= 9) return '#FF8800';
  return '#FF2222';
}

// Top-down simplified F1 car. viewBox 0 0 120 220.
export const CarDiagram: React.FC<Props> = ({ levels, teamColor = '#E0C040', onSelectPart, selected }) => {
  const part = (area: UpgradeArea, cx: number, cy: number) => (
    <g
      onClick={onSelectPart ? () => onSelectPart(area) : undefined}
      style={{ cursor: onSelectPart ? 'pointer' : 'default' }}
    >
      <circle cx={cx} cy={cy} r={9}
        fill={selected === area ? dotColor(levels[area]) : '#0a0a0f'}
        stroke={dotColor(levels[area])} strokeWidth={2} />
      <text x={cx} y={cy} fill={selected === area ? '#000' : dotColor(levels[area])}
        fontSize={9} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
        {levels[area]}
      </text>
    </g>
  );

  return (
    <svg width={140} height={260} viewBox="0 0 120 220" style={{ display: 'block', margin: '0 auto' }}>
      {/* Front wing (aero) */}
      <rect x={28} y={8} width={64} height={10} rx={3} fill="#1a1a2a" stroke={teamColor} strokeWidth={1.5} />
      {/* Nose */}
      <path d="M54 18 L66 18 L62 40 L58 40 Z" fill="#1a1a2a" stroke={teamColor} strokeWidth={1.5} />
      {/* Front wheels (reliability/suspension) */}
      <rect x={16} y={44} width={12} height={26} rx={3} fill="#222" stroke="#333" />
      <rect x={92} y={44} width={12} height={26} rx={3} fill="#222" stroke="#333" />
      {/* Chassis / monocoque */}
      <rect x={48} y={40} width={24} height={100} rx={8} fill="#1a1a2a" stroke={teamColor} strokeWidth={1.5} />
      {/* Sidepods */}
      <rect x={34} y={70} width={14} height={50} rx={5} fill="#161622" stroke={teamColor} strokeWidth={1} />
      <rect x={72} y={70} width={14} height={50} rx={5} fill="#161622" stroke={teamColor} strokeWidth={1} />
      {/* Engine cover (engine) */}
      <path d="M52 140 L68 140 L64 178 L56 178 Z" fill="#1a1a2a" stroke={teamColor} strokeWidth={1.5} />
      {/* Rear wheels */}
      <rect x={14} y={150} width={13} height={28} rx={3} fill="#222" stroke="#333" />
      <rect x={93} y={150} width={13} height={28} rx={3} fill="#222" stroke="#333" />
      {/* Rear wing */}
      <rect x={30} y={188} width={60} height={12} rx={3} fill="#1a1a2a" stroke={teamColor} strokeWidth={1.5} />

      {/* Part level dots */}
      {part('aero', 60, 13)}        {/* front wing */}
      {part('chassis', 60, 90)}     {/* floor/chassis */}
      {part('engine', 60, 159)}     {/* engine cover */}
      {part('tyreComp', 21, 164)}   {/* tyres */}
      {part('reliability', 99, 57)} {/* suspension/front */}
    </svg>
  );
};
