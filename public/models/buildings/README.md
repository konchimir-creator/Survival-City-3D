# Buildings 3D Models - Requirements & Structure

## Preferred format
GLB (binary glTF) — compatible with Three.js useGLTF

## World scale
1 Three.js unit = 1 meter

## Up axis
Y-up

## Origin
- Origin at base of building (bottom center), Y=0 at ground contact
- Building sits on ground plane, no floating
- If origin is at center, use yOffset in registry to adjust

## Desired asset properties
- PBR materials: BaseColor, Normal, Roughness, Metalness where needed
- Textures reasonable size: 1K-2K typical, avoid huge 8K textures
- Optimized geometry: reasonable polygon count, no millions tris for single building
- Static mesh: no rig, no animation, no skinning
- No embedded huge textures, use compressed if possible
- Clean UVs, no overlapping for lightmaps if needed
- Real-world dimensions: door 2.0-2.2m, floor ~3m, window ~1.2-1.4m

## Naming scheme
Use clear scheme, no generic names:

abandoned_house_01.glb
abandoned_house_02.glb

residential_01.glb
residential_02.glb

shop_01.glb
shop_02.glb

warehouse_01.glb
warehouse_02.glb

police_station_01.glb
clinic_01.glb

Do NOT use:
model1.glb
test.glb
final123.glb

## Expected paths (prepared, files not created yet)
```
public/models/buildings/abandoned/abandoned_house_01.glb
public/models/buildings/residential/residential_01.glb
public/models/buildings/shops/shop_01.glb
public/models/buildings/industrial/warehouse_01.glb
public/models/buildings/public/police_station_01.glb
```

## Auto-scale utility
Future import should use utility to compute Box3:
- width/height/depth via THREE.Box3
- Log sizes in dev/F3
- Do NOT auto-scale blindly, preserve real proportions
- If model exported in wrong units, use per-asset config scale

## Registry architecture
BuildingAssetDefinition {
  id: string
  url: string (only when file exists)
  scale: [number,number,number] or number
  rotation: number
  yOffset: number
  type: 'abandoned'|'residential'|'shop'|'industrial'|'public'
  collider: 'cuboid' | volumes[]
}

- Do NOT add URL to runtime renderer while file missing (avoid 404)
- Check existence via HEAD fetch before useGLTF
- Fallback to procedural if load fails, never black screen

## Collider
- Visual GLB must NOT auto-create complex MeshCollider
- Use simple physics: CuboidCollider or few simple volumes
- Better performance

## LOD (future)
- near: real GLB
- far: low-poly box or simplified geometry
- Do not implement heavy LOD system now if model absent

## License
See ASSET_LICENSES.md — fill for each real asset, do not claim license until provided

## Current status
No real building GLBs yet — using procedural Buildings.tsx fallback
Prepared folders with READMEs so Git keeps empty dirs
