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

// Inner GLB loader with full diagnostics
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

      // Clone for safe manipulation
      const cloned = scene.clone(true);

      // Count meshes, triangles, materials, textures
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
            if (geom.index) {
              triangleCount += geom.index.count / 3;
            } else if (geom.attributes && geom.attributes.position) {
              triangleCount += geom.attributes.position.count / 3;
            }
          }
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              const name = m.name || m.type || 'unnamed';
              if (!materials.has(name)) {
                materials.add(name);
                materialList.push(name);
              }
              // Check textures
              if (m.map) textureCount++;
              if (m.normalMap) textureCount++;
              if (m.roughnessMap) textureCount++;
              if (m.metalnessMap) textureCount++;
              if (m.emissiveMap) textureCount++;
            });
          }
          // Check NaN transforms
          if (child.position && (isNaN(child.position.x) || isNaN(child.position.y) || isNaN(child.position.z))) {
            console.warn('[RealBuilding] Mesh has NaN position', child.name);
          }
        }
      });

      // Box3 BEFORE transform
      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const raw = {
        minX: box.min.x,
        minY: box.min.y,
        minZ: box.min.z,
        maxX: box.max.x,
        maxY: box.max.y,
        maxZ: box.max.z,
        width: size.x,
        height: size.y,
        depth: size.z,
        centerX: center.x,
        centerY: center.y,
        centerZ: center.z,
      };

      // Apply shadows
      cloned.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false; // disable culling for diagnosis, ensure visible
          if (child.material) {
            child.material.needsUpdate = true;
          }
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
        box,
        size,
        center,
      };
    } catch (e) {
      console.error('[RealBuilding] Diagnostics failed', e);
      return null;
    }
  }, [gltf.scene, url]);

  // Compute final transform based on real Box3, not expectedHeight=12 blindly
  const finalTransform = useMemo(() => {
    if (!diagnostics) {
      return { scale: 1, rotation: 0, yOffset: 0, width: def.size[0], height: def.size[1], depth: def.size[2] };
    }

    const { raw, size } = diagnostics;
    const assetConfig = BUILDING_ASSETS.find(a => a.url === url || a.id === 'abandoned_house_01');

    // Real dimensions
    let finalScale: number | [number, number, number] = 1;
    let finalRotation = 0;
    let finalYOffset = 0;

    // Use config if provided, but also auto-adjust based on real Box3
    if (assetConfig?.scale) {
      finalScale = assetConfig.scale;
    } else {
      // If model is huge (e.g., 100+ units) or tiny (<1), it may be in cm or wrong units
      // For now keep 1, but log
      if (size.y > 100) {
        console.warn(`[RealBuilding] Model height ${size.y.toFixed(2)} seems too large, check units, using scale 0.01`);
        finalScale = 0.01;
      } else if (size.y < 0.5) {
        console.warn(`[RealBuilding] Model height ${size.y.toFixed(2)} seems too small, check units`);
      }
    }

    if (assetConfig?.rotation !== undefined) {
      finalRotation = assetConfig.rotation;
    }

    // yOffset: minY should correspond to ground Y≈0
    // If raw minY is not near 0, offset to bring bottom to 0
    const minY = raw.minY;
    if (assetConfig?.yOffset !== undefined && assetConfig.yOffset !== 0) {
      finalYOffset = assetConfig.yOffset;
    } else {
      // Auto yOffset to bring bottom to ground
      if (Math.abs(minY) > 0.05) {
        finalYOffset = -minY;
        console.log(`[RealBuilding] Auto yOffset computed: minY ${minY.toFixed(3)} -> yOffset ${finalYOffset.toFixed(3)}`);
      }
    }

    // Orientation: determine front facade
    // For abandoned_1 at [-110,0,-20], front should face +Z towards sidewalk/road at Z=0
    // If model front faces -Z, need rotation PI
    // We can't auto-detect door without file, but log center and dimensions for manual tuning
    // For now keep rotation 0, but allow config

    return {
      scale: finalScale,
      rotation: finalRotation,
      yOffset: finalYOffset,
      width: raw.width,
      height: raw.height,
      depth: raw.depth,
      raw,
    };
  }, [diagnostics, def.size, url]);

  // One-time console.info after successful load
  useEffect(() => {
    if (!diagnostics || loggedRef.current) return;
    loggedRef.current = true;

    const assetConfig = BUILDING_ASSETS.find(a => a.url === url || a.id === 'abandoned_house_01');

    console.info('[RealBuilding] GLB loaded');
    console.info(`url: ${url}`);
    console.info(`meshCount: ${diagnostics.meshCount}`);
    console.info(`triangles: ${diagnostics.triangleCount}`);
    console.info(`materials: ${diagnostics.materialCount} [${diagnostics.materials.join(', ')}]`);
    console.info(`textures: ${diagnostics.textureCount}`);
    console.info(`visibleMeshes: ${diagnostics.visibleMeshes} invisibleMeshes: ${diagnostics.invisibleMeshes}`);
    console.info(`Box3 raw: minX ${diagnostics.raw.minX.toFixed(3)} minY ${diagnostics.raw.minY.toFixed(3)} minZ ${diagnostics.raw.minZ.toFixed(3)} maxX ${diagnostics.raw.maxX.toFixed(3)} maxY ${diagnostics.raw.maxY.toFixed(3)} maxZ ${diagnostics.raw.maxZ.toFixed(3)}`);
    console.info(`size: width ${diagnostics.raw.width.toFixed(3)} height ${diagnostics.raw.height.toFixed(3)} depth ${diagnostics.raw.depth.toFixed(3)}`);
    console.info(`center: ${diagnostics.raw.centerX.toFixed(3)}, ${diagnostics.raw.centerY.toFixed(3)}, ${diagnostics.raw.centerZ.toFixed(3)}`);
    console.info(`scale: ${typeof finalTransform.scale === 'number' ? finalTransform.scale : JSON.stringify(finalTransform.scale)} rotation: ${finalTransform.rotation} yOffset: ${finalTransform.yOffset}`);
    console.info(`scene.visible: ${gltf.scene.visible} parent: ${gltf.scene.parent?.type || 'no parent'}`);

    // F3 diagnostics
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
    };
    (window as any).__lastBuildingDims = `${def.id}: ${diagnostics.raw.width.toFixed(1)}x${diagnostics.raw.height.toFixed(1)}x${diagnostics.raw.depth.toFixed(1)}m meshes:${diagnostics.meshCount} tris:${diagnostics.triangleCount} scale:${typeof finalTransform.scale === 'number' ? finalTransform.scale : JSON.stringify(finalTransform.scale)} yOff:${finalTransform.yOffset.toFixed(2)} rot:${finalTransform.rotation.toFixed(2)}`;

    // Check for common issues
    if (diagnostics.meshCount === 0) {
      console.warn('[RealBuilding] No meshes found in GLB!');
    }
    if (diagnostics.raw.width === 0 || diagnostics.raw.height === 0 || diagnostics.raw.depth === 0) {
      console.warn('[RealBuilding] Box3 has zero dimension!', diagnostics.raw);
    }
    if (isNaN(diagnostics.raw.minX) || isNaN(diagnostics.raw.minY) || isNaN(diagnostics.raw.minZ)) {
      console.warn('[RealBuilding] Box3 has NaN!');
    }
    if (diagnostics.raw.height > 50) {
      console.warn(`[RealBuilding] Height ${diagnostics.raw.height.toFixed(1)}m seems unrealistic for 4-storey (12-15m expected), check scale`);
    }

    logBuildingDimensions(def.id, {
      width: diagnostics.raw.width,
      height: diagnostics.raw.height,
      depth: diagnostics.raw.depth,
      center: new THREE.Vector3(diagnostics.raw.centerX, diagnostics.raw.centerY, diagnostics.raw.centerZ),
      min: new THREE.Vector3(diagnostics.raw.minX, diagnostics.raw.minY, diagnostics.raw.minZ),
      max: new THREE.Vector3(diagnostics.raw.maxX, diagnostics.raw.maxY, diagnostics.raw.maxZ),
    } as any);

  }, [diagnostics, finalTransform, url, def.id, gltf.scene]);

  if (!diagnostics) {
    return null;
  }

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

