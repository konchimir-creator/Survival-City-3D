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
    scale: 1,
    rotation: 0,
    yOffset: 0,
    expectedHeight: 12,
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
