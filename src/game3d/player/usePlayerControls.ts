'use client';
import { useEffect, useRef } from 'react';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
  interact: boolean;
}

export function usePlayerControls() {
  const inputRef = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    interact: false,
  });

  const mouseDeltaRef = useRef({ x: 0, y: 0 });
  const mouseButtonsRef = useRef({ left: false, right: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.current.forward = true;
      if (key === 's') inputRef.current.backward = true;
      if (key === 'a') inputRef.current.left = true;
      if (key === 'd') inputRef.current.right = true;
      if (key === 'shift') inputRef.current.run = true;
      if (key === ' ') inputRef.current.jump = true;
      // Prevent scrolling
      if (['w','a','s','d',' '].includes(key)) {
        // Don't prevent if typing in input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          // e.preventDefault();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.current.forward = false;
      if (key === 's') inputRef.current.backward = false;
      if (key === 'a') inputRef.current.left = false;
      if (key === 'd') inputRef.current.right = false;
      if (key === 'shift') inputRef.current.run = false;
      if (key === ' ') inputRef.current.jump = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        mouseDeltaRef.current.x += e.movementX;
        mouseDeltaRef.current.y += e.movementY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mouseButtonsRef.current.left = true;
      if (e.button === 2) mouseButtonsRef.current.right = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseButtonsRef.current.left = false;
      if (e.button === 2) mouseButtonsRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const consumeMouseDelta = () => {
    const delta = { ...mouseDeltaRef.current };
    mouseDeltaRef.current.x = 0;
    mouseDeltaRef.current.y = 0;
    return delta;
  };

  return { inputRef, mouseDeltaRef, mouseButtonsRef, consumeMouseDelta };
}
