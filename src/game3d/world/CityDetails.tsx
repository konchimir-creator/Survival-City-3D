'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

function Tree({ position, height, variant = 0 }: { position: [number, number, number], height: number, variant?: number }) {
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

  useFrame(() => {
    try {
      if (!groupRef.current) return;
      const nearObstacle = (window as any).__cameraNearObstacle;
      const camPos = (window as any).__cameraPosition as THREE.Vector3;
      if (camPos && groupRef.current) {
        const dist = groupRef.current.position.distanceTo(camPos);
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
    } catch {}
  });

  // Height 4-7m per task, trunk 60%
  const trunkHeight = height * 0.6;

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow position={[0, trunkHeight/2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, trunkHeight, 8]} />
        <primitive object={trunkMat} attach="material" />
      </mesh>
      
      <group position={[0, trunkHeight, 0]}>
        <mesh castShadow position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.9, 10, 8]} />
          <primitive object={foliageMats[variant % 3]} attach="material" />
        </mesh>
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

function BusStop({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) {
  const isNight = (typeof window !== 'undefined' ? (window as any).__isNight : false);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Platform - avoid z-fighting with sidewalk: Y 0.03 above sidewalk 0.08? Actually sidewalk 0.08, so platform 0.09 */}
      <mesh receiveShadow position={[0, 0.04, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[5, 2.2]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
      </mesh>

      {/* Poles - realistic 2.5m high, 0.08m thick */}
      <mesh castShadow position={[-1.8, 1.25, -0.6]}>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[1.8, 1.25, -0.6]}>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[-1.8, 1.25, 0.6]}>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[1.8, 1.25, 0.6]}>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Roof - 4m x 1.8m, 2.5m high */}
      <mesh castShadow position={[0, 2.55, 0]}>
        <boxGeometry args={[4.2, 0.1, 2]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Roof edge */}
      <mesh castShadow position={[0, 2.45, 0.95]}>
        <boxGeometry args={[4.2, 0.08, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh castShadow position={[0, 2.45, -0.95]}>
        <boxGeometry args={[4.2, 0.08, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Back glass panel - avoid z-fighting: offset 0.02 from poles */}
      <mesh castShadow position={[0, 1.25, -0.95]}>
        <boxGeometry args={[3.6, 1.6, 0.04]} />
        <meshStandardMaterial color="#6a8a9a" transparent opacity={0.35} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Side glass */}
      <mesh castShadow position={[-1.95, 1.25, 0]}>
        <boxGeometry args={[0.04, 1.6, 1.6]} />
        <meshStandardMaterial color="#6a8a9a" transparent opacity={0.25} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Bench inside bus stop - realistic 0.45m high */}
      <group position={[0, 0, -0.2]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[2.2, 0.06, 0.45]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.65, -0.18]}>
          <boxGeometry args={[2.2, 0.35, 0.06]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[-0.9, 0.22, 0]}>
          <boxGeometry args={[0.06, 0.45, 0.4]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.9, 0.22, 0]}>
          <boxGeometry args={[0.06, 0.45, 0.4]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Bus stop sign */}
      <group position={[2.2, 0, 0.8]}>
        <mesh castShadow position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
          <meshStandardMaterial color="#4a4a4a" metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 2.3, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.05]} />
          <meshStandardMaterial color="#0066CC" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.3, 0.03]}>
          <planeGeometry args={[0.4, 0.2]} />
          <meshStandardMaterial color="white" emissive={isNight ? "#ffffff" : "#000000"} emissiveIntensity={isNight ? 0.3 : 0} />
        </mesh>
      </group>

      {/* Timetable poster */}
      <mesh position={[1.2, 1.2, -0.92]} castShadow>
        <planeGeometry args={[0.6, 0.8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Lamp({ position }: { position: [number, number] }) {
  const pointLightRef = useRef<THREE.PointLight>(null);
  const emissiveRef = useRef<THREE.MeshStandardMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      const camPos = (window as any).__cameraPosition as THREE.Vector3;
      let dist = 0;
      if (camPos && groupRef.current) {
        dist = groupRef.current.position.distanceTo(camPos);
      }
      const near = dist < 50;
      if (pointLightRef.current) {
        const active = isNight && near;
        pointLightRef.current.intensity = active ? 7 : 0;
        pointLightRef.current.distance = active ? 26 : 0;
        if (active) {
          (window as any).__activeLights = ((window as any).__activeLights || 0) + 1;
        }
      }
      if (emissiveRef.current) {
        emissiveRef.current.emissiveIntensity = isNight ? 0.85 : 0.15;
      }
    } catch {}
  });

  return (
    <group ref={groupRef as any} position={[position[0], 0, position[1]]}>
      {/* Pole - 5.5m high realistic */}
      <mesh castShadow position={[0, 2.75, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 5.5, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Arm */}
      <mesh castShadow position={[0.35, 5.3, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0.75, 5.3, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial ref={emissiveRef as any} color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.2} />
      </mesh>
      <pointLight ref={pointLightRef} position={[0.75, 5.3, 0]} intensity={0} distance={18} color="#ffcc88" decay={2} />
    </group>
  );
}

export function CityDetails() {
  const settings = useGameStore((s) => s.settings);
  
  const treePositions = useMemo(() => {
    const pos: { pos: [number, number, number], height: number, variant: number }[] = [];
    const areas = [
      { x: -20, z: 80, count: 8, spread: 20 },
      { x: 0, z: 0, count: 6, spread: 80 },
      { x: -80, z: -40, count: 4, spread: 15 },
      { x: 70, z: 30, count: 4, spread: 15 },
      { x: 100, z: -60, count: 3, spread: 20 },
      { x: -100, z: 60, count: 3, spread: 20 },
    ];
    
    areas.forEach(area => {
      for (let i = 0; i < area.count; i++) {
        let x, z;
        let attempts = 0;
        do {
          x = area.x + (Math.random() - 0.5) * area.spread;
          z = area.z + (Math.random() - 0.5) * area.spread;
          attempts++;
        } while (
          attempts < 10 && 
          (
            (Math.abs(x) < 7 && Math.abs(z) < 150) ||
            (Math.abs(z) < 7 && Math.abs(x) < 150) ||
            (Math.abs(z - 60) < 6) ||
            (Math.abs(z + 50) < 5) ||
            (Math.abs(x - 60) < 6) ||
            (Math.abs(x + 70) < 6)
          )
        );
        
        pos.push({
          pos: [x, 0, z],
          height: 4 + Math.random() * 3, // 4-7m per task
          variant: Math.floor(Math.random() * 3),
        });
      }
    });
    
    return pos;
  }, []);

  const lampPositions = useMemo(() => {
    const pos: [number, number][] = [];
    for (let x = -130; x <= 130; x += 25) {
      if (Math.abs(x) < 10) continue;
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

  const isMobile = settings.graphics === 'low';
  const lampCount = isMobile ? 8 : 20;

  return (
    <group>
      {treePositions.map((t, i) => (
        <Tree key={`tree-${i}`} position={t.pos} height={t.height} variant={t.variant} />
      ))}

      {lampPositions.slice(0, lampCount).map((p, i) => (
        <Lamp key={`lamp-${i}`} position={p} />
      ))}

      {/* Benches - improved materials, avoid z-fighting */}
      {[
        [-10, 75],
        [10, 75],
        [50, 30],
        [-40, -30],
        [15, -55],
      ].map((p, i) => (
        <group key={`bench-${i}`} position={[p[0], 0.02, p[1]]} rotation={[0, Math.random()*Math.PI, 0]}>
          <mesh castShadow position={[-0.7, 0.22, 0]}>
            <boxGeometry args={[0.08, 0.45, 0.4]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0.7, 0.22, 0]}>
            <boxGeometry args={[0.08, 0.45, 0.4]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.08, 0.5]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, 0.7, -0.15]}>
            <boxGeometry args={[1.8, 0.4, 0.08]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
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
        <group key={`trash-${i}`} position={[p[0], 0.02, p[1]]}>
          <mesh castShadow position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 1, 12]} />
            <meshStandardMaterial color="#2a5a2a" roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.08, 12]} />
            <meshStandardMaterial color="#1a3a1a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Newspaper kiosk */}
      <group position={[-95, 0.02, 50]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[2, 1.2, 1]} />
          <meshStandardMaterial color="#2a4a2a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 1.3, 0]}>
          <boxGeometry args={[2.1, 0.1, 1.1]} />
          <meshStandardMaterial color="#1a2a1a" roughness={0.9} />
        </mesh>
      </group>

      {/* Hydrants */}
      {[
        [5, 5],
        [55, 5],
        [-65, 5],
      ].map((p, i) => (
        <group key={`hydrant-${i}`} position={[p[0], 0.02, p[1]]}>
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

      {/* Bus stops - NORMAL per task */}
      <BusStop position={[20, 0.02, 58]} rotation={0} />
      <BusStop position={[-20, 0.02, 8.5]} rotation={Math.PI/2} />
      <BusStop position={[60, 0.02, 15]} rotation={0} />
      <BusStop position={[-70, 0.02, -15]} rotation={Math.PI} />
      <BusStop position={[0, 0.02, 60]} rotation={0} />
      <BusStop position={[0, 0.02, -50]} rotation={Math.PI} />

      {/* Billboard - improved, not ghost */}
      <group position={[120, 0.02, 0]} rotation={[0, -Math.PI/2, 0]}>
        <mesh castShadow position={[0, 3.5, 0]}>
          <boxGeometry args={[0.15, 7, 0.15]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 6, 0.4]}>
          <boxGeometry args={[6, 3, 0.15]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
        <mesh position={[0, 6, 0.5]}>
          <planeGeometry args={[5.5, 2.5]} />
          <meshStandardMaterial color="#cc4444" emissive="#331111" emissiveIntensity={0.2} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      </group>

      {/* Road signs */}
      {[
        { pos: [2, 0, 10] as [number, number, number] },
        { pos: [58, 0, 10] as [number, number, number] },
      ].map((s, i) => (
        <group key={`sign-${i}`} position={[s.pos[0], 0.02, s.pos[2]]}>
          <mesh castShadow position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4, 6]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 2.2, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.05]} />
            <meshStandardMaterial color="#cc2222" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
