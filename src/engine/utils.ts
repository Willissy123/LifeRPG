import { TrackPoint, TyreCompound, Weather } from '../types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(randBetween(min, max + 1));
}

export function randNormal(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

export function distancePt(a: TrackPoint, b: TrackPoint): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function polylineLength(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distancePt(points[i], points[i + 1]);
  }
  // close the loop
  total += distancePt(points[points.length - 1], points[0]);
  return total;
}

export function positionAlongTrack(
  progress: number, // 0-1
  points: TrackPoint[],
): TrackPoint {
  const closed = [...points, points[0]]; // close the loop
  const total = polylineLength(points);
  const target = ((progress % 1) + 1) % 1 * total;

  let accumulated = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const segLen = distancePt(closed[i], closed[i + 1]);
    if (accumulated + segLen >= target) {
      const t = (target - accumulated) / segLen;
      return {
        x: lerp(closed[i].x, closed[i + 1].x, t),
        y: lerp(closed[i].y, closed[i + 1].y, t),
      };
    }
    accumulated += segLen;
  }
  return points[0];
}

export function formatLapTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secStr = secs.toFixed(3).padStart(6, '0');
  return `${mins}:${secStr}`;
}

export function formatGap(gap: number, leader = false): string {
  if (leader) return 'LEADER';
  if (gap >= 3600) return 'DNF';
  if (gap > 90) return `+1 LAP`;
  return `+${gap.toFixed(3)}`;
}

export function formatRaceTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${s.toFixed(3).padStart(6,'0')}`;
  return `${m}:${s.toFixed(3).padStart(6,'0')}`;
}

// Tyre degradation model
// Returns multiplier: 1.0 = no deg, >1.0 = slower
export function tyreDegFactor(compound: TyreCompound, ageLaps: number): number {
  const cliffLap: Record<TyreCompound, number> = { S: 12, M: 20, H: 30, W: 25, I: 20 };
  const baseSlope: Record<TyreCompound, number> = { S: 0.006, M: 0.003, H: 0.0018, W: 0.004, I: 0.004 };
  const cliff = cliffLap[compound];
  const slope = baseSlope[compound];
  if (ageLaps <= cliff) {
    return 1 + slope * ageLaps;
  }
  // After cliff: faster degradation
  return 1 + slope * cliff + slope * 3 * (ageLaps - cliff);
}

// Fuel weight effect: full tank (+110kg) = ~2.5s per lap slower, linear with remaining fuel
export function fuelFactor(fuelKg: number, baseLapTime: number): number {
  const maxDelta = 2.5; // seconds slower at 110kg
  return 1 + (fuelKg / 110) * (maxDelta / baseLapTime);
}

// Weather / tyre compatibility factor
export function weatherTyreFactor(weather: Weather, compound: TyreCompound): number {
  if (weather === 'dry') {
    if (compound === 'W') return 1.5;   // wets on dry = disaster
    if (compound === 'I') return 1.35;
    return 1.0;
  }
  if (weather === 'light_rain') {
    if (compound === 'W') return 1.0;
    if (compound === 'I') return 1.08;
    return 1.25; // slicks on wet = slow & dangerous
  }
  // heavy rain
  if (compound === 'W') return 1.0;
  if (compound === 'I') return 1.15;
  return 1.55;
}

// Convert a single score (0-100) to a lap time multiplier
// Score 0   → +12% slower (1.12)
// Score 50  → baseline (1.00)
// Score 100 → -8% faster (0.92)
export function lifeScoreToMultiplier(score: number): number {
  const normalized = clamp(score, 0, 100) / 100;
  return 1.12 - normalized * 0.20;
}

// Multi-dimensional score → per-attribute multipliers
import { DailyScore } from '../types/scoreTypes';

export function qualifyingMultiplier(score: DailyScore): number {
  return lifeScoreToMultiplier(score.qualifyingPace);
}

export function racePaceMultiplier(score: DailyScore): number {
  return lifeScoreToMultiplier(score.racePace);
}

export function tyreMgmtMultiplier(score: DailyScore): number {
  // Higher tyreMgmt → slower tyre degradation → multiplier on deg rate
  // 0 → 1.15 (15% worse deg), 100 → 0.85 (15% better deg)
  return 1.15 - (score.tyreMgmt / 100) * 0.30;
}

export function wetWeatherMultiplier(score: DailyScore): number {
  // Only applied in wet conditions
  return lifeScoreToMultiplier(score.wetWeather);
}

export function strategyQualityFactor(score: DailyScore): number {
  // Affects pit stop timing window precision
  // High strategy → pit stops occur in optimal window
  return score.strategy / 100; // 0-1
}

// Practice prep bonus (combined from all 3 FP sessions)
// Each session score contributes up to 1.67% improvement
export function calcPrepBonus(fp1: number | null, fp2: number | null, fp3: number | null): number {
  const scores = [fp1, fp2, fp3].filter((s): s is number => s !== null);
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Max bonus 0.05 (5%) at score 100
  return (avg / 100) * 0.05 * (scores.length / 3);
}

export function tyreCompoundLabel(compound: TyreCompound): string {
  const labels: Record<TyreCompound, string> = { S: 'Soft', M: 'Medium', H: 'Hard', W: 'Wet', I: 'Inter' };
  return labels[compound];
}

export function tyreColor(compound: TyreCompound): string {
  const colors: Record<TyreCompound, string> = {
    S: '#E8002D',
    M: '#FFC906',
    H: '#FFFFFF',
    W: '#0067FF',
    I: '#39B54A',
  };
  return colors[compound];
}
