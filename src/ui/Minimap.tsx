'use client';
import React, { useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS } from '@/game/world/types';

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPos = useGameStore((s) => s.player.position);
  const playerRot = useGameStore((s) => s.player.rotation);
  const isMapOpen = useGameStore((s) => s.isMapOpen);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const scale = 0.8; // pixels per meter
    const center = size / 2;

    // Clear
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, size, size);

    // Grid
    ctx.strokeStyle = '#2a3a2a';
    ctx.lineWidth = 0.5;
    for (let i = -150; i <= 150; i += 20) {
      const x = center + i * scale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
      const y = center + i * scale;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Roads
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 8 * scale;
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(center - 150 * scale, center);
    ctx.lineTo(center + 150 * scale, center);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center - 150 * scale, center + 60 * scale);
    ctx.lineTo(center + 150 * scale, center + 60 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center - 150 * scale, center - 50 * scale);
    ctx.lineTo(center + 150 * scale, center - 50 * scale);
    ctx.stroke();
    // Vertical
    ctx.beginPath();
    ctx.moveTo(center, center - 150 * scale);
    ctx.lineTo(center, center + 150 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center + 60 * scale, center - 150 * scale);
    ctx.lineTo(center + 60 * scale, center + 150 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center - 70 * scale, center - 150 * scale);
    ctx.lineTo(center - 70 * scale, center + 150 * scale);
    ctx.stroke();

    // Buildings
    BUILDINGS.forEach((b) => {
      const bx = center + b.position[0] * scale;
      const bz = center + b.position[2] * scale;
      const bw = b.size[0] * scale;
      const bh = b.size[2] * scale;

      let color = '#6a6a6a';
      if (b.type === 'shop') color = '#ffcc00';
      if (b.type === 'shelter') color = '#8a8a7a';
      if (b.type === 'warehouse') color = '#5a5a5a';
      if (b.type === 'cafe') color = '#c4956a';
      if (b.type === 'police') color = '#4a6a8a';
      if (b.type === 'medical') color = '#ff4444';

      ctx.fillStyle = color;
      ctx.fillRect(bx - bw/2, bz - bh/2, bw, bh);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - bw/2, bz - bh/2, bw, bh);
    });

    // Player
    const px = center + playerPos[0] * scale;
    const pz = center + playerPos[2] * scale;
    
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(playerRot);
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Player dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, pz, 3, 0, Math.PI * 2);
    ctx.fill();

  }, [playerPos, playerRot]);

  if (isMapOpen) {
    return (
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
        <div className="bg-[#1e1e1e] border border-[#444] rounded-lg p-4 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Карта района [M]</h2>
            <button onClick={() => useGameStore.getState().setMapOpen(false)} className="px-3 py-1 bg-[#333] rounded">Закрыть</button>
          </div>
          <canvas ref={canvasRef} width={400} height={400} className="border border-[#333] rounded" />
          <div className="mt-3 text-xs text-gray-400 grid grid-cols-2 gap-2">
            <div><span className="inline-block w-3 h-3 bg-[#ffcc00] mr-1"></span> Магазин</div>
            <div><span className="inline-block w-3 h-3 bg-[#8a8a7a] mr-1"></span> Ночлежка</div>
            <div><span className="inline-block w-3 h-3 bg-[#5a5a5a] mr-1"></span> Склад</div>
            <div><span className="inline-block w-3 h-3 bg-[#c4956a] mr-1"></span> Кафе</div>
            <div><span className="inline-block w-3 h-3 bg-[#4a6a8a] mr-1"></span> Полиция</div>
            <div><span className="inline-block w-3 h-3 bg-[#ff4444] mr-1"></span> Медпункт</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 pointer-events-auto">
      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
        <canvas ref={canvasRef} width={150} height={150} className="rounded" />
        <button
          onClick={() => useGameStore.getState().setMapOpen(true)}
          className="w-full mt-2 py-1 bg-[#333] hover:bg-[#444] rounded text-xs text-white"
        >
          Карта [M]
        </button>
      </div>
    </div>
  );
}
