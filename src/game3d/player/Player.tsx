'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { PlayerModel } from './PlayerModel';
import { usePlayerControls } from './usePlayerControls';

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { rapier, world } = useRapier();
  const { inputRef, consumeMouseDelta } = usePlayerControls();
  
  const playerPosition = useGameStore((s) => s.player.position);
  const playerRotation = useGameStore((s) => s.player.rotation);
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const setPlayerRotation = useGameStore((s) => s.setPlayerRotation);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  const isInventoryOpen = useGameStore((s) => s.isInventoryOpen);
  const isMenuOpen = useGameStore((s) => s.isMenuOpen);
  const isDialogOpen = useGameStore((s) => s.isDialogOpen);
  
  const [animation, setAnimation] = useState<'idle' | 'walk' | 'run'>('idle');
  const [moveSpeed, setMoveSpeed] = useState(0);
  const rotationRef = useRef(playerRotation);
  const velocityRef = useRef(new THREE.Vector3());
  
  // Camera yaw - separate from player rotation for smooth turning
  const cameraYawRef = useRef(playerRotation);
  const playerYawRef = useRef(playerRotation);
  
  // Initialize position from store
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation({ x: playerPosition[0], y: playerPosition[1], z: playerPosition[2] }, true);
      rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    
    // Don't move if in interior or UI open
    const isUIBlocking = isInShopInterior || isInventoryOpen || isMenuOpen || isDialogOpen;
    
    // Mouse look - camera rotation
    const mouseDelta = consumeMouseDelta();
    if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
      const sensitivity = 0.002;
      cameraYawRef.current -= mouseDelta.x * sensitivity;
      // Clamp vertical? We'll handle in camera controller
    }

    // If UI blocking, just sync position and return
    if (isUIBlocking) {
      const pos = rigidBodyRef.current.translation();
      setPlayerPosition([pos.x, pos.y, pos.z]);
      return;
    }

    // Input vector
    const input = inputRef.current;
    const forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const right = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const isMovingInput = forward !== 0 || right !== 0;
    const isRunning = input.run && isMovingInput;

    // Calculate movement direction relative to camera
    const camYaw = cameraYawRef.current;
    const moveDir = new THREE.Vector3();
    
    if (isMovingInput) {
      // Forward is -Z, right is +X in Three.js
      // But we want movement relative to camera yaw
      const inputAngle = Math.atan2(right, forward); // angle of input
      const worldAngle = camYaw + inputAngle;
      
      moveDir.x = Math.sin(worldAngle);
      moveDir.z = Math.cos(worldAngle);
      moveDir.normalize();
      
      // Rotate player to face movement direction smoothly
      const targetYaw = worldAngle;
      // Shortest angle interpolation
      let diff = targetYaw - playerYawRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      playerYawRef.current += diff * Math.min(1, delta * 10); // smooth rotation
    }

    // Speed
    const walkSpeed = 2.5;
    const runSpeed = 5.5;
    const currentSpeed = isRunning ? runSpeed : walkSpeed;
    const speed = isMovingInput ? currentSpeed : 0;

    // Apply velocity to rigidbody
    const currentVel = rigidBodyRef.current.linvel();
    const targetVelX = moveDir.x * speed;
    const targetVelZ = moveDir.z * speed;
    
    // Smooth acceleration
    const accel = 15;
    const velX = THREE.MathUtils.lerp(currentVel.x, targetVelX, Math.min(1, delta * accel));
    const velZ = THREE.MathUtils.lerp(currentVel.z, targetVelZ, Math.min(1, delta * accel));
    
    // Keep Y velocity (gravity) but prevent falling too fast? Rapier handles gravity
    rigidBodyRef.current.setLinvel({ x: velX, y: currentVel.y, z: velZ }, true);
    
    // Store velocity for animation
    velocityRef.current.set(velX, 0, velZ);
    const horizSpeed = Math.sqrt(velX * velX + velZ * velZ);
    
    // Update animation state
    if (horizSpeed < 0.1) {
      if (animation !== 'idle') setAnimation('idle');
    } else if (horizSpeed > 4) {
      if (animation !== 'run') setAnimation('run');
    } else {
      if (animation !== 'walk') setAnimation('walk');
    }
    setMoveSpeed(horizSpeed);

    // Update store position and rotation
    const pos = rigidBodyRef.current.translation();
    setPlayerPosition([pos.x, pos.y, pos.z]);
    setPlayerRotation(playerYawRef.current);
    
    // Update camera yaw in store? We'll use a separate ref for camera
    // But we need to expose camera yaw to CameraController
    // Use a global-ish approach: set a property on window or use store
    (window as any).__cameraYaw = cameraYawRef.current;
    (window as any).__playerYaw = playerYawRef.current;
  });

  return (
    <RigidBody
      ref={rigidBodyRef as any}
      colliders={false}
      mass={70}
      type="dynamic"
      position={playerPosition as any}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      angularDamping={1}
      friction={0.5}
      restitution={0}
      canSleep={false}
    >
      <CapsuleCollider args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      <group rotation={[0, playerYawRef.current, 0]}>
        {/* Offset model so feet at collider bottom */}
        <group position={[0, -0.9, 0]}>
          <PlayerModel animation={animation} moveSpeed={moveSpeed} isMoving={moveSpeed > 0.1} />
        </group>
      </group>
    </RigidBody>
  );
}

// Helper hook to get camera yaw
export function useCameraYaw() {
  const [yaw, setYaw] = React.useState(0);
  useFrame(() => {
    setYaw((window as any).__cameraYaw || 0);
  });
  return yaw;
}
