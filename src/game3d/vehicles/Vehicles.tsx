'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface VehicleData {
  id: string;
  type: 'sedan' | 'taxi' | 'van' | 'police';
  position: THREE.Vector3;
  rotation: number;
  speed: number;
  color: string;
  route: { x: number; z: number }[];
  routeIndex: number;
}

function createVehicles(count: number): VehicleData[] {
  const types: VehicleData['type'][] = ['sedan', 'taxi', 'van', 'police', 'sedan', 'sedan'];
  const colors: Record<string, string> = {
    sedan: '#2a4a6a',
    taxi: '#e0c030',
    van: '#d0d0d0',
    police: '#1a3a5a',
  };

  const roadLoop1 = [
    { x: -140, z: 1.5 }, { x: -70, z: 1.5 }, { x: 0, z: 1.5 }, { x: 60, z: 1.5 }, { x: 140, z: 1.5 },
    { x: 140, z: 61.5 }, { x: 60, z: 61.5 }, { x: 0, z: 61.5 }, { x: -70, z: 61.5 }, { x: -140, z: 61.5 },
    { x: -140, z: 1.5 }
  ];
  const roadLoop2 = [
    { x: 1.5, z: -140 }, { x: 1.5, z: -50 }, { x: 1.5, z: 0 }, { x: 1.5, z: 60 }, { x: 1.5, z: 140 },
    { x: 61.5, z: 140 }, { x: 61.5, z: 60 }, { x: 61.5, z: 0 }, { x: 61.5, z: -50 }, { x: 61.5, z: -140 },
    { x: 1.5, z: -140 }
  ];

  const vehicles: VehicleData[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const route = i % 2 === 0 ? roadLoop1 : roadLoop2;
    const idx = Math.floor(Math.random() * route.length);
    const pos = route[idx];
    
    vehicles.push({
      id: `veh-${i}`,
      type,
      position: new THREE.Vector3(pos.x + (Math.random()-0.5)*1, 0, pos.z + (Math.random()-0.5)*1),
      rotation: 0,
      speed: 5 + Math.random() * 3,
      color: colors[type],
      route,
      routeIndex: idx,
    });
  }
  return vehicles;
}

