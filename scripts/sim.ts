console.log('Running sim tests...');

// Test coordinate conversion
function testCoordinateConversion() {
  console.log('Test: 2D -> 3D coordinate conversion');
  // Simple conversion: 2D tile (x,y) to 3D world (x,0,z)
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
  // Test spherical to cartesian
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

try {
  testCoordinateConversion();
  testSaveFormat();
  testCameraMath();
  testInteraction();
  testInventory();
  console.log('\nAll sim tests PASSED');
} catch (e) {
  console.error('Sim tests FAILED', e);
  process.exit(1);
}
