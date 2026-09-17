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
  const skyColorRef = useRef(new THREE.Color('#87CEEB'));

  useFrame(() => {
    if (!sunRef.current || !ambientRef.current) return;

    const timeOfDay = getTimeOfDay(time.minuteOfDay);
    const hour = time.minuteOfDay / 60;

    // Sun position based on time
    // Sunrise 6am, sunset 20pm
    let sunAngle = ((hour - 6) / 14) * Math.PI; // 0 at sunrise, PI at sunset
    sunAngle = Math.max(0, Math.min(Math.PI, sunAngle));
    
    const sunHeight = Math.sin(sunAngle);
    const sunDistance = 100;
    
    const sunX = Math.cos(sunAngle) * sunDistance * 0.5;
    const sunY = sunHeight * sunDistance;
    const sunZ = Math.sin(sunAngle * 0.5) * 20;

    sunRef.current.position.set(sunX, Math.max(sunY, 5), sunZ);

    // Light intensity and color based on time
    let intensity = 0;
    let color = new THREE.Color();
    let ambientIntensity = 0;
    let ambientColor = new THREE.Color();

    if (timeOfDay === 'dawn') {
      intensity = THREE.MathUtils.lerp(0.2, 0.8, (hour - 5) / 2);
      color.setHSL(0.08, 0.6, 0.6); // warm orange
      ambientIntensity = 0.4;
      ambientColor.setHSL(0.08, 0.3, 0.5);
      skyColorRef.current.setHSL(0.08, 0.5, 0.7);
    } else if (timeOfDay === 'morning') {
      intensity = THREE.MathUtils.lerp(0.8, 1.2, (hour - 7) / 4);
      color.setHSL(0.15, 0.3, 0.9);
      ambientIntensity = 0.6;
      ambientColor.setHSL(0.6, 0.2, 0.8);
      skyColorRef.current.setHSL(0.6, 0.5, 0.8);
    } else if (timeOfDay === 'day') {
      intensity = 1.2;
      color.setHSL(0.15, 0.1, 1);
      ambientIntensity = 0.7;
      ambientColor.setHSL(0.6, 0.1, 0.9);
      skyColorRef.current.setHSL(0.58, 0.6, 0.8);
    } else if (timeOfDay === 'evening') {
      const t = (hour - 17) / 4;
      intensity = THREE.MathUtils.lerp(1.2, 0.2, t);
      color.setHSL(THREE.MathUtils.lerp(0.15, 0.05, t), 0.8, THREE.MathUtils.lerp(1, 0.6, t));
      ambientIntensity = THREE.MathUtils.lerp(0.6, 0.3, t);
      ambientColor.setHSL(0.05, 0.4, 0.5);
      skyColorRef.current.setHSL(THREE.MathUtils.lerp(0.58, 0.05, t), 0.7, THREE.MathUtils.lerp(0.8, 0.5, t));
    } else { // night
      intensity = 0.15;
      color.setHSL(0.65, 0.3, 0.6); // cold blue
      ambientIntensity = 0.25;
      ambientColor.setHSL(0.65, 0.4, 0.3);
      skyColorRef.current.setHSL(0.65, 0.5, 0.1);
    }

    // Weather modifications
    if (weather.type === 'cloudy') {
      intensity *= 0.7;
      ambientIntensity *= 0.9;
      skyColorRef.current.lerp(new THREE.Color('#8a8a8a'), 0.5);
    } else if (weather.type === 'rain') {
      intensity *= 0.4;
      ambientIntensity *= 0.8;
      skyColorRef.current.lerp(new THREE.Color('#4a4a5a'), 0.7);
    }

    sunRef.current.intensity = intensity;
    sunRef.current.color.copy(color);
    ambientRef.current.intensity = ambientIntensity;
    ambientRef.current.color.copy(ambientColor);

    // Update fog color to match sky
    // Fog is set in Canvas, but we can update scene background via useThree?
  });

  const shadowMapSize = settings.graphics === 'low' ? 512 : settings.graphics === 'medium' ? 1024 : 2048;

  return (
    <>
      <directionalLight
        ref={sunRef}
        castShadow={settings.graphics !== 'low'}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-bias={-0.0001}
      />
      <ambientLight ref={ambientRef} intensity={0.5} />
      {/* Hemisphere for more natural outdoor */}
      <hemisphereLight intensity={0.3} color="#87CEEB" groundColor="#3a3a2a" />
    </>
  );
}

export function SkyAndFog() {
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);

  const fogColor = useMemo(() => {
    const hour = time.minuteOfDay / 60;
    const timeOfDay = getTimeOfDay(time.minuteOfDay);
    if (timeOfDay === 'night') return '#0a0a1a';
    if (timeOfDay === 'evening') return '#4a3a2a';
    if (weather.type === 'rain') return '#3a3a4a';
    if (weather.type === 'cloudy') return '#6a6a6a';
    return '#a0c0e0';
  }, [time.minuteOfDay, weather.type]);

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 80, 300]} />
    </>
  );
}
