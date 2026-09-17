'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Preload, Stats } from '@react-three/drei';
import { Player } from './player/Player';
import { CameraController } from './camera/CameraController';
import { Ground } from './world/Ground';
import { Roads } from './world/Roads';
import { Buildings } from './buildings/Buildings';
import { CityDetails } from './world/CityDetails';
import { Lighting, SkyAndFog } from './lighting/Lighting';
import { Weather } from './weather/Weather';
import { NPCs, StaticNPCs } from './npc/NPCs';
import { Vehicles } from './vehicles/Vehicles';
import { InteractionSystem } from './interaction/InteractionSystem';
import { ShopInterior } from './buildings/ShopInterior';
import { useGameStore } from '@/store/gameStore';

function SceneContent() {
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  const settings = useGameStore((s) => s.settings);

  if (isInShopInterior) {
    return (
      <>
        <Lighting />
        <SkyAndFog />
        <ShopInterior />
      </>
    );
  }

  return (
    <>
      <Lighting />
      <SkyAndFog />
      <Ground />
      <Roads />
      <Buildings />
      <CityDetails />
      <StaticNPCs />
      <NPCs />
      <Vehicles />
      <Player />
      <InteractionSystem />
      <Weather />
      {settings.showFPS && <Stats />}
    </>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 text-white">
      <h1 className="text-4xl font-bold mb-4 tracking-wider">SURVIVAL CITY 3D</h1>
      <p className="text-gray-400 mb-8">Загрузка города... {Math.round(progress)}%</p>
      <div className="w-64 h-2 bg-[#222] rounded overflow-hidden">
        <div className="h-full bg-[#4a8a4a] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-8 max-w-md text-center">
        WAD - движение, Shift - бег, Мышь - камера, E - взаимодействие, I - инвентарь, C - персонаж, M - карта, Esc - меню
      </p>
    </div>
  );
}

export function City3D() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const settings = useGameStore((s) => s.settings);
  const loadGame = useGameStore((s) => s.loadGame);
  const tick = useGameStore((s) => s.tick);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);

  // Simulate loading
  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setIsLoading(false), 500);
      }
      setProgress(p);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Load save on mount
  useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Game loop tick
  useEffect(() => {
    let lastTime = performance.now();
    let raf: number;
    
    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      tick(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  // Autosave every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      useGameStore.getState().saveGame();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const dpr = settings.graphics === 'low' ? 1 : settings.graphics === 'medium' ? Math.min(1.5, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {isLoading && <LoadingScreen progress={progress} />}
      
      <Canvas
        shadows={settings.graphics !== 'low'}
        dpr={dpr}
        camera={{ fov: 75, near: 0.1, far: settings.graphics === 'low' ? 150 : settings.graphics === 'medium' ? 250 : 400 }}
        gl={{ antialias: settings.graphics !== 'low', powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = settings.graphics !== 'low';
          gl.shadowMap.type = 2; // PCFSoft
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]} timeStep="vary">
            <SceneContent />
          </Physics>
          <Preload all />
        </Suspense>
        <CameraController />
      </Canvas>

      {/* WebGL Error Boundary is handled by parent */}
    </div>
  );
}
