'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

type NPCVariant = 'man' | 'woman' | 'worker' | 'seller' | 'police' | 'homeless' | 'office' | 'teen';

interface NPCData {
  id: string;
  variant: NPCVariant;
  position: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  scale: number; // world height 1.60-1.90
  waitTime: number;
  route: THREE.Vector3[];
  routeIndex: number;
}

const sharedMaterials = {
  skinLight: new THREE.MeshStandardMaterial({ color: '#e8c4a8', roughness: 0.7, metalness: 0 }),
  skinMid: new THREE.MeshStandardMaterial({ color: '#c99a7a', roughness: 0.75, metalness: 0 }),
  skinDark: new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.8, metalness: 0 }),
  hairBlack: new THREE.MeshStandardMaterial({ color: '#1a1510', roughness: 0.95 }),
  hairBrown: new THREE.MeshStandardMaterial({ color: '#3a2210', roughness: 0.9 }),
  hairBlonde: new THREE.MeshStandardMaterial({ color: '#6a5a3a', roughness: 0.85 }),
  manShirt: new THREE.MeshStandardMaterial({ color: '#3a4a6a', roughness: 0.85, metalness: 0.02 }),
  womanTop: new THREE.MeshStandardMaterial({ color: '#8a5a6a', roughness: 0.85, metalness: 0.02 }),
  worker: new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.9, metalness: 0.02 }),
  seller: new THREE.MeshStandardMaterial({ color: '#5a8a5a', roughness: 0.85 }),
  police: new THREE.MeshStandardMaterial({ color: '#2a3a8a', roughness: 0.8, metalness: 0.05 }),
  homeless: new THREE.MeshStandardMaterial({ color: '#4a4a4a', roughness: 0.95 }),
  office: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.85, metalness: 0.05 }),
  jeans: new THREE.MeshStandardMaterial({ color: '#2f3f5f', roughness: 0.85 }),
  jeansDark: new THREE.MeshStandardMaterial({ color: '#1f2f4f', roughness: 0.9 }),
  pantsBlack: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
  skirt: new THREE.MeshStandardMaterial({ color: '#4a3a4a', roughness: 0.85 }),
  sneakersWhite: new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.7, metalness: 0.05 }),
  sneakersBlack: new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.85 }),
  shoesBrown: new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 }),
  policeHat: new THREE.MeshStandardMaterial({ color: '#1a2a6a', roughness: 0.8 }),
};

function variantToMaterials(v: NPCVariant) {
  switch(v) {
    case 'man': return { torso: sharedMaterials.manShirt, legs: sharedMaterials.jeans, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBrown, shoes: sharedMaterials.sneakersWhite };
    case 'woman': return { torso: sharedMaterials.womanTop, legs: sharedMaterials.skirt, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBlonde, shoes: sharedMaterials.sneakersBlack };
    case 'worker': return { torso: sharedMaterials.worker, legs: sharedMaterials.jeansDark, skin: sharedMaterials.skinMid, hair: sharedMaterials.hairBlack, shoes: sharedMaterials.shoesBrown };
    case 'seller': return { torso: sharedMaterials.seller, legs: sharedMaterials.pantsBlack, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBrown, shoes: sharedMaterials.sneakersWhite };
    case 'police': return { torso: sharedMaterials.police, legs: sharedMaterials.pantsBlack, skin: sharedMaterials.skinMid, hair: sharedMaterials.hairBlack, shoes: sharedMaterials.sneakersBlack };
    case 'homeless': return { torso: sharedMaterials.homeless, legs: sharedMaterials.jeansDark, skin: sharedMaterials.skinDark, hair: sharedMaterials.hairBlack, shoes: sharedMaterials.sneakersBlack };
    case 'office': return { torso: sharedMaterials.office, legs: sharedMaterials.pantsBlack, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBlack, shoes: sharedMaterials.shoesBrown };
    case 'teen': return { torso: sharedMaterials.manShirt, legs: sharedMaterials.jeans, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBlonde, shoes: sharedMaterials.sneakersWhite };
    default: return { torso: sharedMaterials.manShirt, legs: sharedMaterials.jeans, skin: sharedMaterials.skinLight, hair: sharedMaterials.hairBrown, shoes: sharedMaterials.sneakersWhite };
  }
}

