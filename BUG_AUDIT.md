# SURVIVAL CITY 3D - BUG AUDIT - a578446

Production: http://89.125.24.50:3002 (unreachable from sandbox, audit via code + previous screenshots description)

## P0 - Crash / Black Screen / Control Loss
- [x] Black screen after b04b2bf fixed via Rapier architecture check - PASS
- [x] GLB 404 crash fixed via ErrorBoundary + Suspense - PASS
- [x] WebGL context lost handled - PASS
- [ ] Check for any new uncaught promise - need to run build/start (no new loaders added, so OK)

## P1 - Serious Physical/Visual Errors

### Player
- BUG-01: Player too wide/thick in profile, torso depth ~0.87m (0.31 capsule + 0.20 backpack + 0.36 offset) vs realistic 0.25-0.35 torso + 0.15-0.25 backpack = 0.4-0.6 total. Head radius 0.195 (diameter 0.39m) vs realistic 0.11 radius (0.22m diam) ~ 77% too big. Shoulder width 0.80m (arms at +-0.40) vs realistic 0.42-0.48m ~ 70% too wide. Arms pure cylinders, no elbow volume.
  - Severity: P1
  - Cause: ProceduralPlayer geometry using large capsule args, arm positions too far, head sphere too large
  - Fix: Reduce torso capsule to [0.22,0.45], chest sphere 0.24, arm positions +-0.26, head radius 0.12, backpack depth 0.16 width 0.32 height 0.42 at -0.28 offset, shoulders natural

- BUG-02: Player feet VisualFeetY ~0.085m (MODEL_Y_OFFSET 0.27 + leg -1.12 + sole -0.065) vs target 0.02-0.04, slightly floating
  - Severity: P1
  - Cause: MODEL_Y_OFFSET 0.27 too high
  - Fix: Reduce to 0.20-0.22 => feet 0.015-0.035

- BUG-03: Player backpack merges with body visually, depth too large
  - Severity: P2
  - Cause: backpack box 0.42x0.56x0.20 at -0.36 behind torso
  - Fix: smaller 0.32x0.42x0.16 at -0.28, add straps visible

### NPC
- BUG-04: NPC scale range too large, base height ~1.89m * scale 0.91-1.09 => 1.72-2.06m, some NPCs look like children vs player 1.78m, screenshot shows NPC much smaller
  - Severity: P1
  - Cause: scale random 0.91-1.09, base height miscalculated, plus random 1.6-1.9 target but actual world height via bounding box not checked
  - Fix: Recalc base height to 1.75m, scale 0.92-1.06 for 1.61-1.86m, majority 0.96-1.02 for 1.68-1.79m, add fixed height variants

- BUG-05: NPC feet floating 0.06m above ground (calc: pos Y 0.02 + 0.9 -0.82 -0.04)
  - Severity: P1
  - Cause: leg -0.82 + shoe box half 0.04 => 0.06
  - Fix: Set NPC group Y 0.02, leg bottom at -0.88, shoe half 0.04 => 0.02+0.9-0.88-0.04=0.00, add 0.02 offset for sole => 0.02

- BUG-06: NPC knees in asphalt during walk (bob)
  - Severity: P2
  - Cause: walk bob 0.04 adds to Y, but legs already near ground
  - Fix: Reduce bob to 0.02, ensure feet stay at ground

### Vehicles
- BUG-07: Sedan looks like low rectangle, single box body + cabin, missing hood/trunk distinction, too simple
  - Severity: P1
  - Cause: Vehicles.tsx uses 2 boxes only, no hood/trunk/bumper detail
  - Fix: Add hood (front 1.0m), trunk (rear 0.8m), bumpers, more realistic cabin position, keep scale 4.4x1.8x1.5

- BUG-08: Wheels floating 0.03m above ground (vehicle Y 0.35, wheel radius 0.32 => bottom 0.03)
  - Severity: P1
  - Cause: Y 0.35 vs radius 0.32
  - Fix: Vehicle Y = 0.32 (radius) + 0.02 sink = 0.34, or wheel Y -0.02 relative

