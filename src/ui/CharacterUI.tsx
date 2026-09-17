'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { JOBS } from '@/game/jobs/types';

export function CharacterUI() {
  const isOpen = useGameStore((s) => s.isCharacterOpen);
  const setOpen = useGameStore((s) => s.setCharacterOpen);
  const player = useGameStore((s) => s.player);
  const economy = useGameStore((s) => s.economy);
  const job = useGameStore((s) => s.job);
  const setJob = useGameStore((s) => s.setJob);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-[#1e1e1e] border border-[#444] rounded-lg w-[700px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col text-white">
        <div className="flex justify-between items-center p-4 border-b border-[#333]">
          <h2 className="text-lg font-bold">Персонаж [C]</h2>
          <button onClick={() => setOpen(false)} className="px-3 py-1 bg-[#333] hover:bg-[#444] rounded">Закрыть</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold mb-3 text-green-400">Потребности</h3>
            <div className="space-y-3">
              {Object.entries(player.stats).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{key}</span>
                    <span>{Math.round(val as number)}%</span>
                  </div>
                  <div className="h-2 bg-[#333] rounded overflow-hidden">
                    <div
                      className={`h-full ${
                        key === 'health' ? 'bg-red-500' :
                        key === 'hunger' ? 'bg-orange-500' :
                        key === 'thirst' ? 'bg-blue-500' :
                        key === 'energy' ? 'bg-yellow-500' :
                        key === 'hygiene' ? 'bg-cyan-500' :
                        key === 'mood' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-bold mt-6 mb-3 text-blue-400">Навыки</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(player.skills).map(([k, v]) => (
                <div key={k} className="flex justify-between bg-[#2a2a2a] px-2 py-1 rounded">
                  <span className="capitalize text-gray-400">{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 text-yellow-400">Экономика</h3>
            <div className="bg-[#2a2a2a] rounded p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Наличные:</span><span className="font-bold text-green-400">${economy.cash.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Банк:</span><span>${economy.bankBalance.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Долги:</span><span className={economy.debt > 0 ? 'text-red-400' : ''}>${economy.debt.toFixed(2)}</span></div>
            </div>

            <h3 className="font-bold mt-6 mb-3 text-orange-400">Работа</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Текущая: <span className="text-white font-bold">{JOBS[job.currentJob].nameRu}</span></div>
              {Object.values(JOBS).filter(j => j.id !== 'none').map((j) => (
                <div key={j.id} className="bg-[#2a2a2a] rounded p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{j.nameRu}</span>
                    <span className="text-green-400 text-sm">${j.salary}/смена</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{j.description}</div>
                  <div className="text-xs mt-1">⚡-{j.energyCost} 🍗-{j.hungerCost} 💧-{j.thirstCost}</div>
                  <button
                    onClick={() => {
                      if (job.currentJob === j.id) {
                        setJob('none');
                      } else {
                        setJob(j.id);
                      }
                    }}
                    className={`mt-2 w-full py-1 rounded text-xs ${job.currentJob === j.id ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'}`}
                  >
                    {job.currentJob === j.id ? 'Уволиться' : 'Устроиться'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
