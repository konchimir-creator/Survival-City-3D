'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { ProceduralPlayer } from './ProceduralPlayer';
import { GLBPlayer } from './GLBPlayer';
import { PlayerErrorBoundary } from './PlayerErrorBoundary';

interface Props {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

export function PlayerRenderer({ animation, moveSpeed, isMoving }: Props) {
  const [useGLB, setUseGLB] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if GLB exists via HEAD request, no hooks conditional
    fetch('/models/player/player.glb', { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          console.log('[PlayerRenderer] GLB found, will use GLBPlayer');
          setUseGLB(true);
          (window as any).__playerRenderer = 'GLB';
        } else {
          console.log('[PlayerRenderer] GLB not found (status', res.status, '), using procedural fallback');
          setUseGLB(false);
          (window as any).__playerRenderer = 'PROCEDURAL';
          (window as any).__skeletonLoaded = false;
        }
        setChecked(true);
      })
      .catch(() => {
        console.log('[PlayerRenderer] GLB fetch failed, using procedural');
        setUseGLB(false);
        (window as any).__playerRenderer = 'PROCEDURAL';
        (window as any).__skeletonLoaded = false;
        setChecked(true);
      });
  }, []);

  if (!checked) {
    // While checking, show procedural to avoid black screen
    return <ProceduralPlayer animation={animation} moveSpeed={moveSpeed} isMoving={isMoving} />;
  }

  if (useGLB) {
    // Safe: GLBPlayer has unconditional hooks, wrapped in ErrorBoundary and Suspense
    // If GLB missing/corrupted, ErrorBoundary falls back to procedural, no black screen
    return (
      <PlayerErrorBoundary fallback={<ProceduralPlayer animation={animation} moveSpeed={moveSpeed} isMoving={isMoving} />}>
        <Suspense fallback={<ProceduralPlayer animation={animation} moveSpeed={moveSpeed} isMoving={isMoving} />}>
          <GLBPlayer animation={animation} moveSpeed={moveSpeed} isMoving={isMoving} />
        </Suspense>
      </PlayerErrorBoundary>
    );
  }

  return <ProceduralPlayer animation={animation} moveSpeed={moveSpeed} isMoving={isMoving} />;
}
