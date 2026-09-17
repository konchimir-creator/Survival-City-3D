'use client';
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { getTimeOfDay } from '@/game/time/types';

export function Lighting() {
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const settings = useGameStore((s) => s.settings);
  const { gl } = useThree();
  
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  useFrame(() => {
    try {
      if (!sunRef.current || !moonRef.current || !ambientRef.current || !hemiRef.current) return;

      // Reset active lights counter for F3
      (window as any).__activeLights = 0;
      (window as any).__shadowLights = 0;

      const timeOfDay = getTimeOfDay(time.minuteOfDay);
      const hour = time.minuteOfDay / 60;

      // Sun path 5-21 => 0-PI
      let sunProgress = 0;
      if (hour >= 5 && hour <= 21) sunProgress = (hour - 5) / 16;
      else if (hour < 5) sunProgress = -0.15 + (hour / 5) * 0.15;
      else sunProgress = 1 + ((hour - 21) / 3) * 0.15;
      let sunAngle = sunProgress * Math.PI;
      sunAngle = Math.max(-0.15, Math.min(Math.PI + 0.15, sunAngle));
      
      const sunDistance = 120;
      const sunHeight = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle) * sunDistance * 0.7;
      const sunY = Math.max(sunHeight * sunDistance, -20);
      const sunZ = Math.sin(sunAngle * 0.3) * 20;
      sunRef.current.position.set(sunX, sunY, sunZ);

      // Moon opposite, high at night
      let nightProgress = 0;
      if (hour >= 21) nightProgress = (hour - 21) / 8;
      else if (hour < 5) nightProgress = (hour + 3) / 8;
      else nightProgress = -0.3;
      const moonAngle = nightProgress * Math.PI;
      const moonDist = 100;
      const moonX = Math.cos(moonAngle) * moonDist * 0.55;
      const moonY = Math.sin(moonAngle) * moonDist;
      const moonZ = -30;
      if (hour >= 6 && hour < 20) {
        moonRef.current.position.set(moonX, -100, moonZ);
      } else {
        moonRef.current.position.set(moonX, Math.max(moonY, 15), moonZ);
      }

      let sunIntensity = 0;
      let sunColor = new THREE.Color();
      let moonIntensity = 0;
      let moonColor = new THREE.Color('#8FA8D8');
      let ambientIntensity = 0;
      let ambientColor = new THREE.Color();
      let hemiIntensity = 0.3;
      let hemiSkyColor = new THREE.Color();
      let hemiGroundColor = new THREE.Color();

      if (timeOfDay === 'dawn') {
        const t = (hour - 5) / 2;
        sunIntensity = THREE.MathUtils.lerp(0.35, 1.05, t);
        sunColor.setHSL(0.07, 0.60, THREE.MathUtils.lerp(0.60, 0.78, t));
        moonIntensity = THREE.MathUtils.lerp(0.15, 0.02, t);
        ambientIntensity = THREE.MathUtils.lerp(0.42, 0.62, t);
        ambientColor.setHSL(0.08, 0.28, THREE.MathUtils.lerp(0.48, 0.65, t));
        hemiIntensity = THREE.MathUtils.lerp(0.38, 0.52, t);
        hemiSkyColor.setHSL(0.08, 0.5, 0.68);
        hemiGroundColor.setHSL(0.08, 0.25, 0.26);
      } else if (timeOfDay === 'morning') {
        const t = (hour - 7) / 4;
        sunIntensity = THREE.MathUtils.lerp(1.05, 1.55, t);
        sunColor.setHSL(THREE.MathUtils.lerp(0.08, 0.12, t), THREE.MathUtils.lerp(0.45, 0.10, t), THREE.MathUtils.lerp(0.78, 0.99, t));
        moonIntensity = 0;
        ambientIntensity = THREE.MathUtils.lerp(0.62, 0.82, t);
        ambientColor.setHSL(0.6, 0.10, 0.88);
        hemiIntensity = THREE.MathUtils.lerp(0.52, 0.70, t);
        hemiSkyColor.setHSL(0.58, 0.45, 0.84);
        hemiGroundColor.setHSL(0.15, 0.20, 0.46);
      } else if (timeOfDay === 'day') {
        sunIntensity = 1.65;
        sunColor.setHSL(0.12, 0.04, 1.0);
        moonIntensity = 0;
        ambientIntensity = 0.88;
        ambientColor.setHSL(0.6, 0.05, 0.95);
        hemiIntensity = 0.78;
        hemiSkyColor.setHSL(0.58, 0.45, 0.88);
        hemiGroundColor.setHSL(0.1, 0.22, 0.46);
      } else if (timeOfDay === 'evening') {
        const t = (hour - 17) / 4;
        sunIntensity = THREE.MathUtils.lerp(1.55, 0.25, t);
        sunColor.setHSL(THREE.MathUtils.lerp(0.12, 0.04, t), THREE.MathUtils.lerp(0.10, 0.80, t), THREE.MathUtils.lerp(0.99, 0.60, t));
        moonIntensity = THREE.MathUtils.lerp(0.02, 0.28, t);
        ambientIntensity = THREE.MathUtils.lerp(0.82, 0.42, t);
        ambientColor.setHSL(THREE.MathUtils.lerp(0.6, 0.08, t), THREE.MathUtils.lerp(0.06, 0.35, t), THREE.MathUtils.lerp(0.95, 0.52, t));
        hemiIntensity = THREE.MathUtils.lerp(0.70, 0.38, t);
        hemiSkyColor.setHSL(THREE.MathUtils.lerp(0.58, 0.08, t), THREE.MathUtils.lerp(0.45, 0.65, t), THREE.MathUtils.lerp(0.88, 0.58, t));
        hemiGroundColor.setHSL(0.08, 0.35, 0.30);
      } else {
        // night - PLAYABLE, not pitch black
        // Moon gives readable forms, weak shadows, character contour, road readable
        sunIntensity = 0.02;
        sunColor.setHSL(0.65, 0.15, 0.4);
        moonIntensity = 0.42; // cold directional moon #8FA8D8
        moonColor.set('#8FA8D8');
        ambientIntensity = 0.42; // minimal ambient floor - was 0.18 too dark
        ambientColor.setHSL(0.62, 0.22, 0.32); // cold blue-gray, not black
        hemiIntensity = 0.38; // was 0.12 too dark, need fill for shadow sides
        hemiSkyColor.setHSL(0.62, 0.35, 0.28); // cold blue-gray sky
        hemiGroundColor.setHSL(0.62, 0.18, 0.14); // very dark blue-gray, not black
      }

      if (weather.type === 'cloudy') {
        sunIntensity *= 0.62;
        moonIntensity *= 0.75;
        ambientIntensity *= 0.90;
        hemiIntensity *= 0.84;
      } else if (weather.type === 'rain') {
        sunIntensity *= 0.32;
        moonIntensity *= 0.55;
        ambientIntensity *= 0.78;
        hemiIntensity *= 0.70;
      }

      sunRef.current.intensity = sunIntensity;
      sunRef.current.color.copy(sunColor);
      moonRef.current.intensity = moonIntensity;
      moonRef.current.color.copy(moonColor);
      ambientRef.current.intensity = ambientIntensity;
      ambientRef.current.color.copy(ambientColor);
      hemiRef.current.intensity = hemiIntensity;
      (hemiRef.current as any).color.copy(hemiSkyColor);
      (hemiRef.current as any).groundColor.copy(hemiGroundColor);

      (window as any).__sunPosition = { x: sunX, y: sunY, z: sunZ };
      (window as any).__moonPosition = { x: moonX, y: moonY, z: moonZ };
      (window as any).__isNight = timeOfDay === 'night';
      (window as any).__isDay = timeOfDay === 'day' || timeOfDay === 'morning';
      (window as any).__timeOfDay = timeOfDay;
      (window as any).__nightLighting = {
        ambient: ambientIntensity,
        hemi: hemiIntensity,
        moon: moonIntensity,
        sun: sunIntensity,
      };
      if (sunIntensity > 0.2) (window as any).__activeLights++;
      if (moonIntensity > 0.05) (window as any).__activeLights++;
      if (shadowEnabled) (window as any).__shadowLights = 1;

      // Exposure: slightly higher at night for readability, not overbright day
      try {
        const targetExposure = timeOfDay === 'night' ? 1.15 : timeOfDay === 'evening' || timeOfDay === 'dawn' ? 1.05 : 1.0;
        gl.toneMappingExposure = THREE.MathUtils.lerp(gl.toneMappingExposure || 1, targetExposure, 0.02);
      } catch {}
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
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      <directionalLight
        ref={moonRef}
        castShadow={false}
        intensity={0.35}
        color="#8FA8D8"
      />
      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} intensity={0.4} color="#87CEEB" groundColor="#3a3a2a" />
    </>
  );
}