function Vehicle({ data }: { data: VehicleData }) {
  const meshRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const headLightRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const tailLightRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const camPos = (window as any).__cameraPosition as THREE.Vector3;
    if (camPos) {
      const dist = meshRef.current.position.distanceTo(camPos);
      if (dist > 80 && Math.random() < 0.5) return;
    }

    const target = data.route[data.routeIndex];
    const targetVec = new THREE.Vector3(target.x, 0, target.z);
    const dir = new THREE.Vector3().subVectors(targetVec, data.position);
    const dist = dir.length();

    if (dist < 2.5) {
      data.routeIndex = (data.routeIndex + 1) % data.route.length;
    } else {
      dir.normalize();
      const move = dir.multiplyScalar(data.speed * delta);
      data.position.add(move);
      
      const targetRot = Math.atan2(dir.x, dir.z);
      let diff = targetRot - data.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      data.rotation += diff * delta * 2.5;
    }

    meshRef.current.position.copy(data.position);
    meshRef.current.position.y = 0.34; // wheel radius 0.32 + 0.02 contact
    meshRef.current.rotation.y = data.rotation;

    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x += delta * data.speed * 2.5;
    });

    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      headLightRefs.current.forEach(m => {
        if (m) m.emissiveIntensity = isNight ? 1.6 : 0.35;
      });
      tailLightRefs.current.forEach(m => {
        if (m) m.emissiveIntensity = isNight ? 1.2 : 0.25;
      });
      if (isNight) {
        const camPos = (window as any).__cameraPosition as THREE.Vector3;
        if (camPos && meshRef.current) {
          const dist = meshRef.current.position.distanceTo(camPos);
          if (dist < 35) {
            (window as any).__activeLights = ((window as any).__activeLights || 0) + 2;
          }
        }
      }
    } catch {}
  });

  const isVan = data.type === 'van';
  const isPolice = data.type === 'police';
  const isTaxi = data.type === 'taxi';

  // Realistic sedan: length 4.5m, width 1.8m, height 1.5m, wheel radius 0.32m
  return (
    <group ref={meshRef}>
      {/* Chassis lower */}
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={isVan ? [1.9, 0.55, 5.0] : [1.8, 0.48, 4.5]} />
        <meshStandardMaterial color={data.color} roughness={0.35} metalness={0.35} />
      </mesh>

      {/* Hood - front 1.1m */}
      {!isVan && (
        <mesh castShadow position={[0, 0.62, 1.35]}>
          <boxGeometry args={[1.75, 0.22, 1.1]} />
          <meshStandardMaterial color={data.color} roughness={0.32} metalness={0.38} />
        </mesh>
      )}

      {/* Trunk - rear 0.7m */}
      {!isVan && (
        <mesh castShadow position={[0, 0.62, -1.55]}>
          <boxGeometry args={[1.75, 0.22, 0.7]} />
          <meshStandardMaterial color={data.color} roughness={0.32} metalness={0.38} />
        </mesh>
      )}
      
      {/* Cabin/roof */}
      <mesh castShadow position={[0, 1.02, isVan ? -0.2 : -0.15]}>
        <boxGeometry args={isVan ? [1.85, 0.78, 2.8] : [1.68, 0.62, 2.1]} />
        <meshStandardMaterial color={isVan ? data.color : '#1e1e1e'} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Roof for sedan */}
      {!isVan && (
        <mesh castShadow position={[0, 1.34, -0.15]}>
          <boxGeometry args={[1.6, 0.08, 1.9]} />
          <meshStandardMaterial color={data.color} roughness={0.35} metalness={0.35} />
        </mesh>
      )}

      {/* Windshield */}
      {!isVan && (
        <>
          <mesh position={[0, 1.02, 0.82]} rotation={[0.45, 0, 0]} castShadow>
            <planeGeometry args={[1.55, 0.65]} />
            <meshStandardMaterial color="#7a9ab8" transparent opacity={0.48} roughness={0.06} metalness={0.85} />
          </mesh>
          <mesh position={[0, 1.02, -0.95]} rotation={[-0.35, 0, 0]} castShadow>
            <planeGeometry args={[1.55, 0.60]} />
            <meshStandardMaterial color="#7a9ab8" transparent opacity={0.48} roughness={0.06} metalness={0.85} />
          </mesh>
          <mesh position={[-0.85, 1.02, -0.15]} rotation={[0, Math.PI/2, 0]} castShadow>
            <planeGeometry args={[1.7, 0.52]} />
            <meshStandardMaterial color="#7a9ab8" transparent opacity={0.38} roughness={0.1} metalness={0.75} />
          </mesh>
          <mesh position={[0.85, 1.02, -0.15]} rotation={[0, -Math.PI/2, 0]} castShadow>
            <planeGeometry args={[1.7, 0.52]} />
            <meshStandardMaterial color="#7a9ab8" transparent opacity={0.38} roughness={0.1} metalness={0.75} />
          </mesh>
        </>
      )}

      {/* Bumpers */}
      <mesh castShadow position={[0, 0.32, 2.28]}>
        <boxGeometry args={[1.82, 0.18, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.32, -2.28]}>
        <boxGeometry args={[1.82, 0.18, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Wheels - all 4 same height, radius 0.32, axle at 0.32 */}
      {[
        [-0.88, 0, 1.35],
        [0.88, 0, 1.35],
        [-0.88, 0, -1.35],
        [0.88, 0, -1.35],
      ].map((pos, i) => (
        <group key={`wheel-${i}`} position={pos as any}>
          <mesh
            ref={(el) => { if (el) wheelRefs.current[i] = el; }}
            rotation={[0, 0, Math.PI/2]}
            castShadow
          >
            <cylinderGeometry args={[0.32, 0.32, 0.24, 14]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI/2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.25, 10]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Headlights */}
      <mesh position={[-0.52, 0.42, 2.30]} >
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) headLightRefs.current[0]=el; }} color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.52, 0.42, 2.30]} >
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) headLightRefs.current[1]=el; }} color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.58, 0.48, -2.30]} >
        <boxGeometry args={[0.14, 0.14, 0.05]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) tailLightRefs.current[0]=el; }} color="#ff2222" emissive="#ff0000" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.58, 0.48, -2.30]} >
        <boxGeometry args={[0.14, 0.14, 0.05]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) tailLightRefs.current[1]=el; }} color="#ff2222" emissive="#ff0000" emissiveIntensity={0.4} />
      </mesh>
      
      {isTaxi && (
        <group position={[0, 1.42, -0.1]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.16, 0.22]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        </group>
      )}

      {isPolice && (
        <>
          <mesh position={[0, 0.42, 0]} >
            <boxGeometry args={[1.82, 0.04, 4.52]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
          <mesh position={[-0.28, 1.40, 0.1]} castShadow>
            <boxGeometry args={[0.20, 0.09, 0.36]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.0} />
          </mesh>
          <mesh position={[0.28, 1.40, 0.1]} castShadow>
            <boxGeometry args={[0.20, 0.09, 0.36]} />
            <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={1.0} />
          </mesh>
        </>
      )}

      <mesh position={[0, 0.32, 2.34]} >
        <planeGeometry args={[0.38, 0.11]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.32, -2.34]} rotation={[0, Math.PI, 0]} >
        <planeGeometry args={[0.38, 0.11]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function Vehicles() {
  const settings = useGameStore((s) => s.settings);
  const count = settings.graphics === 'low' ? 3 : settings.graphics === 'medium' ? 6 : 10;
  
  const vehicles = useMemo(() => createVehicles(count), [count]);

  return (
    <group>
      {vehicles.map((v) => (
        <Vehicle key={v.id} data={v} />
      ))}
    </group>
  );
}
