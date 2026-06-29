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

// ── F1 car builder ────────────────────────────────────────────────────────────

function buildCar(
  col: number, isUser: boolean, s: number, emi: number,
): { group: THREE.Group; ring?: THREE.Mesh } {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: col, emissive: col, emissiveIntensity: emi, roughness: 0.18, metalness: 0.82,
  });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.55, metalness: 0.45 });
  const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
  const rimMat    = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.9 });
  const glassMat  = new THREE.MeshStandardMaterial({
    color: isUser ? 0x88ffcc : 0x223344, roughness: 0.08, metalness: 0.2,
    transparent: true, opacity: 0.82,
  });

  // Main monocoque
  const body = new THREE.Mesh(new THREE.BoxGeometry(s * 0.64, s * 0.13, s * 1.62), bodyMat);
  body.position.y = s * 0.13;
  group.add(body);

  // Sidepods
  ([-1, 1] as const).forEach(side => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(s * 0.17, s * 0.11, s * 0.78), bodyMat);
    pod.position.set(side * s * 0.38, s * 0.09, -s * 0.1);
    group.add(pod);
  });

  // Engine cover / spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(s * 0.18, s * 0.07, s * 0.7), bodyMat);
  spine.position.set(0, s * 0.22, -s * 0.22);
  group.add(spine);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.BoxGeometry(s * 0.21, s * 0.07, s * 0.46), bodyMat);
  nose.position.set(0, s * 0.09, s * 1.02);
  group.add(nose);

  // Halo (safety arch)
  const haloArch = new THREE.Mesh(new THREE.BoxGeometry(s * 0.06, s * 0.04, s * 0.42), carbonMat);
  haloArch.position.set(0, s * 0.24, s * 0.06);
  group.add(haloArch);

  // Visor / cockpit
  const visor = new THREE.Mesh(new THREE.BoxGeometry(s * 0.16, s * 0.065, s * 0.26), glassMat);
  visor.position.set(0, s * 0.19, s * 0.1);
  group.add(visor);

  // ─ Front wing ─
  const fw = new THREE.Mesh(new THREE.BoxGeometry(s * 1.46, s * 0.032, s * 0.2), carbonMat);
  fw.position.set(0, s * 0.042, s * 1.2);
  group.add(fw);
  const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(s * 1.36, s * 0.024, s * 0.14), bodyMat);
  fwFlap.position.set(0, s * 0.072, s * 1.14);
  group.add(fwFlap);
  ([-1, 1] as const).forEach(side => {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(s * 0.028, s * 0.1, s * 0.22), carbonMat);
    ep.position.set(side * s * 0.72, s * 0.068, s * 1.2);
    group.add(ep);
  });

  // ─ Rear wing ─
  const rw = new THREE.Mesh(new THREE.BoxGeometry(s * 0.88, s * 0.048, s * 0.17), carbonMat);
  rw.position.set(0, s * 0.54, -s * 0.86);
  group.add(rw);
  const rwFlap = new THREE.Mesh(new THREE.BoxGeometry(s * 0.86, s * 0.038, s * 0.14), bodyMat);
  rwFlap.position.set(0, s * 0.60, -s * 0.82);
  group.add(rwFlap);
  ([-1, 1] as const).forEach(side => {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(s * 0.028, s * 0.44, s * 0.19), carbonMat);
    ep.position.set(side * s * 0.44, s * 0.37, -s * 0.86);
    group.add(ep);
  });
  // Beam wing
  const beam = new THREE.Mesh(new THREE.BoxGeometry(s * 0.48, s * 0.028, s * 0.1), carbonMat);
  beam.position.set(0, s * 0.23, -s * 0.84);
  group.add(beam);

  // Diffuser
  const diff = new THREE.Mesh(new THREE.BoxGeometry(s * 0.58, s * 0.075, s * 0.19), carbonMat);
  diff.position.set(0, s * 0.038, -s * 0.91);
  group.add(diff);

  // ─ Wheels ─
  const wh = s * 0.165, ww = s * 0.21;
  const wheelPos: [number, number, number][] = [
    [ s * 0.57, s * 0.12,  s * 0.8],
    [-s * 0.57, s * 0.12,  s * 0.8],
    [ s * 0.60, s * 0.12, -s * 0.64],
    [-s * 0.60, s * 0.12, -s * 0.64],
  ];
  wheelPos.forEach(([wx, wy, wz]) => {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(wh, wh, ww, 14), wheelMat);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(wx, wy, wz);
    group.add(tyre);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wh * 0.58, wh * 0.58, ww + 0.01, 10), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    group.add(rim);
  });

  let ring: THREE.Mesh | undefined;
  if (isUser) {
    ring = new THREE.Mesh(
      new THREE.TorusGeometry(s * 1.55, s * 0.09, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xE0C040, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = s * 0.04;
    group.add(ring);
  }

  return { group, ring };
}

// ── Track environment builders ────────────────────────────────────────────────

function addBarriers(cPts: THREE.Vector3[], scene: THREE.Scene) {
  const n = cPts.length;
  const redMat   = new THREE.MeshStandardMaterial({ color: 0xcc2020, roughness: 0.75 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.75 });
  const postMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });

  // Armco on both sides — panel every 2 curve points
  ([6.1, -6.1] as const).forEach(offset => {
    for (let i = 0; i < n; i += 2) {
      const prev = cPts[(i - 1 + n) % n];
      const next = cPts[(i + 1) % n];
      const dir  = new THREE.Vector3().subVectors(next, prev).normalize();
      const right = new THREE.Vector3().crossVectors(dir, UP).normalize();

      const bPos = cPts[i].clone().addScaledVector(right, offset);
      const segLen = cPts[i].distanceTo(cPts[(i + 2) % n]) + 0.1;
      const yaw = Math.atan2(dir.x, dir.z);

      // Alternating red / white panels (every 4 panels ≈ ~20 m)
      const mat = Math.floor(i / 8) % 2 === 0 ? redMat : whiteMat;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.44, 0.09), mat);
      panel.position.set(bPos.x, 0.22, bPos.z);
      panel.rotation.y = yaw;
      scene.add(panel);

      // Concrete post every ~6 curve pts
      if (i % 6 === 0) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.22), postMat);
        post.position.set(bPos.x, 0.26, bPos.z);
        post.rotation.y = yaw;
        scene.add(post);
      }
    }
  });
}

