import { Circuit, Driver, Team, PracticeResult } from '../types';
import { DRIVERS_2025 } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { randNormal, clamp, lifeScoreToMultiplier, tyreDegFactor, formatLapTime } from './utils';

interface PracticeConfig {
  circuit: Circuit;
  lifeScore: number; // user's score for this session (0-100)
  prepBonus: number; // bonus from previous practice sessions
  sessionIndex: number; // 0=FP1, 1=FP2, 2=FP3
}

function carBasePace(driver: Driver, team: Team, circuit: Circuit): number {
  // Base lap time = pole time * (1 + factor based on car quality)
  const poleTime = circuit.poleTime;

  // Top car at 100 = pole time exactly
  // Midfield at 75 = ~1.5-2.5% off pole
  // Backmarker at 72 = ~3% off pole
  const carQualityFactor = 1 + (100 - team.carRating) * 0.0018;
  const driverFactor = 1 + (100 - driver.qualifyingSkill) * 0.0005;

  return poleTime * carQualityFactor * driverFactor;
}

export function simulatePractice(config: PracticeConfig): PracticeResult[] {
  const { circuit, lifeScore, prepBonus, sessionIndex } = config;
  const results: { driverId: string; lapTime: number }[] = [];

  // Simulate all 20 AI drivers + user
  for (const driver of DRIVERS_2025) {
    const team = TEAMS_2025.find((t) => t.id === driver.teamId);
    if (!team) continue;

    let baseLap = carBasePace(driver, team, circuit);

    if (driver.isUser) {
      // User: life score affects pace, prep bonus from previous sessions
      const scoreMult = lifeScoreToMultiplier(lifeScore);
      // Practice sessions have high variance (drivers test setups)
      const variance = randNormal(1.0, 0.012);
      // FP1 = most variance (new setup), FP3 = least (optimized)
      const sessionVariance = [0.018, 0.012, 0.007][sessionIndex];
      const sessVar = randNormal(1.0, sessionVariance);
      baseLap *= scoreMult * variance * sessVar;
      // Apply prep bonus from earlier sessions
      baseLap *= (1 - prepBonus * 0.5); // partial prep bonus applies during practice
    } else {
      // AI: small variance, session index influences whether they do a flying lap
      const driverVariance = randNormal(1.0, 0.008);
      // 15% chance of a track limits / traffic incident giving a slower time
      const incident = Math.random() < 0.15 ? randNormal(1.05, 0.02) : 1.0;
      // FP1 = less representative (learning track), FP3 = best representative
      const sessionReady = [0.994, 0.997, 1.0][sessionIndex];
      baseLap *= driverVariance * incident / sessionReady;
    }

    // Tyre compound used: FP1=Medium, FP2=Soft/Medium mix, FP3=Soft qualifying sim
    const tyreBonus = sessionIndex === 2 ? 0.993 : sessionIndex === 1 ? 0.997 : 1.002;
    baseLap *= tyreBonus;

    results.push({ driverId: driver.id, lapTime: clamp(baseLap, circuit.poleTime * 0.99, circuit.poleTime * 1.15) });
  }

  // Sort by lap time
  results.sort((a, b) => a.lapTime - b.lapTime);

  const fastest = results[0].lapTime;

  return results.map((r, i) => ({
    driverId: r.driverId,
    position: i + 1,
    lapTime: r.lapTime,
    gap: r.lapTime - fastest,
    lapsCompleted: randNormal(25, 5),
  }));
}
