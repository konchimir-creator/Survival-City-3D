'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { PlayerModel } from './PlayerModel';
import { usePlayerControls } from './usePlayerControls';
import { playerTransformRef } from './playerTransformRef';

const SAFE_SPAWN: [number, number, number] = [15, 2, 15];
const USE_DEBUG_CUBE = false; // true = red cube for diagnostic, false = human
const SHOW_SPAWN_MARKER = true; // red column at spawn for camera check
const ENABLE_CAMERA_RELATIVE = false; // DIAGNOSTIC: false = simple world movement, true = camera-relative after fix

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
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
  
  const velocityRef = useRef(new THREE.Vector3());
  const cameraYawRef = useRef(0);
  const playerYawRef = useRef(playerRotation);
  const lastPosRef = useRef<[number, number, number]>(SAFE_SPAWN);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(false);
  const bodyCreatedRef = useRef(false);
  const startPosForTestRef = useRef<[number, number, number] | null>(null);
  
  const WALK_SPEED = 3.5;
  const RUN_SPEED = 6.0;

  // --- MOUNT DIAGNOSTIC ---
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    playerTransformRef.current.mounted = true;
    
    console.log('[Player] mounted');
    (window as any).__playerMounted = true;
    (window as any).__playerMountedTime = Date.now();
    
    // Ignore old save for diagnostic - force SAFE_SPAWN
    // But also update Zustand to SAFE_SPAWN for HUD consistency
    try {
      const store = useGameStore.getState();
      // Force SAFE_SPAWN regardless of save for this diagnostic fix
      store.setPlayerPosition([...SAFE_SPAWN] as any);
      console.log(`[Player] spawn = ${SAFE_SPAWN[0]} ${SAFE_SPAWN[1]} ${SAFE_SPAWN[2]} (forced SAFE_SPAWN, ignoring old save)`);
      (window as any).__playerSpawn = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
    } catch {}

    // TEST MOVE function for dev button
    (window as any).__testMove = () => {
      if (!rigidBodyRef.current) {
        console.warn('[TEST MOVE] No body');
        return;
      }
      try {
        const start = rigidBodyRef.current.translation();
        startPosForTestRef.current = [start.x, start.y, start.z];
        console.log(`[TEST MOVE] Start: ${start.x.toFixed(2)},${start.y.toFixed(2)},${start.z.toFixed(2)} - moving forward 1 sec`);
        
        // Direct set velocity forward +Z
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 3.5 }, true);
        
        setTimeout(() => {
          if (!rigidBodyRef.current || !startPosForTestRef.current) return;
          const end = rigidBodyRef.current.translation();
          const dx = end.x - startPosForTestRef.current[0];
          const dy = end.y - startPosForTestRef.current[1];
          const dz = end.z - startPosForTestRef.current[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          console.log(`[TEST MOVE] End: ${end.x.toFixed(2)},${end.y.toFixed(2)},${end.z.toFixed(2)} | Distance: ${dist.toFixed(2)}m`);
          if (dist > 1) {
            console.log('[TEST MOVE] PASS: Physics movement works');
          } else {
            console.error('[TEST MOVE] FAIL: distance ~=0, body/physics error');
          }
          // Stop
          try {
            rigidBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
          } catch {}
        }, 1000);
      } catch (e) {
        console.error('[TEST MOVE] Error', e);
      }
    };

    return () => {
      mountedRef.current = false;
      playerTransformRef.current.mounted = false;
      (window as any).__playerMounted = false;
    };
  }, []);

  // --- BODY CREATION DIAGNOSTIC ---
  useEffect(() => {
    const checkBody = () => {
      if (rigidBodyRef.current && !bodyCreatedRef.current) {
        bodyCreatedRef.current = true;
        playerTransformRef.current.bodyExists = true;
        console.log('[Player] body created');
        (window as any).__playerBodyExists = true;
        
        try {
          // Force SAFE_SPAWN
          rigidBodyRef.current.setTranslation({ x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] }, true);
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          console.log(`[Player] spawn = ${SAFE_SPAWN[0]} ${SAFE_SPAWN[1]} ${SAFE_SPAWN[2]}`);
          lastPosRef.current = [...SAFE_SPAWN] as any;
          playerTransformRef.current.position.set(SAFE_SPAWN[0], SAFE_SPAWN[1], SAFE_SPAWN[2]);
          // Also update shared ref for camera
          (window as any).__playerSpawn = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
        } catch (e) {
          console.warn('[Player] Spawn failed', e);
        }
      }
    };
    
    // Check immediately and after short delay
    checkBody();
    const t1 = setTimeout(checkBody, 100);
    const t2 = setTimeout(checkBody, 500);
    const t3 = setTimeout(checkBody, 1000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Input - using shared hook that uses window listeners and useRef
  const { inputRef } = usePlayerControls();

  useFrame((state, delta) => {
    try {
      if (!rigidBodyRef.current) return;
      
      frameCountRef.current++;
      
      const isUIBlocking = isInShopInterior || isInventoryOpen || isMenuOpen || isDialogOpen || isCharacterOpen || isMapOpen;
      
      // Get current translation - SOURCE OF TRUTH for camera
      let currentPos: { x: number; y: number; z: number };
      try {
        currentPos = rigidBodyRef.current.translation();
      } catch {
        return;
      }

      // Safety: if fell below map, teleport to SAFE_SPAWN
      if (currentPos.y < -10 || !Number.isFinite(currentPos.x) || !Number.isFinite(currentPos.y) || !Number.isFinite(currentPos.z)) {
        console.warn(`[Player] Fell below map or invalid pos ${currentPos.x},${currentPos.y},${currentPos.z} - teleport to SAFE_SPAWN`);
        try {
          rigidBodyRef.current.setTranslation({ x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          currentPos = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
        } catch {}
      }

      // Update shared transform ref - CAMERA READS THIS, not Zustand
      playerTransformRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
      playerTransformRef.current.lastUpdate = performance.now();
      playerTransformRef.current.visible = true;
      (window as any).__playerVisible = true;

      // If UI blocking, stop movement but still update position for camera
      if (isUIBlocking) {
        try {
          // Zero horizontal velocity when UI open
          const curVel = rigidBodyRef.current.linvel();
          rigidBodyRef.current.setLinvel({ x: 0, y: curVel.y, z: 0 }, true);
        } catch {}
        if (frameCountRef.current % 10 === 0) {
          setPlayerPosition([currentPos.x, currentPos.y, currentPos.z]);
        }
        return;
      }

      const input = inputRef.current;
      const mobileInput = (typeof window !== 'undefined' ? (window as any).__mobileInput : null) || { joyX: 0, joyY: 0, run: false };
      
      let forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      let right = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let isRunning = input.run;

      // Mobile joystick - same pipeline
      if (mobileInput.joyX !== undefined && mobileInput.joyY !== undefined) {
        if (Math.abs(mobileInput.joyX) > 0.1 || Math.abs(mobileInput.joyY) > 0.1) {
          forward = mobileInput.joyY;
          right = mobileInput.joyX;
        }
      }
      if (mobileInput.run) {
        isRunning = true;
      }

      const isMovingInput = Math.abs(forward) > 0.05 || Math.abs(right) > 0.05;
      const moveIntensity = Math.min(1, Math.sqrt(forward*forward + right*right));

      // --- SIMPLIFIED MOVEMENT PIPELINE ---
      // For diagnostic: NO camera-relative, NO acceleration smoothing, NO grounded raycast
      // Direct: KeyW -> velocity z -> setLinvel -> translation changes
      let targetVelX = 0;
      let targetVelZ = 0;
      let targetYaw = playerYawRef.current;

      if (ENABLE_CAMERA_RELATIVE) {
        // Camera-relative (after diagnostic passes)
        const camYaw = (window as any).__cameraYaw ?? 0;
        cameraYawRef.current = camYaw;
        if (isMovingInput) {
          const inputAngle = Math.atan2(right, forward);
          const worldAngle = camYaw + inputAngle;
          const moveDir = new THREE.Vector3(Math.sin(worldAngle), 0, Math.cos(worldAngle));
          moveDir.normalize();
          const speed = (isRunning ? RUN_SPEED : WALK_SPEED) * moveIntensity;
          targetVelX = moveDir.x * speed;
          targetVelZ = moveDir.z * speed;
          targetYaw = worldAngle;
        }
      } else {
        // Simple world-aligned: W = +Z, S = -Z, D = +X, A = -X
        const speed = (isRunning ? RUN_SPEED : WALK_SPEED) * moveIntensity;
        targetVelX = right * speed;
        targetVelZ = forward * speed;
        if (isMovingInput) {
          targetYaw = Math.atan2(right, forward);
        }
      }

      // Smooth yaw only for visual
      if (isMovingInput) {
        let diff = targetYaw - playerYawRef.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        playerYawRef.current += diff * Math.min(1, delta * 10);
      }

      // Direct velocity - NO lerp smoothing for diagnostic, preserve Y (gravity)
      let currentVel;
      try {
        currentVel = rigidBodyRef.current.linvel();
      } catch {
        currentVel = { x: 0, y: 0, z: 0 };
      }

      // For diagnostic, directly set target vel (no acceleration smoothing)
      const finalVelX = targetVelX;
      const finalVelZ = targetVelZ;
      const finalVelY = currentVel.y; // preserve gravity

      try {
        rigidBodyRef.current.setLinvel({ x: finalVelX, y: finalVelY, z: finalVelZ }, true);
      } catch (e) {
        console.warn('[Player] setLinvel failed', e);
      }
      
      velocityRef.current.set(finalVelX, finalVelY, finalVelZ);
      playerTransformRef.current.velocity.set(finalVelX, finalVelY, finalVelZ);
      playerTransformRef.current.yaw = playerYawRef.current;

      const horizSpeed = Math.sqrt(finalVelX * finalVelX + finalVelZ * finalVelZ);
      
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

      // Update Zustand for HUD (not for camera)
      if (frameCountRef.current % 6 === 0) {
        setPlayerPosition([currentPos.x, currentPos.y, currentPos.z]);
        setPlayerRotation(playerYawRef.current);
        lastPosRef.current = [currentPos.x, currentPos.y, currentPos.z];
      }
      
      // Globals for F3 debug
      (window as any).__cameraYaw = cameraYawRef.current;
      (window as any).__playerYaw = playerYawRef.current;
      (window as any).__playerVelocity = { x: finalVelX, y: finalVelY, z: finalVelZ };
      (window as any).__playerGrounded = true; // simplified, always true
      (window as any).__playerInput = {
        W: input.forward,
        A: input.left,
        S: input.backward,
        D: input.right,
        Shift: input.run,
        JoyX: mobileInput.joyX,
        JoyY: mobileInput.joyY,
        pos: lastPosRef.current,
        vel: [finalVelX, finalVelY, finalVelZ],
        grounded: true,
      };

      if (frameCountRef.current % 120 === 0 && isMovingInput) {
        console.log(`[Player] Move: F:${forward.toFixed(2)} R:${right.toFixed(2)} Run:${isRunning} | vel ${finalVelX.toFixed(2)},${finalVelZ.toFixed(2)} | speed ${horizSpeed.toFixed(2)} | pos ${currentPos.x.toFixed(1)},${currentPos.y.toFixed(1)},${currentPos.z.toFixed(1)}`);
      }
    } catch (e) {
      console.error('[Player] Frame error', e);
    }
  });

  return (
    <>
      {/* Spawn marker - very visible red column at SAFE_SPAWN for camera check */}
      {SHOW_SPAWN_MARKER && (
        <group position={[SAFE_SPAWN[0], 0, SAFE_SPAWN[2]]}>
          {/* Red vertical pillar */}
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          {/* Sphere on top */}
          <mesh position={[0, 6.5, 0]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          {/* Base ring */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[1, 1.5, 16]} />
            <meshBasicMaterial color="#ff0000" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      <RigidBody
        ref={rigidBodyRef as any}
        colliders={false}
        mass={70}
        type="dynamic"
        position={SAFE_SPAWN as any}
        enabledRotations={[false, false, false]}
        linearDamping={0.5}
        angularDamping={1}
        friction={0.8}
        restitution={0}
        canSleep={false}
      >
        <CapsuleCollider args={[0.65, 0.35]} position={[0, 1.0, 0]} />
        
        {/* Player model - local position relative to body, not absolute */}
        <group rotation={[0, 0, 0]}>
          {USE_DEBUG_CUBE ? (
            // DIAGNOSTIC: obvious red cube 1x2x1
            <group position={[0, 1, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 2, 1]} />
                <meshBasicMaterial color="#ff0000" />
              </mesh>
              {/* Small green top to see orientation */}
              <mesh position={[0, 1.2, 0]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshBasicMaterial color="#00ff00" />
              </mesh>
            </group>
          ) : (
            // Real humanoid - must be visible, scale 1, not culled, positioned at body origin
            <group position={[0, 0, 0]}>
              <PlayerModel animation={animation} moveSpeed={moveSpeed} isMoving={moveSpeed > 0.1} />
            </group>
          )}
        </group>
      </RigidBody>
    </>
  );
}
