import {
  Circuit,
  RaceState,
  RaceCarState,
  RaceConditions,
  RaceEvent,
  FinishedRaceResult,
  TyreCompound,
  Weather,
  CarDevelopment,
  devLapTimeMultiplier,
  devReliabilityFactor,
  devTyreDegFactor,
  PRIZE_MONEY_BY_POSITION,
  TrackPoint,
} from '../types';
import { DailyScore } from '../types/scoreTypes';
import { DRIVERS_2025, USER_DRIVER_ID } from '../data/drivers2025';
import { TEAMS_2025 } from '../data/teams2025';
import { getPointsForPosition } from '../data/calendar2025';
import {
  randNormal,
  randBetween,
  clamp,
  racePaceMultiplier,
  tyreMgmtMultiplier,
  wetWeatherMultiplier,
  strategyQualityFactor,
  tyreDegFactor,
  fuelFactor,
  weatherTyreFactor,
  positionAlongTrack,
} from './utils';

// ---- Strategy helpers ----

function recommendedStartTyre(circuit: Circuit, weather: Weather): TyreCompound {
  if (weather !== 'dry') return 'W';
  // Shorter races favour soft, longer ones medium
  const laps = circuit.laps;
  if (laps > 65) return 'M';
  if (laps > 55) return Math.random() > 0.5 ? 'M' : 'S';
  return 'S';
}

function chooseNextTyre(current: TyreCompound, weather: Weather, lapsLeft: number): TyreCompound {
  if (weather !== 'dry') return 'W';
  if (current === 'S') return lapsLeft > 25 ? 'M' : 'H';
  if (current === 'M') return lapsLeft > 20 ? 'H' : 'M';
  return 'M'; // H → M (undercut)
}

function planPitLap(circuit: Circuit, startTyre: TyreCompound): number {
  // One-stop: soft → medium/hard around lap 20-35%
  // Two-stop: first stop at 30%, second at 65%
  const laps = circuit.laps;
  const twoStop = startTyre === 'S' && laps > 50 && Math.random() < 0.4;
  if (twoStop) return Math.floor(laps * 0.28 + randBetween(-2, 2));
  return Math.floor(laps * (startTyre === 'S' ? 0.32 : 0.42) + randBetween(-3, 3));
}

// ---- Core pace calculation per car per lap ----

function calcLapTime(
  car: RaceCarState,
  circuit: Circuit,
  conditions: RaceConditions,
  raceScore: DailyScore,
  prepBonus: number,
  strategyBonus: number,
  carDev: CarDevelopment,
): number {
  const driver = DRIVERS_2025.find((d) => d.id === car.driverId);
  if (!driver) return 999;
  const team = TEAMS_2025.find((t) => t.id === driver.teamId);
  if (!team) return 999;

  const baseLapTime = circuit.poleTime * (1 + (100 - team.carRating) * 0.0022);

  // Tyre degradation (dev upgrades + driver tyre mgmt skill)
  const tyreDeg = tyreDegFactor(car.tyreCompound, car.tyreAgeLaps);

  // Fuel load
  const fuelMult = fuelFactor(car.fuelKg, baseLapTime);

  // Weather / tyre compatibility
  const weatherMult = weatherTyreFactor(conditions.weather, car.tyreCompound);

  // Safety car: all cars held to ~250kph
  if (conditions.safetyCarActive) {
    return baseLapTime * 1.35 + randBetween(-0.5, 0.5);
  }

  // Driver racecraft variance
  const variance = randNormal(1.0, 0.004);

  // Dirty air penalty
  const dirtyAir = car.gapToCarAhead > 0 && car.gapToCarAhead < 1.5 ? 0.005 : 0;

  let pace = baseLapTime * tyreDeg * fuelMult * weatherMult * variance * (1 + dirtyAir);

  if (driver.isUser) {
    // race pace score → raw lap time
    const paceMult = racePaceMultiplier(raceScore);
    const prepMult = 1 - prepBonus;
    const devMult = devLapTimeMultiplier(carDev);

    // Wet weather: use wetWeather score instead of racePace score in wet conditions
    const conditionsMult = conditions.weather !== 'dry'
      ? wetWeatherMultiplier(raceScore)
      : paceMult;

    pace = baseLapTime * tyreDeg * fuelMult * weatherMult * variance * (1 + dirtyAir)
      * conditionsMult * prepMult * devMult;

    // Strategy bonus: high todoist % = better tyre management in race
    // Applied as a tyre deg correction
    if (strategyBonus > 0) {
      pace *= (1 - strategyBonus * 0.5);
    }
  } else {
    // AI: wet skill affects wet lap time
    if (conditions.weather !== 'dry') {
      const wetMult = 1 + (100 - driver.wetSkill) * 0.0008;
      pace *= wetMult;
    }
  }

  return clamp(pace, baseLapTime * 0.88, baseLapTime * 1.50);
}

