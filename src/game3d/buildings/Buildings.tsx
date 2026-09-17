'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BUILDINGS, BuildingDef } from '@/game/world/types';
import { AbandonedHouseReal, AbandonedHouse02Real } from './RealBuilding';
import { ShowcaseResidential } from './ShowcaseResidential';

function Building({ def }: { def: BuildingDef }) {
  const { position, size, type, rotation = 0, interactable } = def;

  const facadeStyles = useMemo(() => {
    const styles: Record<string, { main: string, secondary: string, plinth: string, roof: string, accent: string }> = {
      shop: { main: '#c4a070', secondary: '#8a6a4a', plinth: '#5a4a3a', roof: '#2a2a2a', accent: '#aa2222' },
      shelter: { main: '#8a8a7a', secondary: '#6a6a5a', plinth: '#4a4a4a', roof: '#3a3a3a', accent: '#5a5a5a' },
      warehouse: { main: '#6a5a4a', secondary: '#5a4a3a', plinth: '#4a4a4a', roof: '#2a2a2a', accent: '#4a4a4a' },
      cafe: { main: '#b08050', secondary: '#8a6040', plinth: '#5a3a2a', roof: '#2a2a2a', accent: '#2a5a2a' },
      police: { main: '#4a6a8a', secondary: '#3a5a7a', plinth: '#2a3a4a', roof: '#1a2a3a', accent: '#1a3a6a' },
      medical: { main: '#d8d8d8', secondary: '#b8b8b8', plinth: '#8a8a8a', roof: '#4a4a4a', accent: '#cc2222' },
      autoservice: { main: '#5a5a5a', secondary: '#4a4a4a', plinth: '#3a3a3a', roof: '#1a1a1a', accent: '#3a3a3a' },
      residential: { main: '#b8a898', secondary: '#a89888', plinth: '#6a6a6a', roof: '#2a2a2a', accent: '#8a7a6a' },
      abandoned: { main: '#4a4a4a', secondary: '#3a3a3a', plinth: '#3a3a3a', roof: '#222', accent: '#3a3a3a' },
      internet_cafe: { main: '#3a3a5a', secondary: '#2a2a4a', plinth: '#2a2a3a', roof: '#1a1a2a', accent: '#0066cc' },
    };
    return styles[type] || styles.residential;
  }, [type]);

  const materials = useMemo(() => {
    return {
      main: new THREE.MeshStandardMaterial({ color: facadeStyles.main, roughness: 0.88, metalness: 0.02 }),
      secondary: new THREE.MeshStandardMaterial({ color: facadeStyles.secondary, roughness: 0.90, metalness: 0.02 }),
      plinth: new THREE.MeshStandardMaterial({ color: facadeStyles.plinth, roughness: 0.92, metalness: 0.02 }),
      roof: new THREE.MeshStandardMaterial({ color: facadeStyles.roof, roughness: 0.92, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({ color: facadeStyles.accent, roughness: 0.85 }),
    };
  }, [facadeStyles]);

  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e2e3a', roughness: 0.2, metalness: 0.75 }), []);
  const windowFrameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.6, metalness: 0.15 }), []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1a0a', roughness: 0.82 }), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7aa0c0', roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.35 }), []);
  const sillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.7 }), []);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a4a4a', metalness: 0.6, roughness: 0.4 }), []);

  const signMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const doorLightRef = useRef<THREE.PointLight>(null);
  const windowLightsRef = useRef<THREE.Group>(null);
  const buildingRef = useRef<THREE.Group>(null);

  useFrame(() => {
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      const camPos = (window as any).__cameraPosition as THREE.Vector3;
      let near = true;
      if (camPos && buildingRef.current) {
        const dist = buildingRef.current.getWorldPosition(new THREE.Vector3()).distanceTo(camPos);
        near = dist < 50;
      }
      if (signMatRef.current) {
        signMatRef.current.emissiveIntensity = isNight ? (type === 'shop' || type === 'cafe' ? 0.6 : 0.18) : 0;
      }
      if (doorLightRef.current) {
        let active = false;
        if (type === 'shop' || type === 'cafe' || type === 'internet_cafe') {
          doorLightRef.current.intensity = isNight && near ? 9 : 0;
          active = isNight && near;
        } else if (type === 'residential' || interactable) {
          doorLightRef.current.intensity = isNight && near ? 2.5 : 0;
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
            obj.intensity = on ? obj.userData.baseIntensity || 1.2 : 0;
            if (on) (window as any).__activeLights = ((window as any).__activeLights || 0) + 1;
          }
          if (obj.isMesh && obj.userData.isWindowLit) {
            const st = obj.userData.lightState;
            if (st === 'OFF') obj.material.emissiveIntensity = isNight ? 0.04 : 0;
            else if (st === 'DIM') obj.material.emissiveIntensity = isNight ? 0.32 : 0;
            else obj.material.emissiveIntensity = isNight ? 0.80 : 0;
          }
        });
      }
    } catch {}
  });

  const floorHeight = 3;
  const doorHeight = 2.15;
  const doorWidth = 1.1;
  const physicalDoorWidth = 1.5;
  const physicalDoorHeight = 2.4;
  const wallThickness = 0.35;
  const halfW = size[0] / 2;
  const halfH = size[1] / 2;
  const halfD = size[2] / 2;
  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;
  const frontLeftWidth = halfW - physicalDoorWidth / 2 - 0.02;
  const frontLeftHalfW = Math.max(0.1, frontLeftWidth / 2);
  const frontLeftCenterX = -halfW + frontLeftHalfW;
  const frontRightCenterX = halfW - frontLeftHalfW;
  const topHeight = size[1] - physicalDoorHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = physicalDoorHeight + topHalfH;
  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;
  const isEnterable = interactable;
  const wearSeed = useMemo(() => Math.random(), []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {isEnterable ? (
        <>
          <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
          <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
          <CuboidCollider args={[physicalDoorWidth / 2, topHalfH, wallThickness / 2]} position={[0, topCenterY, frontZ]} />
          <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
          <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
          <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
          <CuboidCollider args={[floorHalfW, 0.12, floorHalfD]} position={[0, 0.12, 0]} />
          <CuboidCollider args={[1.0, 0.05, 0.6]} position={[0, 0.05, frontZ + 0.9]} />
          <CuboidCollider args={[0.8, 0.12, 0.6]} position={[0, 0.12, frontZ + 0.1]} rotation={[-0.20, 0, 0] as any} />
          <CuboidCollider args={[0.75, 0.12, 0.5]} position={[0, 0.12, frontZ - 0.4]} />
        </>
      ) : (
        <CuboidCollider args={[halfW, halfH, halfD]} position={[0, halfH, 0]} />
      )}
      
      <group ref={buildingRef as any}>
        <mesh receiveShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[size[0] + 0.2, 0.6, size[2] + 0.2]} />
          <primitive object={materials.plinth} attach="material" />
        </mesh>
        <mesh receiveShadow position={[0, 0.08, 0]}>
          <boxGeometry args={[size[0] + 0.3, 0.16, size[2] + 0.3]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.94} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.6 + (size[1]-0.6)/2, 0]}>
          <boxGeometry args={[size[0], size[1]-0.6, size[2]]} />
          <primitive object={materials.main} attach="material" />
        </mesh>
        {Array.from({ length: Math.floor(size[1]/floorHeight) }).map((_, i) => {
          const y = 0.6 + i * floorHeight;
          if (y > size[1]-0.2 || i===0) return null;
          return (
            <mesh key={`floor-${i}`} castShadow receiveShadow position={[0, y, halfD + 0.04]}>
              <boxGeometry args={[size[0] + 0.06, 0.1, 0.06]} />
              <meshStandardMaterial color={materials.secondary.color} roughness={0.86} />
            </mesh>
          );
        })}
        <mesh castShadow position={[0, size[1] + 0.15, 0]}>
          <boxGeometry args={[size[0] + 0.4, 0.3, size[2] + 0.4]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, size[1] + 0.45, 0]}>
          <boxGeometry args={[size[0] + 0.1, 0.35, size[2] + 0.1]} />
          <primitive object={materials.secondary} attach="material" />
        </mesh>
        <mesh position={[0, size[1]*0.3, halfD + 0.03]}><boxGeometry args={[size[0]*0.8, size[1]*0.15, 0.02]} /><meshStandardMaterial color="#8a7a6a" transparent opacity={0.18} roughness={0.95} /></mesh>
        {wearSeed > 0.3 && <mesh position={[-size[0]*0.25, size[1]*0.55, halfD + 0.03]}><boxGeometry args={[size[0]*0.3, size[1]*0.18, 0.02]} /><meshStandardMaterial color={facadeStyles.secondary} transparent opacity={0.12} roughness={0.9} /></mesh>}
        {wearSeed > 0.6 && <mesh position={[size[0]*0.3, size[1]*0.75, halfD + 0.03]}><boxGeometry args={[size[0]*0.25, size[1]*0.12, 0.02]} /><meshStandardMaterial color="#c4b8a8" transparent opacity={0.10} roughness={0.9} /></mesh>}
        {Array.from({ length: Math.max(1, Math.floor(size[0] / 3.2)) }).map((_, i) => 
          Array.from({ length: Math.max(1, Math.floor((size[1] - floorHeight) / 3)) }).map((_, j) => {
            if (j === 0 && Math.abs(i - Math.floor(size[0]/6.4)) < 1 && isEnterable) return null;
            const wx = -size[0]/2 + 1.6 + i * 3.2;
            const wy = floorHeight + 1.2 + j * 2.8;
            if (wy > size[1] - 0.6) return null;
            const isShopWindow = (type === 'shop' || type === 'cafe' || type === 'internet_cafe') && j === 0;
            if (isShopWindow) {
              return (
                <group key={`win-${i}-${j}`} position={[wx, 1.4, halfD + 0.08]}>
                  <mesh castShadow><boxGeometry args={[2.2, 1.8, 0.06]} /><primitive object={windowFrameMat} attach="material" /></mesh>
                  <mesh position={[0, 0, 0.05]}><planeGeometry args={[2.0, 1.6]} /><primitive object={glassMat} attach="material" /></mesh>
                </group>
              );
            }
            return (
              <group key={`win-${i}-${j}`} position={[wx, wy, halfD + 0.08]}>
                <mesh castShadow position={[0,0,-0.06]}><boxGeometry args={[1.3, 1.5, 0.18]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} /></mesh>
                <mesh castShadow><boxGeometry args={[1.4, 1.4, 0.06]} /><primitive object={windowFrameMat} attach="material" /></mesh>
                <mesh position={[0, 0, 0.04]}><planeGeometry args={[1.15, 1.15]} /><primitive object={windowMat} attach="material" /></mesh>
                <mesh position={[0, -0.7, 0.07]} castShadow><boxGeometry args={[1.5, 0.06, 0.12]} /><primitive object={sillMat} attach="material" /></mesh>
              </group>
            );
          })
        )}
        <group position={[0, doorHeight/2, halfD + 0.10]}>
          <mesh castShadow position={[0, 0, -0.02]}><boxGeometry args={[doorWidth + 0.2, doorHeight + 0.12, 0.1]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} /></mesh>
          <mesh castShadow><boxGeometry args={[doorWidth, doorHeight, 0.05]} /><primitive object={doorMat} attach="material" /></mesh>
          <mesh position={[0.32, -0.1, 0.04]} castShadow><sphereGeometry args={[0.032, 8, 8]} /><meshStandardMaterial color="#b8a030" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0, -doorHeight/2 - 0.08, 0.25]} receiveShadow><boxGeometry args={[1.6, 0.12, 0.6]} /><meshStandardMaterial color="#6a6a6a" roughness={0.9} /></mesh>
        </group>
        <group position={[0, size[1] - 0.6, halfD + 0.25]}>
          <mesh castShadow><boxGeometry args={[Math.min(size[0] * 0.8, 8), 0.7, 0.14]} >
            <meshStandardMaterial ref={signMatRef as any} color={facadeStyles.accent} roughness={0.6} emissive="#000000" emissiveIntensity={0} />
          </boxGeometry></mesh>
        </group>
        {type !== 'abandoned' && type !== 'warehouse' && (
          <group position={[halfW - 0.6, size[1] - 1.0, 0]}>
            <mesh castShadow><boxGeometry args={[0.6, 0.4, 0.5]} /><meshStandardMaterial color="#cccccc" roughness={0.5} metalness={0.25} /></mesh>
          </group>
        )}
        {(type === 'shop' || type === 'cafe') && (
          <group position={[0, 2.9, halfD + 0.7]}>
            <mesh castShadow><boxGeometry args={[size[0] + 0.4, 0.1, 1.2]} /><meshStandardMaterial color={type === 'shop' ? '#aa2222' : '#2a5a2a'} roughness={0.8} /></mesh>
          </group>
        )}
        <mesh position={[halfW - 0.1, halfH, halfD - 0.3]} castShadow><boxGeometry args={[0.06, size[1], 0.06]} /><primitive object={metalMat} attach="material" /></mesh>
        <mesh position={[-halfW + 0.1, halfH, halfD - 0.3]} castShadow><boxGeometry args={[0.06, size[1], 0.06]} /><primitive object={metalMat} attach="material" /></mesh>
        <pointLight ref={doorLightRef} position={[0, 2.5, halfD + 0.6]} intensity={0} distance={12} color={type === 'shop' ? '#ffcc88' : '#ffddaa'} decay={2} />
        {isEnterable && (
          <group position={[0, 0.12, halfD - 1.2]}>
            <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2.8, 2.4]} /><meshStandardMaterial color="#8a8a8a" roughness={0.85} /></mesh>
            <mesh castShadow position={[-1.4, 1.2, 0]}><boxGeometry args={[0.1, 2.4, 2.4]} /><meshStandardMaterial color="#b8a898" roughness={0.9} /></mesh>
            <mesh castShadow position={[1.4, 1.2, 0]}><boxGeometry args={[0.1, 2.4, 2.4]} /><meshStandardMaterial color="#b8a898" roughness={0.9} /></mesh>
            <mesh castShadow position={[0, 1.2, -1.2]}><boxGeometry args={[2.8, 2.4, 0.1]} /><meshStandardMaterial color="#a89888" roughness={0.9} /></mesh>
            <mesh position={[0, 2.4, 0]}><boxGeometry args={[0.3, 0.04, 0.3]} /><meshStandardMaterial color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.6} /></mesh>
          </group>
        )}
        <group ref={windowLightsRef}>
          {type === 'residential' && Array.from({ length: 3 }).map((_, i) => {
            const state = i===0 ? 'ON' : i===1 ? 'DIM' : 'OFF';
            const intensity = state==='OFF'?0:state==='DIM'?0.8:1.5;
            return (
              <group key={`wl-${i}`} position={[halfW - 1.2 - i*2.6, floorHeight + 2 + (i%2)*2.6, halfD + 0.1]}>
                <mesh userData={{ isWindowLit: true, lightState: state }}><planeGeometry args={[0.9, 0.9]} /><meshStandardMaterial color={state==='OFF'?'#1a1a2a':'#ffcc88'} emissive={state==='OFF'?'#000000':'#ffaa44'} emissiveIntensity={state==='OFF'?0:state==='DIM'?0.32:0.8} /></mesh>
                <pointLight position={[0,0,0.5]} intensity={0} distance={9} color="#ffcc88" decay={2} userData={{ baseIntensity: intensity, lightState: state }} />
              </group>
            );
          })}
        </group>
      </group>
    </RigidBody>
  );
}

export function Buildings() {
  return (
    <group>
      {BUILDINGS.map((b) => {
        if (b.id === 'abandoned_1') {
          return <AbandonedHouseReal key={b.id} def={b} />;
        }
        if (b.id === 'abandoned_2') {
          return <AbandonedHouse02Real key={b.id} def={b} />;
        }
        if (b.id === 'residential_2') {
          return <ShowcaseResidential key={b.id} def={b} />;
        }
        return <Building key={b.id} def={b} />;
      })}

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

      <RigidBody type="fixed" colliders="cuboid" position={[-110, 1, -32]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[20, 2.2, 0.35]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.95} />
        </mesh>
      </RigidBody>
      
      <group position={[-110, 1.5, -31.75]}>
        <mesh>
          <planeGeometry args={[4, 1.2]} />
          <meshStandardMaterial color="#aa2222" roughness={0.9} transparent opacity={0.6} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      </group>
    </group>
  );
}
