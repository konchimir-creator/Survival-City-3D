'use client';
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BuildingDef } from '@/game/world/types';

/**
 * Showcase realistic post-soviet residential building
 * Reference building - ONE quality showcase
 * Dimensions single source of truth
 */

// Dimensions - single source of truth per task
const DIMS = {
  width: 20, // X
  height: 18, // Y
  depth: 16, // Z
  floorHeight: 3.0, // 2.8-3.2
  plinthHeight: 0.6, // 0.4-0.8
  doorWidth: 1.1, // 0.9-1.2
  doorHeight: 2.15, // 2.0-2.2
  windowWidth: 1.3, // 1.2-1.6
  windowHeight: 1.5, // 1.3-1.7
  sillHeight: 0.9, // 0.8-1.0
  wallThickness: 0.35,
  stepHeight: 0.16, // 0.15-0.18
  recessDepth: 0.18,
};

export function ShowcaseResidential({ def }: { def: BuildingDef }) {
  const { position, rotation = 0 } = def;
  // Use DIMS as source, but allow def.size as fallback for placement check
  const width = DIMS.width;
  const height = DIMS.height;
  const depth = DIMS.depth;
  const floorHeight = DIMS.floorHeight;
  const floors = Math.floor(height / floorHeight); // 6
  const plinthHeight = DIMS.plinthHeight;
  const doorWidth = DIMS.doorWidth; // visual 1.1m
  const doorHeight = DIMS.doorHeight; // visual 2.15m
  const physicalDoorWidth = 1.4; // physical opening wider for capsule [0.65,0.35] clearance
  const physicalDoorHeight = 2.4;
  const wallThickness = DIMS.wallThickness;
  const stepHeight = DIMS.stepHeight;

  const doorX = 0;
  const doorZ = depth / 2;

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;

  // Front split for door opening - use physicalDoorWidth for clearance
  const frontLeftWidth = halfW - physicalDoorWidth / 2;
  const frontLeftHalfW = frontLeftWidth / 2;
  const frontLeftCenterX = -halfW + frontLeftHalfW;

  const frontRightHalfW = frontLeftHalfW;
  const frontRightCenterX = halfW - frontRightHalfW;

  const topHeight = height - physicalDoorHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = physicalDoorHeight + topHalfH;

  const entranceRaise = stepHeight * 2; // 0.32
  const visualFloorY = entranceRaise; // 0.32
  const floorColliderHalfH = 0.12;
  const floorPhysPosY = visualFloorY - floorColliderHalfH; // top = visualFloorY
  const floorPhysTopY = floorPhysPosY + floorColliderHalfH;

  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;

  // Windows layout
  const windowsPerFloor = 4;
  const windowSpacing = width / (windowsPerFloor + 1); // 4m

  // Generate window data for instancing
  const windowData = useMemo(() => {
    const list: { x: number, y: number, z: number, rotY: number, floorIdx: number, winIdx: number, lightState: string, isGround: boolean }[] = [];
    const rand = (seed: number) => {
      const s = Math.sin(seed * 999.123) * 10000;
      return s - Math.floor(s);
    };
    // Front facade
    for (let f = 0; f < floors; f++) {
      const y = plinthHeight + floorHeight / 2 + f * floorHeight;
      if (y > height - 0.8) continue;
      const isGround = f === 0;
      for (let w = 0; w < windowsPerFloor; w++) {
        const x = -halfW + windowSpacing * (w + 1);
        if (isGround && Math.abs(x - doorX) < 1.8) continue; // skip door
        const seed = f * 10 + w;
        const r = rand(seed + 1);
        let state = 'OFF';
        if (r < 0.45) state = 'OFF';
        else if (r < 0.72) state = 'DIM';
        else if (r < 0.88) state = 'WARM';
        else state = 'CURTAIN';
        list.push({ x, y, z: halfD, rotY: 0, floorIdx: f, winIdx: w, lightState: state, isGround });
      }
    }
    // Back facade
    for (let f = 0; f < floors; f++) {
      const y = plinthHeight + floorHeight / 2 + f * floorHeight;
      if (y > height - 0.8) continue;
      for (let w = 0; w < windowsPerFloor; w++) {
        const x = -halfW + windowSpacing * (w + 1);
        const seed = f * 10 + w + 100;
        const r = rand(seed + 1);
        let state = 'OFF';
        if (r < 0.5) state = 'OFF';
        else if (r < 0.75) state = 'DIM';
        else if (r < 0.9) state = 'WARM';
        else state = 'CURTAIN';
        list.push({ x, y, z: -halfD, rotY: Math.PI, floorIdx: f, winIdx: w + 20, lightState: state, isGround: f === 0 });
      }
    }
    // Side facades - 2 per floor
    for (let f = 0; f < floors; f++) {
      const y = plinthHeight + floorHeight / 2 + f * floorHeight;
      if (y > height - 0.8) continue;
      // Left side X = -halfW
      for (let s = 0; s < 2; s++) {
        const z = -halfD / 2 + s * halfD;
        const seed = f * 10 + s + 200;
        const r = rand(seed + 1);
        let state = 'OFF';
        if (r < 0.6) state = 'OFF';
        else if (r < 0.8) state = 'DIM';
        else if (r < 0.93) state = 'WARM';
        else state = 'CURTAIN';
        list.push({ x: -halfW, y, z, rotY: -Math.PI / 2, floorIdx: f, winIdx: s + 30, lightState: state, isGround: f === 0 });
      }
      // Right side X = halfW
      for (let s = 0; s < 2; s++) {
        const z = -halfD / 2 + s * halfD;
        const seed = f * 10 + s + 300;
        const r = rand(seed + 1);
        let state = 'OFF';
        if (r < 0.6) state = 'OFF';
        else if (r < 0.8) state = 'DIM';
        else if (r < 0.93) state = 'WARM';
        else state = 'CURTAIN';
        list.push({ x: halfW, y, z, rotY: Math.PI / 2, floorIdx: f, winIdx: s + 40, lightState: state, isGround: f === 0 });
      }
    }
    return list;
  }, []);

  // Split by light state for instanced glass
  const glassGroups = useMemo(() => {
    const groups: Record<string, typeof windowData> = { OFF: [], DIM: [], WARM: [], CURTAIN: [] };
    windowData.forEach(w => {
      groups[w.lightState].push(w);
    });
    return groups;
  }, [windowData]);

  // Materials
  const plasterMain = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8a898', roughness: 0.88 }), []);
  const plasterDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a89888', roughness: 0.90 }), []);
  const plinthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.92 }), []);
  const plinthDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.94 }), []);
  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a7a7a', roughness: 0.85 }), []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.75 }), []);
  const doorFrameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7, metalness: 0.2 }), []);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a4a4a', metalness: 0.6, roughness: 0.4 }), []);
  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8a8a', roughness: 0.8 }), []);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.6 }), []);
  const sillMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.7 }), []);
  const recessMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.9 }), []);

  const glassOffMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.25, metalness: 0.1 }), []);
  const glassDimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a5a4a', emissive: '#332211', emissiveIntensity: 0.25, roughness: 0.5 }), []);
  const glassWarmMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffcc88', emissive: '#ffaa44', emissiveIntensity: 0.85, roughness: 0.4 }), []);
  const glassCurtainMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3a4a', emissive: '#1a1a2a', emissiveIntensity: 0.08, roughness: 0.7 }), []);

  // Geometries reusable
  const frameGeom = useMemo(() => new THREE.BoxGeometry(DIMS.windowWidth + 0.12, DIMS.windowHeight + 0.12, 0.06), []);
  const glassGeom = useMemo(() => new THREE.PlaneGeometry(DIMS.windowWidth - 0.02, DIMS.windowHeight - 0.02), []);
  const sillGeom = useMemo(() => new THREE.BoxGeometry(DIMS.windowWidth + 0.2, 0.08, 0.14), []);
  const recessGeom = useMemo(() => new THREE.BoxGeometry(DIMS.windowWidth + 0.08, DIMS.windowHeight + 0.08, DIMS.recessDepth), []);

  // InstancedMesh refs
  const frameInstRef = useRef<THREE.InstancedMesh>(null);
  const sillInstRef = useRef<THREE.InstancedMesh>(null);
  const recessInstRef = useRef<THREE.InstancedMesh>(null);
  const glassOffRef = useRef<THREE.InstancedMesh>(null);
  const glassDimRef = useRef<THREE.InstancedMesh>(null);
  const glassWarmRef = useRef<THREE.InstancedMesh>(null);
  const glassCurtainRef = useRef<THREE.InstancedMesh>(null);

  // Set instanced matrices
  useEffect(() => {
    const dummy = new THREE.Object3D();
    // Frames
    if (frameInstRef.current) {
      windowData.forEach((w, i) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, w.rotY, 0);
        // Offset to avoid coplanar: frame slightly out
        const offset = 0.02;
        if (w.rotY === 0) dummy.position.z += offset;
        else if (Math.abs(w.rotY - Math.PI) < 0.01) dummy.position.z -= offset;
        else if (Math.abs(w.rotY + Math.PI/2) < 0.01) dummy.position.x -= offset;
        else if (Math.abs(w.rotY - Math.PI/2) < 0.01) dummy.position.x += offset;
        dummy.updateMatrix();
        frameInstRef.current!.setMatrixAt(i, dummy.matrix);
      });
      frameInstRef.current.instanceMatrix.needsUpdate = true;
    }
    // Sills
    if (sillInstRef.current) {
      windowData.forEach((w, i) => {
        dummy.position.set(w.x, w.y - DIMS.windowHeight/2 - 0.06, w.z);
        dummy.rotation.set(0, w.rotY, 0);
        const offset = 0.08;
        if (w.rotY === 0) { dummy.position.z += offset; }
        else if (Math.abs(w.rotY - Math.PI) < 0.01) { dummy.position.z -= offset; }
        else if (Math.abs(w.rotY + Math.PI/2) < 0.01) { dummy.position.x += offset; dummy.position.z += 0; }
        else if (Math.abs(w.rotY - Math.PI/2) < 0.01) { dummy.position.x -= offset; }
        // For side windows, sill offset along X
        if (Math.abs(w.rotY) > 0.1 && Math.abs(Math.abs(w.rotY) - Math.PI) > 0.1) {
          // side
          dummy.position.set(w.x, w.y - DIMS.windowHeight/2 - 0.06, w.z);
          if (w.rotY === Math.PI/2) { dummy.position.x += offset; }
          else { dummy.position.x -= offset; }
          dummy.rotation.set(0, w.rotY, 0);
        }
        dummy.updateMatrix();
        sillInstRef.current!.setMatrixAt(i, dummy.matrix);
      });
      sillInstRef.current.instanceMatrix.needsUpdate = true;
    }
    // Recess
    if (recessInstRef.current) {
      windowData.forEach((w, i) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, w.rotY, 0);
        const recessOffset = -DIMS.recessDepth/2 + 0.02;
        if (w.rotY === 0) dummy.position.z += recessOffset;
        else if (Math.abs(w.rotY - Math.PI) < 0.01) dummy.position.z -= recessOffset;
        else if (Math.abs(w.rotY + Math.PI/2) < 0.01) dummy.position.x -= recessOffset;
        else if (Math.abs(w.rotY - Math.PI/2) < 0.01) dummy.position.x += recessOffset;
        dummy.updateMatrix();
        recessInstRef.current!.setMatrixAt(i, dummy.matrix);
      });
      recessInstRef.current.instanceMatrix.needsUpdate = true;
    }
    // Glass groups
    const setGlassMatrices = (ref: React.RefObject<THREE.InstancedMesh>, data: typeof windowData) => {
      if (!ref.current) return;
      data.forEach((w, i) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, w.rotY, 0);
        const offset = 0.05;
        if (w.rotY === 0) dummy.position.z += offset;
        else if (Math.abs(w.rotY - Math.PI) < 0.01) dummy.position.z -= offset;
        else if (Math.abs(w.rotY + Math.PI/2) < 0.01) dummy.position.x -= offset;
        else if (Math.abs(w.rotY - Math.PI/2) < 0.01) dummy.position.x += offset;
        dummy.updateMatrix();
        ref.current!.setMatrixAt(i, dummy.matrix);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    };
    setGlassMatrices(glassOffRef, glassGroups.OFF);
    setGlassMatrices(glassDimRef, glassGroups.DIM);
    setGlassMatrices(glassWarmRef, glassGroups.WARM);
    setGlassMatrices(glassCurtainRef, glassGroups.CURTAIN);
  }, [windowData, glassGroups]);

  // Night emissive update for glass materials
  useFrame(() => {
    try {
      const tod = (window as any).__timeOfDay || 'day';
      const isNight = tod === 'night' || tod === 'evening' || tod === 'dawn';
      if (!isNight) {
        glassOffMat.color.set('#2a3a4a'); glassOffMat.emissive.set('#000000'); glassOffMat.emissiveIntensity = 0;
        glassDimMat.color.set('#2a3a4a'); glassDimMat.emissive.set('#000000'); glassDimMat.emissiveIntensity = 0;
        glassWarmMat.color.set('#2a3a4a'); glassWarmMat.emissive.set('#000000'); glassWarmMat.emissiveIntensity = 0;
        glassCurtainMat.color.set('#2a3a4a'); glassCurtainMat.emissive.set('#000000'); glassCurtainMat.emissiveIntensity = 0;
      } else {
        glassOffMat.color.set('#1a2a3a'); glassOffMat.emissive.set('#000000'); glassOffMat.emissiveIntensity = 0.03;
        glassDimMat.color.set('#6a5a4a'); glassDimMat.emissive.set('#332211'); glassDimMat.emissiveIntensity = 0.25;
        glassWarmMat.color.set('#ffcc88'); glassWarmMat.emissive.set('#ffaa44'); glassWarmMat.emissiveIntensity = 0.85;
        glassCurtainMat.color.set('#3a3a4a'); glassCurtainMat.emissive.set('#1a1a2a'); glassCurtainMat.emissiveIntensity = 0.08;
      }
    } catch {}
  });

  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setShowDebug(!!(window as any).__showDebug), 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Exterior colliders - full height 18m, derived from DIMS, door opening physically free */}
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      <CuboidCollider args={[frontRightHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      <CuboidCollider args={[physicalDoorWidth / 2, topHalfH, wallThickness / 2]} position={[doorX, topCenterY, frontZ]} />
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
      {/* Interior floor - top matches visual floor Y=0.32 within 1cm */}
      <CuboidCollider args={[floorHalfW, floorColliderHalfH, floorHalfD]} position={[0, floorPhysPosY, 0]} />
      {/* Interior vestibule walls - corridor 3m wide, not blocking door */}
      <CuboidCollider args={[0.15, 1.4, 1.5]} position={[-1.5, 1.4 + entranceRaise, halfD - 1.5]} />
      <CuboidCollider args={[0.15, 1.4, 1.5]} position={[1.5, 1.4 + entranceRaise, halfD - 1.5]} />
      <CuboidCollider args={[1.5, 1.4, 0.15]} position={[0, 1.4 + entranceRaise, halfD - 3]} />
      {/* Steps - make ramp collider for frozen player capsule to climb, visual steps remain */}
      {/* Visual steps at Y 0.08 and 0.24, but physical ramp from ground 0 to 0.32 over Z 0.5-0.9 */}
      <CuboidCollider args={[0.9, 0.05, 0.5]} position={[doorX, 0.05, doorZ + 0.65]} />
      <CuboidCollider args={[0.9, 0.05, 0.5]} position={[doorX, 0.20, doorZ + 0.35]} />
      {/* Invisible ramp over steps - flat enough for capsule */}
      <CuboidCollider args={[0.8, 0.16, 0.6]} position={[doorX, 0.16, doorZ + 0.45]} rotation={[ -0.3, 0, 0 ] as any} />

      <group>
        {/* Plinth 0.6m */}
        <mesh receiveShadow position={[0, plinthHeight/2, 0]}>
          <boxGeometry args={[width + 0.2, plinthHeight, depth + 0.2]} />
          <primitive object={plinthMat} attach="material" />
        </mesh>
        <mesh receiveShadow position={[0, 0.15, 0]}>
          <boxGeometry args={[width + 0.25, 0.3, depth + 0.25]} />
          <primitive object={plinthDark} attach="material" />
        </mesh>

        {/* Main volume */}
        <mesh castShadow receiveShadow position={[0, plinthHeight + (height - plinthHeight)/2, 0]}>
          <boxGeometry args={[width, height - plinthHeight, depth]} />
          <primitive object={plasterMain} attach="material" />
        </mesh>

        {/* Floor divisions */}
        {Array.from({ length: floors }).map((_, i) => {
          const y = plinthHeight + i * floorHeight;
          if (y > height - 0.15) return null;
          return (
            <mesh key={`floor-div-${i}`} castShadow receiveShadow position={[0, y, halfD + 0.03]}>
              <boxGeometry args={[width + 0.08, 0.12, 0.08]} />
              <meshStandardMaterial color={i === 0 ? '#6a6a6a' : '#9a8a7a'} roughness={0.85} />
            </mesh>
          );
        })}

        {/* Corner pilasters */}
        <mesh castShadow position={[-halfW - 0.02, halfH, 0]}><boxGeometry args={[0.18, height, depth + 0.08]} /><primitive object={concreteMat} attach="material" /></mesh>
        <mesh castShadow position={[halfW + 0.02, halfH, 0]}><boxGeometry args={[0.18, height, depth + 0.08]} /><primitive object={concreteMat} attach="material" /></mesh>

        {/* Wear patches - non-repeating moderate */}
        <mesh position={[0, 1.8, halfD + 0.04]}><boxGeometry args={[width*0.9, 1.2, 0.02]} /><meshStandardMaterial color="#8a7a6a" transparent opacity={0.22} roughness={0.95} /></mesh>
        <mesh position={[-4.2, 4.5, halfD + 0.04]}><boxGeometry args={[3.2, 2.1, 0.02]} /><meshStandardMaterial color="#a89888" transparent opacity={0.18} roughness={0.9} /></mesh>
        <mesh position={[5.3, 7.2, halfD + 0.04]}><boxGeometry args={[2.8, 1.6, 0.02]} /><meshStandardMaterial color="#c4b8a8" transparent opacity={0.14} roughness={0.9} /></mesh>
        <mesh position={[-2, 11.5, halfD + 0.04]}><boxGeometry args={[4, 1.2, 0.02]} /><meshStandardMaterial color="#9a8a7a" transparent opacity={0.10} roughness={0.92} /></mesh>
        <mesh position={[3, 14, halfD + 0.04]}><boxGeometry args={[2, 1.8, 0.02]} /><meshStandardMaterial color="#b8a898" transparent opacity={0.09} roughness={0.9} /></mesh>

        {/* Cornice */}
        <mesh castShadow position={[0, height + 0.15, 0]}><boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} /><meshStandardMaterial color="#2a2a2a" roughness={0.9} /></mesh>
        <mesh castShadow position={[0, height + 0.5, 0]}><boxGeometry args={[width + 0.15, 0.45, depth + 0.15]} /><primitive object={plasterDark} attach="material" /></mesh>

        {/* Drain pipes */}
        <mesh castShadow position={[halfW - 0.8, halfH, halfD + 0.12]}><cylinderGeometry args={[0.05, 0.05, height, 8]} /><primitive object={metalMat} attach="material" /></mesh>
        <mesh castShadow position={[-halfW + 0.8, halfH, halfD + 0.12]}><cylinderGeometry args={[0.05, 0.05, height, 8]} /><primitive object={metalMat} attach="material" /></mesh>

        {/* Instanced windows - optimized */}
        <instancedMesh ref={recessInstRef as any} args={[recessGeom, recessMat, windowData.length]} castShadow receiveShadow />
        <instancedMesh ref={frameInstRef as any} args={[frameGeom, frameMat, windowData.length]} castShadow />
        <instancedMesh ref={sillInstRef as any} args={[sillGeom, sillMat, windowData.length]} castShadow receiveShadow />
        {glassGroups.OFF.length > 0 && <instancedMesh ref={glassOffRef as any} args={[glassGeom, glassOffMat, glassGroups.OFF.length]} />}
        {glassGroups.DIM.length > 0 && <instancedMesh ref={glassDimRef as any} args={[glassGeom, glassDimMat, glassGroups.DIM.length]} />}
        {glassGroups.WARM.length > 0 && <instancedMesh ref={glassWarmRef as any} args={[glassGeom, glassWarmMat, glassGroups.WARM.length]} />}
        {glassGroups.CURTAIN.length > 0 && <instancedMesh ref={glassCurtainRef as any} args={[glassGeom, glassCurtainMat, glassGroups.CURTAIN.length]} />}

        {/* Entrance */}
        <group position={[doorX, 0, doorZ]}>
          <mesh receiveShadow position={[0, stepHeight/2, 0.5]}><boxGeometry args={[1.8, stepHeight, 0.9]} /><meshStandardMaterial color="#6a6a6a" roughness={0.9} /></mesh>
          <mesh receiveShadow position={[0, stepHeight + stepHeight/2, 0.35]}><boxGeometry args={[1.6, stepHeight, 0.6]} /><meshStandardMaterial color="#5a5a5a" roughness={0.9} /></mesh>
          <mesh castShadow position={[0, doorHeight/2 + entranceRaise, 0.06]}><boxGeometry args={[doorWidth + 0.18, doorHeight + 0.12, 0.12]} /><primitive object={doorFrameMat} attach="material" /></mesh>
          <mesh castShadow position={[0, doorHeight/2 + entranceRaise, 0.13]}><boxGeometry args={[doorWidth, doorHeight, 0.06]} /><primitive object={doorMat} attach="material" /></mesh>
          <mesh castShadow position={[0.32, doorHeight/2 + entranceRaise - 0.15, 0.17]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#b8a030" metalness={0.7} roughness={0.3} /></mesh>
          <group position={[0, 2.65 + entranceRaise, 0.5]}>
            <mesh castShadow><boxGeometry args={[1.8, 0.08, 1.1]} /><primitive object={canopyMat} attach="material" /></mesh>
            <mesh castShadow position={[-0.7, -0.4, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.8, 6]} /><primitive object={metalMat} attach="material" /></mesh>
            <mesh castShadow position={[0.7, -0.4, 0.3]}><cylinderGeometry args={[0.03, 0.03, 0.8, 6]} /><primitive object={metalMat} attach="material" /></mesh>
          </group>
          <group position={[-0.9, 1.8 + entranceRaise, 0.12]}>
            <mesh><boxGeometry args={[0.35, 0.25, 0.02]} /><meshStandardMaterial color="#2a5a8a" /></mesh>
            <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.25, 0.18]} /><meshStandardMaterial color="white" /></mesh>
          </group>
          <mesh castShadow position={[0.85, 1.2 + entranceRaise, 0.12]}><boxGeometry args={[0.18, 0.28, 0.04]} /><primitive object={metalMat} attach="material" /></mesh>
          <group position={[0, 2.2 + entranceRaise, 0.18]}>
            <mesh castShadow><cylinderGeometry args={[0.08, 0.08, 0.06, 8]} /><primitive object={metalMat} attach="material" /></mesh>
            <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ffcc88" emissive="#ffaa44" emissiveIntensity={0.6} /></mesh>
          </group>
          <mesh position={[0, 0.02, 0.6]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[1.2, 0.5]} /><meshStandardMaterial color="#3a3a3a" transparent opacity={0.22} roughness={0.95} /></mesh>
        </group>

        <group position={[2.5, 0.02, halfD + 0.8]}>
          <mesh castShadow position={[0, 0.45, 0]}><cylinderGeometry args={[0.28, 0.28, 0.9, 12]} /><meshStandardMaterial color="#3a3a3a" roughness={0.85} /></mesh>
          <mesh castShadow position={[0, 0.92, 0]}><cylinderGeometry args={[0.30, 0.30, 0.06, 12]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
        </group>

        {/* Interior vestibule */}
        <group position={[0, entranceRaise, halfD - 1.5]}>
          <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#8a8a8a" roughness={0.85} /></mesh>
          <mesh castShadow position={[-1.5, 1.4, 0]}><boxGeometry args={[0.12, 2.8, 3]} /><meshStandardMaterial color="#c4b8a8" roughness={0.9} /></mesh>
          <mesh castShadow position={[1.5, 1.4, 0]}><boxGeometry args={[0.12, 2.8, 3]} /><meshStandardMaterial color="#c4b8a8" roughness={0.9} /></mesh>
          <mesh castShadow position={[0, 1.4, -1.5]}><boxGeometry args={[3, 2.8, 0.12]} /><meshStandardMaterial color="#b8a898" roughness={0.9} /></mesh>
          <mesh receiveShadow position={[0, 2.8, 0]} rotation={[Math.PI/2, 0, 0]}><planeGeometry args={[3, 3]} /><meshStandardMaterial color="#e8e8e8" roughness={0.85} /></mesh>
          <mesh position={[0, 2.7, 0]}><boxGeometry args={[0.4, 0.05, 0.4]} /><meshStandardMaterial color="#ffffcc" emissive="#ffcc88" emissiveIntensity={0.7} /></mesh>
          <mesh position={[0, 1.2, 1.5]}><boxGeometry args={[1.2, 2.15, 0.08]} /><meshStandardMaterial color="#3a2a1a" roughness={0.8} /></mesh>
        </group>

        {/* Debug colliders visualization via F3 */}
        {showDebug && (
          <group>
            <mesh position={[frontLeftCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, height, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.25} /></mesh>
            <mesh position={[frontRightCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, height, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.25} /></mesh>
            <mesh position={[0, topCenterY, frontZ]}><boxGeometry args={[physicalDoorWidth, topHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.25} /></mesh>
            <mesh position={[0, physicalDoorHeight/2, frontZ]}><boxGeometry args={[physicalDoorWidth, physicalDoorHeight, 0.1]} /><meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.5} /></mesh>
            <mesh position={[0, floorPhysPosY, 0]}><boxGeometry args={[floorHalfW*2, floorColliderHalfH*2, floorHalfD*2]} /><meshBasicMaterial color="#0000ff" wireframe transparent opacity={0.2} /></mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
}
