'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { PlayerModel } from './PlayerModel';
import { usePlayerControls } from './usePlayerControls';
import { playerTransformRef } from './playerTransformRef';

const SAFE_SPAWN: [number, number, number] = [15, 3, 15];
const USE_DEBUG_CUBE = false;

// Calculated from PlayerModel geometry:
// Leg group Y=1.0, sneakers group Y=-1.15, sole bottom -0.095 relative to sneakers group
// => sneakers bottom = 1.0 -1.15 -0.095 = -0.245 relative to RigidBody
// To make feet at 0.02-0.05 above ground, need offset +0.27
const MODEL_Y_OFFSET = 0.27;

export function Player() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  
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
  const [showDebugMarkers, setShowDebugMarkers] = useState(false);
  
  const velocityRef = useRef(new THREE.Vector3());
  const playerYawRef = useRef(playerRotation);
  const lastPosRef = useRef<[number, number, number]>(SAFE_SPAWN);
  const frameCountRef = useRef(0);
  const mountedRef = useRef(false);
  const bodyCreatedRef = useRef(false);
  const startPosForTestRef = useRef<[number, number, number] | null>(null);
  const idleTestRef = useRef<{ t0: number, logged: boolean }>({ t0: 0, logged: false });
  
  const WALK_SPEED = 3.5;
  const RUN_SPEED = 6.0;

  useEffect(() => {
    const interval = setInterval(() => {
      const dbg = (window as any).__showDebug;
      setShowDebugMarkers(!!dbg);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    playerTransformRef.current.mounted = true;
    
    console.log('[Player] mounted');
    (window as any).__playerMounted = true;
    
    try {
      const store = useGameStore.getState();
      store.setPlayerPosition([...SAFE_SPAWN] as any);
      console.log(`[Player] spawn = ${SAFE_SPAWN[0]} ${SAFE_SPAWN[1]} ${SAFE_SPAWN[2]} (forced SAFE_SPAWN)`);
      (window as any).__playerSpawn = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
    } catch {}

    (window as any).__testMove = () => {
      if (!rigidBodyRef.current) return;
      try {
        const start = rigidBodyRef.current.translation();
        startPosForTestRef.current = [start.x, start.y, start.z];
        console.log(`[TEST MOVE] Start: [${start.x.toFixed(2)},${start.y.toFixed(2)},${start.z.toFixed(2)}]`);

        // Camera-relative forward for TEST MOVE
        const camPos = (window as any).__cameraPosition;
        const camTarget = (window as any).__cameraTarget;
        let fwd = new THREE.Vector3(0,0,1);
        if (camPos && camTarget) {
          fwd = new THREE.Vector3(camTarget.x - camPos.x, 0, camTarget.z - camPos.z).normalize();
          if (fwd.length() < 0.1) fwd.set(0,0,1);
        }
        const curVel = rigidBodyRef.current.linvel();
        rigidBodyRef.current.setLinvel({ x: fwd.x*3.5, y: curVel.y, z: fwd.z*3.5 }, true);
        console.log(`[TEST MOVE] Moving forward ${fwd.x.toFixed(2)},${fwd.z.toFixed(2)} (camera forward)`);
        
        setTimeout(() => {
          if (!rigidBodyRef.current || !startPosForTestRef.current) return;
          const end = rigidBodyRef.current.translation();
          const dx = end.x - startPosForTestRef.current[0];
          const dy = end.y - startPosForTestRef.current[1];
          const dz = end.z - startPosForTestRef.current[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const horiz = Math.sqrt(dx*dx + dz*dz);
          console.log(`[TEST MOVE] End: [${end.x.toFixed(2)},${end.y.toFixed(2)},${end.z.toFixed(2)}] dist ${dist.toFixed(2)} horiz ${horiz.toFixed(2)} dx ${dx.toFixed(2)} dz ${dz.toFixed(2)}`);
          console.log(`TEST MOVE: start [${startPosForTestRef.current.map(v=>v.toFixed(2)).join(',')}] end [${end.x.toFixed(2)},${end.y.toFixed(2)},${end.z.toFixed(2)}] distance ${dist.toFixed(2)} ${dist>2?'PASS':'FAIL'}`);
          try {
            const v = rigidBodyRef.current?.linvel();
            if (v) rigidBodyRef.current?.setLinvel({ x: 0, y: v.y, z: 0 }, true);
          } catch {}
        }, 1000);
      } catch (e) {
        console.error('[TEST MOVE] Error', e);
      }
    };

    idleTestRef.current.t0 = performance.now();
    console.log(`[Idle Test] t=0 Y=${SAFE_SPAWN[1].toFixed(2)} expecting fall to ground 0 then stable`);

    return () => {
      mountedRef.current = false;
      playerTransformRef.current.mounted = false;
      (window as any).__playerMounted = false;
    };
  }, []);

  useEffect(() => {
    const checkBody = () => {
      if (rigidBodyRef.current && !bodyCreatedRef.current) {
        bodyCreatedRef.current = true;
        playerTransformRef.current.bodyExists = true;
        console.log('[Player] body created');
        (window as any).__playerBodyExists = true;
        try {
          rigidBodyRef.current.setTranslation({ x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] }, true);
          rigidBodyRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          console.log(`[Player] spawn = ${SAFE_SPAWN[0]} ${SAFE_SPAWN[1]} ${SAFE_SPAWN[2]}`);
          lastPosRef.current = [...SAFE_SPAWN] as any;
          playerTransformRef.current.position.set(SAFE_SPAWN[0], SAFE_SPAWN[1], SAFE_SPAWN[2]);
          (window as any).__playerSpawn = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
        } catch (e) {
          console.warn('[Player] Spawn failed', e);
        }
      }
    };
    checkBody();
    const t1 = setTimeout(checkBody, 100);
    const t2 = setTimeout(checkBody, 500);
    const t3 = setTimeout(checkBody, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const { inputRef } = usePlayerControls();

  useFrame((state, delta) => {
    try {
      if (!rigidBodyRef.current) return;
      frameCountRef.current++;

      const isUIBlocking = isInShopInterior || isInventoryOpen || isMenuOpen || isDialogOpen || isCharacterOpen || isMapOpen;

      let currentPos: { x: number; y: number; z: number };
      try {
        currentPos = rigidBodyRef.current.translation();
      } catch { return; }

      if (currentPos.y < -10 || !Number.isFinite(currentPos.x) || !Number.isFinite(currentPos.y) || !Number.isFinite(currentPos.z)) {
        console.warn(`[Player] Fell below map - teleport SAFE_SPAWN`);
        try {
          rigidBodyRef.current.setTranslation({ x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          currentPos = { x: SAFE_SPAWN[0], y: SAFE_SPAWN[1], z: SAFE_SPAWN[2] };
        } catch {}
      }

      playerTransformRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
      playerTransformRef.current.lastUpdate = performance.now();
      playerTransformRef.current.visible = true;
      (window as any).__playerVisible = true;

      const elapsed = (performance.now() - idleTestRef.current.t0) / 1000;
      if (!idleTestRef.current.logged) {
        if (elapsed >= 1 && elapsed < 1.1) {
          try { const v = rigidBodyRef.current.linvel(); console.log(`[Idle Test] t=1 Y=${currentPos.y.toFixed(2)} velY=${v.y.toFixed(2)}`); } catch {}
        }
        if (elapsed >= 2 && elapsed < 2.1) {
          try { const v = rigidBodyRef.current.linvel(); console.log(`[Idle Test] t=2 Y=${currentPos.y.toFixed(2)} velY=${v.y.toFixed(2)}`); } catch {}
        }
        if (elapsed >= 5 && elapsed < 5.1) {
          try {
            const v = rigidBodyRef.current.linvel();
            console.log(`[Idle Test] t=5 Y=${currentPos.y.toFixed(2)} velY=${v.y.toFixed(2)}`);
            idleTestRef.current.logged = true;
            if (Math.abs(v.y) < 0.1 && currentPos.y >= -0.1 && currentPos.y < 1.5) console.log('[Idle Test] PASS stable');
            else console.warn(`[Idle Test] FAIL Y=${currentPos.y.toFixed(2)} velY=${v.y.toFixed(2)}`);
          } catch {}
        }
      }

      if (isUIBlocking) {
        try {
          const curVel = rigidBodyRef.current.linvel();
          rigidBodyRef.current.setLinvel({ x: 0, y: curVel.y, z: 0 }, true);
        } catch {}
        if (frameCountRef.current % 10 === 0) setPlayerPosition([currentPos.x, currentPos.y, currentPos.z]);
        return;
      }

      const input = inputRef.current;
      const mobileInput = (typeof window !== 'undefined' ? (window as any).__mobileInput : null) || { joyX: 0, joyY: 0, run: false };
      
      let forwardInput = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      let rightInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let isRunning = input.run;

      if (mobileInput.joyX !== undefined && mobileInput.joyY !== undefined) {
        if (Math.abs(mobileInput.joyX) > 0.1 || Math.abs(mobileInput.joyY) > 0.1) {
          forwardInput = mobileInput.joyY;
          rightInput = mobileInput.joyX;
        }
      }
      if (mobileInput.run) isRunning = true;

      const isMovingInput = Math.abs(forwardInput) > 0.05 || Math.abs(rightInput) > 0.05;
      const moveIntensity = Math.min(1, Math.sqrt(forwardInput*forwardInput + rightInput*rightInput));

      // CAMERA-RELATIVE MOVEMENT - per task 5
      // Get camera forward directly from camera, horizontal, normalize
      let camForward = new THREE.Vector3(0,0,1);
      let camRight = new THREE.Vector3(1,0,0);
      try {
        const camPos = (window as any).__cameraPosition;
        const camTarget = (window as any).__cameraTarget;
        if (camPos && camTarget) {
          camForward.set(camTarget.x - camPos.x, 0, camTarget.z - camPos.z);
          if (camForward.length() < 0.001) {
            camera.getWorldDirection(camForward);
            camForward.y = 0;
          }
          camForward.normalize();
        } else {
          camera.getWorldDirection(camForward);
          camForward.y = 0;
          camForward.normalize();
        }
        // Right = forward cross worldUp (0,1,0) => per Three lookAt, right = -X when forward +Z
        // This gives screen RIGHT = -X at yaw0, which matches actual Three camera basis
        // A = screen LEFT = +X, D = screen RIGHT = -X
        camRight.crossVectors(camForward, new THREE.Vector3(0,1,0)).normalize();
        // Verify: forward +Z (0,0,1) cross up (0,1,0) = (-1,0,0) = -X = right
        // So right = -X, left = +X
      } catch {
        camForward.set(0,0,1);
        camRight.set(-1,0,0);
      }

      let targetVelX = 0;
      let targetVelZ = 0;
      let targetYaw = playerYawRef.current;

      if (isMovingInput) {
        // move = forward * forwardInput + right * rightInput
        const moveVec = new THREE.Vector3();
        moveVec.addScaledVector(camForward, forwardInput);
        moveVec.addScaledVector(camRight, rightInput);
        if (moveVec.length() > 0.001) {
          moveVec.normalize();
          const speed = (isRunning ? RUN_SPEED : WALK_SPEED) * moveIntensity;
          targetVelX = moveVec.x * speed;
          targetVelZ = moveVec.z * speed;
          // Yaw facing move direction
          targetYaw = Math.atan2(moveVec.x, moveVec.z);
        }
      }

      if (isMovingInput) {
        let diff = targetYaw - playerYawRef.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        playerYawRef.current += diff * Math.min(1, delta * 10);
      }

      let currentVel;
      try { currentVel = rigidBodyRef.current.linvel(); } catch { currentVel = { x: 0, y: 0, z: 0 }; }

      if (true && currentVel.y < -0.5) {
        if (frameCountRef.current % 60 === 0) {
          // Only warn if not falling from spawn
          const elapsed2 = (performance.now() - idleTestRef.current.t0)/1000;
          if (elapsed2 > 6) {
            console.warn(`[INVARIANT] velY=${currentVel.y.toFixed(2)} < -0.5 posY=${currentPos.y.toFixed(2)} still falling?`);
          }
        }
      }

      const finalVelX = targetVelX;
      const finalVelZ = targetVelZ;
      const finalVelY = currentVel.y;

      try { rigidBodyRef.current.setLinvel({ x: finalVelX, y: finalVelY, z: finalVelZ }, true); } catch (e) { console.warn('[Player] setLinvel failed', e); }
      
      velocityRef.current.set(finalVelX, finalVelY, finalVelZ);
      playerTransformRef.current.velocity.set(finalVelX, finalVelY, finalVelZ);
      playerTransformRef.current.yaw = playerYawRef.current;

      const horizSpeed = Math.sqrt(finalVelX*finalVelX + finalVelZ*finalVelZ);
      if (frameCountRef.current % 6 === 0) {
        if (horizSpeed < 0.1) { if (animation !== 'idle') setAnimation('idle'); }
        else if (horizSpeed > 4.5) { if (animation !== 'run') setAnimation('run'); }
        else { if (animation !== 'walk') setAnimation('walk'); }
        setMoveSpeed(horizSpeed);
      }

      if (frameCountRef.current % 6 === 0) {
        setPlayerPosition([currentPos.x, currentPos.y, currentPos.z]);
        setPlayerRotation(playerYawRef.current);
        lastPosRef.current = [currentPos.x, currentPos.y, currentPos.z];
      }
      
      const bodyCenterY = currentPos.y;
      const colliderCenterY = bodyCenterY + 1.0;
      const halfHeight = 0.65;
      const radius = 0.35;
      const colliderBottomY = colliderCenterY - halfHeight - radius;
      const groundTopY = 0;
      const visualFeetY = colliderBottomY + MODEL_Y_OFFSET; // approx feet world Y

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
        bodyCenterY: bodyCenterY.toFixed(2),
        colliderBottomY: colliderBottomY.toFixed(2),
        groundTopY: groundTopY.toFixed(2),
        visualFeetY: visualFeetY.toFixed(2),
        camForward: `${camForward.x.toFixed(2)},${camForward.z.toFixed(2)}`,
        camRight: `${camRight.x.toFixed(2)},${camRight.z.toFixed(2)}`,
      };

      if (frameCountRef.current % 120 === 0 && isMovingInput) {
        console.log(`[Player] Move F:${forwardInput.toFixed(2)} R:${rightInput.toFixed(2)} camF ${camForward.x.toFixed(2)},${camForward.z.toFixed(2)} camR ${camRight.x.toFixed(2)},${camRight.z.toFixed(2)} vel ${finalVelX.toFixed(2)},${finalVelZ.toFixed(2)} pos ${currentPos.x.toFixed(1)},${currentPos.y.toFixed(1)},${currentPos.z.toFixed(1)} feet ${visualFeetY.toFixed(2)}`);
      }
    } catch (e) { console.error('[Player] Frame error', e); }
  });

  return (
    <>
      {showDebugMarkers && (
        <group position={[SAFE_SPAWN[0], 0, SAFE_SPAWN[2]]}>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          <mesh position={[0, 6.5, 0]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
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
        <group position={[0, MODEL_Y_OFFSET, 0]}>
          {USE_DEBUG_CUBE ? (
            <group position={[0, 1, 0]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[1, 2, 1]} />
                <meshBasicMaterial color="#ff0000" />
              </mesh>
              <mesh position={[0, 1.2, 0]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshBasicMaterial color="#00ff00" />
              </mesh>
            </group>
          ) : (
            <group position={[0, 0, 0]}>
              <PlayerModel animation={animation} moveSpeed={moveSpeed} isMoving={moveSpeed > 0.1} />
            </group>
          )}
        </group>
      </RigidBody>
    </>
  );
}