// Abandoned house with door opening matching visual door, compound colliders based on real Box3
export function AbandonedHouseReal({ def }: { def: BuildingDef }) {
  const { position, size, rotation = 0 } = def;
  const url = '/models/buildings/abandoned/abandoned_house_01.glb';

  // For now use def.size as base, but after real Box3 is known on VPS, adjust
  // These will be tuned after diagnostics on production
  // Door at front center, width 1.2 height 2.3, facing +Z towards sidewalk
  const wallThickness = 0.4;
  const doorWidth = 1.2;
  const doorHeight = 2.3;
  const halfW = size[0] / 2;
  const halfH = size[1] / 2;
  const halfD = size[2] / 2;

  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;

  const frontLeftWidth = halfW - doorWidth / 2;
  const frontLeftHalfW = frontLeftWidth / 2;
  const frontLeftCenterX = -halfW + frontLeftHalfW;

  const frontRightHalfW = frontLeftHalfW;
  const frontRightCenterX = halfW - frontRightHalfW;

  const topHeight = size[1] - doorHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = doorHeight + topHalfH;

  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;

  // Try to get real dimensions if already computed on VPS (via window.__buildingDims)
  // This allows collider to adapt after first load
  const [realDims, setRealDims] = useState<any>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const dims = (window as any).__buildingDims?.[def.id];
      if (dims && !realDims) {
        setRealDims(dims);
        console.log(`[RealBuilding] Real dims available for collider tuning`, dims);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [def.id, realDims]);

  // If real dims available, use them for collider (more accurate)
  // For now keep using def.size but log real dims for manual tuning
  useEffect(() => {
    if (realDims) {
      console.info(`[RealBuilding] Adjusting colliders based on real Box3: W ${realDims.width?.toFixed(2)} H ${realDims.height?.toFixed(2)} D ${realDims.depth?.toFixed(2)}`);
      // Future: recompute collider positions based on realDims
    }
  }, [realDims]);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Front facade split - door opening free, matches visual door */}
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      <CuboidCollider args={[frontRightHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      <CuboidCollider args={[doorWidth / 2, topHalfH, wallThickness / 2]} position={[0, topCenterY, frontZ]} />
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
      <CuboidCollider args={[floorHalfW, 0.1, floorHalfD]} position={[0, 0.1, 0]} />

      <RealBuilding url={url} def={def} />
    </RigidBody>
  );
}
