'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS } from '@/game/world/types';

function Tree({ position, height, variant = 0, canopyScale = 1 }: { position: [number, number, number], height: number, variant?: number, canopyScale?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: variant === 0 ? '#4a3a2a' : variant === 1 ? '#3d2f1f' : variant === 2 ? '#5a4a3a' : '#3a2a1a',
    roughness: 0.92 
  }), [variant]);
  
  const foliageMats = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#2d5a27', roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: '#3a6b2f', roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: '#2a4a2a', roughness: 0.87 }),
    new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: 0.84 }),
    new THREE.MeshStandardMaterial({ color: '#354a2a', roughness: 0.89 }),
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

  const trunkHeight = height * 0.58;
  const trunkRadiusBottom = 0.14 + variant * 0.02 + canopyScale * 0.03;
  const trunkRadiusTop = trunkRadiusBottom * 0.7;

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow position={[0, trunkHeight/2, 0]}>
        <cylinderGeometry args={[trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8]} />
        <primitive object={trunkMat} attach="material" />
      </mesh>
      
      <group position={[0, trunkHeight, 0]}>
        <mesh castShadow position={[0, 0.9 * canopyScale, 0]}>
          <sphereGeometry args={[0.9 * canopyScale, 10, 8]} />
          <primitive object={foliageMats[variant % 5]} attach="material" />
        </mesh>
        <mesh castShadow position={[0.5 * canopyScale, 0.5 * canopyScale, 0.2 * canopyScale]}>
          <sphereGeometry args={[0.62 * canopyScale, 8, 6]} />
          <primitive object={foliageMats[(variant+1) % 5]} attach="material" />
        </mesh>
        <mesh castShadow position={[-0.45 * canopyScale, 0.6 * canopyScale, -0.25 * canopyScale]}>
          <sphereGeometry args={[0.58 * canopyScale, 8, 6]} />
          <primitive object={foliageMats[(variant+2) % 5]} attach="material" />
        </mesh>
        <mesh castShadow position={[0.2 * canopyScale, 1.15 * canopyScale, -0.15 * canopyScale]}>
          <sphereGeometry args={[0.52 * canopyScale, 8, 6]} />
          <primitive object={foliageMats[(variant+3) % 5]} attach="material" />
        </mesh>
        <mesh castShadow position={[-0.3 * canopyScale, 0.35 * canopyScale, 0.4 * canopyScale]}>
          <sphereGeometry args={[0.46 * canopyScale, 8, 6]} />
          <primitive object={foliageMats[(variant+1) % 5]} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function BusStop({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) {
  const isNight = (typeof window !== 'undefined' ? (window as any).__isNight : false);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.04, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[5, 2.4]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh castShadow position={[-1.9, 1.3, -0.7]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[1.9, 1.3, -0.7]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[-1.9, 1.3, 0.7]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[1.9, 1.3, 0.7]}>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Roof 2.4-2.7m high, here 2.65m */}
      <mesh castShadow position={[0, 2.65, 0]}>
        <boxGeometry args={[4.4, 0.12, 2.2]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.68} metalness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 2.53, 1.05]}>
        <boxGeometry args={[4.4, 0.08, 0.06]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh castShadow position={[0, 2.53, -1.05]}>
        <boxGeometry args={[4.4, 0.08, 0.06]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh castShadow position={[0, 1.3, -1.05]}>
        <boxGeometry args={[3.8, 1.7, 0.05]} />
        <meshStandardMaterial color="#6a8a9a" transparent opacity={0.32} roughness={0.12} metalness={0.75} />
      </mesh>
      <mesh castShadow position={[-2.05, 1.3, 0]}>
        <boxGeometry args={[0.05, 1.7, 1.8]} />
        <meshStandardMaterial color="#6a8a9a" transparent opacity={0.24} roughness={0.12} metalness={0.75} />
      </mesh>
      <group position={[0, 0, -0.25]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[2.4, 0.06, 0.48]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.84} />
        </mesh>
        <mesh castShadow position={[0, 0.68, -0.20]}>
          <boxGeometry args={[2.4, 0.38, 0.06]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.84} />
        </mesh>
        <mesh castShadow position={[-1.0, 0.22, 0]}><boxGeometry args={[0.06, 0.45, 0.42]} /><meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} /></mesh>
        <mesh castShadow position={[1.0, 0.22, 0]}><boxGeometry args={[0.06, 0.45, 0.42]} /><meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} /></mesh>
      </group>
      <group position={[2.3, 0, 0.9]}>
        <mesh castShadow position={[0, 1.2, 0]}><cylinderGeometry args={[0.045, 0.045, 2.5, 8]} /><meshStandardMaterial color="#4a4a4a" metalness={0.6} /></mesh>
        <mesh castShadow position={[0, 2.4, 0]}><boxGeometry args={[0.65, 0.65, 0.06]} /><meshStandardMaterial color="#0066CC" roughness={0.55} /></mesh>
        <mesh position={[0, 2.4, 0.04]}><planeGeometry args={[0.45, 0.22]} /><meshStandardMaterial color="white" emissive={isNight ? "#ffffff" : "#000000"} emissiveIntensity={isNight ? 0.32 : 0} /></mesh>
      </group>
      <mesh position={[1.2, 1.25, -1.02]} castShadow><planeGeometry args={[0.6, 0.8]} /><meshStandardMaterial color="#f5f5f5" roughness={0.8} /></mesh>
    </group>
  );
}

