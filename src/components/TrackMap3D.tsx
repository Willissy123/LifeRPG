import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const dir  = new THREE.Vector3().subVectors(next, prev).normalize();
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

// ── Camera auto-fit (F1 Manager: nearly top-down) ────────────────────────────

function CameraSetup({ wps, id }: { wps: TrackPoint[]; id: string }) {
  const { camera } = useThree();
  useEffect(() => {
    const xs = wps.map(p => p.x), ys = wps.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx   = (minX + maxX) / 2;
    const cy   = (minY + maxY) / 2;
    const range = Math.max(maxX - minX, maxY - minY);
    // ~78° elevation — F1 Manager style nearly top-down
    camera.position.set(cx, range * 1.0, cy + range * 0.22);
    (camera as THREE.PerspectiveCamera).lookAt(cx, 0, cy);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

// ── Pulsing gold ring on user car ────────────────────────────────────────────

function PulseRing() {
  const ref = useRef<THREE.Mesh>(null!);
  const t   = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const phase = Math.abs(Math.sin(t.current * 2.6));
    ref.current.scale.setScalar(1 + 0.4 * phase);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.75 - 0.55 * phase;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.8, 0.14, 8, 48]} />
      <meshBasicMaterial color="#E0C040" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

// ── Main scene ────────────────────────────────────────────────────────────────

interface SceneProps {
  circuit: Circuit;
  cars: RaceCarState[];
  conditions: RaceConditions;
}

function TrackScene({ circuit, cars, conditions }: SceneProps) {
  const layout = getTrackLayout(circuit.id);
  const wps: TrackPoint[] = layout?.waypoints ?? circuit.points;

  const geo = useMemo(() => {
    const pts3 = wps.map(p => new THREE.Vector3(p.x, 0, p.y));
    const curve = new THREE.CatmullRomCurve3(pts3, true, 'catmullrom', 0.5);
    const all   = curve.getPoints(280);
    const cPts  = all.slice(0, 280);          // drop duplicate endpoint

    const xs = wps.map(p => p.x), ys = wps.map(p => p.y);
    const cx  = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy  = (Math.min(...ys) + Math.max(...ys)) / 2;

    // Start/finish line — perpendicular ribbon at cPts[0]
    const sfDir   = new THREE.Vector3().subVectors(cPts[1], cPts[0]).normalize();
    const sfRight = new THREE.Vector3().crossVectors(sfDir, UP).normalize();
    const sfAngle = Math.atan2(sfRight.x, sfRight.z);

    return { curve, cPts, cx, cy, sfAngle, sfPos: cPts[0] };
  }, [circuit.id]);

  const { curve, cPts, cx, cy, sfAngle, sfPos } = geo;

  // Geometries built separately so we can keep useMemo dependencies clean
  const trackGeo = useMemo(() => buildRibbon(cPts, 6.4),        [circuit.id]);
  const kerbLGeo = useMemo(() => sideStrip(cPts, -3.7, 1.0),   [circuit.id]);
  const kerbRGeo = useMemo(() => sideStrip(cPts,  3.7, 1.0),   [circuit.id]);
  const runoffL  = useMemo(() => sideStrip(cPts, -4.7, 1.0),   [circuit.id]);
  const runoffR  = useMemo(() => sideStrip(cPts,  4.7, 1.0),   [circuit.id]);

  const sc = conditions.safetyCarActive;

  return (
    <>
      <CameraSetup wps={wps} id={circuit.id} />

      {/* Fog + sky colour */}
      <fog attach="fog" args={['#08080f', 160, 420]} />
      <color attach="background" args={['#08080f']} />

      {/* Lighting */}
      <ambientLight intensity={sc ? 1.0 : 0.55} color={sc ? '#ffe070' : '#c8d0ff'} />
      <directionalLight position={[cx + 20, 120, cy + 30]} intensity={0.9} color="#ffffff" />
      <hemisphereLight args={['#1a2244', '#000000', 0.7]} />

      {/* Grass — bright F1 Manager green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.05, cy]}>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial color="#1e7a1e" roughness={1} />
      </mesh>

      {/* Run-off / gravel (dark grey strip just outside kerbs) */}
      <mesh geometry={runoffL} position={[0, 0.0, 0]}>
        <meshStandardMaterial color="#4a4a44" roughness={1} />
      </mesh>
      <mesh geometry={runoffR} position={[0, 0.0, 0]}>
        <meshStandardMaterial color="#4a4a44" roughness={1} />
      </mesh>

      {/* Kerbs — red left, white right */}
      <mesh geometry={kerbLGeo} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#cc1a1a" roughness={0.85} />
      </mesh>
      <mesh geometry={kerbRGeo} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#dddddd" roughness={0.85} />
      </mesh>

      {/* Track asphalt */}
      <mesh geometry={trackGeo} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#141420" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Start / finish line */}
      <mesh
        position={[sfPos.x, 0.04, sfPos.z]}
        rotation={[0, sfAngle, 0]}
      >
        <planeGeometry args={[6.4, 0.5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Cars */}
      {cars
        .filter(c => c.status !== 'retired' && c.status !== 'dnq' && c.trackPosition)
        .map(car => {
          const driver = getDriver(car.driverId);
          const team   = driver ? getTeam(driver.teamId) : null;
          const isUser = car.driverId === USER_DRIVER_ID;
          const color  = isUser ? '#E0C040' : (team?.color ?? '#888888');
          const { x, y } = car.trackPosition;

          const lp     = Math.max(0.0001, Math.min(0.9999, car.lapProgress));
          const tan    = curve.getTangentAt(lp);
          const yAngle = Math.atan2(tan.x, tan.z);

          // F1 Manager: cars are small coloured lozenge shapes
          const s   = isUser ? 1.15 : car.position <= 3 ? 0.88 : 0.70;
          const emi = isUser ? 1.1  : car.position <= 3 ? 0.65 : 0.35;

          return (
            <group key={car.driverId} position={[x, 0.5, y]} rotation={[0, yAngle, 0]}>
              {/* Main body */}
              <mesh>
                <boxGeometry args={[s * 0.60, s * 0.18, s * 1.50]} />
                <meshStandardMaterial
                  color={color} emissive={color} emissiveIntensity={emi}
                  roughness={0.2} metalness={0.75}
                />
              </mesh>
              {/* Cockpit dome */}
              <mesh position={[0, s * 0.13, s * 0.05]}>
                <boxGeometry args={[s * 0.24, s * 0.10, s * 0.44]} />
                <meshStandardMaterial color={isUser ? '#ffffee' : '#111111'} roughness={0.4} />
              </mesh>
              {/* Front nose taper */}
              <mesh position={[0, 0, s * 0.78]}>
                <boxGeometry args={[s * 0.32, s * 0.10, s * 0.28]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emi * 0.6} roughness={0.2} metalness={0.75} />
              </mesh>
              {/* Glow point light */}
              <pointLight
                color={color}
                intensity={isUser ? 6 : car.position <= 3 ? 2.5 : 1.2}
                distance={isUser ? 14 : 8}
                decay={2}
              />
              {isUser && <PulseRing />}
            </group>
          );
        })}
    </>
  );
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
  return (
    <div style={{ width, height, background: '#08080f', overflow: 'hidden' }}>
      <Suspense fallback={<div style={{ width, height, background: '#08080f' }} />}>
        <Canvas
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          camera={{ fov: 44, near: 0.5, far: 700 }}
          style={{ width: '100%', height: '100%' }}
        >
          <TrackScene circuit={circuit} cars={cars} conditions={conditions} />
          <OrbitControls
            enablePan={false}
            minDistance={20}
            maxDistance={260}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 3}
            rotateSpeed={0.4}
            zoomSpeed={0.9}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