export function SkyAndFog() {
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const settings = useGameStore((s) => s.settings);

  const timeOfDay = getTimeOfDay(time.minuteOfDay);
  const hour = time.minuteOfDay / 60;

  const skyData = useMemo(() => {
    let topColor = '#87CEEB';
    let bottomColor = '#E0F0FF';
    let fogColor = '#87aadd';
    let sunColor = '#FFD700';
    let moonColor = '#E6E6E6';

    if (timeOfDay === 'dawn') {
      const t = (hour - 5) / 2;
      topColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.08, 0.55, t), 0.7, THREE.MathUtils.lerp(0.35, 0.65, t)).getStyle();
      bottomColor = new THREE.Color().setHSL(0.08, 0.8, THREE.MathUtils.lerp(0.55, 0.85, t)).getStyle();
      fogColor = new THREE.Color().setHSL(0.08, 0.4, THREE.MathUtils.lerp(0.52, 0.72, t)).getStyle();
      sunColor = '#FFAA44';
    } else if (timeOfDay === 'morning') {
      topColor = '#7AB8E6';
      bottomColor = '#D0E8FF';
      fogColor = '#8AB4DD';
      sunColor = '#FFE8AA';
    } else if (timeOfDay === 'day') {
      topColor = '#5A9FE2';
      bottomColor = '#B0D8FF';
      fogColor = weather.type === 'rain' ? '#7a8a9a' : weather.type === 'cloudy' ? '#9aaab8' : '#a0c0e0';
      sunColor = '#FFFFFF';
    } else if (timeOfDay === 'evening') {
      const t = (hour - 17) / 4;
      topColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.05, t), THREE.MathUtils.lerp(0.5, 0.8, t), THREE.MathUtils.lerp(0.65, 0.38, t)).getStyle();
      bottomColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.08, t), 0.9, THREE.MathUtils.lerp(0.7, 0.55, t)).getStyle();
      fogColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.05, t), 0.5, THREE.MathUtils.lerp(0.62, 0.45, t)).getStyle();
      sunColor = '#FF6633';
    } else {
      topColor = '#10102a';
      bottomColor = '#1e1e42';
      fogColor = '#15152e';
      moonColor = '#E8E8D8';
    }

    if (weather.type === 'rain') {
      fogColor = timeOfDay === 'night' ? '#1e1e32' : '#6a7a8a';
    } else if (weather.type === 'cloudy' && timeOfDay === 'day') {
      fogColor = '#9aaab8';
      topColor = '#6a8aaa';
    }

    if (timeOfDay === 'night') {
      // Dark blue fog, not black wall, matches sky
      fogColor = weather.type === 'rain' ? '#1e1e32' : '#15152e';
    }

    return { topColor, bottomColor, fogColor, sunColor, moonColor };
  }, [time.minuteOfDay, weather.type, timeOfDay, hour]);

  const sunPos = useMemo(() => {
    let progress = 0;
    if (hour >= 5 && hour <= 21) progress = (hour - 5) / 16;
    else if (hour < 5) progress = -0.15 + (hour / 5) * 0.15;
    else progress = 1 + ((hour - 21) / 3) * 0.15;
    const angle = progress * Math.PI;
    const dist = 450;
    const x = Math.cos(angle) * dist * 0.65;
    const y = Math.sin(angle) * dist;
    const z = Math.sin(angle * 0.25) * 25;
    return new THREE.Vector3(x, Math.max(y, -80), z);
  }, [hour]);

  const moonPos = useMemo(() => {
    let nightProgress = 0;
    if (hour >= 21) nightProgress = (hour - 21) / 8;
    else if (hour < 5) nightProgress = (hour + 3) / 8;
    else nightProgress = -0.3;
    const angle = nightProgress * Math.PI;
    const dist = 400;
    const x = Math.cos(angle) * dist * 0.55;
    const y = Math.sin(angle) * dist;
    const z = -40;
    if (hour >= 6 && hour < 20) {
      return new THREE.Vector3(x, -200, z);
    }
    return new THREE.Vector3(x, Math.max(y, 25), z);
  }, [hour]);

  const isNight = timeOfDay === 'night';
  const isSunVisible = hour >= 5.5 && hour <= 20.5;
  const isMoonVisible = hour < 6 || hour > 19.5;

  const fogNear = settings.graphics === 'low' ? 55 : 85;
  const fogFar = settings.graphics === 'low' ? 240 : weather.type === 'rain' ? 240 : weather.type === 'cloudy' ? 360 : 550;

  return (
    <>
      <color attach="background" args={[skyData.fogColor]} />
      <fog attach="fog" args={[skyData.fogColor, fogNear, fogFar]} />

      <mesh scale={[420, 420, 420]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={skyData.topColor} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={[415, 415, 415]}>
        <sphereGeometry args={[1, 16, 16, 0, Math.PI*2, 0, Math.PI*0.52]} />
        <meshBasicMaterial color={skyData.bottomColor} side={THREE.BackSide} transparent opacity={0.62} depthWrite={false} />
      </mesh>

      {isSunVisible && (
        <group position={sunPos}>
          <mesh>
            <sphereGeometry args={[14, 16, 16]} />
            <meshBasicMaterial color={skyData.sunColor} transparent opacity={timeOfDay === 'dawn' || timeOfDay === 'evening' ? 0.92 : 1} depthWrite={false} />
          </mesh>
          <mesh scale={[1.5, 1.5, 1.5]}>
            <sphereGeometry args={[14, 12, 12]} />
            <meshBasicMaterial color={timeOfDay === 'evening' ? '#FFAA66' : timeOfDay === 'dawn' ? '#FFCC88' : '#FFFFFF'} transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh scale={[2.6, 2.6, 2.6]}>
            <sphereGeometry args={[14, 8, 8]} />
            <meshBasicMaterial color={timeOfDay === 'evening' ? '#FF8855' : '#FFFFAA'} transparent opacity={0.07} depthWrite={false} />
          </mesh>
        </group>
      )}

      {isMoonVisible && (
        <group position={moonPos}>
          <mesh>
            <sphereGeometry args={[9, 16, 16]} />
            <meshStandardMaterial color={skyData.moonColor} emissive={skyData.moonColor} emissiveIntensity={0.22} roughness={0.88} metalness={0} />
          </mesh>
          <mesh scale={[1.35, 1.35, 1.35]}>
            <sphereGeometry args={[9, 12, 12]} />
            <meshBasicMaterial color="#8FA8D8" transparent opacity={0.10} depthWrite={false} />
          </mesh>
          <mesh position={[2, 1, 6.5]} scale={[0.28, 0.28, 0.28]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#BBBBBB" transparent opacity={0.45} depthWrite={false} />
          </mesh>
        </group>
      )}

      {weather.type !== 'rain' && (timeOfDay === 'day' || timeOfDay === 'morning' || timeOfDay === 'evening') && (
        <group>
          {Array.from({ length: settings.graphics === 'low' ? 4 : 8 }).map((_, i) => {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            const y = 120 + Math.random() * 60;
            const scale = 8 + Math.random() * 12;
            return (
              <group key={`cloud-${i}`} position={[x, y, z]} scale={scale}>
                <mesh position={[0, 0, 0]}>
                  <sphereGeometry args={[1, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.58} depthWrite={false} />
                </mesh>
                <mesh position={[0.8, 0.2, 0.3]}>
                  <sphereGeometry args={[0.7, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.48} depthWrite={false} />
                </mesh>
                <mesh position={[-0.6, 0.1, -0.2]}>
                  <sphereGeometry args={[0.6, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.48} depthWrite={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {isNight && (
        <group>
          {Array.from({ length: settings.graphics === 'low' ? 25 : 60 }).map((_, i) => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.45 + 0.12;
            const r = 400;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);
            const size = Math.random() * 0.5 + 0.2;
            return (
              <mesh key={`star-${i}`} position={[x, y, z]}>
                <sphereGeometry args={[size, 4, 4]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.35 + Math.random()*0.35} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}

      <group>
        <mesh position={[0, -10, -380]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[900, 250]} />
          <meshBasicMaterial color={isNight ? '#15152e' : '#7a8aaa'} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh position={[0, -10, 380]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[900, 250]} />
          <meshBasicMaterial color={isNight ? '#15152e' : '#7a8aaa'} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh position={[-380, -10, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
          <planeGeometry args={[900, 250]} />
          <meshBasicMaterial color={isNight ? '#15152e' : '#7a8aaa'} transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh position={[380, -10, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
          <planeGeometry args={[900, 250]} />
          <meshBasicMaterial color={isNight ? '#15152e' : '#7a8aaa'} transparent opacity={0.28} depthWrite={false} />
        </mesh>

        {Array.from({ length: settings.graphics === 'low' ? 8 : 14 }).map((_, i) => {
          const angle = (i / 14) * Math.PI * 2 + Math.random()*0.2;
          const dist = 350 + Math.random() * 40;
          const x = Math.cos(angle) * dist;
          const z = Math.sin(angle) * dist;
          const h = 8 + Math.random() * 10;
          const w = 8 + Math.random() * 10;
          return (
            <mesh key={`distant-${i}`} position={[x, h/2 -5, z]}>
              <boxGeometry args={[w, h, w]} />
              <meshBasicMaterial color={isNight ? '#0f0f1e' : '#2a2a3a'} transparent opacity={0.22} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}
