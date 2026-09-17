'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RoadSegment {
  start: [number, number];
  end: [number, number];
  width: number; // 3-3.5m per lane, we have 2 lanes = 7m, plus sidewalk
}

const ROADS: RoadSegment[] = [
  // Main roads - 12m = 2 lanes each side? Actually 2 lanes total 7m + parking, but we use 10-12 for gameplay
  { start: [-150, 0], end: [150, 0], width: 10 }, // main horizontal - 3 lanes approx
  { start: [0, -150], end: [0, 150], width: 10 }, // main vertical
  // Secondary - 7m = 2 lanes
  { start: [-150, 60], end: [150, 60], width: 7 },
  { start: [-150, -50], end: [150, -50], width: 7 },
  { start: [60, -150], end: [60, 150], width: 7 },
  { start: [-70, -150], end: [-70, 150], width: 7 },
];

export function Roads() {
  const roadMaterial = useMemo(() => {
    // More realistic asphalt with slight variation
    return new THREE.MeshStandardMaterial({
      color: '#2a2a2e',
      roughness: 0.85,
      metalness: 0.05,
    });
  }, []);

  const roadMaterialWet = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#1a1a20',
      roughness: 0.35,
      metalness: 0.2,
    });
  }, []);

  const markingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e8e0b0',
      roughness: 0.9,
      metalness: 0,
    });
  }, []);

  const whiteMarkingMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#f0f0f0',
      roughness: 0.8,
    });
  }, []);

  const sidewalkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#8a8a8a',
      roughness: 0.9,
      metalness: 0.05,
    });
  }, []);

  const curbMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#6a6a6a',
      roughness: 0.9,
    });
  }, []);

  return (
    <group>
      {ROADS.map((road, idx) => {
        const dx = road.end[0] - road.start[0];
        const dz = road.end[1] - road.start[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const centerX = (road.start[0] + road.end[0]) / 2;
        const centerZ = (road.start[1] + road.end[1]) / 2;

        return (
          <group key={`road-${idx}`} position={[centerX, 0.02, centerZ]} rotation={[0, -angle, 0]}>
            {/* Asphalt base - slightly raised */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, road.width]} />
              <primitive object={roadMaterial} attach="material" />
            </mesh>
            
            {/* Asphalt variation - darker patches for realism */}
            {Array.from({ length: 3 }).map((_, pIdx) => (
              <mesh 
                key={`patch-${idx}-${pIdx}`}
                position={[(Math.random() - 0.5) * length * 0.8, 0.005, (Math.random() - 0.5) * road.width * 0.6]}
                rotation={[-Math.PI / 2, 0, Math.random() * 0.5]}
                receiveShadow
              >
                <planeGeometry args={[3 + Math.random() * 5, 1 + Math.random() * 2]} />
                <meshStandardMaterial color="#1e1e22" roughness={0.9} transparent opacity={0.5} />
              </mesh>
            ))}
            
            {/* Sidewalks - 2-4m wide, 0.15m high curb */}
            <group position={[0, 0.08, road.width / 2 + 1.5]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[length, 3]} />
                <primitive object={sidewalkMaterial} attach="material" />
              </mesh>
              {/* Curb */}
              <mesh receiveShadow position={[0, 0.06, -1.5]}>
                <boxGeometry args={[length, 0.18, 0.25]} />
                <primitive object={curbMaterial} attach="material" />
              </mesh>
            </group>
            <group position={[0, 0.08, -road.width / 2 - 1.5]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[length, 3]} />
                <primitive object={sidewalkMaterial} attach="material" />
              </mesh>
              <mesh receiveShadow position={[0, 0.06, 1.5]}>
                <boxGeometry args={[length, 0.18, 0.25]} />
                <primitive object={curbMaterial} attach="material" />
              </mesh>
            </group>

            {/* Center line - dashed yellow */}
            {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
              <mesh
                key={`mark-${idx}-${i}`}
                position={[-length / 2 + i * 3 + 1, 0.03, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
              >
                <planeGeometry args={[1.6, 0.12]} />
                <primitive object={markingMaterial} attach="material" />
              </mesh>
            ))}

            {/* Side lines - solid white */}
            <mesh position={[0, 0.03, road.width / 2 - 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.12]} />
              <primitive object={whiteMarkingMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.03, -road.width / 2 + 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.12]} />
              <primitive object={whiteMarkingMat} attach="material" />
            </mesh>

            {/* Parking lines - occasional */}
            {idx % 2 === 0 && Array.from({ length: Math.floor(length / 8) }).map((_, i) => (
              <mesh
                key={`park-${idx}-${i}`}
                position={[-length/2 + i*8 + 2, 0.03, road.width/2 - 1.2]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
              >
                <planeGeometry args={[0.08, 2]} />
                <primitive object={whiteMarkingMat} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Intersections - better */}
      {[
        [0, 0],
        [0, 60],
        [0, -50],
        [60, 0],
        [60, 60],
        [60, -50],
        [-70, 0],
        [-70, 60],
        [-70, -50],
      ].map(([x, z], idx) => (
        <group key={`inter-${idx}`} position={[x, 0.025, z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 12]} />
            <primitive object={roadMaterial} attach="material" />
          </mesh>
          {/* Crosswalks - zebra */}
          {[0, 90, 180, 270].map((rot, rIdx) => (
            <group key={`cross-${idx}-${rIdx}`} rotation={[0, (rot * Math.PI) / 180, 0]}>
              <group position={[0, 0.02, 6.5]}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <mesh key={`zebra-${i}`} position={[i * 0.9 - 2.7, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.35, 2.8]} />
                    <meshStandardMaterial color="#f0f0f0" roughness={0.8} />
                  </mesh>
                ))}
              </group>
              {/* Stop line */}
              <mesh position={[0, 0.02, 5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[10, 0.3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Manholes - realistic */}
      {Array.from({ length: 15 }).map((_, i) => {
        // Place on roads more accurately
        const roadIdx = i % ROADS.length;
        const road = ROADS[roadIdx];
        const t = Math.random();
        const x = road.start[0] + (road.end[0] - road.start[0]) * t + (Math.random() - 0.5) * 2;
        const z = road.start[1] + (road.end[1] - road.start[1]) * t + (Math.random() - 0.5) * 2;
        
        return (
          <group key={`manhole-${i}`} position={[x, 0.04, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[0.45, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.6} />
            </mesh>
            {/* Manhole detail */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
              <ringGeometry args={[0.25, 0.4, 16]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Drainage grates */}
      {Array.from({ length: 10 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        // Snap to curb
        const nearCurb = Math.abs(x) % 20 < 2 || Math.abs(z) % 20 < 2;
        if (!nearCurb) return null;
        return (
          <mesh key={`drain-${i}`} position={[x, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.6, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
