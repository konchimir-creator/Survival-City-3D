'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BUILDINGS, BuildingDef } from '@/game/world/types';

function Building({ def }: { def: BuildingDef }) {
  const { position, size, type, rotation = 0 } = def;

  const materials = useMemo(() => {
    const base: Record<string, THREE.MeshStandardMaterial> = {
      shop: new THREE.MeshStandardMaterial({ color: '#c4a070', roughness: 0.8, metalness: 0.05 }),
      shelter: new THREE.MeshStandardMaterial({ color: '#7a7a6a', roughness: 0.9 }),
      warehouse: new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.85, metalness: 0.25 }),
      cafe: new THREE.MeshStandardMaterial({ color: '#b08050', roughness: 0.75, metalness: 0.05 }),
      police: new THREE.MeshStandardMaterial({ color: '#3a5a7a', roughness: 0.7, metalness: 0.1 }),
      medical: new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.6, metalness: 0.1 }),
      autoservice: new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.85, metalness: 0.3 }),
      residential: new THREE.MeshStandardMaterial({ color: '#a89888', roughness: 0.85 }),
      abandoned: new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.95 }),
      internet_cafe: new THREE.MeshStandardMaterial({ color: '#2a2a4a', roughness: 0.8 }),
    };
    return base;
  }, []);

  const mat = materials[type] || materials.residential;

  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2a3a',
    roughness: 0.15,
    metalness: 0.85,
    emissive: type === 'shop' || type === 'cafe' ? '#221100' : '#000000',
    emissiveIntensity: 0.15,
  }), [type]);

  const windowFrameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e0e0e0',
    roughness: 0.6,
    metalness: 0.2,
  }), []);

  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a1a0a',
    roughness: 0.85,
  }), []);

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#88aacc',
    roughness: 0.05,
    metalness: 0.9,
    transparent: true,
    opacity: 0.35,
  }), []);

  // Door height 2.0-2.2m, floor ~3m
  const floorHeight = 3;
  const doorHeight = 2.1;
  const doorWidth = 1.1;

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      <CuboidCollider args={[size[0]/2, size[1]/2, size[2]/2]} />
      
      <group>
        {/* Main building with slight bevel */}
        <mesh castShadow receiveShadow position={[0, size[1]/2, 0]}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <primitive object={mat} attach="material" />
        </mesh>

        {/* Foundation - concrete */}
        <mesh receiveShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[size[0] + 0.5, 0.5, size[2] + 0.5]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
        </mesh>

        {/* Roof with parapet */}
        <mesh castShadow position={[0, size[1] + 0.15, 0]}>
          <boxGeometry args={[size[0] + 0.3, 0.3, size[2] + 0.3]} />
          <meshStandardMaterial color="#222222" roughness={0.9} />
        </mesh>
        {/* Roof parapet */}
        <mesh castShadow position={[0, size[1] + 0.5, 0]}>
          <boxGeometry args={[size[0] + 0.1, 0.4, size[2] + 0.1]} />
          <meshStandardMaterial color={mat.color} roughness={0.85} />
        </mesh>

        {/* First floor distinction */}
        <mesh receiveShadow position={[0, floorHeight/2, size[2]/2 + 0.01]}>
          <boxGeometry args={[size[0] + 0.1, floorHeight, 0.05]} />
          <meshStandardMaterial 
            color={type === 'shop' || type === 'cafe' ? '#8a6a4a' : '#6a6a6a'} 
            roughness={0.8} 
          />
        </mesh>

        {/* Windows - front face with frames */}
        {Array.from({ length: Math.max(1, Math.floor(size[0] / 3.2)) }).map((_, i) => 
          Array.from({ length: Math.max(1, Math.floor((size[1] - floorHeight) / 3)) }).map((_, j) => {
            const isGroundFloor = false;
            if (j === 0 && i === Math.floor(size[0] / 6.4)) return null; // door space
            const wx = -size[0]/2 + 1.6 + i * 3.2;
            const wy = floorHeight + 1.2 + j * 2.8;
            if (wy > size[1] - 0.6) return null;
            
            // Different window types per building
            const isShopWindow = (type === 'shop' || type === 'cafe') && j === 0;
            if (isShopWindow) {
              // Large shop window
              return (
                <group key={`win-${i}-${j}`} position={[wx, 1.4, size[2]/2 + 0.02]}>
                  <mesh castShadow>
                    <boxGeometry args={[2.4, 2.0, 0.05]} />
                    <primitive object={windowFrameMat} attach="material" />
                  </mesh>
                  <mesh position={[0, 0, 0.03]}>
                    <planeGeometry args={[2.2, 1.8]} />
                    <primitive object={glassMat} attach="material" />
                  </mesh>
                </group>
              );
            }
            
            return (
              <group key={`win-${i}-${j}`} position={[wx, wy, size[2]/2 + 0.02]}>
                {/* Frame */}
                <mesh castShadow>
                  <boxGeometry args={[1.4, 1.4, 0.06]} />
                  <primitive object={windowFrameMat} attach="material" />
                </mesh>
                {/* Glass */}
                <mesh position={[0, 0, 0.04]}>
                  <planeGeometry args={[1.2, 1.2]} />
                  <primitive object={windowMat} attach="material" />
                </mesh>
                {/* Window sill */}
                <mesh position={[0, -0.75, 0.05]} castShadow>
                  <boxGeometry args={[1.6, 0.08, 0.15]} />
                  <meshStandardMaterial color="#d0d0d0" roughness={0.7} />
                </mesh>
              </group>
            );
          })
        )}

        {/* Door - proper 2.1m height */}
        <group position={[0, doorHeight/2, size[2]/2 + 0.03]}>
          {/* Door frame */}
          <mesh castShadow position={[0, 0, -0.02]}>
            <boxGeometry args={[doorWidth + 0.2, doorHeight + 0.15, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          {/* Door itself */}
          <mesh castShadow>
            <boxGeometry args={[doorWidth, doorHeight, 0.06]} />
            <primitive object={doorMat} attach="material" />
          </mesh>
          {/* Door handle */}
          <mesh position={[0.35, -0.1, 0.04]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ccaa44" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Steps */}
          <mesh position={[0, -doorHeight/2 - 0.1, 0.3]} receiveShadow>
            <boxGeometry args={[1.6, 0.15, 0.8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
          </mesh>
          <mesh position={[0, -doorHeight/2 - 0.25, 0.4]} receiveShadow>
            <boxGeometry args={[1.8, 0.15, 1.0]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
          </mesh>
        </group>

        {/* Sign with better design */}
        <group position={[0, size[1] - 0.6, size[2]/2 + 0.35]}>
          <mesh castShadow>
            <boxGeometry args={[Math.min(size[0] * 0.85, 9), 0.9, 0.18]} />
            <meshStandardMaterial 
              color={
                type === 'shop' ? '#ffcc00' :
                type === 'cafe' ? '#6a3a1a' :
                type === 'police' ? '#1a3a6a' :
                type === 'medical' ? '#cc2222' :
                type === 'warehouse' ? '#4a4a4a' :
                '#888888'
              } 
              roughness={0.6}
              metalness={0.1}
              emissive={
                type === 'shop' ? '#332200' :
                type === 'cafe' ? '#331100' :
                type === 'police' ? '#001133' :
                '#000000'
              }
              emissiveIntensity={type === 'shop' || type === 'cafe' ? 0.25 : 0}
            />
          </mesh>
          {/* Sign border */}
          <mesh position={[0, 0, 0.1]} castShadow>
            <boxGeometry args={[Math.min(size[0] * 0.85, 9) + 0.1, 1.0, 0.02]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        </group>

        {/* AC units - better */}
        {type !== 'abandoned' && Array.from({ length: type === 'residential' ? 3 : 2 }).map((_, i) => (
          <group key={`ac-${i}`} position={[size[0]/2 - 0.8 - i*2.5, size[1] - 1.2, 0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.5, 0.6]} />
              <meshStandardMaterial color="#cccccc" roughness={0.5} metalness={0.3} />
            </mesh>
            {/* AC fan */}
            <mesh position={[0.36, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
              <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Pipe */}
            <mesh position={[-0.2, 0.4, 0]} rotation={[0, 0, 0.3]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
              <meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Pipes for industrial */}
        {(type === 'warehouse' || type === 'autoservice') && (
          <>
            <mesh position={[size[0]/2 + 0.15, size[1]/2, 0.5]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, size[1], 8]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[size[0]/2 + 0.15, size[1]/2, -0.5]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, size[1], 8]} />
              <meshStandardMaterial color="#5a5a5a" metalness={0.6} roughness={0.4} />
            </mesh>
          </>
        )}

        {/* Awnings for shop/cafe - better */}
        {(type === 'shop' || type === 'cafe') && (
          <group position={[0, 3.0, size[2]/2 + 0.9]}>
            <mesh castShadow>
              <boxGeometry args={[size[0] + 0.6, 0.12, 1.6]} />
              <meshStandardMaterial color={type === 'shop' ? '#aa2222' : '#2a5a2a'} roughness={0.8} />
            </mesh>
            {/* Awning supports */}
            <mesh position={[-size[0]/2 + 0.3, -0.6, 0.5]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
              <meshStandardMaterial color="#333" metalness={0.8} />
            </mesh>
            <mesh position={[size[0]/2 - 0.3, -0.6, 0.5]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
              <meshStandardMaterial color="#333" metalness={0.8} />
            </mesh>
          </group>
        )}

        {/* Gutters and downspouts */}
        <mesh position={[size[0]/2 + 0.05, size[1]/2, size[2]/2 - 0.5]} castShadow>
          <boxGeometry args={[0.08, size[1], 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[-size[0]/2 - 0.05, size[1]/2, size[2]/2 - 0.5]} castShadow>
          <boxGeometry args={[0.08, size[1], 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
        </mesh>

        {/* Fire escape for residential */}
        {type === 'residential' && size[1] > 10 && (
          <group position={[size[0]/2 + 0.4, size[1]/2, 0]}>
            {Array.from({ length: Math.floor(size[1]/3) }).map((_, i) => (
              <group key={`fire-${i}`} position={[0, -size[1]/2 + 2 + i*3, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[1.2, 0.05, 1.0]} />
                  <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
                </mesh>
                {/* Railing */}
                <mesh position={[0.5, 0.5, 0]} castShadow>
                  <boxGeometry args={[0.04, 1, 1]} />
                  <meshStandardMaterial color="#1a1a1a" metalness={0.9} />
                </mesh>
              </group>
            ))}
            {/* Ladder */}
            <mesh position={[0, -size[1]/2 + 1, 0.6]} castShadow>
              <boxGeometry args={[0.04, size[1] - 2, 0.04]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.9} />
            </mesh>
            <mesh position={[0.8, -size[1]/2 + 1, 0.6]} castShadow>
              <boxGeometry args={[0.04, size[1] - 2, 0.04]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.9} />
            </mesh>
          </group>
        )}

        {/* Back door for some buildings */}
        {(type === 'shop' || type === 'warehouse') && (
          <mesh position={[0, 1, -size[2]/2 - 0.02]} castShadow>
            <planeGeometry args={[0.9, 1.9]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.9} />
          </mesh>
        )}

        {/* Light above door for night */}
        <pointLight
          position={[0, 2.6, size[2]/2 + 0.6]}
          intensity={type === 'shop' || type === 'cafe' ? 6 : type === 'residential' ? 1 : 0}
          distance={12}
          color={type === 'shop' ? '#ffcc88' : '#ffddaa'}
          decay={2}
        />

        {/* Window lights at night - emissive planes */}
        {type === 'residential' && Array.from({ length: 2 }).map((_, i) => (
          <mesh key={`winlight-${i}`} position={[size[0]/2 - 1 - i*2, floorHeight + 2, size[2]/2 + 0.03]}>
            <planeGeometry args={[1.0, 1.0]} />
            <meshStandardMaterial color="#ffcc88" emissive="#ffaa44" emissiveIntensity={0.8} />
          </mesh>
        ))}
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

      {/* Fence around warehouse - better */}
      <group>
        {Array.from({ length: 12 }).map((_, i) => (
          <group key={`fence-w-${i}`} position={[-90 + (i - 6) * 2.2, 0, 50]}>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[0.08, 2, 0.08]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[2, 1.6, 0.02]} />
              <meshStandardMaterial color="#5a5a5a" roughness={0.9} transparent opacity={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Walls around abandoned */}
      <RigidBody type="fixed" colliders="cuboid" position={[-110, 1, -20]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[20, 2.2, 0.35]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
        </mesh>
      </RigidBody>
      
      {/* Graffiti on abandoned */}
      <group position={[-110, 1.5, -9.8]}>
        <mesh>
          <planeGeometry args={[4, 1.2]} />
          <meshStandardMaterial color="#aa2222" roughness={0.9} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
