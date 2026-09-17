'use client';
import { ProceduralPlayer } from './ProceduralPlayer';

interface PlayerModelProps {
  animation: 'idle' | 'walk' | 'run';
  moveSpeed: number;
  isMoving: boolean;
}

// Legacy wrapper - now uses improved ProceduralPlayer
// Real GLB loading is in GLBPlayer + PlayerRenderer
export function PlayerModel(props: PlayerModelProps) {
  return <ProceduralPlayer {...props} />;
}
