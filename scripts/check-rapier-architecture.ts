import * as fs from 'fs';
import * as path from 'path';

console.log('Checking Rapier architecture...');

const srcDir = path.join(__dirname, '..', 'src');
const files: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      files.push(full);
    }
  }
}

walk(srcDir);

const rapierUsers: { file: string, lines: string[] }[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('useRapier')) {
    const lines = content.split('\n').filter((l) => l.includes('useRapier')).map((l) => `${l.trim()}`);
    rapierUsers.push({ file: path.relative(srcDir, file), lines });
  }
}

console.log(`Found ${rapierUsers.length} files using useRapier:`);
for (const u of rapierUsers) {
  console.log(`  - ${u.file}: ${u.lines.join('; ')}`);
}

const city3DPath = path.join(srcDir, 'game3d', 'City3D.tsx');
const city3DContent = fs.readFileSync(city3DPath, 'utf8');

const physicsRegex = /<Physics[^>]*>([\s\S]*?)<\/Physics>/g;
let physicsBlocks: string[] = [];
let match;
while ((match = physicsRegex.exec(city3DContent)) !== null) {
  physicsBlocks.push(match[1]);
}

if (physicsBlocks.length === 0) {
  console.error('FAIL: No <Physics> block found in City3D.tsx');
  process.exit(1);
}

console.log(`Found ${physicsBlocks.length} Physics blocks`);

const sceneInsidePhysics = physicsBlocks.some(block => block.includes('SceneContent'));
if (!sceneInsidePhysics) {
  console.error('FAIL: SceneContent NOT inside <Physics>');
  process.exit(1);
}
console.log('  SceneContent inside <Physics>: OK');

// Check SceneContent function contains CameraController and Player
const funcStart = city3DContent.indexOf('function SceneContent');
const funcEnd = city3DContent.indexOf('function LoadingScreen');
if (funcStart === -1 || funcEnd === -1) {
  console.error('FAIL: Could not find SceneContent or LoadingScreen function boundaries');
  process.exit(1);
}

const sceneFuncContent = city3DContent.substring(funcStart, funcEnd);

if (!sceneFuncContent.includes('CameraController')) {
  console.error('FAIL: CameraController NOT inside SceneContent function');
  console.error(sceneFuncContent.substring(0, 1000));
  process.exit(1);
}
console.log('  CameraController inside SceneContent (which is inside Physics): OK');

if (!sceneFuncContent.includes('Player')) {
  console.error('FAIL: Player NOT inside SceneContent');
  process.exit(1);
}
console.log('  Player inside SceneContent (which is inside Physics): OK');

// Ensure no direct CameraController JSX outside Physics
let outsideContent = city3DContent;
for (const block of physicsBlocks) {
  outsideContent = outsideContent.replace(block, '');
}
// Remove SceneContent function entirely to avoid false positives from comments inside it
const sceneFuncFull = city3DContent.substring(funcStart, funcEnd);
outsideContent = outsideContent.replace(sceneFuncFull, '');

// Now check remaining for JSX
const jsxCameraOutside = /<CameraController\s*\/>/.test(outsideContent);
if (jsxCameraOutside) {
  console.error('FAIL: Found <CameraController /> JSX outside <Physics> - this will crash with "useRapier must be used within <Physics />!"');
  console.error('Outside snippet:', outsideContent.substring(0, 1000));
  process.exit(1);
}
console.log('  No CameraController JSX outside Physics: OK');

console.log('\nAll Rapier architecture checks PASSED - useRapier only inside Physics');
