'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export function Weather() {
  const weather = useGameStore((s) => s.weather);
  const settings = useGameStore((s) => s.settings);
  
  const rainCount = settings.graphics === 'low' ? 500 : settings.graphics === 'medium' ? 1500 : 3000;
  
  const rainRef = useRef<THREE.Points>(null);
  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = new Float32Array(rainCount);
    
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 100 + 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      velocities[i] = 0.5 + Math.random() * 0.5;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    
    return geo;
  }, [rainCount]);

  const rainMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#aaccff',
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
  }, []);

  useFrame((state, delta) => {
    if (!rainRef.current) return;
    if (weather.type !== 'rain') {
      rainRef.current.visible = false;
      return;
    }
    
    rainRef.current.visible = true;
    const positions = rainGeo.attributes.position as THREE.BufferAttribute;
    const velocities = rainGeo.attributes.velocity as THREE.BufferAttribute;
    
    const playerPos = (window as any).__cameraPosition || new THREE.Vector3(0,0,0);
    
    for (let i = 0; i < rainCount; i++) {
      let y = positions.getY(i);
      y -= velocities.getX(i) * delta * 60 * (weather.intensity || 1);
      
      if (y < 0) {
        y = Math.random() * 50 + 50;
        positions.setX(i, playerPos.x + (Math.random() - 0.5) * 100);
        positions.setZ(i, playerPos.z + (Math.random() - 0.5) * 100);
      }
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    
    // Follow player
    if (rainRef.current) {
      rainRef.current.position.x = playerPos.x;
      rainRef.current.position.z = playerPos.z;
    }
  });

  // Wet road effect is handled via material change in Roads component - for now just rain particles

  return (
    <group>
      {weather.type === 'rain' && (
        <points ref={rainRef} geometry={rainGeo} material={rainMaterial} />
      )}
    </group>
  );
}
