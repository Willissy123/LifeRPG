/**
 * Track layout waypoints for each F1 circuit.
 * Coordinates are in a normalised 0-100 space (x = west→east, y = north→south).
 * Waypoints go in race order starting from the S/F line.
 * The CatmullRom spline interpolates between them at runtime.
 */
import { TrackPoint } from '../types';

export interface TrackLayout {
  circuitId: string;
  waypoints: TrackPoint[];
  clockwise: boolean;
  startIndex: number;
}

// ── Catmull-Rom → smooth cubic bezier path (used by 2-D fallback map) ───────

export function catmullRomPath(points: TrackPoint[], scale: { w: number; h: number; pad: number }): string {
  const { w, h, pad } = scale;
  function sx(x: number) { return pad + (x / 100) * (w - pad * 2); }
  function sy(y: number) { return pad + (y / 100) * (h - pad * 2); }

  const pts = [...points, points[0], points[1]];
  const n = points.length;
  let d = `M ${sx(points[0].x).toFixed(1)} ${sy(points[0].y).toFixed(1)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[i === 0 ? n - 1 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[0];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${sx(cp1x).toFixed(1)} ${sy(cp1y).toFixed(1)},${sx(cp2x).toFixed(1)} ${sy(cp2y).toFixed(1)},${sx(p2.x).toFixed(1)} ${sy(p2.y).toFixed(1)}`;
  }

  return d + ' Z';
}

// ── Circuit layouts ───────────────────────────────────────────────────────────

