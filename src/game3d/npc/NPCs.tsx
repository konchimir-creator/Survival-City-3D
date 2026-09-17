'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface NPCData {
  id: string;
  type: 'pedestrian' | 'worker' | 'police' | 'homeless' | 'seller';
  position: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  color: string;
  scale: number;
  waitTime: number;
  route: THREE.Vector3[];
  routeIndex: number;
}

function createNPCs(count: number): NPCData[] {
  const types: NPCData['type'][] = ['pedestrian', 'pedestrian', 'pedestrian', 'worker', 'police', 'homeless', 'seller'];
  const colors: Record<string, string> = {
    pedestrian: '#5a7a5a',
    worker: '#8a6a3a',
    police: '#2a4a8a',
    homeless: '#4a4a4a',
    seller: '#8a4a6a',
  };

  const npcs: NPCData[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 80 + 20;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    
    // Simple sidewalk routes
    const route: THREE.Vector3[] = [];
    const routeLen = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < routeLen; r++) {
      route.push(new THREE.Vector3(
        x + (Math.random() - 0.5) * 40,
        0,
        z + (Math.random() - 0.5) * 40
      ));
    }

    npcs.push({
      id: `npc-${i}`,
      type,
      position: new THREE.Vector3(x, 0, z),
      target: route[0].clone(),
      speed: 0.5 + Math.random() * 1.2,
      color: colors[type],
      scale: 0.9 + Math.random() * 0.2,
      waitTime: 0,
      route,
      routeIndex: 0,
    });
  }
  return npcs;
}

function NPC({ data }: { data: NPCData }) {
  const meshRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random() * 100);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    // Simple movement towards target
    if (data.waitTime > 0) {
      data.waitTime -= delta;
      return;
    }

    const dir = new THREE.Vector3().subVectors(data.target, data.position);
    const dist = dir.length();
    
    if (dist < 1) {
      // Reached target, pick next
      data.routeIndex = (data.routeIndex + 1) % data.route.length;
      data.target.copy(data.route[data.routeIndex]);
      // Random wait
      if (Math.random() < 0.3) {
        data.waitTime = Math.random() * 3 + 1;
      }
    } else {
      dir.normalize();
      const move = dir.multiplyScalar(data.speed * delta);
      data.position.add(move);
      
      // Rotate to face direction
      const angle = Math.atan2(dir.x, dir.z);
      meshRef.current.rotation.y = angle;
    }

    meshRef.current.position.copy(data.position);
    meshRef.current.position.y = 0.9; // ground + half height

    // Walk bobbing
    const bob = Math.sin(timeRef.current * data.speed * 5) * 0.05;
    meshRef.current.position.y += Math.abs(bob);

    // Leg swing etc could be added
    if (data.waitTime === 0) {
      meshRef.current.rotation.z = Math.sin(timeRef.current * data.speed * 5) * 0.05;
    }
  });

  return (
    <group ref={meshRef} scale={data.scale}>
      {/* Simple humanoid - similar to player but smaller and different colors */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
        <meshStandardMaterial color={data.color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#e8c4a8" roughness={0.7} />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.1, -0.1, 0]}>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#3a3a5a" />
      </mesh>
      <mesh castShadow position={[0.1, -0.1, 0]}>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#3a3a5a" />
      </mesh>
    </group>
  );
}

export function NPCs() {
  const settings = useGameStore((s) => s.settings);
  const count = settings.graphics === 'low' ? 6 : settings.graphics === 'medium' ? 12 : 20;
  
  const npcs = useMemo(() => createNPCs(count), [count]);

  return (
    <group>
      {npcs.map((npc) => (
        <NPC key={npc.id} data={npc} />
      ))}
    </group>
  );
}

// Static seller NPCs at shops
export function StaticNPCs() {
  return (
    <group>
      {/* Shop seller */}
      <group position={[45, 0.9, -32]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
          <meshStandardMaterial color="#8a4a6a" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#e8c4a8" />
        </mesh>
      </group>
      
      {/* Warehouse worker */}
      <group position={[-85, 0.9, 35]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.28, 0.8, 4, 8]} />
          <meshStandardMaterial color="#8a6a3a" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#d4a88a" />
        </mesh>
      </group>

      {/* Cafe worker */}
      <group position={[70, 0.9, -12]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.24, 0.8, 4, 8]} />
          <meshStandardMaterial color="#5a8a5a" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#e8c4a8" />
        </mesh>
      </group>

      {/* Police */}
      <group position={[90, 0.9, 63]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.27, 0.9, 4, 8]} />
          <meshStandardMaterial color="#2a4a8a" />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#e8c4a8" />
        </mesh>
      </group>
    </group>
  );
}
