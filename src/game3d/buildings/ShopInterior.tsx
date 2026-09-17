'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { SHOP_ITEMS } from '@/game/economy/types';

export function ShopInterior() {
  const economy = useGameStore((s) => s.economy);
  const addItem = useGameStore((s) => s.addItem);
  const spendCash = useGameStore((s) => s.spendCash);
  const setInShopInterior = useGameStore((s) => s.setInShopInterior);

  const handleBuy = (id: string, price: number) => {
    if (economy.cash >= price) {
      if (spendCash(price)) {
        addItem(id, 1);
      }
    }
  };

  // 3D interior is rendered in City3D when isInShopInterior true
  // This component is for the 3D meshes
  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#e0d0b0" roughness={0.8} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 2, -6]} receiveShadow>
        <boxGeometry args={[12, 4, 0.2]} />
        <meshStandardMaterial color="#f0e8d0" />
      </mesh>
      <mesh position={[0, 2, 6]} receiveShadow>
        <boxGeometry args={[12, 4, 0.2]} />
        <meshStandardMaterial color="#f0e8d0" />
      </mesh>
      <mesh position={[-6, 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4, 12]} />
        <meshStandardMaterial color="#f0e8d0" />
      </mesh>
      <mesh position={[6, 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, 4, 12]} />
        <meshStandardMaterial color="#f0e8d0" />
      </mesh>

      {/* Shelves */}
      {[-4, -2, 2, 4].map((x) => (
        <group key={`shelf-${x}`} position={[x, 0, -4]}>
          <mesh castShadow position={[0, 1, 0]}>
            <boxGeometry args={[1.5, 2, 0.6]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.8} />
          </mesh>
          {/* Products on shelves */}
          {Array.from({ length: 3 }).map((_, i) => (
            <mesh key={`prod-${i}`} position={[0, 0.5 + i*0.5, 0.2]} castShadow>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color={`hsl(${i*60}, 70%, 50%)`} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Fridges */}
      <group position={[5, 0, -2]}>
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[0.8, 2, 1.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0.41, 1, 0]}>
          <planeGeometry args={[0.1, 1.5]} />
          <meshStandardMaterial color="#88ccff" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Counter */}
      <mesh castShadow position={[0, 0.8, 4]} receiveShadow>
        <boxGeometry args={[4, 1.6, 0.8]} />
        <meshStandardMaterial color="#6a4a3a" roughness={0.8} />
      </mesh>

      {/* Cashier NPC placeholder */}
      <group position={[0, 0, 4.5]}>
        <mesh castShadow position={[0, 1, 0]}>
          <capsuleGeometry args={[0.25, 1, 4, 8]} />
          <meshStandardMaterial color="#4a6a8a" />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#e8c4a8" />
        </mesh>
      </group>

      {/* Lighting */}
      <pointLight position={[0, 3, 0]} intensity={20} distance={15} color="#ffffff" />
      <pointLight position={[-3, 3, -3]} intensity={10} distance={10} />
      <pointLight position={[3, 3, -3]} intensity={10} distance={10} />

      {/* Door to exit */}
      <mesh position={[0, 1, 6.1]}>
        <planeGeometry args={[1.2, 2]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
    </group>
  );
}

export function ShopInteriorUI() {
  const economy = useGameStore((s) => s.economy);
  const addItem = useGameStore((s) => s.addItem);
  const spendCash = useGameStore((s) => s.spendCash);
  const setInShopInterior = useGameStore((s) => s.setInShopInterior);

  return (
    <div className="absolute inset-0 pointer-events-auto bg-black/40 flex">
      <div className="m-auto bg-[#1a1a1a] border border-[#444] rounded-lg p-6 w-[500px] max-w-[90vw] text-white shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Магазин на углу</h2>
          <button
            onClick={() => setInShopInterior(false)}
            className="px-3 py-1 bg-[#333] hover:bg-[#444] rounded"
          >
            Выйти [E]
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-[#222] rounded flex justify-between">
          <span>Деньги:</span>
          <span className="font-bold text-green-400">${economy.cash.toFixed(2)}</span>
        </div>

        <div className="grid gap-2 max-h-[400px] overflow-y-auto">
          {SHOP_ITEMS.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-[#2a2a2a] rounded hover:bg-[#333] transition-colors">
              <div>
                <div className="font-semibold">{item.nameRu}</div>
                <div className="text-xs text-gray-400">{item.description}</div>
                <div className="text-xs mt-1">
                  {item.hunger ? <span className="text-orange-400 mr-2">🍗+{item.hunger}</span> : null}
                  { (item as any).thirst ? <span className="text-blue-400 mr-2">💧+{(item as any).thirst}</span> : null}
                  {item.health ? <span className="text-red-400 mr-2">❤️+{item.health}</span> : null}
                  {(item as any).energy ? <span className="text-yellow-400">⚡+{(item as any).energy}</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">${item.price}</span>
                <button
                  onClick={() => {
                    if (economy.cash >= item.price) {
                      if (spendCash(item.price)) {
                        addItem(item.id, 1);
                      }
                    }
                  }}
                  disabled={economy.cash < item.price}
                  className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:opacity-50 rounded text-sm"
                >
                  Купить
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Нажми E или кнопку Выйти чтобы покинуть магазин. Кликни в 3D мир чтобы вернуть управление мышью.
        </div>
      </div>
    </div>
  );
}
