'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BUILDINGS, BuildingDef } from '@/game/world/types';

function Building({ def }: { def: BuildingDef }) {
  const { position, size, type, rotation = 0 } = def;

  const materials = useMemo(() => {
    const base: Record<string, THREE.MeshStandardMaterial> = {
      shop: new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.8 }),
      shelter: new THREE.MeshStandardMaterial({ color: '#8a8a7a', roughness: 0.9 }),
      warehouse: new THREE.MeshStandardMaterial({ color: '#6a6a6a', roughness: 0.85, metalness: 0.2 }),
      cafe: new THREE.MeshStandardMaterial({ color: '#c4956a', roughness: 0.8 }),
      police: new THREE.MeshStandardMaterial({ color: '#4a6a8a', roughness: 0.7 }),
      medical: new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.6 }),
      autoservice: new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.85 }),
      residential: new THREE.MeshStandardMaterial({ color: '#b8a898', roughness: 0.85 }),
      abandoned: new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.95 }),
      internet_cafe: new THREE.MeshStandardMaterial({ color: '#3a3a5a', roughness: 0.8 }),
    };
    return base;
  }, []);

  const mat = materials[type] || materials.residential;

  // Windows material
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a3a4a',
    roughness: 0.2,
    metalness: 0.8,
    emissive: type === 'shop' || type === 'cafe' ? '#332200' : '#000000',
    emissiveIntensity: 0.2,
  }), [type]);

  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a2a1a',
    roughness: 0.9,
  }), []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      <CuboidCollider args={[size[0]/2, size[1]/2, size[2]/2]} />
      
      <group>
        {/* Main building */}
        <mesh castShadow receiveShadow position={[0, size[1]/2, 0]}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <primitive object={mat} attach="material" />
        </mesh>

        {/* Foundation */}
        <mesh receiveShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[size[0] + 0.4, 0.4, size[2] + 0.4]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
        </mesh>

        {/* Roof */}
        <mesh castShadow position={[0, size[1] + 0.2, 0]}>
          <boxGeometry args={[size[0] + 0.2, 0.4, size[2] + 0.2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
        </mesh>

        {/* Windows - front face */}
        {Array.from({ length: Math.floor(size[0] / 3) }).map((_, i) => 
          Array.from({ length: Math.floor(size[1] / 3) }).map((_, j) => {
            if (j === 0 && i === Math.floor(size[0] / 6)) return null; // door space
            const wx = -size[0]/2 + 1.5 + i * 3;
            const wy = 1.5 + j * 3;
            if (wy > size[1] - 0.5) return null;
            return (
              <mesh key={`win-${i}-${j}`} position={[wx, wy, size[2]/2 + 0.01]} castShadow>
                <planeGeometry args={[1.8, 1.8]} />
                <primitive object={windowMat} attach="material" />
              </mesh>
            );
          })
        )}

        {/* Door */}
        <mesh position={[0, 1, size[2]/2 + 0.02]} castShadow>
          <planeGeometry args={[1.2, 2]} />
          <primitive object={doorMat} attach="material" />
        </mesh>

        {/* Sign */}
        <group position={[0, size[1] - 0.5, size[2]/2 + 0.3]}>
          <mesh castShadow>
            <boxGeometry args={[Math.min(size[0] * 0.8, 8), 0.8, 0.2]} />
            <meshStandardMaterial 
              color={
                type === 'shop' ? '#ffcc00' :
                type === 'cafe' ? '#8a4a2a' :
                type === 'police' ? '#2a4a8a' :
                type === 'medical' ? '#ff4444' :
                '#aaaaaa'
              } 
              roughness={0.7}
              emissive={
                type === 'shop' ? '#332200' :
                type === 'cafe' ? '#331100' :
                '#000000'
              }
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Sign text placeholder - colored box */}
          <mesh position={[0, 0, 0.11]}>
            <planeGeometry args={[Math.min(size[0] * 0.7, 7), 0.6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* AC units */}
        {type !== 'abandoned' && Array.from({ length: 2 }).map((_, i) => (
          <mesh key={`ac-${i}`} position={[size[0]/2 - 1 - i*3, size[1] - 1, 0]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.6]} />
            <meshStandardMaterial color="#cccccc" roughness={0.6} metalness={0.3} />
          </mesh>
        ))}

        {/* Pipes */}
        {type === 'warehouse' || type === 'autoservice' ? (
          <mesh position={[size[0]/2 + 0.1, size[1]/2, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, size[1], 8]} />
            <meshStandardMaterial color="#5a5a5a" metalness={0.6} roughness={0.4} />
          </mesh>
        ) : null}

        {/* Awnings for shop/cafe */}
        {(type === 'shop' || type === 'cafe') && (
          <mesh position={[0, 2.8, size[2]/2 + 0.8]} castShadow>
            <boxGeometry args={[size[0] + 0.5, 0.1, 1.5]} />
            <meshStandardMaterial color={type === 'shop' ? '#cc4444' : '#4a8a4a'} roughness={0.8} />
          </mesh>
        )}

        {/* Light above door for night */}
        <pointLight
          position={[0, 2.5, size[2]/2 + 0.5]}
          intensity={type === 'shop' || type === 'cafe' ? 5 : 0}
          distance={10}
          color={type === 'shop' ? '#ffcc88' : '#ffffff'}
        />
      </group>
    </RigidBody>
  );
}

export function Buildings() {
  return (
    <group>
      {BUILDINGS.map((b) => (
        <Building key={b.id} def={b} />
      ))}

      {/* Additional fences */}
      <group>
        {/* Fence around warehouse */}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={`fence-w-${i}`} position={[-90 + (i - 5) * 2, 1, 50]} castShadow>
            <boxGeometry args={[0.1, 2, 2]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Walls around abandoned */}
      <RigidBody type="fixed" colliders="cuboid" position={[-110, 1, -20]}>
        <mesh castShadow>
          <boxGeometry args={[20, 2, 0.3]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>
      </RigidBody>
    </group>
  );
}
