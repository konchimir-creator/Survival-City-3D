'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { getTimeOfDay } from '@/game/time/types';

export function Lighting() {
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const settings = useGameStore((s) => s.settings);
  
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  useFrame(() => {
    try {
      if (!sunRef.current || !ambientRef.current || !hemiRef.current) return;

      const timeOfDay = getTimeOfDay(time.minuteOfDay);
      const hour = time.minuteOfDay / 60;

      let sunAngle = ((hour - 6) / 14) * Math.PI;
      sunAngle = Math.max(0, Math.min(Math.PI, sunAngle));
      
      const sunHeight = Math.sin(sunAngle);
      const sunDistance = 120;
      
      const sunX = Math.cos(sunAngle) * sunDistance * 0.6;
      const sunY = Math.max(sunHeight * sunDistance, 8);
      const sunZ = Math.sin(sunAngle) * 30 + Math.cos(sunAngle * 0.5) * 10;

      sunRef.current.position.set(sunX, sunY, sunZ);

      let intensity = 0;
      let color = new THREE.Color();
      let ambientIntensity = 0;
      let ambientColor = new THREE.Color();
      let hemiIntensity = 0.3;
      let hemiSkyColor = new THREE.Color();
      let hemiGroundColor = new THREE.Color();

      if (timeOfDay === 'dawn') {
        const t = (hour - 5) / 2;
        intensity = THREE.MathUtils.lerp(0.15, 0.9, t);
        color.setHSL(0.07, 0.7, 0.55);
        ambientIntensity = THREE.MathUtils.lerp(0.25, 0.5, t);
        ambientColor.setHSL(0.08, 0.35, 0.45);
        hemiIntensity = THREE.MathUtils.lerp(0.2, 0.4, t);
        hemiSkyColor.setHSL(0.08, 0.5, 0.6);
        hemiGroundColor.setHSL(0.08, 0.3, 0.2);
      } else if (timeOfDay === 'morning') {
        const t = (hour - 7) / 4;
        intensity = THREE.MathUtils.lerp(0.9, 1.3, t);
        color.setHSL(THREE.MathUtils.lerp(0.08, 0.12, t), THREE.MathUtils.lerp(0.6, 0.2, t), 0.95);
        ambientIntensity = THREE.MathUtils.lerp(0.5, 0.65, t);
        ambientColor.setHSL(0.6, 0.15, 0.85);
        hemiIntensity = THREE.MathUtils.lerp(0.4, 0.55, t);
        hemiSkyColor.setHSL(0.58, 0.4, 0.8);
        hemiGroundColor.setHSL(0.15, 0.2, 0.4);
      } else if (timeOfDay === 'day') {
        intensity = 1.4;
        color.setHSL(0.12, 0.08, 1.0);
        ambientIntensity = 0.7;
        ambientColor.setHSL(0.6, 0.08, 0.92);
        hemiIntensity = 0.6;
        hemiSkyColor.setHSL(0.58, 0.5, 0.85);
        hemiGroundColor.setHSL(0.1, 0.25, 0.35);
      } else if (timeOfDay === 'evening') {
        const t = (hour - 17) / 4;
        intensity = THREE.MathUtils.lerp(1.3, 0.15, t);
        color.setHSL(THREE.MathUtils.lerp(0.12, 0.04, t), THREE.MathUtils.lerp(0.2, 0.85, t), THREE.MathUtils.lerp(1.0, 0.55, t));
        ambientIntensity = THREE.MathUtils.lerp(0.65, 0.3, t);
        ambientColor.setHSL(THREE.MathUtils.lerp(0.6, 0.05, t), THREE.MathUtils.lerp(0.1, 0.5, t), THREE.MathUtils.lerp(0.9, 0.45, t));
        hemiIntensity = THREE.MathUtils.lerp(0.55, 0.25, t);
        hemiSkyColor.setHSL(THREE.MathUtils.lerp(0.58, 0.05, t), THREE.MathUtils.lerp(0.5, 0.7, t), THREE.MathUtils.lerp(0.85, 0.5, t));
        hemiGroundColor.setHSL(0.05, 0.4, 0.25);
      } else {
        intensity = 0.12;
        color.setHSL(0.65, 0.35, 0.55);
        ambientIntensity = 0.2;
        ambientColor.setHSL(0.65, 0.35, 0.25);
        hemiIntensity = 0.15;
        hemiSkyColor.setHSL(0.65, 0.4, 0.15);
        hemiGroundColor.setHSL(0.65, 0.3, 0.08);
      }

      if (weather.type === 'cloudy') {
        intensity *= 0.65;
        ambientIntensity *= 0.9;
        hemiIntensity *= 0.85;
      } else if (weather.type === 'rain') {
        intensity *= 0.35;
        ambientIntensity *= 0.75;
        hemiIntensity *= 0.7;
      }

      sunRef.current.intensity = intensity;
      sunRef.current.color.copy(color);
      ambientRef.current.intensity = ambientIntensity;
      ambientRef.current.color.copy(ambientColor);
      hemiRef.current.intensity = hemiIntensity;
      (hemiRef.current as any).color.copy(hemiSkyColor);
      (hemiRef.current as any).groundColor.copy(hemiGroundColor);
    } catch (e) {
      console.warn('[Lighting] Frame error', e);
    }
  });

  const shadowMapSize = settings.graphics === 'low' ? 512 : settings.graphics === 'medium' ? 1024 : 2048;
  const shadowEnabled = settings.graphics !== 'low';

  return (
    <>
      <directionalLight
        ref={sunRef}
        castShadow={shadowEnabled}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} intensity={0.4} color="#87CEEB" groundColor="#3a3a2a" />
    </>
  );
}

export function SkyAndFog() {
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);

  const fogColor = useMemo(() => {
    const timeOfDay = getTimeOfDay(time.minuteOfDay);
    if (timeOfDay === 'night') return '#0a0a1a';
    if (timeOfDay === 'evening') return '#4a3a2a';
    if (weather.type === 'rain') return '#3a3a4a';
    if (weather.type === 'cloudy') return '#6a6a6a';
    return '#87aadd';
  }, [time.minuteOfDay, weather.type]);

  // Simple gradient sky without heavy Sky shader - more compatible
  // Sky shader was causing black screen on some GPUs, using color + fog instead
  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 60, 350]} />
      
      {/* Simple sky dome gradient - lightweight */}
      <mesh scale={[400, 400, 400]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={fogColor} side={THREE.BackSide} />
      </mesh>
      
      {/* Distant skyline */}
      <group>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const dist = 250 + Math.random() * 100;
          const x = Math.cos(angle) * dist;
          const z = Math.sin(angle) * dist;
          const h = 20 + Math.random() * 40;
          const w = 15 + Math.random() * 20;
          return (
            <mesh key={`skyline-${i}`} position={[x, h/2, z]}>
              <boxGeometry args={[w, h, w]} />
              <meshStandardMaterial color="#1a1a2a" roughness={1} transparent opacity={0.5} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}
