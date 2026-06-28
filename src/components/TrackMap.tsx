/**
 * Canvas 2D track map — enables glow effects, motion trails, and
 * real-time animation at 60 fps independent of the race simulation tick rate.
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
const TRAIL_LEN = 10;

function sp(pt: { x: number; y: number }, w: number, h: number) {
  return {
    x: PAD + (pt.x / 100) * (w - PAD * 2),
    y: PAD + (pt.y / 100) * (h - PAD * 2),
  };
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const TrackMap: React.FC<TrackMapProps> = ({ circuit, cars, conditions, width = 400, height = 300 }) => {
  const layout = useMemo(() => getTrackLayout(circuit.id), [circuit.id]);
  const waypoints = layout?.waypoints ?? circuit.points;
  const scale = useMemo(() => ({ w: width, h: height, pad: PAD }), [width, height]);
  const smoothPath = useMemo(() => catmullRomPath(waypoints, scale), [waypoints, scale]);

  const sfPt  = useMemo(() => sp(waypoints[0], width, height), [waypoints, width, height]);
  const s1Pt  = useMemo(() => sp(positionAlongTrack(circuit.sectorBoundaries[0], waypoints), width, height), [waypoints, circuit, width, height]);
  const s2Pt  = useMemo(() => sp(positionAlongTrack(circuit.sectorBoundaries[1], waypoints), width, height), [waypoints, circuit, width, height]);

  // ── Mutable refs so the rAF loop always sees fresh data without restarts ──
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const carsRef      = useRef(cars);
  const condsRef     = useRef(conditions);
  const pathRef      = useRef(smoothPath);
  const sfRef        = useRef(sfPt);
  const s1Ref        = useRef(s1Pt);
  const s2Ref        = useRef(s2Pt);
  const trails       = useRef<Map<string, Array<{ x: number; y: number }>>>(new Map());

  useEffect(() => { carsRef.current = cars; }, [cars]);
  useEffect(() => { condsRef.current = conditions; }, [conditions]);
  useEffect(() => { pathRef.current = smoothPath; }, [smoothPath]);
  useEffect(() => { sfRef.current = sfPt; s1Ref.current = s1Pt; s2Ref.current = s2Pt; }, [sfPt, s1Pt, s2Pt]);

  // ── Zoom / pan ──
  const zoomRef     = useRef(1);
  const panRef      = useRef({ x: 0, y: 0 });
  const pinchRef    = useRef<number | null>(null);
  const dragRef     = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const [zoomUI, setZoomUI] = useState(1);

  const pushZoom = useCallback(() => setZoomUI(zoomRef.current), []);

  const clampPan = useCallback((z: number, px: number, py: number) => {
    const mx = (width / 2) * (z - 1);
    const my = (height / 2) * (z - 1);
    return { x: Math.min(Math.max(px, -mx), mx), y: Math.min(Math.max(py, -my), my) };
  }, [width, height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getTouchDist = (e: TouchEvent) =>
      Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = getTouchDist(e);
        dragRef.current = null;
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        dragRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: panRef.current.x, py: panRef.current.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current !== null) {
        e.preventDefault();
        const dist = getTouchDist(e);
        zoomRef.current = Math.min(Math.max(zoomRef.current * (dist / pinchRef.current), 1), 5);
        panRef.current = clampPan(zoomRef.current, panRef.current.x, panRef.current.y);
        pinchRef.current = dist;
        pushZoom();
      } else if (e.touches.length === 1 && dragRef.current && zoomRef.current > 1) {
        e.preventDefault();
        const raw = { x: dragRef.current.px + (e.touches[0].clientX - dragRef.current.sx), y: dragRef.current.py + (e.touches[0].clientY - dragRef.current.sy) };
        panRef.current = clampPan(zoomRef.current, raw.x, raw.y);
      }
    };

    const onTouchEnd = () => { pinchRef.current = null; dragRef.current = null; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(Math.max(zoomRef.current - e.deltaY * 0.003, 1), 5);
      panRef.current = clampPan(zoomRef.current, panRef.current.x, panRef.current.y);
      pushZoom();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);
    el.addEventListener('wheel',      onWheel,      { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
      el.removeEventListener('wheel',      onWheel);
    };
  }, [clampPan, pushZoom]);

  // ── 60 fps Canvas animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let trackPath: Path2D | null = null;

    const draw = () => {
      const zoom = zoomRef.current;
      const pan  = panRef.current;
      const w    = width;
      const h    = height;
      const cW   = w / 2;
      const cH   = h / 2;
      const cur  = carsRef.current;
      const cond = condsRef.current;
      const path = pathRef.current;

      // Rebuild Path2D only when path string changes
      if (!trackPath) trackPath = new Path2D(path);

      ctx.clearRect(0, 0, w, h);

      // Background
      const bg = ctx.createRadialGradient(cW, cH * 0.9, 0, cW, cH, Math.max(w, h) * 0.75);
      bg.addColorStop(0, '#0d0d1c');
      bg.addColorStop(1, '#060610');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Apply zoom + pan
      ctx.save();
      ctx.translate(cW + pan.x, cH + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cW, -cH);

      // ── Track layers ──
      const drawStroke = (color: string, lineWidth: number, blur = 0, blurColor = '') => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (blur) { ctx.shadowBlur = blur; ctx.shadowColor = blurColor || color; }
        ctx.stroke(trackPath!);
        ctx.restore();
      };

      drawStroke('rgba(0,0,0,0.7)', 22);                        // shadow
      drawStroke('#181828', 18);                                 // base
      drawStroke('#22223a', 14);                                 // asphalt
      drawStroke('#2a2a48', 10);                                 // surface
      drawStroke('rgba(255,255,255,0.03)', 6, 3, '#8888ff');    // sheen

      // Racing line
      ctx.save();
      ctx.strokeStyle = 'rgba(100,100,200,0.12)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 12]);
      ctx.stroke(trackPath!);
      ctx.restore();

      // Wet overlay
      if (cond.weather !== 'dry') {
        const wetColor = cond.weather === 'heavy_rain' ? 'rgba(50,90,255,0.45)' : 'rgba(100,160,255,0.2)';
        drawStroke(wetColor, 10);
      }

      // S/F line
      const sf = sfRef.current;
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#FFF';
      ctx.beginPath(); ctx.moveTo(sf.x - 9, sf.y); ctx.lineTo(sf.x + 9, sf.y);
      ctx.stroke();
      ctx.restore();

      // Sector dots
      const drawSectorDot = (pt: { x: number; y: number }, color: string, label: string) => {
        ctx.save();
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 7px system-ui, sans-serif';
        ctx.fillText(label, pt.x + 6, pt.y + 3);
        ctx.restore();
      };
      drawSectorDot(s1Ref.current, '#00FF88', 'S1');
      drawSectorDot(s2Ref.current, '#FF8800', 'S2');

      // Safety Car / VSC banner (inside zoom space — moves with track)
      if (cond.safetyCarActive) {
        ctx.save();
        rrect(ctx, w / 2 - 38, 4, 76, 17, 4);
        ctx.fillStyle = '#FFD700'; ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🚨 SAFETY CAR', w / 2, 15.5);
        ctx.restore();
      } else if (cond.virtualSafetyCar) {
        ctx.save();
        rrect(ctx, w / 2 - 32, 4, 64, 15, 4);
        ctx.fillStyle = 'rgba(255,215,0,0.75)'; ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('VIRTUAL SC', w / 2, 14.5);
        ctx.restore();
      }

      // ── Update motion trails ──
      for (const car of cur) {
        const pt = sp(car.trackPosition, w, h);
        const trail = trails.current.get(car.driverId) ?? [];
        trail.push(pt);
        if (trail.length > TRAIL_LEN) trail.shift();
        trails.current.set(car.driverId, trail);
      }

      // ── Cars — AI first, user car last (always on top) ──
      const active = [...cur].filter(c => c.status !== 'retired').sort((a, b) => b.position - a.position);
      const userCar = cur.find(c => c.driverId === USER_DRIVER_ID);

      for (const car of active) {
        if (car.driverId === USER_DRIVER_ID) continue;

        const driver = DRIVERS_2025.find(d => d.id === car.driverId);
        const team   = TEAMS_2025.find(t => t.id === driver?.teamId);
        const color  = team?.color ?? '#AAAAAA';
        const [r, g, b] = hexRgb(color);
        const pt     = sp(car.trackPosition, w, h);
        const alpha  = car.inPitLane || car.status === 'pitting' ? 0.3 : 1;
        const top3   = car.position <= 3;
        const radius = top3 ? 6 : 4.5;

        // Motion trail
        const trail = trails.current.get(car.driverId) ?? [];
        for (let i = 0; i < trail.length - 1; i++) {
          const a = ((i + 1) / trail.length) * (top3 ? 0.3 : 0.18) * alpha;
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, radius * 0.55, 0, Math.PI * 2); ctx.fill();
        }

        // Glow on top-3
        ctx.save();
        ctx.globalAlpha = alpha;
        if (top3) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Position number
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#000';
        ctx.font = `bold ${top3 ? 5.5 : 4.5}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(car.position), pt.x, pt.y);
        ctx.restore();

        // Short name label (readable when zoomed)
        ctx.save();
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = '#D0D0E8';
        ctx.font = '600 6px system-ui';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(driver?.shortName ?? '???', pt.x + radius + 2.5, pt.y);
        ctx.restore();
      }

      // ── User car ──
      if (userCar) {
        const driver = DRIVERS_2025.find(d => d.id === USER_DRIVER_ID);
        const pt    = sp(userCar.trackPosition, w, h);
        const inPit = userCar.inPitLane || userCar.status === 'pitting';
        const uAlpha = inPit ? 0.5 : 1;
        const trail  = trails.current.get(USER_DRIVER_ID) ?? [];

        // Gold motion trail
        for (let i = 0; i < trail.length - 1; i++) {
          const a = ((i + 1) / trail.length) * 0.55 * uAlpha;
          ctx.fillStyle = `rgba(224,192,64,${a})`;
          ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 5.5, 0, Math.PI * 2); ctx.fill();
        }

        // Outer pulse rings
        ctx.save();
        ctx.globalAlpha = 0.25 * uAlpha;
        ctx.strokeStyle = '#E0C040'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.45 * uAlpha;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Glow + main dot
        ctx.save();
        ctx.globalAlpha = uAlpha;
        ctx.shadowColor = '#E0C040'; ctx.shadowBlur = 24;
        ctx.fillStyle = '#E0C040';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Short name inside dot
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(driver?.shortName ?? 'PLY', pt.x, pt.y);
        ctx.restore();

        // Position badge
        ctx.save();
        ctx.shadowBlur = 0;
        rrect(ctx, pt.x + 11, pt.y - 15, 26, 13, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
        ctx.fillStyle = '#E0C040'; ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`P${userCar.position}`, pt.x + 24, pt.y - 8.5);
        ctx.restore();

        // PIT label
        if (inPit) {
          ctx.save();
          ctx.fillStyle = '#E0C040'; ctx.font = 'bold 7px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('PIT', pt.x, pt.y + 12);
          ctx.restore();
        }
      }

      ctx.restore(); // pop zoom transform

      // ── Fixed UI (not affected by zoom) ──
      // Circuit name watermark
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.font = 'bold 8px system-ui, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.letterSpacing = '1px';
      ctx.fillText(circuit.name.toUpperCase(), w - 8, h - 6);
      ctx.restore();

      // Zoom level hint
      if (zoom > 1.05) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '500 9px system-ui';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`${zoom.toFixed(1)}×`, 8, 8);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      trackPath = null;
    };
  }, [width, height, circuit.name]); // minimal deps — all data goes through refs

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
      style={{ position: 'relative', width, height, flexShrink: 0, borderRadius: 12, overflow: 'hidden', userSelect: 'none', cursor: zoomUI > 1 ? 'grab' : 'default' }}
    >
      <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />

      {/* Reset zoom */}
      {zoomUI > 1.05 && (
        <button onClick={resetView} style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, color: '#888', fontSize: 10, padding: '4px 8px',
          cursor: 'pointer', letterSpacing: 0.5,
        }}>↺ Reset</button>
      )}

      {/* Zoom buttons */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
        {(['+', '−'] as const).map((sym) => (
          <button key={sym} onClick={sym === '+' ? zoomIn : zoomOut} style={{
            background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, color: sym === '−' && zoomUI <= 1.05 ? '#333' : '#888',
            fontSize: 17, width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{sym}</button>
        ))}
      </div>
    </div>
  );
};