function Lamp({ position, height = 6 }: { position: [number, number], height?: number }) {
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
      const near = dist < 55;
      if (pointLightRef.current) {
        const active = isNight && near;
        pointLightRef.current.intensity = active ? 8 : 0;
        pointLightRef.current.distance = active ? 28 : 0;
        if (active) {
          (window as any).__activeLights = ((window as any).__activeLights || 0) + 1;
        }
      }
      if (emissiveRef.current) {
        emissiveRef.current.emissiveIntensity = isNight ? 0.90 : 0.12;
      }
    } catch {}
  });

  return (
    <group ref={groupRef as any} position={[position[0], 0, position[1]]}>
      <mesh castShadow position={[0, height/2, 0]}>
        <cylinderGeometry args={[0.06, 0.10, height, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0.4, height - 0.2, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.032, 0.032, 1.0, 6]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0.85, height - 0.2, 0]}>
        <sphereGeometry args={[0.20, 10, 10]} />
        <meshStandardMaterial ref={emissiveRef as any} color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.15} />
      </mesh>
      <pointLight ref={pointLightRef} position={[0.85, height - 0.2, 0]} intensity={0} distance={20} color="#ffcc88" decay={2} />
    </group>
  );
}

function RoadSign({ position, type = 'stop' }: { position: [number, number, number], type?: 'stop' | 'speed' | 'pedestrian' | 'parking' }) {
  const colors: Record<string, string> = {
    stop: '#cc2222',
    speed: '#ffffff',
    pedestrian: '#0066cc',
    parking: '#0066aa',
  };
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 2.2, 8]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.55} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 2.15, 0]}>
        {type === 'stop' ? <boxGeometry args={[0.55, 0.55, 0.06]} /> : <cylinderGeometry args={[0.32, 0.32, 0.06, 16]} />}
        <meshStandardMaterial color={colors[type]} roughness={0.6} metalness={0.1} />
      </mesh>
      {type === 'speed' && (
        <mesh position={[0, 2.15, 0.04]}><planeGeometry args={[0.3, 0.3]} /><meshStandardMaterial color="#222" /></mesh>
      )}
      {type === 'pedestrian' && (
        <mesh position={[0, 2.15, 0.04]}><planeGeometry args={[0.35, 0.35]} /><meshStandardMaterial color="white" /></mesh>
      )}
    </group>
  );
}

function UtilityBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}><boxGeometry args={[0.6, 1.0, 0.4]} /><meshStandardMaterial color="#5a5a5a" roughness={0.8} metalness={0.2} /></mesh>
      <mesh castShadow position={[0, 1.05, 0]}><boxGeometry args={[0.62, 0.08, 0.42]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
    </group>
  );
}

function Bollard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.35, 0]}><cylinderGeometry args={[0.08, 0.08, 0.7, 8]} /><meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} /></mesh>
      <mesh castShadow position={[0, 0.75, 0]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#ccaa22" roughness={0.5} metalness={0.3} /></mesh>
    </group>
  );
}

