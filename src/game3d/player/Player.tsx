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
  const isCharacterOpen = useGameStore((s) => s.isCharacterOpen);
  const isMapOpen = useGameStore((s) => s.isMapOpen);
  
  const [animation, setAnimation] = useState<'idle' | 'walk' | 'run'>('idle');
  const [moveSpeed, setMoveSpeed] = useState(0);
  
  // Refs for performance - avoid React state updates 60fps
  const velocityRef = useRef(new THREE.Vector3());
  const cameraYawRef = useRef(playerRotation);
  const playerYawRef = useRef(playerRotation);
  const groundedRef = useRef(true);
  const lastPosRef = useRef<[number, number, number]>(playerPosition as any);
  const frameCountRef = useRef(0);
  
  // Movement constants
  const WALK_SPEED = 3.5;
  const RUN_SPEED = 6.0;
  const ACCELERATION = 12;
  
  // Initialize position from store - safe spawn away from buildings
  useEffect(() => {
    if (rigidBodyRef.current) {
      // Safe spawn at [5, 2, 5] - center area but not inside building
      const safePos = playerPosition[0] === 0 && playerPosition[2] === 0 
        ? { x: 5, y: 2, z: 5 } 
        : { x: playerPosition[0], y: playerPosition[1], z: playerPosition[2] };
      
      rigidBodyRef.current.setTranslation(safePos, true);
      rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      console.log('[Player] Spawn at', safePos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grounded check using raycast
  const checkGrounded = (): boolean => {
    if (!rigidBodyRef.current || !world) return true;
    
    try {
      const pos = rigidBodyRef.current.translation();
      const rayOrigin = { x: pos.x, y: pos.y + 0.2, z: pos.z };
      const rayDir = { x: 0, y: -1, z: 0 };
      const ray = new rapier.Ray(rayOrigin, rayDir);
      const maxToi = 1.2;
      const hit = world.castRay(ray, maxToi, true);
      return hit !== null && hit.timeOfImpact < 1.1;
    } catch {
      return true;
    }
  };

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    
    frameCountRef.current++;
    
    // Don't move if in interior or UI open
    const isUIBlocking = isInShopInterior || isInventoryOpen || isMenuOpen || isDialogOpen || isCharacterOpen || isMapOpen;
    
    // Mouse look - camera rotation (always update even when UI blocking? No, only when not blocking and pointer locked)
    if (!isUIBlocking) {
      const mouseDelta = consumeMouseDelta();
      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
        const sensitivity = 0.0025;
        cameraYawRef.current -= mouseDelta.x * sensitivity;
      }
    } else {
      // Still consume to clear buffer
      consumeMouseDelta();
    }

    // If UI blocking, just sync position and return
    if (isUIBlocking) {
      const pos = rigidBodyRef.current.translation();
      // Throttle store updates when UI blocking to avoid 60fps setState
      if (frameCountRef.current % 10 === 0) {
        setPlayerPosition([pos.x, pos.y, pos.z]);
      }
      return;
    }

    // Input vector - using refs for performance
    const input = inputRef.current;
    const forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const right = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const isMovingInput = forward !== 0 || right !== 0;
    const isRunning = input.run && isMovingInput;

    // Calculate movement direction relative to camera yaw
    const camYaw = cameraYawRef.current;
    const moveDir = new THREE.Vector3();
    
    if (isMovingInput) {
      // Input angle: atan2(right, forward)
      // W = forward=1, right=0 => angle 0
      // D = forward=0, right=1 => angle 90deg
      // S = forward=-1 => 180deg
      // A = right=-1 => -90deg
      const inputAngle = Math.atan2(right, forward);
      const worldAngle = camYaw + inputAngle;
      
      moveDir.x = Math.sin(worldAngle);
      moveDir.z = Math.cos(worldAngle);
      moveDir.normalize(); // Important: normalize diagonal W+D
      
      // Rotate player to face movement direction smoothly
      const targetYaw = worldAngle;
      let diff = targetYaw - playerYawRef.current;
      // Normalize diff to -PI..PI
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      // Smooth rotation - faster when moving, slower when idle? Use 10 rad/s
      const rotationSpeed = 10;
      playerYawRef.current += diff * Math.min(1, delta * rotationSpeed);
    }

    // Speed
    const currentSpeed = isRunning ? RUN_SPEED : WALK_SPEED;
    const speed = isMovingInput ? currentSpeed : 0;

    // Apply velocity to rigidbody - preserve Y
    const currentVel = rigidBodyRef.current.linvel();
    
    // Grounded check every 5 frames for performance
    if (frameCountRef.current % 5 === 0) {
      groundedRef.current = checkGrounded();
    }

    // Target horizontal velocity
    const targetVelX = moveDir.x * speed;
    const targetVelZ = moveDir.z * speed;
    
    // Smooth acceleration/deceleration
    const accelFactor = Math.min(1, delta * ACCELERATION);
    const velX = THREE.MathUtils.lerp(currentVel.x, targetVelX, accelFactor);
    const velZ = THREE.MathUtils.lerp(currentVel.z, targetVelZ, accelFactor);
    
    // Keep Y velocity (gravity) - don't zero it
    // But if grounded and not jumping, small downward to stick to ground
    let velY = currentVel.y;
    
    rigidBodyRef.current.setLinvel({ x: velX, y: velY, z: velZ }, true);
    
    // Store velocity for animation and debug
    velocityRef.current.set(velX, velY, velZ);
    const horizSpeed = Math.sqrt(velX * velX + velZ * velZ);
    
    // Update animation state - throttle to avoid excessive setState
    if (frameCountRef.current % 6 === 0) {
      if (horizSpeed < 0.1) {
        if (animation !== 'idle') setAnimation('idle');
      } else if (horizSpeed > 4.5) {
        if (animation !== 'run') setAnimation('run');
      } else {
        if (animation !== 'walk') setAnimation('walk');
      }
      setMoveSpeed(horizSpeed);
    }

    // Update store position and rotation - throttle to 10fps for performance
    // But update window globals every frame for camera
    if (frameCountRef.current % 6 === 0) {
      const pos = rigidBodyRef.current.translation();
      setPlayerPosition([pos.x, pos.y, pos.z]);
      setPlayerRotation(playerYawRef.current);
      lastPosRef.current = [pos.x, pos.y, pos.z];
    }
    
    // Update globals every frame for camera
    (window as any).__cameraYaw = cameraYawRef.current;
    (window as any).__playerYaw = playerYawRef.current;
    (window as any).__playerVelocity = { x: velX, y: velY, z: velZ };
    (window as any).__playerGrounded = groundedRef.current;
    (window as any).__playerInput = {
      W: input.forward,
      A: input.left,
      S: input.backward,
      D: input.right,
      Shift: input.run,
      pos: lastPosRef.current,
      vel: [velX, velY, velZ],
      grounded: groundedRef.current,
    };

    // Debug log every 2 seconds if moving
    if (frameCountRef.current % 120 === 0 && isMovingInput) {
      console.log(`[Player] Move: input F:${input.forward} B:${input.backward} L:${input.left} R:${input.right} Run:${input.run} | dir ${moveDir.x.toFixed(2)},${moveDir.z.toFixed(2)} | vel ${velX.toFixed(2)},${velZ.toFixed(2)} | speed ${horizSpeed.toFixed(2)} | yaw ${playerYawRef.current.toFixed(2)}`);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef as any}
      colliders={false}
      mass={70}
      type="dynamic"
      position={[5, 2, 5] as any}
      enabledRotations={[false, false, false]}
      linearDamping={0.2}
      angularDamping={1}
      friction={0.8}
      restitution={0}
      canSleep={false}
    >
      <CapsuleCollider args={[0.65, 0.35]} position={[0, 1.0, 0]} />
      {/* Visual model */}
      <group rotation={[0, playerYawRef.current, 0]}>
        <group position={[0, 0, 0]}>
          <PlayerModel animation={animation} moveSpeed={moveSpeed} isMoving={moveSpeed > 0.1} />
        </group>
      </group>
    </RigidBody>
  );
}
