'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HUD } from '@/ui/HUD';
import { InventoryUI } from '@/ui/InventoryUI';
import { CharacterUI } from '@/ui/CharacterUI';
import { Minimap } from '@/ui/Minimap';
import { Menu, DialogUI } from '@/ui/Menu';
import { ShopInteriorUI } from '@/game3d/buildings/ShopInterior';
import { useGameStore } from '@/store/gameStore';

// Dynamic import for 3D to avoid SSR
const City3D = dynamic(() => import('@/game3d/City3D').then(m => m.City3D), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">SURVIVAL CITY 3D</h1>
        <p className="text-gray-400">Загрузка 3D движка...</p>
      </div>
    </div>
  ),
});

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('Global error', e);
      setHasError(true);
      setErrorMsg(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка WebGL</h1>
          <p className="text-gray-400 mb-4">Не удалось запустить 3D режим. Проверьте поддержку WebGL в браузере.</p>
          <p className="text-xs text-red-400 mb-4">{errorMsg}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#333] rounded">Перезагрузить</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function HomePage() {
  const setInventoryOpen = useGameStore((s) => s.setInventoryOpen);
  const setCharacterOpen = useGameStore((s) => s.setCharacterOpen);
  const setMapOpen = useGameStore((s) => s.setMapOpen);
  const setMenuOpen = useGameStore((s) => s.setMenuOpen);
  const setDialog = useGameStore((s) => s.setDialog);
  const setInShopInterior = useGameStore((s) => s.setInShopInterior);
  const isInShopInterior = useGameStore((s) => s.isInShopInterior);
  const isInventoryOpen = useGameStore((s) => s.isInventoryOpen);
  const isCharacterOpen = useGameStore((s) => s.isCharacterOpen);
  const isMapOpen = useGameStore((s) => s.isMapOpen);
  const isMenuOpen = useGameStore((s) => s.isMenuOpen);
  const isDialogOpen = useGameStore((s) => s.isDialogOpen);

  // Global key handlers for UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (key === 'i') {
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setInventoryOpen(!state.isInventoryOpen);
          if (state.isInventoryOpen && document.pointerLockElement) document.exitPointerLock();
        }
      }
      if (key === 'c') {
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setCharacterOpen(!state.isCharacterOpen);
          if (state.isCharacterOpen && document.pointerLockElement) document.exitPointerLock();
        }
      }
      if (key === 'm') {
        e.preventDefault();
        const state = useGameStore.getState();
        if (!state.isInShopInterior && !state.isDialogOpen) {
          state.setMapOpen(!state.isMapOpen);
          if (state.isMapOpen && document.pointerLockElement) document.exitPointerLock();
        }
      }
      if (key === 'escape') {
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
          if (state.isMenuOpen) {
            // closing
          } else {
            if (document.pointerLockElement) document.exitPointerLock();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <main className="w-full h-screen relative overflow-hidden bg-black">
        <City3D />
        
        {/* UI Overlays */}
        {!isInShopInterior && <HUD />}
        {!isInShopInterior && <Minimap />}
        
        <InventoryUI />
        <CharacterUI />
        <Menu />
        <DialogUI />
        
        {isInShopInterior && <ShopInteriorUI />}

        {/* Pointer lock hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-2 h-2 bg-white/50 rounded-full" />
        </div>
      </main>
    </ErrorBoundary>
  );
}
