'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { playerTransformRef } from '@/game3d/player/playerTransformRef';

// SAFE_SPAWN for validation
const SAFE_SPAWN: [number, number, number] = [15, 2, 15];
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
  const playerPosition = useGameStore((s) => s.player.position); // fallback if ref not ready
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3());
  const pitchRef = useRef(DEFAULT_PITCH);
  const distanceRef = useRef(DEFAULT_DISTANCE);
  const desiredDistanceRef = useRef(DEFAULT_DISTANCE);
  const yawRef = useRef(DEFAULT_YAW);
  const currentDistanceRef = useRef(DEFAULT_DISTANCE);
  const initializedRef = useRef(false);
  
  // CAMERA COLLISION DISABLED FOR THIS FIX - per task 12
  // const collisionEnabledRef = useRef(false);

  useEffect(() => {
    console.log('[Camera] Initialized - collision DISABLED for player fix, reading from playerTransformRef');
    (window as any).__cameraCollisionEnabled = false;
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
        // Hard reset position next frame
        initializedRef.current = false;
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
      // Focus canvas, pointer lock only if supported, NOT required for movement
      try {
        gl.domElement.focus();
      } catch {}
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

      // SOURCE OF TRUTH: real RigidBody translation via shared ref, not Zustand
      let pPos: [number, number, number];
      let isFromRef = false;
      
      if (playerTransformRef.current.mounted && playerTransformRef.current.position) {
        const pos = playerTransformRef.current.position;
        if (Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)) {
          pPos = [pos.x, pos.y, pos.z];
          isFromRef = true;
        } else {
          pPos = playerPosition as any;
        }
      } else {
        pPos = playerPosition as any;
      }

      // Validate player position
      if (!pPos || pPos.length !== 3 || !pPos.every((v) => Number.isFinite(v))) {
        pPos = SAFE_SPAWN;
      }
      
      if (Math.abs(pPos[0]) > 200 || Math.abs(pPos[2]) > 200 || pPos[1] < -10 || pPos[1] > 50) {
        pPos = SAFE_SPAWN;
      }

      // Get yaw from global
      let yaw = (window as any).__cameraYaw;
      if (!Number.isFinite(yaw)) yaw = DEFAULT_YAW;
      yawRef.current = yaw;

      // Validate pitch
      if (!Number.isFinite(pitchRef.current)) {
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
        // Also set camera position directly to desired behind player
        const pitch = pitchRef.current;
        const dist = distanceRef.current;
        const horiz = dist * Math.cos(pitch);
        const vert = dist * Math.sin(pitch);
        const offsetX = -Math.sin(yaw) * horiz;
        const offsetZ = -Math.cos(yaw) * horiz;
        const offsetY = vert + 0.3;
        cameraPosRef.current.set(
          desiredTarget.x + offsetX,
          desiredTarget.y + offsetY,
          desiredTarget.z + offsetZ
        );
        initializedRef.current = true;
        console.log(`[Camera] Initialized target ${desiredTarget.x.toFixed(2)},${desiredTarget.y.toFixed(2)},${desiredTarget.z.toFixed(2)} pos ${cameraPosRef.current.x.toFixed(2)},${cameraPosRef.current.y.toFixed(2)},${cameraPosRef.current.z.toFixed(2)}`);
      } else {
        cameraTargetRef.current.lerp(desiredTarget, delta * 12);
      }

      if (!Number.isFinite(cameraTargetRef.current.x) || !Number.isFinite(cameraTargetRef.current.y) || !Number.isFinite(cameraTargetRef.current.z)) {
        cameraTargetRef.current.copy(desiredTarget);
      }

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

      if (!Number.isFinite(desiredPos.x) || !Number.isFinite(desiredPos.y) || !Number.isFinite(desiredPos.z)) {
        desiredPos.set(
          cameraTargetRef.current.x,
          cameraTargetRef.current.y + 2.2,
          cameraTargetRef.current.z + 5
        );
      }

      // CAMERA COLLISION DISABLED FOR THIS FIX
      let finalDistance = desiredDistance;
      let collisionHit = false;
      let hitDistance = -1;
      let hitInfo = 'collision disabled (player fix)';

      if (!Number.isFinite(finalDistance)) finalDistance = desiredDistance;
      finalDistance = THREE.MathUtils.clamp(finalDistance, 1.5, MAX_DISTANCE);

      currentDistanceRef.current = THREE.MathUtils.lerp(
        currentDistanceRef.current,
        finalDistance,
        delta * 5
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
        finalDesiredPos.copy(desiredPos);
      }

      // HARD RESET if distance camera->player >20m
      const distToPlayer = finalDesiredPos.distanceTo(new THREE.Vector3(pPos[0], pPos[1]+1.4, pPos[2]));
      // Actually check cameraPosRef to player
      const currentDistToPlayer = cameraPosRef.current.distanceTo(new THREE.Vector3(pPos[0], pPos[1]+1.4, pPos[2]));
      if (currentDistToPlayer > 20) {
        console.warn(`[Camera] Distance to player ${currentDistToPlayer.toFixed(1)}m >20m - hard reset`);
        cameraPosRef.current.copy(finalDesiredPos);
        cameraTargetRef.current.copy(desiredTarget);
        currentDistanceRef.current = desiredDistance;
      }

      if (!initializedRef.current) {
        cameraPosRef.current.copy(finalDesiredPos);
      } else {
        const smoothSpeed = 8;
        cameraPosRef.current.lerp(finalDesiredPos, delta * smoothSpeed);
      }
      
      if (!Number.isFinite(cameraPosRef.current.x) || !Number.isFinite(cameraPosRef.current.y) || !Number.isFinite(cameraPosRef.current.z)) {
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
        collisionEnabled: false,
        collisionHit,
        hitDistance: hitDistance >= 0 ? hitDistance.toFixed(2) : 'none',
        hitInfo,
        playerPos: `${playerPos.x.toFixed(2)},${playerPos.y.toFixed(2)},${playerPos.z.toFixed(2)} from ${isFromRef ? 'REF' : 'ZUSTAND'}`,
        cameraPos: `${cameraPosRef.current.x.toFixed(2)},${cameraPosRef.current.y.toFixed(2)},${cameraPosRef.current.z.toFixed(2)}`,
        targetPos: `${cameraTargetRef.current.x.toFixed(2)},${cameraTargetRef.current.y.toFixed(2)},${cameraTargetRef.current.z.toFixed(2)}`,
        initialized: initializedRef.current,
        distToPlayer: currentDistToPlayer.toFixed(2),
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
