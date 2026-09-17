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
    sedan: '#3a5a8a',
    taxi: '#e0c030',
    van: '#8a8a8a',
    police: '#2a4a8a',
  };

  // Define road loops
  const roadLoop1 = [
    { x: -140, z: 0 }, { x: -70, z: 0 }, { x: 0, z: 0 }, { x: 60, z: 0 }, { x: 140, z: 0 },
    { x: 140, z: 60 }, { x: 60, z: 60 }, { x: 0, z: 60 }, { x: -70, z: 60 }, { x: -140, z: 60 },
    { x: -140, z: 0 }
  ];
  const roadLoop2 = [
    { x: 0, z: -140 }, { x: 0, z: -50 }, { x: 0, z: 0 }, { x: 0, z: 60 }, { x: 0, z: 140 },
    { x: 60, z: 140 }, { x: 60, z: 60 }, { x: 60, z: 0 }, { x: 60, z: -50 }, { x: 60, z: -140 },
    { x: 0, z: -140 }
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
      position: new THREE.Vector3(pos.x + (Math.random()-0.5)*4, 0, pos.z + (Math.random()-0.5)*4),
      rotation: 0,
      speed: 4 + Math.random() * 4,
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

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const target = data.route[data.routeIndex];
    const targetVec = new THREE.Vector3(target.x, 0, target.z);
    const dir = new THREE.Vector3().subVectors(targetVec, data.position);
    const dist = dir.length();

    if (dist < 3) {
      data.routeIndex = (data.routeIndex + 1) % data.route.length;
    } else {
      dir.normalize();
      const move = dir.multiplyScalar(data.speed * delta);
      data.position.add(move);
      
      // Smooth rotation
      const targetRot = Math.atan2(dir.x, dir.z);
      let diff = targetRot - data.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      data.rotation += diff * delta * 3;
    }

    meshRef.current.position.copy(data.position);
    meshRef.current.position.y = 0.6;
    meshRef.current.rotation.y = data.rotation;

    // Wheel rotation
    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x += delta * data.speed * 2;
    });
  });

  const isVan = data.type === 'van';
  const isPolice = data.type === 'police';

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={isVan ? [2, 1.2, 4.5] : [1.8, 0.8, 4]} />
        <meshStandardMaterial color={data.color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Roof/Cabin */}
      <mesh castShadow position={[0, 0.9, isVan ? -0.3 : 0]}>
        <boxGeometry args={isVan ? [1.9, 0.8, 2.5] : [1.7, 0.6, 2]} />
        <meshStandardMaterial color={isVan ? data.color : '#2a2a2a'} roughness={0.5} />
      </mesh>
      {/* Windows */}
      {!isVan && (
        <>
          <mesh position={[0, 1, 0.2]} castShadow>
            <boxGeometry args={[1.6, 0.5, 1.8]} />
            <meshStandardMaterial color="#88aacc" transparent opacity={0.6} roughness={0.1} metalness={0.8} />
          </mesh>
        </>
      )}
      {/* Wheels */}
      {[
        [-0.9, 0, 1.2],
        [0.9, 0, 1.2],
        [-0.9, 0, -1.2],
        [0.9, 0, -1.2],
      ].map((pos, i) => (
        <mesh
          key={`wheel-${i}`}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          position={pos as any}
          rotation={[0, 0, Math.PI/2]}
          castShadow
        >
          <cylinderGeometry args={[0.35, 0.35, 0.3, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}

      {/* Lights */}
      <mesh position={[-0.6, 0.3, 2]} >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffffaa" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.6, 0.3, 2]} >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#ffffaa" emissive="#ffffaa" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Taxi sign */}
      {data.type === 'taxi' && (
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[0.6, 0.2, 0.3]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}

      {/* Police lights */}
      {isPolice && (
        <>
          <mesh position={[-0.3, 1.3, 0]} castShadow>
            <boxGeometry args={[0.2, 0.1, 0.4]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0.3, 1.3, 0]} castShadow>
            <boxGeometry args={[0.2, 0.1, 0.4]} />
            <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={1} />
          </mesh>
        </>
      )}
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
