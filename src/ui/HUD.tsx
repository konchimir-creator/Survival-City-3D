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
      const playerMounted = (window as any).__playerMounted;
      const bodyExists = (window as any).__playerBodyExists;
      const playerVisible = (window as any).__playerVisible;
      const playerSpawn = (window as any).__playerSpawn;
      const playerTransform = (window as any).__playerTransformRef?.current;
      const cameraCollision = (window as any).__cameraCollisionEnabled;
      const playerRenderer = (window as any).__playerRenderer || 'PROCEDURAL';
      const playerAnimation = (window as any).__playerAnimation || 'idle';
      const animationSpeed = (window as any).__animationSpeed || '1.00';
      const skeletonLoaded = (window as any).__skeletonLoaded;
      const activeLights = (window as any).__activeLights || 0;
      const shadowLights = (window as any).__shadowLights || 0;
      const nightLighting = (window as any).__nightLighting;
      const buildingDims = (window as any).__lastBuildingDims;
      
      setShowDebug(!!show);
      if (show) {
        setDebugData({
          input,
          camDebug,
          camPos: camPos ? { x: camPos.x.toFixed(2), y: camPos.y.toFixed(2), z: camPos.z.toFixed(2) } : null,
          camTarget: camTarget ? { x: camTarget.x.toFixed(2), y: camTarget.y.toFixed(2), z: camTarget.z.toFixed(2) } : null,
          playerPos: player.position.map((v: number) => v.toFixed(2)),
          playerRot: (player.rotation * 180 / Math.PI).toFixed(1),
          savedValid,
          mounted: playerMounted,
          bodyExists,
          visible: playerVisible,
          spawn: playerSpawn,
          transform: playerTransform ? {
            x: playerTransform.position.x.toFixed(2),
            y: playerTransform.position.y.toFixed(2),
            z: playerTransform.position.z.toFixed(2),
            vx: playerTransform.velocity.x.toFixed(2),
            vy: playerTransform.velocity.y.toFixed(2),
            vz: playerTransform.velocity.z.toFixed(2),
          } : null,
          camCollision: cameraCollision,
          playerRenderer,
          playerAnimation,
          animationSpeed,
          skeletonLoaded,
          activeLights,
          shadowLights,
          nightLighting,
          buildingDims,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player.position, player.rotation]);

  if (!showDebug || !debugData) return null;

  const distCamToPlayer = debugData.camPos && debugData.transform ? 
    Math.sqrt(
      Math.pow(parseFloat(debugData.camPos.x) - parseFloat(debugData.transform.x), 2) +
      Math.pow(parseFloat(debugData.camPos.y) - parseFloat(debugData.transform.y), 2) +
      Math.pow(parseFloat(debugData.camPos.z) - parseFloat(debugData.transform.z), 2)
    ).toFixed(2) : 'N/A';

  return (
    <div className="absolute top-20 left-4 bg-black/90 backdrop-blur-sm rounded-lg p-3 text-xs text-white border border-white/20 pointer-events-auto font-mono min-w-[380px] z-50 max-h-[85vh] overflow-auto">
      <div className="font-bold mb-2 text-yellow-400">DEBUG [F3] | R=Reset Camera | TEST MOVE button below</div>
      
      <div className="mb-2 p-2 bg-white/10 rounded">
        <div className="text-green-300 font-bold">Player Existence:</div>
        <div>Player mounted: {debugData.mounted ? 'YES' : 'NO'}</div>
        <div>RigidBody: {debugData.bodyExists ? 'YES' : 'NO'}</div>
        <div>Player visible: {debugData.visible ? 'YES' : 'NO'}</div>
        <div>Spawn: {debugData.spawn ? `${debugData.spawn.x},${debugData.spawn.y},${debugData.spawn.z}` : 'none'}</div>
        <div>Camera collision: {debugData.camCollision === false ? 'DISABLED (fix)' : debugData.camCollision ? 'ON' : 'OFF'}</div>
        <div className="mt-1 text-cyan-300">Active lights: {debugData.activeLights} | Shadow lights: {debugData.shadowLights}</div>
        <div className="text-cyan-200 text-[10px]">Night: {debugData.nightLighting ? `amb ${debugData.nightLighting.ambient.toFixed(2)} hemi ${debugData.nightLighting.hemi.toFixed(2)} moon ${debugData.nightLighting.moon.toFixed(2)}` : 'n/a'} | {debugData.buildingDims || ''}</div>
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className={debugData.playerRenderer === 'GLB' ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>Renderer: {debugData.playerRenderer} | Skeleton: {debugData.skeletonLoaded ? 'YES' : debugData.skeletonLoaded === false ? 'NO' : 'N/A (procedural)'} | Anim: {debugData.playerAnimation} x{debugData.animationSpeed}</div>
          <div>VisualFeetY: {debugData.input?.visualFeetY || 'n/a'} | Move: {debugData.transform ? (Math.sqrt(parseFloat(debugData.transform.vx)**2 + parseFloat(debugData.transform.vz)**2)).toFixed(2)+' m/s' : 'n/a'}</div>
          <div className={debugData.playerRenderer === 'GLB' ? 'text-green-300' : 'text-orange-300'}>{debugData.playerRenderer === 'GLB' ? 'GLB loaded ✓' : 'PROCEDURAL fallback - need player.glb'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        <div>W: {debugData.input?.W ? 'TRUE' : 'FALSE'}</div>
        <div>A: {debugData.input?.A ? 'TRUE' : 'FALSE'}</div>
        <div>S: {debugData.input?.S ? 'TRUE' : 'FALSE'}</div>
        <div>D: {debugData.input?.D ? 'TRUE' : 'FALSE'}</div>
        <div>Shift: {debugData.input?.Shift ? 'TRUE' : 'FALSE'}</div>
        <div>Grounded: {debugData.input?.grounded ? 'TRUE' : 'FALSE'}</div>
        <div>JoyX: {debugData.input?.JoyX?.toFixed(2) || '0'}</div>
        <div>JoyY: {debugData.input?.JoyY?.toFixed(2) || '0'}</div>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="text-green-400 font-bold">Position (REF = real body, Zustand = HUD):</div>
        <div>REF Pos: {debugData.transform ? `${debugData.transform.x}, ${debugData.transform.y}, ${debugData.transform.z}` : 'none'}</div>
        <div>Zustand Pos: {debugData.playerPos[0]}, {debugData.playerPos[1]}, {debugData.playerPos[2]}</div>
        <div>Vel REF: {debugData.transform ? `${debugData.transform.vx},${debugData.transform.vy},${debugData.transform.vz}` : 'none'}</div>
        <div>Vel Input: {debugData.input?.vel ? `${debugData.input.vel[0].toFixed(2)},${debugData.input.vel[1].toFixed(2)},${debugData.input.vel[2].toFixed(2)}` : 'none'}</div>
        <div>MoveVec: {debugData.input?.moveVec || 'n/a'} TargetYaw: {debugData.input?.targetPlayerYaw || 'n/a'} CurrYaw: {debugData.input?.currentVisualYaw || 'n/a'} Offset: {debugData.input?.modelForwardOffset || '0'}</div>
        <div>BodyCenterY: {debugData.input?.bodyCenterY || 'n/a'} ColliderBottomY: {debugData.input?.colliderBottomY || 'n/a'} GroundTopY: {debugData.input?.groundTopY || '0'} VisualFeetY: {debugData.input?.visualFeetY || 'n/a'}</div>
        <div>CamF: {debugData.input?.camForward || 'n/a'} CamR: {debugData.input?.camRight || 'n/a'}</div>
        <div>Rot: {debugData.playerRot}°</div>
        <div>SavedValid: {debugData.savedValid === undefined ? 'new/forced' : debugData.savedValid ? 'true' : 'false (forced SAFE_SPAWN)'}</div>
      </div>

      {debugData.camDebug && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="text-blue-400 font-bold">Camera:</div>
          <div>Pos: {debugData.camDebug.cameraPos}</div>
          <div>Target: {debugData.camDebug.targetPos}</div>
          <div>CamTarget global: {debugData.camTarget ? `${debugData.camTarget.x},${debugData.camTarget.y},${debugData.camTarget.z}` : 'none'}</div>
          <div>Yaw: {debugData.camDebug.yaw} Pitch: {debugData.camDebug.pitch}</div>
          <div>Dist: desired {debugData.camDebug.desiredDistance} cur {debugData.camDebug.currentDistance} final {debugData.camDebug.finalDistance}</div>
          <div>Dist cam-&gt;player: {distCamToPlayer}m {parseFloat(distCamToPlayer) > 20 ? '(HARD RESET NEEDED!)' : ''}</div>
          <div>Collision: {debugData.camDebug.collisionEnabled ? 'ON' : 'OFF'} Hit: {debugData.camDebug.collisionHit ? 'YES' : 'NO'}</div>
          <div>HitInfo: {debugData.camDebug.hitInfo}</div>
          <div>Initialized: {debugData.camDebug.initialized ? 'true' : 'false'}</div>
          <div>Source: {debugData.camDebug.playerPos}</div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            const fn = (window as any).__testMove;
            if (fn) fn();
            else console.warn('__testMove not ready');
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold"
        >
          TEST MOVE (1s forward)
        </button>
        <button
          onClick={() => {
            try {
              localStorage.clear();
              console.log('[DEBUG] localStorage cleared, reload');
              window.location.reload();
            } catch {}
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs"
        >
          CLEAR SAVE & RELOAD
        </button>
      </div>

      <div className="mt-2 text-[10px] text-gray-400">
        CAMERA-RELATIVE: forward = camTarget-camPos horizontal, right = forward cross up (-X at yaw0)<br/>
        W=+forward S=-forward A=screen LEFT (+X at yaw0) D=screen RIGHT (-X at yaw0) per Three lookAt<br/>
        Visual offset MODEL_Y_OFFSET=0.27 to make feet 0.02-0.05 above ground, collider bottom = ground top =0<br/>
        After fix: idle stable, feet on surface, A left D right visually, 90deg camera turn test
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
          <div>WASD - движение (не зависит от раскладки) | Shift - бег | Мышь - камера | Колесо - зум | F3 - дебаг | R - reset camera</div>
          <div>E - действие | Esc - меню | Клик - фокус + захват мыши | TEST MOVE в F3 меню</div>
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