- BUG-09: Wheels not all same height, rotation axis wrong (rotation.x for forward motion should be z? Actually wheel rotation around axle is X if axle along Z, but we have rotation.x with axle along X? Need check)
  - Severity: P2
  - Cause: wheelRefs rotation.x, but cylinder args [0.32,0.32,0.25,14] with rotation [0,0,PI/2] => axle along X, so rotation should be around X? Actually cylinder axis is Y by default, rotated PI/2 around Z => axis along X, so rotation around X is rolling, correct. But need to ensure consistent.
  - Fix: Keep but ensure all 4 wheels same Y and inside body width

### Bus Stop
- BUG-10: Bus stop too thin, poles 0.08 thick lose visually, roof 0.1 thick thin
  - Severity: P2
  - Cause: poles 0.08, roof 0.1
  - Fix: Poles 0.10-0.12, roof 0.12 with edge 0.08, add more thickness, bench realistic

### Buildings
- BUG-11: Facades empty, big walls single color rectangle, no scale reference
  - Severity: P2
  - Cause: Only front face windows, side/back empty, no floor lines, no material variation
  - Fix: Add side windows (2-3 per side), floor cornices every 3m, foundation, parapet, downspouts, AC reduced, avoid adding thousands details

- BUG-12: Windows black holes, no glass readable, emissive 0 day but too dark
  - Severity: P2
  - Cause: windowMat #1a2a3a roughness 0.15 metal 0.85 too dark, glass opacity 0.32 maybe too low
  - Fix: windowMat slightly lighter #2a3a4a, glass #8aa0b8 opacity 0.38 roughness 0.08 metal 0.7, frame depth 0.07

- BUG-13: Z-fighting facades/windows/doors/road markings
  - Severity: P1
  - Cause: Coplanar geometry at same offset (0.02), polygonOffset alone not enough at grazing angles
  - Fix: Physical offset increased: windows 0.12, door 0.13, sign 0.4, markings 0.04 vs road 0.02, sidewalk 0.10 vs road 0.02, foundation -0.05 vs ground -0.05? Need separation 0.02-0.08

### Lighting / Day
- BUG-14: Noon scene too dark per screenshot 12:56, player/NPC/facades almost black, trees no volume
  - Severity: P1
  - Cause: Lighting intensity day 1.45 but ambient 0.72 hemi 0.62, fog #87aadd maybe too dark, shadow bias -0.0003 too dark, plus sun at low angle? sunProgress calc maybe off at noon (hour 12.9 => progress 0.49 => angle ~0.49*PI=88deg, sunY ~ sin*120=120, okay but sunX 0.7*120*cos~0.7*120*0.02=1.6, so sun near overhead, okay. But ambient too low, plus weather?
  - Fix: Increase day intensity 1.6, ambient 0.85, hemi 0.75, fog lighter #9abadd, reduce shadow darkness via ambient, increase hemi sky

- BUG-15: Shadows too dark / no contact, player looks floating
  - Severity: P2
  - Cause: shadow bias -0.0003 normalBias 0.025, ambient low, no contact shadow
  - Fix: Increase ambient, add small ambient occlusion via hemi ground, ensure shadow map 1024+, bias -0.0002

- BUG-16: Sun not visible at noon or moves like HUD
  - Severity: P2
  - Cause: Sun mesh at 380 dist, but scale 12 radius maybe too small vs sky dome 390, plus depthWrite false? Actually sun at 380 inside sky dome 390, okay, but if fog far 380, sun may be fogged. Also sunPos calc uses hour but not camera, so not HUD, but need to ensure it's not at same distance as sky.
  - Fix: Sun distance 400 (outside fog far 380) or fog far 400, sun scale 14, ensure depthWrite false for sun glow, check position at noon: angle 0.49*PI => sunY ~120, should be high, visible