function createNPCs(count: number): NPCData[] {
  const variants: NPCVariant[] = ['man','woman','worker','seller','police','homeless','office','teen'];
  const npcs: NPCData[] = [];
  for (let i=0;i<count;i++) {
    const variant = variants[Math.floor(Math.random()*variants.length)];
    const angle = Math.random()*Math.PI*2;
    const dist = Math.random()*80+20;
    const x = Math.cos(angle)*dist;
    const z = Math.sin(angle)*dist;
    const route: THREE.Vector3[] = [];
    const routeLen = 3 + Math.floor(Math.random()*3);
    for (let r=0;r<routeLen;r++) {
      route.push(new THREE.Vector3(
        x + (Math.random()-0.5)*40,
        0,
        z + (Math.random()-0.5)*40
      ));
    }
    // Realistic adult 1.60-1.90, majority 1.68-1.85
    // Base height 1.75m, scale 0.92-1.08 = 1.61-1.89
    // Use 70% majority 0.96-1.03 = 1.68-1.80
    let heightScale: number;
    if (Math.random() < 0.7) {
      heightScale = 0.96 + Math.random()*0.07; // 1.68-1.80 majority
    } else {
      heightScale = 0.92 + Math.random()*0.16; // full range 1.61-1.89
    }
    npcs.push({
      id: `npc-${i}`,
      variant,
      position: new THREE.Vector3(x,0,z),
      target: route[0].clone(),
      speed: 0.5 + Math.random()*1.2,
      scale: heightScale,
      waitTime: 0,
      route,
      routeIndex: 0,
    });
  }
  return npcs;
}

