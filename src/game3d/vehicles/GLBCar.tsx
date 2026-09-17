'use client';
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Sports car GLB (user-provided, tripo3d.ai, optimized 490k -> 33k tris).
// Native axes: length along X, front (nose) = +X, rear spoiler = -X.
// Mesh is centered at origin; wheels bottom at y = -0.148 (native units).
// Game convention: vehicle forward = +Z, origin at ground level.
const CAR_URL = '/models/vehicles/sports_car.glb';
const CAR_SCALE = 4.3; // native length 1.0 -> 4.3 m (width ~2.4 m, height ~1.27 m)
const WHEEL_LIFT = 0.148 * CAR_SCALE + 0.02; // put wheels on ground (+ clearance like procedural)

interface Props {
  /** Multiplies the white baked texture -> any body color */
  tint: string;
}

export function GLBCar({ tint }: Props) {
  const { scene } = useGLTF(CAR_URL);

  // Clone scene + material per instance: shared geometry, individual tint.
  // No per-frame work here, only on tint change.
  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj: any) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const src = obj.material as THREE.MeshStandardMaterial;
      if (src && src.isMeshStandardMaterial) {
        const mat = src.clone();
        mat.color = new THREE.Color(tint);
        // Model ships with metalness 1.0 driver; without an env map that reads black.
        // Clamp to car-paint range, keep baked ORM/normal textures.
        mat.metalness = Math.min(mat.metalness, 0.35);
        mat.roughness = THREE.MathUtils.clamp(mat.roughness, 0.35, 1.0);
        obj.material = mat;
      }
    });
    return clone;
  }, [scene, tint]);

  useMemo(() => () => {
    prepared.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        (obj.material as THREE.Material).dispose();
      }
    });
  }, [prepared]);

  return (
    <group
      // front +X -> +Z (game forward)
      rotation={[0, -Math.PI / 2, 0]}
      scale={CAR_SCALE}
      position={[0, WHEEL_LIFT, 0]}
    >
      <primitive object={prepared} />
    </group>
  );
}

useGLTF.preload(CAR_URL);
