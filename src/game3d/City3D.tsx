'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Preload } from '@react-three/drei';
import * as THREE from 'three';
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
  const [physicsReady, setPhysicsReady] = useState(false);

  useEffect(() => {
    // Mark physics as ready after short delay to ensure Rapier loaded
    const t = setTimeout(() => setPhysicsReady(true), 100);
    return () => clearTimeout(t);
  }, []);

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
    </>
  );
}

function LoadingScreen({ progress, status }: { progress: number, status: string }) {
  return (
    <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 text-white p-4">
      <h1 className="text-4xl font-bold mb-4 tracking-wider">SURVIVAL CITY 3D</h1>
      <p className="text-gray-400 mb-2">Загрузка города... {Math.round(progress)}%</p>
      <p className="text-xs text-gray-500 mb-6">{status}</p>
      <div className="w-64 h-2 bg-[#222] rounded overflow-hidden">
        <div className="h-full bg-[#4a8a4a] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-8 max-w-md text-center">
        WASD - движение (не зависит от раскладки) | Shift - бег | Мышь - камера | E - действие<br/>
        I - инвентарь | C - персонаж | M - карта | Esc - меню | F3 - дебаг
      </p>
    </div>
  );
}

function CanvasWrapper({ onReady }: { onReady: () => void }) {
  const settings = useGameStore((s) => s.settings);
  const [webGLFailed, setWebGLFailed] = useState(false);

  const dpr = typeof window !== 'undefined' 
    ? (settings.graphics === 'low' ? 1 : settings.graphics === 'medium' ? Math.min(1.5, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1))
    : 1;

  // Mobile detection for auto LOW
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile && settings.graphics !== 'low') {
      useGameStore.getState().setGraphics('low');
    }
  }, []);

  if (webGLFailed) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white p-4">
        <div className="text-center">
          <h2 className="text-xl text-red-400 mb-2">WebGL ошибка</h2>
          <p className="text-sm text-gray-400">Не удалось создать WebGL контекст</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      shadows={settings.graphics !== 'low'}
      dpr={dpr}
      camera={{ fov: 65, near: 0.1, far: settings.graphics === 'low' ? 120 : settings.graphics === 'medium' ? 250 : 400 }}
      gl={{ 
        antialias: settings.graphics !== 'low', 
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl, scene }) => {
        try {
          gl.shadowMap.enabled = settings.graphics !== 'low';
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          
          // WebGL context lost handling
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('[WebGL] Context lost');
            (window as any).__webGLContextLost = true;
          });
          
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('[WebGL] Context restored');
            (window as any).__webGLContextLost = false;
          });

          // Mark as ready
          setTimeout(() => onReady(), 500);
        } catch (e) {
          console.error('[Canvas] onCreated error', e);
          setWebGLFailed(true);
        }
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
  );
}

export function City3D() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Инициализация...');
  const [canvasReady, setCanvasReady] = useState(false);
  const loadGame = useGameStore((s) => s.loadGame);
  const tick = useGameStore((s) => s.tick);

  // Loading simulation with real steps
  useEffect(() => {
    let p = 0;
    const steps = [
      'Загрузка движка...',
      'Инициализация физики...',
      'Загрузка города...',
      'Создание персонажа...',
      'Готово!',
    ];
    let stepIdx = 0;

    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 20 && stepIdx === 0) { stepIdx = 1; setStatus(steps[1]); }
      if (p >= 40 && stepIdx === 1) { stepIdx = 2; setStatus(steps[2]); }
      if (p >= 70 && stepIdx === 2) { stepIdx = 3; setStatus(steps[3]); }
      if (p >= 90 && stepIdx === 3) { stepIdx = 4; setStatus(steps[4]); }
      
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        // Only hide loading when canvas is ready too
        if (canvasReady) {
          setTimeout(() => setIsLoading(false), 300);
        } else {
          // Wait for canvas
          const check = setInterval(() => {
            if ((window as any).__canvasReady) {
              clearInterval(check);
              setIsLoading(false);
            }
          }, 100);
          // Fallback timeout 5s
          setTimeout(() => {
            clearInterval(check);
            setIsLoading(false);
          }, 5000);
        }
      }
      setProgress(p);
    }, 150);
    return () => clearInterval(interval);
  }, [canvasReady]);

  useEffect(() => {
    if (canvasReady && progress >= 100) {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [canvasReady, progress]);

  useEffect(() => {
    try {
      loadGame();
      setStatus('Сохранение загружено');
    } catch (e) {
      console.warn('[City3D] Load failed', e);
      setStatus('Новая игра');
    }
  }, [loadGame]);

  useEffect(() => {
    let lastTime = performance.now();
    let raf: number;
    
    const loop = (time: number) => {
      try {
        const delta = time - lastTime;
        lastTime = time;
        tick(delta);
      } catch (e) {
        console.error('[GameLoop] Tick error', e);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        useGameStore.getState().saveGame();
      } catch (e) {
        console.warn('[Autosave] Failed', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCanvasReady = () => {
    console.log('[City3D] Canvas ready');
    (window as any).__canvasReady = true;
    setCanvasReady(true);
  };

  return (
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden">
      {isLoading && <LoadingScreen progress={progress} status={status} />}
      
      <CanvasWrapper onReady={handleCanvasReady} />
    </div>
  );
}
