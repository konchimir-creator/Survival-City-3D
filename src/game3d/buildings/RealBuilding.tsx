'use client';
import React, { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BuildingDef } from '@/game/world/types';
import { computeBuildingDimensions, logBuildingDimensions } from './buildingModelUtils';
import { BUILDING_ASSETS } from './buildingAssetRegistry';

// ErrorBoundary to prevent GLB crash -> black screen
class BuildingErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode, url: string }, { hasError: boolean, error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any) {
    console.error('[RealBuilding] GLB failed', error, 'url:', this.props.url);
  }
  render() {
    if (this.state.hasError) {
      console.error('[RealBuilding] GLB failed, using fallback', this.state.error);
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function useBuildingGLBExists(url: string) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      // Try HEAD first, then GET fallback (some servers don't support HEAD for static)
      try {
        console.log(`[RealBuilding] Checking HEAD ${url}`);
        const headRes = await fetch(url, { method: 'HEAD' });
        if (cancelled) return;
        console.log(`[RealBuilding] HEAD ${url} -> ${headRes.status} ${headRes.headers.get('content-type')} ${headRes.headers.get('content-length')}`);
        if (headRes.ok) {
          setExists(true);
          return;
        }
        // HEAD not ok, try GET
        console.log(`[RealBuilding] HEAD not ok, trying GET ${url}`);
        const getRes = await fetch(url, { method: 'GET' });
        if (cancelled) return;
        console.log(`[RealBuilding] GET ${url} -> ${getRes.status} ${getRes.headers.get('content-type')} ${getRes.headers.get('content-length')}`);
        if (getRes.ok) {
          setExists(true);
          // Consume body to avoid memory leak? We just checked, let it go
          try { await getRes.blob(); } catch {}
          return;
        }
        setExists(false);
      } catch (e) {
        if (cancelled) return;
        console.log(`[RealBuilding] Check failed for ${url}, trying GET fallback`, e);
        try {
          const getRes2 = await fetch(url, { method: 'GET' });
          if (cancelled) return;
          console.log(`[RealBuilding] GET fallback ${url} -> ${getRes2.status}`);
          setExists(getRes2.ok);
        } catch (e2) {
          if (cancelled) return;
          console.log(`[RealBuilding] Both HEAD and GET failed for ${url}`, e2);
          setExists(false);
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [url]);

  return exists;
}

// Inner GLB loader with full diagnostics - FIXED for real production Box3
function GLBInner({ url, def }: { url: string; def: BuildingDef }) {
  const gltf = useGLTF(url) as any;
  const loggedRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);

  const diagnostics = useMemo(() => {
    try {
      const scene = gltf.scene;
      if (!scene) {
        console.error('[RealBuilding] gltf.scene is null/undefined', url);
        return null;
      }

      const cloned = scene.clone(true);

      let meshCount = 0;
      let triangleCount = 0;
      const materials = new Set<string>();
      const materialList: string[] = [];
      let textureCount = 0;
      let visibleMeshes = 0;
      let invisibleMeshes = 0;

      cloned.traverse((child: any) => {
        if (child.isMesh) {
          meshCount++;
          if (child.visible) visibleMeshes++; else invisibleMeshes++;
          const geom = child.geometry;
          if (geom) {
            if (geom.index) triangleCount += geom.index.count / 3;
            else if (geom.attributes?.position) triangleCount += geom.attributes.position.count / 3;
          }
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              const name = m.name || m.type || 'unnamed';
              if (!materials.has(name)) { materials.add(name); materialList.push(name); }
              if (m.map) textureCount++;
              if (m.normalMap) textureCount++;
              if (m.roughnessMap) textureCount++;
              if (m.metalnessMap) textureCount++;
              if (m.emissiveMap) textureCount++;
            });
          }
          if (child.position && (isNaN(child.position.x) || isNaN(child.position.y) || isNaN(child.position.z))) {
            console.warn('[RealBuilding] Mesh NaN position', child.name);
          }
        }
      });

      // Box3 BEFORE any transform
      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const raw = {
        minX: box.min.x, minY: box.min.y, minZ: box.min.z,
        maxX: box.max.x, maxY: box.max.y, maxZ: box.max.z,
        width: size.x, height: size.y, depth: size.z,
        centerX: center.x, centerY: center.y, centerZ: center.z,
      };

      // Center model horizontally to handle asymmetric raw Box3 (centerX -0.064 etc)
      // Keep vertical as is because minY≈0
      // Translate cloned so its center XZ is at 0,0, bottom stays at minY
      const offsetX = -raw.centerX;
      const offsetZ = -raw.centerZ;
      // Apply offset to cloned scene position, not to each mesh, to keep Box3 centered
      cloned.position.set(offsetX, 0, offsetZ);

      // Recompute Box3 after centering for final size check
      const centeredBox = new THREE.Box3().setFromObject(cloned);
      const centeredSize = new THREE.Vector3();
      centeredBox.getSize(centeredSize);

      // Shadows, no culling for diagnosis
      cloned.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
          if (child.material) child.material.needsUpdate = true;
        }
      });

      return {
        clonedScene: cloned,
        meshCount,
        triangleCount: Math.round(triangleCount),
        materials: materialList,
        materialCount: materialList.length,
        textureCount,
        visibleMeshes,
        invisibleMeshes,
        raw,
        centeredSize,
        offsetX,
        offsetZ,
        box,
        size,
        center,
      };
    } catch (e) {
      console.error('[RealBuilding] Diagnostics failed', e);
      return null;
    }
  }, [gltf.scene, url]);

  const finalTransform = useMemo(() => {
    if (!diagnostics) return { scale: 14.8, rotation: 0, yOffset: 0, width: 0.621, height: 0.912, depth: 0.571, raw: null as any };
    const { raw } = diagnostics;
    const assetConfig = BUILDING_ASSETS.find(a => a.url === url || a.id === 'abandoned_house_01');

    let finalScale: number | [number, number, number] = assetConfig?.scale || 14.8;
    let finalRotation = assetConfig?.rotation || 0;
    let finalYOffset = 0;

    const minY = raw.minY;
    if (Math.abs(minY) > 0.01) {
      finalYOffset = -minY;
      console.log(`[RealBuilding] Auto yOffset: minY ${minY.toFixed(3)} -> ${finalYOffset.toFixed(3)}`);
    }
    if (assetConfig?.yOffset && assetConfig.yOffset !== 0) finalYOffset = assetConfig.yOffset;

    return {
      scale: finalScale,
      rotation: finalRotation,
      yOffset: finalYOffset,
      width: raw.width,
      height: raw.height,
      depth: raw.depth,
      raw,
    };
  }, [diagnostics, url]);

  useEffect(() => {
    if (!diagnostics || loggedRef.current) return;
    loggedRef.current = true;

    console.info('[RealBuilding] GLB loaded');
    console.info(`url: ${url}`);
    console.info(`meshCount: ${diagnostics.meshCount}`);
    console.info(`triangles: ${diagnostics.triangleCount}`);
    console.info(`materials: ${diagnostics.materialCount} [${diagnostics.materials.join(', ')}]`);
    console.info(`textures: ${diagnostics.textureCount}`);
    console.info(`visibleMeshes: ${diagnostics.visibleMeshes} invisibleMeshes: ${diagnostics.invisibleMeshes}`);
    console.info(`Box3 raw: minX ${diagnostics.raw.minX.toFixed(3)} minY ${diagnostics.raw.minY.toFixed(3)} minZ ${diagnostics.raw.minZ.toFixed(3)} maxX ${diagnostics.raw.maxX.toFixed(3)} maxY ${diagnostics.raw.maxY.toFixed(3)} maxZ ${diagnostics.raw.maxZ.toFixed(3)}`);
    console.info(`size raw: W ${diagnostics.raw.width.toFixed(3)} H ${diagnostics.raw.height.toFixed(3)} D ${diagnostics.raw.depth.toFixed(3)}`);
    console.info(`center raw: X ${diagnostics.raw.centerX.toFixed(3)} Y ${diagnostics.raw.centerY.toFixed(3)} Z ${diagnostics.raw.centerZ.toFixed(3)} offsetX ${diagnostics.offsetX.toFixed(3)} offsetZ ${diagnostics.offsetZ.toFixed(3)}`);
    const scaleNum = typeof finalTransform.scale === 'number' ? finalTransform.scale as number : 14.8;
    console.info(`expected world size after scale ${scaleNum}: W ${(diagnostics.raw.width * scaleNum).toFixed(2)} H ${(diagnostics.raw.height * scaleNum).toFixed(2)} D ${(diagnostics.raw.depth * scaleNum).toFixed(2)}`);
    console.info(`scale: ${typeof finalTransform.scale === 'number' ? finalTransform.scale : JSON.stringify(finalTransform.scale)} rotation: ${finalTransform.rotation} yOffset: ${finalTransform.yOffset}`);
    console.info(`scene.visible: ${gltf.scene.visible}`);

    (window as any).__buildingDims = (window as any).__buildingDims || {};
    (window as any).__buildingDims[def.id] = {
      width: diagnostics.raw.width,
      height: diagnostics.raw.height,
      depth: diagnostics.raw.depth,
      min: { x: diagnostics.raw.minX, y: diagnostics.raw.minY, z: diagnostics.raw.minZ },
      max: { x: diagnostics.raw.maxX, y: diagnostics.raw.maxY, z: diagnostics.raw.maxZ },
      meshCount: diagnostics.meshCount,
      triangles: diagnostics.triangleCount,
      materials: diagnostics.materials,
      offsetX: diagnostics.offsetX,
      offsetZ: diagnostics.offsetZ,
      scale: finalTransform.scale,
    };
    (window as any).__lastBuildingDims = `${def.id}: raw ${diagnostics.raw.width.toFixed(3)}x${diagnostics.raw.height.toFixed(3)}x${diagnostics.raw.depth.toFixed(3)} -> world ${(diagnostics.raw.width * scaleNum).toFixed(1)}x${(diagnostics.raw.height * scaleNum).toFixed(1)}x${(diagnostics.raw.depth * scaleNum).toFixed(1)}m meshes:${diagnostics.meshCount} tris:${diagnostics.triangleCount} scale:${scaleNum} yOff:${finalTransform.yOffset.toFixed(2)} rot:${finalTransform.rotation.toFixed(2)}`;

    logBuildingDimensions(def.id, {
      width: diagnostics.raw.width * scaleNum,
      height: diagnostics.raw.height * scaleNum,
      depth: diagnostics.raw.depth * scaleNum,
      center: new THREE.Vector3(0, diagnostics.raw.height * scaleNum / 2, 0),
      min: new THREE.Vector3(-diagnostics.raw.width * scaleNum / 2, 0, -diagnostics.raw.depth * scaleNum / 2),
      max: new THREE.Vector3(diagnostics.raw.width * scaleNum / 2, diagnostics.raw.height * scaleNum, diagnostics.raw.depth * scaleNum / 2),
    } as any);

  }, [diagnostics, finalTransform, url, def.id, gltf.scene]);

  if (!diagnostics) return null;

  return (
    <group
      ref={groupRef}
      position={[0, finalTransform.yOffset, 0]}
      rotation={[0, finalTransform.rotation, 0]}
      scale={typeof finalTransform.scale === 'number' ? [finalTransform.scale, finalTransform.scale, finalTransform.scale] : finalTransform.scale as any}
    >
      <primitive object={diagnostics.clonedScene} />
    </group>
  );
}

