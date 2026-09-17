'use client';
import React, { Suspense, useEffect, useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { BuildingDef } from '@/game/world/types';
import { computeBuildingDimensions, logBuildingDimensions, getBuildingScaleFactor } from './buildingModelUtils';
import { BUILDING_ASSETS } from './buildingAssetRegistry';

// ErrorBoundary to prevent GLB load crash -> black screen
class BuildingErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('[RealBuilding] GLB load error, fallback to procedural', error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function useBuildingGLBExists(url: string) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        // Safe HEAD check, no 404 in console as error, just boolean
        const res = await fetch(url, { method: 'HEAD' });
        if (cancelled) return;
        if (res.ok) {
          console.log(`[RealBuilding] Found GLB: ${url} status ${res.status}`);
          setExists(true);
        } else {
          console.log(`[RealBuilding] GLB not found (fallback procedural): ${url} status ${res.status}`);
          setExists(false);
        }
      } catch (e) {
        if (cancelled) return;
        console.log(`[RealBuilding] GLB check failed (fallback): ${url}`, e);
        setExists(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [url]);

  return exists;
}

// Inner GLB loader - called ONLY when existence confirmed
function GLBInner({ url, def, configScale, configRotation, configYOffset, expectedHeight }: {
  url: string;
  def: BuildingDef;
  configScale?: number | [number, number, number];
  configRotation?: number;
  configYOffset?: number;
  expectedHeight?: number;
}) {
  const gltf = useGLTF(url) as any;
  const groupRef = useRef<THREE.Group>(null);

  const { clonedScene, dimensions } = useMemo(() => {
    try {
      const scene = gltf.scene.clone(true);
      // Compute Box3 before any transforms
      const dims = computeBuildingDimensions(scene);
      logBuildingDimensions(def.id, dims);

      // Apply shadows and PBR fix
      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Ensure PBR materials keep original, but fix if needed
          if (child.material) {
            // Keep original material, just ensure it can receive shadows
            child.material.needsUpdate = true;
          }
        }
      });

      return { clonedScene: scene, dimensions: dims };
    } catch (e) {
      console.warn('[RealBuilding] Clone/Box3 failed', e);
      return { clonedScene: gltf.scene, dimensions: null };
    }
  }, [gltf.scene, def.id]);

  // Compute final scale/rotation/yOffset
  const finalScale = useMemo(() => {
    if (!dimensions) return configScale || 1;
    return getBuildingScaleFactor(configScale, dimensions.height, expectedHeight);
  }, [dimensions, configScale, expectedHeight]);

  // Adjust yOffset to put bottom at ground if origin not at base
  const autoYOffset = useMemo(() => {
    if (!dimensions) return configYOffset || 0;
    // If min Y is not near 0, shift to bring bottom to 0
    // dimensions.min.y is world min of cloned scene before offset
    // If model origin at center, min Y will be negative ~ -height/2
    // We want bottom at 0, so offset = -minY
    const minY = dimensions.min.y;
    if (Math.abs(minY) > 0.1) {
      // If minY is negative, we need to lift
      // But only auto-adjust if configYOffset not provided
      if (configYOffset === undefined) {
        console.log(`[RealBuilding] Auto yOffset for ${def.id}: minY ${minY.toFixed(2)} -> offset ${(-minY).toFixed(2)}`);
        return -minY;
      }
    }
    return configYOffset || 0;
  }, [dimensions, configYOffset, def.id]);

  // Log for dev/F3
  useEffect(() => {
    if (dimensions) {
      (window as any).__buildingDims = (window as any).__buildingDims || {};
      (window as any).__buildingDims[def.id] = dimensions;
      (window as any).__lastBuildingDims = `${def.id}: ${dimensions.width.toFixed(1)}x${dimensions.height.toFixed(1)}x${dimensions.depth.toFixed(1)}m scale ${typeof finalScale === 'number' ? finalScale : JSON.stringify(finalScale)} yOff ${autoYOffset.toFixed(2)}`;
    }
  }, [dimensions, def.id, finalScale, autoYOffset]);

  return (
    <group ref={groupRef} position={[0, autoYOffset, 0]} rotation={[0, configRotation || 0, 0]} scale={typeof finalScale === 'number' ? [finalScale, finalScale, finalScale] : finalScale as any}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Procedural fallback mesh for abandoned (similar to original Building but without RigidBody)
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
      {/* Windows simple */}
      {Array.from({ length: Math.max(1, Math.floor(size[0]/3.2)) }).map((_, i) =>
        Array.from({ length: Math.max(1, Math.floor((size[1]-floorHeight)/3)) }).map((_, j) => {
          if (j===0 && i===Math.floor(size[0]/6.4)) return null;
          const wx = -size[0]/2 + 1.6 + i*3.2;
          const wy = floorHeight + 1.2 + j*2.8;
          if (wy > size[1]-0.6) return null;
          return (
            <group key={`win-${i}-${j}`} position={[wx, wy, size[2]/2 + 0.12]}>
              <mesh castShadow>
                <boxGeometry args={[1.4,1.4,0.07]} />
                <primitive object={windowFrameMat} attach="material" />
              </mesh>
              <mesh position={[0,0,0.05]}>
                <planeGeometry args={[1.2,1.2]} />
                <primitive object={windowMat} attach="material" />
              </mesh>
            </group>
          );
        })
      )}
      <group position={[0, doorHeight/2, size[2]/2 + 0.13]}>
        <mesh castShadow position={[0,0,-0.02]}>
          <boxGeometry args={[doorWidth+0.2, doorHeight+0.15, 0.12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[doorWidth, doorHeight, 0.06]} />
          <primitive object={doorMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

export function RealBuilding({ url, def, fallback }: { url: string; def: BuildingDef; fallback?: React.ReactNode }) {
  const exists = useBuildingGLBExists(url);
  const assetConfig = BUILDING_ASSETS.find(a => a.url === url || a.id === def.id);

  const fallbackContent = fallback || <ProceduralAbandonedFallback def={def} />;

  if (exists === null) {
    // Checking - show procedural to avoid empty pop
    return <>{fallbackContent}</>;
  }

  if (exists === false) {
    // File absent - procedural fallback, no 404, no black screen
    return <>{fallbackContent}</>;
  }

  // File exists - load GLB with ErrorBoundary + Suspense
  return (
    <BuildingErrorBoundary fallback={fallbackContent}>
      <Suspense fallback={fallbackContent}>
        <GLBInner
          url={url}
          def={def}
          configScale={assetConfig?.scale}
          configRotation={assetConfig?.rotation}
          configYOffset={assetConfig?.yOffset}
          expectedHeight={assetConfig?.expectedHeight}
        />
      </Suspense>
    </BuildingErrorBoundary>
  );
}

// Specific wrapper for abandoned_house_01.glb replacing abandoned_1
// Door opening physically free: width 1.1-1.3m height >=2.2m
// Multiple cheap CuboidColliders, no TrimeshCollider
export function AbandonedHouseReal({ def }: { def: BuildingDef }) {
  const { position, size, rotation = 0 } = def;
  const url = '/models/buildings/abandoned/abandoned_house_01.glb';

  // Use actual def.size [16,12,14] but keep configurable for real GLB Box3
  // Door centered at front facade (local +Z)
  const wallThickness = 0.35;
  const doorWidth = 1.2; // 1.1-1.3m per task
  const doorHeight = 2.3; // >=2.2m
  const halfW = size[0] / 2; // 8
  const halfH = size[1] / 2; // 6
  const halfD = size[2] / 2; // 7

  const frontZ = halfD - wallThickness / 2; // 6.825
  const backZ = -halfD + wallThickness / 2; // -6.825
  const leftX = -halfW + wallThickness / 2; // -7.825
  const rightX = halfW - wallThickness / 2; // 7.825

  // Front left part: from -halfW to -doorWidth/2
  const frontLeftWidth = halfW - doorWidth / 2; // 8 - 0.6 = 7.4
  const frontLeftHalfW = frontLeftWidth / 2; // 3.7
  const frontLeftCenterX = -halfW + frontLeftHalfW; // -8 + 3.7 = -4.3

  // Front right part symmetric
  const frontRightWidth = frontLeftWidth;
  const frontRightHalfW = frontLeftHalfW;
  const frontRightCenterX = halfW - frontRightHalfW; // 4.3

  // Front top above door
  const topHeight = size[1] - doorHeight; // 9.7
  const topHalfH = topHeight / 2; // 4.85
  const topCenterY = doorHeight + topHalfH; // 7.15

  // Interior floor collider if GLB has no floor (simple invisible)
  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Front facade split - leave door opening free */}
      {/* Left part of front */}
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      {/* Right part of front */}
      <CuboidCollider args={[frontRightHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      {/* Top part above door */}
      <CuboidCollider args={[doorWidth / 2, topHalfH, wallThickness / 2]} position={[0, topCenterY, frontZ]} />

      {/* Back wall full */}
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />

      {/* Left side wall */}
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />

      {/* Right side wall */}
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />

      {/* Interior floor collider - ensures walkable inside if GLB has no floor, Ground world collider NOT changed */}
      <CuboidCollider args={[floorHalfW, 0.1, floorHalfD]} position={[0, 0.1, 0]} />

      {/* Visual - real GLB if exists, else procedural fallback */}
      <RealBuilding url={url} def={def} />
    </RigidBody>
  );
}
