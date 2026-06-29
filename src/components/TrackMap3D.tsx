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

// ── Geometry helpers ─────────────────────────────────────────────────────────

const UP = new THREE.Vector3(0, 1, 0);

function buildRibbon(pts: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const dir = new THREE.Vector3().subVectors(next, prev).normalize();
    const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
    const hw = width / 2;
    const L = pts[i].clone().addScaledVector(right, -hw);
    const R = pts[i].clone().addScaledVector(right, hw);
    pos.push(L.x, L.y, L.z, R.x, R.y, R.z);
    uvs.push(0, i / n, 1, i / n);
    const a = i * 2, b = a + 1, c = ((i + 1) % n) * 2, d = c + 1;
    idx.push(a, c, b, c, d, b);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildSideStrip(
  centerPts: THREE.Vector3[],
  offset: number,
  width: number,
): THREE.BufferGeometry {
  const n = centerPts.length;
  const sidePts = centerPts.map((p, i) => {
    const prev = centerPts[(i - 1 + n) % n];
    const next = centerPts[(i + 1) % n];
    const dir = new THREE.Vector3().subVectors(next, prev).normalize();
    const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
    return p.clone().addScaledVector(right, offset);
  });
  return buildRibbon(sidePts, width);
}

// ── Camera auto-fit ──────────────────────────────────────────────────────────

function CameraSetup({ wps, id }: { wps: TrackPoint[]; id: string }) {
  const { camera } = useThree();
  useEffect(() => {
    const xs = wps.map(p => p.x);
    const ys = wps.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const range = Math.max(maxX - minX, maxY - minY);
    camera.position.set(cx - range * 0.15, range * 0.72, cy + range * 0.80);
    (camera as THREE.PerspectiveCamera).lookAt(cx, 0, cy);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

// ── Pulsing ring on user car ──────────────────────────────────────────────────

function PulseRing() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const phase = Math.abs(Math.sin(t.current * 2.8));
    meshRef.current.scale.setScalar(1 + 0.35 * phase);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 - 0.5 * phase;
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.6, 0.13, 8, 48]} />
      <meshBasicMaterial color="#E0C040" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

// ── Track + cars scene ────────────────────────────────────────────────────────

interface SceneProps {
  circuit: Circuit;
  cars: RaceCarState[];
  conditions: RaceConditions;
}

function TrackScene({ circuit, cars, conditions }: SceneProps) {
  const layout = getTrackLayout(circuit.id);
  const wps: TrackPoint[] = layout?.waypoints ?? circuit.points;

  const { curve, centerPts, trackGeo, kerbLGeo, kerbRGeo, cx, cy } = useMemo(() => {
    const pts3 = wps.map(p => new THREE.Vector3(p.x, 0, p.y));
    const curve = new THREE.CatmullRomCurve3(pts3, true, 'catmullrom', 0.5);
    // getPoints returns N+1 for closed; drop the duplicate last point
    const all = curve.getPoints(240);
    const centerPts = all.slice(0, 240);

    const xs = wps.map(p => p.x);
    const ys = wps.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    return {
      curve,
      centerPts,
      trackGeo:  buildRibbon(centerPts, 5.8),
      kerbLGeo:  buildSideStrip(centerPts, -3.2, 0.85),
      kerbRGeo:  buildSideStrip(centerPts,  3.2, 0.85),
      cx, cy,
    };
  }, [circuit.id]);

  const sc = conditions.safetyCarActive;

  return (
    <>
      <CameraSetup wps={wps} id={circuit.id} />

      {/* Atmosphere */}
      <fog attach="fog" args={['#05050d', 140, 380]} />
      <ambientLight intensity={sc ? 0.9 : 0.4} color={sc ? '#ffe080' : '#aaaacc'} />
      <directionalLight position={[cx + 40, 100, cy + 50]} intensity={0.8} color="#ffffff" />
      <hemisphereLight args={['#1a1a44', '#000000', 0.6]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.1, cy]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#040408" roughness={1} metalness={0} />
      </mesh>

      {/* Track asphalt */}
      <mesh geometry={trackGeo} position={[0, 0.01, 0]}>
        <meshStandardMaterial
          color="#0d0d15"
          roughness={0.96}
          metalness={0.04}
          emissive="#060610"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Kerb: left = red, right = white */}
      <mesh geometry={kerbLGeo} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#cc1a1a" roughness={0.85} />
      </mesh>
      <mesh geometry={kerbRGeo} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#cccccc" roughness={0.85} />
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

          // Compute heading from curve tangent at lapProgress
          const lp      = Math.max(0.0001, Math.min(0.9999, car.lapProgress));
          const tangent = curve.getTangentAt(lp);
          const yAngle  = Math.atan2(tangent.x, tangent.z);

          const s   = isUser ? 1.1 : car.position <= 3 ? 0.85 : 0.68;
          const emi = isUser ? 1.0 : car.position <= 3 ? 0.55 : 0.3;

          return (
            <group key={car.driverId} position={[x, 0.4, y]} rotation={[0, yAngle, 0]}>
              {/* Body */}
              <mesh>
                <boxGeometry args={[s * 0.62, s * 0.20, s * 1.55]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={emi}
                  roughness={0.25}
                  metalness={0.7}
                />
              </mesh>
              {/* Cockpit hump */}
              <mesh position={[0, s * 0.14, s * 0.08]}>
                <boxGeometry args={[s * 0.26, s * 0.11, s * 0.48]} />
                <meshStandardMaterial
                  color={isUser ? '#ffffff' : '#111111'}
                  roughness={0.5}
                />
              </mesh>
              {/* Glow point light */}
              <pointLight
                color={color}
                intensity={isUser ? 5 : car.position <= 3 ? 2 : 1}
                distance={isUser ? 12 : 7}
                decay={2}
              />
              {/* User-only pulse ring */}
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
    <div style={{ width, height, background: '#05050d', overflow: 'hidden' }}>
      <Suspense fallback={<div style={{ width, height, background: '#05050d' }} />}>
        <Canvas
          gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
          camera={{ fov: 46, near: 0.5, far: 600 }}
          style={{ width: '100%', height: '100%' }}
        >
          <TrackScene circuit={circuit} cars={cars} conditions={conditions} />
          <OrbitControls
            enablePan={false}
            minDistance={18}
            maxDistance={240}
            maxPolarAngle={Math.PI / 2.3}
            rotateSpeed={0.45}
            zoomSpeed={0.8}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
