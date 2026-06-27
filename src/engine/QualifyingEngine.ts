import { Circuit, QualifyingResult, CarDevelopment, devLapTimeMultiplier } from '../types';
import { DRIVERS_2025, USER_DRIVER_ID } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { randNormal, clamp, lifeScoreToMultiplier } from './utils';

interface QualifyingConfig {
  circuit: Circuit;
  lifeScore: number;
  prepBonus: number; // from practice sessions, up to 0.05
  carDev: CarDevelopment;
  sprintMode?: boolean;
}

function driverQualiLapTime(
  driverId: string,
  circuit: Circuit,
  lifeScore: number,
  prepBonus: number,
  carDev: CarDevelopment,
  attempt: 'Q1' | 'Q2' | 'Q3',
): number {
  const driver = DRIVERS_2025.find((d) => d.id === driverId);
  if (!driver) return 999;
  const team = TEAMS_2025.find((t) => t.id === driver.teamId);
  if (!team) return 999;

  const poleTime = circuit.poleTime;

  // Car quality factor (top car = ~0% off pole, midfield = ~1.5-2.5%)
  const carFactor = 1 + (100 - team.carRating) * 0.0018;

  // Driver qualifying skill
  const driverFactor = 1 + (100 - driver.qualifyingSkill) * 0.0005;

  // Random variance per attempt (Q3 = tighter, Q1 = wider)
  const stddevMap = { Q1: 0.006, Q2: 0.005, Q3: 0.004 };
  const variance = randNormal(1.0, stddevMap[attempt]);

  // Track limits / traffic: small chance of a sector lost
  const cleanLap = Math.random() > 0.12 ? 1.0 : 1 + randNormal(0.008, 0.004);

  let lapTime = poleTime * carFactor * driverFactor * variance * cleanLap;

  if (driver.isUser) {
    // Life score directly sets pace quality
    const scoreMult = lifeScoreToMultiplier(lifeScore);
    // Prep bonus from practice reduces setup uncertainty
    const prepMult = 1 - prepBonus;
    // Development upgrades reduce car's base time
    const devMult = devLapTimeMultiplier(carDev);
    lapTime = poleTime * carFactor * driverFactor * scoreMult * prepMult * devMult * variance * cleanLap;
  }

  return clamp(lapTime, poleTime, poleTime * 1.20);
}

export function simulateQualifying(config: QualifyingConfig): QualifyingResult[] {
  const { circuit, lifeScore, prepBonus, carDev, sprintMode = false } = config;
  const allDriverIds = DRIVERS_2025.map((d) => d.id);

  // ---- Sprint Qualifying: single 12-min session, all 20 drivers ----
  if (sprintMode) {
    const sqTimes = new Map<string, number>();
    for (const id of allDriverIds) {
      const lap1 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q1');
      const lap2 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q1');
      sqTimes.set(id, Math.min(lap1, lap2));
    }
    const sqSorted = [...allDriverIds].sort((a, b) => sqTimes.get(a)! - sqTimes.get(b)!);
    return sqSorted.map((id, i) => ({
      driverId: id,
      gridPosition: i + 1,
      q1Time: sqTimes.get(id) ?? null,
      q2Time: null,
      q3Time: null,
      eliminated: null,
    }));
  }

  // ---- Q1: all 20 drivers, bottom 5 eliminated ----
  const q1Times = new Map<string, number>();
  for (const id of allDriverIds) {
    // Each driver gets 2 timed laps in Q1, take best
    const lap1 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q1');
    const lap2 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q1');
    q1Times.set(id, Math.min(lap1, lap2));
  }

  const q1Sorted = [...allDriverIds].sort((a, b) => q1Times.get(a)! - q1Times.get(b)!);
  const q1Eliminated = new Set(q1Sorted.slice(15)); // positions 16-20

  // ---- Q2: top 15, bottom 5 eliminated ----
  const q2Drivers = q1Sorted.slice(0, 15);
  const q2Times = new Map<string, number>();
  for (const id of q2Drivers) {
    const lap1 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q2');
    const lap2 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q2');
    q2Times.set(id, Math.min(lap1, lap2));
  }

  const q2Sorted = q2Drivers.sort((a, b) => q2Times.get(a)! - q2Times.get(b)!);
  const q2Eliminated = new Set(q2Sorted.slice(10)); // positions 11-15

  // ---- Q3: top 10, pole shoot-out ----
  const q3Drivers = q2Sorted.slice(0, 10);
  const q3Times = new Map<string, number>();
  for (const id of q3Drivers) {
    const lap1 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q3');
    const lap2 = driverQualiLapTime(id, circuit, lifeScore, prepBonus, carDev, 'Q3');
    q3Times.set(id, Math.min(lap1, lap2));
  }

  const q3Sorted = q3Drivers.sort((a, b) => q3Times.get(a)! - q3Times.get(b)!);

  // Build final results sorted by grid position
  const results: QualifyingResult[] = [];

  // Q3 top 10 → grid 1-10
  q3Sorted.forEach((id, i) => {
    results.push({
      driverId: id,
      gridPosition: i + 1,
      q1Time: q1Times.get(id) ?? null,
      q2Time: q2Times.get(id) ?? null,
      q3Time: q3Times.get(id) ?? null,
      eliminated: null,
    });
  });

  // Q2 eliminated → grid 11-15 (sorted by Q2 time)
  [...q2Eliminated]
    .sort((a, b) => q2Times.get(a)! - q2Times.get(b)!)
    .forEach((id, i) => {
      results.push({
        driverId: id,
        gridPosition: 11 + i,
        q1Time: q1Times.get(id) ?? null,
        q2Time: q2Times.get(id) ?? null,
        q3Time: null,
        eliminated: 'Q2',
      });
    });

  // Q1 eliminated → grid 16-20
  [...q1Eliminated]
    .sort((a, b) => q1Times.get(a)! - q1Times.get(b)!)
    .forEach((id, i) => {
      results.push({
        driverId: id,
        gridPosition: 16 + i,
        q1Time: q1Times.get(id) ?? null,
        q2Time: null,
        q3Time: null,
        eliminated: 'Q1',
      });
    });

  return results;
}
