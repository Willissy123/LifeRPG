import type { Vec2, FormationType } from './battleTypes';

/** Generate exactly N formation offsets (relative to regiment center) */
export function getFormationOffsets(formation: FormationType, n: number): Vec2[] {
  if (n <= 0) return [];

  switch (formation) {
    case 'line':    return gridOffsets(n, 9);
    case 'testudo': return gridOffsets(n, 6);
    case 'loose':   return gridOffsets(n, 14);
    case 'wedge':   return wedgeOffsets(n);
    case 'square':  return squareOffsets(n);
    case 'skirmish':return skirmishOffsets(n);
    default:        return gridOffsets(n, 9);
  }
}

/** Rectangular grid layout — used by line / testudo / loose */
function gridOffsets(n: number, spacing: number): Vec2[] {
  const cols = Math.ceil(Math.sqrt(n * 1.4));
  const rows = Math.ceil(n / cols);
  const positions: Vec2[] = [];

  for (let r = 0; r < rows && positions.length < n; r++) {
    for (let c = 0; c < cols && positions.length < n; c++) {
      const x = (c - (cols - 1) / 2) * spacing;
      const y = (r - (rows - 1) / 2) * spacing;
      positions.push({ x, y });
    }
  }

  // Should already be exactly n, but guard anyway
  return positions.slice(0, n);
}

/**
 * Wedge pointing in +x direction.
 * Row k (0-indexed) has (2k+1) troopers.
 * We lay out rows along the -x axis so the tip is at front (+x).
 */
function wedgeOffsets(n: number): Vec2[] {
  const positions: Vec2[] = [];
  const spacing = 9;
  let row = 0;

  while (positions.length < n) {
    const count = 2 * row + 1;
    const rowX = -row * spacing;
    for (let i = 0; i < count && positions.length < n; i++) {
      const rowY = (i - (count - 1) / 2) * spacing;
      positions.push({ x: rowX, y: rowY });
    }
    row++;
  }

  return positions.slice(0, n);
}

/**
 * Square formation: soldiers fill the perimeter first, then inside.
 * We keep adding concentric square rings until we have enough slots.
 */
function squareOffsets(n: number): Vec2[] {
  const spacing = 9;
  const positions: Vec2[] = [];

  // Generate ring by ring
  let ring = 0;
  while (positions.length < n) {
    if (ring === 0) {
      positions.push({ x: 0, y: 0 });
    } else {
      // Top row (left to right)
      for (let c = -ring; c <= ring && positions.length < n; c++) {
        positions.push({ x: c * spacing, y: -ring * spacing });
      }
      // Right col (top+1 to bottom)
      for (let r = -ring + 1; r <= ring && positions.length < n; r++) {
        positions.push({ x: ring * spacing, y: r * spacing });
      }
      // Bottom row (right-1 to left)
      for (let c = ring - 1; c >= -ring && positions.length < n; c--) {
        positions.push({ x: c * spacing, y: ring * spacing });
      }
      // Left col (bottom-1 to top+1)
      for (let r = ring - 1; r >= -ring + 1 && positions.length < n; r--) {
        positions.push({ x: -ring * spacing, y: r * spacing });
      }
    }
    ring++;
    // Safety exit if we somehow overshoot
    if (ring > 100) break;
  }

  return positions.slice(0, n);
}

/**
 * Skirmish: 2 rows deep with alternating horizontal offsets.
 * Row 0: cols at even index, Row 1: cols at odd index (offset by half).
 * Horizontal spacing 16px, vertical 12px.
 */
function skirmishOffsets(n: number): Vec2[] {
  const hSpacing = 16;
  const vSpacing = 12;
  const perRow = Math.ceil(n / 2);
  const positions: Vec2[] = [];

  for (let row = 0; row < 2 && positions.length < n; row++) {
    const offset = row === 1 ? hSpacing / 2 : 0;
    for (let c = 0; c < perRow && positions.length < n; c++) {
      const x = (c - (perRow - 1) / 2) * hSpacing + offset;
      const y = (row - 0.5) * vSpacing;
      positions.push({ x, y });
    }
  }

  return positions.slice(0, n);
}
