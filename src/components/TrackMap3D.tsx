import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Circuit, TrackPoint } from '../types';
import type { RaceCarState, RaceConditions } from '../types';
import { getTrackLayout } from '../data/trackLayouts';
import { getDriver } from '../data/drivers2025';
import { getTeam } from '../data/teams2025';
import { USER_DRIVER_ID } from '../data/drivers2025';

// ── Geometry helpers ──────────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0);

function buildRibbon(pts: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const n = pts.length;
  const pos: number[] = [], idx: number[] = [], uvs: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev  = pts[(i - 1 + n) % n];
    const next  = pts[(i + 1) % n];
    const dir   = new THREE.Vector3().subVectors(next, prev).normalize();
    const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
    const hw = width / 2;
    const L = pts[i].clone().addScaledVector(right, -hw);
    const R = pts[i].clone().addScaledVector(right,  hw);
    pos.push(L.x, L.y, L.z, R.x, R.y, R.z);
    uvs.push(0, i / n, 1, i / n);
    const a = i * 2, b = a + 1, c = ((i + 1) % n) * 2, d = c + 1;
    idx.push(a, c, b, c, d, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function sideStrip(center: THREE.Vector3[], offset: number, width: number) {
  const n = center.length;
  return buildRibbon(
    center.map((p, i) => {
      const prev  = center[(i - 1 + n) % n];
      const next  = center[(i + 1) % n];
      const dir   = new THREE.Vector3().subVectors(next, prev).normalize();
      const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
      return p.clone().addScaledVector(right, offset);
    }),
    width,
  );
}

function hexColor(str: string): number {
  return parseInt(str.replace('#', ''), 16);
}

// ── Public component ──────────────────────────────────────────────────────────

export interface TrackMap3DProps {
  circuit: Circuit;
  cars: RaceCarState[];
  conditions: RaceConditions;
  width: number;
  height: number;
}

export function TrackMap3D({ circuit, cars, conditions, width, height }: TrackMap3DProps) {
  const mountRef       = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const carsRef        = useRef(cars);
  const conditionsRef  = useRef(conditions);
  const tvModeRef      = useRef(false);
  const [tvMode, setTvMode] = useState(false);

  useEffect(() => { carsRef.current = cars; },           [cars]);
  useEffect(() => { conditionsRef.current = conditions; }, [conditions]);
  useEffect(() => { tvModeRef.current = tvMode; },       [tvMode]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [width, height]);

  // ── Scene (re-builds when circuit changes) ────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Renderer (raw WebGL, no r3f layer) ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch (e) {
      return; // WebGL unavailable — SafeTrackMap will show 2D fallback
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080f);
    const fog = new THREE.Fog(0x08080f, 160, 420);
    scene.fog = fog;

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.5, 600);
    cameraRef.current = camera;

    // --- Track Layout ---
    const layout = getTrackLayout(circuit.id);
    const wps: TrackPoint[] = layout?.waypoints ?? circuit.points;
    const pts3 = wps.map(p => new THREE.Vector3(p.x, 0, p.y));
    const curve = new THREE.CatmullRomCurve3(pts3, true, 'catmullrom', 0.5);
    const cPts  = curve.getPoints(200).slice(0, 200);

    const xs = wps.map(p => p.x), ys = wps.map(p => p.y);
    const cx    = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy    = (Math.min(...ys) + Math.max(...ys)) / 2;
    const range = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));

    // Top-down map initial position
    camera.position.set(cx, range, cy + range * 0.22);
    camera.lookAt(cx, 0, cy);
    camera.updateProjectionMatrix();

    // --- Lights ---
    const ambLight = new THREE.AmbientLight(0xc8d0ff, 0.55);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(cx + 20, 120, cy + 30);
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x1a2244, 0x000000, 0.7));

    // --- Static Geometry ---
    const addMesh = (geo: THREE.BufferGeometry, color: number, y: number, roughness = 0.95) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness }));
      m.position.y = y;
      scene.add(m);
    };

    // Grass
    const grassMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x1e7a1e, roughness: 1 }),
    );
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(cx, -0.05, cy);
    scene.add(grassMesh);

    addMesh(sideStrip(cPts, -4.7, 1.0), 0x4a4a44, 0.0);
    addMesh(sideStrip(cPts,  4.7, 1.0), 0x4a4a44, 0.0);
    addMesh(sideStrip(cPts, -3.7, 1.0), 0xcc1a1a, 0.01);
    addMesh(sideStrip(cPts,  3.7, 1.0), 0xdddddd, 0.01);
    addMesh(buildRibbon(cPts, 6.4),      0x141420, 0.02);

    // Start/finish line
    const sfDir   = new THREE.Vector3().subVectors(cPts[1], cPts[0]).normalize();
    const sfRight = new THREE.Vector3().crossVectors(sfDir, UP).normalize();
    const sfLine  = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    sfLine.position.set(cPts[0].x, 0.04, cPts[0].z);
    sfLine.rotation.y = Math.atan2(sfRight.x, sfRight.z);
    scene.add(sfLine);

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan    = false;
    controls.minDistance  = 20;
    controls.maxDistance  = 260;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 3;
    controls.rotateSpeed  = 0.4;
    controls.zoomSpeed    = 0.9;

    // --- Car Groups (created lazily in animation loop) ---
    const carGroups = new Map<string, { group: THREE.Group; ring?: THREE.Mesh }>();

    function getOrCreate(car: RaceCarState) {
      if (carGroups.has(car.driverId)) return carGroups.get(car.driverId)!;

      const driver = getDriver(car.driverId);
      const team   = driver ? getTeam(driver.teamId) : null;
      const isUser = car.driverId === USER_DRIVER_ID;
      const col    = hexColor(isUser ? '#E0C040' : (team?.color ?? '#888888'));
      const s      = isUser ? 1.15 : car.position <= 3 ? 0.88 : 0.70;
      const emi    = isUser ? 1.1  : car.position <= 3 ? 0.65 : 0.35;

      const group = new THREE.Group();

      const bodyMat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: emi, roughness: 0.2, metalness: 0.75,
      });
      group.add(new THREE.Mesh(new THREE.BoxGeometry(s * 0.60, s * 0.18, s * 1.50), bodyMat));

      const cockpit = new THREE.Mesh(
        new THREE.BoxGeometry(s * 0.24, s * 0.10, s * 0.44),
        new THREE.MeshStandardMaterial({ color: isUser ? 0xffffee : 0x111111, roughness: 0.4 }),
      );
      cockpit.position.set(0, s * 0.13, s * 0.05);
      group.add(cockpit);

      const noseMat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: emi * 0.6, roughness: 0.2, metalness: 0.75,
      });
      const nose = new THREE.Mesh(new THREE.BoxGeometry(s * 0.32, s * 0.10, s * 0.28), noseMat);
      nose.position.set(0, 0, s * 0.78);
      group.add(nose);

      let ring: THREE.Mesh | undefined;
      if (isUser) {
        ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.14, 8, 48),
          new THREE.MeshBasicMaterial({ color: 0xE0C040, transparent: true, opacity: 0.7, depthWrite: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);
      }

      scene.add(group);
      const entry = { group, ring };
      carGroups.set(car.driverId, entry);
      return entry;
    }

    // --- Animation Loop ---
    let rafId = 0;
    let pulseT = 0;
    let prevMs = performance.now();
    const camPos  = new THREE.Vector3().copy(camera.position);
    const camLook = new THREE.Vector3(cx, 0, cy);
    let tvReady = false;

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt  = Math.min((now - prevMs) / 1000, 0.05);
      prevMs = now;
      pulseT += dt;

      const isTv = tvModeRef.current;
      const sc   = conditionsRef.current.safetyCarActive;

      // Safety car lighting
      ambLight.color.set(sc ? 0xffe070 : 0xc8d0ff);
      ambLight.intensity = sc ? 1.0 : 0.55;

      if (isTv) {
        controls.enabled = false;
        fog.near = 18;  fog.far = 90;
        camera.fov = 72;
        camera.updateProjectionMatrix();

        const uc = carsRef.current.find(c => c.driverId === USER_DRIVER_ID);
        if (uc?.trackPosition) {
          const lp      = Math.max(0.001, Math.min(0.9999, uc.lapProgress));
          const tan     = curve.getTangentAt(lp);
          const carPos  = new THREE.Vector3(uc.trackPosition.x, 0.5, uc.trackPosition.y);
          const wantPos  = carPos.clone().addScaledVector(tan, -7).add(new THREE.Vector3(0, 2.2, 0));
          const wantLook = carPos.clone().addScaledVector(tan,  9).add(new THREE.Vector3(0, 0.3, 0));

          if (!tvReady) { camPos.copy(wantPos); camLook.copy(wantLook); tvReady = true; }
          camPos.lerp(wantPos,   0.09);
          camLook.lerp(wantLook, 0.09);
          camera.position.copy(camPos);
          camera.lookAt(camLook);
        }
      } else {
        controls.enabled = true;
        tvReady = false;
        fog.near = 160; fog.far = 420;
        camera.fov = 44;
        camera.updateProjectionMatrix();
        controls.update();
      }

      // Update/create car meshes
      const currentCars = carsRef.current;
      currentCars
        .filter(c => c.status !== 'retired' && c.status !== 'dnq' && c.trackPosition)
        .forEach(car => {
          const { group, ring } = getOrCreate(car);
          group.position.set(car.trackPosition!.x, 0.5, car.trackPosition!.y);
          const lp  = Math.max(0.001, Math.min(0.9999, car.lapProgress));
          const tan = curve.getTangentAt(lp);
          group.rotation.y = Math.atan2(tan.x, tan.z);

          if (ring) {
            const phase = Math.abs(Math.sin(pulseT * 2.6));
            ring.scale.setScalar(1 + 0.4 * phase);
            (ring.material as THREE.MeshBasicMaterial).opacity = 0.75 - 0.55 * phase;
          }
        });

      // Remove retired cars
      const toRemove: string[] = [];
      carGroups.forEach(({ group }, id) => {
        const car = currentCars.find(c => c.driverId === id);
        if (!car || car.status === 'retired' || car.status === 'dnq' || !car.trackPosition) {
          scene.remove(group);
          toRemove.push(id);
        }
      });
      toRemove.forEach(id => carGroups.delete(id));

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      controls.dispose();
      carGroups.forEach(({ group }) => scene.remove(group));
      carGroups.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      rendererRef.current = null;
      cameraRef.current   = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit.id]);

  const toggleMode = () => setTvMode(prev => !prev);

  return (
    <div style={{ width, height, position: 'relative', background: '#08080f', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <button
        onClick={toggleMode}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: tvMode ? '#E0C040' : 'rgba(8,8,20,0.85)',
          color: tvMode ? '#000' : '#E0C040',
          border: `1px solid ${tvMode ? '#E0C040' : 'rgba(224,192,64,0.4)'}`,
          borderRadius: 8, padding: '5px 12px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          letterSpacing: 0.8,
        }}
      >
        {tvMode ? '📺 TV' : '🗺 MAP'}
      </button>

      {tvMode && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,8,20,0.7)', borderRadius: 6, padding: '3px 10px',
          color: '#888', fontSize: 10, letterSpacing: 1, pointerEvents: 'none',
        }}>
          📺 CINEMATIC CAM
        </div>
      )}
    </div>
  );
}
