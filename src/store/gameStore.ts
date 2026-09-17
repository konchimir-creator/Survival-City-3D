'use client';

import { create } from 'zustand';
import { CharacterStats, CharacterSkills, CharacterAttributes, DEFAULT_STATS, DEFAULT_SKILLS, DEFAULT_ATTRIBUTES } from '@/game/character/types';
import { EconomyState, DEFAULT_ECONOMY, SHOP_ITEMS, ShopItemDef } from '@/game/economy/types';
import { InventoryItem, Equipment, DEFAULT_EQUIPMENT, getMaxWeight } from '@/game/inventory/types';
import { JobId, JOBS, JobProgress } from '@/game/jobs/types';
import { TimeState, WeatherState, DEFAULT_TIME, DEFAULT_WEATHER } from '@/game/time/types';
import { SAVE_VERSION, SAVE_KEY, SaveData } from '@/game/save/types';

interface PlayerState {
  position: [number, number, number];
  rotation: number; // yaw in radians
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
  // Player
  player: PlayerState;
  setPlayerPosition: (pos: [number, number, number]) => void;
  setPlayerRotation: (rot: number) => void;
  updateStats: (delta: Partial<CharacterStats>) => void;
  
  // Economy
  economy: EconomyState;
  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;
  
  // Inventory
  inventory: InventoryItem[];
  equipment: Equipment;
  addItem: (defId: string, quantity?: number) => boolean;
  removeItem: (instanceId: string, quantity?: number) => boolean;
  useItem: (instanceId: string) => boolean;
  dropItem: (instanceId: string) => void;
  getInventoryWeight: () => number;
  getMaxWeight: () => number;
  
  // Time
  time: TimeState;
  weather: WeatherState;
  advanceTime: (deltaMinutes: number) => void;
  setWeather: (type: WeatherState['type']) => void;
  
  // Jobs
  job: JobProgress;
  setJob: (jobId: JobId) => void;
  startWork: () => void;
  completeWorkTask: () => void;
  finishShift: () => void;
  
  // World
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
  
  // Settings
  settings: SettingsState;
  setGraphics: (g: SettingsState['graphics']) => void;
  
  // Game loop
  lastUpdate: number;
  tick: (deltaTime: number) => void;
  
  // Save/Load
  saveGame: () => void;
  loadGame: () => boolean;
  newGame: () => void;
  hasSave: () => boolean;
}

function createId() {
  return Math.random().toString(36).substring(2, 9);
}

export const useGameStore = create<GameStore>((set, get) => ({
  player: {
    position: [0, 1, 0],
    rotation: 0,
    stats: { ...DEFAULT_STATS },
    skills: { ...DEFAULT_SKILLS },
    attributes: { ...DEFAULT_ATTRIBUTES },
  },
  setPlayerPosition: (pos) => set((s) => ({ player: { ...s.player, position: pos } })),
  setPlayerRotation: (rot) => set((s) => ({ player: { ...s.player, rotation: rot } })),
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
    // Check if stackable exists
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
    const { inventory, player } = get();
    const item = inventory.find((i) => i.id === instanceId);
    if (!item) return false;
    const statsDelta: Partial<CharacterStats> = {};
    if (item.hunger) statsDelta.hunger = player.stats.hunger + item.hunger;
    if (item.thirst) statsDelta.thirst = player.stats.thirst + item.thirst;
    if (item.health) statsDelta.health = player.stats.health + item.health;
    if (item.energy) statsDelta.energy = player.stats.energy + item.energy;
    // Clamp in updateStats will happen? Actually we pass absolute? Let's fix: we pass delta as absolute values merged
    // But updateStats expects absolute final? We implemented as merge then clamp. So we need to calculate final.
    // Actually we already did player.stats.hunger + item.hunger, that's final.
    // For updateStats we should pass absolute values, not delta.
    // Let's use direct set for simplicity
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
    if (newCarried >= s.job.boxesTotal) {
      // Will finish on next call? Actually auto finish
      return {
        job: { ...s.job, boxesCarried: newCarried, shiftProgress: progress },
      };
    }
    return {
      job: { ...s.job, boxesCarried: newCarried, shiftProgress: progress },
    };
  }),
  finishShift: () => {
    const { job, player } = get();
    const def = JOBS[job.currentJob];
    if (!def) return;
    // Reward
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
      time: { ...s.time, minuteOfDay: s.time.minuteOfDay + 240, day: s.time.day }, // +4 hours
    }));
    // Advance day if needed
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
    fov: 75,
    showFPS: false,
  },
  setGraphics: (g) => set((s) => ({ settings: { ...s.settings, graphics: g } })),

  lastUpdate: Date.now(),
  tick: (deltaTime) => {
    const { time, player } = get();
    if (time.isPaused) return;
    // Advance time
    const deltaMinutes = (deltaTime / 1000) * time.timeScale;
    get().advanceTime(deltaMinutes);

    // Decay stats slowly
    // Hunger, thirst decrease over time, energy decreases if not sleeping
    const decayRate = deltaMinutes * 0.02; // per game minute
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

    // Health affected by hunger/thirst
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

    // Random weather changes rarely
    if (Math.random() < 0.0001) {
      const types: WeatherState['type'][] = ['clear', 'cloudy', 'rain'];
      const newType = types[Math.floor(Math.random() * types.length)];
      set((s) => ({ weather: { ...s.weather, type: newType } }));
    }
  },

  saveGame: () => {
    const state = get();
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
        // Simple migration: if old, just load what we can
      }
      set((s) => ({
        player: {
          ...s.player,
          position: data.player.position || [0, 1, 0],
          rotation: data.player.rotation || 0,
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
      return true;
    } catch (e) {
      console.error('Load failed', e);
      return false;
    }
  },
  newGame: () => {
    set({
      player: {
        position: [0, 1, 0],
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
