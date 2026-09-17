'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export function CameraController() {
  const { camera, gl, scene } = useThree();
  const { rapier, world } = useRapier();
  const playerPosition = useGameStore((s) => s.player.position);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3(5, 3, 10));
  const pitchRef = useRef(0.25); // vertical angle - slightly above
  const distanceRef = useRef(5); // distance behind player - 4-6m as required
  const desiredDistanceRef = useRef(5);
  const yawRef = useRef(0);
  const currentDistanceRef = useRef(5); // for collision smoothing
  
  // Mouse handling for pitch and zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isInShopInterior) return;
      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;
      
      desiredDistanceRef.current = THREE.MathUtils.clamp(
        desiredDistanceRef.current + e.deltaY * 0.008,
        1.8, // min - close
        8    // max - far
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (isInShopInterior) return;
      const sensitivity = 0.0025;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * sensitivity,
        -0.4, // look down limit - don't go too low
        0.75  // look up limit
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isInShopInterior]);

  // Click to lock pointer
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
    if (isInShopInterior) {
      // Inside shop: fixed camera looking at center
      camera.position.set(0, 2.5, 5);
      camera.lookAt(0, 1, 0);
      return;
    }

    // Get yaw from global (set by Player)
    const yaw = (window as any).__cameraYaw ?? 0;
    yawRef.current = yaw;

    // Smooth desired distance
    distanceRef.current = THREE.MathUtils.lerp(
      distanceRef.current,
      desiredDistanceRef.current,
      delta * 4
    );

    // Player position - target at chest/shoulders height (1.4-1.6m)
    // Character should be in lower center third of screen
    const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
    const targetHeight = 1.5; // chest/shoulder height
    cameraTargetRef.current.lerp(
      new THREE.Vector3(playerPos.x, playerPos.y + targetHeight, playerPos.z),
      delta * 12 // fast follow for target
    );

    // Calculate desired camera position: behind player
    const pitch = pitchRef.current;
    const desiredDistance = distanceRef.current;
    
    // Spherical coordinates: yaw around Y, pitch up/down
    const horizontalDist = desiredDistance * Math.cos(pitch);
    const verticalDist = desiredDistance * Math.sin(pitch);
    
    const offsetX = -Math.sin(yaw) * horizontalDist;
    const offsetZ = -Math.cos(yaw) * horizontalDist;
    const offsetY = verticalDist + 0.3; // slight extra height

    const desiredPos = new THREE.Vector3(
      cameraTargetRef.current.x + offsetX,
      cameraTargetRef.current.y + offsetY,
      cameraTargetRef.current.z + offsetZ
    );

    // Camera collision - Rapier raycast from target to desired position
    let finalDistance = desiredDistance;
    let collisionHit = false;

    if (world && rapier) {
      try {
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
          
          // Cast ray to find obstacles (trees, buildings)
          const hit = world.castRay(ray, maxDist, true);
          
          if (hit) {
            const hitDistance = hit.timeOfImpact;
            // Keep camera slightly before obstacle
            finalDistance = Math.max(1.0, hitDistance - 0.3);
            collisionHit = true;
            
            // If very close to obstacle, make it transparent (handled via material in CityDetails)
            // For now just log
            if (hitDistance < 2.5) {
              (window as any).__cameraNearObstacle = true;
            } else {
              (window as any).__cameraNearObstacle = false;
            }
          } else {
            (window as any).__cameraNearObstacle = false;
          }
        }
      } catch (e) {
        // Raycast failed, use desired distance
        finalDistance = desiredDistance;
      }
    }

    // Smooth collision response - don't snap
    currentDistanceRef.current = THREE.MathUtils.lerp(
      currentDistanceRef.current,
      finalDistance,
      delta * (collisionHit ? 15 : 5) // faster when colliding, slower when returning
    );

    // Recalculate position with collision-adjusted distance
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

    // Prevent camera going below ground
    if (finalDesiredPos.y < 0.8) {
      finalDesiredPos.y = 0.8;
    }

    // Smooth camera movement - critical for pleasant feel
    const smoothSpeed = collisionHit ? 20 : 8;
    cameraPosRef.current.lerp(finalDesiredPos, delta * smoothSpeed);
    
    // Apply to camera
    (camera as THREE.PerspectiveCamera).position.copy(cameraPosRef.current);
    camera.lookAt(cameraTargetRef.current);

    // Update globals for other systems
    (window as any).__cameraPosition = cameraPosRef.current.clone();
    (window as any).__cameraTarget = cameraTargetRef.current.clone();
    (window as any).__cameraDistance = currentDistanceRef.current;
  });

  return null;
}