// Procedural fallback mesh
function ProceduralAbandonedFallback({ def }: { def: BuildingDef }) {
  const { size } = def;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.96, metalness: 0.01 }), []);
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2a3a', roughness: 0.15, metalness: 0.85 }), []);
  const windowFrameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.6, metalness: 0.2 }), []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a1a0a', roughness: 0.85 }), []);

  const floorHeight = 3;
  const doorHeight = 2.1;
  const doorWidth = 1.0;

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, size[1]/2, 0]}>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[size[0] + 0.4, 0.5, size[2] + 0.4]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0, size[1] + 0.15, 0]}>
        <boxGeometry args={[size[0] + 0.3, 0.3, size[2] + 0.3]} />
        <meshStandardMaterial color="#222222" roughness={0.92} />
      </mesh>
      {Array.from({ length: Math.max(1, Math.floor(size[0]/3.2)) }).map((_, i) =>
        Array.from({ length: Math.max(1, Math.floor((size[1]-floorHeight)/3)) }).map((_, j) => {
          if (j===0 && i===Math.floor(size[0]/6.4)) return null;
          const wx = -size[0]/2 + 1.6 + i*3.2;
          const wy = floorHeight + 1.2 + j*2.8;
          if (wy > size[1]-0.6) return null;
          return (
            <group key={`win-${i}-${j}`} position={[wx, wy, size[2]/2 + 0.12]}>
              <mesh castShadow><boxGeometry args={[1.4,1.4,0.07]} /><primitive object={windowFrameMat} attach="material" /></mesh>
              <mesh position={[0,0,0.05]}><planeGeometry args={[1.2,1.2]} /><primitive object={windowMat} attach="material" /></mesh>
            </group>
          );
        })
      )}
      <group position={[0, doorHeight/2, size[2]/2 + 0.13]}>
        <mesh castShadow position={[0,0,-0.02]}><boxGeometry args={[doorWidth+0.2, doorHeight+0.15, 0.12]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        <mesh castShadow><boxGeometry args={[doorWidth, doorHeight, 0.06]} /><primitive object={doorMat} attach="material" /></mesh>
      </group>
    </group>
  );
}

