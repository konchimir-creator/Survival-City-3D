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

  const asphaltBase = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.95, metalness: 0 }), []);
  const concreteSlab = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8a8a', roughness: 0.9, metalness: 0.02 }), []);
  const concreteDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6a6a6a', roughness: 0.92 }), []);
  const asphaltPatch = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e1e22', roughness: 0.9, transparent: true, opacity: 0.6 }), []);

  return (
    <>
      {/* GUARANTEED PHYSICAL FLOOR - FROZEN DO NOT CHANGE - CuboidCollider [150,0.25,150] pos [0,-0.25,0] */}
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <CuboidCollider
          args={[150, 0.25, 150]}
          position={[0, -0.25, 0]}
        />
      </RigidBody>

      {/* Visual ground - asphalt base */}
      <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <primitive object={asphaltBase} attach="material" />
      </mesh>

      {/* Sidewalk variation - concrete slabs with cracks */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (Math.random()-0.5)*300;
        const z = (Math.random()-0.5)*300;
        // Skip roads
        if (Math.abs(x)<6 || Math.abs(z)<6 || Math.abs(x-60)<5 || Math.abs(x+70)<5 || Math.abs(z-60)<5 || Math.abs(z+50)<5) return null;
        return (
          <mesh key={`slab-${i}`} receiveShadow position={[x, 0.005, z]} rotation={[-Math.PI/2, 0, Math.random()*0.1]}>
            <planeGeometry args={[4+Math.random()*3, 4+Math.random()*3]} />
            <primitive object={i%3===0 ? concreteDark : concreteSlab} attach="material" />
          </mesh>
        );
      })}

      {/* Asphalt variation patches */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={`asphalt-patch-${i}`} position={[(Math.random()-0.5)*280, 0.001, (Math.random()-0.5)*280]} rotation={[-Math.PI/2, 0, Math.random()*Math.PI]} receiveShadow>
          <planeGeometry args={[3+Math.random()*6, 2+Math.random()*3]} />
          <primitive object={asphaltPatch} attach="material" />
        </mesh>
      ))}

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