function addTireWalls(cPts: THREE.Vector3[], scene: THREE.Scene) {
  const n = cPts.length;
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.97 });

  for (let i = 2; i < n - 2; i++) {
    const d1 = new THREE.Vector3().subVectors(cPts[i],     cPts[i - 2]).normalize();
    const d2 = new THREE.Vector3().subVectors(cPts[i + 2], cPts[i]).normalize();
    if (d1.dot(d2) < 0.62) { // corner sharper than ~52°
      const right = new THREE.Vector3().crossVectors(d2, UP).normalize();
      const outerPos = cPts[i].clone().addScaledVector(right, 8.0);
      for (let j = -1; j <= 1; j++) {
        const tp = outerPos.clone().addScaledVector(d1, j * 0.95);
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.36, 10), tireMat);
        tyre.position.set(tp.x, 0.18, tp.z);
        scene.add(tyre);
      }
    }
  }
}

function addGrandstands(cPts: THREE.Vector3[], scene: THREE.Scene) {
  const n = cPts.length;
  const concMat  = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.97 });
  const seatMat  = new THREE.MeshStandardMaterial({ color: 0x1e3fa8, roughness: 0.85 });
  const roofMat  = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });

  const spots = [Math.floor(n * 0.08), Math.floor(n * 0.38), Math.floor(n * 0.68)];
  spots.forEach(idx => {
    const prev  = cPts[(idx - 1 + n) % n];
    const next  = cPts[(idx + 1) % n];
    const dir   = new THREE.Vector3().subVectors(next, prev).normalize();
    const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
    const yaw   = Math.atan2(dir.x, dir.z);
    const base  = cPts[idx].clone().addScaledVector(right, 13);

    const conc = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 5.5), concMat);
    conc.position.set(base.x, 3.5, base.z);
    conc.rotation.y = yaw;
    scene.add(conc);

    const seats = new THREE.Mesh(new THREE.BoxGeometry(19, 5.5, 4.5), seatMat);
    seats.position.set(base.x, 4, base.z);
    seats.rotation.y = yaw;
    scene.add(seats);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(21, 0.5, 6), roofMat);
    roof.position.set(base.x, 7.4, base.z);
    roof.rotation.y = yaw;
    scene.add(roof);
  });
}

