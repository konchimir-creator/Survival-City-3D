'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export function CameraController() {
  const { camera, gl } = useThree();
  const rapierContext = useRapier();
  const playerPosition = useGameStore((s) => s.player.position);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3(5, 3, 10));
  const pitchRef = useRef(0.25);
  const distanceRef = useRef(5);
  const desiredDistanceRef = useRef(5);
  const yawRef = useRef(0);
  const currentDistanceRef = useRef(5);
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isInShopInterior) return;
      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;
      
      desiredDistanceRef.current = THREE.MathUtils.clamp(
        desiredDistanceRef.current + e.deltaY * 0.008,
        1.8,
        8
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (isInShopInterior) return;
      const sensitivity = 0.0025;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * sensitivity,
        -0.4,
        0.75
      );
      (window as any).__cameraPitch = pitchRef.current;
    };

    const handleMobileCamera = (e: any) => {
      const { dx, dy } = e.detail || {};
      if (dx !== undefined) {
        // yaw handled in Player via __cameraYaw, but also here
      }
      if (dy !== undefined) {
        pitchRef.current = THREE.MathUtils.clamp(
          pitchRef.current - dy * 0.005,
          -0.4,
          0.75
        );
        (window as any).__cameraPitch = pitchRef.current;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mobileCamera' as any, handleMobileCamera as any);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mobileCamera' as any, handleMobileCamera as any);
    };
  }, [isInShopInterior]);

  useEffect(() => {
    const handleClick = () => {
      if (isInShopInterior) return;
      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;
      if (!document.pointerLockElement) {
        try {
          const p = gl.domElement.requestPointerLock() as any;
          if (p && p.catch) p.catch(() => {});
        } catch {}
      }
    };
    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [gl, isInShopInterior]);

  useFrame((state, delta) => {
    try {
      if (isInShopInterior) {
        camera.position.set(0, 2.5, 5);
        camera.lookAt(0, 1, 0);
        return;
      }

      const yaw = (window as any).__cameraYaw ?? 0;
      yawRef.current = yaw;

      distanceRef.current = THREE.MathUtils.lerp(
        distanceRef.current,
        desiredDistanceRef.current,
        delta * 4
      );

      const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
      const targetHeight = 1.5;
      cameraTargetRef.current.lerp(
        new THREE.Vector3(playerPos.x, playerPos.y + targetHeight, playerPos.z),
        delta * 12
      );

      const pitch = pitchRef.current;
      const desiredDistance = distanceRef.current;
      
      const horizontalDist = desiredDistance * Math.cos(pitch);
      const verticalDist = desiredDistance * Math.sin(pitch);
      
      const offsetX = -Math.sin(yaw) * horizontalDist;
      const offsetZ = -Math.cos(yaw) * horizontalDist;
      const offsetY = verticalDist + 0.3;

      const desiredPos = new THREE.Vector3(
        cameraTargetRef.current.x + offsetX,
        cameraTargetRef.current.y + offsetY,
        cameraTargetRef.current.z + offsetZ
      );

      // Camera collision with safe fallback
      let finalDistance = desiredDistance;
      let collisionHit = false;

      try {
        const world = rapierContext?.world;
        const rapier = rapierContext?.rapier;
        
        if (world && rapier && rapier.Ray) {
          const origin = { 
            x: cameraTargetRef.current.x, 
            y: cameraTargetRef.current.y, 
            z: cameraTargetRef.current.z 
          };
          const dirVec = new THREE.Vector3().subVectors(desiredPos, cameraTargetRef.current);
          const maxDist = dirVec.length();
          
          if (maxDist > 0.1) {
            dirVec.normalize();
            const rayDir = { x: dirVec.x, y: dirVec.y, z: dirVec.z };
            const ray = new rapier.Ray(origin, rayDir);
            
            // Safe castRay call - different versions have different signatures
            let hit = null;
            try {
              // Try with 3 args (newer)
              hit = (world as any).castRay(ray, maxDist, true);
            } catch {
              try {
                // Try with 2 args
                hit = (world as any).castRay(ray, maxDist);
              } catch {
                hit = null;
              }
            }
            
            if (hit && typeof hit.timeOfImpact === 'number') {
              const hitDistance = hit.timeOfImpact;
              if (hitDistance < maxDist) {
                finalDistance = Math.max(1.0, hitDistance - 0.3);
                collisionHit = true;
                (window as any).__cameraNearObstacle = hitDistance < 2.5;
              } else {
                (window as any).__cameraNearObstacle = false;
              }
            } else {
              (window as any).__cameraNearObstacle = false;
            }
          }
        }
      } catch (e) {
        // Raycast failed - fallback to no collision, don't crash
        console.warn('[Camera] Raycast failed, using fallback', e);
        finalDistance = desiredDistance;
        (window as any).__cameraNearObstacle = false;
      }

      currentDistanceRef.current = THREE.MathUtils.lerp(
        currentDistanceRef.current,
        finalDistance,
        delta * (collisionHit ? 15 : 5)
      );

      const finalHorizontal = currentDistanceRef.current * Math.cos(pitch);
      const finalVertical = currentDistanceRef.current * Math.sin(pitch);
      
      const finalOffsetX = -Math.sin(yaw) * finalHorizontal;
      const finalOffsetZ = -Math.cos(yaw) * finalHorizontal;
      const finalOffsetY = finalVertical + 0.3;

      const finalDesiredPos = new THREE.Vector3(
        cameraTargetRef.current.x + finalOffsetX,
        cameraTargetRef.current.y + finalOffsetY,
        cameraTargetRef.current.z + finalOffsetZ
      );

      if (finalDesiredPos.y < 0.8) {
        finalDesiredPos.y = 0.8;
      }

      const smoothSpeed = collisionHit ? 20 : 8;
      cameraPosRef.current.lerp(finalDesiredPos, delta * smoothSpeed);
      
      (camera as THREE.PerspectiveCamera).position.copy(cameraPosRef.current);
      camera.lookAt(cameraTargetRef.current);

      (window as any).__cameraPosition = cameraPosRef.current.clone();
      (window as any).__cameraTarget = cameraTargetRef.current.clone();
      (window as any).__cameraDistance = currentDistanceRef.current;
    } catch (e) {
      console.error('[Camera] Frame error, fallback', e);
      // Fallback: simple follow without collision
      try {
        const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
        cameraTargetRef.current.lerp(new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z), delta * 5);
        const yaw = (window as any).__cameraYaw ?? 0;
        const dist = 5;
        camera.position.set(
          cameraTargetRef.current.x - Math.sin(yaw) * dist,
          cameraTargetRef.current.y + 2,
          cameraTargetRef.current.z - Math.cos(yaw) * dist
        );
        camera.lookAt(cameraTargetRef.current);
      } catch {}
    }
  });

  return null;
}