const layouts: TrackLayout[] = [

  // ── Australia – Albert Park, Melbourne ───────────────────────────────────
  // Clockwise oval-ish street circuit around Albert Park Lake.
  // S/F on the east straight, heading north.
  {
    circuitId: 'australia',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:70,y:50},{x:70,y:40},{x:69,y:28},   // main straight north
      {x:63,y:18},{x:54,y:12},                // T1 right
      {x:42,y:11},{x:31,y:16},{x:22,y:26},   // T2-3 left-right esses
      {x:15,y:38},{x:13,y:52},               // west side south
      {x:17,y:65},{x:26,y:75},               // T7-8 south corner
      {x:38,y:80},{x:52,y:83},{x:64,y:79},  // T9-12 south arc
      {x:74,y:70},{x:79,y:60},               // T13 east return
      {x:77,y:52},{x:81,y:47},{x:75,y:44},  // T14-16 chicane
      {x:70,y:50},                            // back to S/F
    ],
  },

  // ── China – Shanghai International Circuit ───────────────────────────────
  // Clockwise. Famous T1-3 "snail" 270° hairpin at west end.
  // S/F on east side; pit straight goes west into the spiral.
  {
    circuitId: 'china',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:78,y:56},{x:66,y:54},{x:52,y:52},   // pit straight heading west
      // Snail outer arc — T1 curves right (north):
      {x:38,y:46},{x:26,y:36},{x:18,y:22},
      // Top of outer arc (heading east):
      {x:24,y:10},{x:40,y:6},{x:56,y:8},{x:68,y:16},
      // Inner arc returning south (inside the spiral):
      {x:74,y:28},{x:70,y:42},{x:60,y:51},
      // T3 snail exit → back section link:
      {x:56,y:60},{x:62,y:68},{x:72,y:66},
      // Back section right side:
      {x:80,y:56},{x:84,y:44},{x:84,y:30},
      // T7 hairpin:
      {x:80,y:18},{x:70,y:12},{x:60,y:16},
      // T8-14 complex returning to S/F:
      {x:54,y:26},{x:58,y:36},{x:66,y:44},{x:72,y:50},{x:78,y:56},
    ],
  },

  // ── Japan – Suzuka ───────────────────────────────────────────────────────
  // Clockwise. Unique figure-8 layout with bridge crossover.
  // S/F on the south main straight; S-curves at the top loop.
  {
    circuitId: 'japan',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:60,y:77},{x:60,y:65},{x:60,y:52},   // main straight heading north
      // T1 right → entering S-curves upper loop:
      {x:64,y:42},{x:70,y:32},{x:72,y:20},
      {x:68,y:10},{x:56,y:5},{x:44,y:7},     // S-curves top
      {x:33,y:13},{x:24,y:23},{x:20,y:36},   // Dunlop left side
      {x:18,y:50},{x:21,y:64},               // T11 hairpin approach
      {x:28,y:75},{x:38,y:83},{x:50,y:86},  // Spoon T13-14 sweeper
      {x:62,y:84},{x:72,y:78},{x:78,y:68},  // 130R fast left
      // Chicane T16-17 → figure-8 crossover back to S/F:
      {x:80,y:57},{x:76,y:48},{x:70,y:44},
      {x:64,y:50},{x:62,y:60},{x:60,y:69},{x:60,y:77},
    ],
  },

  // ── Bahrain – Bahrain International Circuit ──────────────────────────────
  // Clockwise. Desert circuit with distinctive hairpin complex.
  {
    circuitId: 'bahrain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:50,y:12},{x:62,y:10},{x:73,y:13},   // S/F + main straight
      {x:81,y:20},{x:85,y:30},{x:83,y:40},   // T1-3 right complex
      // T4 inner hairpin (right-left-right):
      {x:75,y:46},{x:68,y:50},{x:72,y:57},{x:78,y:63},
      {x:78,y:73},{x:70,y:80},{x:58,y:83},   // T6-8 long sweeper
      {x:44,y:83},{x:32,y:79},{x:22,y:70},   // T9-11
      {x:14,y:58},{x:13,y:45},{x:17,y:32},   // T12-15 west section
      {x:26,y:21},{x:37,y:14},{x:50,y:12},   // back to S/F
    ],
  },

  // ── Saudi Arabia – Jeddah Corniche ───────────────────────────────────────
  // Clockwise. Very fast, narrow street circuit. Multiple DRS zones.
  {
    circuitId: 'saudi_arabia',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // Pit straight on east side heading north:
      {x:74,y:82},{x:74,y:70},{x:75,y:56},{x:76,y:42},
      {x:74,y:30},{x:68,y:20},{x:60,y:12},  // north fast section
      {x:50,y:8},{x:38,y:8},{x:26,y:13},    // northwest
      {x:16,y:22},{x:12,y:35},{x:12,y:50},  // west side
      {x:14,y:64},{x:18,y:76},{x:26,y:84},  // southwest
      {x:38,y:90},{x:52,y:90},{x:64,y:86},  // south section
      {x:72,y:82},{x:74,y:82},              // back to S/F
    ],
  },

  // ── Miami – Miami International Autodrome ────────────────────────────────
  // Clockwise. Hard Rock Stadium perimeter.
  {
    circuitId: 'miami',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:48,y:10},{x:62,y:9},{x:74,y:13},   // S/F + main straight
      {x:82,y:21},{x:85,y:32},{x:82,y:42},  // T1-3
      {x:76,y:48},{x:80,y:57},{x:82,y:66},  // T4-6
      {x:79,y:75},{x:70,y:82},{x:58,y:86},  // T8-11
      {x:46,y:85},{x:33,y:82},{x:22,y:72},  // T12-14
      {x:15,y:60},{x:13,y:47},{x:17,y:34},  // west side
      {x:25,y:23},{x:35,y:14},{x:48,y:10},  // back to S/F
    ],
  },

  // ── Emilia Romagna – Imola ───────────────────────────────────────────────
  // Anti-clockwise. Waypoints listed in race order (CCW from above).
  {
    circuitId: 'emilia_romagna',
    clockwise: false,
    startIndex: 0,
    waypoints: [
      // S/F east straight heading north (CCW):
      {x:60,y:70},{x:60,y:58},{x:62,y:44},
      // Tamburello fast left (heading west):
      {x:66,y:32},{x:72,y:22},{x:78,y:14},
      // Villeneuve left:
      {x:84,y:8},{x:87,y:18},{x:83,y:30},
      // Tosa right hairpin (south):
      {x:75,y:40},{x:64,y:47},{x:56,y:52},
      // Piratella going south-west:
      {x:46,y:55},{x:35,y:55},{x:25,y:52},
      // Acque Minerali chicane + valley:
      {x:16,y:58},{x:12,y:70},{x:14,y:82},
      // Variante Alta chicane heading east:
      {x:22,y:88},{x:34,y:90},{x:46,y:88},
      // Rivazza hairpins heading north back to S/F:
      {x:55,y:84},{x:60,y:76},{x:60,y:70},
    ],
  },

  // ── Monaco – Circuit de Monaco ───────────────────────────────────────────
  // Clockwise. Narrow Monte Carlo street circuit with tight Loews hairpin.
  {
    circuitId: 'monaco',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F harbour straight heading east:
      {x:48,y:75},{x:60,y:73},{x:70,y:67},
      // T1 Sainte-Dévote right (uphill north):
      {x:75,y:58},{x:73,y:47},{x:68,y:38},
      // Casino area (right-left):
      {x:62,y:30},{x:54,y:24},{x:46,y:23},
      // Mirabeau right:
      {x:38,y:28},{x:32,y:36},
      // Loews/Fairmont — very tight U-turn right:
      {x:26,y:44},{x:24,y:54},{x:28,y:62},
      // Portier right → tunnel entrance:
      {x:35,y:67},{x:38,y:74},
      // Tunnel exit → harbour east:
      {x:42,y:82},{x:48,y:87},{x:57,y:88},
      // Tabac (right) → Piscine chicane:
      {x:65,y:86},{x:73,y:82},{x:77,y:76},
      // Rascasse → Anthony Noghes → S/F:
      {x:73,y:70},{x:62,y:73},{x:48,y:75},
    ],
  },

  // ── Spain – Circuit de Barcelona-Catalunya ───────────────────────────────
  // Clockwise. Long main straight, T1 right, T10 hairpin.
  {
    circuitId: 'spain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F west end of main straight heading east:
      {x:26,y:46},{x:42,y:42},{x:58,y:38},{x:70,y:36},
      // T1 Elf slow right:
      {x:79,y:30},{x:83,y:21},{x:80,y:12},
      // T2-5 esses (right-left-right):
      {x:72,y:8},{x:63,y:12},{x:55,y:18},{x:48,y:26},
      // T6 Würth right:
      {x:44,y:34},
      // T7 Campsa left:
      {x:40,y:44},{x:38,y:54},
      // T8-9 right esses:
      {x:44,y:62},{x:52,y:70},
      // T10 hairpin La Caixa (right):
      {x:54,y:80},{x:46,y:86},{x:36,y:86},
      // T11-12 right-left:
      {x:26,y:82},{x:18,y:74},{x:14,y:64},
      // T13 banked right (Europa) → T14 New Holland:
      {x:14,y:54},{x:18,y:46},{x:26,y:46},
    ],
  },

  // ── Canada – Circuit Gilles Villeneuve ───────────────────────────────────
  // Clockwise. Île Notre-Dame island circuit with famous Wall of Champions.
  {
    circuitId: 'canada',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:52,y:10},{x:66,y:10},{x:78,y:14},   // S/F + main straight
      {x:85,y:22},{x:87,y:34},{x:83,y:44},   // T1-2 right complex
      {x:75,y:50},{x:79,y:58},{x:83,y:68},   // T3-5 chicane (Pont de la Concorde)
      // Wall of Champions (T13 right hairpin):
      {x:81,y:78},{x:71,y:87},{x:57,y:89},
      {x:43,y:88},{x:29,y:84},{x:18,y:75},   // T14-16
      {x:12,y:63},{x:12,y:49},{x:16,y:37},   // west side
      {x:24,y:26},{x:36,y:17},{x:52,y:10},   // back to S/F
    ],
  },

  // ── Austria – Red Bull Ring ───────────────────────────────────────────────
  // Clockwise. Short uphill circuit, 10 corners, very compact.
  {
    circuitId: 'austria',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F lower-right, heading east then clockwise uphill:
      {x:38,y:76},{x:52,y:73},{x:64,y:70},
      // T1 right (into uphill section):
      {x:73,y:62},{x:77,y:52},{x:75,y:42},
      // T2-3 (rolling right corners going north):
      {x:70,y:32},{x:62,y:22},{x:52,y:16},
      // T4 hairpin top (right, heading back south-east):
      {x:42,y:14},{x:34,y:20},{x:29,y:31},
      // T5-6 descent right:
      {x:27,y:44},{x:27,y:56},{x:29,y:66},
      // T7-10 slow chicane at bottom:
      {x:32,y:73},{x:36,y:77},{x:38,y:76},
    ],
  },

  // ── Britain – Silverstone ─────────────────────────────────────────────────
  // Clockwise. Famous high-speed angular circuit.
  // Copse-Maggotts-Becketts-Chapel complex is the defining feature.
  {
    circuitId: 'britain',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F south straight heading east:
      {x:42,y:78},{x:56,y:76},{x:68,y:74},
      // Copse fast right:
      {x:78,y:68},{x:84,y:58},{x:82,y:46},
      // Maggotts left → Becketts right → Chapel:
      {x:76,y:36},{x:68,y:28},{x:60,y:24},{x:52,y:29},
      // Hangar straight heading east:
      {x:60,y:36},{x:70,y:38},{x:80,y:38},
      // Stowe right hairpin:
      {x:86,y:48},{x:84,y:60},{x:78,y:68},
      // Vale-Club right:
      {x:70,y:76},{x:60,y:83},{x:48,y:85},
      // Luffield right (heading west):
      {x:36,y:84},{x:24,y:79},{x:16,y:70},
      {x:14,y:58},{x:16,y:46},{x:22,y:38},
      // Abbey-Farm-Village complex heading east:
      {x:30,y:52},{x:32,y:64},{x:36,y:72},{x:42,y:78},
    ],
  },

  // ── Belgium – Spa-Francorchamps ───────────────────────────────────────────
  // Clockwise. Long triangular circuit. Eau Rouge at SW corner.
  {
    circuitId: 'belgium',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F south side, heading west (toward La Source):
      {x:74,y:78},{x:60,y:76},{x:46,y:74},
      // La Source hairpin (tight right):
      {x:32,y:70},{x:20,y:64},{x:14,y:54},
      // Eau Rouge (right-left-right compression, uphill):
      {x:14,y:44},{x:18,y:34},{x:24,y:24},
      // Kemmel straight heading east (top of circuit):
      {x:36,y:16},{x:50,y:12},{x:64,y:14},
      // Pouhon area (right sweeper):
      {x:76,y:18},{x:84,y:28},{x:82,y:40},
      // Les Combes-Stavelot right section:
      {x:78,y:52},{x:80,y:62},
      // Bus Stop chicane (right-left) → Blanchimont:
      {x:78,y:70},{x:76,y:76},{x:74,y:78},
    ],
  },

  // ── Hungary – Hungaroring ─────────────────────────────────────────────────
  // Clockwise. Very tight, twisty. Hardest track to overtake on.
  {
    circuitId: 'hungary',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F heading east:
      {x:46,y:15},{x:58,y:13},{x:68,y:17},
      // T1 slow right hairpin:
      {x:76,y:23},{x:79,y:33},{x:75,y:43},
      // T2-3 right-left:
      {x:67,y:49},{x:60,y:55},{x:64,y:63},
      // T4-5 right:
      {x:72,y:70},{x:73,y:80},{x:67,y:88},
      // T6-7 going west:
      {x:54,y:89},{x:41,y:87},{x:29,y:83},
      // T8 right:
      {x:20,y:75},{x:14,y:63},{x:14,y:51},
      // T9-10 tight section:
      {x:16,y:41},{x:22,y:31},{x:30,y:23},
      // T11-12 back to S/F:
      {x:38,y:18},{x:46,y:15},
    ],
  },

  // ── Netherlands – Zandvoort ───────────────────────────────────────────────
  // Clockwise. Compact coastal dune circuit with banked final sector.
  {
    circuitId: 'netherlands',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F north side heading east:
      {x:42,y:12},{x:54,y:10},{x:66,y:14},
      // T1-3 right (Tarzanbocht):
      {x:76,y:20},{x:80,y:30},{x:78,y:42},
      // T4 left (Hugenholtz):
      {x:70,y:50},{x:64,y:58},
      // T5-7 right:
      {x:68,y:67},{x:72,y:76},{x:70,y:84},
      // Arie Luyendyk banked final corner (right):
      {x:58,y:88},{x:44,y:88},{x:30,y:85},
      // Tarzan hairpin (right):
      {x:18,y:77},{x:12,y:65},{x:13,y:52},
      // T10-13 section left-right back:
      {x:16,y:42},{x:20,y:32},{x:28,y:22},
      {x:36,y:14},{x:42,y:12},
    ],
  },

  // ── Italy – Autodromo Nazionale Monza ────────────────────────────────────
  // Clockwise. Temple of speed — oval with three chicanes.
  {
    circuitId: 'italy',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F at top, main straight heading east (right):
      {x:20,y:18},{x:36,y:14},{x:52,y:12},{x:66,y:13},
      // T1-2 Variante del Rettifilio (right-left-right):
      {x:75,y:17},{x:80,y:25},{x:76,y:31},{x:74,y:36},
      // Curva Grande fast right sweeper:
      {x:78,y:44},{x:82,y:54},
      // T7-8 Variante della Roggia (right-left):
      {x:82,y:63},{x:78,y:69},{x:74,y:64},
      // T10-11 Lesmo 1 + 2 (right, right):
      {x:78,y:72},{x:80,y:80},
      // T13-15 Variante Ascari chicane (left-right-left):
      {x:76,y:84},{x:66,y:87},{x:56,y:85},{x:50,y:87},{x:56,y:83},
      // T16 Parabolica big right sweeper back to pit:
      {x:56,y:90},{x:42,y:91},{x:28,y:87},
      {x:16,y:78},{x:11,y:66},{x:10,y:52},
      {x:11,y:38},{x:14,y:26},{x:20,y:18},
    ],
  },

  // ── Azerbaijan – Baku City Circuit ───────────────────────────────────────
  // Clockwise. Long pit straight (east), narrow castle section (west).
  {
    circuitId: 'azerbaijan',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F south; long pit straight heading north:
      {x:62,y:88},{x:62,y:76},{x:62,y:62},{x:62,y:48},
      // T1 right into castle section:
      {x:67,y:38},{x:72,y:28},
      // Castle section — many tight corners:
      {x:75,y:20},{x:72,y:12},{x:63,y:8},
      {x:52,y:7},{x:42,y:10},{x:34,y:17},
      {x:26,y:25},{x:20,y:35},{x:17,y:47},
      // T8-14 west section heading south:
      {x:15,y:60},{x:17,y:72},{x:21,y:82},
      // T15-16 south hairpin heading east:
      {x:30,y:88},{x:44,y:90},{x:56,y:88},{x:62,y:88},
    ],
  },

  // ── Singapore – Marina Bay Street Circuit ────────────────────────────────
  // Clockwise. Night race, many slow corners, very twisty.
  {
    circuitId: 'singapore',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F heading east:
      {x:46,y:54},{x:58,y:50},{x:70,y:46},
      // T1-3 right-left into circuit:
      {x:78,y:40},{x:83,y:30},{x:79,y:20},
      {x:70,y:14},{x:57,y:12},{x:45,y:14},
      // T7-9 west section:
      {x:33,y:18},{x:23,y:27},{x:16,y:38},
      {x:13,y:50},{x:17,y:62},
      // T10-16 south section heading east:
      {x:23,y:71},{x:32,y:79},{x:42,y:83},
      {x:53,y:81},{x:62,y:75},{x:68,y:67},
      // T18-20 returning north to S/F:
      {x:72,y:58},{x:66,y:52},{x:56,y:52},{x:46,y:54},
    ],
  },

  // ── USA – Circuit of The Americas ────────────────────────────────────────
  // Clockwise. Uphill blind T1, esses complex, back straight, stadium.
  {
    circuitId: 'usa',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F south straight heading east:
      {x:42,y:80},{x:54,y:78},{x:66,y:76},
      // T1 uphill right (heading north):
      {x:74,y:68},{x:78,y:58},{x:76,y:48},
      // T3-7 esses (left-right-left-right):
      {x:70,y:40},{x:62,y:34},{x:54,y:38},{x:48,y:44},
      // T8-9 right links to back straight:
      {x:54,y:50},{x:64,y:54},
      // Long back straight heading east:
      {x:72,y:54},{x:80,y:52},{x:87,y:46},
      // T11-12 hairpin (right):
      {x:89,y:36},{x:85,y:25},{x:76,y:22},
      // T13-18 infield (left-right complex):
      {x:66,y:20},{x:56,y:24},{x:48,y:30},
      {x:40,y:36},{x:32,y:42},{x:24,y:52},
      // T19-20 right back to S/F:
      {x:20,y:62},{x:24,y:72},{x:34,y:78},{x:42,y:80},
    ],
  },

  // ── Mexico – Autodromo Hermanos Rodríguez ────────────────────────────────
  // Clockwise. Long back straight, stadium section.
  {
    circuitId: 'mexico',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F south, heading east:
      {x:44,y:80},{x:58,y:78},{x:70,y:76},
      // T1-3 right complex:
      {x:78,y:70},{x:82,y:60},{x:80,y:50},
      // T4 right → long back straight heading west:
      {x:74,y:42},{x:66,y:38},
      {x:54,y:32},{x:42,y:28},{x:30,y:24},
      // T6-7 slow hairpin (right):
      {x:20,y:20},{x:14,y:30},{x:14,y:44},
      // West side medium corners heading south:
      {x:16,y:58},{x:20,y:68},
      // Stadium section T12-17 (right):
      {x:28,y:76},{x:36,y:82},{x:44,y:80},
    ],
  },

  // ── Brazil – Autodromo José Carlos Pace (Interlagos) ────────────────────
  // Anti-clockwise. Two-loop layout in São Paulo.
  {
    circuitId: 'brazil',
    clockwise: false,
    startIndex: 0,
    waypoints: [
      // S/F east straight, heading south (CCW):
      {x:62,y:22},{x:62,y:34},{x:64,y:47},
      // Senna S chicane (right-left):
      {x:68,y:57},{x:64,y:65},{x:57,y:70},
      // Reta Oposta long straight heading west:
      {x:46,y:72},{x:34,y:72},{x:22,y:70},
      // Ferradura (right U-turn heading east):
      {x:13,y:62},{x:10,y:50},{x:13,y:38},
      {x:21,y:28},{x:32,y:21},{x:44,y:17},
      // Subida dos Boxes heading north (outer loop):
      {x:56,y:15},{x:66,y:11},
      {x:74,y:8},{x:80,y:14},{x:79,y:25},
      // Cotovelo + Bico de Pato:
      {x:73,y:32},{x:66,y:28},{x:62,y:22},
    ],
  },

  // ── Las Vegas – Las Vegas Strip Circuit ──────────────────────────────────
  // Clockwise. Long Strip straight on the east side; hairpin at south.
  {
    circuitId: 'las_vegas',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F east side (The Strip), heading north:
      {x:74,y:68},{x:74,y:56},{x:74,y:42},{x:74,y:28},
      // T1-3 north end (right complex):
      {x:72,y:16},{x:64,y:10},{x:52,y:8},
      {x:40,y:10},{x:28,y:16},{x:18,y:26},
      // West section heading south:
      {x:12,y:38},{x:11,y:52},{x:13,y:66},
      // Harmon Ave south complex (right hairpin):
      {x:18,y:78},{x:30,y:86},{x:44,y:88},
      {x:58,y:86},{x:68,y:80},{x:74,y:74},{x:74,y:68},
    ],
  },

  // ── Qatar – Lusail International Circuit ─────────────────────────────────
  // Clockwise. Flowing high-speed circuit.
  {
    circuitId: 'qatar',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      {x:54,y:10},{x:66,y:8},{x:76,y:12},{x:83,y:20},
      {x:85,y:31},{x:82,y:41},{x:74,y:47},
      {x:68,y:55},{x:72,y:63},{x:78,y:71},
      {x:78,y:80},{x:70,y:87},{x:58,y:89},
      {x:46,y:88},{x:34,y:83},{x:24,y:74},
      {x:16,y:62},{x:13,y:50},{x:17,y:38},
      {x:25,y:28},{x:35,y:18},{x:46,y:12},{x:54,y:10},
    ],
  },

  // ── Abu Dhabi – Yas Marina Circuit ───────────────────────────────────────
  // Clockwise. Hotel section, marina hairpins. Distinctive inner loop.
  {
    circuitId: 'abu_dhabi',
    clockwise: true,
    startIndex: 0,
    waypoints: [
      // S/F main straight heading east:
      {x:38,y:38},{x:52,y:36},{x:64,y:34},
      // T1 right → north loop:
      {x:74,y:28},{x:80,y:20},{x:82,y:10},
      {x:72,y:6},{x:60,y:7},{x:50,y:12},
      // T5-7 left section:
      {x:40,y:17},{x:30,y:22},{x:22,y:30},
      // T8-9 right → hotel underpass heading south:
      {x:16,y:40},{x:16,y:52},{x:20,y:62},
      {x:28,y:71},{x:38,y:79},{x:50,y:82},
      // T14-18 marina hairpins (right turns):
      {x:62,y:80},{x:72,y:76},{x:78,y:66},
      {x:76,y:56},{x:70,y:48},{x:60,y:43},
      {x:50,y:41},{x:38,y:38},
    ],
  },
];

export const TRACK_LAYOUTS = new Map<string, TrackLayout>(
  layouts.map((l) => [l.circuitId, l]),
);

export function getTrackLayout(circuitId: string): TrackLayout | undefined {
  return TRACK_LAYOUTS.get(circuitId);
}