function addPitBuilding(cPts: THREE.Vector3[], scene: THREE.Scene) {
  const n = cPts.length;
  const idx = Math.floor(n * 0.02);
  const prev = cPts[(idx - 1 + n) % n];
  const next = cPts[(idx + 1) % n];
  const dir  = new THREE.Vector3().subVectors(next, prev).normalize();
  const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
  const yaw  = Math.atan2(dir.x, dir.z);
  const base = cPts[idx].clone().addScaledVector(right, -9);

  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.85 });
  const bld = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 7), mat);
  bld.position.set(base.x, 2.5, base.z);
  bld.rotation.y = yaw;
  scene.add(bld);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(22, 2.5, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6 }));
  glass.position.set(base.x, 2.8, base.z);
  glass.rotation.y = yaw;
  scene.add(glass);
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
  const mountRef      = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const carsRef       = useRef(cars);
  const conditionsRef = useRef(conditions);
  const tvModeRef     = useRef(false);
  const [tvMode, setTvMode] = useState(false);

  useEffect(() => { carsRef.current = cars; },            [cars]);
  useEffect(() => { conditionsRef.current = conditions; }, [conditions]);
  useEffect(() => { tvModeRef.current = tvMode; },        [tvMode]);

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

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      return; // WebGL unavailable — SafeTrackMap shows 2D fallback
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    const fog = new THREE.Fog(0x0a0a14, 160, 440);
    scene.fog = fog;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.4, 600);
    cameraRef.current = camera;

    // ── Track Layout ──
    const layout = getTrackLayout(circuit.id);
    const wps: TrackPoint[] = layout?.waypoints ?? circuit.points;
    const pts3  = wps.map(p => new THREE.Vector3(p.x, 0, p.y));
    const curve = new THREE.CatmullRomCurve3(pts3, true, 'catmullrom', 0.5);
    const cPts  = curve.getPoints(240).slice(0, 240);

    // Centre / range from the interpolated curve (more accurate than raw waypoints)
    const allX = cPts.map(p => p.x), allZ = cPts.map(p => p.z);
    const cx    = (Math.min(...allX) + Math.max(...allX)) / 2;
    const cy    = (Math.min(...allZ) + Math.max(...allZ)) / 2;
    const range = Math.max(Math.max(...allX) - Math.min(...allX), Math.max(...allZ) - Math.min(...allZ));

    // Angled top-down view
    camera.position.set(cx, range * 0.75, cy + range * 0.55);
    camera.lookAt(cx, 0, cy);
    camera.updateProjectionMatrix();

    // ── Lights ──
    const ambLight = new THREE.AmbientLight(0xc8d0ff, 0.55);
    scene.add(ambLight);
    const sunLight = new THREE.DirectionalLight(0xfff4cc, 1.1);
    sunLight.position.set(cx + range * 0.3, range * 0.8, cy - range * 0.2);
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight(0x1a2244, 0x0a1a08, 0.65));

    // ── Ground / grass ──
    const groundSize = range * 3.5;
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({ color: 0x246b24, roughness: 1.0 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(cx, -0.06, cy);
    scene.add(grass);

    // Runoff / gravel traps (lighter green band outside kerbs)
    const addLayer = (geo: THREE.BufferGeometry, color: number, y: number, r = 0.95) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: r }));
      m.position.y = y;
      scene.add(m);
    };

    addLayer(sideStrip(cPts, -7.2, 3.5), 0x5a8a3a, 0.000); // outer runoff
    addLayer(sideStrip(cPts,  7.2, 3.5), 0x5a8a3a, 0.000); // inner runoff
    addLayer(sideStrip(cPts, -5.2, 1.2), 0x888877, 0.001); // outer gravel
    addLayer(sideStrip(cPts,  5.2, 1.2), 0x888877, 0.001); // inner gravel
    addLayer(sideStrip(cPts, -4.6, 1.1), 0xbb1818, 0.010); // outer kerb red
    addLayer(sideStrip(cPts,  4.6, 1.1), 0xdddddd, 0.010); // inner kerb white
    addLayer(buildRibbon(cPts, 7.8),      0x131318, 0.020, 0.88); // asphalt base
    // Racing line (subtle lighter strip)
    addLayer(buildRibbon(cPts, 1.8),      0x1e1e28, 0.022, 0.78);

    // Start/finish line
    const sfDir   = new THREE.Vector3().subVectors(cPts[1], cPts[0]).normalize();
    const sfRight = new THREE.Vector3().crossVectors(sfDir, UP).normalize();
    const sfLine  = new THREE.Mesh(
      new THREE.PlaneGeometry(7.8, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    sfLine.position.set(cPts[0].x, 0.04, cPts[0].z);
    sfLine.rotation.x = -Math.PI / 2;
    sfLine.rotation.z = Math.atan2(sfRight.x, sfRight.z);
    scene.add(sfLine);

    // ── Track furniture ──
    addBarriers(cPts, scene);
    addTireWalls(cPts, scene);
    addGrandstands(cPts, scene);
    addPitBuilding(cPts, scene);

    // ── OrbitControls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(cx, 0, cy); // ← must point at track centre
    controls.enablePan    = false;
    controls.minDistance  = 18;
    controls.maxDistance  = range * 1.8;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 2.6;
    controls.rotateSpeed  = 0.45;
    controls.zoomSpeed    = 0.9;
    controls.update();

    // ── Car Groups (created lazily in animation loop) ──
    const carGroups = new Map<string, { group: THREE.Group; ring?: THREE.Mesh }>();

    function getOrCreate(car: RaceCarState) {
      if (carGroups.has(car.driverId)) return carGroups.get(car.driverId)!;
      const driver = getDriver(car.driverId);
      const team   = driver ? getTeam(driver.teamId) : null;
      const isUser = car.driverId === USER_DRIVER_ID;
      const col    = hexColor(isUser ? '#E0C040' : (team?.color ?? '#888888'));
      const s      = isUser ? 1.20 : car.position <= 3 ? 0.90 : 0.74;
      const emi    = isUser ? 0.90 : car.position <= 3 ? 0.55 : 0.28;
      const entry  = buildCar(col, isUser, s, emi);
      scene.add(entry.group);
      carGroups.set(car.driverId, entry);
      return entry;
    }

    // ── Animation Loop ──
    let rafId   = 0;
    let pulseT  = 0;
    let prevMs  = performance.now();

    // TV cam state
    const camPos   = new THREE.Vector3().copy(camera.position);
    const camLook  = new THREE.Vector3(cx, 0, cy);
    let tvReady    = false;
    const prevCarPos = new THREE.Vector3();
    let tvCamDir   = new THREE.Vector3(0, 0, 1);

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt  = Math.min((now - prevMs) / 1000, 0.05);
      prevMs    = now;
      pulseT   += dt;

      const isTv = tvModeRef.current;
      const sc   = conditionsRef.current.safetyCarActive;

      ambLight.color.set(sc ? 0xffe070 : 0xc8d0ff);
      ambLight.intensity = sc ? 1.05 : 0.55;

      if (isTv) {
        controls.enabled = false;
        fog.near = 14; fog.far = 85;
        camera.fov = 70;
        camera.updateProjectionMatrix();

        const currentCars = carsRef.current;
        const uc = currentCars.find(c => c.driverId === USER_DRIVER_ID);

        // Build a world-space position for the user car
        let carPos: THREE.Vector3 | null = null;
        if (uc?.trackPosition) {
          carPos = new THREE.Vector3(uc.trackPosition.x, 0.35, uc.trackPosition.y);
        } else if (uc) {
          // Fallback: reconstruct from lapProgress on the curve
          const lp = Math.max(0.001, Math.min(0.9999, uc.lapProgress ?? 0));
          const pt = curve.getPointAt(lp);
          carPos = new THREE.Vector3(pt.x, 0.35, pt.z);
        }

        if (carPos) {
          // Derive travel direction from actual position delta (stays correct through corners)
          const delta = new THREE.Vector3().subVectors(carPos, prevCarPos);
          if (delta.lengthSq() > 1e-5) {
            const moveDir = delta.clone().setY(0).normalize();
            if (moveDir.lengthSq() > 0.5) {
              tvCamDir.lerp(moveDir, 0.25).normalize();
            }
          }
          prevCarPos.copy(carPos);

          const wantPos  = carPos.clone().addScaledVector(tvCamDir, -9).add(new THREE.Vector3(0, 2.8, 0));
          const wantLook = carPos.clone().addScaledVector(tvCamDir,  11).add(new THREE.Vector3(0, 0.5, 0));

          if (!tvReady) { camPos.copy(wantPos); camLook.copy(wantLook); tvReady = true; }
          camPos.lerp(wantPos,   0.13);
          camLook.lerp(wantLook, 0.13);
          camera.position.copy(camPos);
          camera.lookAt(camLook);
        }
      } else {
        controls.enabled = true;
        tvReady = false;
        fog.near = 160; fog.far = 440;
        camera.fov = 44;
        camera.updateProjectionMatrix();
        controls.update();
      }

      // Update / create car meshes
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
            const phase = Math.abs(Math.sin(pulseT * 2.8));
            ring.scale.setScalar(1 + 0.38 * phase);
            (ring.material as THREE.MeshBasicMaterial).opacity = 0.78 - 0.58 * phase;
          }
        });

      // Remove retired / off-track cars
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

  return (
    <div style={{ width, height, position: 'relative', background: '#0a0a14', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <button
        onClick={() => setTvMode(p => !p)}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: tvMode ? '#E0C040' : 'rgba(10,10,20,0.85)',
          color: tvMode ? '#000' : '#E0C040',
          border: `1px solid ${tvMode ? '#E0C040' : 'rgba(224,192,64,0.4)'}`,
          borderRadius: 8, padding: '5px 12px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.8,
        }}
      >
        {tvMode ? '📺 TV' : '🗺 MAP'}
      </button>

      {tvMode && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,20,0.7)', borderRadius: 6, padding: '3px 10px',
          color: '#888', fontSize: 10, letterSpacing: 1, pointerEvents: 'none',
        }}>
          📺 CINEMATIC CAM
        </div>
      )}
    </div>
  );
}
