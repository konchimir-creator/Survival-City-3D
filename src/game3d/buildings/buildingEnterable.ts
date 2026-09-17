'use client';
import { CuboidCollider } from '@react-three/rapier';
import React from 'react';

export interface DoorConfig {
  facade: 'front' | 'back' | 'left' | 'right';
  offsetX?: number; // offset from center along facade width
  offsetZ?: number;
  visualWidth: number;
  visualHeight: number;
  physicalWidth: number; // 1.4-1.5
  physicalHeight: number; // 2.4
}

export interface EnterableColliderConfig {
  width: number;
  height: number;
  depth: number;
  wallThickness?: number;
  door: DoorConfig;
  floorY?: number; // visual floor Y
  hasRamp?: boolean;
}

export function getEnterableColliders(config: EnterableColliderConfig) {
  const { width, height, depth, wallThickness = 0.35, door, floorY = 0.12 } = config;
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  const frontZ = halfD - wallThickness / 2;
  const backZ = -halfD + wallThickness / 2;
  const leftX = -halfW + wallThickness / 2;
  const rightX = halfW - wallThickness / 2;

  const physicalWidth = door.physicalWidth;
  const physicalHeight = door.physicalHeight;
  const offsetX = door.offsetX || 0;

  // Front facade split
  const frontLeftWidth = halfW + offsetX - physicalWidth / 2 - 0.02;
  const frontRightWidth = halfW - offsetX - physicalWidth / 2 - 0.02;
  const frontLeftHalfW = Math.max(0.1, frontLeftWidth / 2);
  const frontRightHalfW = Math.max(0.1, frontRightWidth / 2);
  const frontLeftCenterX = -halfW + frontLeftHalfW;
  const frontRightCenterX = halfW - frontRightHalfW;

  const topHeight = height - physicalHeight;
  const topHalfH = topHeight / 2;
  const topCenterY = physicalHeight + topHalfH;

  const floorHalfW = halfW - wallThickness;
  const floorHalfD = halfD - wallThickness;
  const floorColliderHalfH = 0.12;
  const floorPhysPosY = floorY - floorColliderHalfH;

  return {
    halfW,
    halfH,
    halfD,
    frontZ,
    backZ,
    leftX,
    rightX,
    frontLeftWidth,
    frontLeftHalfW,
    frontLeftCenterX,
    frontRightHalfW,
    frontRightCenterX,
    topHeight,
    topHalfH,
    topCenterY,
    floorHalfW,
    floorHalfD,
    floorColliderHalfH,
    floorPhysPosY,
    physicalWidth,
    physicalHeight,
    offsetX,
  };
}
