export interface CalendarRace {
  raceIndex: number;
  circuitId: string;
  date: string; // YYYY-MM-DD
  round: number;
  hasSprint: boolean;
}

const CALENDAR_2025: CalendarRace[] = [
  { raceIndex: 0,  circuitId: 'australia',      date: '2025-03-16', round: 1,  hasSprint: false },
  { raceIndex: 1,  circuitId: 'china',           date: '2025-03-23', round: 2,  hasSprint: true  },
  { raceIndex: 2,  circuitId: 'japan',           date: '2025-04-06', round: 3,  hasSprint: false },
  { raceIndex: 3,  circuitId: 'bahrain',         date: '2025-04-13', round: 4,  hasSprint: false },
  { raceIndex: 4,  circuitId: 'saudi_arabia',    date: '2025-04-20', round: 5,  hasSprint: false },
  { raceIndex: 5,  circuitId: 'miami',           date: '2025-05-04', round: 6,  hasSprint: true  },
  { raceIndex: 6,  circuitId: 'emilia_romagna',  date: '2025-05-18', round: 7,  hasSprint: false },
  { raceIndex: 7,  circuitId: 'monaco',          date: '2025-05-25', round: 8,  hasSprint: false },
  { raceIndex: 8,  circuitId: 'spain',           date: '2025-06-01', round: 9,  hasSprint: false },
  { raceIndex: 9,  circuitId: 'canada',          date: '2025-06-15', round: 10, hasSprint: false },
  { raceIndex: 10, circuitId: 'austria',         date: '2025-06-29', round: 11, hasSprint: false },
  { raceIndex: 11, circuitId: 'britain',         date: '2025-07-06', round: 12, hasSprint: false },
  { raceIndex: 12, circuitId: 'belgium',         date: '2025-07-27', round: 13, hasSprint: false },
  { raceIndex: 13, circuitId: 'hungary',         date: '2025-08-03', round: 14, hasSprint: false },
  { raceIndex: 14, circuitId: 'netherlands',     date: '2025-08-31', round: 15, hasSprint: false },
  { raceIndex: 15, circuitId: 'italy',           date: '2025-09-07', round: 16, hasSprint: false },
  { raceIndex: 16, circuitId: 'azerbaijan',      date: '2025-09-21', round: 17, hasSprint: false },
  { raceIndex: 17, circuitId: 'singapore',       date: '2025-10-05', round: 18, hasSprint: false },
  { raceIndex: 18, circuitId: 'usa',             date: '2025-10-19', round: 19, hasSprint: true  },
  { raceIndex: 19, circuitId: 'mexico',          date: '2025-10-26', round: 20, hasSprint: false },
  { raceIndex: 20, circuitId: 'brazil',          date: '2025-11-09', round: 21, hasSprint: true  },
  { raceIndex: 21, circuitId: 'las_vegas',       date: '2025-11-22', round: 22, hasSprint: false },
  { raceIndex: 22, circuitId: 'qatar',           date: '2025-11-30', round: 23, hasSprint: true  },
  { raceIndex: 23, circuitId: 'abu_dhabi',       date: '2025-12-07', round: 24, hasSprint: false },
];

export default CALENDAR_2025;

// F1 points system
export const POINTS_TABLE: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8,  7: 6,  8: 4,  9: 2,  10: 1,
};

export const getPointsForPosition = (pos: number, fastestLap: boolean, classified: boolean): number => {
  if (!classified) return 0;
  const base = POINTS_TABLE[pos] ?? 0;
  const flBonus = fastestLap && pos <= 10 ? 1 : 0;
  return base + flBonus;
};
