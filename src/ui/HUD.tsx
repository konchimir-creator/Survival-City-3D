'use client';
import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatTime, getTimeOfDay } from '@/game/time/types';
import { JOBS } from '@/game/jobs/types';

function DebugOverlay() {
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const player = useGameStore((s) => s.player);

  useEffect(() => {
    const interval = setInterval(() => {
      const input = (window as any).__playerInput;
      const camDebug = (window as any).__cameraDebug;
      const camPos = (window as any).__cameraPosition;
      const camTarget = (window as any).__cameraTarget;
      const show = (window as any).__showDebug;
      const savedValid = (window as any).__savedPosValid;
      
      setShowDebug(!!show);
      if (input || camDebug) {
        setDebugData({
          input,
          camDebug,
          camPos: camPos ? { x: camPos.x.toFixed(2), y: camPos.y.toFixed(2), z: camPos.z.toFixed(2) } : null,
          camTarget: camTarget ? { x: camTarget.x.toFixed(2), y: camTarget.y.toFixed(2), z: camTarget.z.toFixed(2) } : null,
          playerPos: player.position.map((v: number) => v.toFixed(2)),
          playerRot: (player.rotation * 180 / Math.PI).toFixed(1),
          savedValid,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player.position, player.rotation]);

  if (!showDebug || !debugData) return null;

  return (
    <div className="absolute top-20 left-4 bg-black/85 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/20 pointer-events-none font-mono min-w-[340px] z-50 max-h-[80vh] overflow-auto">
      <div className="font-bold mb-2 text-yellow-400">DEBUG [F3] | R=Reset Camera</div>
      <div className="grid grid-cols-2 gap-1">
        <div>W: {debugData.input?.W ? 'true' : 'false'}</div>
        <div>A: {debugData.input?.A ? 'true' : 'false'}</div>
        <div>S: {debugData.input?.S ? 'true' : 'false'}</div>
        <div>D: {debugData.input?.D ? 'true' : 'false'}</div>
        <div>Shift: {debugData.input?.Shift ? 'true' : 'false'}</div>
        <div>Grounded: {debugData.input?.grounded ? 'true' : 'false'}</div>
        <div>JoyX: {debugData.input?.JoyX?.toFixed(2) || '0'}</div>
        <div>JoyY: {debugData.input?.JoyY?.toFixed(2) || '0'}</div>
      </div>
      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="text-green-400 font-bold">Player:</div>
        <div>Pos: {debugData.playerPos[0]}, {debugData.playerPos[1]}, {debugData.playerPos[2]}</div>
        <div>Vel: {debugData.input?.vel ? `${debugData.input.vel[0].toFixed(2)},${debugData.input.vel[1].toFixed(2)},${debugData.input.vel[2].toFixed(2)}` : 'none'}</div>
        <div>Rot: {debugData.playerRot}°</div>
        <div>SavedValid: {debugData.savedValid === undefined ? 'new' : debugData.savedValid ? 'true' : 'false'}</div>
      </div>
      {debugData.camDebug && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="text-blue-400 font-bold">Camera:</div>
          <div>Pos: {debugData.camDebug.cameraPos}</div>
          <div>Target: {debugData.camDebug.targetPos}</div>
          <div>Yaw: {debugData.camDebug.yaw} Pitch: {debugData.camDebug.pitch}</div>
          <div>Dist: desired {debugData.camDebug.desiredDistance} cur {debugData.camDebug.currentDistance} final {debugData.camDebug.finalDistance}</div>
          <div>Collision: {debugData.camDebug.collisionEnabled ? 'ON' : 'OFF'} Hit: {debugData.camDebug.collisionHit ? 'YES' : 'NO'}</div>
          <div>HitDist: {debugData.camDebug.hitDistance} | {debugData.camDebug.hitInfo}</div>
          <div>Initialized: {debugData.camDebug.initialized ? 'true' : 'false'}</div>
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-400">
        SAFE_SPAWN [15,2,15] - open area 5m from walls/trees<br/>
        Camera: target player+1.4m, offset [0,2.2,5] yaw/pitch, FOV 62<br/>
        Collision excludes player (0.5m offset, ignore toi&lt;0.5)<br/>
        MIN_DIST 1.5m, pitch -0.15..0.65, dist 2.5..7
      </div>
    </div>
  );
}

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
      {/* Top left - needs - pointer-events-none so it doesn't block WASD */}
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
          <div className="mt-3 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/10 min-w-[180px] pointer-events-none">
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

      {/* Top center - money and time - pointer-events-none */}
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

      {/* Top right - quick actions - pointer-events-auto only for buttons */}
      <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20 flex items-center gap-3 animate-pulse shadow-xl">
            <span className="bg-white text-black px-2.5 py-1 rounded font-bold text-sm">E</span>
            <span className="text-white font-medium">{currentInteraction.labelRu}</span>
          </div>
        </div>
      )}

      {/* Crosshair - subtle dot center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-1.5 h-1.5 bg-white/70 rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
      </div>

      {/* Bottom left - controls hint */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-400 border border-white/5">
          <div>WASD - движение (не зависит от раскладки) | Shift - бег | Мышь - камера | Колесо - зум | F3 - дебаг</div>
          <div>E - действие | Esc - меню | Клик - захват мыши | Кроссовки влияют на скорость</div>
        </div>
      </div>

      {/* Debug overlay */}
      <DebugOverlay />

      {/* FPS and position - only if enabled */}
      {settings.showFPS && (
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs text-white border border-white/10 pointer-events-none">
          <div>Pos: {player.position[0].toFixed(1)}, {player.position[2].toFixed(1)}</div>
          <div>Rot: {(player.rotation * 180 / Math.PI).toFixed(0)}°</div>
        </div>
      )}
    </>
  );
}
