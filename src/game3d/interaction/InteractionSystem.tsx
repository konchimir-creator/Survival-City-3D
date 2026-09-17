'use client';
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS } from '@/game/world/types';

interface InteractionPoint {
  id: string;
  type: string;
  position: THREE.Vector3;
  range: number;
  label: string;
  labelRu: string;
  buildingId?: string;
}

export function InteractionSystem() {
  const playerPos = useGameStore((s) => s.player.position);
  const setInteraction = useGameStore((s) => s.setInteraction);
  const currentInteraction = useGameStore((s) => s.currentInteraction);
  const job = useGameStore((s) => s.job);
  const setInShopInterior = useGameStore((s) => s.setInShopInterior);
  const setDialog = useGameStore((s) => s.setDialog);
  const startWork = useGameStore((s) => s.startWork);
  const completeWorkTask = useGameStore((s) => s.completeWorkTask);
  const finishShift = useGameStore((s) => s.finishShift);

  const points = useMemo<InteractionPoint[]>(() => {
    const pts: InteractionPoint[] = [];
    
    // Building interactions
    BUILDINGS.forEach((b) => {
      if (!b.interactable) return;
      const pos = new THREE.Vector3(b.position[0], b.position[1], b.position[2] + b.size[2]/2 + 2);
      let type = 'generic';
      let label = 'Interact';
      let labelRu = 'Взаимодействовать';
      
      if (b.type === 'shop') {
        type = 'shop_enter';
        label = 'Enter Shop';
        labelRu = 'Войти в магазин';
      } else if (b.type === 'shelter') {
        type = 'sleep';
        label = 'Sleep';
        labelRu = 'Спать';
      } else if (b.type === 'warehouse') {
        type = 'work';
        label = 'Work as Loader';
        labelRu = 'Работать грузчиком';
      } else if (b.type === 'cafe') {
        type = 'work';
        label = 'Work in Cafe';
        labelRu = 'Работать в кафе';
      } else if (b.type === 'police') {
        type = 'talk';
        label = 'Talk to Police';
        labelRu = 'Поговорить с полицией';
      } else if (b.type === 'medical') {
        type = 'talk';
        label = 'Medical Help';
        labelRu = 'Медпомощь';
      } else if (b.type === 'abandoned') {
        type = 'search';
        label = 'Search';
        labelRu = 'Обыскать';
      }

      pts.push({
        id: b.id,
        type,
        position: pos,
        range: 3,
        label,
        labelRu,
        buildingId: b.id,
      });
    });

    // Warehouse job boxes
    pts.push({
      id: 'warehouse_box_a',
      type: 'work_task',
      position: new THREE.Vector3(-85, 0, 45),
      range: 2,
      label: 'Take Box',
      labelRu: 'Взять коробку',
    });
    pts.push({
      id: 'warehouse_box_b',
      type: 'work_task_drop',
      position: new THREE.Vector3(-95, 0, 35),
      range: 2,
      label: 'Drop Box',
      labelRu: 'Положить коробку',
    });

    // Street cleaner trash points
    for (let i = 0; i < 5; i++) {
      pts.push({
        id: `trash-${i}`,
        type: 'clean_task',
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          0,
          50 + Math.random() * 30
        ),
        range: 2,
        label: 'Clean Trash',
        labelRu: 'Убрать мусор',
      });
    }

    return pts;
  }, []);

  useFrame(() => {
    const playerVec = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
    let closest: InteractionPoint | null = null;
    let minDist = Infinity;

    for (const p of points) {
      const dist = playerVec.distanceTo(p.position);
      if (dist < p.range && dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    // Special case: if working, only show work tasks
    if (job.isWorking) {
      if (job.currentJob === 'warehouse_loader') {
        const hasBox = (window as any).__hasBox;
        const wantedType = hasBox ? 'work_task_drop' : 'work_task';
        const workPoint = points.find((pt) => pt.type === wantedType && playerVec.distanceTo(pt.position) < pt.range);
        if (workPoint) {
          closest = workPoint;
        } else {
          closest = null;
        }
      }
    }

    if (closest) {
      if (!currentInteraction || currentInteraction.id !== closest.id) {
        setInteraction({
          id: closest.id,
          label: closest.label,
          labelRu: closest.labelRu,
          type: closest.type,
        });
      }
    } else {
      if (currentInteraction) {
        setInteraction(null);
      }
    }
  });

  // Handle E key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e') return;
      
      const state = useGameStore.getState();
      if (state.isInventoryOpen || state.isMenuOpen || state.isDialogOpen || state.isCharacterOpen || state.isMapOpen) return;
      if (!state.currentInteraction) return;

      const interaction = state.currentInteraction;
      
      if (interaction.type === 'shop_enter') {
        state.setInShopInterior(true);
        if (document.pointerLockElement) document.exitPointerLock();
      } else if (interaction.type === 'sleep') {
        // Sleep logic
        const cost = 5;
        if (state.economy.cash >= cost) {
          state.spendCash(cost);
          state.updateStats({ energy: 100, health: Math.min(100, state.player.stats.health + 10) });
          state.advanceTime(480); // 8 hours
        } else {
          // Sleep on street free but with penalty
          state.updateStats({ energy: 60, health: Math.max(0, state.player.stats.health - 5), mood: Math.max(0, state.player.stats.mood - 10) });
          state.advanceTime(360);
        }
      } else if (interaction.type === 'work') {
        if (interaction.id.includes('warehouse')) {
          state.setJob('warehouse_loader');
          state.startWork();
          (window as any).__hasBox = false;
        } else if (interaction.id.includes('cafe')) {
          state.setJob('cafe_helper');
          state.startWork();
          // For cafe, instant work for MVP
          setTimeout(() => {
            const s = useGameStore.getState();
            s.finishShift();
            s.setJob('none');
          }, 100);
        }
      } else if (interaction.type === 'work_task') {
        if (state.job.isWorking && state.job.currentJob === 'warehouse_loader') {
          (window as any).__hasBox = true;
          // Visual feedback could be added
        }
      } else if (interaction.type === 'work_task_drop') {
        if (state.job.isWorking && (window as any).__hasBox) {
          (window as any).__hasBox = false;
          state.completeWorkTask();
          const updated = useGameStore.getState().job;
          if (updated.boxesCarried >= updated.boxesTotal) {
            state.finishShift();
            state.setJob('none');
            (window as any).__hasBox = false;
          }
        }
      } else if (interaction.type === 'talk') {
        state.setDialog({
          npcId: interaction.id,
          name: interaction.label,
          text: 'Привет! Как дела в городе? Работа есть, но не для всех. Держись!',
        });
        if (document.pointerLockElement) document.exitPointerLock();
      } else if (interaction.type === 'search') {
        // Find random item
        if (Math.random() < 0.5) {
          const items = ['bread', 'water', 'apple'];
          const item = items[Math.floor(Math.random() * items.length)];
          state.addItem(item, 1);
          state.setDialog({
            npcId: 'search',
            name: 'Находка',
            text: `Ты нашёл: ${item}! Повезло.`,
          });
        } else {
          state.setDialog({
            npcId: 'search',
            name: 'Пусто',
            text: 'Здесь ничего нет. Только мусор.',
          });
        }
        if (document.pointerLockElement) document.exitPointerLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
