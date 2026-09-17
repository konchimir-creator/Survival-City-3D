'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Improved procedural - less cylinder feeling, better proportions
export function ProceduralPlayer({ animation, moveSpeed, isMoving }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const clockRef = useRef(0);

  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: '#e8c4a8', roughness: 0.7, metalness: 0 }),
    skinDark: new THREE.MeshStandardMaterial({ color: '#d4a88a', roughness: 0.75, metalness: 0 }),
    hoodie: new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9, metalness: 0.02 }),
    hoodieInner: new THREE.MeshStandardMaterial({ color: '#1e1e26', roughness: 0.95, metalness: 0 }),
    hoodieShadow: new THREE.MeshStandardMaterial({ color: '#1a1a20', roughness: 0.95, metalness: 0 }),
    jeans: new THREE.MeshStandardMaterial({ color: '#2f3f5f', roughness: 0.85, metalness: 0.02 }),
    jeansFaded: new THREE.MeshStandardMaterial({ color: '#3d4f6f', roughness: 0.9, metalness: 0 }),
    jeansSeam: new THREE.MeshStandardMaterial({ color: '#1f2f4f', roughness: 0.9 }),
    sneakers: new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.65, metalness: 0.05 }),
    sneakersSole: new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.9, metalness: 0 }),
    sneakersLaces: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.8, metalness: 0 }),
    backpack: new THREE.MeshStandardMaterial({ color: '#3d3028', roughness: 0.9, metalness: 0 }),
    backpackDark: new THREE.MeshStandardMaterial({ color: '#2a211c', roughness: 0.95, metalness: 0 }),
    backpackMetal: new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.4, metalness: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ color: '#1e1510', roughness: 0.95, metalness: 0 }),
    eyes: new THREE.MeshStandardMaterial({ color: '#2a1a0a', roughness: 0.3, metalness: 0 }),
  }), []);

  useFrame((state, delta) => {
    try {
      clockRef.current += delta;
      const t = clockRef.current;
      if (!groupRef.current) return;

      // Sync animation speed with movement speed to prevent foot sliding
      let animSpeedFactor = 1;
      if (animation === 'walk') animSpeedFactor = moveSpeed / 3.5;
      else if (animation === 'run') animSpeedFactor = moveSpeed / 6.0;

      let legSwing = 0;
      let armSwing = 0;
      let bob = 0;
      let torsoSway = 0;
      let torsoPitch = 0;

      if (animation === 'idle') {
        // Subtle breathing, not dead
        bob = Math.sin(t * 1.1) * 0.012;
        torsoSway = Math.sin(t * 0.7) * 0.012;
        if (torsoRef.current) {
          const breath = 1 + Math.sin(t * 1.2) * 0.015;
          torsoRef.current.scale.set(1, breath, 1);
        }
      } else if (animation === 'walk') {
        const freq = 5.2 * animSpeedFactor;
        legSwing = Math.sin(t * freq) * 0.5;
        armSwing = Math.sin(t * freq) * 0.42;
        bob = Math.abs(Math.sin(t * freq)) * 0.05;
        torsoSway = Math.sin(t * freq * 0.5) * 0.03;
        torsoPitch = 0.04;
      } else if (animation === 'run') {
        const freq = 8.5 * animSpeedFactor;
        legSwing = Math.sin(t * freq) * 0.78;
        armSwing = Math.sin(t * freq) * 0.7;
        bob = Math.abs(Math.sin(t * freq)) * 0.08;
        torsoSway = Math.sin(t * freq * 0.5) * 0.05;
        torsoPitch = 0.1;
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -armSwing * 0.85;
        leftArmRef.current.rotation.z = Math.sin(t * (animation === 'run' ? 8.5 : 5.2)) * 0.04;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = armSwing * 0.85;
        rightArmRef.current.rotation.z = -Math.sin(t * (animation === 'run' ? 8.5 : 5.2)) * 0.04;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 1.08 + bob;
        torsoRef.current.rotation.z = torsoSway;
        torsoRef.current.rotation.x = torsoPitch;
      }
      if (headRef.current) {
        if (animation === 'idle') {
          headRef.current.rotation.y = Math.sin(t * 0.35) * 0.12;
          headRef.current.rotation.x = Math.sin(t * 0.25) * 0.04;
        } else {
          headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, delta * 3);
          headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, delta * 3);
        }
      }
      if (groupRef.current) {
        groupRef.current.position.y = bob * 0.25;
      }

      // Globals for F3
      (window as any).__animationSpeed = animSpeedFactor.toFixed(2);
      (window as any).__playerAnimation = animation;
      (window as any).__playerRenderer = 'PROCEDURAL';
      (window as any).__skeletonLoaded = false;
    } catch (e) {
      console.error('[ProceduralPlayer] Animation error', e);
    }
  });

  return (
    <group ref={groupRef} scale={1}>
      {/* Torso - improved shape, less cylinder */}
      <group ref={torsoRef} position={[0, 1.08, 0]}>
        {/* Main torso - slightly tapered */}
        <group>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.31, 0.5, 8, 16]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Chest volume */}
          <mesh position={[0, 0.48, 0.06]} castShadow>
            <sphereGeometry args={[0.32, 16, 16]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Hood */}
          <mesh position={[0, 0.78, -0.16]} rotation={[0.2, 0, 0]} castShadow>
            <torusGeometry args={[0.22, 0.065, 10, 24, Math.PI * 1.45]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0, 0.72, -0.18]} castShadow>
            <sphereGeometry args={[0.26, 16, 16, 0, Math.PI*2, 0, Math.PI*0.62]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Hoodie pocket */}
          <mesh position={[0, 0.12, 0.27]} castShadow>
            <boxGeometry args={[0.28, 0.22, 0.04]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          {/* Drawstrings */}
          <mesh position={[-0.07, 0.52, 0.25]} rotation={[0,0,0.08]} castShadow>
            <cylinderGeometry args={[0.009,0.009,0.28,4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0.07, 0.52, 0.25]} rotation={[0,0,-0.08]} castShadow>
            <cylinderGeometry args={[0.009,0.009,0.28,4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
        </group>

        {/* Head - more natural */}
        <group ref={headRef} position={[0, 0.94, 0.05]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.195, 20, 20]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.07, 0.04]} scale={[0.88,0.68,0.88]} castShadow>
            <sphereGeometry args={[0.175, 16, 16]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, 0.11, -0.01]} castShadow>
            <sphereGeometry args={[0.205, 16, 16, 0, Math.PI*2, 0, Math.PI*0.68]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, 0.01]} scale={[1.04,0.88,1]} castShadow>
            <sphereGeometry args={[0.2, 16, 16, 0, Math.PI*2, 0, Math.PI*0.52]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[-0.068, 0.02, 0.155]} castShadow>
            <sphereGeometry args={[0.022, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
          <mesh position={[0.068, 0.02, 0.155]} castShadow>
            <sphereGeometry args={[0.022, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
        </group>

        {/* Arms - improved shoulders, elbows, hands */}
        <group ref={leftArmRef} position={[-0.40, 0.54, 0]}>
          <mesh castShadow><sphereGeometry args={[0.11,12,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.20,0]} castShadow><capsuleGeometry args={[0.085,0.36,6,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.42,0]} castShadow><sphereGeometry args={[0.075,10,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.60,0]} castShadow><capsuleGeometry args={[0.07,0.30,6,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <group position={[0,-0.82,0]}>
            <mesh castShadow><sphereGeometry args={[0.075,10,10]} /><primitive object={materials.skin} attach="material" /></mesh>
            <mesh position={[0,-0.08,0.02]} scale={[0.7,0.45,0.75]} castShadow><capsuleGeometry args={[0.028,0.07,4,8]} /><primitive object={materials.skin} attach="material" /></mesh>
          </group>
        </group>

        <group ref={rightArmRef} position={[0.40, 0.54, 0]}>
          <mesh castShadow><sphereGeometry args={[0.11,12,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.20,0]} castShadow><capsuleGeometry args={[0.085,0.36,6,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.42,0]} castShadow><sphereGeometry args={[0.075,10,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.60,0]} castShadow><capsuleGeometry args={[0.07,0.30,6,12]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <group position={[0,-0.82,0]}>
            <mesh castShadow><sphereGeometry args={[0.075,10,10]} /><primitive object={materials.skin} attach="material" /></mesh>
            <mesh position={[0,-0.08,0.02]} scale={[0.7,0.45,0.75]} castShadow><capsuleGeometry args={[0.028,0.07,4,8]} /><primitive object={materials.skin} attach="material" /></mesh>
          </group>
        </group>

        {/* Backpack - attached to torso, moves with it */}
        <group position={[0, 0.22, -0.36]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.42,0.56,0.20]} /><primitive object={materials.backpack} attach="material" /></mesh>
          <mesh position={[0,-0.04,-0.11]} castShadow><boxGeometry args={[0.32,0.22,0.05]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
          <mesh position={[-0.18,0.32,-0.18]} rotation={[0,0,-0.14]} castShadow><boxGeometry args={[0.055,0.52,0.018]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
          <mesh position={[0.18,0.32,-0.18]} rotation={[0,0,0.14]} castShadow><boxGeometry args={[0.055,0.52,0.018]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
          <mesh position={[0,0.12,-0.11]} castShadow><boxGeometry args={[0.018,0.36,0.018]} /><primitive object={materials.backpackMetal} attach="material" /></mesh>
        </group>
      </group>

      {/* Legs - improved knees, better proportions */}
      <group ref={leftLegRef} position={[-0.16, 1.0, 0]}>
        <mesh castShadow><sphereGeometry args={[0.15,12,12]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.26,0]} castShadow receiveShadow><capsuleGeometry args={[0.13,0.42,6,12]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.54,0]} castShadow><sphereGeometry args={[0.12,10,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.80,0]} castShadow receiveShadow><capsuleGeometry args={[0.115,0.42,6,12]} /><primitive object={materials.jeansFaded} attach="material" /></mesh>
        <group position={[0,-1.12,0.06]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.15,0.11,0.30]} /><primitive object={materials.sneakers} attach="material" /></mesh>
          <mesh position={[0,-0.065,0]} castShadow><boxGeometry args={[0.16,0.045,0.31]} /><primitive object={materials.sneakersSole} attach="material" /></mesh>
          <mesh position={[0,0.035,0.04]} castShadow><boxGeometry args={[0.075,0.018,0.14]} /><primitive object={materials.sneakersLaces} attach="material" /></mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.16, 1.0, 0]}>
        <mesh castShadow><sphereGeometry args={[0.15,12,12]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.26,0]} castShadow receiveShadow><capsuleGeometry args={[0.13,0.42,6,12]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.54,0]} castShadow><sphereGeometry args={[0.12,10,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.80,0]} castShadow receiveShadow><capsuleGeometry args={[0.115,0.42,6,12]} /><primitive object={materials.jeansFaded} attach="material" /></mesh>
        <group position={[0,-1.12,0.06]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.15,0.11,0.30]} /><primitive object={materials.sneakers} attach="material" /></mesh>
          <mesh position={[0,-0.065,0]} castShadow><boxGeometry args={[0.16,0.045,0.31]} /><primitive object={materials.sneakersSole} attach="material" /></mesh>
          <mesh position={[0,0.035,0.04]} castShadow><boxGeometry args={[0.075,0.018,0.14]} /><primitive object={materials.sneakersLaces} attach="material" /></mesh>
        </group>
      </group>
    </group>
  );
}