export function CityDetails() {
  const settings = useGameStore((s) => s.settings);
  
  const treePositions = useMemo(() => {
    const pos: { pos: [number, number, number], height: number, variant: number, canopyScale: number }[] = [];
    const areas = [
      { x: -20, z: 80, count: 8, spread: 22 },
      { x: -10, z: 15, count: 6, spread: 40 }, // central but avoid spawn
      { x: -80, z: -40, count: 5, spread: 18 },
      { x: 70, z: 30, count: 5, spread: 18 },
      { x: 100, z: -60, count: 4, spread: 22 },
      { x: -100, z: 60, count: 4, spread: 22 },
      { x: 30, z: -20, count: 4, spread: 16 }, // near shop
      { x: -30, z: 60, count: 5, spread: 18 },
    ];
    
    areas.forEach(area => {
      for (let i = 0; i < area.count; i++) {
        let x: number = 0, z: number = 0;
        let attempts = 0;
        let valid = false;
        do {
          x = area.x + (Math.random() - 0.5) * area.spread;
          z = area.z + (Math.random() - 0.5) * area.spread;
          attempts++;
          // Avoid roads
          const onRoad = (Math.abs(x) < 8 && Math.abs(z) < 150) ||
                         (Math.abs(z) < 8 && Math.abs(x) < 150) ||
                         (Math.abs(z - 60) < 7) ||
                         (Math.abs(z + 50) < 6) ||
                         (Math.abs(x - 60) < 7) ||
                         (Math.abs(x + 70) < 7);
          if (onRoad) continue;
          // Avoid buildings and entrances
          const nearBuilding = BUILDINGS.some(b => {
            const dx = x - b.position[0];
            const dz = z - b.position[2];
            const dist = Math.sqrt(dx*dx + dz*dz);
            // Keep 4m away from building center, 6m from entrance (front +Z)
            const entranceX = b.position[0];
            const entranceZ = b.position[2] + b.size[2]/2 + 1;
            const dEntrance = Math.sqrt((x-entranceX)*(x-entranceX) + (z-entranceZ)*(z-entranceZ));
            return dist < 6 || dEntrance < 5;
          });
          if (nearBuilding) continue;
          // Avoid spawn
          if (Math.abs(x-15)<6 && Math.abs(z-15)<6) continue;
          valid = true;
        } while (!valid && attempts < 20);
        
        if (valid) {
          pos.push({
            pos: [x!, 0, z!],
            height: 4 + Math.random() * 4, // 4-8m
            variant: Math.floor(Math.random() * 4),
            canopyScale: 0.85 + Math.random() * 0.45, // 0.85-1.3
          });
        }
      }
    });
    
    return pos;
  }, []);

  const lampPositions = useMemo(() => {
    const pos: { p: [number, number], h: number }[] = [];
    // Along roads, realistic spacing ~20-25m, height 5-8m
    for (let x = -130; x <= 130; x += 22) {
      if (Math.abs(x) < 10) continue;
      if (Math.abs(x - 60) < 10) continue;
      if (Math.abs(x + 70) < 10) continue;
      pos.push({ p: [x, 9.2], h: 5.5 + Math.random()*1.5 });
      pos.push({ p: [x, -9.2], h: 5.5 + Math.random()*1.5 });
    }
    for (let z = -130; z <= 130; z += 22) {
      if (Math.abs(z) < 10) continue;
      if (Math.abs(z - 60) < 10) continue;
      if (Math.abs(z + 50) < 10) continue;
      pos.push({ p: [9.2, z], h: 5.8 + Math.random()*1.2 });
      pos.push({ p: [-9.2, z], h: 5.8 + Math.random()*1.2 });
    }
    // Central zone extra lamps
    pos.push({ p: [-25, 20], h: 6 });
    pos.push({ p: [-45, 0], h: 6.2 });
    pos.push({ p: [25, 10], h: 5.8 });
    return pos;
  }, []);

  const isMobile = settings.graphics === 'low';
  const lampCount = isMobile ? 10 : 28;

  return (
    <group>
      {treePositions.map((t, i) => (
        <Tree key={`tree-${i}`} position={t.pos} height={t.height} variant={t.variant} canopyScale={t.canopyScale} />
      ))}

      {lampPositions.slice(0, lampCount).map((l, i) => (
        <Lamp key={`lamp-${i}`} position={l.p} height={l.h} />
      ))}

      {/* Benches - central zone, not blocking doors */}
      {[
        [-10, 75],
        [10, 75],
        [50, 30],
        [-40, -30],
        [15, -55],
        [-20, 20],
        [0, 40],
      ].map((p, i) => (
        <group key={`bench-${i}`} position={[p[0], 0.02, p[1]]} rotation={[0, (Math.random()-0.5)*0.6, 0]}>
          <mesh castShadow position={[-0.7, 0.22, 0]}><boxGeometry args={[0.08, 0.45, 0.4]} /><meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} /></mesh>
          <mesh castShadow position={[0.7, 0.22, 0]}><boxGeometry args={[0.08, 0.45, 0.4]} /><meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.5} /></mesh>
          <mesh castShadow position={[0, 0.45, 0]}><boxGeometry args={[1.8, 0.08, 0.5]} /><meshStandardMaterial color="#5a3a1a" roughness={0.85} /></mesh>
          <mesh castShadow position={[0, 0.7, -0.15]}><boxGeometry args={[1.8, 0.4, 0.08]} /><meshStandardMaterial color="#5a3a1a" roughness={0.85} /></mesh>
        </group>
      ))}

      {/* Trash bins */}
      {[
        [44, -30],
        [71, -10],
        [-48, 65],
        [88, 55],
        [-25, 5],
        [35, 15],
      ].map((p, i) => (
        <group key={`trash-${i}`} position={[p[0], 0.02, p[1]]}>
          <mesh castShadow position={[0, 0.5, 0]}><cylinderGeometry args={[0.35, 0.35, 1, 12]} /><meshStandardMaterial color="#2a5a2a" roughness={0.85} /></mesh>
          <mesh castShadow position={[0, 1.05, 0]}><cylinderGeometry args={[0.38, 0.38, 0.08, 12]} /><meshStandardMaterial color="#1a3a1a" roughness={0.8} /></mesh>
        </group>
      ))}

      {/* Utility boxes */}
      {[
        [62, 8],
        [-72, -8],
        [8, 62],
        [-8, -52],
        [-30, 0],
      ].map((p, i) => (
        <UtilityBox key={`util-${i}`} position={[p[0], 0.02, p[1]]} />
      ))}

      {/* Bollards - only where logical, not blocking doors */}
      {[
        [2, 12],
        [58, 12],
        [-68, 12],
        [12, 62],
        [12, -48],
      ].map((p, i) => (
        <Bollard key={`bollard-${i}`} position={[p[0], 0.02, p[1]]} />
      ))}

      {/* Newspaper kiosk */}
      <group position={[-95, 0.02, 50]}>
        <mesh castShadow position={[0, 0.6, 0]}><boxGeometry args={[2, 1.2, 1]} /><meshStandardMaterial color="#2a4a2a" roughness={0.9} /></mesh>
        <mesh castShadow position={[0, 1.3, 0]}><boxGeometry args={[2.1, 0.1, 1.1]} /><meshStandardMaterial color="#1a2a1a" roughness={0.9} /></mesh>
      </group>

      {/* Hydrants */}
      {[
        [5, 5],
        [55, 5],
        [-65, 5],
      ].map((p, i) => (
        <group key={`hydrant-${i}`} position={[p[0], 0.02, p[1]]}>
          <mesh castShadow position={[0, 0.3, 0]}><cylinderGeometry args={[0.12, 0.12, 0.6, 8]} /><meshStandardMaterial color="#cc2222" roughness={0.6} metalness={0.2} /></mesh>
          <mesh castShadow position={[0, 0.6, 0]}><sphereGeometry args={[0.15, 8, 8]} /><meshStandardMaterial color="#aa1111" roughness={0.6} /></mesh>
        </group>
      ))}

      {/* Bus stops - on sidewalk, not in road lane */}
      <BusStop position={[20, 0.02, 65]} rotation={0} />
      <BusStop position={[-20, 0.02, -45]} rotation={0} />
      <BusStop position={[65, 0.02, 15]} rotation={Math.PI/2} />
      <BusStop position={[-65, 0.02, -15]} rotation={Math.PI/2} />
      <BusStop position={[6.5, 0.02, 30]} rotation={Math.PI/2} />
      <BusStop position={[-6.5, 0.02, -30]} rotation={Math.PI/2} />

      {/* Billboard */}
      <group position={[120, 0.02, 0]} rotation={[0, -Math.PI/2, 0]}>
        <mesh castShadow position={[0, 3.5, 0]}><boxGeometry args={[0.15, 7, 0.15]} /><meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} /></mesh>
        <mesh castShadow position={[0, 6, 0.4]}><boxGeometry args={[6, 3, 0.15]} /><meshStandardMaterial color="#222" roughness={0.9} /></mesh>
        <mesh position={[0, 6, 0.5]}><planeGeometry args={[5.5, 2.5]} /><meshStandardMaterial color="#cc4444" emissive="#331111" emissiveIntensity={0.2} polygonOffset polygonOffsetFactor={-1} /></mesh>
      </group>

      {/* Road signs - improved, pole correct scale, not in road */}
      <RoadSign position={[3, 0.02, 12]} type="stop" />
      <RoadSign position={[57, 0.02, 12]} type="speed" />
      <RoadSign position={[12, 0.02, 3]} type="pedestrian" />
      <RoadSign position={[-67, 0.02, 10]} type="parking" />
      <RoadSign position={[10, 0.02, 62]} type="stop" />
      <RoadSign position={[10, 0.02, -48]} type="speed" />
      <RoadSign position={[-25, 0.02, 62]} type="pedestrian" />
      <RoadSign position={[62, 0.02, -25]} type="parking" />
    </group>
  );
}