export function RealBuilding({ url, def, fallback }: { url: string; def: BuildingDef; fallback?: React.ReactNode }) {
  const exists = useBuildingGLBExists(url);
  const fallbackContent = fallback || <ProceduralAbandonedFallback def={def} />;

  if (exists === null) {
    // Still checking - show fallback to avoid empty, but log
    console.log(`[RealBuilding] Checking existence for ${url}...`);
    return <>{fallbackContent}</>;
  }

  if (exists === false) {
    console.log(`[RealBuilding] GLB not available, using procedural fallback for ${url}`);
    return <>{fallbackContent}</>;
  }

  // File exists - MUST show real model, not hide behind fallback
  console.log(`[RealBuilding] GLB exists, attempting to load ${url}`);
  return (
    <BuildingErrorBoundary fallback={fallbackContent} url={url}>
      <Suspense fallback={null}>
        {/* Use null fallback for Suspense to avoid procedural covering real during load - show nothing briefly, then real */}
        <GLBInner url={url} def={def} />
      </Suspense>
    </BuildingErrorBoundary>
  );
}

// Abandoned house with door opening matching visual door, compound colliders based on REAL Box3
// Production Box3 raw: W 0.621 H 0.912 D 0.571 -> scale 14.8 -> W 9.19 H 13.50 D 8.45
// Asymmetric raw centerX -0.064 handled by centering model in GLBInner (offsetX)
export function AbandonedHouseReal({ def }: { def: BuildingDef }) {
  const { position, rotation = 0 } = def;
  const url = '/models/buildings/abandoned/abandoned_house_01.glb';

  // Real dimensions after explicit scale 14.8
  const realWidth = 0.621 * 14.8; // 9.1908
  const realHeight = 0.912 * 14.8; // 13.4976
  const realDepth = 0.571 * 14.8; // 8.4508

  // Use real footprint for colliders, not old def.size [16,12,14]
  const wallThickness = 0.4;
  const doorWidth = 1.4; // physical opening wider than visual 1.1 to allow capsule [0.65,0.35] clearance
  const doorHeight = 2.4;
  const halfW = realWidth / 2; // 4.595
  const halfH = realHeight / 2; // 6.748
  const halfD = realDepth / 2; // 4.225

  const frontZ = halfD - wallThickness / 2; // 4.025
  const backZ = -halfD + wallThickness / 2; // -4.025
  const leftX = -halfW + wallThickness / 2; // -4.395
  const rightX = halfW - wallThickness / 2; // 4.395

  const frontLeftWidth = halfW - doorWidth / 2; // 4.595 - 0.7 = 3.895
  const frontLeftHalfW = frontLeftWidth / 2; // 1.9475
  const frontLeftCenterX = -halfW + frontLeftHalfW; // -4.595 +1.9475 = -2.6475

  const frontRightCenterX = halfW - frontLeftHalfW; // 2.6475

  const topHeight = realHeight - doorHeight; // 11.0976
  const topHalfH = topHeight / 2; // 5.5488
  const topCenterY = doorHeight + topHalfH; // 7.9488

  const floorHalfW = halfW - wallThickness; // 4.195
  const floorHalfD = halfD - wallThickness; // 3.825

  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDebug(!!(window as any).__showDebug);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Front facade split - door opening free, matches visual door, clearance for capsule */}
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      <CuboidCollider args={[doorWidth / 2, topHalfH, wallThickness / 2]} position={[0, topCenterY, frontZ]} />
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
      <CuboidCollider args={[floorHalfW, 0.12, floorHalfD]} position={[0, 0.12, 0]} />

      <RealBuilding url={url} def={def} />

      {/* Debug visualization of colliders via F3 */}
      {showDebug && (
        <group>
          {/* Front left */}
          <mesh position={[frontLeftCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          {/* Front right */}
          <mesh position={[frontRightCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          {/* Top above door */}
          <mesh position={[0, topCenterY, frontZ]}><boxGeometry args={[doorWidth, topHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          {/* Door opening free - green wireframe */}
          <mesh position={[0, doorHeight/2, frontZ]}><boxGeometry args={[doorWidth, doorHeight, 0.1]} /><meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.5} /></mesh>
          {/* Back */}
          <mesh position={[0, halfH, backZ]}><boxGeometry args={[realWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
          {/* Sides */}
          <mesh position={[leftX, halfH, 0]}><boxGeometry args={[wallThickness, realHeight, realDepth]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
          <mesh position={[rightX, halfH, 0]}><boxGeometry args={[wallThickness, realHeight, realDepth]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
        </group>
      )}
    </RigidBody>
  );
}
