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
  const debugToggleRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use event.code to be independent of keyboard layout (ENG/RUS)
      const code = e.code;
      
      // Debug: F3 toggle
      if (code === 'F3') {
        e.preventDefault();
        inputRef.current.debug = !inputRef.current.debug;
        debugToggleRef.current = inputRef.current.debug;
        // Also set global for HUD
        (window as any).__showDebug = inputRef.current.debug;
        return;
      }

      // Movement - using code
      if (code === 'KeyW') inputRef.current.forward = true;
      if (code === 'KeyS') inputRef.current.backward = true;
      if (code === 'KeyA') inputRef.current.left = true;
      if (code === 'KeyD') inputRef.current.right = true;
      
      // Also support Arrow keys as fallback
      if (code === 'ArrowUp') inputRef.current.forward = true;
      if (code === 'ArrowDown') inputRef.current.backward = true;
      if (code === 'ArrowLeft') inputRef.current.left = true;
      if (code === 'ArrowRight') inputRef.current.right = true;

      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.run = true;
      if (code === 'Space') inputRef.current.jump = true;
      if (code === 'KeyE') inputRef.current.interact = true;

      // For compatibility, also check e.key lowercase for non-RUS but keep code as primary
      // This helps if browser doesn't support code (unlikely)
      const key = e.key.toLowerCase();
      if (!code.startsWith('Key') && !code.startsWith('Arrow') && !code.startsWith('Shift') && !code.startsWith('Space')) {
        if (key === 'w') inputRef.current.forward = true;
        if (key === 's') inputRef.current.backward = true;
        if (key === 'a') inputRef.current.left = true;
        if (key === 'd') inputRef.current.right = true;
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

      // Fallback
      const key = e.key.toLowerCase();
      if (key === 'w') inputRef.current.forward = false;
      if (key === 's') inputRef.current.backward = false;
      if (key === 'a') inputRef.current.left = false;
      if (key === 'd') inputRef.current.right = false;
      if (key === 'shift') inputRef.current.run = false;
      if (key === ' ') inputRef.current.jump = false;
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

    console.log('[Input] Controls initialized with event.code (layout independent)');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('visibilitychange', handleVisibility);
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
