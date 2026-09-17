'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export function Ground() {
  // Muted urban grass - several close natural shades, not artificial sharp borders
  const grassMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3a5a2a',
    roughness: 0.94,
    metalness: 0,
  }), []);

  const grassMid = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a6a32',
    roughness: 0.95,
    metalness: 0,
  }), []);

  const grassDark = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2e4a22',
    roughness: 0.96,
    metalness: 0,
  }), []);

  const grassLight = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#5a7a3a',
    roughness: 0.93,
    metalness: 0,
  }), []);

  const asphaltBase = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#2e2e34', 
    roughness: 0.90, 
    metalness: 0.03,
  }), []);

  const concreteSlab = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#8e8e8e', 
    roughness: 0.86, 
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }), []);

  const concreteDark = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#7a7a7a', 
    roughness: 0.88,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }), []);

  const concreteLight = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#a0a0a0', 
    roughness: 0.84,
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
    opacity: 0.42,
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

      {/* Concrete slabs variation - sidewalk areas, avoid roads, more variation */}
      {Array.from({ length: 32 }).map((_, i) => {
        const x = (Math.random()-0.5)*300;
        const z = (Math.random()-0.5)*300;
        if (Math.abs(x)<7 || Math.abs(z)<7 || Math.abs(x-60)<6 || Math.abs(x+70)<6 || Math.abs(z-60)<6 || Math.abs(z+50)<6) return null;
        // Avoid building positions
        const nearBuilding = [
          [40,-35],[ -50,80],[-95,35],[78,-15],[90,80],[-20,-75],[-90,-70],[30,85],[-30,-20],[20,30],[-30,35],[-50,10],[30,-70]
        ].some(([bx,bz]) => Math.abs(x-bx)<12 && Math.abs(z-bz)<12);
        if (nearBuilding) return null;
        const mat = i%3===0 ? concreteDark : i%3===1 ? concreteSlab : concreteLight;
        return (
          <mesh key={`slab-${i}`} receiveShadow position={[x, -0.03, z]} rotation={[-Math.PI/2, 0, Math.random()*0.15]}>
            <planeGeometry args={[3+Math.random()*4, 3+Math.random()*4]} />
            <primitive object={mat} attach="material" />
          </mesh>
        );
      })}

      {/* Asphalt variation patches - subtle */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={`asphalt-patch-${i}`} position={[(Math.random()-0.5)*280, -0.04, (Math.random()-0.5)*280]} rotation={[-Math.PI/2, 0, Math.random()*Math.PI]} receiveShadow>
          <planeGeometry args={[2+Math.random()*5, 1.5+Math.random()*2.5]} />
          <primitive object={asphaltPatch} attach="material" />
        </mesh>
      ))}

      {/* Grass patches - muted urban grass, several close shades, light variation/patches, avoid sharp borders */}
      <mesh receiveShadow position={[-20, -0.02, 80]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[50, 30]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-80, -0.02, -40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[28, 28]} />
        <primitive object={grassDark} attach="material" />
      </mesh>
      <mesh receiveShadow position={[60, -0.02, 40]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <primitive object={grassMid} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-30, -0.02, 70]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <primitive object={grassLight} attach="material" />
      </mesh>
      <mesh receiveShadow position={[10, -0.02, 10]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[35, 35]} />
        <primitive object={grassMid} attach="material" />
      </mesh>
      <mesh receiveShadow position={[-40, -0.02, 20]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[30, 20]} />
        <primitive object={grassMaterial} attach="material" />
      </mesh>
      <mesh receiveShadow position={[0, -0.02, -20]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[25, 25]} />
        <primitive object={grassDark} attach="material" />
      </mesh>
      {/* Additional small grass variation patches */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (Math.random()-0.5)*120;
        const z = (Math.random()-0.5)*120;
        if (Math.abs(x)<8 || Math.abs(z)<8 || Math.abs(x-60)<7 || Math.abs(x+70)<7 || Math.abs(z-60)<7 || Math.abs(z+50)<7) return null;
        const mat = i%4===0 ? grassDark : i%4===1 ? grassMaterial : i%4===2 ? grassMid : grassLight;
        return (
          <mesh key={`grass-var-${i}`} receiveShadow position={[x, -0.021, z]} rotation={[-Math.PI/2, 0, Math.random()*0.4]}>
            <planeGeometry args={[4+Math.random()*6, 4+Math.random()*6]} />
            <primitive object={mat} attach="material" />
          </mesh>
        );
      })}

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
