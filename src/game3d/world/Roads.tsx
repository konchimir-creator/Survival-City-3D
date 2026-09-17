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
  // Improved asphalt: darker base with subtle variation, not one-tone
  const roadMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2e2e34',
    roughness: 0.88,
    metalness: 0.04,
  }), []);

  const roadMaterialDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#25252a',
    roughness: 0.90,
    metalness: 0.03,
  }), []);

  const markingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d8c99a',
    roughness: 0.78,
    metalness: 0.01,
  }), []);

  const whiteMarkingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f0f0f0',
    roughness: 0.70,
    metalness: 0.02,
  }), []);

  // Sidewalks: more realistic concrete/paving variation, distinguishable from road/curb/grass
  const sidewalkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#9a9a9a',
    roughness: 0.85,
    metalness: 0.02,
  }), []);

  const sidewalkDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8a8a8a',
    roughness: 0.87,
    metalness: 0.02,
  }), []);

  const sidewalkLight = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#a8a8a8',
    roughness: 0.83,
    metalness: 0.02,
  }), []);

  const curbMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#6a6a6a',
    roughness: 0.82,
    metalness: 0.08,
  }), []);

  const curbDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5a5a5a',
    roughness: 0.85,
    metalness: 0.06,
  }), []);

  const asphaltPatchMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1e',
    roughness: 0.93,
    transparent: true,
    opacity: 0.38,
  }), []);

  const asphaltPatchLight = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a3a42',
    roughness: 0.88,
    transparent: true,
    opacity: 0.22,
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

        // Choose asphalt variant per segment for subtle variation
        const isDarkSegment = (road.originalIdx + idx) % 3 === 0;
        const baseMat = isDarkSegment ? roadMaterialDark : roadMaterial;

        return (
          <group key={`roadseg-${idx}`} position={[centerX, 0.02, centerZ]} rotation={[0, -angle, 0]}>
            {/* Asphalt base - Y 0.02, avoid z-fighting with ground -0.05 */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[length, road.width]} />
              <primitive object={baseMat} attach="material" />
            </mesh>
            
            {/* Asphalt variation - subtle patches, not noisy, slightly above base */}
            {Array.from({ length: 3 }).map((_, pIdx) => {
              const isLight = pIdx === 2;
              return (
                <mesh 
                  key={`patch-${idx}-${pIdx}`}
                  position={[(Math.random() - 0.5) * length * 0.6, 0.007 + pIdx*0.001, (Math.random() - 0.5) * road.width * 0.4]}
                  rotation={[-Math.PI / 2, 0, Math.random() * 0.3]}
                  receiveShadow
                >
                  <planeGeometry args={[1.5 + Math.random() * 2.5, 0.6 + Math.random() * 1.2]} />
                  <primitive object={isLight ? asphaltPatchLight : asphaltPatchMat} attach="material" />
                </mesh>
              );
            })}
            
            {/* Sidewalks - 2-4m wide (here 3m), at Y 0.12 (0.02+0.10) to avoid coplanar with road */}
            {/* Concrete/paving variation, curb distinguishable, no coplanar */}
            {length > 4 && (
              <>
                <group position={[0, 0.10, road.width / 2 + 1.5]}>
                  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[length, 3]} />
                    <primitive object={road.originalIdx % 2 === 0 ? sidewalkMaterial : (idx % 2 === 0 ? sidewalkDark : sidewalkLight)} attach="material" />
                  </mesh>
                  {/* Curb - 0.18 high, 0.25 thick, Y 0.07 above sidewalk base, distinguishable */}
                  <mesh receiveShadow position={[0, 0.07, -1.5]}>
                    <boxGeometry args={[length, 0.18, 0.25]} />
                    <primitive object={idx % 2 === 0 ? curbMaterial : curbDark} attach="material" />
                  </mesh>
                  {/* Paving lines subtle */}
                  {length > 8 && Array.from({ length: Math.floor(length / 3) }).map((_, li) => (
                    <mesh key={`pave-${idx}-a-${li}`} position={[-length/2 + li*3 + 1.5, 0.012, 0]} rotation={[-Math.PI/2, 0, 0]}>
                      <planeGeometry args={[0.02, 3]} />
                      <meshStandardMaterial color="#7a7a7a" transparent opacity={0.15} />
                    </mesh>
                  ))}
                </group>
                <group position={[0, 0.10, -road.width / 2 - 1.5]}>
                  <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[length, 3]} />
                    <primitive object={road.originalIdx % 2 === 0 ? sidewalkDark : (idx % 2 === 0 ? sidewalkLight : sidewalkMaterial)} attach="material" />
                  </mesh>
                  <mesh receiveShadow position={[0, 0.07, 1.5]}>
                    <boxGeometry args={[length, 0.18, 0.25]} />
                    <primitive object={idx % 2 === 0 ? curbDark : curbMaterial} attach="material" />
                  </mesh>
                  {length > 8 && Array.from({ length: Math.floor(length / 3) }).map((_, li) => (
                    <mesh key={`pave-${idx}-b-${li}`} position={[-length/2 + li*3 + 1.5, 0.012, 0]} rotation={[-Math.PI/2, 0, 0]}>
                      <planeGeometry args={[0.02, 3]} />
                      <meshStandardMaterial color="#7a7a7a" transparent opacity={0.15} />
                    </mesh>
                  ))}
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

      {/* Intersections - single mesh per crossing, Y 0.026 slightly above road 0.02 to avoid z-fighting via real offset, not coplanar */}
      {INTERSECTIONS.map(([x, z], idx) => (
        <group key={`inter-${idx}`} position={[x, 0.026, z]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[INTERSECTION_SIZE, INTERSECTION_SIZE]} />
            <primitive object={idx % 2 === 0 ? roadMaterial : roadMaterialDark} attach="material" />
          </mesh>
          {/* Crosswalks - 4 directions, at Y 0.04 above intersection, avoid overlapping lane markings */}
          {[0, 90, 180, 270].map((rot, rIdx) => (
            <group key={`cross-${idx}-${rIdx}`} rotation={[0, (rot * Math.PI) / 180, 0]}>
              <group position={[0, 0.04, 6.8]}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <mesh key={`zebra-${i}`} position={[i * 0.85 - 2.125, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.32, 2.6]} />
                    <meshStandardMaterial color="#e8e8e8" roughness={0.75} />
                  </mesh>
                ))}
              </group>
              {/* Stop lines - white, not overlapping center dashed */}
              <mesh position={[0, 0.035, 5.2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[INTERSECTION_SIZE - 1, 0.25]} />
                <meshStandardMaterial color="#f5f5f5" roughness={0.7} />
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
