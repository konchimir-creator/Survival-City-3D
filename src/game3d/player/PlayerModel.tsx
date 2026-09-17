'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerModelProps {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Temporary stylized realistic humanoid built from primitives
// This is a placeholder until proper GLB model is integrated
// Designed to look like: young city person, worn hoodie, jeans, sneakers, backpack

export function PlayerModel({ animation, moveSpeed, isMoving }: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const clockRef = useRef(0);

  // Materials - stylized realistic, worn clothing
  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: '#e8c4a8', roughness: 0.7, metalness: 0 }),
    hoodie: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.9, metalness: 0.05 }), // dark worn hoodie
    hoodieInner: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
    jeans: new THREE.MeshStandardMaterial({ color: '#2c3e60', roughness: 0.85, metalness: 0 }), // faded jeans
    sneakers: new THREE.MeshStandardMaterial({ color: '#d0d0d0', roughness: 0.8 }),
    sneakersSole: new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.9 }),
    backpack: new THREE.MeshStandardMaterial({ color: '#3d3028', roughness: 0.9 }), // old brown backpack
    hair: new THREE.MeshStandardMaterial({ color: '#2b1f14', roughness: 0.9 }),
  }), []);

  useFrame((state, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;

    if (!groupRef.current) return;

    // Animation logic
    let legSwing = 0;
    let armSwing = 0;
    let bob = 0;
    let torsoSway = 0;

    if (animation === 'idle') {
      bob = Math.sin(t * 1.2) * 0.01;
      torsoSway = Math.sin(t * 0.8) * 0.02;
    } else if (animation === 'walk') {
      const freq = 6; // steps per second
      legSwing = Math.sin(t * freq) * 0.6;
      armSwing = Math.sin(t * freq) * 0.5;
      bob = Math.abs(Math.sin(t * freq)) * 0.05;
      torsoSway = Math.sin(t * freq * 0.5) * 0.05;
    } else if (animation === 'run') {
      const freq = 10;
      legSwing = Math.sin(t * freq) * 0.9;
      armSwing = Math.sin(t * freq) * 0.8;
      bob = Math.abs(Math.sin(t * freq)) * 0.08;
      torsoSway = Math.sin(t * freq * 0.5) * 0.08;
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = legSwing;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -legSwing;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -armSwing * 0.8;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = armSwing * 0.8;
    }
    if (torsoRef.current) {
      torsoRef.current.position.y = 1.0 + bob;
      torsoRef.current.rotation.z = torsoSway;
      torsoRef.current.rotation.x = animation === 'run' ? 0.15 : 0;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
    }

    // Slight breathing for torso
    if (groupRef.current) {
      groupRef.current.position.y = bob * 0.5;
    }
  });

  return (
    <group ref={groupRef} scale={1}>
      {/* Root at feet, character height ~1.78m */}
      <group ref={torsoRef} position={[0, 1.0, 0]}>
        {/* Torso - hoodie */}
        <group>
          {/* Main torso box with rounded feel */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.5, 8, 16]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          {/* Hood */}
          <mesh position={[0, 0.7, -0.15]} rotation={[0.2, 0, 0]} castShadow>
            <torusGeometry args={[0.18, 0.06, 8, 20, Math.PI * 1.3]} />
            <primitive object={materials.hoodieInner} attach="material" />
          </mesh>
          {/* Hood back */}
          <mesh position={[0, 0.65, -0.18]} castShadow>
            <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
        </group>

        {/* Head */}
        <group ref={headRef} position={[0, 0.85, 0.05]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 20, 20]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          {/* Face simple */}
          <mesh position={[0, 0, 0.15]} scale={[0.08, 0.08, 0.02]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#d4a88a" />
          </mesh>
        </group>

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.35, 0.5, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.35, 4, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.55, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.3, 4, 12]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.75, 0]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[0.35, 0.5, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.35, 4, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.55, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.3, 4, 12]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.75, 0]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
        </group>

        {/* Backpack */}
        <mesh position={[0, 0.25, -0.32]} castShadow>
          <boxGeometry args={[0.4, 0.55, 0.18]} />
          <primitive object={materials.backpack} attach="material" />
        </mesh>
        <mesh position={[0, 0.25, -0.42]} castShadow>
          <boxGeometry args={[0.3, 0.4, 0.05]} />
          <meshStandardMaterial color="#2a211c" roughness={0.9} />
        </mesh>
        {/* Backpack straps */}
        <mesh position={[-0.18, 0.35, -0.18]} rotation={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[0.04, 0.5, 0.02]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
        <mesh position={[0.18, 0.35, -0.18]} rotation={[0, 0, 0.2]} castShadow>
          <boxGeometry args={[0.04, 0.5, 0.02]} />
          <meshStandardMaterial color="#1a1512" />
        </mesh>
      </group>

      {/* Legs - jeans */}
      <group ref={leftLegRef} position={[-0.15, 0.95, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.4, 4, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <capsuleGeometry args={[0.10, 0.4, 4, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        {/* Shoe */}
        <group position={[0, -1.0, 0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.1, 0.28]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
          <mesh position={[0, -0.06, 0]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.29]} />
            <primitive object={materials.sneakersSole} attach="material" />
          </mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.15, 0.95, 0]}>
        <mesh position={[0, -0.25, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.4, 4, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <capsuleGeometry args={[0.10, 0.4, 4, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <group position={[0, -1.0, 0.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.1, 0.28]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
          <mesh position={[0, -0.06, 0]} castShadow>
            <boxGeometry args={[0.15, 0.04, 0.29]} />
            <primitive object={materials.sneakersSole} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
