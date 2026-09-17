'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Safe GLB player - unconditional hooks, no conditional useGLTF
// If file missing/corrupted, ErrorBoundary will fallback to procedural
export function GLBPlayer({ animation, moveSpeed, isMoving }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Unconditional hook - always called when component mounted
  // If file 404, this will throw and be caught by ErrorBoundary
  const { scene, animations } = useGLTF('/models/player/player.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);

  const currentActionRef = useRef<string | null>(null);

  // Clone scene to avoid mutating original, enable shadows, fix materials
  const clonedScene = useMemo(() => {
    try {
      const clone = scene.clone(true);
      clone.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          // Fix PBR materials
          if (obj.material) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat.isMeshStandardMaterial) {
              // Skin not metallic
              if (mat.name.toLowerCase().includes('skin') || mat.name.toLowerCase().includes('body')) {
                mat.metalness = 0;
                mat.roughness = 0.7;
              }
              // Clothing rough
              if (mat.name.toLowerCase().includes('hoodie') || mat.name.toLowerCase().includes('jeans') || mat.name.toLowerCase().includes('cloth')) {
                mat.roughness = 0.9;
                mat.metalness = 0.02;
              }
              // Sneakers not chrome
              if (mat.name.toLowerCase().includes('shoe') || mat.name.toLowerCase().includes('sneaker')) {
                mat.metalness = 0.05;
                mat.roughness = 0.65;
              }
            }
          }
        }
      });
      console.log('[GLBPlayer] Scene cloned, shadows enabled, materials fixed');
      (window as any).__playerRenderer = 'GLB';
      (window as any).__skeletonLoaded = true;
      return clone;
    } catch (e) {
      console.warn('[GLBPlayer] Clone failed', e);
      return scene;
    }
  }, [scene]);

  // Animation handling with crossfade 0.15-0.3 sec, no root motion
  useEffect(() => {
    try {
      if (!actions) return;

      // Find matching animation names (case-insensitive)
      const findAction = (names: string[]) => {
        for (const n of names) {
          const lower = n.toLowerCase();
          for (const key in actions) {
            if (key.toLowerCase().includes(lower)) return actions[key];
          }
        }
        return null;
      };

      const idleAction = findAction(['idle', 'stand', 'breath']);
      const walkAction = findAction(['walk']);
      const runAction = findAction(['run', 'sprint']);

      let nextAction: THREE.AnimationAction | null = null;
      if (animation === 'idle') nextAction = idleAction;
      else if (animation === 'walk') nextAction = walkAction || idleAction;
      else if (animation === 'run') nextAction = runAction || walkAction || idleAction;

      if (!nextAction) {
        console.warn('[GLBPlayer] No action found for', animation, 'available:', Object.keys(actions));
        return;
      }

      // Sync playback speed with real movement to prevent foot sliding
      if (animation === 'walk') {
        nextAction.timeScale = moveSpeed / 3.5;
      } else if (animation === 'run') {
        nextAction.timeScale = moveSpeed / 6.0;
      } else {
        nextAction.timeScale = 1;
      }

      (window as any).__animationSpeed = nextAction.timeScale.toFixed(2);

      if (currentActionRef.current !== nextAction.getClip().name) {
        const prevAction = currentActionRef.current ? actions[currentActionRef.current] : null;
        if (prevAction && prevAction !== nextAction) {
          prevAction.fadeOut(0.2);
        }
        nextAction.reset().fadeIn(0.2).play();
        currentActionRef.current = nextAction.getClip().name;
        console.log(`[GLBPlayer] Crossfade to ${animation} (${nextAction.getClip().name}) speed ${nextAction.timeScale.toFixed(2)}`);
      } else {
        // Update timeScale if already playing
        nextAction.timeScale = animation === 'walk' ? moveSpeed/3.5 : animation === 'run' ? moveSpeed/6.0 : 1;
      }

      (window as any).__playerAnimation = animation;
    } catch (e) {
      console.warn('[GLBPlayer] Animation switch failed', e);
    }
  }, [animation, moveSpeed, actions]);

  // Ensure no root motion - position from Rapier, animation in-place only
  useFrame((state, delta) => {
    try {
      if (mixer) {
        mixer.update(delta);
      }
      // Prevent root motion from moving group
      if (groupRef.current) {
        groupRef.current.position.set(0,0,0);
      }
    } catch {}
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload for performance, but safe if missing
try {
  useGLTF.preload('/models/player/player.glb');
} catch {}
