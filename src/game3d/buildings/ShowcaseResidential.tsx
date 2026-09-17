'use client';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BuildingDef } from '@/game/world/types';

/**
 * Showcase realistic post-soviet residential building
 * One quality reference building, 1 unit = 1 meter
 * - Floor 2.8-3.2m (using 3m)
 * - Door 2.15m x 1.1m
 * - Window 1.3x1.5m sill 0.9m
 * - Plinth 0.6m
 * - Steps 0.16m
 * - Door opening physically free via compound CuboidColliders
 * - Small interior vestibule first floor
 */

function WindowSet({ x, y, z, isGroundFloor, floorIndex, windowIndex }: { x: number, y: number, z: number, isGroundFloor?: boolean, floorIndex: number, windowIndex: number }) {
  // Random but deterministic based on floor/window index
  const seed = floorIndex * 10 + windowIndex;
  const rand = (n: number) => {
    const s = Math.sin(seed * 999 + n * 123) * 10000;
    return s - Math.floor(s);
  };
  const lightState = useMemo(() => {
    const r = rand(1);
    if (r < 0.45) return 'OFF';
    if (r < 0.72) return 'DIM';
    if (r < 0.88) return 'WARM';
    return 'CURTAIN';
  }, []);

  const windowWidth = isGroundFloor ? 1.1 : 1.3;
  const windowHeight = isGroundFloor ? 1.2 : 1.5;
  const frameThickness = 0.06;
  const recessDepth = 0.18;

  const glassMat = useMemo(() => {
    let color = '#2f3f4f';
    let emissive = '#000000';
    let emissiveIntensity = 0;
    let roughness = 0.25;
    if (lightState === 'WARM') {
      color = '#ffcc88';
      emissive = '#ffaa44';
      emissiveIntensity = 0.85;
      roughness = 0.4;
    } else if (lightState === 'DIM') {
      color = '#6a5a4a';
      emissive = '#332211';
      emissiveIntensity = 0.25;
      roughness = 0.5;
    } else if (lightState === 'CURTAIN') {
      color = '#3a3a4a';
      emissive = '#1a1a2a';
      emissiveIntensity = 0.08;
      roughness = 0.7;
    } else {
      color = '#2a3a4a';
      emissive = '#000000';
      emissiveIntensity = 0;
      roughness = 0.25;
    }
    return new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness,
      metalness: 0.1,
      transparent: lightState === 'OFF' ? false : false,
    });
  }, [lightState]);

  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.6, metalness: 0.1 }), []);
  const sillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.7 }), []);
  const recessMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.9 }), []);

  // For night emissive update via useFrame
  const glassRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      if (glassRef.current) {
        if (!isNight) {
          // Day: dark glass
          glassRef.current.color.set('#2a3a4a');
          glassRef.current.emissive.set('#000000');
          glassRef.current.emissiveIntensity = 0;
        } else {
          if (lightState === 'WARM') {
            glassRef.current.color.set('#ffcc88');
            glassRef.current.emissive.set('#ffaa44');
            glassRef.current.emissiveIntensity = 0.85;
          } else if (lightState === 'DIM') {
            glassRef.current.color.set('#6a5a4a');
            glassRef.current.emissive.set('#332211');
            glassRef.current.emissiveIntensity = 0.25;
          } else if (lightState === 'CURTAIN') {
            glassRef.current.color.set('#3a3a4a');
            glassRef.current.emissive.set('#1a1a2a');
            glassRef.current.emissiveIntensity = 0.08;
          } else {
            glassRef.current.color.set('#1a2a3a');
            glassRef.current.emissive.set('#000000');
            glassRef.current.emissiveIntensity = 0.03;
          }
        }
      }
    } catch {}
  });

  return (
    <group position={[x, y, z]}>
      {/* Recess - dark interior depth */}
      <mesh position={[0, 0, -recessDepth/2 + 0.02]} castShadow receiveShadow>
        <boxGeometry args={[windowWidth + 0.08, windowHeight + 0.08, recessDepth]} />
        <primitive object={recessMat} attach="material" />
      </mesh>
      {/* Frame - outer */}
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[windowWidth + frameThickness*2, windowHeight + frameThickness*2, 0.06]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      {/* Frame inner cross - for realism */}
      <mesh position={[0, 0, 0.03]} castShadow>
        <boxGeometry args={[windowWidth, 0.04, 0.04]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.03]} castShadow>
        <boxGeometry args={[0.04, windowHeight, 0.04]} />
        <primitive object={frameMat} attach="material" />
      </mesh>
      {/* Glass */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[windowWidth - 0.02, windowHeight - 0.02]} />
        <primitive object={glassMat} attach="material" ref={glassRef as any} />
      </mesh>
      {/* Sill */}
      <mesh position={[0, -windowHeight/2 - 0.06, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[windowWidth + 0.2, 0.08, 0.14]} />
        <primitive object={sillMat} attach="material" />
      </mesh>
      {/* Small streak/dirt under window - controlled wear */}
      {rand(2) > 0.6 && (
        <mesh position={[0, -windowHeight/2 - 0.18, 0.03]}>
          <planeGeometry args={[0.3, 0.25]} />
          <meshStandardMaterial color="#3a3a3a" transparent opacity={0.18} roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

export function ShowcaseResidential({ def }: { def: BuildingDef }) {
  const { position, size, rotation = 0 } = def;
  // size [20,18,16] => W 20, H 18, D 16
  const width = size[0];
  const height = size[1];
  const depth = size[2];

  const floorHeight = 3.0;
  const floors = Math.floor(height / floorHeight); // 6
  const plinthHeight = 0.6;
  const doorWidth = 1.1;
  const doorHeight = 2.15;
  const doorX = 0; // centered on front facade, matches collider opening
  const doorZ = depth / 2;

  const wallThickness = 0.35;

  // Materials - post-soviet plaster with close shades
  const plasterMain = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8a898', roughness: 0.88, metalness: 0.02 }), []);
  const plasterDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a89888', roughness: 0.90 }), []);
  const plasterLight = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c4b8a8', roughness: 0.86 }), []);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.92, metalness: 0.05 }), []);
  const plinthDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.94 }), []);
  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a7a7a', roughness: 0.85 }), []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.75, metalness: 0.05 }), []);
  const doorFrameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7, metalness: 0.2 }), []);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a4a4a', metalness: 0.6, roughness: 0.4 }), []);
  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8a8a', roughness: 0.8 }), []);

  // Collider calculations - door opening physically free, matches visual door at X=0
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;

  const frontLeftWidth = halfW - doorWidth / 2;
  const frontLeftHalfW = frontLeftWidth / 2;
  const frontLeftCenterX = -halfW + frontLeftHalfW;

  const frontRightWidth = frontLeftWidth;
  const frontRightHalfW = frontLeftHalfW;
  const frontRightCenterX = halfW - frontRightHalfW;

  const topHeight = height - doorHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = doorHeight + topHalfH;

  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;

  // Windows layout: 4 windows per floor across width 20m
  // Spacing: width 20, windows 1.3 each, 4 windows = 5.2, gaps ~ (20-5.2)/5 = 2.96
  const windowsPerFloor = 4;
  const windowSpacing = width / (windowsPerFloor + 1); // 4m

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Compound colliders - door opening free, matches visual door at X=0 */}
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      <CuboidCollider args={[frontRightHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      <CuboidCollider args={[doorWidth / 2, topHalfH, wallThickness / 2]} position={[doorX, topCenterY, frontZ]} />
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
      {/* Interior floor - walkable inside */}
      <CuboidCollider args={[floorHalfW, 0.1, floorHalfD]} position={[0, 0.15, 0]} />
      {/* Interior vestibule walls */}
      <CuboidCollider args={[0.15, 1.4, 1.5]} position={[-1.5, 1.4, halfD - 1.5]} />
      <CuboidCollider args={[0.15, 1.4, 1.5]} position={[1.5, 1.4, halfD - 1.5]} />
      <CuboidCollider args={[1.5, 1.4, 0.15]} position={[0, 1.4, halfD - 3]} />

      <group>
        {/* Foundation / Plinth - 0.6m darker */}
        <mesh receiveShadow position={[0, plinthHeight/2, 0]}>
          <boxGeometry args={[width + 0.2, plinthHeight, depth + 0.2]} />
          <primitive object={plinthMat} attach="material" />
        </mesh>
        {/* Plinth darker bottom edge */}
        <mesh receiveShadow position={[0, 0.15, 0]}>
          <boxGeometry args={[width + 0.25, 0.3, depth + 0.25]} />
          <primitive object={plinthDark} attach="material" />
        </mesh>

        {/* Main building volume - split into plaster shades for controlled wear */}
        <mesh castShadow receiveShadow position={[0, plinthHeight + (height - plinthHeight)/2, 0]}>
          <boxGeometry args={[width, height - plinthHeight, depth]} />
          <primitive object={plasterMain} attach="material" />
        </mesh>

        {/* Floor divisions - architectural separation */}
        {Array.from({ length: floors }).map((_, i) => {
          const y = plinthHeight + i * floorHeight;
          if (y > height - 0.2) return null;
          return (
            <mesh key={`floor-div-${i}`} castShadow receiveShadow position={[0, y, depth/2 + 0.03]}>
              <boxGeometry args={[width + 0.08, 0.12, 0.08]} />
              <meshStandardMaterial color={i === 0 ? '#6a6a6a' : '#9a8a7a'} roughness={0.85} />
            </mesh>
          );
        })}

        {/* Vertical corner pilasters - neat corners */}
        <mesh castShadow position={[-width/2 - 0.02, height/2, 0]}><boxGeometry args={[0.18, height, depth + 0.08]} /><primitive object={concreteMat} attach="material" /></mesh>
        <mesh castShadow position={[width/2 + 0.02, height/2, 0]}><boxGeometry args={[0.18, height, depth + 0.08]} /><primitive object={concreteMat} attach="material" /></mesh>

        {/* Facade wear patches - darker lower part, faded plaster */}
        <mesh position={[0, 1.8, depth/2 + 0.04]}><boxGeometry args={[width*0.9, 1.2, 0.02]} /><meshStandardMaterial color="#8a7a6a" transparent opacity={0.22} roughness={0.95} /></mesh>
        <mesh position={[-4, 4.5, depth/2 + 0.04]}><boxGeometry args={[3, 2, 0.02]} /><meshStandardMaterial color="#a89888" transparent opacity={0.25} roughness={0.9} /></mesh>
        <mesh position={[5, 7, depth/2 + 0.04]}><boxGeometry args={[2.5, 1.8, 0.02]} /><meshStandardMaterial color="#c4b8a8" transparent opacity={0.18} roughness={0.9} /></mesh>
        <mesh position={[0, 12, depth/2 + 0.04]}><boxGeometry args={[width*0.7, 1.5, 0.02]} /><meshStandardMaterial color="#9a8a7a" transparent opacity={0.12} roughness={0.92} /></mesh>

        {/* Cornice / Parapet roof */}
        <mesh castShadow position={[0, height + 0.15, 0]}><boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} /><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></mesh>
        <mesh castShadow position={[0, height + 0.5, 0]}><boxGeometry args={[width + 0.15, 0.45, depth + 0.15]} /><primitive object={plasterDark} attach="material" /></mesh>

        {/* Drain pipe - vertical */}
        <mesh castShadow position={[width/2 - 0.8, height/2, depth/2 + 0.12]}><cylinderGeometry args={[0.05, 0.05, height, 8]} /><primitive object={metalMat} attach="material" /></mesh>
        <mesh castShadow position={[-width/2 + 0.8, height/2, depth/2 + 0.12]}><cylinderGeometry args={[0.05, 0.05, height, 8]} /><primitive object={metalMat} attach="material" /></mesh>

        {/* Windows - front facade */}
        {Array.from({ length: floors }).map((_, floorIdx) => {
          const isGround = floorIdx === 0;
          const y = plinthHeight + floorHeight/2 + floorIdx * floorHeight;
          if (y > height - 1) return null;
          return Array.from({ length: windowsPerFloor }).map((_, winIdx) => {
            // Skip door position on ground floor center
            if (isGround && winIdx === Math.floor(windowsPerFloor/2)) {
              // Door is at center, skip window at door position, but keep side windows
              // For 4 windows, indices 0,1,2,3 center between 1 and 2 is door, so skip none? Actually door at 0, windows at -7.5,-2.5,2.5,7.5? Let's place windows avoiding door
              // Door at 0 width 1.1, windows at spacing 4m: -6,-2,2,6 -> windows at -2 and 2 are close to door (2m away) okay, but we should skip if too close
              const wx = -width/2 + windowSpacing * (winIdx + 1);
              if (Math.abs(wx - doorX) < 1.8) return null; // avoid door
            }
            const wx = -width/2 + windowSpacing * (winIdx + 1);
            return <WindowSet key={`win-f${floorIdx}-w${winIdx}`} x={wx} y={y} z={depth/2} isGroundFloor={isGround} floorIndex={floorIdx} windowIndex={winIdx} />;
          });
        })}

        {/* Side facade windows - fewer */}
        {Array.from({ length: floors }).map((_, floorIdx) => {
          const y = plinthHeight + floorHeight/2 + floorIdx * floorHeight;
          if (y > height - 1) return null;
          return [ -1, 1 ].map((side, sIdx) => (
            <WindowSet key={`side-win-${floorIdx}-${sIdx}`} x={side * (width/2)} y={y} z={0} floorIndex={floorIdx} windowIndex={sIdx+10} />
          ));
        })}

        {/* Back facade windows */}
        {Array.from({ length: floors }).map((_, floorIdx) => {
          const y = plinthHeight + floorHeight/2 + floorIdx * floorHeight;
          if (y > height - 1) return null;
          return Array.from({ length: windowsPerFloor }).map((_, winIdx) => {
            const wx = -width/2 + windowSpacing * (winIdx + 1);
            return <WindowSet key={`back-win-${floorIdx}-${winIdx}`} x={wx} y={y} z={-depth/2} floorIndex={floorIdx} windowIndex={winIdx+20} />;
          });
        })}

        {/* Entrance - door, frame, canopy, steps */}
        <group position={[doorX, 0, doorZ]}>
          {/* Steps - 2 steps 0.16m each */}
          <mesh receiveShadow position={[0, 0.08, 0.5]}><boxGeometry args={[1.8, 0.16, 0.9]} /><meshStandardMaterial color="#6a6a6a" roughness={0.9} /></mesh>
          <mesh receiveShadow position={[0, 0.24, 0.35]}><boxGeometry args={[1.6, 0.16, 0.6]} /><meshStandardMaterial color="#5a5a5a" roughness={0.9} /></mesh>
          {/* Door frame */}
          <mesh castShadow position={[0, doorHeight/2 + 0.32, 0.06]}><boxGeometry args={[doorWidth + 0.18, doorHeight + 0.12, 0.12]} /><primitive object={doorFrameMat} attach="material" /></mesh>
          {/* Door */}
          <mesh castShadow position={[0, doorHeight/2 + 0.32, 0.13]}><boxGeometry args={[doorWidth, doorHeight, 0.06]} /><primitive object={doorMat} attach="material" /></mesh>
          {/* Door handle */}
          <mesh castShadow position={[0.32, doorHeight/2 + 0.2, 0.17]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#b8a030" metalness={0.7} roughness={0.3} /></mesh>
          {/* Canopy above entrance */}
          <group position={[0, 2.65, 0.5]}>
            <mesh castShadow><boxGeometry args={[1.8, 0.08, 1.1]} /><primitive object={canopyMat} attach="material" /></mesh>
            <mesh castShadow position={[-0.7, -0.4, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.8, 6]} /><primitive object={metalMat} attach="material" /></mesh>
            <mesh castShadow position={[0.7, -0.4, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.8, 6]} /><primitive object={metalMat} attach="material" /></mesh>
          </group>
          {/* House number */}
          <group position={[-0.9, 1.8, 0.12]}>
            <mesh><boxGeometry args={[0.35, 0.25, 0.02]} /><meshStandardMaterial color="#2a5a8a" /></mesh>
            <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.25, 0.18]} /><meshStandardMaterial color="white" /></mesh>
          </group>
          {/* Intercom panel */}
          <mesh castShadow position={[0.85, 1.2, 0.12]}><boxGeometry args={[0.18, 0.28, 0.04]} /><primitive object={metalMat} attach="material" /></mesh>
          {/* Outdoor light */}
          <group position={[0, 2.2, 0.18]}>
            <mesh castShadow><cylinderGeometry args={[0.08, 0.08, 0.06, 8]} /><primitive object={metalMat} attach="material" /></mesh>
            <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ffcc88" emissive="#ffaa44" emissiveIntensity={0.6} /></mesh>
          </group>
          {/* Dirt at threshold */}
          <mesh position={[0, 0.02, 0.6]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.2, 0.5]} /><meshStandardMaterial color="#3a3a3a" transparent opacity={0.22} roughness={0.95} /></mesh>
        </group>

        {/* Trash urn near entrance */}
        <group position={[2.5, 0.02, depth/2 + 0.8]}>
          <mesh castShadow position={[0, 0.45, 0]}><cylinderGeometry args={[0.28, 0.28, 0.9, 12]} /><meshStandardMaterial color="#3a3a3a" roughness={0.85} /></mesh>
          <mesh castShadow position={[0, 0.92, 0]}><cylinderGeometry args={[0.30, 0.30, 0.06, 12]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
        </group>

        {/* Interior - small vestibule first floor */}
        <group position={[0, 0.32, depth/2 - 1.5]}>
          {/* Interior floor */}
          <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#8a8a8a" roughness={0.85} /></mesh>
          {/* Interior walls */}
          <mesh castShadow position={[-1.5, 1.4, 0]}><boxGeometry args={[0.12, 2.8, 3]} /><meshStandardMaterial color="#c4b8a8" roughness={0.9} /></mesh>
          <mesh castShadow position={[1.5, 1.4, 0]}><boxGeometry args={[0.12, 2.8, 3]} /><meshStandardMaterial color="#c4b8a8" roughness={0.9} /></mesh>
          <mesh castShadow position={[0, 1.4, -1.5]}><boxGeometry args={[3, 2.8, 0.12]} /><meshStandardMaterial color="#b8a898" roughness={0.9} /></mesh>
          {/* Ceiling */}
          <mesh receiveShadow position={[0, 2.8, 0]} rotation={[Math.PI/2, 0, 0]}><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#e8e8e8" roughness={0.85} /></mesh>
          {/* Ceiling light emissive */}
          <mesh position={[0, 2.7, 0]}><boxGeometry args={[0.4, 0.05, 0.4]} /><meshStandardMaterial color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.7} /></mesh>
          {/* Inner side of entrance door frame */}
          <mesh position={[0, 1.2, 1.5]}><boxGeometry args={[1.2, 2.15, 0.08]} /><meshStandardMaterial color="#3a2a1a" roughness={0.8} /></mesh>
        </group>
      </group>
    </RigidBody>
  );
}
