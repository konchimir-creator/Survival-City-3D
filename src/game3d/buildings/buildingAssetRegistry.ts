'use client';

/**
 * Building Asset Registry — architecture prepared WITHOUT connecting missing files
 * Now includes real file that exists on VPS via LFS commit decbb44
 * Code checks existence via HEAD before useGLTF, so no 404 crash in sandbox
 */

export type BuildingAssetType = 'abandoned' | 'residential' | 'shop' | 'industrial' | 'public';

export interface BuildingAssetDefinition {
  id: string;
  url: string;
  type: BuildingAssetType;
  scale?: number | [number, number, number];
  rotation?: number;
  yOffset?: number;
  expectedHeight?: number;
  collider?: 'cuboid' | { type: 'cuboid', size: [number, number, number], pos?: [number, number, number] }[];
  lod?: {
    near: string;
    far?: string;
  };
}

export const BUILDING_ASSETS: BuildingAssetDefinition[] = [
  {
    id: 'abandoned_house_01',
    url: '/models/buildings/abandoned/abandoned_house_01.glb',
    type: 'abandoned',
    scale: 14.8, // explicit local scale based on real production Box3: raw H 0.912 -> 13.5m W0.621 D0.571
    rotation: 0, // front should face +Z to sidewalk, tune after material fix (0 or PI or PI/2 etc)
    yOffset: 0, // raw minY≈0 so base near ground Y=0
    expectedHeight: 13.5,
    collider: 'cuboid',
  },
  {
    id: 'abandoned_house_02',
    url: '/models/buildings/abandoned/abandoned_house_02.glb',
    type: 'abandoned',
    scale: 1, // DIAGNOSTIC stage: do NOT inherit 14.8 from house_01, get RAW Box3 first
    rotation: 0,
    yOffset: 0,
    expectedHeight: undefined, // unknown until production Box3
    collider: 'cuboid',
  },
];

export async function checkBuildingAssetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
