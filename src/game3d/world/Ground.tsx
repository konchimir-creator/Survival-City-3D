'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export function Ground() {
  const grassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a4a1a',
    roughness: 0.96,
    metalness: 0,
  }), []);

  const grassDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1e3a12',
    roughness: 0.97,
    metalness: 0,
  }), []);

  const asphaltBase = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#2a2a2e', 
    roughness: 0.94, 
    metalness: 0.02,
  }), []);

  const concreteSlab = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#8a8a8a', 
    roughness: 0.88, 
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }), []);

  const concreteDark = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#6a6a6a', 
    roughness: 0.90,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }), []);

  const asphaltPatch = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#1e1e22', 
    roughness: 0.92, 
    metalness: 0.03,
    transparent: true, 
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }), []);

  const dirtMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a3a2a',
    roughness: 0.98,
    metalness: 0,
  }), []);

  const dirtDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a2a1a',
    roughness: 0.99,
    metalness: 0,
  }), []);

  return (
    <>
      {/* GUARANTEED PHYSICAL FLOOR - FROZEN DO NOT CHANGE - CuboidCollider [150,0.25,150] pos [0,-0.25,0] */}
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <CuboidCollider
          args={[150, 0.25, 150]}
          position={[0, -0.25, 0]}
        />
      </RigidBody>

      {/* Visual ground - asphalt base slightly below roads to avoid z-fighting */}
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <primitive object={asphaltBase} attach="material" />
      </mesh>

      {/* Concrete slabs variation - sidewalk areas, avoid roads */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = (Math.random()-0.5)*300;
        const z = (Math.random()-0.5)*300;
        if (Math.abs(x)<7 || Math.abs(z)<7 || Math.abs(x-60)<6 || Math.abs(x+70)<6 || Math.abs(z-60)<6 || Math.abs(z+50)<6) return null;
        return (
          <mesh key={`slab-${i}`} receiveShadow position={[x, -0.03, z]} rotation={[-Math.PI/2, 0, Math.random()*0.15]}>
            <planeGeometry args={[4+Math.random()*3, 4+Math.random()*3]} />
            <primitive object={i%3===0 ? concreteDark : concreteSlab} attach="material" />
          </mesh>
        );
      })}

      {/* Asphalt variation patches */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={`asphalt-patch-${i}`} position={[(Math.random()-0.5)*280, -0.04, (Math.random()-0.5)*280]} rotation={[-Math.PI/2, 0, Math.random()*Math.PI]} receiveShadow>
          <planeGeometry args={[3+Math.random()*6, 2+Math.random()*3]} />
          <primitive object={asphaltPatch} attach="material" />
        </mesh>
      ))}

      {/* Grass patches - park and yards, improved */}
      <mesh receiveShadow position={[-20, -0.02, 80]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 30]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-80, -0.02, -40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[25, 25]} />
        <primitive object={grassDark} attach="material" />
      </mesh>
      <mesh receiveShadow position={[60, -0.02, 40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-30, -0.02, 70]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <primitive object={grassDark} attach="material" />
      </mesh>

      {/* Dirt patches - improved */}
      <mesh receiveShadow position={[100, -0.02, 20]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[30, 40]} />
        <primitive object={dirtMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-100, -0.02, -70]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 30]} />
        <primitive object={dirtDark} attach="material" />
      </mesh>
    </>
  );
}
