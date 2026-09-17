'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';

interface RoadSegment {
  start: [number, number];
  end: [number, number];
  width: number;
}

const ROADS: RoadSegment[] = [
  // Main horizontal road
  { start: [-150, 0], end: [150, 0], width: 12 },
  // Main vertical road
  { start: [0, -150], end: [0, 150], width: 12 },
  // Secondary roads
  { start: [-150, 60], end: [150, 60], width: 8 },
  { start: [-150, -50], end: [150, -50], width: 8 },
  { start: [60, -150], end: [60, 150], width: 8 },
  { start: [-70, -150], end: [-70, 150], width: 8 },
];

export function Roads() {
  const roadMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a2a2a',
      roughness: 0.8,
      metalness: 0.1,
    });
  }, []);

  const markingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e0d8c0',
      roughness: 0.9,
      emissive: '#222222',
      emissiveIntensity: 0.1,
    });
  }, []);

  const sidewalkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#8e8e8e',
      roughness: 0.85,
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
          <group key={`road-${idx}`} position={[centerX, 0.11, centerZ]} rotation={[0, -angle, 0]}>
            {/* Asphalt */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, road.width]} />
              <primitive object={roadMaterial} attach="material" />
            </mesh>
            
            {/* Sidewalk borders - curbs */}
            <mesh receiveShadow position={[0, 0.15, road.width / 2 + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, 1.5]} />
              <primitive object={sidewalkMaterial} attach="material" />
            </mesh>
            <mesh receiveShadow position={[0, 0.15, -road.width / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, 1.5]} />
              <primitive object={sidewalkMaterial} attach="material" />
            </mesh>

            {/* Center line - dashed */}
            {Array.from({ length: Math.floor(length / 4) }).map((_, i) => (
              <mesh
                key={`mark-${idx}-${i}`}
                position={[-length / 2 + i * 4 + 1, 0.12, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
              >
                <planeGeometry args={[2, 0.15]} />
                <primitive object={markingMaterial} attach="material" />
              </mesh>
            ))}

            {/* Side lines */}
            <mesh position={[0, 0.12, road.width / 2 - 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.15]} />
              <meshStandardMaterial color="#ffffff" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.12, -road.width / 2 + 0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[length, 0.15]} />
              <meshStandardMaterial color="#ffffff" roughness={0.8} />
            </mesh>
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
        <group key={`inter-${idx}`} position={[x, 0.11, z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, 14]} />
            <primitive object={roadMaterial} attach="material" />
          </mesh>
          {/* Crosswalks */}
          {[0, 90, 180, 270].map((rot, rIdx) => (
            <group key={`cross-${idx}-${rIdx}`} rotation={[0, (rot * Math.PI) / 180, 0]}>
              <group position={[0, 0.01, 6]}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <mesh key={`zebra-${i}`} position={[i * 1 - 2.5, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.4, 3]} />
                    <meshStandardMaterial color="#ffffff" />
                  </mesh>
                ))}
              </group>
            </group>
          ))}
        </group>
      ))}

      {/* Manholes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        // Snap to road
        const onRoad = ROADS.some((r) => {
          // simple check
          return Math.abs(x - (r.start[0] + r.end[0]) / 2) < 100 && Math.abs(z - (r.start[1] + r.end[1]) / 2) < 100;
        });
        return (
          <mesh key={`manhole-${i}`} position={[x, 0.13, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.4, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
