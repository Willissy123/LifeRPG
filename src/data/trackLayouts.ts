/**
 * Track layout data for each F1 circuit.
 * Waypoints are in a normalized 0-100 coordinate space.
 * Direction is preserved to match the real track direction (CW or CCW).
 * Smoothed SVG paths are generated at runtime via catmullRomPath().
 */
import { TrackPoint } from '../types';

export interface TrackLayout {
  circuitId: string;
  // Pre-defined waypoints tracing the track centerline.
  // More waypoints = smoother positioning of cars.
  waypoints: TrackPoint[];
  // True = clockwise (e.g. Bahrain, Silverstone)
  // False = anticlockwise (e.g. Interlagos, Istanbul)
  clockwise: boolean;
  // Start/finish point index in waypoints[]
  startIndex: number;
}

// ---- Catmull-Rom → smooth cubic bezier path ----

export function catmullRomPath(points: TrackPoint[], scale: { w: number; h: number; pad: number }): string {
  const { w, h, pad } = scale;
  function sx(x: number) { return pad + (x / 100) * (w - pad * 2); }
  function sy(y: number) { return pad + (y / 100) * (h - pad * 2); }

  // Close the loop by appending first 2 points at end
  const pts = [...points, points[0], points[1]];
  const n = points.length;

  let d = `M ${sx(points[0].x).toFixed(1)} ${sy(points[0].y).toFixed(1)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[i === 0 ? n - 1 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[0];

    // Catmull-Rom control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${sx(cp1x).toFixed(1)} ${sy(cp1y).toFixed(1)},${sx(cp2x).toFixed(1)} ${sy(cp2y).toFixed(1)},${sx(p2.x).toFixed(1)} ${sy(p2.y).toFixed(1)}`;
  }

  return d + ' Z';
}

// ---- Circuit-by-circuit layout data ----
// Waypoints are listed starting from the S/F line, going in race direction.
// More corner detail = better car animation accuracy.

