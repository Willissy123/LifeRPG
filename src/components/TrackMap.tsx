/**
 * Canvas 2D track map — gaming-grade visuals:
 * · 60fps rAF loop, all live data via refs (no stale closures)
 * · F1 top-down car silhouette with directional rotation
 * · Neon-blue LED edge glow (night-race aesthetic)
 * · Gold pulse rings + motion trail on player
 * · Team-colour glow on top-3
 * · Pinch-to-zoom, scroll-wheel, 1-finger pan
 */
import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { RaceCarState, Circuit, RaceConditions } from '../types';
import { DRIVERS_2025, USER_DRIVER_ID } from '../data/drivers2025';
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

const PAD = 10;
const TRAIL_LEN = 12;

function sp(pt: { x: number; y: number }, w: number, h: number) {
  return { x: PAD + (pt.x / 100) * (w - PAD * 2), y: PAD + (pt.y / 100) * (h - PAD * 2) };
}
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** F1 top-down silhouette — wide sidepods, pointed nose, rear wings */
function drawCarShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  size: number,
  color: string,
  glowColor?: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 18; }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);                       // nose tip
  ctx.lineTo(size * 0.3, -size * 0.48);      // left front shoulder
  ctx.lineTo(-size * 0.4, -size * 0.62);     // left sidepod
  ctx.lineTo(-size * 0.82, -size * 0.28);    // left rear wing
  ctx.lineTo(-size * 0.55, 0);               // rear centre notch
  ctx.lineTo(-size * 0.82, size * 0.28);     // right rear wing
  ctx.lineTo(-size * 0.4, size * 0.62);      // right sidepod
  ctx.lineTo(size * 0.3, size * 0.48);       // right front shoulder
  ctx.closePath();
  ctx.fill();
  // Cockpit highlight
  if (!glowColor) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(size * 0.1, 0, size * 0.22, size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export const TrackMap: React.FC<TrackMapProps> = ({ circuit, cars, conditions, width = 400, height = 300 }) => {
  const layout   = useMemo(() => getTrackLayout(circuit.id), [circuit.id]);
  const waypoints = layout?.waypoints ?? circuit.points;
  const scale    = useMemo(() => ({ w: width, h: height, pad: PAD }), [width, height]);
  const smoothPath = useMemo(() => catmullRomPath(waypoints, scale), [waypoints, scale]);

  const sfPt = useMemo(() => sp(waypoints[0], width, height), [waypoints, width, height]);
  const s1Pt = useMemo(() => sp(positionAlongTrack(circuit.sectorBoundaries[0], waypoints), width, height), [waypoints, circuit, width, height]);
  const s2Pt = useMemo(() => sp(positionAlongTrack(circuit.sectorBoundaries[1], waypoints), width, height), [waypoints, circuit, width, height]);

  // ── Live data refs (no stale-closure issues in rAF) ──
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const carsRef      = useRef(cars);
  const condsRef     = useRef(conditions);
  const pathRef      = useRef(smoothPath);
  const sfRef        = useRef(sfPt);
  const s1Ref        = useRef(s1Pt);
  const s2Ref        = useRef(s2Pt);
  const trails       = useRef<Map<string, Array<{ x: number; y: number }>>>(new Map());
  const carAngles    = useRef<Map<string, number>>(new Map());
  const prevCarsSnap = useRef<RaceCarState[]>([]);

  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { condsRef.current = conditions; }, [conditions]);
  useEffect(() => { pathRef.current = smoothPath; }, [smoothPath]);
  useEffect(() => { sfRef.current = sfPt; s1Ref.current = s1Pt; s2Ref.current = s2Pt; }, [sfPt, s1Pt, s2Pt]);

  // Update heading direction every simulation tick (100 ms)
  useEffect(() => {
    for (const car of cars) {
      if (car.status === 'retired') continue;
      const prev = prevCarsSnap.current.find(c => c.driverId === car.driverId);
      if (prev) {
        const cur = sp(car.trackPosition, width, height);
        const p   = sp(prev.trackPosition, width, height);
        const dx  = cur.x - p.x, dy = cur.y - p.y;
        if (Math.hypot(dx, dy) > 0.15) carAngles.current.set(car.driverId, Math.atan2(dy, dx));
      }
    }
    prevCarsSnap.current = cars;
  }, [cars, width, height]);

  // ── Zoom / pan ──
  const zoomRef  = useRef(1);
  const panRef   = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<number | null>(null);
  const dragRef  = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [zoomUI, setZoomUI] = useState(1);
  const pushZoom = useCallback(() => setZoomUI(zoomRef.current), []);

  const clampPan = useCallback((z: number, px: number, py: number) => ({
    x: Math.min(Math.max(px, -(width / 2) * (z - 1)), (width / 2) * (z - 1)),
    y: Math.min(Math.max(py, -(height / 2) * (z - 1)), (height / 2) * (z - 1)),
  }), [width, height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const d2 = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { pinchRef.current = d2(e); dragRef.current = null; }
      else if (e.touches.length === 1 && zoomRef.current > 1)
        dragRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: panRef.current.x, py: panRef.current.y };
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const d = d2(e);
        zoomRef.current = Math.min(Math.max(zoomRef.current * (d / pinchRef.current), 1), 5);
        panRef.current = clampPan(zoomRef.current, panRef.current.x, panRef.current.y);
        pinchRef.current = d; pushZoom();
      } else if (e.touches.length === 1 && dragRef.current && zoomRef.current > 1) {
        e.preventDefault();
        panRef.current = clampPan(zoomRef.current,
          dragRef.current.px + (e.touches[0].clientX - dragRef.current.sx),
          dragRef.current.py + (e.touches[0].clientY - dragRef.current.sy),
        );
      }
    };
    const onEnd = () => { pinchRef.current = null; dragRef.current = null; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(Math.max(zoomRef.current - e.deltaY * 0.003, 1), 5);
      panRef.current = clampPan(zoomRef.current, panRef.current.x, panRef.current.y);
      pushZoom();
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd);
    el.addEventListener('wheel',      onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
      el.removeEventListener('wheel',      onWheel);
    };
  }, [clampPan, pushZoom]);

  // ── Main 60fps draw loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let cachedPath: Path2D | null = null;
    let lastPath = '';

    const stroke = (color: string, lw: number, blur = 0) => {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
      ctx.stroke(cachedPath!); ctx.restore();
    };

    const draw = () => {
      const zoom = zoomRef.current;
      const pan  = panRef.current;
      const w = width, h = height, cW = w / 2, cH = h / 2;
      const cur  = carsRef.current;
      const cond = condsRef.current;
      const path = pathRef.current;

      if (path !== lastPath) { cachedPath = new Path2D(path); lastPath = path; }
      if (!cachedPath) { rafId = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);

      // Background — deep space blue
      const bg = ctx.createRadialGradient(cW, cH * 0.85, 0, cW, cH, Math.max(w, h) * 0.8);
      bg.addColorStop(0, '#0c0c1c'); bg.addColorStop(1, '#04040e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Zoom / pan transform
      ctx.save();
      ctx.translate(cW + pan.x, cH + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cW, -cH);

      // ── Track ──
      stroke('rgba(70,90,230,0.22)', 26, 22);  // neon LED edge glow
      stroke('rgba(0,0,0,0.85)', 22);           // deep shadow
      stroke('#141428', 18);                     // base asphalt
      stroke('#1e1e38', 14);                     // mid layer
      stroke('#252548', 10);                     // surface
      stroke('rgba(255,255,255,0.025)', 5, 2);  // sheen

      // Racing line dashes
      ctx.save();
      ctx.strokeStyle = 'rgba(100,100,200,0.15)'; ctx.lineWidth = 0.8; ctx.setLineDash([8, 12]);
      ctx.stroke(cachedPath!); ctx.restore();

      // Wet overlay
      if (cond.weather !== 'dry') {
        stroke(cond.weather === 'heavy_rain' ? 'rgba(50,100,255,0.5)' : 'rgba(120,170,255,0.22)', 10);
      }

      // S/F line
      const sf = sfRef.current;
      ctx.save();
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3;
      ctx.shadowColor = '#FFF'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(sf.x - 9, sf.y); ctx.lineTo(sf.x + 9, sf.y); ctx.stroke();
      ctx.restore();

      // Sector markers
      const drawSector = (pt: { x: number; y: number }, color: string, label: string) => {
        ctx.save();
        ctx.shadowColor = color; ctx.shadowBlur = 12;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, pt.x + 6, pt.y); ctx.restore();
      };
      drawSector(s1Ref.current, '#00FF88', 'S1');
      drawSector(s2Ref.current, '#FF8800', 'S2');

      // SC / VSC banners
      if (cond.safetyCarActive) {
        ctx.save();
        rrect(ctx, w / 2 - 40, 4, 80, 18, 4);
        ctx.fillStyle = '#FFD700'; ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 8.5px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🚨 SAFETY CAR', w / 2, 15.5); ctx.restore();
      } else if (cond.virtualSafetyCar) {
        ctx.save();
        rrect(ctx, w / 2 - 30, 4, 60, 15, 4);
        ctx.fillStyle = 'rgba(255,215,0,0.75)'; ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('VIRTUAL SC', w / 2, 13.5); ctx.restore();
      }

      // ── Update motion trails ──
      for (const car of cur) {
        const pt = sp(car.trackPosition, w, h);
        const trail = trails.current.get(car.driverId) ?? [];
        trail.push(pt); if (trail.length > TRAIL_LEN) trail.shift();
        trails.current.set(car.driverId, trail);
      }

      // ── Draw cars — AI first (back), user last (always on top) ──
      const active = [...cur].filter(c => c.status !== 'retired').sort((a, b) => b.position - a.position);
      const userCar = cur.find(c => c.driverId === USER_DRIVER_ID);

      for (const car of active) {
        if (car.driverId === USER_DRIVER_ID) continue;
        const driver = DRIVERS_2025.find(d => d.id === car.driverId);
        const team   = TEAMS_2025.find(t => t.id === driver?.teamId);
        const color  = team?.color ?? '#AAAAAA';
        const [r, g, b] = hexRgb(color);
        const pt    = sp(car.trackPosition, w, h);
        const alpha = car.inPitLane || car.status === 'pitting' ? 0.3 : 1;
        const top3  = car.position <= 3;
        const size  = top3 ? 6.5 : 5;
        const angle = carAngles.current.get(car.driverId) ?? 0;

        // Motion trail
        const trail = trails.current.get(car.driverId) ?? [];
        for (let i = 0; i < trail.length - 1; i++) {
          const a = ((i + 1) / trail.length) * (top3 ? 0.3 : 0.16) * alpha;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, size * 0.42, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalAlpha = alpha;
        drawCarShape(ctx, pt.x, pt.y, angle, size, color, top3 ? color : undefined);
        ctx.globalAlpha = 1;

        // Short name label
        ctx.save();
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = '#D0D0EC'; ctx.font = '600 6px system-ui';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(driver?.shortName ?? '???', pt.x + size + 3, pt.y);
        ctx.restore();
      }

      // ── User car ──
      if (userCar) {
        const driver = DRIVERS_2025.find(d => d.id === USER_DRIVER_ID);
        const pt     = sp(userCar.trackPosition, w, h);
        const inPit  = userCar.inPitLane || userCar.status === 'pitting';
        const ua     = inPit ? 0.5 : 1;
        const angle  = carAngles.current.get(USER_DRIVER_ID) ?? 0;
        const trail  = trails.current.get(USER_DRIVER_ID) ?? [];

        // Gold motion trail
        for (let i = 0; i < trail.length - 1; i++) {
          const a = ((i + 1) / trail.length) * 0.55 * ua;
          ctx.fillStyle = `rgba(224,192,64,${a})`;
          ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 5.5, 0, Math.PI * 2); ctx.fill();
        }

        // Pulse rings
        ctx.save();
        ctx.globalAlpha = 0.2 * ua; ctx.strokeStyle = '#E0C040'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.45 * ua; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = ua;
        drawCarShape(ctx, pt.x, pt.y, angle, 10, '#E0C040', '#E0C040');
        ctx.globalAlpha = 1;

        // Short name label (inside car silhouette)
        ctx.save();
        ctx.fillStyle = '#000'; ctx.font = 'bold 6.5px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(driver?.shortName ?? 'PLY', pt.x, pt.y);
        ctx.restore();

        // Position badge
        ctx.save();
        rrect(ctx, pt.x + 13, pt.y - 16, 28, 14, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fill();
        ctx.shadowColor = '#E0C040'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#E0C040'; ctx.font = 'bold 9.5px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`P${userCar.position}`, pt.x + 27, pt.y - 9);
        ctx.restore();

        if (inPit) {
          ctx.save();
          ctx.fillStyle = '#E0C040'; ctx.font = 'bold 7px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('PIT IN', pt.x, pt.y + 13); ctx.restore();
        }
      }

      ctx.restore(); // pop zoom transform

      // ── Fixed UI (not zoomed) ──
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = 'bold 8px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(circuit.name.toUpperCase(), w - 8, h - 6);
      ctx.restore();

      if (zoom > 1.05) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '500 9px system-ui';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${zoom.toFixed(1)}×`, 8, 8); ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(rafId); cachedPath = null; };
  }, [width, height, circuit.name]);

  const resetView = () => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; setZoomUI(1); };
  const zoomIn    = () => { zoomRef.current = Math.min(zoomRef.current + 0.75, 5); pushZoom(); };
  const zoomOut   = () => {
    zoomRef.current = Math.max(zoomRef.current - 0.75, 1);
    panRef.current = clampPan(zoomRef.current, panRef.current.x, panRef.current.y);
    pushZoom();
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width, height, flexShrink: 0, borderRadius: '12px 12px 0 0', overflow: 'hidden', userSelect: 'none', cursor: zoomUI > 1 ? 'grab' : 'default' }}
    >
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />

      {zoomUI > 1.05 && (
        <button onClick={resetView} style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, color: '#888', fontSize: 10, padding: '4px 8px', cursor: 'pointer',
        }}>↺ Reset</button>
      )}

      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4 }}>
        {(['+', '−'] as const).map(sym => (
          <button key={sym} onClick={sym === '+' ? zoomIn : zoomOut} style={{
            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, color: sym === '−' && zoomUI <= 1.05 ? '#2a2a2a' : '#777',
            fontSize: 17, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{sym}</button>
        ))}
      </div>
    </div>
  );
};
