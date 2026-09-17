'use client';

import { create } from 'zustand';
import { CharacterStats, CharacterSkills, CharacterAttributes, DEFAULT_STATS, DEFAULT_SKILLS, DEFAULT_ATTRIBUTES } from '@/game/character/types';
import { EconomyState, DEFAULT_ECONOMY, SHOP_ITEMS, ShopItemDef } from '@/game/economy/types';
import { InventoryItem, Equipment, DEFAULT_EQUIPMENT, getMaxWeight } from '@/game/inventory/types';
import { JobId, JOBS, JobProgress } from '@/game/jobs/types';
import { TimeState, WeatherState, DEFAULT_TIME, DEFAULT_WEATHER } from '@/game/time/types';
import { SAVE_VERSION, SAVE_KEY, SaveData } from '@/game/save/types';
import { BUILDINGS } from '@/game/world/types';

interface PlayerState {
  position: [number, number, number];
  rotation: number;
  stats: CharacterStats;
  skills: CharacterSkills;
  attributes: CharacterAttributes;
}

interface SettingsState {
  graphics: 'low' | 'medium' | 'high';
  mouseSensitivity: number;
  volume: number;
  fov: number;
  showFPS: boolean;
}

interface GameStore {
  player: PlayerState;
  setPlayerPosition: (pos: [number, number, number]) => void;
  setPlayerRotation: (rot: number) => void;
  updateStats: (delta: Partial<CharacterStats>) => void;
  
  economy: EconomyState;
  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;
  
  inventory: InventoryItem[];
  equipment: Equipment;
  addItem: (defId: string, quantity?: number) => boolean;
  removeItem: (instanceId: string, quantity?: number) => boolean;
  useItem: (instanceId: string) => boolean;
  dropItem: (instanceId: string) => void;
  getInventoryWeight: () => number;
  getMaxWeight: () => number;
  
  time: TimeState;
  weather: WeatherState;
  advanceTime: (deltaMinutes: number) => void;
  setWeather: (type: WeatherState['type']) => void;
  
  job: JobProgress;
  setJob: (jobId: JobId) => void;
  startWork: () => void;
  completeWorkTask: () => void;
  finishShift: () => void;
  
  currentInteraction: { id: string; label: string; labelRu: string; type: string } | null;
  setInteraction: (interaction: GameStore['currentInteraction']) => void;
  isInShopInterior: boolean;
  setInShopInterior: (v: boolean) => void;
  isInventoryOpen: boolean;
  setInventoryOpen: (v: boolean) => void;
  isCharacterOpen: boolean;
  setCharacterOpen: (v: boolean) => void;
  isMapOpen: boolean;
  setMapOpen: (v: boolean) => void;
  isMenuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isDialogOpen: boolean;
  dialogData: { npcId: string; name: string; text: string } | null;
  setDialog: (data: { npcId: string; name: string; text: string } | null) => void;
  
  settings: SettingsState;
  setGraphics: (g: SettingsState['graphics']) => void;
  
  lastUpdate: number;
  tick: (deltaTime: number) => void;
  
  saveGame: () => void;
  loadGame: () => boolean;
  newGame: () => void;
  hasSave: () => boolean;
}

function createId() {
  return Math.random().toString(36).substring(2, 9);
}

// SAFE_SPAWN - guaranteed open area, 5m from walls, 5m from trees
// Chosen at [15,2,15] - between roads, away from buildings
export const SAFE_SPAWN: [number, number, number] = [15, 2, 15];
const WORLD_BOUNDS = 200;

