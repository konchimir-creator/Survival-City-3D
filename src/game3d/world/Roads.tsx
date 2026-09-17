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

const INTERSECTIONS: [number, number][] = [
  [0, 0],
  [0, 60],
  [0, -50],
  [60, 0],
  [60, 60],
  [60, -50],
  [-70, 0],
  [-70, 60],
  [-70, -50],
];

const INTERSECTION_SIZE = 12;
const INTERSECTION_HALF = INTERSECTION_SIZE / 2;

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
  }), []);

  const whiteMarkingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.65,
    metalness: 0.05,
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
  }), []);

  // Generate road segments split at intersections to avoid overlapping geometry
  const roadSegments = useMemo(() => {
    const segments: { start: [number, number], end: [number, number], width: number, originalIdx: number }[] = [];
    
    ROADS.forEach((road, originalIdx) => {
      const isHorizontal = road.start[1] === road.end[1];
      const isVertical = road.start[0] === road.end[0];
      
      // Find intersections on this road
      const intersectionsOnRoad: { pos: number, coord: [number, number] }[] = [];
      INTERSECTIONS.forEach(([ix, iz]) => {
        if (isHorizontal) {
          // Road Z constant
          if (Math.abs(iz - road.start[1]) < 0.1) {
            // X within road range
            const minX = Math.min(road.start[0], road.end[0]);
            const maxX = Math.max(road.start[0], road.end[0]);
            if (ix >= minX && ix <= maxX) {
              intersectionsOnRoad.push({ pos: ix, coord: [ix, iz] });
            }
          }
        } else if (isVertical) {
          if (Math.abs(ix - road.start[0]) < 0.1) {
            const minZ = Math.min(road.start[1], road.end[1]);
            const maxZ = Math.max(road.start[1], road.end[1]);
            if (iz >= minZ && iz <= maxZ) {
              intersectionsOnRoad.push({ pos: iz, coord: [ix, iz] });
            }
          }
        }
      });
      
      // Sort by position along road
      intersectionsOnRoad.sort((a, b) => a.pos - b.pos);
      
      // Generate segments between intersections
      let currentStart: [number, number] = [...road.start] as [number, number];
      
      intersectionsOnRoad.forEach((inter) => {
        if (isHorizontal) {
          const segEndX = inter.pos - INTERSECTION_HALF;
          if (segEndX > currentStart[0]) {
            segments.push({
              start: [currentStart[0], currentStart[1]],
              end: [segEndX, currentStart[1]],
              width: road.width,
              originalIdx,
            });
          }
          currentStart = [inter.pos + INTERSECTION_HALF, currentStart[1]] as [number, number];
        } else {
          const segEndZ = inter.pos - INTERSECTION_HALF;
          if (segEndZ > currentStart[1]) {
            segments.push({
              start: [currentStart[0], currentStart[1]],
              end: [currentStart[0], segEndZ],
              width: road.width,
              originalIdx,
            });
          }
          currentStart = [currentStart[0], inter.pos + INTERSECTION_HALF] as [number, number];
        }
      });
      
      // Last segment to road end
      if (isHorizontal) {
        if (currentStart[0] < road.end[0]) {
          segments.push({
            start: [currentStart[0], currentStart[1]],
            end: [road.end[0], currentStart[1]],
            width: road.width,
            originalIdx,
          });
        }
      } else {
        if (currentStart[1] < road.end[1]) {
          segments.push({
            start: [currentStart[0], currentStart[1]],
            end: [currentStart[0], road.end[1]],
            width: road.width,
            originalIdx,
          });
        }
      }
    });
    
    return segments;
  }, []);

  return (
    <group>
      {/* Road segments - split to avoid intersection overlap */}
      {roadSegments.map((road, idx) => {
        const dx = road.end[0] - road.start[0];
        const dz = road.end[1] - road.start[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.1) return null;
        const angle = Math.atan2(dz, dx);
        const centerX = (road.start[0] + road.end[0]) / 2;
        const centerZ = (road.start[1] + road.end[1]) / 2;

        // Skip very short segments (artifacts)
        if (length < 1) return null;

        return (
          <group key={`roadseg-${idx}`} position={[centerX, 0.02, centerZ]} rotation={[0, -angle, 0]}>
            {/* Asphalt base - Y 0.02 */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, road.width]} />
              <primitive object={roadMaterial} attach="material" />
            </mesh>
            
            {/* Asphalt variation - slightly above */}
            {Array.from({ length: 2 }).map((_, pIdx) => (
              <mesh 
                key={`patch-${idx}-${pIdx}`}
                position={[(Math.random() - 0.5) * length * 0.7, 0.006, (Math.random() - 0.5) * road.width * 0.5]}
                rotation={[-Math.PI / 2, 0, Math.random() * 0.5]}
                receiveShadow
              >
                <planeGeometry args={[2 + Math.random() * 3, 0.8 + Math.random() * 1.5]} />
                <primitive object={asphaltPatchMat} attach="material" />
              </mesh>
            ))}
            
            {/* Sidewalks - 3m wide, at Y 0.12 (0.02+0.10) to avoid coplanar with road */}
            {/* Only generate sidewalk if segment is long enough (>4m) */}
            {length > 4 && (
              <>
                <group position={[0, 0.10, road.width / 2 + 1.5]}>
                  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[length, 3]} />
                    <primitive object={road.originalIdx % 2 === 0 ? sidewalkMaterial : sidewalkDark} attach="material" />
                  </mesh>
                  <mesh receiveShadow position={[0, 0.07, -1.5]}>
                    <boxGeometry args={[length, 0.18, 0.25]} />
                    <primitive object={curbMaterial} attach="material" />
                  </mesh>
                </group>
                <group position={[0, 0.10, -road.width / 2 - 1.5]}>
                  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[length, 3]} />
                    <primitive object={road.originalIdx % 2 === 0 ? sidewalkDark : sidewalkMaterial} attach="material" />
                  </mesh>
                  <mesh receiveShadow position={[0, 0.07, 1.5]}>
                    <boxGeometry args={[length, 0.18, 0.25]} />
                    <primitive object={curbMaterial} attach="material" />
                  </mesh>
                </group>
              </>
            )}

            {/* Center line dashed - only within segment, not through intersection */}
            {length > 6 && Array.from({ length: Math.floor(length / 3) }).map((_, i) => {
              const posX = -length / 2 + i * 3 + 1;
              // Skip if too close to segment ends (would be near intersection)
              if (posX < -length/2 + 1 || posX > length/2 - 1) return null;
              return (
                <mesh
                  key={`mark-${idx}-${i}`}
                  position={[posX, 0.03, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[1.6, 0.12]} />
                  <primitive object={markingMaterial} attach="material" />
                </mesh>
              );
            })}

            {/* Side lines - within segment only */}
            {length > 2 && (
              <>
                <mesh position={[0, 0.03, road.width / 2 - 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[length - 0.5, 0.12]} />
                  <primitive object={whiteMarkingMat} attach="material" />
                </mesh>
                <mesh position={[0, 0.03, -road.width / 2 + 0.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[length - 0.5, 0.12]} />
                  <primitive object={whiteMarkingMat} attach="material" />
                </mesh>
              </>
            )}

            {/* Parking lines - only on long segments */}
            {road.originalIdx % 2 === 0 && length > 10 && Array.from({ length: Math.floor(length / 8) }).map((_, i) => {
              const posX = -length/2 + i*8 + 2;
              if (posX < -length/2 + 1 || posX > length/2 - 1) return null;
              return (
                <mesh
                  key={`park-${idx}-${i}`}
                  position={[posX, 0.03, road.width/2 - 1.2]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[0.08, 2]} />
                  <primitive object={whiteMarkingMat} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Intersections - single mesh per crossing, Y 0.025 slightly above road 0.02 to avoid z-fighting via real offset */}
      {INTERSECTIONS.map(([x, z], idx) => (
        <group key={`inter-${idx}`} position={[x, 0.025, z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[INTERSECTION_SIZE, INTERSECTION_SIZE]} />
            <primitive object={roadMaterial} attach="material" />
          </mesh>
          {/* Crosswalks - 4 directions, at Y 0.05 above intersection */}
          {[0, 90, 180, 270].map((rot, rIdx) => (
            <group key={`cross-${idx}-${rIdx}`} rotation={[0, (rot * Math.PI) / 180, 0]}>
              <group position={[0, 0.03, 6.5]}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <mesh key={`zebra-${i}`} position={[i * 0.9 - 2.7, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.35, 2.8]} />
                    <meshStandardMaterial color="#f0f0f0" roughness={0.8} />
                  </mesh>
                ))}
              </group>
              <mesh position={[0, 0.03, 5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[10, 0.3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Manholes - avoid intersections */}
      {Array.from({ length: 12 }).map((_, i) => {
        const roadIdx = i % ROADS.length;
        const road = ROADS[roadIdx];
        const t = 0.15 + Math.random() * 0.7; // avoid ends near intersections
        const x = road.start[0] + (road.end[0] - road.start[0]) * t + (Math.random() - 0.5) * 1;
        const z = road.start[1] + (road.end[1] - road.start[1]) * t + (Math.random() - 0.5) * 1;
        
        // Skip if near intersection
        for (const [ix, iz] of INTERSECTIONS) {
          if (Math.abs(x - ix) < 10 && Math.abs(z - iz) < 10) return null;
        }
        
        return (
          <group key={`manhole-${i}`} position={[x, 0.035, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[0.45, 16]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.6} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
              <ringGeometry args={[0.25, 0.4, 16]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
