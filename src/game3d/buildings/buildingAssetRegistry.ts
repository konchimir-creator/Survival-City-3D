'use client';

/**
 * Building Asset Registry — architecture prepared WITHOUT connecting missing files
 * Do NOT add real GLB URLs to runtime renderer while file missing (avoid 404)
 * When file exists, add entry and renderer will HEAD-check before useGLTF
 */

export type BuildingAssetType = 'abandoned' | 'residential' | 'shop' | 'industrial' | 'public';

export interface BuildingAssetDefinition {
  id: string; // e.g., 'abandoned_house_01'
  url: string; // e.g., '/models/buildings/abandoned/abandoned_house_01.glb' — only when file exists
  type: BuildingAssetType;
  scale?: number | [number, number, number]; // per-asset scale if exported in wrong units, default 1
  rotation?: number; // radians Y
  yOffset?: number; // adjust if origin not at base
  expectedHeight?: number; // for validation via Box3, e.g., 8m for shop
  collider?: 'cuboid' | { type: 'cuboid', size: [number, number, number], pos?: [number, number, number] }[];
  lod?: {
    near: string; // real GLB
    far?: string; // low-poly fallback
  };
}

// Registry — EMPTY for now, no 404s
// When you upload real file to public/models/buildings/abandoned/abandoned_house_01.glb
// then add entry:
// {
//   id: 'abandoned_house_01',
//   url: '/models/buildings/abandoned/abandoned_house_01.glb',
//   type: 'abandoned',
//   scale: 1,
//   yOffset: 0,
//   expectedHeight: 8,
//   collider: 'cuboid'
// }

export const BUILDING_ASSETS: BuildingAssetDefinition[] = [
  // Intentionally empty — no missing asset URLs to avoid 404
  // Example (commented, not active):
  // {
  //   id: 'abandoned_house_01',
  //   url: '/models/buildings/abandoned/abandoned_house_01.glb',
  //   type: 'abandoned',
  //   scale: 1,
  //   yOffset: 0,
  //   expectedHeight: 9,
  //   collider: 'cuboid'
  // }
];

/**
 * Safe check if asset exists via HEAD — prevents 404 breaking Canvas
 */
export async function checkBuildingAssetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Future loader will:
 * - check existence
 * - useGLTF if exists
 * - compute Box3 via buildingModelUtils
 * - log dimensions in F3
 * - fallback to procedural if fails
 * - use simple CuboidCollider for physics
 */
