'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';

export function InventoryUI() {
  const isOpen = useGameStore((s) => s.isInventoryOpen);
  const setOpen = useGameStore((s) => s.setInventoryOpen);
  const inventory = useGameStore((s) => s.inventory);
  const equipment = useGameStore((s) => s.equipment);
  const handleUseItem = useGameStore((s) => s.useItem);
  const dropItem = useGameStore((s) => s.dropItem);
  const getWeight = useGameStore((s) => s.getInventoryWeight);
  const getMaxWeight = useGameStore((s) => s.getMaxWeight);

  if (!isOpen) return null;

  const weight = getWeight();
  const maxWeight = getMaxWeight();

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-[#1e1e1e] border border-[#444] rounded-lg w-[600px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col text-white">
        <div className="flex justify-between items-center p-4 border-b border-[#333]">
          <h2 className="text-lg font-bold">Инвентарь [I]</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{weight.toFixed(1)}/{maxWeight} кг</span>
            <button onClick={() => setOpen(false)} className="px-3 py-1 bg-[#333] hover:bg-[#444] rounded">Закрыть</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {inventory.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-4xl mb-4">🎒</div>
              <div>Рюкзак пуст</div>
              <div className="text-xs mt-2">Найди еду в магазине или на улице</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {inventory.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-[#2a2a2a] rounded hover:bg-[#333]">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <span>{item.nameRu}</span>
                      <span className="text-xs bg-[#444] px-2 py-0.5 rounded">x{item.quantity}</span>
                      <span className="text-xs text-gray-500">{item.weight * item.quantity}кг</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                    <div className="text-xs mt-1 flex gap-2">
                      {item.hunger ? <span className="text-orange-400">🍗+{item.hunger}</span> : null}
                      {item.thirst ? <span className="text-blue-400">💧+{item.thirst}</span> : null}
                      {item.health ? <span className="text-red-400">❤️+{item.health}</span> : null}
                      {item.energy ? <span className="text-yellow-400">⚡+{item.energy}</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseItem(item.id)}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm"
                    >
                      Использовать
                    </button>
                    <button
                      onClick={() => dropItem(item.id)}
                      className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-sm"
                    >
                      Выбросить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#333] bg-[#222]">
          <div className="text-xs text-gray-400">Экипировка:</div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="bg-[#333] px-2 py-1 rounded">🧥 {equipment.top}</span>
            <span className="bg-[#333] px-2 py-1 rounded">👖 {equipment.bottom}</span>
            <span className="bg-[#333] px-2 py-1 rounded">👟 {equipment.shoes}</span>
            <span className="bg-[#333] px-2 py-1 rounded">🎒 {equipment.backpack}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
