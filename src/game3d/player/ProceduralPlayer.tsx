'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Realistic human proportions 1.78m
// Head 1/7.5-1/8 = 0.22-0.24 diam, radius 0.11-0.12
// Shoulders 0.42-0.48m total, joints at +-0.21-0.24
// Torso thickness realistic 0.22-0.28
// Backpack depth 0.15-0.25
export function ProceduralPlayer({ animation, moveSpeed }: Props) {
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
    hoodie: new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.88, metalness: 0.02 }),
    hoodieInner: new THREE.MeshStandardMaterial({ color: '#1e1e26', roughness: 0.94 }),
    hoodieShadow: new THREE.MeshStandardMaterial({ color: '#1a1a20', roughness: 0.94 }),
    jeans: new THREE.MeshStandardMaterial({ color: '#2f3f5f', roughness: 0.84, metalness: 0.02 }),
    jeansFaded: new THREE.MeshStandardMaterial({ color: '#3d4f6f', roughness: 0.88 }),
    sneakers: new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.62, metalness: 0.04 }),
    sneakersSole: new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.88 }),
    sneakersLaces: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.78 }),
    backpack: new THREE.MeshStandardMaterial({ color: '#3d3028', roughness: 0.88 }),
    backpackDark: new THREE.MeshStandardMaterial({ color: '#2a211c', roughness: 0.93 }),
    backpackMetal: new THREE.MeshStandardMaterial({ color: '#888', roughness: 0.4, metalness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: '#1e1510', roughness: 0.94 }),
    eyes: new THREE.MeshStandardMaterial({ color: '#2a1a0a', roughness: 0.3 }),
  }), []);

  useFrame((state, delta) => {
    try {
      clockRef.current += delta;
      const t = clockRef.current;
      if (!groupRef.current) return;

      let animSpeedFactor = 1;
      if (animation === 'walk') animSpeedFactor = moveSpeed / 3.5;
      else if (animation === 'run') animSpeedFactor = moveSpeed / 6.0;

      let legSwing = 0;
      let armSwing = 0;
      let bob = 0;
      let torsoSway = 0;
      let torsoPitch = 0;

      if (animation === 'idle') {
        bob = Math.sin(t * 1.1) * 0.008;
        torsoSway = Math.sin(t * 0.7) * 0.008;
        if (torsoRef.current) {
          const breath = 1 + Math.sin(t * 1.2) * 0.012;
          torsoRef.current.scale.set(1, breath, 1);
        }
      } else if (animation === 'walk') {
        const freq = 5.2 * animSpeedFactor;
        legSwing = Math.sin(t * freq) * 0.45;
        armSwing = Math.sin(t * freq) * 0.38;
        bob = Math.abs(Math.sin(t * freq)) * 0.035;
        torsoSway = Math.sin(t * freq * 0.5) * 0.022;
        torsoPitch = 0.03;
      } else if (animation === 'run') {
        const freq = 8.5 * animSpeedFactor;
        legSwing = Math.sin(t * freq) * 0.70;
        armSwing = Math.sin(t * freq) * 0.62;
        bob = Math.abs(Math.sin(t * freq)) * 0.06;
        torsoSway = Math.sin(t * freq * 0.5) * 0.035;
        torsoPitch = 0.08;
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -armSwing * 0.85;
        leftArmRef.current.rotation.z = Math.sin(t * (animation === 'run' ? 8.5 : 5.2)) * 0.03;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = armSwing * 0.85;
        rightArmRef.current.rotation.z = -Math.sin(t * (animation === 'run' ? 8.5 : 5.2)) * 0.03;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.88 + bob;
        torsoRef.current.rotation.z = torsoSway;
        torsoRef.current.rotation.x = torsoPitch;
      }
      if (headRef.current) {
        if (animation === 'idle') {
          headRef.current.rotation.y = Math.sin(t * 0.35) * 0.10;
          headRef.current.rotation.x = Math.sin(t * 0.25) * 0.03;
        } else {
          headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, delta * 3);
          headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, delta * 3);
        }
      }
      if (groupRef.current) {
        groupRef.current.position.y = bob * 0.20;
      }

      (window as any).__animationSpeed = animSpeedFactor.toFixed(2);
      (window as any).__playerAnimation = animation;
      (window as any).__playerRenderer = 'PROCEDURAL';
      (window as any).__skeletonLoaded = false;
    } catch (e) {
      console.error('[ProceduralPlayer] Animation error', e);
    }
  });

  // Corrected proportions for 1.78m
  // Torso Y 0.88, Legs Y 0.70, Head offset 0.60, Head radius 0.115 => total ~1.78 with MODEL_Y_OFFSET 0.215
  // Shoulders at +-0.23 (0.46 total), torso radius 0.20 (width 0.40), backpack depth 0.15

  return (
    <group ref={groupRef} scale={1}>
      {/* Torso - realistic thickness */}
      <group ref={torsoRef} position={[0, 0.88, 0]}>
        <group>
          {/* Main torso - thinner depth */}
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.20, 0.42, 8, 14]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Chest - subtle */}
          <mesh position={[0, 0.38, 0.04]} castShadow>
            <sphereGeometry args={[0.22, 14, 14]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Hood - smaller */}
          <mesh position={[0, 0.58, -0.10]} rotation={[0.2, 0, 0]} castShadow>
            <torusGeometry args={[0.14, 0.04, 8, 20, Math.PI * 1.4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0, 0.54, -0.11]} castShadow>
            <sphereGeometry args={[0.16, 12, 12, 0, Math.PI*2, 0, Math.PI*0.60]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Pocket */}
          <mesh position={[0, 0.08, 0.18]} castShadow>
            <boxGeometry args={[0.20, 0.16, 0.03]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          {/* Drawstrings - thinner */}
          <mesh position={[-0.05, 0.40, 0.17]} rotation={[0,0,0.08]} castShadow>
            <cylinderGeometry args={[0.006,0.006,0.20,4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0.05, 0.40, 0.17]} rotation={[0,0,-0.08]} castShadow>
            <cylinderGeometry args={[0.006,0.006,0.20,4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
        </group>

        {/* Head - realistic 0.115 radius = 0.23 diam ~ 1/7.7 of 1.78 */}
        <group ref={headRef} position={[0, 0.60, 0.02]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.115, 18, 18]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.04, 0.02]} scale={[0.88,0.70,0.88]} castShadow>
            <sphereGeometry args={[0.105, 14, 14]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, -0.01]} castShadow>
            <sphereGeometry args={[0.12, 14, 14, 0, Math.PI*2, 0, Math.PI*0.65]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[-0.038, 0.01, 0.09]} castShadow>
            <sphereGeometry args={[0.013, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
          <mesh position={[0.038, 0.01, 0.09]} castShadow>
            <sphereGeometry args={[0.013, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
        </group>

        {/* Arms - shoulders at +-0.23 (0.46 total), more natural */}
        <group ref={leftArmRef} position={[-0.26, 0.38, 0]}>
          <mesh castShadow><sphereGeometry args={[0.065,10,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.16,0]} castShadow><capsuleGeometry args={[0.055,0.28,6,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.32,0]} castShadow><sphereGeometry args={[0.05,8,8]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.46,0]} castShadow><capsuleGeometry args={[0.045,0.24,6,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <group position={[0,-0.62,0]}>
            <mesh castShadow><sphereGeometry args={[0.048,8,8]} /><primitive object={materials.skin} attach="material" /></mesh>
          </group>
        </group>

        <group ref={rightArmRef} position={[0.26, 0.38, 0]}>
          <mesh castShadow><sphereGeometry args={[0.065,10,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.16,0]} castShadow><capsuleGeometry args={[0.055,0.28,6,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.32,0]} castShadow><sphereGeometry args={[0.05,8,8]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <mesh position={[0,-0.46,0]} castShadow><capsuleGeometry args={[0.045,0.24,6,10]} /><primitive object={materials.hoodie} attach="material" /></mesh>
          <group position={[0,-0.62,0]}>
            <mesh castShadow><sphereGeometry args={[0.048,8,8]} /><primitive object={materials.skin} attach="material" /></mesh>
          </group>
        </group>

        {/* Backpack - realistic depth 0.15-0.25, not half body */}
        <group position={[0, 0.18, -0.26]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.32,0.40,0.15]} /><primitive object={materials.backpack} attach="material" /></mesh>
          <mesh position={[0,-0.02,-0.09]} castShadow><boxGeometry args={[0.24,0.16,0.04]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
          <mesh position={[-0.12,0.22,-0.12]} rotation={[0,0,-0.12]} castShadow><boxGeometry args={[0.04,0.36,0.015]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
          <mesh position={[0.12,0.22,-0.12]} rotation={[0,0,0.12]} castShadow><boxGeometry args={[0.04,0.36,0.015]} /><primitive object={materials.backpackDark} attach="material" /></mesh>
        </group>
      </group>

      {/* Legs - realistic proportions, feet at ground: group 0.75, foot -0.86-0.05-0.04=-0.95, offset 0.22 => 0.02 */}
      <group ref={leftLegRef} position={[-0.11, 0.75, 0]}>
        <mesh castShadow><sphereGeometry args={[0.095,10,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.20,0]} castShadow receiveShadow><capsuleGeometry args={[0.09,0.32,6,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.40,0]} castShadow><sphereGeometry args={[0.08,8,8]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.62,0]} castShadow receiveShadow><capsuleGeometry args={[0.08,0.32,6,10]} /><primitive object={materials.jeansFaded} attach="material" /></mesh>
        <group position={[0,-0.86,0.03]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.11,0.08,0.22]} /><primitive object={materials.sneakers} attach="material" /></mesh>
          <mesh position={[0,-0.05,0]} castShadow><boxGeometry args={[0.115,0.03,0.23]} /><primitive object={materials.sneakersSole} attach="material" /></mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.11, 0.75, 0]}>
        <mesh castShadow><sphereGeometry args={[0.095,10,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.20,0]} castShadow receiveShadow><capsuleGeometry args={[0.09,0.32,6,10]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.40,0]} castShadow><sphereGeometry args={[0.08,8,8]} /><primitive object={materials.jeans} attach="material" /></mesh>
        <mesh position={[0,-0.62,0]} castShadow receiveShadow><capsuleGeometry args={[0.08,0.32,6,10]} /><primitive object={materials.jeansFaded} attach="material" /></mesh>
        <group position={[0,-0.86,0.03]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.11,0.08,0.22]} /><primitive object={materials.sneakers} attach="material" /></mesh>
          <mesh position={[0,-0.05,0]} castShadow><boxGeometry args={[0.115,0.03,0.23]} /><primitive object={materials.sneakersSole} attach="material" /></mesh>
        </group>
      </group>
    </group>
  );
}
