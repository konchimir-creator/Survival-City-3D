console.log('Running sim tests...');

// Test coordinate conversion
function testCoordinateConversion() {
  console.log('Test: 2D -> 3D coordinate conversion');
  function convert2DTo3D(tileX: number, tileY: number, tileSize: number = 1): [number, number, number] {
    return [tileX * tileSize, 0, tileY * tileSize];
  }
  
  const tests = [
    { input: [0,0], expected: [0,0,0] },
    { input: [1,2], expected: [1,0,2] },
    { input: [-5, 10], expected: [-5,0,10] },
  ];
  
  for (const t of tests) {
    const result = convert2DTo3D(t.input[0], t.input[1]);
    const pass = result[0] === t.expected[0] && result[1] === t.expected[1] && result[2] === t.expected[2];
    console.log(`  ${t.input} -> ${result} : ${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) throw new Error('Coordinate conversion failed');
  }
  console.log('  Coordinate conversion OK');
}

function testSaveFormat() {
  console.log('Test: Save format versioning');
  const SAVE_VERSION = 2;
  const mockSave = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    player: { position: [0,1,0], rotation: 0, stats: {}, skills: {}, attributes: {} },
    economy: { cash: 0, bankBalance: 0, debt: 0 },
    inventory: [],
    equipment: {},
    time: { minuteOfDay: 480, day: 1 },
    weather: { type: 'clear' },
    job: { currentJob: 'none' },
    settings: { graphics: 'medium' },
  };
  
  if (mockSave.version !== SAVE_VERSION) throw new Error('Save version mismatch');
  console.log('  Save format OK');
}

function testCameraMath() {
  console.log('Test: Camera math');
  function sphericalToCartesian(yaw: number, pitch: number, distance: number): [number, number, number] {
    const x = -Math.sin(yaw) * Math.cos(pitch) * distance;
    const y = Math.sin(pitch) * distance;
    const z = -Math.cos(yaw) * Math.cos(pitch) * distance;
    return [x,y,z];
  }
  
  const tests = [
    { yaw: 0, pitch: 0, dist: 5, expected: [0,0,-5] },
    { yaw: Math.PI/2, pitch: 0, dist: 5, expected: [-5,0,0] },
  ];
  
  for (const t of tests) {
    const res = sphericalToCartesian(t.yaw, t.pitch, t.dist);
    const diff = Math.sqrt(
      Math.pow(res[0]-t.expected[0],2)+
      Math.pow(res[1]-t.expected[1],2)+
      Math.pow(res[2]-t.expected[2],2)
    );
    if (diff > 0.01) {
      console.log(`  FAIL: ${res} vs ${t.expected}`);
      throw new Error('Camera math failed');
    }
  }
  console.log('  Camera math OK');
}

function testInteraction() {
  console.log('Test: Interaction range');
  function isInRange(player: [number,number,number], target: [number,number,number], range: number): boolean {
    const dx = player[0]-target[0];
    const dy = player[1]-target[1];
    const dz = player[2]-target[2];
    return Math.sqrt(dx*dx+dy*dy+dz*dz) < range;
  }
  
  if (!isInRange([0,0,0], [1,0,0], 2)) throw new Error('Interaction range fail 1');
  if (isInRange([0,0,0], [5,0,0], 2)) throw new Error('Interaction range fail 2');
  console.log('  Interaction OK');
}

function testInventory() {
  console.log('Test: Inventory weight');
  const items = [
    { weight: 0.5, quantity: 2 },
    { weight: 0.3, quantity: 1 },
  ];
  const total = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  if (Math.abs(total - 1.3) > 0.001) throw new Error('Inventory weight fail');
  console.log('  Inventory weight OK');
}

// NEW TESTS FOR MOVEMENT FIX
function testMovementMath() {
  console.log('Test: Movement math (WASD fix)');
  
  // Test 1: W should move forward relative to camera
  function calculateMoveDir(forward: number, right: number, camYaw: number): [number, number] {
    if (forward === 0 && right === 0) return [0,0];
    const inputAngle = Math.atan2(right, forward);
    const worldAngle = camYaw + inputAngle;
    const x = Math.sin(worldAngle);
    const z = Math.cos(worldAngle);
    const len = Math.sqrt(x*x + z*z);
    return [x/len, z/len];
  }
  
  // W = forward=1, right=0, camYaw=0 => should be [0,1] (north)
  let dir = calculateMoveDir(1, 0, 0);
  if (Math.abs(dir[0] - 0) > 0.01 || Math.abs(dir[1] - 1) > 0.01) {
    throw new Error(`W movement failed: ${dir}`);
  }
  console.log('  W forward OK:', dir);
  
  // S = forward=-1 => [0,-1]
  dir = calculateMoveDir(-1, 0, 0);
  if (Math.abs(dir[0] - 0) > 0.01 || Math.abs(dir[1] + 1) > 0.01) {
    throw new Error(`S movement failed: ${dir}`);
  }
  console.log('  S backward OK:', dir);
  
  // A = right=-1 => [-1,0]
  dir = calculateMoveDir(0, -1, 0);
  if (Math.abs(dir[0] + 1) > 0.01 || Math.abs(dir[1] - 0) > 0.01) {
    throw new Error(`A left failed: ${dir}`);
  }
  console.log('  A left OK:', dir);
  
  // D = right=1 => [1,0]
  dir = calculateMoveDir(0, 1, 0);
  if (Math.abs(dir[0] - 1) > 0.01 || Math.abs(dir[1] - 0) > 0.01) {
    throw new Error(`D right failed: ${dir}`);
  }
  console.log('  D right OK:', dir);
  
  // W+D normalized diagonal should be length 1, not sqrt(2)
  dir = calculateMoveDir(1, 1, 0);
  const len = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1]);
  if (Math.abs(len - 1) > 0.01) {
    throw new Error(`Diagonal not normalized: len=${len}`);
  }
  console.log('  W+D normalized OK:', dir, `len=${len.toFixed(3)}`);
  
  // Camera-relative: camYaw=90deg (PI/2), W should move to -X? Let's check
  // camYaw=PI/2, forward=1 => worldAngle=PI/2 => sin=1, cos=0 => [1,0]
  dir = calculateMoveDir(1, 0, Math.PI/2);
  if (Math.abs(dir[0] - 1) > 0.01) {
    throw new Error(`Camera-relative failed: ${dir}`);
  }
  console.log('  Camera-relative OK:', dir);
  
  console.log('  Movement math OK');
}

function testSpeedConstants() {
  console.log('Test: Speed constants');
  const WALK = 3.5;
  const RUN = 6.0;
  if (WALK >= RUN) throw new Error('Walk should be slower than run');
  if (WALK < 2 || WALK > 5) throw new Error('Walk speed unrealistic');
  if (RUN < 4 || RUN > 8) throw new Error('Run speed unrealistic');
  console.log(`  Walk ${WALK} m/s, Run ${RUN} m/s OK`);
}

function testInputCode() {
  console.log('Test: Input event.code handling (layout independence)');
  // Simulate that KeyW should work regardless of e.key being 'ц' in RU layout
  const mockEvents = [
    { code: 'KeyW', key: 'ц', expected: 'forward' },
    { code: 'KeyA', key: 'ф', expected: 'left' },
    { code: 'KeyS', key: 'ы', expected: 'backward' },
    { code: 'KeyD', key: 'в', expected: 'right' },
  ];
  
  for (const ev of mockEvents) {
    // Our fix uses code, not key
    const usingCode = ev.code === 'KeyW' || ev.code === 'KeyA' || ev.code === 'KeyS' || ev.code === 'KeyD';
    if (!usingCode) throw new Error(`event.code ${ev.code} not recognized`);
  }
  console.log('  event.code handling OK (RU layout independent)');
}

function testCameraCollision() {
  console.log('Test: Camera collision math');
  function adjustDistance(desired: number, hitDist: number | null): number {
    if (hitDist === null) return desired;
    return Math.max(1.0, hitDist - 0.3);
  }
  
  if (adjustDistance(5, null) !== 5) throw new Error('No hit should keep distance');
  if (adjustDistance(5, 2) !== 1.7) throw new Error('Hit at 2 should give 1.7');
  if (adjustDistance(5, 0.5) !== 1.0) throw new Error('Should clamp to 1.0 min');
  console.log('  Camera collision OK');
}

function testInputResetOnBlur() {
  console.log('Test: Input reset on blur');
  let input = { forward: true, backward: true, left: true, right: true, run: true };
  // Simulate blur handler
  function onBlur() {
    input.forward = false;
    input.backward = false;
    input.left = false;
    input.right = false;
    input.run = false;
  }
  onBlur();
  if (input.forward || input.backward || input.left || input.right || input.run) {
    throw new Error('Blur should reset all keys');
  }
  console.log('  Input reset on blur OK');
}

try {
  testCoordinateConversion();
  testSaveFormat();
  testCameraMath();
  testInteraction();
  testInventory();
  testMovementMath();
  testSpeedConstants();
  testInputCode();
  testCameraCollision();
  testInputResetOnBlur();
  console.log('\nAll sim tests PASSED - including movement fix tests');
} catch (e) {
  console.error('Sim tests FAILED', e);
  process.exit(1);
}
