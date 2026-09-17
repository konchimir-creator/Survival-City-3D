'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';

export function Ground() {
  const groundMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a4a4a',
      roughness: 0.9,
      metalness: 0.05,
    });
  }, []);

  const grassMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#3a5a2a',
      roughness: 0.95,
      metalness: 0,
    });
  }, []);

  const sidewalkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#8a8a8a',
      roughness: 0.85,
      metalness: 0.1,
    });
  }, []);

  return (
    <>
      {/* Main ground plane - 400x400 */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[400, 1, 400]} />
          <primitive object={groundMaterial} attach="material" />
        </mesh>
      </RigidBody>

      {/* Sidewalks - defined as raised areas */}
      {/* Central sidewalks around buildings */}
      <group>
        {/* Sidewalk around center */}
        <mesh receiveShadow position={[0, 0.05, 0]}>
          <boxGeometry args={[300, 0.2, 300]} />
          <meshStandardMaterial color="#7a7a7a" roughness={0.85} />
        </mesh>
      </group>

      {/* Decorative ground patches - park */}
      <mesh receiveShadow position={[ -20, 0.06, 80 ]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 30]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>

      {/* Dirt patches */}
      <mesh receiveShadow position={[100, 0.07, 20]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial color="#5a4a3a" roughness={1} />
      </mesh>
    </>
  );
}
