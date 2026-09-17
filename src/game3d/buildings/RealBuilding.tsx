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
      try {
        console.log(`[RealBuilding] Checking HEAD ${url}`);
        const headRes = await fetch(url, { method: 'HEAD' });
        if (cancelled) return;
        console.log(`[RealBuilding] HEAD ${url} -> ${headRes.status} ${headRes.headers.get('content-type')} ${headRes.headers.get('content-length')}`);
        if (headRes.ok) {
          setExists(true);
          return;
        }
        console.log(`[RealBuilding] HEAD not ok, trying GET ${url}`);
        const getRes = await fetch(url, { method: 'GET' });
        if (cancelled) return;
        console.log(`[RealBuilding] GET ${url} -> ${getRes.status} ${getRes.headers.get('content-type')} ${getRes.headers.get('content-length')}`);
        if (getRes.ok) {
          setExists(true);
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

function getAssetIdFromUrl(url: string): string {
  const found = BUILDING_ASSETS.find(a => a.url === url);
  if (found) return found.id;
  // fallback parse filename
  const parts = url.split('/').pop()?.split('.')[0] || 'unknown';
  return parts;
}

function getTextureDiagnostic(tex: any): any {
  if (!tex) return null;
  try {
    const img = tex.image;
    const isCompressed = !!(tex as any).isCompressedTexture;
    const width = img ? (img.width || img.videoWidth || 0) : 0;
    const height = img ? (img.height || img.videoHeight || 0) : 0;
    return {
      uuid: tex.uuid,
      name: tex.name || '',
      isCompressed,
      hasImage: !!img,
      width,
      height,
      colorSpace: (tex as any).colorSpace || (tex as any).encoding || 'unknown',
      flipY: tex.flipY,
      wrapS: tex.wrapS,
      wrapT: tex.wrapT,
      repeat: tex.repeat ? { x: tex.repeat.x, y: tex.repeat.y } : null,
      offset: tex.offset ? { x: tex.offset.x, y: tex.offset.y } : null,
      channel: (tex as any).channel ?? 0,
      format: tex.format,
      type: tex.type,
    };
  } catch (e) {
    return { error: String(e), uuid: tex?.uuid };
  }
}

function getMaterialDiagnostic(mat: any, index: number) {
  try {
    const color = mat.color ? `#${mat.color.getHexString()} rgb(${mat.color.r.toFixed(2)},${mat.color.g.toFixed(2)},${mat.color.b.toFixed(2)})` : 'no color';
    const diag: any = {
      index,
      type: mat.type,
      name: mat.name || '',
      color,
      roughness: mat.roughness,
      metalness: mat.metalness,
      emissive: mat.emissive ? `#${mat.emissive.getHexString()}` : null,
      emissiveIntensity: mat.emissiveIntensity,
      transparent: mat.transparent,
      opacity: mat.opacity,
      side: mat.side === 0 ? 'FrontSide' : mat.side === 1 ? 'BackSide' : mat.side === 2 ? 'DoubleSide' : mat.side,
      sideRaw: mat.side,
      vertexColors: mat.vertexColors,
      alphaTest: mat.alphaTest,
      wireframe: mat.wireframe,
      map: !!mat.map,
      mapInfo: getTextureDiagnostic(mat.map),
      normalMap: !!mat.normalMap,
      normalMapInfo: getTextureDiagnostic(mat.normalMap),
      roughnessMap: !!mat.roughnessMap,
      roughnessMapInfo: getTextureDiagnostic(mat.roughnessMap),
      metalnessMap: !!mat.metalnessMap,
      metalnessMapInfo: getTextureDiagnostic(mat.metalnessMap),
      aoMap: !!mat.aoMap,
      aoMapInfo: getTextureDiagnostic(mat.aoMap),
      emissiveMap: !!mat.emissiveMap,
      emissiveMapInfo: getTextureDiagnostic(mat.emissiveMap),
      alphaMap: !!mat.alphaMap,
      alphaMapInfo: getTextureDiagnostic(mat.alphaMap),
      bumpMap: !!(mat as any).bumpMap,
      displacementMap: !!(mat as any).displacementMap,
    };
    return diag;
  } catch (e) {
    return { index, error: String(e), type: mat?.type, name: mat?.name };
  }
}

// Inner GLB loader with full diagnostics - FIXED for real production Box3 + material diagnostic
function GLBInner({ url, def, assetId: propAssetId }: { url: string; def: BuildingDef; assetId?: string }) {
  const gltf = useGLTF(url) as any;
  const loggedRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);

  const assetId = propAssetId || getAssetIdFromUrl(url);

  const diagnostics = useMemo(() => {
    try {
      const scene = gltf.scene;
      if (!scene) {
        console.error('[RealBuilding] gltf.scene is null/undefined', url);
        return null;
      }

      // Original scene analysis before clone - to check if clone loses references
      let origMeshCount = 0;
      let origMapCount = 0;
      const origMaterials: string[] = [];
      try {
        scene.traverse((child: any) => {
          if (child.isMesh) {
            origMeshCount++;
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m: any) => {
                if (m.map) origMapCount++;
                origMaterials.push(m.name || m.type);
              });
            }
          }
        });
      } catch {}

      const cloned = scene.clone(true);

      let meshCount = 0;
      let triangleCount = 0;
      const materials = new Set<string>();
      const materialList: string[] = [];
      let textureCount = 0;
      let visibleMeshes = 0;
      let invisibleMeshes = 0;

      const materialDetails: any[] = [];
      const textureInfos: any[] = [];
      const geometryInfos: any[] = [];
      let materialIndex = 0;

      cloned.traverse((child: any) => {
        if (child.isMesh) {
          meshCount++;
          if (child.visible) visibleMeshes++; else invisibleMeshes++;
          const geom = child.geometry;
          if (geom) {
            if (geom.index) triangleCount += geom.index.count / 3;
            else if (geom.attributes?.position) triangleCount += geom.attributes.position.count / 3;

            const hasUV = !!geom.attributes?.uv;
            const hasUV2 = !!geom.attributes?.uv2;
            const hasColor = !!geom.attributes?.color;
            const hasNormal = !!geom.attributes?.normal;
            geometryInfos.push({
              name: child.name || '',
              hasUV,
              hasUV2,
              hasColor,
              hasNormal,
              vertexCount: geom.attributes?.position?.count || 0,
            });
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
              if (m.aoMap) textureCount++;

              const matDiag = getMaterialDiagnostic(m, materialIndex++);
              materialDetails.push(matDiag);

              // Collect texture infos for renderer output check
              if (m.map) {
                const info = getTextureDiagnostic(m.map);
                textureInfos.push({ slot: 'map', ...info });
                // Check clone losing reference
                if (!m.map.image) {
                  console.warn(`[RealBuilding] ${assetId} material ${name} map.image is NULL after clone!`, m.map);
                }
              }
              if (m.normalMap) textureInfos.push({ slot: 'normalMap', ...getTextureDiagnostic(m.normalMap) });
              if (m.roughnessMap) textureInfos.push({ slot: 'roughnessMap', ...getTextureDiagnostic(m.roughnessMap) });
              if (m.metalnessMap) textureInfos.push({ slot: 'metalnessMap', ...getTextureDiagnostic(m.metalnessMap) });
              if (m.aoMap) textureInfos.push({ slot: 'aoMap', ...getTextureDiagnostic(m.aoMap) });
              if (m.emissiveMap) textureInfos.push({ slot: 'emissiveMap', ...getTextureDiagnostic(m.emissiveMap) });
              if (m.alphaMap) textureInfos.push({ slot: 'alphaMap', ...getTextureDiagnostic(m.alphaMap) });
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

      const offsetX = -raw.centerX;
      const offsetZ = -raw.centerZ;
      cloned.position.set(offsetX, 0, offsetZ);

      const centeredBox = new THREE.Box3().setFromObject(cloned);
      const centeredSize = new THREE.Vector3();
      centeredBox.getSize(centeredSize);

      // Preserve original PBR materials - do NOT replace, just ensure visibility
      cloned.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              // Do NOT replace material, only ensure needsUpdate if needed for diagnostics
              // Keep original PBR textures
              m.needsUpdate = true;
            });
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
        centeredSize,
        offsetX,
        offsetZ,
        box,
        size,
        center,
        materialDetails,
        textureInfos,
        geometryInfos,
        origMeshCount,
        origMapCount,
        origMaterials,
      };
    } catch (e) {
      console.error('[RealBuilding] Diagnostics failed', e);
      return null;
    }
  }, [gltf.scene, url, assetId]);

  const finalTransform = useMemo(() => {
    if (!diagnostics) {
      const cfg = BUILDING_ASSETS.find(a => a.id === assetId || a.url === url);
      const scaleFallback = cfg?.scale ?? (assetId === 'abandoned_house_01' ? 14.8 : 1);
      return { scale: scaleFallback, rotation: cfg?.rotation ?? 0, yOffset: cfg?.yOffset ?? 0, width: 0.621, height: 0.912, depth: 0.571, raw: null as any };
    }
    const { raw } = diagnostics;
    const assetConfig = BUILDING_ASSETS.find(a => a.id === assetId || a.url === url);

    let finalScale: number | [number, number, number] = assetConfig?.scale ?? (assetId === 'abandoned_house_01' ? 14.8 : 1);
    let finalRotation = assetConfig?.rotation ?? 0;
    let finalYOffset = 0;

    const minY = raw.minY;
    if (Math.abs(minY) > 0.01) {
      finalYOffset = -minY;
      console.log(`[RealBuilding] ${assetId} Auto yOffset: minY ${minY.toFixed(3)} -> ${finalYOffset.toFixed(3)}`);
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
  }, [diagnostics, url, assetId]);

  useEffect(() => {
    if (!diagnostics || loggedRef.current) return;
    loggedRef.current = true;

    const scaleNum = typeof finalTransform.scale === 'number' ? finalTransform.scale as number : (Array.isArray(finalTransform.scale) ? finalTransform.scale[1] : 14.8);

    // Main GLB loaded log per asset
    console.info(`[RealBuilding] ${assetId} GLB loaded`);
    console.info(`url: ${url}`);
    console.info(`meshCount: ${diagnostics.meshCount} (orig ${diagnostics.origMeshCount})`);
    console.info(`triangles: ${diagnostics.triangleCount}`);
    console.info(`materials: ${diagnostics.materialCount} [${diagnostics.materials.join(', ')}] orig [${diagnostics.origMaterials.join(', ')}]`);
    console.info(`textures: ${diagnostics.textureCount} origMaps ${diagnostics.origMapCount}`);
    console.info(`visibleMeshes: ${diagnostics.visibleMeshes} invisibleMeshes: ${diagnostics.invisibleMeshes}`);
    console.info(`Box3 raw: minX ${diagnostics.raw.minX.toFixed(3)} minY ${diagnostics.raw.minY.toFixed(3)} minZ ${diagnostics.raw.minZ.toFixed(3)} maxX ${diagnostics.raw.maxX.toFixed(3)} maxY ${diagnostics.raw.maxY.toFixed(3)} maxZ ${diagnostics.raw.maxZ.toFixed(3)}`);
    console.info(`size raw: W ${diagnostics.raw.width.toFixed(3)} H ${diagnostics.raw.height.toFixed(3)} D ${diagnostics.raw.depth.toFixed(3)}`);
    console.info(`center raw: X ${diagnostics.raw.centerX.toFixed(3)} Y ${diagnostics.raw.centerY.toFixed(3)} Z ${diagnostics.raw.centerZ.toFixed(3)} offsetX ${diagnostics.offsetX.toFixed(3)} offsetZ ${diagnostics.offsetZ.toFixed(3)}`);
    console.info(`expected world size after scale ${scaleNum}: W ${(diagnostics.raw.width * scaleNum).toFixed(2)} H ${(diagnostics.raw.height * scaleNum).toFixed(2)} D ${(diagnostics.raw.depth * scaleNum).toFixed(2)}`);
    console.info(`scale: ${typeof finalTransform.scale === 'number' ? finalTransform.scale : JSON.stringify(finalTransform.scale)} rotation: ${finalTransform.rotation} yOffset: ${finalTransform.yOffset}`);
    console.info(`scene.visible: ${gltf.scene.visible}`);

    // Material diagnostic per task
    console.info(`[RealBuilding] ${assetId} material diagnostic`);
    diagnostics.materialDetails.forEach((md: any, i: number) => {
      console.info(` material[${i}] type=${md.type} name=${md.name} color=${md.color} roughness=${md.roughness} metalness=${md.metalness} transparent=${md.transparent} opacity=${md.opacity} side=${md.side} vertexColors=${md.vertexColors}`);
      console.info(`  map present=${md.map} ${md.mapInfo ? `image ${md.mapInfo.hasImage ? 'YES' : 'NO'} ${md.mapInfo.width}x${md.mapInfo.height} colorSpace=${md.mapInfo.colorSpace} flipY=${md.mapInfo.flipY} uuid=${md.mapInfo.uuid} name=${md.mapInfo.name} compressed=${md.mapInfo.isCompressed}` : 'no mapInfo'}`);
      console.info(`  normalMap present=${md.normalMap} ${md.normalMapInfo ? `${md.normalMapInfo.width}x${md.normalMapInfo.height} hasImage=${md.normalMapInfo.hasImage}` : ''}`);
      console.info(`  roughnessMap present=${md.roughnessMap} ${md.roughnessMapInfo ? `${md.roughnessMapInfo.width}x${md.roughnessMapInfo.height}` : ''}`);
      console.info(`  metalnessMap present=${md.metalnessMap} ${md.metalnessMapInfo ? `${md.metalnessMapInfo.width}x${md.metalnessMapInfo.height}` : ''}`);
      console.info(`  aoMap present=${md.aoMap} emissiveMap present=${md.emissiveMap} alphaMap present=${md.alphaMap} bumpMap=${md.bumpMap}`);
      if (md.mapInfo) {
        console.info(`  renderer output check: texture slot=map uuid=${md.mapInfo.uuid} name=${md.mapInfo.name} dimensions=${md.mapInfo.width}x${md.mapInfo.height} hasImage=${md.mapInfo.hasImage} colorSpace=${md.mapInfo.colorSpace}`);
      }
    });

    // Geometry diagnostic
    diagnostics.geometryInfos.forEach((gi: any, i: number) => {
      console.info(`[RealBuilding] ${assetId} geometry[${i}] name=${gi.name} hasUV=${gi.hasUV} hasUV2=${gi.hasUV2} hasColor=${gi.hasColor} hasNormal=${gi.hasNormal} verts=${gi.vertexCount}`);
    });

    // Texture list for renderer output
    diagnostics.textureInfos.forEach((ti: any) => {
      console.info(`[RealBuilding] ${assetId} texture slot=${ti.slot} uuid=${ti.uuid} name=${ti.name} ${ti.width}x${ti.height} hasImage=${ti.hasImage} colorSpace=${ti.colorSpace} flipY=${ti.flipY} compressed=${ti.isCompressed} wrapS=${ti.wrapS} wrapT=${ti.wrapT}`);
    });

    // Store in window for debug - separate per asset, do NOT overwrite other assets
    try {
      (window as any).__buildingDims = (window as any).__buildingDims || {};
      const dimsData = {
        assetId,
        url,
        width: diagnostics.raw.width,
        height: diagnostics.raw.height,
        depth: diagnostics.raw.depth,
        min: { x: diagnostics.raw.minX, y: diagnostics.raw.minY, z: diagnostics.raw.minZ },
        max: { x: diagnostics.raw.maxX, y: diagnostics.raw.maxY, z: diagnostics.raw.maxZ },
        center: { x: diagnostics.raw.centerX, y: diagnostics.raw.centerY, z: diagnostics.raw.centerZ },
        meshCount: diagnostics.meshCount,
        triangles: diagnostics.triangleCount,
        materials: diagnostics.materials,
        materialDetails: diagnostics.materialDetails,
        textureInfos: diagnostics.textureInfos,
        geometryInfos: diagnostics.geometryInfos,
        offsetX: diagnostics.offsetX,
        offsetZ: diagnostics.offsetZ,
        scale: finalTransform.scale,
        rotation: finalTransform.rotation,
        yOffset: finalTransform.yOffset,
        worldSize: {
          w: diagnostics.raw.width * scaleNum,
          h: diagnostics.raw.height * scaleNum,
          d: diagnostics.raw.depth * scaleNum,
        },
      };
      // Store by assetId
      (window as any).__buildingDims[assetId] = dimsData;
      // Also store by def.id for backward compat, but keep assetId separate
      (window as any).__buildingDims[def.id] = dimsData;

      (window as any).__materialDiag = (window as any).__materialDiag || {};
      (window as any).__materialDiag[assetId] = diagnostics.materialDetails;

      (window as any).__lastBuildingDims = (window as any).__lastBuildingDims || {};
      (window as any).__lastBuildingDims[assetId] = `${assetId}: raw ${diagnostics.raw.width.toFixed(3)}x${diagnostics.raw.height.toFixed(3)}x${diagnostics.raw.depth.toFixed(3)} -> world ${(diagnostics.raw.width * scaleNum).toFixed(1)}x${(diagnostics.raw.height * scaleNum).toFixed(1)}x${(diagnostics.raw.depth * scaleNum).toFixed(1)}m meshes:${diagnostics.meshCount} tris:${diagnostics.triangleCount} scale:${scaleNum} yOff:${finalTransform.yOffset.toFixed(2)} rot:${finalTransform.rotation.toFixed(2)}`;
      // Keep legacy string for last loaded
      (window as any).__lastBuildingDimsStr = (window as any).__lastBuildingDims[assetId];

      console.info(`[RealBuilding] ${assetId} stored in window.__buildingDims[${assetId}] and window.__buildingDims[${def.id}]`);
    } catch (e) {
      console.warn('[RealBuilding] window store failed', e);
    }

    logBuildingDimensions(def.id, {
      width: diagnostics.raw.width * scaleNum,
      height: diagnostics.raw.height * scaleNum,
      depth: diagnostics.raw.depth * scaleNum,
      center: new THREE.Vector3(0, diagnostics.raw.height * scaleNum / 2, 0),
      min: new THREE.Vector3(-diagnostics.raw.width * scaleNum / 2, 0, -diagnostics.raw.depth * scaleNum / 2),
      max: new THREE.Vector3(diagnostics.raw.width * scaleNum / 2, diagnostics.raw.height * scaleNum, diagnostics.raw.depth * scaleNum / 2),
    } as any);

  }, [diagnostics, finalTransform, url, def.id, gltf.scene, assetId]);

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

export function RealBuilding({ url, def, fallback, assetId }: { url: string; def: BuildingDef; fallback?: React.ReactNode; assetId?: string }) {
  const exists = useBuildingGLBExists(url);
  const fallbackContent = fallback || <ProceduralAbandonedFallback def={def} />;
  const resolvedAssetId = assetId || getAssetIdFromUrl(url);

  if (exists === null) {
    console.log(`[RealBuilding] Checking existence for ${url}...`);
    return <>{fallbackContent}</>;
  }

  if (exists === false) {
    console.log(`[RealBuilding] GLB not available, using procedural fallback for ${url} (${resolvedAssetId})`);
    return <>{fallbackContent}</>;
  }

  console.log(`[RealBuilding] GLB exists, attempting to load ${url} (${resolvedAssetId})`);
  return (
    <BuildingErrorBoundary fallback={fallbackContent} url={url}>
      <Suspense fallback={null}>
        <GLBInner url={url} def={def} assetId={resolvedAssetId} />
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

  const wallThickness = 0.4;
  const doorWidth = 1.4;
  const doorHeight = 2.4;
  const halfW = realWidth / 2;
  const halfH = realHeight / 2;
  const halfD = realDepth / 2;

  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;

  const frontLeftWidth = halfW - doorWidth / 2;
  const frontLeftHalfW = frontLeftWidth / 2;
  const frontLeftCenterX = -halfW + frontLeftHalfW;
  const frontRightCenterX = halfW - frontLeftHalfW;

  const topHeight = realHeight - doorHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = doorHeight + topHalfH;

  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;

  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDebug(!!(window as any).__showDebug);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontLeftCenterX, halfH, frontZ]} />
      <CuboidCollider args={[frontLeftHalfW, halfH, wallThickness / 2]} position={[frontRightCenterX, halfH, frontZ]} />
      <CuboidCollider args={[doorWidth / 2, topHalfH, wallThickness / 2]} position={[0, topCenterY, frontZ]} />
      <CuboidCollider args={[halfW, halfH, wallThickness / 2]} position={[0, halfH, backZ]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[leftX, halfH, 0]} />
      <CuboidCollider args={[wallThickness / 2, halfH, halfD]} position={[rightX, halfH, 0]} />
      <CuboidCollider args={[floorHalfW, 0.12, floorHalfD]} position={[0, 0.12, 0]} />

      <RealBuilding url={url} def={def} assetId="abandoned_house_01" />

      {showDebug && (
        <group>
          <mesh position={[frontLeftCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          <mesh position={[frontRightCenterX, halfH, frontZ]}><boxGeometry args={[frontLeftWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          <mesh position={[0, topCenterY, frontZ]}><boxGeometry args={[doorWidth, topHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} /></mesh>
          <mesh position={[0, doorHeight/2, frontZ]}><boxGeometry args={[doorWidth, doorHeight, 0.1]} /><meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.5} /></mesh>
          <mesh position={[0, halfH, backZ]}><boxGeometry args={[realWidth, realHeight, wallThickness]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
          <mesh position={[leftX, halfH, 0]}><boxGeometry args={[wallThickness, realHeight, realDepth]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
          <mesh position={[rightX, halfH, 0]}><boxGeometry args={[wallThickness, realHeight, realDepth]} /><meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.2} /></mesh>
        </group>
      )}
    </RigidBody>
  );
}

// Second real abandoned building - diagnostic stage, scale 1, simple collider, separate placement
export function AbandonedHouse02Real({ def }: { def: BuildingDef }) {
  const { position, rotation = 0, size } = def;
  const url = '/models/buildings/abandoned/abandoned_house_02.glb';

  // Diagnostic stage: real dimensions unknown, use def.size for simple collider
  // Do NOT copy compound collider dimensions from house_01
  const halfW = size[0] / 2;
  const halfH = size[1] / 2;
  const halfD = size[2] / 2;

  const [showDebug, setShowDebug] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setShowDebug(!!(window as any).__showDebug);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotation, 0]}>
      {/* Simple fallback collider for diagnostic stage - real collider will be tuned after production Box3 */}
      <CuboidCollider args={[halfW, halfH, halfD]} position={[0, halfH, 0]} />

      <RealBuilding url={url} def={def} assetId="abandoned_house_02" />

      {showDebug && (
        <group>
          <mesh position={[0, halfH, 0]}><boxGeometry args={[size[0], size[1], size[2]]} /><meshBasicMaterial color="#ff8800" wireframe transparent opacity={0.3} /></mesh>
        </group>
      )}
    </RigidBody>
  );
}
