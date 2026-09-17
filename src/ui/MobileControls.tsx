'use client';
import React, { useRef, useEffect, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

function VirtualJoystick({ onMove, onEnd }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (activeRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      activeRef.current = true;
      touchIdRef.current = touch.identifier;
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      let touch: Touch | undefined;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) touch = e.touches[0];
      if (!touch || !container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      let dx = touch.clientX - centerX;
      let dy = touch.clientY - centerY;
      
      const maxDist = rect.width / 2 - 20;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      // Normalize to -1..1, invert Y for forward
      const x = dx / maxDist;
      const y = -dy / maxDist; // forward is positive

      onMove(x, y);
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!activeRef.current) return;
      
      let found = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        activeRef.current = false;
        touchIdRef.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        onEnd();
      }
      e.preventDefault();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMove, onEnd]);

  return (
    <div
      ref={containerRef}
      className="w-28 h-28 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm relative touch-none select-none"
    >
      <div
        ref={knobRef}
        className="w-12 h-12 rounded-full bg-white/30 border border-white/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 touch-none transition-transform duration-75"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
      </div>
    </div>
  );
}

function TouchCamera({ onCameraMove }: { onCameraMove: (dx: number, dy: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && lastPosRef.current) {
        const touch = e.touches[0];
        const dx = touch.clientX - lastPosRef.current.x;
        const dy = touch.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: touch.clientX, y: touch.clientY };
        onCameraMove(dx, dy);
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      lastPosRef.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onCameraMove]);

  return (
    <div ref={ref} className="w-full h-full touch-none select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-xs pointer-events-none">
        CAMERA
      </div>
    </div>
  );
}

export function MobileControls() {
  const [isMobile, setIsMobile] = useState(false);
  const joystickRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768 
        || ('ontouchstart' in window);
      setIsMobile(mobile);
      
      if (mobile) {
        // Auto set LOW quality for mobile
        const { useGameStore } = require('@/store/gameStore');
        const store = useGameStore.getState();
        if (store.settings.graphics !== 'low') {
          store.setGraphics('low');
          console.log('[Mobile] Auto set LOW graphics for mobile device');
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleJoystickMove = (x: number, y: number) => {
    joystickRef.current = { x, y };
    // Update global input for Player
    const input = (window as any).__mobileInput || {};
    input.joyX = x;
    input.joyY = y;
    (window as any).__mobileInput = input;
  };

  const handleJoystickEnd = () => {
    joystickRef.current = { x: 0, y: 0 };
    const input = (window as any).__mobileInput || {};
    input.joyX = 0;
    input.joyY = 0;
    (window as any).__mobileInput = input;
  };

  const handleCameraMove = (dx: number, dy: number) => {
    // Update camera yaw/pitch via globals
    if (typeof window !== 'undefined') {
      (window as any).__cameraYaw = ((window as any).__cameraYaw || 0) - dx * 0.005;
      // Pitch handled via separate global
      const currentPitch = (window as any).__cameraPitch || 0.25;
      const newPitch = Math.max(-0.4, Math.min(0.75, currentPitch - dy * 0.005));
      (window as any).__cameraPitch = newPitch;
      
      // Also update the pitchRef in CameraController via event
      window.dispatchEvent(new CustomEvent('mobileCamera', { detail: { dx, dy } }));
    }
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Left joystick */}
      <div className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] left-[20px] z-30 pointer-events-auto">
        <VirtualJoystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
        <div className="text-[10px] text-white/40 text-center mt-1">MOVE</div>
      </div>

      {/* Right camera area */}
      <div className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] right-[20px] top-[20%] w-[35%] z-30 pointer-events-auto">
        <div className="w-full h-full rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <TouchCamera onCameraMove={handleCameraMove} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-[calc(160px+env(safe-area-inset-bottom))] right-[20px] flex flex-col gap-3 z-30 pointer-events-auto">
        <button
          onTouchStart={() => {
            const input = (window as any).__mobileInput || {};
            input.run = true;
            (window as any).__mobileInput = input;
          }}
          onTouchEnd={() => {
            const input = (window as any).__mobileInput || {};
            input.run = false;
            (window as any).__mobileInput = input;
          }}
          className="w-16 h-16 rounded-full bg-yellow-600/80 border border-yellow-400/50 backdrop-blur-sm text-white font-bold text-xs active:bg-yellow-500/80 select-none touch-none"
        >
          RUN
        </button>
        <button
          onTouchStart={() => {
            // Trigger E interaction
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
            setTimeout(() => {
              window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }));
            }, 100);
          }}
          className="w-16 h-16 rounded-full bg-green-600/80 border border-green-400/50 backdrop-blur-sm text-white font-bold text-sm active:bg-green-500/80 select-none touch-none"
        >
          E
        </button>
      </div>
    </>
  );
}
