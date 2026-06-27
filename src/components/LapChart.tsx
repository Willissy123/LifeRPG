import React from 'react';
import { FinishedRaceResult } from '../types';
import { getDriver } from '../data/drivers2025';

interface LapChartProps {
  results: FinishedRaceResult[];
  totalLaps: number;
  width?: number;
  height?: number;
}

export function LapChart({ results, totalLaps, width = 340, height = 200 }: LapChartProps) {
  // Show top 8 drivers + user
  const userResult = results.find((r) => getDriver(r.driverId)?.isUser);
  const topResults = results.filter((r) => r.position <= 8 || r.driverId === userResult?.driverId);

  const padding = { top: 12, right: 16, bottom: 24, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxPos = 20;

  // Build SVG path for each driver
  const driverLines = topResults
    .filter((r) => r.positionHistory && r.positionHistory.length >= 2)
    .map((r) => {
      const d = getDriver(r.driverId);
      const isUser = d?.isUser ?? false;
      const history = r.positionHistory;
      const points = history.map((pos, lapIdx) => {
        const x = padding.left + (lapIdx / Math.max(history.length - 1, 1)) * chartW;
        const y = padding.top + ((pos - 1) / (maxPos - 1)) * chartH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return { driverId: r.driverId, shortName: d?.shortName ?? '?', color: d?.color ?? '#888', isUser, path: `M ${points.join(' L ')}` };
    });

  if (driverLines.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#555', fontSize: 12, padding: 20 }}>
        No lap chart data available
      </div>
    );
  }

  // Y axis labels
  const yLabels = [1, 5, 10, 15, 20];

  return (
    <div>
      <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>LAP CHART</div>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {yLabels.map((pos) => {
          const y = padding.top + ((pos - 1) / (maxPos - 1)) * chartH;
          return (
            <g key={pos}>
              <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y}
                stroke="#222" strokeWidth={1} />
              <text x={padding.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#555">P{pos}</text>
            </g>
          );
        })}
        {/* X axis labels */}
        {[1, Math.floor(totalLaps / 2), totalLaps].map((lap) => {
          const x = padding.left + ((lap - 1) / Math.max(totalLaps - 1, 1)) * chartW;
          return (
            <text key={lap} x={x} y={height - 4} textAnchor="middle" fontSize={9} fill="#555">{lap}</text>
          );
        })}
        {/* Driver lines — AI first, user on top */}
        {driverLines.filter((l) => !l.isUser).map((line) => (
          <path key={line.driverId} d={line.path} fill="none"
            stroke={line.color} strokeWidth={1.5} opacity={0.5} />
        ))}
        {driverLines.filter((l) => l.isUser).map((line) => (
          <path key={line.driverId} d={line.path} fill="none"
            stroke={line.color} strokeWidth={3} strokeLinecap="round" />
        ))}
        {/* User final position dot */}
        {driverLines.filter((l) => l.isUser).map((line) => {
          const r = results.find((r) => r.driverId === line.driverId);
          if (!r || !r.positionHistory?.length) return null;
          const lastPos = r.positionHistory[r.positionHistory.length - 1];
          const cx = padding.left + chartW;
          const cy = padding.top + ((lastPos - 1) / (maxPos - 1)) * chartH;
          return (
            <g key={`dot-${line.driverId}`}>
              <circle cx={cx} cy={cy} r={5} fill={line.color} />
              <text x={cx + 7} y={cy + 4} fontSize={9} fill={line.color} fontWeight="bold">YOU</text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        {driverLines.map((line) => (
          <div key={line.driverId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: line.isUser ? 16 : 12, height: line.isUser ? 3 : 2, background: line.color, opacity: line.isUser ? 1 : 0.6, borderRadius: 2 }} />
            <span style={{ color: line.isUser ? line.color : '#888', fontSize: 10, fontWeight: line.isUser ? 'bold' : 'normal' }}>
              {line.shortName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
