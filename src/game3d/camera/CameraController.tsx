'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { playerTransformRef } from '@/game3d/player/playerTransformRef';

const SAFE_SPAWN: [number, number, number] = [15, 3, 15];
const DEFAULT_YAW = 0;
const DEFAULT_PITCH = 0.25;
const DEFAULT_DISTANCE = 4.5;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 7;
const MIN_PITCH = -0.15;
const MAX_PITCH = 0.65;
const FOV = 62;
const MOUSE_SENSITIVITY = 0.0025;

export function CameraController() {
  const { camera, gl } = useThree();
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
  
  const mouseDeltaRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const isDraggingRef = useRef(false);
  const prevYawRef = useRef(DEFAULT_YAW);

  useEffect(() => {
    console.log('[Camera] Initialized - collision OFF, yaw/pitch single source yawRef/pitchRef');
    (window as any).__cameraCollisionEnabled = false;
    (window as any).__cameraYaw = DEFAULT_YAW;
    (window as any).__cameraPitch = DEFAULT_PITCH;
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
      const isPointerLocked = !!document.pointerLockElement;
      const isDragging = isDraggingRef.current;

      if (!isPointerLocked && !isDragging) return;
      if (isInShopInterior) return;

      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;

      const mx = e.movementX || 0;
      const my = e.movementY || 0;

      mouseDeltaRef.current.x = mx;
      mouseDeltaRef.current.y = my;

      const prevYaw = yawRef.current;
      prevYawRef.current = prevYaw;

      const invertY = store.settings.invertY ?? false;

      // Horizontal mouse -> YAW (unchanged)
      yawRef.current -= mx * MOUSE_SENSITIVITY;

      // Vertical mouse -> PITCH - FIXED: invert sign per task, plus Invert Y setting
      // OFF (default): mouse UP -> camera HIGHER
      // Previous code was pitch -= my, which was inverted per production test, so now OFF = pitch += my
      let pitchDelta = my * MOUSE_SENSITIVITY;
      let newPitch: number;
      if (!invertY) {
        newPitch = THREE.MathUtils.clamp(
          pitchRef.current + pitchDelta,
          MIN_PITCH,
          MAX_PITCH
        );
      } else {
        newPitch = THREE.MathUtils.clamp(
          pitchRef.current - pitchDelta,
          MIN_PITCH,
          MAX_PITCH
        );
      }
      pitchRef.current = newPitch;

      // Mirror to globals for debug/F3, not source of truth
      (window as any).__cameraYaw = yawRef.current;
      (window as any).__cameraPitch = pitchRef.current;
      (window as any).__cameraMouseDelta = { x: mx, y: my, yawPrev: prevYaw, yawCurr: yawRef.current, pitch: newPitch, pointerLock: isPointerLocked ? 'YES' : 'NO' };

      // For F3 immediate feedback
      if (Math.abs(mx) > 0.1 || Math.abs(my) > 0.1) {
        // console.log(`[Camera] Mouse mx=${mx} my=${my} yaw ${prevYaw.toFixed(3)}->${yawRef.current.toFixed(3)} pitch ${newPitch.toFixed(3)}`);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDraggingRef.current = false;
      }
    };

    const handleMobileCamera = (e: any) => {
      const { dx, dy } = e.detail || {};
      const store = useGameStore.getState();
      const invertY = store.settings.invertY ?? false;
      // Mobile: horizontal delta -> yaw, vertical -> pitch, same refs, same invert logic
      if (dx !== undefined) {
        const prevYaw = yawRef.current;
        prevYawRef.current = prevYaw;
        yawRef.current -= dx * 0.005;
        (window as any).__cameraYaw = yawRef.current;
        mouseDeltaRef.current.x = dx;
      }
      if (dy !== undefined) {
        let newPitch: number;
        if (!invertY) {
          newPitch = THREE.MathUtils.clamp(
            pitchRef.current + dy * 0.005,
            MIN_PITCH,
            MAX_PITCH
          );
        } else {
          newPitch = THREE.MathUtils.clamp(
            pitchRef.current - dy * 0.005,
            MIN_PITCH,
            MAX_PITCH
          );
        }
        pitchRef.current = newPitch;
        (window as any).__cameraPitch = newPitch;
        mouseDeltaRef.current.y = dy;
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
        initializedRef.current = false;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mobileCamera' as any, handleMobileCamera as any);
    window.addEventListener('keydown', handleResetCamera);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mobileCamera' as any, handleMobileCamera as any);
      window.removeEventListener('keydown', handleResetCamera);
    };
  }, [isInShopInterior]);

  useEffect(() => {
    const handleClick = () => {
      if (isInShopInterior) return;
      const store = useGameStore.getState();
      if (store.isInventoryOpen || store.isMenuOpen || store.isDialogOpen || store.isCharacterOpen || store.isMapOpen) return;
      try { gl.domElement.focus(); } catch {}
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

      if (!pPos || pPos.length !== 3 || !pPos.every((v) => Number.isFinite(v))) pPos = SAFE_SPAWN;
      if (Math.abs(pPos[0]) > 200 || Math.abs(pPos[2]) > 200 || pPos[1] < -10 || pPos[1] > 50) pPos = SAFE_SPAWN;

      // SINGLE SOURCE OF TRUTH: yawRef/pitchRef, not global
      const yaw = yawRef.current;
      const pitch = pitchRef.current;

      if (!Number.isFinite(pitchRef.current)) pitchRef.current = DEFAULT_PITCH;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, MIN_PITCH, MAX_PITCH);
      if (!Number.isFinite(distanceRef.current)) distanceRef.current = DEFAULT_DISTANCE;
      if (!Number.isFinite(desiredDistanceRef.current)) desiredDistanceRef.current = DEFAULT_DISTANCE;
      desiredDistanceRef.current = THREE.MathUtils.clamp(desiredDistanceRef.current, MIN_DISTANCE, MAX_DISTANCE);

      distanceRef.current = THREE.MathUtils.lerp(distanceRef.current, desiredDistanceRef.current, delta * 4);
      if (!Number.isFinite(distanceRef.current)) distanceRef.current = DEFAULT_DISTANCE;

      const playerPos = new THREE.Vector3(pPos[0], pPos[1], pPos[2]);
      const targetHeight = 1.4;
      const desiredTarget = new THREE.Vector3(playerPos.x, playerPos.y + targetHeight, playerPos.z);

      if (!initializedRef.current) {
        cameraTargetRef.current.copy(desiredTarget);
        const horiz = distanceRef.current * Math.cos(pitch);
        const vert = distanceRef.current * Math.sin(pitch);
        const offsetX = -Math.sin(yaw) * horiz;
        const offsetZ = -Math.cos(yaw) * horiz;
        const offsetY = vert + 0.3;
        cameraPosRef.current.set(desiredTarget.x + offsetX, desiredTarget.y + offsetY, desiredTarget.z + offsetZ);
        initializedRef.current = true;
        console.log(`[Camera] Initialized target ${desiredTarget.x.toFixed(2)},${desiredTarget.y.toFixed(2)},${desiredTarget.z.toFixed(2)} pos ${cameraPosRef.current.x.toFixed(2)},${cameraPosRef.current.y.toFixed(2)},${cameraPosRef.current.z.toFixed(2)} yaw ${yaw.toFixed(2)}`);
      } else {
        cameraTargetRef.current.lerp(desiredTarget, delta * 12);
      }

      if (!Number.isFinite(cameraTargetRef.current.x)) cameraTargetRef.current.copy(desiredTarget);

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

      if (!Number.isFinite(desiredPos.x)) desiredPos.set(cameraTargetRef.current.x, cameraTargetRef.current.y + 2.2, cameraTargetRef.current.z + 5);

      let finalDistance = desiredDistance;
      finalDistance = THREE.MathUtils.clamp(finalDistance, 1.5, MAX_DISTANCE);
      currentDistanceRef.current = THREE.MathUtils.lerp(currentDistanceRef.current, finalDistance, delta * 5);
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

      if (finalDesiredPos.y < 0.8) finalDesiredPos.y = 0.8;
      if (!Number.isFinite(finalDesiredPos.x)) finalDesiredPos.copy(desiredPos);

      const currentDistToPlayer = cameraPosRef.current.distanceTo(new THREE.Vector3(pPos[0], pPos[1]+1.4, pPos[2]));
      if (currentDistToPlayer > 20) {
        console.warn(`[Camera] Distance ${currentDistToPlayer.toFixed(1)}m >20m hard reset`);
        cameraPosRef.current.copy(finalDesiredPos);
        cameraTargetRef.current.copy(desiredTarget);
        currentDistanceRef.current = desiredDistance;
      }

      cameraPosRef.current.lerp(finalDesiredPos, delta * 8);
      if (!Number.isFinite(cameraPosRef.current.x)) cameraPosRef.current.copy(finalDesiredPos);

      (camera as THREE.PerspectiveCamera).fov = FOV;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      (camera as THREE.PerspectiveCamera).position.copy(cameraPosRef.current);
      camera.lookAt(cameraTargetRef.current);

      (window as any).__cameraPosition = cameraPosRef.current.clone();
      (window as any).__cameraTarget = cameraTargetRef.current.clone();
      (window as any).__cameraDistance = currentDistanceRef.current;
      // Mirror, not source
      (window as any).__cameraYaw = yawRef.current;
      (window as any).__cameraPitch = pitchRef.current;
      (window as any).__cameraDebug = {
        yaw: yaw.toFixed(3),
        pitch: pitch.toFixed(3),
        desiredDistance: desiredDistance.toFixed(2),
        currentDistance: currentDistanceRef.current.toFixed(2),
        finalDistance: finalDistance.toFixed(2),
        collisionEnabled: false,
        collisionHit: false,
        hitDistance: 'none',
        hitInfo: 'collision disabled (camera yaw fix)',
        playerPos: `${playerPos.x.toFixed(2)},${playerPos.y.toFixed(2)},${playerPos.z.toFixed(2)} from ${isFromRef ? 'REF' : 'ZUSTAND'}`,
        cameraPos: `${cameraPosRef.current.x.toFixed(2)},${cameraPosRef.current.y.toFixed(2)},${cameraPosRef.current.z.toFixed(2)}`,
        targetPos: `${cameraTargetRef.current.x.toFixed(2)},${cameraTargetRef.current.y.toFixed(2)},${cameraTargetRef.current.z.toFixed(2)}`,
        initialized: initializedRef.current,
        distToPlayer: currentDistToPlayer.toFixed(2),
        mouseDelta: `${mouseDeltaRef.current.x},${mouseDeltaRef.current.y}`,
        yawPrev: prevYawRef.current.toFixed(3),
        yawCurr: yawRef.current.toFixed(3),
        pointerLock: document.pointerLockElement ? 'YES' : 'NO',
      };
    } catch (e) {
      console.error('[Camera] Frame error', e);
      try {
        const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
        if (!Number.isFinite(playerPos.x)) playerPos.set(15, 3, 15);
        cameraTargetRef.current.lerp(new THREE.Vector3(playerPos.x, playerPos.y + 1.4, playerPos.z), delta * 5);
        const yaw = yawRef.current ?? 0;
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
