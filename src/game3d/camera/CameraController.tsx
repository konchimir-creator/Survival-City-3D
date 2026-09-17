'use client';
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export function CameraController() {
  const { camera, gl, scene } = useThree();
  const playerPosition = useGameStore((s) => s.player.position);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3());
  const pitchRef = useRef(0.2); // vertical angle
  const distanceRef = useRef(4); // distance behind player
  const desiredDistanceRef = useRef(4);
  
  const yawRef = useRef(0);
  const pitchVelocityRef = useRef(0);
  
  // Mouse handling for pitch and zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isInShopInterior) return;
      // Only if pointer locked or hovering
      desiredDistanceRef.current = THREE.MathUtils.clamp(
        desiredDistanceRef.current + e.deltaY * 0.005,
        1.5,
        8
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (isInShopInterior) return;
      const sensitivity = 0.002;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current - e.movementY * sensitivity,
        -0.5, // look down limit
        0.9   // look up limit
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
        gl.domElement.requestPointerLock();
      }
    };
    gl.domElement.addEventListener('click', handleClick);
    return () => gl.domElement.removeEventListener('click', handleClick);
  }, [gl, isInShopInterior]);

  useFrame((state, delta) => {
    if (isInShopInterior) {
      // Inside shop: fixed camera
      camera.position.set(0, 2.5, 5);
      camera.lookAt(0, 1, 0);
      return;
    }

    // Get yaw from global (set by Player)
    const yaw = (window as any).__cameraYaw || 0;
    yawRef.current = yaw;

    // Smooth distance
    distanceRef.current = THREE.MathUtils.lerp(
      distanceRef.current,
      desiredDistanceRef.current,
      delta * 5
    );

    // Player position
    const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
    const targetHeight = 1.4; // look at chest/head
    cameraTargetRef.current.lerp(
      new THREE.Vector3(playerPos.x, playerPos.y + targetHeight, playerPos.z),
      delta * 10
    );

    // Calculate desired camera position: behind player
    const pitch = pitchRef.current;
    const distance = distanceRef.current;
    
    // Spherical coordinates
    const horizontalDist = distance * Math.cos(pitch);
    const verticalDist = distance * Math.sin(pitch);
    
    const offsetX = -Math.sin(yaw) * horizontalDist;
    const offsetZ = -Math.cos(yaw) * horizontalDist;
    const offsetY = verticalDist + 0.5; // slight height

    const desiredPos = new THREE.Vector3(
      cameraTargetRef.current.x + offsetX,
      cameraTargetRef.current.y + offsetY,
      cameraTargetRef.current.z + offsetZ
    );

    // Camera collision - raycast from target to desired position
    // Simple: check against ground and approximate building collisions
    // For true collision we'd need rapier raycast, but for MVP use simple checks
    const rayDir = new THREE.Vector3().subVectors(desiredPos, cameraTargetRef.current).normalize();
    const maxDist = desiredPos.distanceTo(cameraTargetRef.current);
    
    // Use Three.js raycaster against scene (we need to mark colliders)
    // For simplicity, we'll just prevent camera going below ground
    if (desiredPos.y < 0.5) {
      desiredPos.y = 0.5;
    }

    // Smooth camera movement
    cameraPosRef.current.lerp(desiredPos, delta * 8);
    
    // Apply to camera
    (camera as THREE.PerspectiveCamera).position.copy(cameraPosRef.current);
    camera.lookAt(cameraTargetRef.current);

    // Update camera's position in store for minimap etc
    (window as any).__cameraPosition = cameraPosRef.current.clone();
  });

  return null;
}
