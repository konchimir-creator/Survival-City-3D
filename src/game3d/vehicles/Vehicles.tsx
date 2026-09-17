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
    meshRef.current.position.y = 0.35;
    meshRef.current.rotation.y = data.rotation;

    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x += delta * data.speed * 2.5;
    });

    // Night lights
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      headLightRefs.current.forEach(m => {
        if (m) m.emissiveIntensity = isNight ? 1.2 : 0.4;
      });
      tailLightRefs.current.forEach(m => {
        if (m) m.emissiveIntensity = isNight ? 1.0 : 0.3;
      });
    } catch {}
  });

  const isVan = data.type === 'van';
  const isPolice = data.type === 'police';
  const isTaxi = data.type === 'taxi';

  // Realistic scale: car ~4.5m long, 1.8m wide, 1.5m tall
  return (
    <group ref={meshRef}>
      {/* Main body - lower */}
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={isVan ? [1.9, 0.9, 5.0] : [1.8, 0.7, 4.4]} />
        <meshStandardMaterial color={data.color} roughness={0.3} metalness={0.4} />
      </mesh>
      
      {/* Cabin/roof */}
      <mesh castShadow position={[0, 1.05, isVan ? -0.2 : -0.1]}>
        <boxGeometry args={isVan ? [1.85, 0.8, 2.8] : [1.7, 0.65, 2.2]} />
        <meshStandardMaterial color={isVan ? data.color : '#1a1a1a'} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Windshield */}
      {!isVan && (
        <>
          <mesh position={[0, 1.0, 0.8]} rotation={[0.4, 0, 0]} castShadow>
            <planeGeometry args={[1.6, 0.8]} />
            <meshStandardMaterial color="#88aacc" transparent opacity={0.5} roughness={0.05} metalness={0.9} />
          </mesh>
          <mesh position={[0, 1.0, -0.9]} rotation={[-0.3, 0, 0]} castShadow>
            <planeGeometry args={[1.6, 0.7]} />
            <meshStandardMaterial color="#88aacc" transparent opacity={0.5} roughness={0.05} metalness={0.9} />
          </mesh>
          {/* Side windows */}
          <mesh position={[-0.86, 1.0, -0.1]} rotation={[0, Math.PI/2, 0]} castShadow>
            <planeGeometry args={[1.8, 0.6]} />
            <meshStandardMaterial color="#88aacc" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
          </mesh>
          <mesh position={[0.86, 1.0, -0.1]} rotation={[0, -Math.PI/2, 0]} castShadow>
            <planeGeometry args={[1.8, 0.6]} />
            <meshStandardMaterial color="#88aacc" transparent opacity={0.4} roughness={0.1} metalness={0.8} />
          </mesh>
        </>
      )}

      {/* Wheels - realistic 0.35m radius */}
      {[
        [-0.9, 0, 1.3],
        [0.9, 0, 1.3],
        [-0.9, 0, -1.3],
        [0.9, 0, -1.3],
      ].map((pos, i) => (
        <group key={`wheel-${i}`} position={pos as any}>
          <mesh
            ref={(el) => { if (el) wheelRefs.current[i] = el; }}
            rotation={[0, 0, Math.PI/2]}
            castShadow
          >
            <cylinderGeometry args={[0.32, 0.32, 0.25, 14]} />
            <meshStandardMaterial color="#111111" roughness={0.9} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI/2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.26, 10]} />
            <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Headlights - night turns on brighter */}
      <mesh position={[-0.55, 0.4, 2.15]} >
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) headLightRefs.current[0]=el; }} color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.55, 0.4, 2.15]} >
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) headLightRefs.current[1]=el; }} color="#ffffcc" emissive="#ffffaa" emissiveIntensity={0.6} />
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.6, 0.5, -2.15]} >
        <boxGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) tailLightRefs.current[0]=el; }} color="#ff2222" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.6, 0.5, -2.15]} >
        <boxGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial ref={(el:any)=>{ if(el) tailLightRefs.current[1]=el; }} color="#ff2222" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Taxi sign */}
      {isTaxi && (
        <group position={[0, 1.45, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.18, 0.25]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.05, 0.13]}>
            <planeGeometry args={[0.5, 0.1]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        </group>
      )}

      {/* Police details */}
      {isPolice && (
        <>
          <mesh position={[0, 0.45, 0]} >
            <boxGeometry args={[1.82, 0.05, 4.42]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
          <mesh position={[-0.3, 1.45, 0]} castShadow>
            <boxGeometry args={[0.22, 0.1, 0.4]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0.3, 1.45, 0]} castShadow>
            <boxGeometry args={[0.22, 0.1, 0.4]} />
            <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={1.2} />
          </mesh>
          <mesh position={[0, 0.8, 0.5]} >
            <planeGeometry args={[0.8, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {/* License plates */}
      <mesh position={[0, 0.35, 2.22]} >
        <planeGeometry args={[0.4, 0.12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.35, -2.22]} rotation={[0, Math.PI, 0]} >
        <planeGeometry args={[0.4, 0.12]} />
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
