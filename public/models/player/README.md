# Player GLB Model Requirements

## Status: Нужен файл player.glb

Currently no GLB file present - using PROCEDURAL fallback (improved humanoid).
This file documents requirements for future integration.

## Required file
```
public/models/player/player.glb
```

## Model specifications
- Type: rigged humanoid, stylized realistic, urban survival
- Character: young man 1.78m, normal proportions, not Roblox/Minecraft/chibi/voxel/superhero/muscular
- Appearance: dark worn hoodie, faded jeans, cheap sneakers, old backpack, neat hair, poor but not caricature
- Scale: 1.78m height, Y up, forward +Z
- Skeleton: hips, spine, chest, neck, head, upper/lower arms, hands, upper/lower legs, feet (required bones)
- Root: separate transform, no root motion, in-place animations only
- PBR materials: sRGB, normal, roughness, metalness - skin non-metallic (0), clothes rough (0.9), sneakers not chrome (metalness 0.05)

## Animations required minimum
- Idle (breathing subtle)
- Walk (3.5 m/s sync)
- Run (6.0 m/s sync)

Desirable additional:
- Carry, Sit, Eat, Drink, Sleep, Work

## Technical requirements
- Format: GLB (binary glTF) compatible with Three.js useGLTF + useAnimations
- Animations: separate clips, loopable, in-place (no root motion)
- Shadows: castShadow true, not blob shadow
- Backpack: attached to skeleton/torso bone, not floating
- Feet: soles Y ≈ ground+0.02m after visual offset, recalc offset only visual, ground/capsule unchanged
- Performance: no per-frame material clone, GLTF preload, dispose on unmount
- Mobile: LOW quality DPR1 shadows off, keep model not cube

## Loader safety (implemented)
- <GLBPlayer/> and <ProceduralPlayer/> split, no conditional hooks
- useGLTF called unconditionally inside GLBPlayer
- ErrorBoundary + Suspense fallback to procedural, no black screen if missing/corrupted
- 404 must not break Canvas/Suspense
- Renderer indicator in F3: GLB/PROCEDURAL, Animation state, speed, VisualFeetY, Skeleton loaded

## Current implementation
- ProceduralPlayer.tsx: improved fallback with natural shoulders, arm proportions, hands, knees, shoes, head, hoodie, backpack
- GLBPlayer.tsx: safe loader with crossfade 0.15-0.3s, timeScale synced to walk 3.5 run 6, no foot sliding, no root motion
- PlayerRenderer.tsx: HEAD check for file existence, chooses GLB or procedural, safe fallback
- PlayerErrorBoundary.tsx: catches GLB errors, fallback to procedural

## Verification checklist (when GLB added)
- Idle breathing subtle
- W walk, Shift+W run, release idle
- A/D rotation visual
- W+D diagonal normalized
- Camera turn W forward camera
- Feet not under ground, no floating, no sliding
- 30s physics stable, no fall through
- F3 shows GLB renderer, skeleton YES, animation states

## Legal
- Do NOT download copyrighted models
- Use only legal CC0 or custom-made GLB
- If no legal GLB available, keep procedural and report this file needed
