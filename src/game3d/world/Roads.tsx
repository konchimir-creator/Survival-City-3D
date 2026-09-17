'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RoadSegment {
  start: [number, number];
  end: [number, number];
  width: number;
}

const ROADS: RoadSegment[] = [
  { start: [-150, 0], end: [150, 0], width: 10 },
  { start: [0, -150], end: [0, 150], width: 10 },
  { start: [-150, 60], end: [150, 60], width: 7 },
  { start: [-150, -50], end: [150, -50], width: 7 },
  { start: [60, -150], end: [60, 150], width: 7 },
  { start: [-70, -150], end: [-70, 150], width: 7 },
];

export function Roads() {
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a3a40',
    roughness: 0.82,
    metalness: 0.06,
  }), []);

  const markingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e8e0b0',
    roughness: 0.75,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }), []);

  const whiteMarkingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.65,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }), []);

  const sidewalkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8e8e8e',
    roughness: 0.88,
    metalness: 0.03,
  }), []);

  const sidewalkDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#7a7a7a',
    roughness: 0.90,
    metalness: 0.02,
  }), []);

  const curbMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#6e6e6e',
    roughness: 0.88,
    metalness: 0.05,
  }), []);

  const asphaltPatchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e1e22',
    roughness: 0.92,
    transparent: true,
    opacity: 0.45,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), []);

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
            {/* Asphalt base */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, road.width]} />
              <primitive object={roadMaterial} attach="material" />
            </mesh>
            
            {/* Asphalt variation */}
            {Array.from({ length: 3 }).map((_, pIdx) => (
              <mesh 
                key={`patch-${idx}-${pIdx}`}
                position={[(Math.random() - 0.5) * length * 0.8, 0.006, (Math.random() - 0.5) * road.width * 0.6]}
                rotation={[-Math.PI / 2, 0, Math.random() * 0.5]}
                receiveShadow
              >
                <planeGeometry args={[3 + Math.random() * 5, 1 + Math.random() * 2]} />
                <primitive object={asphaltPatchMat} attach="material" />
              </mesh>
            ))}
            
            {/* Sidewalks - 3m wide, 0.15m curb, avoid z-fighting with road: Y 0.10 */}
            <group position={[0, 0.10, road.width / 2 + 1.5]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[length, 3]} />
                <primitive object={idx % 2 === 0 ? sidewalkMaterial : sidewalkDark} attach="material" />
              </mesh>
              <mesh receiveShadow position={[0, 0.07, -1.5]}>
                <boxGeometry args={[length, 0.18, 0.25]} />
                <primitive object={curbMaterial} attach="material" />
              </mesh>
            </group>
            <group position={[0, 0.10, -road.width / 2 - 1.5]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[length, 3]} />
                <primitive object={idx % 2 === 0 ? sidewalkDark : sidewalkMaterial} attach="material" />
              </mesh>
              <mesh receiveShadow position={[0, 0.07, 1.5]}>
                <boxGeometry args={[length, 0.18, 0.25]} />
                <primitive object={curbMaterial} attach="material" />
              </mesh>
            </group>

            {/* Center line dashed */}
            {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
              <mesh
                key={`mark-${idx}-${i}`}
                position={[-length / 2 + i * 3 + 1, 0.04, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
              >
                <planeGeometry args={[1.6, 0.12]} />
                <primitive object={markingMaterial} attach="material" />
              </mesh>
            ))}

            {/* Side lines */}
            <mesh position={[0, 0.04, road.width / 2 - 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.12]} />
              <primitive object={whiteMarkingMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.04, -road.width / 2 + 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.12]} />
              <primitive object={whiteMarkingMat} attach="material" />
            </mesh>

            {/* Parking lines */}
            {idx % 2 === 0 && Array.from({ length: Math.floor(length / 8) }).map((_, i) => (
              <mesh
                key={`park-${idx}-${i}`}
                position={[-length/2 + i*8 + 2, 0.04, road.width/2 - 1.2]}
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

      {/* Intersections */}
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
        <group key={`inter-${idx}`} position={[x, 0.03, z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[12, 12]} />
            <primitive object={roadMaterial} attach="material" />
          </mesh>
          {[0, 90, 180, 270].map((rot, rIdx) => (
            <group key={`cross-${idx}-${rIdx}`} rotation={[0, (rot * Math.PI) / 180, 0]}>
              <group position={[0, 0.03, 6.5]}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <mesh key={`zebra-${i}`} position={[i * 0.9 - 2.7, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.35, 2.8]} />
                    <meshStandardMaterial color="#f0f0f0" roughness={0.8} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
                  </mesh>
                ))}
              </group>
              <mesh position={[0, 0.03, 5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[10, 0.3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.8} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Manholes */}
      {Array.from({ length: 15 }).map((_, i) => {
        const roadIdx = i % ROADS.length;
        const road = ROADS[roadIdx];
        const t = Math.random();
        const x = road.start[0] + (road.end[0] - road.start[0]) * t + (Math.random() - 0.5) * 2;
        const z = road.start[1] + (road.end[1] - road.start[1]) * t + (Math.random() - 0.5) * 2;
        
        return (
          <group key={`manhole-${i}`} position={[x, 0.045, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[0.45, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.6} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
              <ringGeometry args={[0.25, 0.4, 16]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.5} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
