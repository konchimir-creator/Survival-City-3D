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
  const rapierContext = useRapier();
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
  
  const velocityRef = useRef(new THREE.Vector3());
  const cameraYawRef = useRef(playerRotation);
  const playerYawRef = useRef(playerRotation);
  const groundedRef = useRef(true);
  const lastPosRef = useRef<[number, number, number]>(playerPosition as any);
  const frameCountRef = useRef(0);
  
  const WALK_SPEED = 3.5;
  const RUN_SPEED = 6.0;
  const ACCELERATION = 12;
  
  useEffect(() => {
    if (rigidBodyRef.current) {
      // SAFE_SPAWN [15,2,15] - open area 5m from walls/trees
      const SAFE_SPAWN = { x: 15, y: 2, z: 15 };
      let safePos = SAFE_SPAWN;
      
      // Validate current position from store
      const [x, y, z] = playerPosition;
      const isValid = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) &&
        Math.abs(x) < 200 && Math.abs(z) < 200 && y > -10 && y < 50;
      
      if (isValid && !(x === 0 && z === 0)) {
        // Check not inside building (simple)
        const buildings = [
          { pos: [45, 0, -35], size: [18, 8, 14] },
          { pos: [-50, 0, 70], size: [22, 10, 18] },
          { pos: [-90, 0, 35], size: [30, 12, 25] },
        ];
        let inside = false;
        for (const b of buildings) {
          if (Math.abs(x - b.pos[0]) < b.size[0]/2 + 2 && Math.abs(z - b.pos[2]) < b.size[2]/2 + 2) {
            inside = true;
            break;
          }
        }
        if (!inside) {
          safePos = { x, y, z };
        } else {
          console.warn('[Player] Saved pos inside building, using SAFE_SPAWN', playerPosition);
        }
      } else {
        console.log('[Player] Using SAFE_SPAWN', SAFE_SPAWN);
      }
      
      try {
        rigidBodyRef.current.setTranslation(safePos, true);
        rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        console.log('[Player] Spawn at', safePos, 'valid:', isValid);
        (window as any).__playerSpawn = safePos;
      } catch (e) {
        console.warn('[Player] Spawn failed', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkGrounded = (): boolean => {
    const world = rapierContext?.world;
    const rapier = rapierContext?.rapier;
    if (!rigidBodyRef.current || !world || !rapier) return true;
    
    try {
      const pos = rigidBodyRef.current.translation();
      const rayOrigin = { x: pos.x, y: pos.y + 0.2, z: pos.z };
      const rayDir = { x: 0, y: -1, z: 0 };
      const ray = new rapier.Ray(rayOrigin, rayDir);
      const maxToi = 1.2;
      let hit = null;
      try {
        hit = (world as any).castRay(ray, maxToi, true);
      } catch {
        try {
          hit = (world as any).castRay(ray, maxToi);
        } catch {
          hit = null;
        }
      }
      return hit !== null && hit.timeOfImpact < 1.1;
    } catch {
      return true;
    }
  };

  useFrame((state, delta) => {
    try {
      if (!rigidBodyRef.current) return;
      
      frameCountRef.current++;
      
      const isUIBlocking = isInShopInterior || isInventoryOpen || isMenuOpen || isDialogOpen || isCharacterOpen || isMapOpen;
      
      if (!isUIBlocking) {
        const mouseDelta = consumeMouseDelta();
        if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
          const sensitivity = 0.0025;
          cameraYawRef.current -= mouseDelta.x * sensitivity;
        }
        // Mobile camera via event
        const mobilePitch = (window as any).__cameraPitch;
        if (mobilePitch !== undefined) {
          // handled in camera controller
        }
      } else {
        consumeMouseDelta();
      }

      if (isUIBlocking) {
        const pos = rigidBodyRef.current.translation();
        if (frameCountRef.current % 10 === 0) {
          setPlayerPosition([pos.x, pos.y, pos.z]);
        }
        return;
      }

      const input = inputRef.current;
      const mobileInput = (typeof window !== 'undefined' ? (window as any).__mobileInput : null) || { joyX: 0, joyY: 0, run: false };
      
      let forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      let right = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let isRunning = input.run;

      // Mobile joystick override/add
      if (mobileInput.joyX !== undefined && mobileInput.joyY !== undefined) {
        if (Math.abs(mobileInput.joyX) > 0.1 || Math.abs(mobileInput.joyY) > 0.1) {
          // joystick: y forward, x right
          forward = mobileInput.joyY;
          right = mobileInput.joyX;
        }
      }
      if (mobileInput.run) {
        isRunning = true;
      }

      const isMovingInput = Math.abs(forward) > 0.05 || Math.abs(right) > 0.05;
      const moveIntensity = Math.min(1, Math.sqrt(forward*forward + right*right));

      const camYaw = cameraYawRef.current;
      const moveDir = new THREE.Vector3();
      
      if (isMovingInput) {
        const inputAngle = Math.atan2(right, forward);
        const worldAngle = camYaw + inputAngle;
        
        moveDir.x = Math.sin(worldAngle);
        moveDir.z = Math.cos(worldAngle);
        moveDir.normalize();
        
        const targetYaw = worldAngle;
        let diff = targetYaw - playerYawRef.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        const rotationSpeed = 10;
        playerYawRef.current += diff * Math.min(1, delta * rotationSpeed);
      }

      const currentSpeed = isRunning ? RUN_SPEED : WALK_SPEED;
      const speed = isMovingInput ? currentSpeed * moveIntensity : 0;

      const currentVel = rigidBodyRef.current.linvel();
      
      if (frameCountRef.current % 5 === 0) {
        groundedRef.current = checkGrounded();
      }

      const targetVelX = moveDir.x * speed;
      const targetVelZ = moveDir.z * speed;
      
      const accelFactor = Math.min(1, delta * ACCELERATION);
      const velX = THREE.MathUtils.lerp(currentVel.x, targetVelX, accelFactor);
      const velZ = THREE.MathUtils.lerp(currentVel.z, targetVelZ, accelFactor);
      
      let velY = currentVel.y;
      
      try {
        rigidBodyRef.current.setLinvel({ x: velX, y: velY, z: velZ }, true);
      } catch (e) {
        console.warn('[Player] setLinvel failed', e);
      }
      
      velocityRef.current.set(velX, velY, velZ);
      const horizSpeed = Math.sqrt(velX * velX + velZ * velZ);
      
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

      if (frameCountRef.current % 6 === 0) {
        const pos = rigidBodyRef.current.translation();
        setPlayerPosition([pos.x, pos.y, pos.z]);
        setPlayerRotation(playerYawRef.current);
        lastPosRef.current = [pos.x, pos.y, pos.z];
      }
      
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
        JoyX: mobileInput.joyX,
        JoyY: mobileInput.joyY,
        pos: lastPosRef.current,
        vel: [velX, velY, velZ],
        grounded: groundedRef.current,
      };

      if (frameCountRef.current % 120 === 0 && isMovingInput) {
        console.log(`[Player] Move: F:${forward.toFixed(2)} R:${right.toFixed(2)} Run:${isRunning} | dir ${moveDir.x.toFixed(2)},${moveDir.z.toFixed(2)} | vel ${velX.toFixed(2)},${velZ.toFixed(2)} | speed ${horizSpeed.toFixed(2)}`);
      }
    } catch (e) {
      console.error('[Player] Frame error', e);
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
      <group rotation={[0, playerYawRef.current, 0]}>
        <group position={[0, 0, 0]}>
          <PlayerModel animation={animation} moveSpeed={moveSpeed} isMoving={moveSpeed > 0.1} />
        </group>
      </group>
    </RigidBody>
  );
}
