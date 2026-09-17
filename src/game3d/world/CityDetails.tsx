'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Tree({ position, scale = 1, variant = 0 }: { position: [number, number, number], scale?: number, variant?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: variant === 0 ? '#4a3a2a' : variant === 1 ? '#3a2a1a' : '#5a4a3a',
    roughness: 0.9 
  }), [variant]);
  
  const foliageMats = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#2d5a27', roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: '#3a6a2a', roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: '#2a4a2a', roughness: 0.85 }),
  ], []);

  // Randomize transparency when near camera
  useFrame(() => {
    if (!groupRef.current) return;
    const nearObstacle = (window as any).__cameraNearObstacle;
    const camPos = (window as any).__cameraPosition as THREE.Vector3;
    if (camPos && groupRef.current) {
      const dist = groupRef.current.position.distanceTo(camPos);
      const isBetween = (window as any).__cameraTarget ? true : false;
      // Simple transparency when very close
      if (dist < 3 && nearObstacle) {
        groupRef.current.traverse((child: any) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = THREE.MathUtils.lerp(child.material.opacity || 1, 0.3, 0.1);
          }
        });
      } else {
        groupRef.current.traverse((child: any) => {
          if (child.isMesh && child.material && child.material.transparent) {
            child.material.opacity = THREE.MathUtils.lerp(child.material.opacity, 1, 0.1);
            if (child.material.opacity > 0.95) {
              child.material.transparent = false;
              child.material.opacity = 1;
            }
          }
        });
      }
    }
  });

  // Tree height 4-7m realistic for city
  const height = (4 + Math.random() * 3) * scale;
  const trunkHeight = height * 0.6;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Trunk - more realistic */}
      <mesh castShadow position={[0, trunkHeight/2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, trunkHeight, 8]} />
        <primitive object={trunkMat} attach="material" />
      </mesh>
      
      {/* Foliage - multiple clusters for natural look, not one huge sphere */}
      <group position={[0, trunkHeight, 0]}>
        {/* Main crown */}
        <mesh castShadow position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.9, 10, 8]} />
          <primitive object={foliageMats[variant % 3]} attach="material" />
        </mesh>
        {/* Secondary clusters */}
        <mesh castShadow position={[0.5, 0.5, 0.2]}>
          <sphereGeometry args={[0.6, 8, 6]} />
          <primitive object={foliageMats[(variant+1) % 3]} attach="material" />
        </mesh>
        <mesh castShadow position={[-0.4, 0.6, -0.3]}>
          <sphereGeometry args={[0.55, 8, 6]} />
          <primitive object={foliageMats[(variant+2) % 3]} attach="material" />
        </mesh>
        <mesh castShadow position={[0.2, 1.1, -0.2]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <primitive object={foliageMats[variant % 3]} attach="material" />
        </mesh>
        <mesh castShadow position={[-0.3, 0.3, 0.4]}>
          <sphereGeometry args={[0.45, 8, 6]} />
          <primitive object={foliageMats[(variant+1) % 3]} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

export function CityDetails() {
  const treePositions = useMemo(() => {
    const pos: { pos: [number, number, number], scale: number, variant: number }[] = [];
    // Place trees more deliberately, not random everywhere
    const areas = [
      // Park area
      { x: -20, z: 80, count: 8, spread: 20 },
      // Sidewalks
      { x: 0, z: 0, count: 6, spread: 80 },
      { x: -80, z: -40, count: 4, spread: 15 },
      { x: 70, z: 30, count: 4, spread: 15 },
      // Outskirts
      { x: 100, z: -60, count: 3, spread: 20 },
      { x: -100, z: 60, count: 3, spread: 20 },
    ];
    
    areas.forEach(area => {
      for (let i = 0; i < area.count; i++) {
        // Avoid roads: check if near road center
        let x, z;
        let attempts = 0;
        do {
          x = area.x + (Math.random() - 0.5) * area.spread;
          z = area.z + (Math.random() - 0.5) * area.spread;
          attempts++;
        } while (
          attempts < 10 && 
          (
            (Math.abs(x) < 7 && Math.abs(z) < 150) || // vertical roads
            (Math.abs(z) < 7 && Math.abs(x) < 150) ||
            (Math.abs(z - 60) < 6) ||
            (Math.abs(z + 50) < 5) ||
            (Math.abs(x - 60) < 6) ||
            (Math.abs(x + 70) < 6)
          )
        );
        
        pos.push({
          pos: [x, 0, z],
          scale: 0.8 + Math.random() * 0.5,
          variant: Math.floor(Math.random() * 3),
        });
      }
    });
    
    return pos;
  }, []);

  const lampPositions = useMemo(() => {
    const pos: [number, number][] = [];
    // Along main roads, but offset from road center
    for (let x = -130; x <= 130; x += 25) {
      if (Math.abs(x) < 10) continue; // avoid intersection
      if (Math.abs(x - 60) < 10) continue;
      if (Math.abs(x + 70) < 10) continue;
      pos.push([x, 8.5]);
      pos.push([x, -8.5]);
    }
    for (let z = -130; z <= 130; z += 25) {
      if (Math.abs(z) < 10) continue;
      if (Math.abs(z - 60) < 10) continue;
      if (Math.abs(z + 50) < 10) continue;
      pos.push([8.5, z]);
      pos.push([-8.5, z]);
    }
    return pos;
  }, []);

  return (
    <group>
      {/* Improved Trees */}
      {treePositions.map((t, i) => (
        <Tree key={`tree-${i}`} position={t.pos} scale={t.scale} variant={t.variant} />
      ))}

      {/* Street lamps - correct scale 5-8m */}
      {lampPositions.slice(0, 24).map((p, i) => (
        <group key={`lamp-${i}`} position={[p[0], 0, p[1]]}>
          <mesh castShadow position={[0, 3, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 6, 8]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Lamp arm */}
          <mesh castShadow position={[0.3, 5.8, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.6, 5.8, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.4} />
          </mesh>
          <pointLight position={[0.6, 5.8, 0]} intensity={3} distance={18} color="#ffcc88" decay={2} />
        </group>
      ))}

      {/* Benches - correct scale 0.45m height */}
      {[
        [-10, 75],
        [10, 75],
        [50, 30],
        [-40, -30],
        [15, -55],
      ].map((p, i) => (
        <group key={`bench-${i}`} position={[p[0], 0, p[1]]} rotation={[0, Math.random()*Math.PI, 0]}>
          {/* Legs */}
          <mesh castShadow position={[-0.7, 0.22, 0]}>
            <boxGeometry args={[0.08, 0.45, 0.4]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0.7, 0.22, 0]}>
            <boxGeometry args={[0.08, 0.45, 0.4]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Seat - 0.45m height */}
          <mesh castShadow position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.08, 0.5]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.7, -0.15]}>
            <boxGeometry args={[1.8, 0.4, 0.08]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Trash bins */}
      {[
        [44, -30],
        [71, -10],
        [-48, 65],
        [88, 55],
      ].map((p, i) => (
        <group key={`trash-${i}`} position={[p[0], 0, p[1]]}>
          <mesh castShadow position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 1, 12]} />
            <meshStandardMaterial color="#2a5a2a" roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.08, 12]} />
            <meshStandardMaterial color="#1a3a1a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Trash containers */}
      <group position={[-95, 0, 50]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[2, 1.2, 1]} />
          <meshStandardMaterial color="#2a4a2a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 1.3, 0]}>
          <boxGeometry args={[2.1, 0.1, 1.1]} />
          <meshStandardMaterial color="#1a2a1a" roughness={0.9} />
        </mesh>
      </group>

      {/* Hydrants - correct scale ~0.6m */}
      {[
        [5, 5],
        [55, 5],
        [-65, 5],
      ].map((p, i) => (
        <group key={`hydrant-${i}`} position={[p[0], 0, p[1]]}>
          <mesh castShadow position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
            <meshStandardMaterial color="#cc2222" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#aa1111" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Bus stop - better */}
      <group position={[20, 0, 58]}>
        <mesh castShadow position={[-1, 1.2, 0]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} />
        </mesh>
        <mesh castShadow position={[1, 1.2, 0]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 2.4, 0]}>
          <boxGeometry args={[2.2, 0.08, 1.2]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 1.2, -0.5]}>
          <boxGeometry args={[2, 1.5, 0.05]} />
          <meshStandardMaterial color="#6a8a9a" transparent opacity={0.4} roughness={0.2} metalness={0.8} />
        </mesh>
      </group>

      {/* Billboard */}
      <group position={[120, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
        <mesh castShadow position={[0, 3.5, 0]}>
          <boxGeometry args={[0.15, 7, 0.15]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 6, 0.4]}>
          <boxGeometry args={[6, 3, 0.15]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
        <mesh position={[0, 6, 0.5]}>
          <planeGeometry args={[5.5, 2.5]} />
          <meshStandardMaterial color="#cc4444" emissive="#331111" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* Road signs */}
      {[
        { pos: [2, 0, 10] as [number, number, number], text: 'STOP' },
        { pos: [58, 0, 10] as [number, number, number], text: '→' },
      ].map((s, i) => (
        <group key={`sign-${i}`} position={s.pos}>
          <mesh castShadow position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
          <mesh castShadow position={[0, 2.2, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.05]} />
            <meshStandardMaterial color="#cc2222" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
