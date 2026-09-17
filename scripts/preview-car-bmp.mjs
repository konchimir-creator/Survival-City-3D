// Rasterizes point-cloud projections of the car mesh into BMP images (side X-Y and top X-Z).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, writeFileSync } from 'fs';

const SRC = 'public/models/vehicles/sports_car_src.glb';
const buf = readFileSync(SRC);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
let binStart = 20 + jsonLen; const binLen = buf.readUInt32LE(binStart); binStart += 8;
delete json.images; delete json.textures; delete json.samplers;
for (const m of json.materials || []) {
  delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture;
  if (m.pbrMetallicRoughness) { delete m.pbrMetallicRoughness.baseColorTexture; delete m.pbrMetallicRoughness.metallicRoughnessTexture; }
}
let js = JSON.stringify(json); while (js.length % 4) js += ' ';
const jbuf = Buffer.from(js);
const bin = buf.subarray(binStart, binStart + binLen);
const out = Buffer.alloc(12 + 8 + jbuf.length + 8 + bin.length);
out.write('glTF', 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
out.writeUInt32LE(jbuf.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jbuf.copy(out, 20);
out.writeUInt32LE(bin.length, 20 + jbuf.length); out.writeUInt32LE(0x004e4942, 24 + jbuf.length); bin.copy(out, 28 + jbuf.length);

function writeBMP(path, W, H, plot) {
  const rowSize = Math.ceil((W * 3) / 4) * 4;
  const data = Buffer.alloc(rowSize * H, 255);
  const px = (x, y, r = 0, g = 0, b = 0) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = y * rowSize + x * 3;
    data[o] = b; data[o + 1] = g; data[o + 2] = r;
  };
  plot(px);
  const head = Buffer.alloc(54);
  head.write('BM'); head.writeUInt32LE(54 + data.length, 2); head.writeUInt32LE(54, 10);
  head.writeUInt32LE(40, 14); head.writeInt32LE(W, 18); head.writeInt32LE(-H, 22);
  head.writeUInt16LE(1, 26); head.writeUInt16LE(24, 28);
  writeFileSync(path, Buffer.concat([head, data]));
}

const W = 1200, H = 420;
new GLTFLoader().parse(out.buffer.slice(out.byteOffset), '', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  const sidePts = [], topPts = [];
  const v = new THREE.Vector3();
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const pos = obj.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      sidePts.push([v.x, v.y]);
      topPts.push([v.x, v.z]);
    }
  });
  const mapX = (x) => Math.floor(((x + 0.52) / 1.04) * W);
  const mapSideY = (y) => Math.floor(H - ((y + 0.18) / 0.38) * H);
  const mapTopZ = (z) => Math.floor(H - ((z + 0.30) / 0.60) * H);
  writeBMP('/tmp/car_side.bmp', W, H, (px) => {
    for (const [x, y] of sidePts) { const xx = mapX(x), yy = mapSideY(y); px(xx, yy); px(xx + 1, yy); px(xx, yy + 1); px(xx + 1, yy + 1); }
  });
  writeBMP('/tmp/car_top.bmp', W, H, (px) => {
    for (const [x, z] of topPts) { const xx = mapX(x), yy = mapTopZ(z); px(xx, yy); px(xx + 1, yy); px(xx, yy + 1); px(xx + 1, yy + 1); }
  });
  console.log('saved side/top bmp, points:', sidePts.length);
}, (e) => { console.error('ERR', e); process.exit(1); });
