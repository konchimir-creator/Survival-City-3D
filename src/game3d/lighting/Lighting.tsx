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

      // Sun path: 5h rise, 12h zenith, 21h set, smooth
      // Map 5-21 to 0-PI, night keep low
      let sunProgress = 0;
      if (hour >= 5 && hour <= 21) {
        sunProgress = (hour - 5) / 16; // 0-1 day
      } else if (hour < 5) {
        sunProgress = -0.1 + (hour / 5) * 0.1; // just below horizon before dawn
      } else {
        sunProgress = 1 + ((hour - 21) / 3) * 0.1; // just below after sunset
      }
      let sunAngle = sunProgress * Math.PI; // 0-PI
      sunAngle = Math.max(-0.15, Math.min(Math.PI + 0.15, sunAngle));
      
      const sunDistance = 120;
      const sunHeight = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle) * sunDistance * 0.7;
      const sunY = Math.max(sunHeight * sunDistance, -20);
      const sunZ = Math.sin(sunAngle * 0.3) * 20;

      sunRef.current.position.set(sunX, sunY, sunZ);

      let intensity = 0;
      let color = new THREE.Color();
      let ambientIntensity = 0;
      let ambientColor = new THREE.Color();
      let hemiIntensity = 0.3;
      let hemiSkyColor = new THREE.Color();
      let hemiGroundColor = new THREE.Color();

      if (timeOfDay === 'dawn') {
        const t = (hour - 5) / 2; // 0-1
        intensity = THREE.MathUtils.lerp(0.25, 0.95, t);
        color.setHSL(0.07, 0.65, THREE.MathUtils.lerp(0.55, 0.75, t));
        ambientIntensity = THREE.MathUtils.lerp(0.3, 0.55, t);
        ambientColor.setHSL(0.08, 0.3, THREE.MathUtils.lerp(0.45, 0.6, t));
        hemiIntensity = THREE.MathUtils.lerp(0.25, 0.45, t);
        hemiSkyColor.setHSL(0.08, 0.5, 0.65);
        hemiGroundColor.setHSL(0.08, 0.25, 0.22);
      } else if (timeOfDay === 'morning') {
        const t = (hour - 7) / 4;
        intensity = THREE.MathUtils.lerp(0.95, 1.35, t);
        color.setHSL(THREE.MathUtils.lerp(0.08, 0.12, t), THREE.MathUtils.lerp(0.5, 0.15, t), THREE.MathUtils.lerp(0.75, 0.98, t));
        ambientIntensity = THREE.MathUtils.lerp(0.55, 0.68, t);
        ambientColor.setHSL(0.6, 0.12, 0.85);
        hemiIntensity = THREE.MathUtils.lerp(0.45, 0.58, t);
        hemiSkyColor.setHSL(0.58, 0.45, 0.82);
        hemiGroundColor.setHSL(0.15, 0.2, 0.42);
      } else if (timeOfDay === 'day') {
        intensity = 1.45;
        color.setHSL(0.12, 0.05, 1.0);
        ambientIntensity = 0.72;
        ambientColor.setHSL(0.6, 0.06, 0.93);
        hemiIntensity = 0.62;
        hemiSkyColor.setHSL(0.58, 0.5, 0.86);
        hemiGroundColor.setHSL(0.1, 0.25, 0.38);
      } else if (timeOfDay === 'evening') {
        const t = (hour - 17) / 4;
        intensity = THREE.MathUtils.lerp(1.35, 0.18, t);
        color.setHSL(THREE.MathUtils.lerp(0.12, 0.04, t), THREE.MathUtils.lerp(0.15, 0.85, t), THREE.MathUtils.lerp(0.98, 0.55, t));
        ambientIntensity = THREE.MathUtils.lerp(0.68, 0.32, t);
        ambientColor.setHSL(THREE.MathUtils.lerp(0.6, 0.05, t), THREE.MathUtils.lerp(0.08, 0.45, t), THREE.MathUtils.lerp(0.92, 0.48, t));
        hemiIntensity = THREE.MathUtils.lerp(0.58, 0.28, t);
        hemiSkyColor.setHSL(THREE.MathUtils.lerp(0.58, 0.05, t), THREE.MathUtils.lerp(0.5, 0.7, t), THREE.MathUtils.lerp(0.86, 0.52, t));
        hemiGroundColor.setHSL(0.05, 0.4, 0.26);
      } else {
        // night
        intensity = 0.08;
        color.setHSL(0.65, 0.25, 0.6);
        ambientIntensity = 0.18;
        ambientColor.setHSL(0.65, 0.35, 0.22);
        hemiIntensity = 0.12;
        hemiSkyColor.setHSL(0.65, 0.4, 0.12);
        hemiGroundColor.setHSL(0.65, 0.3, 0.06);
      }

      if (weather.type === 'cloudy') {
        intensity *= 0.62;
        ambientIntensity *= 0.88;
        hemiIntensity *= 0.82;
      } else if (weather.type === 'rain') {
        intensity *= 0.32;
        ambientIntensity *= 0.72;
        hemiIntensity *= 0.65;
      }

      sunRef.current.intensity = intensity;
      sunRef.current.color.copy(color);
      ambientRef.current.intensity = ambientIntensity;
      ambientRef.current.color.copy(ambientColor);
      hemiRef.current.intensity = hemiIntensity;
      (hemiRef.current as any).color.copy(hemiSkyColor);
      (hemiRef.current as any).groundColor.copy(hemiGroundColor);

      // Expose for other systems (night lights)
      (window as any).__sunPosition = { x: sunX, y: sunY, z: sunZ };
      (window as any).__isNight = timeOfDay === 'night';
      (window as any).__isDay = timeOfDay === 'day' || timeOfDay === 'morning';
      (window as any).__timeOfDay = timeOfDay;
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
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
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

  // Sky colors per time - safe procedural without heavy shader
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
      fogColor = new THREE.Color().setHSL(0.08, 0.4, THREE.MathUtils.lerp(0.5, 0.7, t)).getStyle();
      sunColor = '#FFAA44';
    } else if (timeOfDay === 'morning') {
      topColor = '#7AB8E6';
      bottomColor = '#D0E8FF';
      fogColor = '#8AB4DD';
      sunColor = '#FFE8AA';
    } else if (timeOfDay === 'day') {
      topColor = '#4A90D9';
      bottomColor = '#A0D0FF';
      fogColor = weather.type === 'rain' ? '#6a7a8a' : weather.type === 'cloudy' ? '#8a9aaa' : '#87aadd';
      sunColor = '#FFFFFF';
    } else if (timeOfDay === 'evening') {
      const t = (hour - 17) / 4;
      topColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.05, t), THREE.MathUtils.lerp(0.5, 0.8, t), THREE.MathUtils.lerp(0.65, 0.35, t)).getStyle();
      bottomColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.08, t), 0.9, THREE.MathUtils.lerp(0.7, 0.5, t)).getStyle();
      fogColor = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.55, 0.05, t), 0.5, THREE.MathUtils.lerp(0.6, 0.4, t)).getStyle();
      sunColor = '#FF6633';
    } else {
      // night
      topColor = '#0a0a1e';
      bottomColor = '#1a1a3a';
      fogColor = '#0a0a1a';
      moonColor = '#F0F0E0';
    }

    if (weather.type === 'rain') {
      fogColor = timeOfDay === 'night' ? '#1a1a2a' : '#5a6a7a';
    } else if (weather.type === 'cloudy' && timeOfDay === 'day') {
      fogColor = '#8a9aaa';
      topColor = '#6a8aaa';
    }

    return { topColor, bottomColor, fogColor, sunColor, moonColor };
  }, [time.minuteOfDay, weather.type, timeOfDay, hour]);

  // Sun position for visible sun mesh
  const sunPos = useMemo(() => {
    let progress = 0;
    if (hour >= 5 && hour <= 21) progress = (hour - 5) / 16;
    else if (hour < 5) progress = -0.1;
    else progress = 1.1;
    const angle = progress * Math.PI;
    const dist = 380;
    const x = Math.cos(angle) * dist * 0.7;
    const y = Math.sin(angle) * dist;
    const z = Math.sin(angle * 0.3) * 30;
    return new THREE.Vector3(x, Math.max(y, -50), z);
  }, [hour]);

  const moonPos = useMemo(() => {
    // Moon opposite sun
    let progress = 0;
    if (hour >= 5 && hour <= 21) progress = (hour - 5) / 16;
    else progress = hour < 5 ? (hour + 19) / 16 : (hour - 21) / 8;
    const angle = (progress + 0.5) * Math.PI; // opposite
    const dist = 350;
    const x = Math.cos(angle) * dist * 0.6;
    const y = Math.sin(angle) * dist;
    const z = -20;
    return new THREE.Vector3(x, y, z);
  }, [hour]);

  const isDay = timeOfDay === 'day' || timeOfDay === 'morning' || timeOfDay === 'dawn' || timeOfDay === 'evening';
  const isNight = timeOfDay === 'night';
  const isSunVisible = hour >= 5.5 && hour <= 20.5;
  const isMoonVisible = hour < 6 || hour > 19;

  // Fog distance based on graphics and weather
  const fogNear = settings.graphics === 'low' ? 40 : 60;
  const fogFar = settings.graphics === 'low' ? 180 : weather.type === 'rain' ? 180 : weather.type === 'cloudy' ? 280 : 380;

  return (
    <>
      <color attach="background" args={[skyData.fogColor]} />
      <fog attach="fog" args={[skyData.fogColor, fogNear, fogFar]} />

      {/* Sky dome - simple gradient via two spheres, no heavy shader */}
      <mesh scale={[390, 390, 390]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={skyData.topColor} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={[385, 385, 385]}>
        <sphereGeometry args={[1, 16, 16, 0, Math.PI*2, 0, Math.PI*0.52]} />
        <meshBasicMaterial color={skyData.bottomColor} side={THREE.BackSide} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* Visible Sun - day */}
      {isSunVisible && (
        <group position={sunPos}>
          <mesh>
            <sphereGeometry args={[12, 16, 16]} />
            <meshBasicMaterial color={skyData.sunColor} transparent opacity={timeOfDay === 'dawn' || timeOfDay === 'evening' ? 0.9 : 1} />
          </mesh>
          {/* Sun glow */}
          <mesh scale={[1.6, 1.6, 1.6]}>
            <sphereGeometry args={[12, 12, 12]} />
            <meshBasicMaterial color={timeOfDay === 'evening' ? '#FFAA66' : timeOfDay === 'dawn' ? '#FFCC88' : '#FFFFFF'} transparent opacity={0.25} depthWrite={false} />
          </mesh>
          {/* Sun light halo */}
          <mesh scale={[2.8, 2.8, 2.8]}>
            <sphereGeometry args={[12, 8, 8]} />
            <meshBasicMaterial color={timeOfDay === 'evening' ? '#FF8855' : '#FFFFAA'} transparent opacity={0.08} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* Visible Moon - night */}
      {isMoonVisible && (
        <group position={moonPos}>
          <mesh>
            <sphereGeometry args={[8, 16, 16]} />
            <meshStandardMaterial color={skyData.moonColor} emissive={skyData.moonColor} emissiveIntensity={0.25} roughness={0.9} metalness={0} />
          </mesh>
          {/* Moon glow */}
          <mesh scale={[1.4, 1.4, 1.4]}>
            <sphereGeometry args={[8, 12, 12]} />
            <meshBasicMaterial color="#CCCCFF" transparent opacity={0.12} depthWrite={false} />
          </mesh>
          {/* Craters - simple dark spots */}
          <mesh position={[2, 1, 6]} scale={[0.3, 0.3, 0.3]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#BBBBBB" transparent opacity={0.5} />
          </mesh>
          <mesh position={[-1.5, -2, 6.5]} scale={[0.2, 0.2, 0.2]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#BBBBBB" transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* Clouds - simple low-poly, not heavy */}
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
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} depthWrite={false} />
                </mesh>
                <mesh position={[0.8, 0.2, 0.3]}>
                  <sphereGeometry args={[0.7, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} depthWrite={false} />
                </mesh>
                <mesh position={[-0.6, 0.1, -0.2]}>
                  <sphereGeometry args={[0.6, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} depthWrite={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Stars - night only */}
      {isNight && (
        <group>
          {Array.from({ length: settings.graphics === 'low' ? 30 : 80 }).map((_, i) => {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5 + 0.1;
            const r = 380;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.cos(phi);
            const z = r * Math.sin(phi) * Math.sin(theta);
            const size = Math.random() * 0.8 + 0.3;
            return (
              <mesh key={`star-${i}`} position={[x, y, z]}>
                <sphereGeometry args={[size, 4, 4]} />
                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6 + Math.random()*0.4} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Distant horizon - subtle low hills, not huge gray ghost houses */}
      <group>
        {/* Low foggy hills instead of gray houses */}
        <mesh position={[0, -10, -350]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[800, 200]} />
          <meshBasicMaterial color={isNight ? '#0a0a1a' : '#5a6a7a'} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh position={[0, -10, 350]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[800, 200]} />
          <meshBasicMaterial color={isNight ? '#0a0a1a' : '#5a6a7a'} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh position={[-350, -10, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
          <planeGeometry args={[800, 200]} />
          <meshBasicMaterial color={isNight ? '#0a0a1a' : '#5a6a7a'} transparent opacity={0.3} depthWrite={false} />
        </mesh>
        <mesh position={[350, -10, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]}>
          <planeGeometry args={[800, 200]} />
          <meshBasicMaterial color={isNight ? '#0a0a1a' : '#5a6a7a'} transparent opacity={0.3} depthWrite={false} />
        </mesh>

        {/* Very distant subtle city silhouette - low, dark, not huge gray */}
        {Array.from({ length: settings.graphics === 'low' ? 8 : 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2 + Math.random()*0.2;
          const dist = 320 + Math.random() * 40;
          const x = Math.cos(angle) * dist;
          const z = Math.sin(angle) * dist;
          const h = 8 + Math.random() * 12; // low, not 20-60 huge
          const w = 8 + Math.random() * 12;
          return (
            <mesh key={`distant-${i}`} position={[x, h/2 -5, z]}>
              <boxGeometry args={[w, h, w]} />
              <meshBasicMaterial color={isNight ? '#080810' : '#2a2a3a'} transparent opacity={0.25} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}