const layouts: TrackLayout[] = [
  {
    circuitId: 'australia',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:52,y:10},{x:60,y:9},{x:68,y:9},{x:75,y:11},{x:80,y:16},
      {x:83,y:22},{x:83,y:29},{x:80,y:35},{x:75,y:40},{x:70,y:43},
      {x:64,y:45},{x:60,y:49},{x:62,y:55},{x:66,y:60},{x:70,y:65},
      {x:70,y:71},{x:65,y:76},{x:58,y:79},{x:50,y:80},{x:42,y:79},
      {x:34,y:76},{x:27,y:71},{x:23,y:64},{x:21,y:57},{x:20,y:49},
      {x:21,y:41},{x:23,y:33},{x:27,y:26},{x:32,y:19},{x:38,y:13},
      {x:44,y:10},{x:52,y:10},
    ],
  },
  {
    circuitId: 'china',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:57,y:11},{x:65,y:10},{x:73,y:11},{x:80,y:15},{x:85,y:22},
      {x:87,y:30},{x:85,y:38},{x:80,y:44},{x:73,y:48},{x:65,y:50},
      {x:58,y:51},{x:55,y:56},{x:56,y:63},{x:61,y:69},{x:63,y:76},
      {x:60,y:82},{x:53,y:86},{x:44,y:87},{x:36,y:84},{x:31,y:77},
      {x:34,y:70},{x:38,y:64},{x:42,y:58},{x:38,y:52},{x:30,y:48},
      {x:22,y:44},{x:17,y:37},{x:17,y:28},{x:21,y:20},{x:28,y:14},
      {x:37,y:10},{x:47,y:10},{x:57,y:11},
    ],
  },
  {
    circuitId: 'japan',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Suzuka - famous for its S-curves and overpass section
      {x:50,y:9},{x:58,y:8},{x:67,y:9},{x:74,y:14},{x:79,y:21},
      {x:80,y:28},{x:77,y:35},{x:70,y:40},{x:63,y:42},{x:58,y:46},
      {x:56,y:52},{x:58,y:58},{x:64,y:63},{x:70,y:68},{x:74,y:74},
      {x:72,y:81},{x:64,y:86},{x:54,y:87},{x:45,y:84},{x:39,y:78},
      {x:36,y:71},{x:35,y:63},{x:38,y:56},{x:43,y:50},{x:47,y:45},
      {x:43,y:39},{x:36,y:35},{x:29,y:30},{x:24,y:23},{x:26,y:15},
      {x:33,y:10},{x:42,y:8},{x:50,y:9},
    ],
  },
  {
    circuitId: 'bahrain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:50,y:9},{x:62,y:8},{x:72,y:10},{x:80,y:15},{x:84,y:23},
      {x:83,y:31},{x:77,y:38},{x:68,y:42},{x:60,y:43},{x:63,y:49},
      {x:70,y:55},{x:76,y:61},{x:77,y:69},{x:72,y:76},{x:63,y:81},
      {x:52,y:82},{x:41,y:80},{x:32,y:74},{x:25,y:66},{x:22,y:57},
      {x:21,y:47},{x:24,y:38},{x:27,y:30},{x:31,y:22},{x:37,y:14},
      {x:44,y:10},{x:50,y:9},
    ],
  },
  {
    circuitId: 'saudi_arabia',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Jeddah - very fast street circuit, long straights
      {x:60,y:7},{x:68,y:6},{x:76,y:8},{x:82,y:14},{x:86,y:21},
      {x:87,y:30},{x:86,y:39},{x:82,y:47},{x:77,y:53},{x:74,y:60},
      {x:78,y:67},{x:82,y:74},{x:81,y:82},{x:73,y:87},{x:62,y:89},
      {x:51,y:88},{x:41,y:84},{x:33,y:77},{x:28,y:68},{x:26,y:58},
      {x:26,y:48},{x:22,y:40},{x:19,y:31},{x:21,y:21},{x:27,y:13},
      {x:36,y:8},{x:47,y:6},{x:60,y:7},
    ],
  },
  {
    circuitId: 'miami',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:47,y:9},{x:60,y:8},{x:72,y:9},{x:80,y:15},{x:83,y:24},
      {x:82,y:33},{x:76,y:39},{x:68,y:42},{x:72,y:49},{x:78,y:55},
      {x:79,y:64},{x:74,y:72},{x:64,y:78},{x:53,y:80},{x:42,y:78},
      {x:32,y:71},{x:24,y:62},{x:20,y:51},{x:21,y:40},{x:26,y:30},
      {x:33,y:20},{x:40,y:13},{x:47,y:9},
    ],
  },
  {
    circuitId: 'emilia_romagna',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Imola - anticlockwise in reality but we display top-down
      {x:50,y:11},{x:59,y:10},{x:68,y:12},{x:75,y:18},{x:79,y:27},
      {x:78,y:36},{x:72,y:43},{x:65,y:47},{x:66,y:54},{x:71,y:61},
      {x:74,y:68},{x:70,y:76},{x:61,y:82},{x:50,y:84},{x:39,y:82},
      {x:30,y:76},{x:24,y:68},{x:22,y:59},{x:23,y:50},{x:26,y:41},
      {x:29,y:32},{x:34,y:23},{x:40,y:15},{x:50,y:11},
    ],
  },
  {
    circuitId: 'monaco',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Monaco - very tight, famous hairpin at Loews (bottom left)
      {x:52,y:11},{x:60,y:9},{x:68,y:11},{x:74,y:16},{x:79,y:23},
      {x:81,y:31},{x:78,y:39},{x:72,y:44},{x:68,y:51},{x:72,y:57},
      {x:77,y:63},{x:79,y:71},{x:75,y:79},{x:66,y:84},{x:55,y:86},
      {x:44,y:84},{x:34,y:79},{x:26,y:71},{x:24,y:62},
      // Loews hairpin (very tight - back on itself)
      {x:24,y:55},{x:26,y:49},{x:33,y:46},{x:39,y:49},{x:40,y:55},
      {x:37,y:61},{x:34,y:54},{x:32,y:47},{x:33,y:40},
      {x:35,y:33},{x:37,y:26},{x:40,y:19},{x:44,y:13},{x:52,y:11},
    ],
  },
  {
    circuitId: 'spain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:50,y:9},{x:62,y:8},{x:73,y:11},{x:81,y:17},{x:85,y:26},
      {x:84,y:35},{x:78,y:42},{x:69,y:47},{x:73,y:54},{x:79,y:60},
      {x:81,y:69},{x:76,y:77},{x:65,y:83},{x:52,y:85},{x:39,y:83},
      {x:27,y:76},{x:19,y:66},{x:17,y:55},{x:19,y:43},{x:24,y:32},
      {x:31,y:21},{x:39,y:13},{x:50,y:9},
    ],
  },
  {
    circuitId: 'canada',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Montreal - Ile Notre-Dame island circuit
      {x:51,y:9},{x:64,y:8},{x:75,y:11},{x:83,y:17},{x:86,y:26},
      {x:84,y:35},{x:77,y:41},{x:68,y:44},{x:72,y:51},{x:79,y:57},
      {x:81,y:66},{x:76,y:75},{x:64,y:82},{x:51,y:83},{x:38,y:81},
      {x:27,y:74},{x:20,y:64},{x:18,y:52},{x:19,y:41},{x:24,y:30},
      {x:31,y:19},{x:39,y:12},{x:51,y:9},
    ],
  },
  {
    circuitId: 'austria',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Red Bull Ring - short mountain circuit
      {x:51,y:11},{x:63,y:10},{x:73,y:15},{x:80,y:23},{x:81,y:32},
      {x:76,y:40},{x:66,y:45},{x:72,y:53},{x:79,y:61},{x:76,y:71},
      {x:66,y:78},{x:53,y:82},{x:40,y:80},{x:28,y:74},{x:20,y:64},
      {x:18,y:52},{x:22,y:40},{x:30,y:29},{x:38,y:18},{x:51,y:11},
    ],
  },
  {
    circuitId: 'britain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Silverstone - wing-shaped, very fast
      {x:55,y:9},{x:66,y:8},{x:76,y:11},{x:83,y:18},{x:86,y:28},
      {x:83,y:37},{x:74,y:43},{x:64,y:44},{x:56,y:47},{x:54,y:53},
      {x:58,y:59},{x:67,y:64},{x:75,y:70},{x:76,y:79},{x:67,y:86},
      {x:54,y:89},{x:40,y:87},{x:27,y:81},{x:18,y:70},{x:15,y:57},
      {x:17,y:44},{x:23,y:32},{x:31,y:21},{x:40,y:13},{x:55,y:9},
    ],
  },
  {
    circuitId: 'belgium',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Spa - very long, Eau Rouge section, Bus Stop chicane
      {x:47,y:9},{x:60,y:8},{x:72,y:11},{x:81,y:17},{x:87,y:26},
      {x:86,y:36},{x:80,y:44},{x:72,y:50},
      // Eau Rouge / Raidillon bottom
      {x:67,y:53},{x:70,y:58},{x:76,y:62},
      {x:80,y:69},{x:77,y:77},{x:67,y:83},{x:53,y:86},
      {x:39,y:84},{x:26,y:77},{x:16,y:67},{x:12,y:54},
      {x:13,y:41},{x:18,y:29},{x:26,y:18},{x:35,y:11},{x:47,y:9},
    ],
  },
  {
    circuitId: 'hungary',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Hungaroring - twisty, difficult to overtake
      {x:51,y:9},{x:62,y:8},{x:72,y:12},{x:79,y:19},{x:81,y:28},
      {x:78,y:37},{x:69,y:43},{x:61,y:47},{x:65,y:54},{x:72,y:60},
      {x:73,y:68},{x:67,y:76},{x:55,y:82},{x:43,y:82},{x:32,y:77},
      {x:23,y:68},{x:19,y:57},{x:19,y:45},{x:23,y:33},{x:29,y:22},
      {x:37,y:13},{x:51,y:9},
    ],
  },
  {
    circuitId: 'netherlands',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Zandvoort - tight with banked final corner
      {x:50,y:9},{x:62,y:8},{x:73,y:12},{x:79,y:20},{x:79,y:30},
      {x:73,y:38},{x:64,y:43},{x:61,y:50},{x:67,y:57},{x:74,y:63},
      {x:73,y:72},{x:64,y:80},{x:52,y:85},{x:40,y:83},{x:29,y:76},
      {x:22,y:66},{x:19,y:54},{x:21,y:42},{x:27,y:31},{x:35,y:20},
      {x:50,y:9},
    ],
  },
  {
    circuitId: 'italy',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Monza - temple of speed, chicanes, Lesmo, Parabolica
      {x:50,y:9},{x:64,y:8},{x:76,y:11},{x:83,y:19},{x:84,y:30},
      {x:77,y:38},
      // Variante del Rettifilio chicane
      {x:67,y:40},{x:60,y:39},{x:57,y:43},{x:60,y:47},{x:67,y:48},
      {x:73,y:45},
      // Lesmos
      {x:78,y:52},{x:78,y:60},{x:72,y:65},
      // Ascari
      {x:65,y:68},{x:60,y:72},{x:65,y:76},{x:72,y:78},
      // Parabolica
      {x:78,y:83},{x:73,y:89},{x:58,y:91},{x:43,y:89},
      {x:30,y:83},{x:20,y:73},{x:15,y:60},{x:14,y:47},
      {x:18,y:35},{x:25,y:23},{x:34,y:14},{x:50,y:9},
    ],
  },
  {
    circuitId: 'azerbaijan',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Baku - castle section, long pit straight
      {x:56,y:7},{x:68,y:6},{x:78,y:10},{x:84,y:18},{x:86,y:28},
      {x:84,y:38},{x:77,y:45},
      // Castle section (tight)
      {x:70,y:50},{x:74,y:55},{x:78,y:60},{x:75,y:66},
      {x:68,y:70},{x:63,y:64},{x:68,y:58},
      {x:73,y:64},{x:76,y:72},{x:73,y:80},{x:63,y:86},
      {x:50,y:88},{x:37,y:85},{x:25,y:77},{x:17,y:66},
      {x:15,y:53},{x:19,y:40},{x:26,y:28},{x:35,y:16},{x:45,y:8},{x:56,y:7},
    ],
  },
  {
    circuitId: 'singapore',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Singapore - night circuit, very twisty
      {x:51,y:9},{x:62,y:8},{x:72,y:12},{x:79,y:19},{x:82,y:28},
      {x:79,y:38},{x:71,y:44},{x:64,y:49},{x:70,y:55},{x:77,y:61},
      {x:76,y:70},{x:67,y:77},{x:55,y:82},{x:43,y:81},{x:32,y:75},
      {x:23,y:66},{x:18,y:55},{x:18,y:43},{x:23,y:31},{x:31,y:20},
      {x:40,y:12},{x:51,y:9},
    ],
  },
  {
    circuitId: 'usa',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // COTA - big corkscrew section at start
      {x:53,y:9},{x:64,y:8},{x:75,y:12},{x:82,y:19},{x:84,y:29},
      // Big Turn 1 complex
      {x:80,y:37},{x:70,y:43},{x:62,y:46},{x:66,y:53},{x:73,y:59},
      {x:75,y:68},{x:69,y:77},{x:57,y:83},{x:44,y:83},{x:31,y:78},
      {x:21,y:68},{x:17,y:56},{x:19,y:44},{x:24,y:33},{x:32,y:22},
      {x:42,y:13},{x:53,y:9},
    ],
  },
  {
    circuitId: 'mexico',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Mexico City - stadium section at final sector
      {x:49,y:9},{x:62,y:8},{x:73,y:11},{x:81,y:18},{x:84,y:27},
      {x:82,y:36},{x:73,y:42},{x:63,y:44},{x:68,y:51},{x:76,y:57},
      {x:78,y:67},{x:71,y:76},{x:59,y:82},{x:46,y:83},{x:33,y:79},
      {x:22,y:70},{x:17,y:58},{x:18,y:46},{x:22,y:35},{x:28,y:24},
      {x:36,y:15},{x:49,y:9},
    ],
  },
  {
    circuitId: 'brazil',
    clockwise: false, // anticlockwise
    startIndex: 0,
    waypoints: [
      // Interlagos - anticlockwise, famous for rain
      {x:50,y:10},{x:61,y:9},{x:72,y:12},{x:80,y:18},{x:83,y:28},
      {x:79,y:37},{x:69,y:43},{x:60,y:46},{x:64,y:53},{x:72,y:59},
      {x:74,y:68},{x:65,y:77},{x:52,y:82},{x:39,y:80},{x:27,y:73},
      {x:19,y:63},{x:17,y:51},{x:20,y:39},{x:27,y:28},{x:36,y:17},
      {x:50,y:10},
    ],
  },
  {
    circuitId: 'las_vegas',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Las Vegas Strip - long main straight, slow hairpin
      {x:56,y:7},{x:70,y:6},{x:82,y:9},{x:89,y:18},{x:90,y:29},
      {x:87,y:39},{x:79,y:47},{x:71,y:52},{x:77,y:60},{x:85,y:67},
      {x:83,y:78},{x:70,y:86},{x:55,y:88},{x:40,y:85},{x:26,y:77},
      {x:15,y:65},{x:12,y:51},{x:15,y:37},{x:22,y:24},{x:33,y:13},
      {x:44,y:7},{x:56,y:7},
    ],
  },
  {
    circuitId: 'qatar',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Lusail - flowing night circuit
      {x:53,y:9},{x:65,y:8},{x:76,y:12},{x:83,y:20},{x:84,y:30},
      {x:79,y:39},{x:69,y:45},{x:62,y:48},{x:67,y:55},{x:76,y:61},
      {x:77,y:70},{x:68,y:78},{x:55,y:83},{x:42,y:82},{x:30,y:76},
      {x:21,y:66},{x:16,y:54},{x:17,y:42},{x:22,y:31},{x:30,y:21},
      {x:40,y:13},{x:53,y:9},
    ],
  },
  {
    circuitId: 'abu_dhabi',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Yas Marina - marina section, hotel section
      {x:51,y:9},{x:63,y:8},{x:74,y:12},{x:82,y:19},{x:84,y:29},
      {x:81,y:38},{x:71,y:44},{x:62,y:47},{x:57,y:53},{x:62,y:59},
      {x:71,y:64},{x:76,y:71},{x:72,y:79},{x:60,y:85},{x:47,y:87},
      {x:33,y:84},{x:20,y:76},{x:13,y:64},{x:11,y:51},{x:15,y:38},
      {x:23,y:26},{x:33,y:16},{x:42,y:10},{x:51,y:9},
    ],
  },
];

export const TRACK_LAYOUTS = new Map<string, TrackLayout>(
  layouts.map((l) => [l.circuitId, l]),
);

export function getTrackLayout(circuitId: string): TrackLayout | undefined {
  return TRACK_LAYOUTS.get(circuitId);
}
