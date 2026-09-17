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
  debug: boolean;
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
    debug: false,
  });

  const mouseDeltaRef = useRef({ x: 0, y: 0 });
  const mouseButtonsRef = useRef({ left: false, right: false });

  useEffect(() => {
    console.log('[Input] Controls initialized with event.code (layout independent) - window listeners, useRef, no rerender recreation');

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const target = e.target as HTMLElement;
      // Don't handle if typing in input/textarea
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // Use event.code for layout independence ENG/RUS
      let isGameKey = false;

      if (code === 'KeyW') { inputRef.current.forward = true; isGameKey = true; }
      if (code === 'KeyS') { inputRef.current.backward = true; isGameKey = true; }
      if (code === 'KeyA') { inputRef.current.left = true; isGameKey = true; }
      if (code === 'KeyD') { inputRef.current.right = true; isGameKey = true; }
      
      if (code === 'ArrowUp') { inputRef.current.forward = true; isGameKey = true; }
      if (code === 'ArrowDown') { inputRef.current.backward = true; isGameKey = true; }
      if (code === 'ArrowLeft') { inputRef.current.left = true; isGameKey = true; }
      if (code === 'ArrowRight') { inputRef.current.right = true; isGameKey = true; }

      if (code === 'ShiftLeft' || code === 'ShiftRight') { inputRef.current.run = true; isGameKey = true; }
      if (code === 'Space') { inputRef.current.jump = true; }
      if (code === 'KeyE') { inputRef.current.interact = true; }

      if (code === 'F3') {
        e.preventDefault();
        inputRef.current.debug = !inputRef.current.debug;
        (window as any).__showDebug = inputRef.current.debug;
        console.log(`[Input] F3 debug ${inputRef.current.debug ? 'ON' : 'OFF'}`);
        return;
      }

      // Prevent default for game keys when menu closed to avoid page scroll
      if (isGameKey) {
        try {
          const store = (window as any).__gameStore;
          // Check if UI blocking - if not, prevent default for WASD/Arrows/Shift to avoid scrolling
          // We don't have direct access to store here, so check global or just prevent for arrows/space
          if (code.startsWith('Arrow') || code === 'Space') {
            e.preventDefault();
          }
        } catch {}
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false;
      
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.run = false;
      if (code === 'Space') inputRef.current.jump = false;
      if (code === 'KeyE') inputRef.current.interact = false;
    };

    const handleBlur = () => {
      // Reset all keys on window blur to prevent stuck keys
      inputRef.current.forward = false;
      inputRef.current.backward = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.run = false;
      inputRef.current.jump = false;
      inputRef.current.interact = false;
      console.log('[Input] Window blur - reset keys');
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

    // CRITICAL: listen on WINDOW, not canvas, so focus doesn't matter
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Also handle visibility change
    const handleVisibility = () => {
      if (document.hidden) handleBlur();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('visibilitychange', handleVisibility);
      console.log('[Input] Cleanup listeners');
    };
  }, []); // Empty deps - never recreate listeners on render

  const consumeMouseDelta = () => {
    const delta = { ...mouseDeltaRef.current };
    mouseDeltaRef.current.x = 0;
    mouseDeltaRef.current.y = 0;
    return delta;
  };

  return { inputRef, mouseDeltaRef, mouseButtonsRef, consumeMouseDelta };
}
