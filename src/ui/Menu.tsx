'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';

export function Menu() {
  const isOpen = useGameStore((s) => s.isMenuOpen);
  const setOpen = useGameStore((s) => s.setMenuOpen);
  const settings = useGameStore((s) => s.settings);
  const setGraphics = useGameStore((s) => s.setGraphics);
  const saveGame = useGameStore((s) => s.saveGame);
  const newGame = useGameStore((s) => s.newGame);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-[#1e1e1e] border border-[#444] rounded-lg w-[500px] max-w-[90vw] text-white overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Меню [Esc]</h2>
          
          <div className="space-y-4">
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 bg-green-700 hover:bg-green-600 rounded font-medium"
            >
              Продолжить
            </button>
            
            <button
              onClick={() => {
                saveGame();
                alert('Игра сохранена!');
              }}
              className="w-full py-3 bg-[#333] hover:bg-[#444] rounded"
            >
              Сохранить игру
            </button>

            <div className="bg-[#2a2a2a] rounded p-4">
              <h3 className="font-bold mb-3">Графика</h3>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setGraphics(level)}
                    className={`flex-1 py-2 rounded text-sm capitalize ${
                      settings.graphics === level ? 'bg-green-700' : 'bg-[#444] hover:bg-[#555]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {settings.graphics === 'low' && 'Минимум теней, меньше NPC, дальность'}
                {settings.graphics === 'medium' && 'Баланс качества и производительности'}
                {settings.graphics === 'high' && 'Максимум качества, тени, NPC'}
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded p-4">
              <h3 className="font-bold mb-2">Управление</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <div>WASD - движение</div>
                <div>Shift - бег</div>
                <div>Мышь - камера (клик для захвата)</div>
                <div>Колесо - зум</div>
                <div>E - взаимодействие</div>
                <div>I - инвентарь, C - персонаж, M - карта</div>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
                  newGame();
                  setOpen(false);
                }
              }}
              className="w-full py-2 bg-red-900/50 hover:bg-red-800/50 rounded text-sm text-red-300"
            >
              Новая игра
            </button>

            <div className="text-xs text-gray-500 text-center pt-4 border-t border-[#333]">
              Survival City 3D - Vertical Slice v0.1<br/>
              Временная модель персонажа (placeholder) - финальная GLB модель в разработке
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DialogUI() {
  const isOpen = useGameStore((s) => s.isDialogOpen);
  const data = useGameStore((s) => s.dialogData);
  const setDialog = useGameStore((s) => s.setDialog);

  if (!isOpen || !data) return null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end justify-center pb-20 p-4 pointer-events-auto">
      <div className="bg-[#1e1e1e] border border-[#444] rounded-lg w-[600px] max-w-[90vw] text-white">
        <div className="p-4">
          <h3 className="font-bold text-green-400 mb-2">{data.name}</h3>
          <p className="text-gray-200">{data.text}</p>
          <button
            onClick={() => setDialog(null)}
            className="mt-4 px-4 py-2 bg-[#333] hover:bg-[#444] rounded text-sm"
          >
            Продолжить [E / Esc]
          </button>
        </div>
      </div>
    </div>
  );
}