function NPC({ data }: { data: NPCData }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random()*100);

  const mats = useMemo(() => variantToMaterials(data.variant), [data.variant]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    let isWalking = false;
    if (data.waitTime > 0) {
      data.waitTime -= delta;
    } else {
      const dir = new THREE.Vector3().subVectors(data.target, data.position);
      const dist = dir.length();
      if (dist < 1) {
        data.routeIndex = (data.routeIndex + 1) % data.route.length;
        data.target.copy(data.route[data.routeIndex]);
        if (Math.random()<0.3) data.waitTime = Math.random()*3+1;
      } else {
        dir.normalize();
        const move = dir.multiplyScalar(data.speed * delta);
        data.position.add(move);
        const angle = Math.atan2(dir.x, dir.z);
        groupRef.current.rotation.y = angle;
        isWalking = true;
      }
    }

    groupRef.current.position.copy(data.position);
    groupRef.current.position.y = 0; // base at ground, feet calc ensures 0.02

    if (torsoRef.current) {
      if (isWalking) {
        const freq = data.speed * 5;
        const legSwing = Math.sin(timeRef.current * freq) * 0.45;
        const armSwing = Math.sin(timeRef.current * freq) * 0.35;
        const bob = Math.abs(Math.sin(timeRef.current * freq)) * 0.02; // reduced bob to avoid knee in asphalt
        if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
        if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -armSwing;
        if (rightArmRef.current) rightArmRef.current.rotation.x = armSwing;
        torsoRef.current.position.y = 0.88 + bob;
      } else {
        const bob = Math.sin(timeRef.current * 0.8) * 0.006;
        torsoRef.current.position.y = 0.88 + bob;
        if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, delta*3);
        if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, delta*3);
        if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, delta*3);
        if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, delta*3);
      }
    }
  });

  const isPolice = data.variant === 'police';

  // Realistic 1.75m base: torso 0.88, legs 0.85, foot -0.81, shoe half 0.04 => feet 0.02
  return (
    <group ref={groupRef} scale={data.scale}>
      <group ref={torsoRef} position={[0, 0.88, 0]}>
        <mesh castShadow position={[0, 0.26, 0]}>
          <capsuleGeometry args={[0.19, 0.36, 6, 10]} />
          <primitive object={mats.torso} attach="material" />
        </mesh>
        <group position={[0, 0.60, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.115, 14, 14]} />
            <primitive object={mats.skin} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, -0.01]} castShadow>
            <sphereGeometry args={[0.12, 12, 12, 0, Math.PI*2, 0, Math.PI*0.6]} />
            <primitive object={mats.hair} attach="material" />
          </mesh>
          {isPolice && (
            <mesh position={[0, 0.10, 0]} castShadow>
              <cylinderGeometry args={[0.125, 0.125, 0.06, 12]} />
              <primitive object={sharedMaterials.policeHat} attach="material" />
            </mesh>
          )}
        </group>
        <group ref={leftArmRef} position={[-0.24, 0.32, 0]}>
          <mesh castShadow><sphereGeometry args={[0.055, 8, 8]} /><primitive object={mats.torso} attach="material" /></mesh>
          <mesh position={[0, -0.14, 0]} castShadow><capsuleGeometry args={[0.045, 0.22, 4, 8]} /><primitive object={mats.torso} attach="material" /></mesh>
          <mesh position={[0, -0.32, 0]} castShadow><sphereGeometry args={[0.04, 8, 8]} /><primitive object={mats.skin} attach="material" /></mesh>
        </group>
        <group ref={rightArmRef} position={[0.24, 0.32, 0]}>
          <mesh castShadow><sphereGeometry args={[0.055, 8, 8]} /><primitive object={mats.torso} attach="material" /></mesh>
          <mesh position={[0, -0.14, 0]} castShadow><capsuleGeometry args={[0.045, 0.22, 4, 8]} /><primitive object={mats.torso} attach="material" /></mesh>
          <mesh position={[0, -0.32, 0]} castShadow><sphereGeometry args={[0.04, 8, 8]} /><primitive object={mats.skin} attach="material" /></mesh>
        </group>
      </group>
      {/* Legs - feet Y = groupY(0) + legY(0.85) + footOffset(-0.81) - shoeHalf(0.04) = 0.00, +0.02 sole = 0.02 */}
      <group ref={leftLegRef} position={[-0.10, 0.85, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={mats.legs} attach="material" /></mesh>
        <mesh castShadow position={[0, -0.44, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={mats.legs} attach="material" /></mesh>
        <mesh castShadow position={[0, -0.81, 0.03]}><boxGeometry args={[0.10, 0.07, 0.20]} /><primitive object={mats.shoes} attach="material" /></mesh>
      </group>
      <group ref={rightLegRef} position={[0.10, 0.85, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={mats.legs} attach="material" /></mesh>
        <mesh castShadow position={[0, -0.44, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={mats.legs} attach="material" /></mesh>
        <mesh castShadow position={[0, -0.81, 0.03]}><boxGeometry args={[0.10, 0.07, 0.20]} /><primitive object={mats.shoes} attach="material" /></mesh>
      </group>
    </group>
  );
}

export function NPCs() {
  const settings = useGameStore((s) => s.settings);
  const count = settings.graphics === 'low' ? 5 : settings.graphics === 'medium' ? 10 : 16;
  const npcs = useMemo(() => createNPCs(count), [count]);

  return (
    <group>
      {npcs.map((npc) => (
        <NPC key={npc.id} data={npc} />
      ))}
    </group>
  );
}

export function StaticNPCs() {
  return (
    <group>
      <group position={[45, 0, -32]} scale={0.98}>
        <group position={[0, 0.88, 0]}>
          <mesh castShadow position={[0, 0.26, 0]}><capsuleGeometry args={[0.19, 0.36, 6, 10]} /><primitive object={sharedMaterials.seller} attach="material" /></mesh>
          <group position={[0, 0.60, 0]}>
            <mesh castShadow><sphereGeometry args={[0.115, 14, 14]} /><primitive object={sharedMaterials.skinLight} attach="material" /></mesh>
          </group>
        </group>
        <mesh castShadow position={[-0.10, 0.04, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={sharedMaterials.pantsBlack} attach="material" /></mesh>
        <mesh castShadow position={[0.10, 0.04, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={sharedMaterials.pantsBlack} attach="material" /></mesh>
      </group>

      <group position={[-85, 0, 35]} scale={1.02}>
        <group position={[0, 0.88, 0]}>
          <mesh castShadow position={[0, 0.26, 0]}><capsuleGeometry args={[0.20, 0.38, 6, 10]} /><primitive object={sharedMaterials.worker} attach="material" /></mesh>
          <group position={[0, 0.60, 0]}>
            <mesh castShadow><sphereGeometry args={[0.115, 14, 14]} /><primitive object={sharedMaterials.skinMid} attach="material" /></mesh>
          </group>
        </group>
        <mesh castShadow position={[-0.10, 0.04, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={sharedMaterials.jeansDark} attach="material" /></mesh>
        <mesh castShadow position={[0.10, 0.04, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={sharedMaterials.jeansDark} attach="material" /></mesh>
      </group>

      <group position={[70, 0, -12]} scale={0.96}>
        <group position={[0, 0.88, 0]}>
          <mesh castShadow position={[0, 0.26, 0]}><capsuleGeometry args={[0.18, 0.34, 6, 10]} /><primitive object={sharedMaterials.womanTop} attach="material" /></mesh>
          <group position={[0, 0.60, 0]}>
            <mesh castShadow><sphereGeometry args={[0.11, 14, 14]} /><primitive object={sharedMaterials.skinLight} attach="material" /></mesh>
          </group>
        </group>
        <mesh castShadow position={[-0.10, 0.04, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={sharedMaterials.skirt} attach="material" /></mesh>
        <mesh castShadow position={[0.10, 0.04, 0]}><capsuleGeometry args={[0.07, 0.28, 4, 8]} /><primitive object={sharedMaterials.skirt} attach="material" /></mesh>
      </group>

      <group position={[90, 0, 63]} scale={1.03}>
        <group position={[0, 0.88, 0]}>
          <mesh castShadow position={[0, 0.26, 0]}><capsuleGeometry args={[0.20, 0.38, 6, 10]} /><primitive object={sharedMaterials.police} attach="material" /></mesh>
          <group position={[0, 0.60, 0]}>
            <mesh castShadow><sphereGeometry args={[0.115, 14, 14]} /><primitive object={sharedMaterials.skinMid} attach="material" /></mesh>
            <mesh position={[0, 0.10, 0]} castShadow><cylinderGeometry args={[0.125, 0.125, 0.06, 12]} /><primitive object={sharedMaterials.policeHat} attach="material" /></mesh>
          </group>
        </group>
        <mesh castShadow position={[-0.10, 0.04, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={sharedMaterials.pantsBlack} attach="material" /></mesh>
        <mesh castShadow position={[0.10, 0.04, 0]}><capsuleGeometry args={[0.08, 0.28, 4, 8]} /><primitive object={sharedMaterials.pantsBlack} attach="material" /></mesh>
      </group>
    </group>
  );
}
