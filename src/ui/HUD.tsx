'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, getTimeOfDay } from '@/game/time/types';
import { JOBS } from '@/game/jobs/types';

export function HUD() {
  const player = useGameStore((s) => s.player);
  const economy = useGameStore((s) => s.economy);
  const time = useGameStore((s) => s.time);
  const weather = useGameStore((s) => s.weather);
  const currentInteraction = useGameStore((s) => s.currentInteraction);
  const job = useGameStore((s) => s.job);
  const inventory = useGameStore((s) => s.inventory);
  const settings = useGameStore((s) => s.settings);

  const timeOfDay = getTimeOfDay(time.minuteOfDay);

  return (
    <>
      {/* Top left - needs */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-2 min-w-[180px] border border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <span>❤️</span>
            <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${player.stats.health}%` }} />
            </div>
            <span className="text-white text-xs w-8">{Math.round(player.stats.health)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>🍗</span>
            <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${player.stats.hunger}%` }} />
            </div>
            <span className="text-white text-xs w-8">{Math.round(player.stats.hunger)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>💧</span>
            <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${player.stats.thirst}%` }} />
            </div>
            <span className="text-white text-xs w-8">{Math.round(player.stats.thirst)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>⚡</span>
            <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-yellow-500 transition-all" style={{ width: `${player.stats.energy}%` }} />
            </div>
            <span className="text-white text-xs w-8">{Math.round(player.stats.energy)}</span>
          </div>
        </div>

        {/* Job progress */}
        {job.isWorking && (
          <div className="mt-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10 min-w-[180px]">
            <div className="text-white text-xs font-bold mb-1">Работа: {JOBS[job.currentJob].nameRu}</div>
            <div className="h-2 bg-gray-700 rounded overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${job.shiftProgress}%` }} />
            </div>
            {job.currentJob === 'warehouse_loader' && (
              <div className="text-gray-300 text-xs mt-1">
                Коробки: {job.boxesCarried}/{job.boxesTotal}
                {(window as any).__hasBox ? ' (несёшь коробку)' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top center - money and time */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-6 border border-white/10">
          <div className="flex items-center gap-2 text-white">
            <span className="text-green-400">💵</span>
            <span className="font-bold">${economy.cash.toFixed(2)}</span>
            {economy.bankBalance > 0 && (
              <span className="text-xs text-gray-400">Bank: ${economy.bankBalance.toFixed(2)}</span>
            )}
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2 text-white text-sm">
            <span>🕒</span>
            <span className="font-mono">{formatTime(time.minuteOfDay)}</span>
            <span className="text-xs text-gray-400">Day {time.day}</span>
            <span className="text-xs capitalize text-gray-300">{timeOfDay}</span>
            <span className="text-xs">
              {weather.type === 'clear' ? '☀️' : weather.type === 'cloudy' ? '☁️' : '🌧️'}
            </span>
          </div>
        </div>
      </div>

      {/* Top right - quick actions */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => useGameStore.getState().setCharacterOpen(true)}
          className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:bg-black/80 transition-colors pointer-events-auto"
        >
          Профиль [C]
        </button>
        <button
          onClick={() => useGameStore.getState().setInventoryOpen(true)}
          className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:bg-black/80 transition-colors pointer-events-auto relative"
        >
          Рюкзак [I]
          {inventory.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {inventory.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
        <button
          onClick={() => useGameStore.getState().setMapOpen(true)}
          className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm hover:bg-black/80 transition-colors pointer-events-auto"
        >
          Карта [M]
        </button>
      </div>

      {/* Bottom center - interaction prompt */}
      {currentInteraction && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20 flex items-center gap-3 animate-pulse">
            <span className="bg-white text-black px-2 py-1 rounded font-bold text-sm">E</span>
            <span className="text-white font-medium">{currentInteraction.labelRu}</span>
          </div>
        </div>
      )}

      {/* Bottom left - controls hint */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-400 border border-white/5">
          <div>WASD - движение | Shift - бег | Мышь - камера | Колесо - зум</div>
          <div>E - действие | Esc - меню | Клик - захват мыши</div>
        </div>
      </div>

      {/* Debug - FPS and position */}
      {settings.showFPS && (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs text-white border border-white/10 pointer-events-none">
          <div>Pos: {player.position[0].toFixed(1)}, {player.position[2].toFixed(1)}</div>
          <div>Rot: {(player.rotation * 180 / Math.PI).toFixed(0)}°</div>
        </div>
      )}
    </>
  );
}
