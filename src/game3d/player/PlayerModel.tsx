'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerModelProps {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Improved procedural humanoid - always safe, no async GLB loading that can crash
// Real GLB can be added later at public/models/player/player.glb with separate component
// This is explicitly documented as temporary fallback but high-quality

export function PlayerModel({ animation, moveSpeed }: PlayerModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const clockRef = useRef(0);

  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: '#e8c4a8', roughness: 0.6, metalness: 0.05 }),
    skinDark: new THREE.MeshStandardMaterial({ color: '#d4a88a', roughness: 0.7 }),
    hoodie: new THREE.MeshStandardMaterial({ color: '#252525', roughness: 0.9, metalness: 0.02 }),
    hoodieShadow: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.95 }),
    hoodieHighlight: new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.85 }),
    jeans: new THREE.MeshStandardMaterial({ color: '#2a3a5a', roughness: 0.8, metalness: 0.05 }),
    jeansFaded: new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: 0.85 }),
    sneakers: new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.7, metalness: 0.1 }),
    sneakersSole: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
    sneakersLaces: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
    backpack: new THREE.MeshStandardMaterial({ color: '#3d3028', roughness: 0.9 }),
    backpackDark: new THREE.MeshStandardMaterial({ color: '#2a211c', roughness: 0.95 }),
    hair: new THREE.MeshStandardMaterial({ color: '#1e1510', roughness: 0.95 }),
    eyes: new THREE.MeshStandardMaterial({ color: '#2a1a0a', roughness: 0.3 }),
  }), []);

  useFrame((state, delta) => {
    try {
      clockRef.current += delta;
      const t = clockRef.current;

      if (!groupRef.current) return;

      let legSwing = 0;
      let armSwing = 0;
      let bob = 0;
      let torsoSway = 0;
      let torsoPitch = 0;

      if (animation === 'idle') {
        bob = Math.sin(t * 1.2) * 0.015;
        torsoSway = Math.sin(t * 0.8) * 0.015;
        if (torsoRef.current) {
          torsoRef.current.scale.set(1 + Math.sin(t * 1.5) * 0.01, 1 + Math.sin(t * 1.5) * 0.02, 1);
        }
      } else if (animation === 'walk') {
        const freq = 5.5;
        legSwing = Math.sin(t * freq) * 0.55;
        armSwing = Math.sin(t * freq) * 0.45;
        bob = Math.abs(Math.sin(t * freq)) * 0.06;
        torsoSway = Math.sin(t * freq * 0.5) * 0.04;
        torsoPitch = 0.05;
      } else if (animation === 'run') {
        const freq = 9;
        legSwing = Math.sin(t * freq) * 0.85;
        armSwing = Math.sin(t * freq) * 0.75;
        bob = Math.abs(Math.sin(t * freq)) * 0.09;
        torsoSway = Math.sin(t * freq * 0.5) * 0.06;
        torsoPitch = 0.12;
      }

      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -armSwing * 0.9;
        leftArmRef.current.rotation.z = Math.sin(t * (animation === 'run' ? 9 : 5.5)) * 0.05;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = armSwing * 0.9;
        rightArmRef.current.rotation.z = -Math.sin(t * (animation === 'run' ? 9 : 5.5)) * 0.05;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 1.05 + bob;
        torsoRef.current.rotation.z = torsoSway;
        torsoRef.current.rotation.x = torsoPitch;
      }
      if (headRef.current) {
        if (animation === 'idle') {
          headRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
          headRef.current.rotation.x = Math.sin(t * 0.3) * 0.05;
        } else {
          headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0, delta * 3);
          headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, delta * 3);
        }
      }

      if (groupRef.current) {
        groupRef.current.position.y = bob * 0.3;
      }
    } catch (e) {
      console.error('[PlayerModel] Animation error', e);
    }
  });

  return (
    <group ref={groupRef} scale={1}>
      <group ref={torsoRef} position={[0, 1.05, 0]}>
        <group>
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, 0.45, 0.08]} castShadow>
            <sphereGeometry args={[0.33, 16, 16]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, 0.75, -0.18]} rotation={[0.25, 0, 0]} castShadow>
            <torusGeometry args={[0.21, 0.07, 10, 24, Math.PI * 1.4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0, 0.70, -0.20]} castShadow>
            <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, 0.15, 0.28]} castShadow>
            <boxGeometry args={[0.3, 0.25, 0.05]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[-0.08, 0.55, 0.26]} rotation={[0, 0, 0.1]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
          <mesh position={[0.08, 0.55, 0.26]} rotation={[0, 0, -0.1]} castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.3, 4]} />
            <primitive object={materials.hoodieShadow} attach="material" />
          </mesh>
        </group>

        <group ref={headRef} position={[0, 0.92, 0.06]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.20, 20, 20]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.08, 0.05]} scale={[0.9, 0.7, 0.9]} castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, 0.10, -0.02]} castShadow>
            <sphereGeometry args={[0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[0, 0.05, 0]} scale={[1.05, 0.9, 1]} castShadow>
            <sphereGeometry args={[0.205, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <primitive object={materials.hair} attach="material" />
          </mesh>
          <mesh position={[-0.07, 0.02, 0.16]} castShadow>
            <sphereGeometry args={[0.025, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
          <mesh position={[0.07, 0.02, 0.16]} castShadow>
            <sphereGeometry args={[0.025, 8, 8]} />
            <primitive object={materials.eyes} attach="material" />
          </mesh>
          <mesh position={[0, -0.03, 0.19]} scale={[0.03, 0.05, 0.03]} castShadow>
            <sphereGeometry args={[1, 6, 6]} />
            <primitive object={materials.skinDark} attach="material" />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[-0.42, 0.55, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.38, 6, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.45, 0]} castShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.62, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.32, 6, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.85, 0]} castShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.92, 0.02]} scale={[0.8, 0.5, 0.8]} castShadow>
            <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[0.42, 0.55, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.38, 6, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.45, 0]} castShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.62, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.32, 6, 12]} />
            <primitive object={materials.hoodie} attach="material" />
          </mesh>
          <mesh position={[0, -0.85, 0]} castShadow>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
          <mesh position={[0, -0.92, 0.02]} scale={[0.8, 0.5, 0.8]} castShadow>
            <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
            <primitive object={materials.skin} attach="material" />
          </mesh>
        </group>

        <group position={[0, 0.25, -0.38]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.45, 0.6, 0.22]} />
            <primitive object={materials.backpack} attach="material" />
          </mesh>
          <mesh position={[0, -0.05, -0.12]} castShadow>
            <boxGeometry args={[0.35, 0.25, 0.06]} />
            <primitive object={materials.backpackDark} attach="material" />
          </mesh>
          <mesh position={[0, 0.15, -0.12]} castShadow>
            <boxGeometry args={[0.02, 0.4, 0.02]} />
            <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[-0.20, 0.35, -0.20]} rotation={[0, 0, -0.15]} castShadow>
            <boxGeometry args={[0.06, 0.55, 0.02]} />
            <meshStandardMaterial color="#1a1512" roughness={0.9} />
          </mesh>
          <mesh position={[0.20, 0.35, -0.20]} rotation={[0, 0, 0.15]} castShadow>
            <boxGeometry args={[0.06, 0.55, 0.02]} />
            <meshStandardMaterial color="#1a1512" roughness={0.9} />
          </mesh>
        </group>
      </group>

      <group ref={leftLegRef} position={[-0.18, 1.0, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.14, 0.45, 6, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.58, 0]} castShadow>
          <sphereGeometry args={[0.13, 10, 10]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.85, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.12, 0.45, 6, 12]} />
          <primitive object={materials.jeansFaded} attach="material" />
        </mesh>
        <group position={[0, -1.15, 0.08]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.16, 0.12, 0.32]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
          <mesh position={[0, -0.07, 0]} castShadow>
            <boxGeometry args={[0.17, 0.05, 0.33]} />
            <primitive object={materials.sneakersSole} attach="material" />
          </mesh>
          <mesh position={[0, 0.04, 0.05]} castShadow>
            <boxGeometry args={[0.08, 0.02, 0.15]} />
            <primitive object={materials.sneakersLaces} attach="material" />
          </mesh>
          <mesh position={[0, -0.02, 0.14]} scale={[0.9, 0.6, 0.5]} castShadow>
            <sphereGeometry args={[0.08, 8, 8]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.18, 1.0, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.14, 0.45, 6, 12]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.58, 0]} castShadow>
          <sphereGeometry args={[0.13, 10, 10]} />
          <primitive object={materials.jeans} attach="material" />
        </mesh>
        <mesh position={[0, -0.85, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.12, 0.45, 6, 12]} />
          <primitive object={materials.jeansFaded} attach="material" />
        </mesh>
        <group position={[0, -1.15, 0.08]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.16, 0.12, 0.32]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
          <mesh position={[0, -0.07, 0]} castShadow>
            <boxGeometry args={[0.17, 0.05, 0.33]} />
            <primitive object={materials.sneakersSole} attach="material" />
          </mesh>
          <mesh position={[0, 0.04, 0.05]} castShadow>
            <boxGeometry args={[0.08, 0.02, 0.15]} />
            <primitive object={materials.sneakersLaces} attach="material" />
          </mesh>
          <mesh position={[0, -0.02, 0.14]} scale={[0.9, 0.6, 0.5]} castShadow>
            <sphereGeometry args={[0.08, 8, 8]} />
            <primitive object={materials.sneakers} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