function isValidPosition(pos: any): boolean {
  if (!pos || !Array.isArray(pos) || pos.length !== 3) return false;
  const [x, y, z] = pos;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
  if (Math.abs(x) > WORLD_BOUNDS || Math.abs(z) > WORLD_BOUNDS) return false;
  if (y < -10 || y > 50) return false;
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return false;
  
  // Check if inside building
  for (const b of BUILDINGS) {
    const halfX = b.size[0]/2 + 2; // +2 margin
    const halfY = b.size[1]/2 + 2;
    const halfZ = b.size[2]/2 + 2;
    if (
      Math.abs(x - b.position[0]) < halfX &&
      Math.abs(y - b.position[1] - halfY) < halfY &&
      Math.abs(z - b.position[2]) < halfZ
    ) {
      console.warn(`[SpawnValidation] Position ${x},${y},${z} inside building ${b.id}`);
      return false;
    }
  }
  
  return true;
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: {
    position: [...SAFE_SPAWN] as [number, number, number],
    rotation: 0,
    stats: { ...DEFAULT_STATS },
    skills: { ...DEFAULT_SKILLS },
    attributes: { ...DEFAULT_ATTRIBUTES },
  },
  setPlayerPosition: (pos) => {
    if (!isValidPosition(pos)) {
      console.warn('[setPlayerPosition] Invalid pos, using SAFE_SPAWN', pos);
      pos = [...SAFE_SPAWN] as [number, number, number];
    }
    set((s) => ({ player: { ...s.player, position: pos } }));
  },
  setPlayerRotation: (rot) => {
    if (!Number.isFinite(rot)) {
      console.warn('[setPlayerRotation] Invalid rot', rot);
      rot = 0;
    }
    set((s) => ({ player: { ...s.player, rotation: rot } }));
  },
  updateStats: (delta) => set((s) => ({
    player: {
      ...s.player,
      stats: {
        ...s.player.stats,
        ...Object.fromEntries(
          Object.entries({ ...s.player.stats, ...delta }).map(([k, v]) => [
            k,
            Math.max(0, Math.min(100, v as number)),
          ])
        ),
      } as CharacterStats,
    },
  })),

  economy: { ...DEFAULT_ECONOMY },
  addCash: (amount) => set((s) => ({ economy: { ...s.economy, cash: s.economy.cash + amount } })),
  spendCash: (amount) => {
    const { economy } = get();
    if (economy.cash >= amount) {
      set({ economy: { ...economy, cash: economy.cash - amount } });
      return true;
    }
    return false;
  },

  inventory: [],
  equipment: { ...DEFAULT_EQUIPMENT },
  addItem: (defId, quantity = 1) => {
    const def = SHOP_ITEMS.find((i) => i.id === defId);
    if (!def) return false;
    const { inventory, equipment } = get();
    const currentWeight = inventory.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const maxWeight = getMaxWeight(equipment);
    const additionalWeight = def.weight * quantity;
    if (currentWeight + additionalWeight > maxWeight) {
      return false;
    }
    const existing = inventory.find((i) => i.defId === defId);
    if (existing) {
      set({
        inventory: inventory.map((i) =>
          i.defId === defId ? { ...i, quantity: i.quantity + quantity } : i
        ),
      });
    } else {
      const newItem: InventoryItem = {
        id: createId(),
        defId: def.id,
        name: def.name,
        nameRu: def.nameRu,
        category: def.category as any,
        quantity,
        weight: def.weight,
        stackable: true,
        hunger: def.hunger,
        thirst: (def as any).thirst,
        health: def.health,
        energy: (def as any).energy,
        description: def.description,
      };
      set({ inventory: [...inventory, newItem] });
    }
    return true;
  },
  removeItem: (instanceId, quantity = 1) => {
    const { inventory } = get();
    const item = inventory.find((i) => i.id === instanceId);
    if (!item) return false;
    if (item.quantity > quantity) {
      set({
        inventory: inventory.map((i) =>
          i.id === instanceId ? { ...i, quantity: i.quantity - quantity } : i
        ),
      });
    } else {
      set({ inventory: inventory.filter((i) => i.id !== instanceId) });
    }
    return true;
  },
  useItem: (instanceId) => {
    const { inventory } = get();
    const item = inventory.find((i) => i.id === instanceId);
    if (!item) return false;
    set((s) => ({
      player: {
        ...s.player,
        stats: {
          ...s.player.stats,
          hunger: Math.max(0, Math.min(100, s.player.stats.hunger + (item.hunger || 0))),
          thirst: Math.max(0, Math.min(100, s.player.stats.thirst + (item.thirst || 0))),
          health: Math.max(0, Math.min(100, s.player.stats.health + (item.health || 0))),
          energy: Math.max(0, Math.min(100, s.player.stats.energy + (item.energy || 0))),
        },
      },
    }));
    get().removeItem(instanceId, 1);
    return true;
  },
  dropItem: (instanceId) => {
    get().removeItem(instanceId, 1);
  },
  getInventoryWeight: () => {
    const { inventory } = get();
    return inventory.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  },
  getMaxWeight: () => {
    const { equipment } = get();
    return getMaxWeight(equipment);
  },

  time: { ...DEFAULT_TIME },
  weather: { ...DEFAULT_WEATHER },
  advanceTime: (deltaMinutes) => set((s) => {
    let newMinute = s.time.minuteOfDay + deltaMinutes;
    let newDay = s.time.day;
    while (newMinute >= 1440) {
      newMinute -= 1440;
      newDay++;
    }
    return { time: { ...s.time, minuteOfDay: newMinute, day: newDay } };
  }),
  setWeather: (type) => set((s) => ({ weather: { ...s.weather, type } })),

  job: {
    currentJob: 'none',
    shiftProgress: 0,
    boxesCarried: 0,
    boxesTotal: 3,
    isWorking: false,
  },
  setJob: (jobId) => set((s) => ({
    job: {
      ...s.job,
      currentJob: jobId,
      boxesCarried: 0,
      boxesTotal: jobId === 'warehouse_loader' ? 3 : 0,
      shiftProgress: 0,
      isWorking: false,
    },
  })),
  startWork: () => set((s) => ({ job: { ...s.job, isWorking: true, shiftProgress: 0 } })),
  completeWorkTask: () => set((s) => {
    const newCarried = s.job.boxesCarried + 1;
    const progress = (newCarried / s.job.boxesTotal) * 100;
    return {
      job: { ...s.job, boxesCarried: newCarried, shiftProgress: progress },
    };
  }),
  finishShift: () => {
    const { job } = get();
    const def = JOBS[job.currentJob];
    if (!def) return;
    set((s) => ({
      economy: { ...s.economy, cash: s.economy.cash + def.salary },
      player: {
        ...s.player,
        stats: {
          ...s.player.stats,
          energy: Math.max(0, s.player.stats.energy - def.energyCost),
          hunger: Math.max(0, s.player.stats.hunger - def.hungerCost),
          thirst: Math.max(0, s.player.stats.thirst - def.thirstCost),
        },
      },
      job: { ...s.job, isWorking: false, shiftProgress: 100, boxesCarried: 0 },
      time: { ...s.time, minuteOfDay: s.time.minuteOfDay + 240, day: s.time.day },
    }));
    const { time } = get();
    if (time.minuteOfDay >= 1440) {
      set((s) => ({
        time: { ...s.time, minuteOfDay: s.time.minuteOfDay - 1440, day: s.time.day + 1 },
      }));
    }
  },

  currentInteraction: null,
  setInteraction: (interaction) => set({ currentInteraction: interaction }),
  isInShopInterior: false,
  setInShopInterior: (v) => set({ isInShopInterior: v }),
  isInventoryOpen: false,
  setInventoryOpen: (v) => set({ isInventoryOpen: v }),
  isCharacterOpen: false,
  setCharacterOpen: (v) => set({ isCharacterOpen: v }),
  isMapOpen: false,
  setMapOpen: (v) => set({ isMapOpen: v }),
  isMenuOpen: false,
  setMenuOpen: (v) => set({ isMenuOpen: v }),
  isDialogOpen: false,
  dialogData: null,
  setDialog: (data) => set({ dialogData: data, isDialogOpen: !!data }),

  settings: {
    graphics: 'medium',
    mouseSensitivity: 1,
    volume: 0.7,
    fov: 65,
    showFPS: false,
  },
  setGraphics: (g) => set((s) => ({ settings: { ...s.settings, graphics: g } })),

  lastUpdate: Date.now(),
  tick: (deltaTime) => {
    const { time } = get();
    if (time.isPaused) return;
    const deltaMinutes = (deltaTime / 1000) * time.timeScale;
    get().advanceTime(deltaMinutes);

    const decayRate = deltaMinutes * 0.02;
    set((s) => ({
      player: {
        ...s.player,
        stats: {
          ...s.player.stats,
          hunger: Math.max(0, s.player.stats.hunger - decayRate * 0.5),
          thirst: Math.max(0, s.player.stats.thirst - decayRate * 0.7),
          energy: Math.max(0, s.player.stats.energy - decayRate * 0.1),
        },
      },
    }));

    const { player: updatedPlayer } = get();
    if (updatedPlayer.stats.hunger <= 0 || updatedPlayer.stats.thirst <= 0) {
      set((s) => ({
        player: {
          ...s.player,
          stats: {
            ...s.player.stats,
            health: Math.max(0, s.player.stats.health - decayRate * 0.2),
          },
        },
      }));
    }

    if (Math.random() < 0.0001) {
      const types: WeatherState['type'][] = ['clear', 'cloudy', 'rain'];
      const newType = types[Math.floor(Math.random() * types.length)];
      set((s) => ({ weather: { ...s.weather, type: newType } }));
    }
  },

  saveGame: () => {
    const state = get();
    // Only save player pos/rot, not camera absolute
    // Camera yaw/pitch/distance saved separately via globals
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        position: state.player.position,
        rotation: state.player.rotation,
        stats: state.player.stats,
        skills: state.player.skills,
        attributes: state.player.attributes,
      },
      economy: state.economy,
      inventory: state.inventory,
      equipment: state.equipment,
      time: state.time,
      weather: state.weather,
      job: {
        currentJob: state.job.currentJob,
      },
      settings: {
        graphics: state.settings.graphics,
        mouseSensitivity: state.settings.mouseSensitivity,
        volume: state.settings.volume,
      },
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      // Also save camera yaw/pitch/distance separately
      const camYaw = (typeof window !== 'undefined' ? (window as any).__cameraYaw : 0) || 0;
      const camPitch = (typeof window !== 'undefined' ? (window as any).__cameraPitch : 0.25) || 0.25;
      const camDist = (typeof window !== 'undefined' ? (window as any).__cameraDistance : 4.5) || 4.5;
      localStorage.setItem(SAVE_KEY + '_camera', JSON.stringify({ yaw: camYaw, pitch: camPitch, distance: camDist }));
      console.log('Game saved', data);
    } catch (e) {
      console.error('Save failed', e);
    }
  },
  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, migrating');
      }

      // DIAGNOSTIC FIX: completely ignore old save position, force SAFE_SPAWN [15,2,15] for visibility test
      // Per task 5: для теста полностью игнорировать старый save
      let savedPos = [...SAFE_SPAWN] as [number, number, number];
      let posValid = false; // forced
      const originalSavedPos = data.player.position;
      console.warn(`[loadGame] DIAGNOSTIC: ignoring saved pos ${originalSavedPos} -> forced SAFE_SPAWN ${SAFE_SPAWN}`);
      // Still check if original was valid for debug, but don't use it
      if (isValidPosition(originalSavedPos)) {
        // Log but still force SAFE_SPAWN for this fix
        console.log('[loadGame] Original saved pos was valid but ignored for diagnostic');
      }

      // Validate rotation
      let savedRot = data.player.rotation;
      if (!Number.isFinite(savedRot)) {
        console.warn('[loadGame] Invalid rotation, reset to 0', savedRot);
        savedRot = 0;
      }

      set((s) => ({
        player: {
          ...s.player,
          position: savedPos || [...SAFE_SPAWN] as [number, number, number],
          rotation: savedRot || 0,
          stats: data.player.stats || s.player.stats,
          skills: data.player.skills || s.player.skills,
          attributes: data.player.attributes || s.player.attributes,
        },
        economy: data.economy || s.economy,
        inventory: data.inventory || [],
        equipment: data.equipment || s.equipment,
        time: data.time || s.time,
        weather: data.weather || s.weather,
        job: {
          ...s.job,
          currentJob: (data.job?.currentJob as JobId) || 'none',
        },
        settings: {
          ...s.settings,
          graphics: data.settings?.graphics || s.settings.graphics,
          mouseSensitivity: data.settings?.mouseSensitivity ?? s.settings.mouseSensitivity,
          volume: data.settings?.volume ?? s.settings.volume,
        },
      }));

      // Load camera settings separately, don't use old absolute camera pos
      try {
        const camRaw = localStorage.getItem(SAVE_KEY + '_camera');
        if (camRaw) {
          const camData = JSON.parse(camRaw);
          if (Number.isFinite(camData.yaw)) (window as any).__cameraYaw = camData.yaw;
          if (Number.isFinite(camData.pitch)) (window as any).__cameraPitch = Math.max(-0.15, Math.min(0.65, camData.pitch));
          if (Number.isFinite(camData.distance)) (window as any).__cameraDistance = Math.max(2.5, Math.min(7, camData.distance));
        }
      } catch {}

      // Store validation result for debug
      (typeof window !== 'undefined' ? (window as any).__savedPosValid = posValid : null);

      return true;
    } catch (e) {
      console.error('Load failed', e);
      return false;
    }
  },
  newGame: () => {
    set({
      player: {
        position: [...SAFE_SPAWN] as [number, number, number],
        rotation: 0,
        stats: { ...DEFAULT_STATS },
        skills: { ...DEFAULT_SKILLS },
        attributes: { ...DEFAULT_ATTRIBUTES },
      },
      economy: { ...DEFAULT_ECONOMY },
      inventory: [],
      equipment: { ...DEFAULT_EQUIPMENT },
      time: { ...DEFAULT_TIME },
      weather: { ...DEFAULT_WEATHER },
      job: {
        currentJob: 'none',
        shiftProgress: 0,
        boxesCarried: 0,
        boxesTotal: 3,
        isWorking: false,
      },
    });
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_KEY + '_camera');
    } catch {}
  },
  hasSave: () => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  },
}));
