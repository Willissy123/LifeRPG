import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import { RaceCarState, Circuit, RaceConditions } from '../types';
import { DRIVERS_2025 } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { getTrackLayout, catmullRomPath } from '../data/trackLayouts';
import { positionAlongTrack } from '../engine/utils';

interface TrackMapProps {
  circuit: Circuit;
  cars: RaceCarState[];
  conditions: RaceConditions;
  width?: number;
  height?: number;
}

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_SIZE = SCREEN_W - 32;

function scalePoint(pt: { x: number; y: number }, w: number, h: number, pad = 8) {
  return {
    x: pad + (pt.x / 100) * (w - pad * 2),
    y: pad + (pt.y / 100) * (h - pad * 2),
  };
}

export const TrackMap: React.FC<TrackMapProps> = ({
  circuit,
  cars,
  conditions,
  width = MAP_SIZE,
  height = MAP_SIZE * 0.75,
}) => {
  const pad = 8;
  const scale = { w: width, h: height, pad };

  const layout = useMemo(() => getTrackLayout(circuit.id), [circuit.id]);
  const waypoints = layout?.waypoints ?? circuit.points;

  // Smooth SVG path from catmull-rom spline through waypoints
  const smoothPath = useMemo(
    () => catmullRomPath(waypoints, scale),
    [waypoints, width, height],
  );

  // Start/finish line position (first waypoint)
  const sfPt = scalePoint(waypoints[0], width, height, pad);

  // Sector boundary markers
  const [s1Pct, s2Pct] = circuit.sectorBoundaries;
  const s1Pt = scalePoint(positionAlongTrack(s1Pct, waypoints), width, height, pad);
  const s2Pt = scalePoint(positionAlongTrack(s2Pct, waypoints), width, height, pad);

  // All cars sorted by position
  const racingCars = useMemo(
    () => [...cars].filter((c) => c.status !== 'retired').sort((a, b) => a.position - b.position),
    [cars],
  );
  const retiredCars = useMemo(
    () => cars.filter((c) => c.status === 'retired'),
    [cars],
  );

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Track surface (wide grey band) */}
        <Path
          d={smoothPath}
          fill="none"
          stroke="#252535"
          strokeWidth={14}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Track asphalt */}
        <Path
          d={smoothPath}
          fill="none"
          stroke="#3a3a4e"
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Wet overlay */}
        {conditions.weather !== 'dry' && (
          <Path
            d={smoothPath}
            fill="none"
            stroke={conditions.weather === 'heavy_rain' ? 'rgba(80,120,255,0.4)' : 'rgba(100,150,255,0.2)'}
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {/* White track edges */}
        <Path
          d={smoothPath}
          fill="none"
          stroke="#5a5a70"
          strokeWidth={10.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="0 0"
          opacity={0.4}
        />

        {/* Start/Finish line */}
        <Line
          x1={sfPt.x - 7} y1={sfPt.y - 2}
          x2={sfPt.x + 7} y2={sfPt.y + 2}
          stroke="#FFFFFF"
          strokeWidth={3}
        />

        {/* Sector markers */}
        <Circle cx={s1Pt.x} cy={s1Pt.y} r={4} fill="#00FF88" opacity={0.8} />
        <Circle cx={s2Pt.x} cy={s2Pt.y} r={4} fill="#FF8800" opacity={0.8} />

        {/* Safety car banner */}
        {conditions.safetyCarActive && (
          <G>
            <Rect x={width / 2 - 44} y={4} width={88} height={18} rx={5} fill="#FFD700" />
            <SvgText x={width / 2} y={16} textAnchor="middle" fill="#000000" fontSize={9} fontWeight="bold">
              SAFETY CAR
            </SvgText>
          </G>
        )}

        {/* VSC banner */}
        {conditions.virtualSafetyCar && !conditions.safetyCarActive && (
          <G>
            <Rect x={width / 2 - 44} y={4} width={88} height={18} rx={5} fill="#FFD700" opacity={0.7} />
            <SvgText x={width / 2} y={16} textAnchor="middle" fill="#000000" fontSize={9} fontWeight="bold">
              VIRTUAL SC
            </SvgText>
          </G>
        )}

        {/* Retired cars (dark grey at last position) */}
        {retiredCars.map((car) => {
          const pos = scalePoint(car.trackPosition, width, height, pad);
          return (
            <Circle key={`ret-${car.driverId}`} cx={pos.x} cy={pos.y} r={3.5} fill="#444" />
          );
        })}

        {/* Active cars */}
        {racingCars.map((car) => {
          const driver = DRIVERS_2025.find((d) => d.id === car.driverId);
          const team = TEAMS_2025.find((t) => t.id === driver?.teamId);
          const color = team?.color ?? '#CCCCCC';
          const pos = scalePoint(car.trackPosition, width, height, pad);
          const isUser = driver?.isUser ?? false;
          const r = isUser ? 7 : 5;

          return (
            <G key={car.driverId}>
              {/* User car pulse ring */}
              {isUser && (
                <Circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke="#E0C040" strokeWidth={2} opacity={0.7} />
              )}
              {/* Team coloured dot */}
              <Circle cx={pos.x} cy={pos.y} r={r} fill={color} />
              {/* Car number for top 5 */}
              {car.position <= 5 && (
                <SvgText
                  x={pos.x + r + 2}
                  y={pos.y + 3}
                  fill="#FFFFFF"
                  fontSize={7}
                  fontWeight="bold"
                >
                  {car.position}
                </SvgText>
              )}
              {/* P label inside user car dot */}
              {isUser && (
                <SvgText
                  x={pos.x} y={pos.y + 3}
                  textAnchor="middle"
                  fill="#000000"
                  fontSize={6}
                  fontWeight="bold"
                >
                  P
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d18',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
});