// ---- Overtake model ----

function resolveOvertakes(cars: RaceCarState[], circuit: Circuit): RaceCarState[] {
  const sorted = [...cars].sort((a, b) => b.totalDistanceM - a.totalDistanceM);

  for (let i = 0; i < sorted.length - 1; i++) {
    const ahead = sorted[i];
    const behind = sorted[i + 1];
    if (ahead.status !== 'racing' || behind.status !== 'racing') continue;

    const gapMeters = ahead.totalDistanceM - behind.totalDistanceM;
    const gapSeconds = gapMeters / (circuit.lengthKm * 1000 / 90); // rough seconds

    if (gapSeconds < 1.0 && gapSeconds > 0) {
      // Overtake probability depends on circuit and pace differential
      const overtakingChance = (1.0 - circuit.overtakingDifficulty / 10) * 0.15;
      if (Math.random() < overtakingChance) {
        // Swap positions
        const tmpDist = ahead.totalDistanceM;
        ahead.totalDistanceM = behind.totalDistanceM;
        behind.totalDistanceM = tmpDist + 50;
      }
    }
  }

  return sorted;
}

// ---- DNF model ----

function checkDNF(
  car: RaceCarState,
  lap: number,
  carDev: CarDevelopment,
): boolean {
  if (!car.driverId.startsWith(USER_DRIVER_ID)) {
    // AI DNF chance ~2.5% per race, weighted to early laps
    const baseDnfChance = 0.0013;
    return Math.random() < baseDnfChance;
  }
  // User DNF: base 1.5%, reduced by reliability upgrades
  const baseDnfChance = 0.0008;
  const reliabilityMult = devReliabilityFactor(carDev);
  return Math.random() < baseDnfChance * reliabilityMult;
}

// ---- Race initialiser ----

export function initRace(
  circuit: Circuit,
  gridOrder: string[],
  conditions: RaceConditions,
  _raceScore: DailyScore,
  _prepBonus: number,
  _carDev: CarDevelopment,
): RaceState {
  const trackLengthM = circuit.lengthKm * 1000;

  const cars: RaceCarState[] = gridOrder.map((driverId, index) => {
    const startTyre = recommendedStartTyre(circuit, conditions.weather);
    const pitLap = conditions.weather === 'dry' ? planPitLap(circuit, startTyre) : null;

    // Stagger start positions slightly so cars aren't perfectly overlapping
    const gridOffset = (gridOrder.length - 1 - index) * 8; // meters behind leader's grid box

    return {
      driverId,
      position: index + 1,
      totalDistanceM: -gridOffset, // will go positive after lap 1
      currentLap: 1,
      lapProgress: 0,
      tyreCompound: startTyre,
      tyreAgeLaps: 0,
      tyreHealth: 100,
      fuelKg: 110,
      status: 'racing',
      gapToLeader: 0,
      gapToCarAhead: 0,
      lastLapTime: 0,
      bestLapTime: 0,
      pitStops: [],
      pitLap,
      inPitLane: false,
      pitTimer: 0,
      dnfLap: null,
      points: 0,
      fastestLap: false,
      trackPosition: positionAlongTrack(0, circuit.points),
    };
  });

  return {
    circuitId: circuit.id,
    totalLaps: circuit.laps,
    currentSimLap: 1,
    raceTick: 0,
    cars,
    conditions,
    status: 'idle',
    elapsedRaceSeconds: 0,
    leader: gridOrder[0],
    fastestLapHolder: null,
    fastestLapTime: null,
    events: [],
  };
}

