// Smoke test tanpa browser: menjalankan pembangkitan kota, fisika, dan AI
// beberapa ratus tick di Node. Menangkap error runtime yang lolos dari build.
// Jalankan: npm test

/* ---- stub DOM minimal (tekstur kanvas dibuat tapi tidak dirender) ---- */

function fakeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

globalThis.window = globalThis;
globalThis.document = {
  createElement() {
    return { width: 0, height: 0, getContext: () => fakeCtx(), style: {} };
  },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

/* ---- impor modul game ---- */

const THREE = await import('three');
const { buildCity } = await import('../src/city.js');
const { Sky } = await import('../src/sky.js');
const { Vehicle } = await import('../src/vehicle.js');
const { Traffic } = await import('../src/traffic.js');
const { Peds } = await import('../src/peds.js');
const { Missions } = await import('../src/missions.js');
const { FX } = await import('../src/effects.js');
const { Player } = await import('../src/player.js');
const { G, bus } = await import('../src/state.js');
const { QUALITY } = await import('../src/config.js');

let passed = 0;
const ok = (label, cond) => {
  if (!cond) {
    console.error(`GAGAL: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ ${label}`);
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 1400);
const dt = 1 / 60;

console.log('— Kota —');
const city = buildCity(scene);
ok('kota terbangkitkan', city.aabbs.length > 200 && city.circles.length > 200);
ok('graf jalan ada', city.graphSize === 11);
ok('slot parkir ada', city.slots.length > 20);
ok('koin 10', city.coinSpots.length === 10);
city.update(dt);

console.log('— Langit —');
const sky = new Sky(scene, QUALITY.medium);
for (let i = 0; i < 600; i++) sky.update(dt, new THREE.Vector3(), city.nightEmissives);
ok('siklus waktu jalan', G.time > 16.5);

console.log('— Entitas —');
const fx = new FX(scene);
const audioStub = { sfx() {}, setEngine() {}, setRadio() {}, setSiren() {}, hornOn() {}, hornOff() {}, update() {} };
const shared = { head: new THREE.MeshStandardMaterial(), nightEmissives: [] };
const player = new Player(scene, city);
const traffic = new Traffic(scene, city, fx, audioStub, QUALITY.medium);
traffic.shared = shared;
const peds = new Peds(scene, city, 8);
const missions = new Missions(scene, city, audioStub);
ok('pemain & sistem dibuat', true);

const stubInput = {
  dx: 0, dy: 0, wheel: 0, mouse0Pressed: false,
  axis: () => 0, down: () => false, once: () => false,
};

console.log('— Simulasi 20 detik —');
for (let i = 0; i < 1200; i++) {
  sky.update(dt, camera.position, city.nightEmissives);
  city.update(dt);
  player.update(dt, stubInput);
  player.updateCamera(dt, camera, null);
  traffic.update(dt, player.pos, null);
  peds.update(dt, player.pos, traffic.vehicles);
  missions.update(dt, player.pos);
  fx.update(dt);
}
ok('simulasi stabil', traffic.flows.length > 0 && peds.list.length === 8);
ok('lalu lintas hidup', traffic.vehicles.length >= 3);

console.log('— Fisika mobil —');
const v = new Vehicle(scene, 'rangkok', 0, 5.6, 30, 0, shared);
v.ai = 'player';
for (let i = 0; i < 240; i++) {
  v.drive(dt, 1, Math.sin(i * 0.1) * 0.4, i % 90 < 20);
  v.integrate(dt);
  v.collideStatic(city, dt);
  v.syncMesh(dt);
}
ok('mobil melaju', v.speed > 1);
ok('mobil tidak menembus batas dunia', Math.abs(v.pos.x) < 300 && Math.abs(v.pos.z) < 300);
v.damage(200);
ok('ledakan terpicu', v.dead);

console.log('— Pencarian polisi —');
// listener sama seperti di main.js (modul main tidak dijalankan dalam smoke test)
bus.on('crime', ({ stars = 1 }) => {
  G.wanted = Math.max(0, Math.min(5, G.wanted + stars));
  G.heatTimer = 0;
});
bus.emit('crime', { stars: 2 });
for (let i = 0; i < 600; i++) traffic.update(dt, player.pos, null);
ok('polisi muncul & mengejar', traffic.cops.length > 0);
const cop = traffic.cops[0].v;
let busted = false;
for (let i = 0; i < 200 && !busted; i++) {
  busted = traffic.checkArrest(dt, { x: cop.pos.x, z: cop.pos.z }, null, 0);
}
ok('penangkapan terdeteksi di dekat polisi', busted === true);

console.log('— Bajak mobil —');
const target = traffic.nearestJackable(player.pos, 50);
if (target) {
  traffic.jack(target, player.pos);
  ok('mobil dibajak jadi milik pemain', target.ai === 'player');
} else {
  console.log('  (tidak ada mobil dalam radius — lewati)');
}

console.log(`\nSEMUA ${passed} TES LULUS ✓`);
process.exit(0);
