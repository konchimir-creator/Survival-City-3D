'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BUILDINGS, BuildingDef } from '@/game/world/types';

function Building({ def }: { def: BuildingDef }) {
  const { position, size, type, rotation = 0 } = def;

  const materials = useMemo(() => {
    const base: Record<string, THREE.MeshStandardMaterial> = {
      shop: new THREE.MeshStandardMaterial({ color: '#c4a070', roughness: 0.85, metalness: 0.03 }),
      shelter: new THREE.MeshStandardMaterial({ color: '#7a7a6a', roughness: 0.92, metalness: 0.02 }),
      warehouse: new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.88, metalness: 0.2 }),
      cafe: new THREE.MeshStandardMaterial({ color: '#b08050', roughness: 0.82, metalness: 0.03 }),
      police: new THREE.MeshStandardMaterial({ color: '#3a5a7a', roughness: 0.75, metalness: 0.08 }),
      medical: new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.65, metalness: 0.05 }),
      autoservice: new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.87, metalness: 0.25 }),
      residential: new THREE.MeshStandardMaterial({ color: '#a89888', roughness: 0.88, metalness: 0.02 }),
      abandoned: new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.96, metalness: 0.01 }),
      internet_cafe: new THREE.MeshStandardMaterial({ color: '#2a2a4a', roughness: 0.85, metalness: 0.05 }),
    };
    // Avoid z-fighting: polygonOffset for base
    Object.values(base).forEach(m => {
      m.polygonOffset = false;
    });
    return base;
  }, []);

  const mat = materials[type] || materials.residential;

  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2a3a',
    roughness: 0.15,
    metalness: 0.85,
    emissive: '#000000',
    emissiveIntensity: 0,
  }), []);

  const windowLitMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffcc88',
    roughness: 0.4,
    metalness: 0.1,
    emissive: '#ffaa44',
    emissiveIntensity: 0.9,
  }), []);

  const windowFrameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e0e0e0',
    roughness: 0.6,
    metalness: 0.2,
  }), []);

  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a1a0a',
    roughness: 0.85,
    metalness: 0.05,
  }), []);

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#88aacc',
    roughness: 0.05,
    metalness: 0.9,
    transparent: true,
    opacity: 0.32,
  }), []);

  const signMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const doorLightRef = useRef<THREE.PointLight>(null);
  const windowLightsRef = useRef<THREE.Group>(null);
  const buildingRef = useRef<THREE.Group>(null);

  const lightState = useMemo(() => {
    // OFF/DIM/ON per window - for readable night city
    const r = Math.random();
    if (r < 0.35) return 'OFF' as const;
    if (r < 0.65) return 'DIM' as const;
    return 'ON' as const;
  }, []);

  useFrame(() => {
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      const camPos = (window as any).__cameraPosition as THREE.Vector3;
      let near = true;
      if (camPos && buildingRef.current) {
        const dist = buildingRef.current.getWorldPosition(new THREE.Vector3()).distanceTo(camPos);
        near = dist < 45;
      }
      if (signMatRef.current) {
        if (type === 'shop' || type === 'cafe' || type === 'police') {
          signMatRef.current.emissiveIntensity = isNight ? 0.65 : 0.18;
        } else {
          signMatRef.current.emissiveIntensity = isNight ? 0.20 : 0;
        }
      }
      if (doorLightRef.current) {
        let active = false;
        if (type === 'shop' || type === 'cafe') {
          doorLightRef.current.intensity = isNight && near ? 10 : 0;
          active = isNight && near;
        } else if (type === 'residential') {
          doorLightRef.current.intensity = isNight && near ? 2.2 : 0;
          active = isNight && near;
        } else {
          doorLightRef.current.intensity = 0;
        }
        if (active) (window as any).__activeLights = ((window as any).__activeLights || 0) + 1;
      }
      if (windowLightsRef.current) {
        windowLightsRef.current.visible = isNight;
        windowLightsRef.current.traverse((obj:any)=>{
          if (obj.isPointLight) {
            const on = isNight && near && obj.userData.lightState !== 'OFF';
            obj.intensity = on ? obj.userData.baseIntensity || 1.5 : 0;
            if (on) (window as any).__activeLights = ((window as any).__activeLights || 0) + 1;
          }
          if (obj.isMesh && obj.userData.isWindowLit) {
            const st = obj.userData.lightState;
            if (st === 'OFF') {
              obj.material.emissiveIntensity = isNight ? 0.05 : 0;
            } else if (st === 'DIM') {
              obj.material.emissiveIntensity = isNight ? 0.35 : 0;
            } else {
              obj.material.emissiveIntensity = isNight ? 0.85 : 0;
            }
          }
        });
      }
    } catch {}
  });

  // Door height 2.1m (realistic), width 1.0m, floor 3m
  const floorHeight = 3;
  const doorHeight = 2.1;
  const doorWidth = 1.0;

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      <CuboidCollider args={[size[0]/2, size[1]/2, size[2]/2]} />
      
      <group ref={buildingRef as any}>
        {/* Main building */}
        <mesh castShadow receiveShadow position={[0, size[1]/2, 0]}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <primitive object={mat} attach="material" />
        </mesh>

        {/* Foundation - concrete 0.5m high, avoid z-fighting with ground (ground at -0.02, foundation at 0.25) */}
        <mesh receiveShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[size[0] + 0.4, 0.5, size[2] + 0.4]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.96} metalness={0.02} />
        </mesh>

        {/* Roof */}
        <mesh castShadow position={[0, size[1] + 0.15, 0]}>
          <boxGeometry args={[size[0] + 0.3, 0.3, size[2] + 0.3]} />
          <meshStandardMaterial color="#222222" roughness={0.92} metalness={0.05} />
        </mesh>
        {/* Parapet */}
        <mesh castShadow position={[0, size[1] + 0.5, 0]}>
          <boxGeometry args={[size[0] + 0.1, 0.4, size[2] + 0.1]} />
          <meshStandardMaterial color={mat.color} roughness={0.88} />
        </mesh>

        {/* First floor distinction - offset to avoid z-fighting: 0.08 instead of 0.01 */}
        <mesh receiveShadow position={[0, floorHeight/2, size[2]/2 + 0.06]}>
          <boxGeometry args={[size[0] + 0.1, floorHeight, 0.05]} />
          <meshStandardMaterial 
            color={type === 'shop' || type === 'cafe' ? '#8a6a4a' : '#6a6a6a'} 
            roughness={0.85} 
            polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}
          />
        </mesh>

        {/* Windows - front face, offset 0.12 to avoid z-fighting */}
        {Array.from({ length: Math.max(1, Math.floor(size[0] / 3.2)) }).map((_, i) => 
          Array.from({ length: Math.max(1, Math.floor((size[1] - floorHeight) / 3)) }).map((_, j) => {
            if (j === 0 && i === Math.floor(size[0] / 6.4)) return null; // door space
            const wx = -size[0]/2 + 1.6 + i * 3.2;
            const wy = floorHeight + 1.2 + j * 2.8;
            if (wy > size[1] - 0.6) return null;
            
            const isShopWindow = (type === 'shop' || type === 'cafe') && j === 0;
            if (isShopWindow) {
              return (
                <group key={`win-${i}-${j}`} position={[wx, 1.4, size[2]/2 + 0.12]}>
                  <mesh castShadow>
                    <boxGeometry args={[2.4, 2.0, 0.06]} />
                    <primitive object={windowFrameMat} attach="material" />
                  </mesh>
                  <mesh position={[0, 0, 0.04]}>
                    <planeGeometry args={[2.2, 1.8]} />
                    <primitive object={glassMat} attach="material" />
                  </mesh>
                </group>
              );
            }
            
            return (
              <group key={`win-${i}-${j}`} position={[wx, wy, size[2]/2 + 0.12]}>
                <mesh castShadow>
                  <boxGeometry args={[1.4, 1.4, 0.07]} />
                  <primitive object={windowFrameMat} attach="material" />
                </mesh>
                <mesh position={[0, 0, 0.05]}>
                  <planeGeometry args={[1.2, 1.2]} />
                  <primitive object={windowMat} attach="material" />
                </mesh>
                <mesh position={[0, -0.75, 0.06]} castShadow>
                  <boxGeometry args={[1.6, 0.08, 0.15]} />
                  <meshStandardMaterial color="#d0d0d0" roughness={0.7} />
                </mesh>
              </group>
            );
          })
        )}

        {/* Door - 2.1m height realistic, offset 0.13 to avoid z-fighting */}
        <group position={[0, doorHeight/2, size[2]/2 + 0.13]}>
          <mesh castShadow position={[0, 0, -0.02]}>
            <boxGeometry args={[doorWidth + 0.2, doorHeight + 0.15, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[doorWidth, doorHeight, 0.06]} />
            <primitive object={doorMat} attach="material" />
          </mesh>
          <mesh position={[0.32, -0.1, 0.05]} castShadow>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#ccaa44" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Steps - 0.15m each, realistic */}
          <mesh position={[0, -doorHeight/2 - 0.08, 0.3]} receiveShadow>
            <boxGeometry args={[1.6, 0.15, 0.8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
          </mesh>
          <mesh position={[0, -doorHeight/2 - 0.23, 0.4]} receiveShadow>
            <boxGeometry args={[1.8, 0.15, 1.0]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
          </mesh>
        </group>

        {/* Sign - with emissive for night */}
        <group position={[0, size[1] - 0.6, size[2]/2 + 0.4]}>
          <mesh castShadow>
            <boxGeometry args={[Math.min(size[0] * 0.85, 9), 0.9, 0.18]} />
            <meshStandardMaterial 
              ref={signMatRef}
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
          <mesh position={[0, 0, 0.11]} castShadow>
            <boxGeometry args={[Math.min(size[0] * 0.85, 9) + 0.1, 1.0, 0.02]} />
            <meshStandardMaterial color="#111" roughness={0.9} polygonOffset polygonOffsetFactor={-2} />
          </mesh>
        </group>

        {/* AC units */}
        {type !== 'abandoned' && Array.from({ length: type === 'residential' ? 2 : 1 }).map((_, i) => (
          <group key={`ac-${i}`} position={[size[0]/2 - 0.8 - i*2.5, size[1] - 1.2, 0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.7, 0.5, 0.6]} />
              <meshStandardMaterial color="#cccccc" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0.36, 0, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
              <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Awnings for shop/cafe */}
        {(type === 'shop' || type === 'cafe') && (
          <group position={[0, 3.0, size[2]/2 + 0.9]}>
            <mesh castShadow>
              <boxGeometry args={[size[0] + 0.6, 0.12, 1.6]} />
              <meshStandardMaterial color={type === 'shop' ? '#aa2222' : '#2a5a2a'} roughness={0.82} />
            </mesh>
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

        {/* Gutters */}
        <mesh position={[size[0]/2 + 0.05, size[1]/2, size[2]/2 - 0.5]} castShadow>
          <boxGeometry args={[0.08, size[1], 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[-size[0]/2 - 0.05, size[1]/2, size[2]/2 - 0.5]} castShadow>
          <boxGeometry args={[0.08, size[1], 0.08]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
        </mesh>

        {/* Door light - turns on at night */}
        <pointLight
          ref={doorLightRef}
          position={[0, 2.6, size[2]/2 + 0.8]}
          intensity={0}
          distance={12}
          color={type === 'shop' ? '#ffcc88' : '#ffddaa'}
          decay={2}
        />

        {/* Window lights at night - OFF/DIM/ON states for readable night city */}
        <group ref={windowLightsRef}>
          {type === 'residential' && Array.from({ length: 4 }).map((_, i) => {
            const state = i === 0 ? 'ON' : i === 1 ? (Math.random() > 0.5 ? 'DIM' : 'ON') : i === 2 ? 'DIM' : 'OFF';
            const intensity = state === 'OFF' ? 0 : state === 'DIM' ? 0.9 : 1.8;
            return (
              <group key={`winlight-${i}`} position={[size[0]/2 - 1.2 - i*2.8, floorHeight + 2 + (i%2)*2.8, size[2]/2 + 0.14]}>
                <mesh userData={{ isWindowLit: true, lightState: state }}>
                  <planeGeometry args={[1.0, 1.0]} />
                  <meshStandardMaterial color={state === 'OFF' ? '#1a1a2a' : '#ffcc88'} emissive={state === 'OFF' ? '#000000' : '#ffaa44'} emissiveIntensity={state === 'OFF' ? 0 : state === 'DIM' ? 0.35 : 0.85} roughness={0.4} />
                </mesh>
                <pointLight position={[0, 0, 0.6]} intensity={0} distance={10} color="#ffcc88" decay={2} userData={{ baseIntensity: intensity, lightState: state }} />
              </group>
            );
          })}
          {(type === 'shop' || type === 'cafe' || type === 'internet_cafe') && (
            <group position={[0, 1.5, size[2]/2 + 0.5]}>
              <pointLight intensity={0} distance={14} color="#ffcc88" decay={2} userData={{ baseIntensity: 3, lightState: 'ON' }} />
            </group>
          )}
          {(type === 'police' || type === 'medical') && (
            <group position={[0, 2, size[2]/2 + 0.5]}>
              <pointLight intensity={0} distance={12} color="#aaccff" decay={2} userData={{ baseIntensity: 1.5, lightState: 'ON' }} />
            </group>
          )}
        </group>
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

      {/* Fence */}
      <group>
        {Array.from({ length: 12 }).map((_, i) => (
          <group key={`fence-w-${i}`} position={[-90 + (i - 6) * 2.2, 0.02, 50]}>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[0.08, 2, 0.08]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[0, 1, 0]}>
              <boxGeometry args={[2, 1.6, 0.02]} />
              <meshStandardMaterial color="#5a5a5a" roughness={0.9} transparent opacity={0.8} polygonOffset polygonOffsetFactor={-1} />
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
      
      {/* Graffiti - offset to avoid z-fighting */}
      <group position={[-110, 1.5, -9.75]}>
        <mesh>
          <planeGeometry args={[4, 1.2]} />
          <meshStandardMaterial color="#aa2222" roughness={0.9} transparent opacity={0.6} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      </group>
    </group>
  );
}