// ---- Race tick ----
// Called every real 100ms. simSpeed multiplies the in-race time.
// At simSpeed=60: 100ms real = 6s race. A lap (~90s real) takes 1.5s real.

export function tickRace(
  state: RaceState,
  circuit: Circuit,
  simSpeed: number,
  raceScore: DailyScore,
  prepBonus: number,
  carDev: CarDevelopment,
  strategyBonus = 0,
): RaceState {
  if (state.status === 'finished' || state.status === 'paused') return state;

  const trackLengthM = circuit.lengthKm * 1000;
  const dt = 0.1 * simSpeed; // seconds of race time per real tick

  const newEvents: RaceEvent[] = [];
  let newFastestTime = state.fastestLapTime;
  let newFastestHolder = state.fastestLapHolder;

  // Update each car
  let updatedCars = state.cars.map((car) => {
    if (car.status === 'retired' || car.status === 'finished') return car;

    let c = { ...car };

    // Handle pit lane
    if (c.inPitLane) {
      c.pitTimer -= dt;
      if (c.pitTimer <= 0) {
        // Pit stop done — apply new tyres
        const newCompound = chooseNextTyre(c.tyreCompound, state.conditions.weather, circuit.laps - c.currentLap);
        c.pitStops = [...c.pitStops, {
          lap: c.currentLap,
          duration: 2.5 - c.pitTimer,
          fromCompound: c.tyreCompound,
          toCompound: newCompound,
        }];
        c.tyreCompound = newCompound;
        c.tyreAgeLaps = 0;
        c.tyreHealth = 100;
        c.inPitLane = false;
        c.pitTimer = 0;
        newEvents.push({ lap: c.currentLap, type: 'pit', message: `${c.driverId} returns from pit on ${newCompound} tyres` });
      }
      // Cars in pit don't move forward along track
      return c;
    }

    // Calculate this tick's lap time contribution
    const lapTime = calcLapTime(c, circuit, state.conditions, raceScore, prepBonus, strategyBonus, carDev);
    const speedMs = trackLengthM / lapTime;
    const deltaMeters = speedMs * dt;

    c.totalDistanceM += deltaMeters;

    // Fuel burn (~1.5kg/lap)
    c.fuelKg = Math.max(0, c.fuelKg - (1.5 / trackLengthM) * deltaMeters);

    // Tyre deg (per km driven)
    const kmDriven = deltaMeters / 1000;
    const driver = DRIVERS_2025.find((d) => d.id === c.driverId);
    const tyreMgmt = driver ? driver.tyreManagement : 75;
    const tyreMgmtMult = c.driverId === USER_DRIVER_ID ? devTyreDegFactor(carDev) : 1.0;
    const degRate = (1 + (100 - tyreMgmt) * 0.003) * tyreMgmtMult;
    c.tyreHealth = Math.max(0, c.tyreHealth - kmDriven * degRate * 0.8);

    // Lap progress & current lap
    const totalLaps = Math.max(0, c.totalDistanceM / trackLengthM);
    const prevLap = c.currentLap;
    c.currentLap = Math.floor(totalLaps) + 1;
    c.lapProgress = totalLaps % 1;

    // Completed a lap?
    if (c.currentLap > prevLap && prevLap > 0) {
      c.tyreAgeLaps += 1;
      if (c.lastLapTime > 0) {
        const lap = lapTime; // approximate
        if (c.bestLapTime === 0 || lap < c.bestLapTime) {
          c.bestLapTime = lap;
          if (!newFastestTime || lap < newFastestTime) {
            newFastestTime = lap;
            newFastestHolder = c.driverId;
            newEvents.push({ lap: c.currentLap - 1, type: 'fastest_lap', message: `${c.driverId} sets fastest lap: ${lap.toFixed(3)}s` });
          }
        }
      }
      c.lastLapTime = lapTime;

      // Check if should pit this lap
      if (c.pitLap && c.currentLap >= c.pitLap && !c.inPitLane && c.pitStops.length === 0) {
        c.inPitLane = true;
        c.pitTimer = randBetween(2.1, 3.8); // pit stop duration in race seconds
        c.pitLap = null; // second stop will be scheduled separately
        // Schedule second stop if it's a two-stopper
        if (Math.random() < 0.3 && circuit.laps - c.currentLap > 18) {
          c.pitLap = c.currentLap + Math.floor(randBetween(15, 20));
        }
      }

      // DNF check once per lap
      if (checkDNF(c, c.currentLap, carDev)) {
        c.status = 'retired';
        c.dnfLap = c.currentLap;
        newEvents.push({ lap: c.currentLap, type: 'dnf', message: `${c.driverId} retires from the race!` });
      }
    }

    // Track position for visualisation
    c.trackPosition = positionAlongTrack(c.lapProgress, circuit.points);

    // Finish check
    if (c.currentLap > circuit.laps && c.status === 'racing') {
      c.status = 'finished';
      newEvents.push({ lap: circuit.laps, type: 'finish', message: `${c.driverId} crosses the finish line` });
    }

    return c;
  });

  // Weather event (low probability each lap)
  const lapTick = state.elapsedRaceSeconds / (circuit.poleTime * 1.15);
  const newConditions = { ...state.conditions };
  if (Math.floor(lapTick) > state.currentSimLap - 1) {
    if (newConditions.weather === 'dry' && Math.random() < circuit.weatherRainChance * 0.04) {
      newConditions.weather = 'light_rain';
      newConditions.lapOfWeatherChange = Math.ceil(lapTick);
      newEvents.push({ lap: Math.ceil(lapTick), type: 'weather', message: 'Light rain begins! Drivers consider pitting for intermediates.' });
    } else if (newConditions.weather === 'light_rain' && Math.random() < 0.15) {
      newConditions.weather = 'heavy_rain';
      newEvents.push({ lap: Math.ceil(lapTick), type: 'weather', message: 'Heavy rain! Safety car deployed.' });
      newConditions.safetyCarActive = true;
    } else if (newConditions.weather === 'heavy_rain' && Math.random() < 0.10) {
      newConditions.weather = 'light_rain';
      newEvents.push({ lap: Math.ceil(lapTick), type: 'weather', message: 'Rain easing off. Track drying.' });
    }
  }

  // Safety car: triggered by heavy rain or random incident
  if (!newConditions.safetyCarActive && Math.random() < 0.003) {
    newConditions.safetyCarActive = true;
    newConditions.safetyCarLap = state.currentSimLap;
    newEvents.push({ lap: state.currentSimLap, type: 'safety_car', message: 'Safety car deployed! All cars hold position.' });
  }
  if (newConditions.safetyCarActive && Math.random() < 0.15) {
    newConditions.safetyCarActive = false;
    newEvents.push({ lap: state.currentSimLap, type: 'safety_car', message: 'Safety car in! Racing resumes.' });
  }

  // Resolve overtakes between close cars
  updatedCars = resolveOvertakes(updatedCars, circuit);

  // Re-sort by distance (race position)
  const ranked = [...updatedCars]
    .filter((c) => c.status !== 'retired')
    .sort((a, b) => b.totalDistanceM - a.totalDistanceM);

  const retiredCars = updatedCars.filter((c) => c.status === 'retired');

  ranked.forEach((c, i) => { c.position = i + 1; });
  retiredCars.forEach((c, i) => { c.position = ranked.length + i + 1; });

  // Update gaps
  if (ranked.length > 0) {
    const leaderDist = ranked[0].totalDistanceM;
    const trackLengthS = circuit.poleTime * 1.15; // approx lap time in seconds
    ranked.forEach((c, i) => {
      const distBehind = leaderDist - c.totalDistanceM;
      c.gapToLeader = (distBehind / (circuit.lengthKm * 1000)) * trackLengthS;
      c.gapToCarAhead = i === 0 ? 0 : (ranked[i - 1].totalDistanceM - c.totalDistanceM) / (circuit.lengthKm * 1000) * trackLengthS;
    });
  }

  const leader = ranked[0]?.driverId ?? state.leader;
  const finishedCount = updatedCars.filter((c) => c.status === 'finished').length;
  const allDone = finishedCount + retiredCars.length >= updatedCars.length;

  // Assign points once first car finishes
  if (finishedCount >= 1) {
    const sorted = [...updatedCars].sort((a, b) => b.totalDistanceM - a.totalDistanceM);
    sorted.forEach((c, i) => {
      if (c.status === 'finished' && c.points === 0) {
        const pos = i + 1;
        const fl = newFastestHolder === c.driverId;
        c.points = getPointsForPosition(pos, fl, true);
        c.fastestLap = fl;
      }
    });
  }

  return {
    ...state,
    cars: [...ranked, ...retiredCars],
    conditions: newConditions,
    status: allDone ? 'finished' : 'running',
    elapsedRaceSeconds: state.elapsedRaceSeconds + dt,
    currentSimLap: Math.ceil(state.elapsedRaceSeconds / (circuit.poleTime * 1.15)),
    raceTick: state.raceTick + 1,
    leader,
    fastestLapHolder: newFastestHolder,
    fastestLapTime: newFastestTime,
    events: [...state.events, ...newEvents],
  };
}

