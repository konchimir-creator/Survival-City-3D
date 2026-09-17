'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HUD } from '@/ui/HUD';
import { InventoryUI } from '@/ui/InventoryUI';
import { CharacterUI } from '@/ui/CharacterUI';
import { Minimap } from '@/ui/Minimap';
import { Menu, DialogUI } from '@/ui/Menu';
import { ShopInteriorUI } from '@/game3d/buildings/ShopInterior';
import { MobileControls } from '@/ui/MobileControls';
import { ErrorBoundary, WebGLCheck } from '@/components/ErrorBoundary';
import { useGameStore } from '@/store/gameStore';

// Dynamic import for 3D to avoid SSR - critical for Next.js
const City3D = dynamic(() => import('@/game3d/City3D').then(m => m.City3D), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">SURVIVAL CITY 3D</h1>
        <p className="text-gray-400">Загрузка 3D движка...</p>
        <p className="text-xs text-gray-600 mt-2">Инициализация Three.js и Rapier...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);

  useEffect(() => {
    setMounted(true);
    
    // Global error handler for uncaught errors - prevent black screen
    const handleError = (e: ErrorEvent) => {
      console.error('[Global] Uncaught error:', e.error || e.message);
      (window as any).__lastError = {
        message: e.message,
        error: e.error,
        timestamp: Date.now(),
      };
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error('[Global] Unhandled rejection:', e.reason);
      (window as any).__lastRejection = {
        reason: e.reason,
        timestamp: Date.now(),
      };
      // Prevent default to avoid console spam, but log
      // e.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Mobile viewport handling
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  // Global key handlers for UI - using event.code for layout independence
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Use code for I,C,M to be layout independent too
      const code = e.code;
      const key = e.key.toLowerCase();
      
      if (code === 'KeyI' || key === 'i') {
        // Don't trigger if typing
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setInventoryOpen(!state.isInventoryOpen);
          if (state.isInventoryOpen && document.pointerLockElement) {
            try { document.exitPointerLock(); } catch {}
          }
        }
      }
      if (code === 'KeyC' || key === 'c') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setCharacterOpen(!state.isCharacterOpen);
          if (state.isCharacterOpen && document.pointerLockElement) {
            try { document.exitPointerLock(); } catch {}
          }
        }
      }
      if (code === 'KeyM' || key === 'm') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setMapOpen(!state.isMapOpen);
          if (state.isMapOpen && document.pointerLockElement) {
            try { document.exitPointerLock(); } catch {}
          }
        }
      }
      if (code === 'Escape' || key === 'escape') {
        const state = useGameStore.getState();
        if (state.isDialogOpen) {
          state.setDialog(null);
        } else if (state.isInShopInterior) {
          state.setInShopInterior(false);
        } else if (state.isInventoryOpen) {
          state.setInventoryOpen(false);
        } else if (state.isCharacterOpen) {
          state.setCharacterOpen(false);
        } else if (state.isMapOpen) {
          state.setMapOpen(false);
        } else {
          state.setMenuOpen(!state.isMenuOpen);
          if (!state.isMenuOpen && document.pointerLockElement) {
            try { document.exitPointerLock(); } catch {}
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full h-[100dvh] bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">SURVIVAL CITY 3D</h1>
          <p className="text-gray-400">Инициализация...</p>
        </div>
      </div>
    );
  }

  return (
    <WebGLCheck>
      <ErrorBoundary>
        <main className="w-full h-[100dvh] relative overflow-hidden bg-black" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <City3D />
          
          {/* UI Overlays - pointer-events-none except interactive */}
          {!isInShopInterior && <HUD />}
          {!isInShopInterior && <Minimap />}
          
          <InventoryUI />
          <CharacterUI />
          <Menu />
          <DialogUI />
          
          {isInShopInterior && <ShopInteriorUI />}

          {/* Mobile controls */}
          <MobileControls />

          {/* Crosshair - only desktop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
          </div>

          {/* WebGL context lost indicator */}
          <div id="webgl-lost" className="hidden absolute inset-0 bg-black/90 flex items-center justify-center z-[100] text-white">
            <div className="text-center p-6">
              <h2 className="text-xl mb-2">Графический контекст потерян</h2>
              <p className="text-sm text-gray-400 mb-4">Восстанавливаем...</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#333] rounded">Перезагрузить</button>
            </div>
          </div>
        </main>
      </ErrorBoundary>
    </WebGLCheck>
  );
}
