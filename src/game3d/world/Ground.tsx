'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export function Ground() {
  const grassMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a4a1a',
      roughness: 0.95,
      metalness: 0,
    });
  }, []);

  return (
    <>
      {/* GUARANTEED PHYSICAL FLOOR - independent of visual roads, no custom collisionGroups, no rotation, no scale */}
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <CuboidCollider
          args={[150, 0.25, 150]}
          position={[0, -0.25, 0]}
        />
      </RigidBody>

      {/* Visual ground - more natural, not just flat gray */}
      <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#2a2a2a" roughness={1} metalness={0} />
      </mesh>

      {/* Grass patches - park and yards */}
      <mesh receiveShadow position={[-20, 0.01, 80]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 30]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-80, 0.01, -40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[25, 25]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[60, 0.01, 40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>

      {/* Dirt patches */}
      <mesh receiveShadow position={[100, 0.015, 20]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial color="#4a3a2a" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[-100, 0.015, -70]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 30]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>
    </>
  );
}
