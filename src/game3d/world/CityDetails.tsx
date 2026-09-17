'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';

export function CityDetails() {
  // Trees, benches, trash, lights, etc using instancing where possible

  const treePositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < 30; i++) {
      pos.push([
        (Math.random() - 0.5) * 250,
        0,
        (Math.random() - 0.5) * 250
      ]);
    }
    return pos;
  }, []);

  const lampPositions = useMemo(() => {
    const pos: [number, number][] = [];
    // Along roads
    for (let x = -140; x <= 140; x += 30) {
      pos.push([x, 7]);
      pos.push([x, -7]);
    }
    for (let z = -140; z <= 140; z += 30) {
      pos.push([7, z]);
      pos.push([-7, z]);
    }
    return pos;
  }, []);

  return (
    <group>
      {/* Trees */}
      {treePositions.map((p, i) => (
        <group key={`tree-${i}`} position={[p[0], 0, p[2]]}>
          <mesh castShadow position={[0, 2, 0]}>
            <cylinderGeometry args={[0.15, 0.25, 3, 6]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 4, 0]}>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color="#2a5a2a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Street lamps */}
      {lampPositions.slice(0, 20).map((p, i) => (
        <group key={`lamp-${i}`} position={[p[0], 0, p[1]]}>
          <mesh castShadow position={[0, 2, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 4, 6]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.3} />
          </mesh>
          <pointLight position={[0, 4, 0]} intensity={2} distance={15} color="#ffcc88" />
        </group>
      ))}

      {/* Benches */}
      {[
        [-10, 75],
        [10, 75],
        [50, 30],
        [-40, -30],
      ].map((p, i) => (
        <group key={`bench-${i}`} position={[p[0], 0.3, p[1]]} rotation={[0, Math.random()*Math.PI, 0]}>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[1.8, 0.1, 0.5]} />
            <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[1.8, 0.4, 0.1]} />
            <meshStandardMaterial color="#6a4a2a" roughness={0.9} />
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
        <group key={`trash-${i}`} position={[p[0], 0.5, p[1]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.4, 1, 12]} />
            <meshStandardMaterial color="#3a5a3a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Trash containers */}
      <group position={[-95, 0.6, 50]}>
        <mesh castShadow>
          <boxGeometry args={[2, 1.2, 1]} />
          <meshStandardMaterial color="#2a4a2a" roughness={0.9} />
        </mesh>
      </group>

      {/* Hydrants */}
      {[
        [5, 5],
        [55, 5],
        [-65, 5],
      ].map((p, i) => (
        <group key={`hydrant-${i}`} position={[p[0], 0.3, p[1]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.6, 8]} />
            <meshStandardMaterial color="#cc2222" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Bus stop */}
      <group position={[20, 0, 58]}>
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[0.1, 2, 3]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
        <mesh castShadow position={[1, 2, 0]}>
          <boxGeometry args={[2, 0.1, 3]} />
          <meshStandardMaterial color="#6a6a6a" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Billboard */}
      <group position={[120, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
        <mesh castShadow position={[0, 3, 0]}>
          <boxGeometry args={[0.2, 6, 0.2]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        <mesh castShadow position={[0, 5, 0.3]}>
          <boxGeometry args={[6, 3, 0.2]} />
          <meshStandardMaterial color="#cc4444" />
        </mesh>
      </group>
    </group>
  );
}
