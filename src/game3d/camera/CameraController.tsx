'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

// SAFE_SPAWN for camera target validation
const SAFE_SPAWN: [number, number, number] = [15, 2, 15];
const MIN_CAMERA_DISTANCE = 1.5;
const DEFAULT_YAW = 0;
const DEFAULT_PITCH = 0.25;
const DEFAULT_DISTANCE = 4.5;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 7;
const MIN_PITCH = -0.15;
const MAX_PITCH = 0.65;
const FOV = 62;

export function CameraController() {
  const { camera, gl } = useThree();
  const rapierContext = useRapier();
  const playerPosition = useGameStore((s) => s.player.position);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3());
  const pitchRef = useRef(DEFAULT_PITCH);
  const distanceRef = useRef(DEFAULT_DISTANCE);
  const desiredDistanceRef = useRef(DEFAULT_DISTANCE);
  const yawRef = useRef(DEFAULT_YAW);
  const currentDistanceRef = useRef(DEFAULT_DISTANCE);
  const initializedRef = useRef(false);
  const collisionEnabledRef = useRef(false); // Start disabled for baseline, enable after 1s
  
  // Enable collision after baseline verified (1 second after mount)
  useEffect(() => {
    const t = setTimeout(() => {
      collisionEnabledRef.current = true;
      console.log('[Camera] Collision enabled after baseline');
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isInShopInterior) return;
      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;
      
      desiredDistanceRef.current = THREE.MathUtils.clamp(
        desiredDistanceRef.current + e.deltaY * 0.008,
        MIN_DISTANCE,
        MAX_DISTANCE
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (isInShopInterior) return;
      const sensitivity = 0.0025;
      const newPitch = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * sensitivity,
        MIN_PITCH,
        MAX_PITCH
      );
      if (Number.isFinite(newPitch)) {
        pitchRef.current = newPitch;
        (window as any).__cameraPitch = newPitch;
      }
    };

    const handleMobileCamera = (e: any) => {
      const { dy } = e.detail || {};
      if (dy !== undefined) {
        const newPitch = THREE.MathUtils.clamp(
          pitchRef.current - dy * 0.005,
          MIN_PITCH,
          MAX_PITCH
        );
        if (Number.isFinite(newPitch)) {
          pitchRef.current = newPitch;
          (window as any).__cameraPitch = newPitch;
        }
      }
    };

    const handleResetCamera = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' || e.code === 'Home') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        
        console.log('[Camera] Reset requested');
        yawRef.current = DEFAULT_YAW;
        pitchRef.current = DEFAULT_PITCH;
        desiredDistanceRef.current = DEFAULT_DISTANCE;
        distanceRef.current = DEFAULT_DISTANCE;
        currentDistanceRef.current = DEFAULT_DISTANCE;
        (window as any).__cameraYaw = DEFAULT_YAW;
        (window as any).__cameraPitch = DEFAULT_PITCH;
        (window as any).__cameraDistance = DEFAULT_DISTANCE;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mobileCamera' as any, handleMobileCamera as any);
    window.addEventListener('keydown', handleResetCamera);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mobileCamera' as any, handleMobileCamera as any);
      window.removeEventListener('keydown', handleResetCamera);
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

  // Also listen to mobile pitch global
  useEffect(() => {
    const interval = setInterval(() => {
      const mobilePitch = (window as any).__cameraPitch;
      if (mobilePitch !== undefined && Number.isFinite(mobilePitch)) {
        // Only update if significantly different and not from mouse
        if (Math.abs(mobilePitch - pitchRef.current) > 0.001) {
          // This is set by mobile controls, respect it
          pitchRef.current = THREE.MathUtils.clamp(mobilePitch, MIN_PITCH, MAX_PITCH);
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useFrame((state, delta) => {
    try {
      if (isInShopInterior) {
        camera.position.set(0, 2.5, 5);
        camera.lookAt(0, 1, 0);
        return;
      }

      // Validate player position
      let pPos = playerPosition;
      if (!pPos || pPos.length !== 3 || !pPos.every((v) => Number.isFinite(v))) {
        console.warn('[Camera] Invalid player position, using SAFE_SPAWN', pPos);
        pPos = SAFE_SPAWN;
      }
      
      // Check bounds
      if (Math.abs(pPos[0]) > 200 || Math.abs(pPos[2]) > 200 || pPos[1] < -10 || pPos[1] > 50) {
        console.warn('[Camera] Player out of bounds, using SAFE_SPAWN', pPos);
        pPos = SAFE_SPAWN;
      }

      // Get yaw from global
      let yaw = (window as any).__cameraYaw;
      if (!Number.isFinite(yaw)) yaw = DEFAULT_YAW;
      yawRef.current = yaw;

      // Validate pitch
      if (!Number.isFinite(pitchRef.current)) {
        console.warn('[Camera] Invalid pitch, reset', pitchRef.current);
        pitchRef.current = DEFAULT_PITCH;
      }
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, MIN_PITCH, MAX_PITCH);

      // Validate distance
      if (!Number.isFinite(distanceRef.current)) distanceRef.current = DEFAULT_DISTANCE;
      if (!Number.isFinite(desiredDistanceRef.current)) desiredDistanceRef.current = DEFAULT_DISTANCE;
      desiredDistanceRef.current = THREE.MathUtils.clamp(desiredDistanceRef.current, MIN_DISTANCE, MAX_DISTANCE);

      // Smooth desired distance
      distanceRef.current = THREE.MathUtils.lerp(
        distanceRef.current,
        desiredDistanceRef.current,
        delta * 4
      );

      if (!Number.isFinite(distanceRef.current)) distanceRef.current = DEFAULT_DISTANCE;

      // Player position - target at chest height 1.4m
      const playerPos = new THREE.Vector3(pPos[0], pPos[1], pPos[2]);
      const targetHeight = 1.4;
      const desiredTarget = new THREE.Vector3(playerPos.x, playerPos.y + targetHeight, playerPos.z);

      if (!initializedRef.current) {
        // First frame: copy directly, no lerp from [0,0,0]
        cameraTargetRef.current.copy(desiredTarget);
        initializedRef.current = true;
        console.log('[Camera] Initialized target', desiredTarget);
      } else {
        cameraTargetRef.current.lerp(desiredTarget, delta * 12);
      }

      if (!Number.isFinite(cameraTargetRef.current.x) || !Number.isFinite(cameraTargetRef.current.y) || !Number.isFinite(cameraTargetRef.current.z)) {
        console.warn('[Camera] Invalid target, reset', cameraTargetRef.current);
        cameraTargetRef.current.copy(desiredTarget);
      }

      const pitch = pitchRef.current;
      const desiredDistance = distanceRef.current;
      
      // Correct formula: camera behind player
      // yaw rotation around Y, pitch up/down
      const horizontalDist = desiredDistance * Math.cos(pitch);
      const verticalDist = desiredDistance * Math.sin(pitch);
      
      // Behind player: -sin(yaw) * horiz, -cos(yaw) * horiz
      const offsetX = -Math.sin(yaw) * horizontalDist;
      const offsetZ = -Math.cos(yaw) * horizontalDist;
      const offsetY = verticalDist + 0.3;

      const desiredPos = new THREE.Vector3(
        cameraTargetRef.current.x + offsetX,
        cameraTargetRef.current.y + offsetY,
        cameraTargetRef.current.z + offsetZ
      );

      if (!Number.isFinite(desiredPos.x) || !Number.isFinite(desiredPos.y) || !Number.isFinite(desiredPos.z)) {
        console.warn('[Camera] Invalid desiredPos, reset', desiredPos);
        // Fallback to simple behind
        desiredPos.set(
          cameraTargetRef.current.x,
          cameraTargetRef.current.y + 2.2,
          cameraTargetRef.current.z + 5
        );
      }

      // Camera collision - only if enabled and safe
      let finalDistance = desiredDistance;
      let collisionHit = false;
      let hitDistance = -1;
      let hitInfo = 'none';

      if (collisionEnabledRef.current) {
        try {
          const world = rapierContext?.world;
          const rapier = rapierContext?.rapier;
          
          if (world && rapier && rapier.Ray) {
            // Start ray slightly offset from target towards camera to avoid self-hit with player collider
            // Player collider is capsule at player pos + [0,1.0,0] with height 0.65 radius 0.35
            // So start 0.5m away from target towards camera
            const dirVec = new THREE.Vector3().subVectors(desiredPos, cameraTargetRef.current);
            const maxDist = dirVec.length();
            
            if (maxDist > 0.5 && Number.isFinite(maxDist)) {
              dirVec.normalize();
              
              // Offset origin 0.5m towards camera to exit player collider
              const offsetOrigin = new THREE.Vector3()
                .copy(cameraTargetRef.current)
                .addScaledVector(dirVec, 0.5);
              
              const origin = { 
                x: offsetOrigin.x, 
                y: offsetOrigin.y, 
                z: offsetOrigin.z 
              };
              const rayDir = { x: dirVec.x, y: dirVec.y, z: dirVec.z };
              const ray = new rapier.Ray(origin, rayDir);
              
              let hit = null;
              try {
                hit = (world as any).castRay(ray, maxDist - 0.5, true);
              } catch {
                try {
                  hit = (world as any).castRay(ray, maxDist - 0.5);
                } catch {
                  hit = null;
                }
              }
              
              if (hit && typeof hit.timeOfImpact === 'number' && Number.isFinite(hit.timeOfImpact)) {
                const toi = hit.timeOfImpact;
                hitDistance = toi;
                
                // Critical checks to avoid self-hit and invalid hits
                if (toi <= 0.1) {
                  // Self-hit or too close, ignore as player collider
                  hitInfo = `self-hit ignored toi=${toi.toFixed(3)}`;
                } else if (toi < 0.5) {
                  hitInfo = `too close ignored toi=${toi.toFixed(3)}`;
                } else if (toi > maxDist) {
                  hitInfo = `beyond maxDist ignored toi=${toi.toFixed(3)} > ${maxDist.toFixed(2)}`;
                } else {
                  // Valid hit
                  finalDistance = Math.max(MIN_CAMERA_DISTANCE, toi + 0.5 - 0.3); // +0.5 because we offset origin
                  collisionHit = true;
                  hitInfo = `hit toi=${toi.toFixed(2)} finalDist=${finalDistance.toFixed(2)}`;
                  (window as any).__cameraNearObstacle = toi < 2.5;
                }
              } else {
                (window as any).__cameraNearObstacle = false;
                hitInfo = 'no hit';
              }
            }
          }
        } catch (e) {
          console.warn('[Camera] Raycast failed, fallback to no collision', e);
          finalDistance = desiredDistance;
          (window as any).__cameraNearObstacle = false;
          hitInfo = `raycast error: ${e}`;
        }
      } else {
        hitInfo = 'collision disabled (baseline)';
      }

      if (!Number.isFinite(finalDistance)) finalDistance = desiredDistance;
      finalDistance = THREE.MathUtils.clamp(finalDistance, MIN_CAMERA_DISTANCE, MAX_DISTANCE);

      currentDistanceRef.current = THREE.MathUtils.lerp(
        currentDistanceRef.current,
        finalDistance,
        delta * (collisionHit ? 15 : 5)
      );

      if (!Number.isFinite(currentDistanceRef.current)) currentDistanceRef.current = DEFAULT_DISTANCE;

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

      if (!Number.isFinite(finalDesiredPos.x) || !Number.isFinite(finalDesiredPos.y) || !Number.isFinite(finalDesiredPos.z)) {
        console.warn('[Camera] Invalid finalDesiredPos', finalDesiredPos);
        finalDesiredPos.copy(desiredPos);
      }

      // Check if final position inside building AABB (simple check)
      try {
        const buildings = [
          { pos: [45, 0, -35], size: [18, 8, 14] },
          { pos: [-50, 0, 70], size: [22, 10, 18] },
          { pos: [-90, 0, 35], size: [30, 12, 25] },
          { pos: [70, 0, -15], size: [16, 7, 12] },
          { pos: [90, 0, 60], size: [24, 10, 20] },
        ];
        
        let insideBuilding = false;
        for (const b of buildings) {
          const halfX = b.size[0]/2 + 1;
          const halfY = b.size[1]/2;
          const halfZ = b.size[2]/2 + 1;
          if (
            Math.abs(finalDesiredPos.x - b.pos[0]) < halfX &&
            Math.abs(finalDesiredPos.y - b.pos[1] - halfY) < halfY &&
            Math.abs(finalDesiredPos.z - b.pos[2]) < halfZ
          ) {
            insideBuilding = true;
            break;
          }
        }
        
        if (insideBuilding) {
          console.warn('[Camera] Inside building, fallback to baseline', finalDesiredPos);
          // Fallback to baseline without collision
          finalDesiredPos.copy(desiredPos);
          currentDistanceRef.current = desiredDistance;
        }
      } catch {}

      if (!initializedRef.current) {
        cameraPosRef.current.copy(finalDesiredPos);
      } else {
        const smoothSpeed = collisionHit ? 20 : 8;
        cameraPosRef.current.lerp(finalDesiredPos, delta * smoothSpeed);
      }
      
      if (!Number.isFinite(cameraPosRef.current.x) || !Number.isFinite(cameraPosRef.current.y) || !Number.isFinite(cameraPosRef.current.z)) {
        console.warn('[Camera] Invalid cameraPos, reset', cameraPosRef.current);
        cameraPosRef.current.copy(finalDesiredPos);
      }

      (camera as THREE.PerspectiveCamera).fov = FOV;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      (camera as THREE.PerspectiveCamera).position.copy(cameraPosRef.current);
      camera.lookAt(cameraTargetRef.current);

      (window as any).__cameraPosition = cameraPosRef.current.clone();
      (window as any).__cameraTarget = cameraTargetRef.current.clone();
      (window as any).__cameraDistance = currentDistanceRef.current;
      (window as any).__cameraYaw = yawRef.current;
      (window as any).__cameraPitch = pitchRef.current;
      (window as any).__cameraDebug = {
        yaw: yaw.toFixed(3),
        pitch: pitch.toFixed(3),
        desiredDistance: desiredDistance.toFixed(2),
        currentDistance: currentDistanceRef.current.toFixed(2),
        finalDistance: finalDistance.toFixed(2),
        collisionEnabled: collisionEnabledRef.current,
        collisionHit,
        hitDistance: hitDistance >= 0 ? hitDistance.toFixed(2) : 'none',
        hitInfo,
        playerPos: `${playerPos.x.toFixed(2)},${playerPos.y.toFixed(2)},${playerPos.z.toFixed(2)}`,
        cameraPos: `${cameraPosRef.current.x.toFixed(2)},${cameraPosRef.current.y.toFixed(2)},${cameraPosRef.current.z.toFixed(2)}`,
        targetPos: `${cameraTargetRef.current.x.toFixed(2)},${cameraTargetRef.current.y.toFixed(2)},${cameraTargetRef.current.z.toFixed(2)}`,
        initialized: initializedRef.current,
      };
    } catch (e) {
      console.error('[Camera] Frame error, fallback', e);
      try {
        const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
        if (!Number.isFinite(playerPos.x)) playerPos.set(15, 2, 15);
        cameraTargetRef.current.lerp(new THREE.Vector3(playerPos.x, playerPos.y + 1.4, playerPos.z), delta * 5);
        const yaw = (window as any).__cameraYaw ?? 0;
        const dist = 4.5;
        const pitch = 0.25;
        const horiz = dist * Math.cos(pitch);
        const vert = dist * Math.sin(pitch);
        camera.position.set(
          cameraTargetRef.current.x - Math.sin(yaw) * horiz,
          cameraTargetRef.current.y + vert + 0.3,
          cameraTargetRef.current.z - Math.cos(yaw) * horiz
        );
        camera.lookAt(cameraTargetRef.current);
      } catch {}
    }
  });

  return null;
}
