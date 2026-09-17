// One-off analysis: determine car profile from raw vertices (textures stripped, Node-safe).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';

const buf = readFileSync('public/models/vehicles/sports_car_src.glb');
// Parse GLB container
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
let binStart = 20 + jsonLen;
const binLen = buf.readUInt32LE(binStart);
binStart += 8;
// Strip texture refs so GLTFLoader never touches browser image APIs
delete json.images;
delete json.textures;
delete json.samplers;
for (const m of json.materials || []) {
  delete m.normalTexture;
  delete m.occlusionTexture;
  delete m.emissiveTexture;
  if (m.pbrMetallicRoughness) {
    delete m.pbrMetallicRoughness.baseColorTexture;
    delete m.pbrMetallicRoughness.metallicRoughnessTexture;
  }
}
let jsonStr = JSON.stringify(json);
while (jsonStr.length % 4 !== 0) jsonStr += ' ';
const jbuf = Buffer.from(jsonStr, 'utf8');
const bin = buf.subarray(binStart, binStart + binLen);
const total = 12 + 8 + jbuf.length + 8 + bin.length;
const out = Buffer.alloc(total);
out.write('glTF', 0);
out.writeUInt32LE(2, 4);
out.writeUInt32LE(total, 8);
out.writeUInt32LE(jbuf.length, 12);
out.writeUInt32LE(0x4e4f534a, 16); // JSON
jbuf.copy(out, 20);
let o = 20 + jbuf.length;
out.writeUInt32LE(bin.length, o);
out.writeUInt32LE(0x004e4942, o + 4); // BIN
bin.copy(out, o + 8);

const loader = new GLTFLoader();
loader.parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), '', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  const bins = 20;
  const minX = -0.5, maxX = 0.5;
  const maxY = new Array(bins).fill(-Infinity);
  const sumY = new Array(bins).fill(0);
  const cnt = new Array(bins).fill(0);
  const minY = new Array(bins).fill(Infinity);
  const v = new THREE.Vector3();
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const pos = obj.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      const b = Math.min(bins - 1, Math.floor(((v.x - minX) / (maxX - minX)) * bins));
      maxY[b] = Math.max(maxY[b], v.y);
      minY[b] = Math.min(minY[b], v.y);
      sumY[b] += v.y;
      cnt[b]++;
    }
  });
  console.log('slices along X (-0.5 -> +0.5): maxY / meanY / minY');
  for (let b = 0; b < bins; b++) {
    console.log(`x<${(minX + (b + 1) / bins).toFixed(2)} maxY=${maxY[b].toFixed(3)} meanY=${(sumY[b] / cnt[b]).toFixed(3)} minY=${minY[b].toFixed(3)} n=${cnt[b]}`);
  }
}, (e) => { console.error('ERR', e); process.exit(1); });