// ---- Finalise race results ----

export function finaliseRace(
  finalState: RaceState,
  circuit: Circuit,
  carDev: CarDevelopment,
): FinishedRaceResult[] {
  const sorted = [...finalState.cars].sort((a, b) => {
    if (a.status === 'retired' && b.status !== 'retired') return 1;
    if (b.status === 'retired' && a.status !== 'retired') return -1;
    return b.totalDistanceM - a.totalDistanceM;
  });

  const winnerTime = (sorted[0]?.totalDistanceM ?? 0) / ((circuit.lengthKm * 1000) / (circuit.poleTime * 1.15));

  return sorted.map((car, i) => {
    const pos = i + 1;
    const fl = finalState.fastestLapHolder === car.driverId;
    const points = getPointsForPosition(pos, fl, car.status !== 'retired');
    const prize = pos <= 10 && car.driverId === USER_DRIVER_ID ? (PRIZE_MONEY_BY_POSITION[pos] ?? 0) : 0;

    let gap = '---';
    if (car.status === 'retired') {
      gap = `DNF (Lap ${car.dnfLap ?? '?'})`;
    } else if (i === 0) {
      gap = '';
    } else {
      const timeBehind = (sorted[0].totalDistanceM - car.totalDistanceM) / ((circuit.lengthKm * 1000) / (circuit.poleTime * 1.15));
      gap = timeBehind > 60 ? `+1 LAP` : `+${timeBehind.toFixed(3)}s`;
    }

    return {
      driverId: car.driverId,
      position: pos,
      lapsCompleted: Math.min(car.currentLap - 1, circuit.laps),
      totalTime: winnerTime,
      gap,
      points,
      fastestLap: fl,
      pitStops: car.pitStops,
      bestLapTime: car.bestLapTime,
      dnfLap: car.dnfLap,
      prizeMoneyM: prize,
    };
  });
}

export function buildRaceConditions(circuit: Circuit): RaceConditions {
  const rain = Math.random() < circuit.weatherRainChance;
  const weather: Weather = rain ? (Math.random() < 0.4 ? 'heavy_rain' : 'light_rain') : 'dry';
  return {
    weather,
    trackTemp: Math.round(randBetween(28, 52)),
    airTemp: Math.round(randBetween(18, 36)),
    lapOfWeatherChange: null,
    safetyCarActive: false,
    safetyCarLap: null,
    virtualSafetyCar: false,
  };
}
