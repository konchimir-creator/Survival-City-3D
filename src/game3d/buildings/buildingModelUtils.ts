'use client';
import * as THREE from 'three';

/**
 * Utility for future real building GLB imports
 * - Computes Box3 for real dimensions
 * - Logs width/height/depth in dev/F3
 * - Does NOT auto-scale blindly
 */

export interface BuildingDimensions {
  width: number;
  height: number;
  depth: number;
  center: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function computeBuildingDimensions(object: THREE.Object3D): BuildingDimensions {
  try {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return {
      width: size.x,
      height: size.y,
      depth: size.z,
      center: center.clone(),
      min: box.min.clone(),
      max: box.max.clone(),
    };
  } catch (e) {
    console.warn('[buildingModelUtils] Box3 failed', e);
    return {
      width: 0,
      height: 0,
      depth: 0,
      center: new THREE.Vector3(),
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
    };
  }
}

export function logBuildingDimensions(id: string, dims: BuildingDimensions) {
  try {
    console.log(`[Building ${id}] Dimensions: W ${dims.width.toFixed(2)}m H ${dims.height.toFixed(2)}m D ${dims.depth.toFixed(2)}m | Center ${dims.center.x.toFixed(2)},${dims.center.y.toFixed(2)},${dims.center.z.toFixed(2)}`);
    (window as any).__buildingDims = (window as any).__buildingDims || {};
    (window as any).__buildingDims[id] = dims;
    // F3 display
    (window as any).__lastBuildingDims = `${id}: ${dims.width.toFixed(1)}x${dims.height.toFixed(1)}x${dims.depth.toFixed(1)}m`;
  } catch {}
}

/**
 * For buildings, preserve real proportions.
 * If model exported in wrong units (e.g., cm instead of m), use per-asset config scale.
 * Do NOT auto-scale to fit arbitrary box.
 */
export function getBuildingScaleFactor(assetScale: number | [number, number, number] | undefined, detectedHeight: number, expectedHeight?: number): number | [number, number, number] {
  if (assetScale) return assetScale;
  // If expected height provided and detected differs a lot, suggest scale but don't auto-apply blindly
  if (expectedHeight && detectedHeight > 0.1) {
    const ratio = expectedHeight / detectedHeight;
    if (ratio > 1.5 || ratio < 0.5) {
      console.warn(`[buildingModelUtils] Height mismatch: detected ${detectedHeight.toFixed(2)}m expected ${expectedHeight}m ratio ${ratio.toFixed(2)} — check assetScale config`);
    }
  }
  return 1;
}