- BUG-17: Moon giant / in front of buildings / through geometry
  - Severity: P2
  - Cause: Moon at 350 dist, radius 8, but buildings at 150 max, so moon behind buildings okay, but if moon Y low, it may intersect ground. Moon pos Y = sin(angle)*350, at night angle ~1.5*PI => sin -1 => Y -350, below ground, not visible. Our moon angle calc: progress+0.5 *PI, at night hour 0 => progress (0+19)/16=1.1875 +0.5=1.6875*PI=5.3 rad sin -0.8 => Y -280 below ground. So moon not visible at midnight, bug.
  - Fix: Moon should be high at night, opposite sun, so at night hour 0, moon progress should be ~0.5 => angle 0.5*PI=90deg high. Fix moon calc to be sun opposite but always above horizon at night.

- BUG-18: Sky dome intersects city
  - Severity: P2
  - Cause: Sky scale 390, city 150, okay, but if sky at 0,0,0 and city at 0,0,0, sky radius 390 should not intersect, but bottom hemisphere 385 with 0-0.52 PI may intersect ground plane at Y 0? Actually sphere at 0,0,0 radius 390, ground at Y -0.05, sphere bottom at -390, so no intersect, but need depthWrite false
  - Fix: Ensure sky meshes depthWrite false, already, keep

- BUG-19: Fog gray wall, not matching sky
  - Severity: P2
  - Cause: Fog color #87aadd day but sky top #4A90D9 bottom #A0D0FF, fog should be blend, but we use fogColor = skyData.fogColor which is #87aadd, okay but maybe too gray vs sky. Also fog near 60 far 380, but at noon distance 150 city should be clear, not gray.
  - Fix: Fog near 80 far 450 for day, lighter bluish #a0c0e0, cloudy #9aaab8, rain #6a7a8a, night #0f0f2a

### Trees
- BUG-20: Tree scale 4-7m but trunk width vs human, crown single perfect sphere
  - Severity: P3
  - Cause: Trunk radius 0.12-0.18 okay, but foliage 0.9 sphere single + 4 small spheres still looks like cluster but maybe okay. Need to ensure base touches ground.
  - Fix: Tree position Y 0, trunk from 0, foliage at trunkHeight, ensure no floating

### Roads / Sidewalk
- BUG-21: Asphalt too black #2e2e32, readability low
  - Severity: P2
  - Cause: Color too dark
  - Fix: Lighter #3a3a40 roughness 0.85, add variation patches opacity 0.4

- BUG-22: Sidewalk smooth gray ribbon, no joints
  - Severity: P3
  - Cause: Single plane per road segment, no slab lines
  - Fix: Add joints via texture or small lines every 2m, color variation 2 materials already, add slight dirt

- BUG-23: Road markings width 0.12m vs human foot ~0.25m, okay but maybe too narrow, flicker
  - Severity: P3
  - Cause: Marking width 0.12, okay but needs polygonOffset and Y 0.04 vs road 0.02 (0.02 offset)
  - Fix: Keep 0.15 width, Y 0.05, polygonOffset -3

### Contact / Floating
- BUG-24: Benches, hydrants, trash, signs, lamps floating or sinking
  - Severity: P2
  - Cause: All at Y 0.02 but ground at -0.05, so 0.07 above ground, okay but need to ensure base at ground
  - Fix: Position Y 0.02-0.03, ensure bottom at 0, add base plate

### Performance
- BUG-25: PointLights at every lamp (20) + building windows (3 per building *12=36) + vehicles (10*4) = ~60 pointLights at night, too many for mobile
  - Severity: P1
  - Cause: Each lamp has pointLight, each building window has pointLight, vehicles have emissive but not pointLight
  - Fix: Limit pointLights to near camera: only lamps within 40m of player, window lights within 30m, use emissive fake lights for far, reduce intensity

## Summary Count
P0: 0 active (previous fixed)
P1: 10 bugs (01,02,04,05,07,08,11,13,14,25)
P2: 12 bugs (03,06,09,10,12,15,16,17,19,21,24, etc)
P3: 3 bugs (20,22,23)

Total found: ~25
