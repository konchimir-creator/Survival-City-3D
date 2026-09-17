'use client';
import * as THREE from 'three';

// Shared ref for camera to follow real RigidBody translation, not Zustand
// This is source of truth for camera follow
export const playerTransformRef = {
  current: {
    position: new THREE.Vector3(15, 2, 15),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    mounted: false,
    bodyExists: false,
    visible: false,
    lastUpdate: 0,
  }
};

// Global for debugging
if (typeof window !== 'undefined') {
  (window as any).__playerTransformRef = playerTransformRef;
  (window as any).__playerMounted = false;
  (window as any).__playerBodyExists = false;
  (window as any).__playerVisible = false;
}
