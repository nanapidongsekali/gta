// Titik masuk: membangun renderer, dunia, dan semua sistem lalu menjalankan loop.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { QUALITY, clamp } from './config.js';
import { G, bus, load, save } from './state.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { buildCity } from './city.js';
import { Sky } from './sky.js';
import { FX } from './effects.js';
import { Vehicle } from './vehicle.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Missions } from './missions.js';
import { Player } from './player.js';
import { HUD } from './hud.js';

/* ---------- laporan error ke layar (memudahkan debug di preview) ---------- */
window.addEventListener('error', (e) => {
  const el = document.getElementById('err');
  if (!el) return;
  el.classList.remove('hidden');
  el.textContent += `${e.message}\n  ${e.filename}:${e.lineno}\n`;
});

/* ---------- dasar ---------- */

const canvas = document.getElementById('game');
load();

const qualityKey = QUALITY[G.quality] ? G.quality : 'high';
const Q = QUALITY[qualityKey];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, powerPreference: 'high-performance' });
renderer.setPixelRatio(Q.pixelRatio === 0 ? Math.min(window.devicePixelRatio, 2) : Q.pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(80, 50, 80);

const audio = new AudioSys();
const hud = new HUD(null);
const input = new Input(canvas);

let useBloom = Q.bloom;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.55, 0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---------- bangun dunia (dengan progres loading) ---------- */

const raf = () => new Promise((r) => requestAnimationFrame(r));
let city, sky, fx, player, traffic, peds, missions;
let shared, headL, headR;

async function boot() {
  hud.setLoading(12, 'Menyiapkan renderer…');
  await raf();

  city = buildCity(scene);
  hud.city = city;
  hud.setLoading(52, 'Membangun kota & distrik…');
  await raf();

  sky = new Sky(scene, Q);

  // material lampu sorot mobil yang dipakai bersama
  shared = {
    head: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0 }),
    nightEmissives: [],
  };
  city.nightEmissives.push({ mat: shared.head, day: 0, night: 2.6 });

  fx = new FX(scene);
  player = new Player(scene, city);
  traffic = new Traffic(scene, city, fx, audio, Q);
  traffic.shared = shared;

  // mobil pertama milik pemain, parkir di dekat titik awal
  const fc = city.spawn.firstCar;
  const firstCar = new Vehicle(scene, fc.type, fc.color, fc.x, fc.z, fc.heading, shared);
  firstCar.ai = 'parked';
  traffic.vehicles.push(firstCar);

  hud.setLoading(74, 'Membangunkan warga & lalu lintas…');
  await raf();

  peds = new Peds(scene, city, Q.peds);
  missions = new Missions(scene, city, audio);

  // lampu depan pemain (satu set, dipindah antar mobil)
  headL = new THREE.SpotLight(0xffeecc, 0, 44, 0.5, 0.55, 1.4);
  headR = new THREE.SpotLight(0xffeecc, 0, 44, 0.5, 0.55, 1.4);

  hud.setLoading(92, 'Merapikan jalan…');
  await raf();

  wireEvents();
  syncSettingsUI();
  hud.ready(startGame);
  requestAnimationFrame(loop);
}

function startGame() {
  audio.ensure();
  audio.setEnabled(G.sound);
  G.started = true;
  G.overlay = null;
  hud.showOverlay(null);
  document.getElementById('hud').classList.remove('hidden');
  input.requestLock();
  bus.emit('banner', {
    title: 'SELAMAT DATANG DI SENJA CITY',
    sub: 'Misi kurir menunggu di warung (K di minimap). 10 Koin Senja tersebar di kota.',
  });
}

/* ---------- lampu depan ---------- */

function attachHeadlights(v) {
  v.group.add(headL, headR, headL.target, headR.target);
  headL.position.set(-0.62, 0.85, v.halfL);
  headR.position.set(0.62, 0.85, v.halfL);
  headL.target.position.set(-0.62, 0.2, v.halfL + 18);
  headR.target.position.set(0.62, 0.2, v.halfL + 18);
}

function detachHeadlights() {
  headL.removeFromParent();
  headR.removeFromParent();
  headL.intensity = headR.intensity = 0;
}

/* ---------- masuk / keluar kendaraan ---------- */

function enterExit() {
  if (!G.started || G.overlay) return;
  if (G.mode === 'foot') {
    const v = traffic.nearestJackable(player.pos, 3.9);
    if (!v) return;
    traffic.jack(v, player.pos);
    G.mode = 'car';
    G.vehicle = v;
    v.ai = 'player';
    player.mesh.visible = false;
    attachHeadlights(v);
    audio.sfx('door');
    hud.toast(v.spec.name);
  } else {
    const v = G.vehicle;
    if (Math.abs(v.vf) > 4.5) {
      hud.toast('Rem dulu, jangan loncat dari mobil ngebut', 'bad');
      return;
    }
    const rx = -Math.cos(v.heading), rz = Math.sin(v.heading);
    player.teleport(v.pos.x + rx * (v.halfW + 1), v.pos.z + rz * (v.halfW + 1));
    G.mode = 'foot';
    G.vehicle = null;
    v.ai = 'parked';
    player.mesh.visible = true;
    detachHeadlights();
    audio.sfx('door');
  }
}

/* ---------- tumbang / tertangkap ---------- */

function deadSequence(kind) {
  if (G.overlay === 'dead') return;
  const loss = Math.min(kind === 'busted' ? 500 : 200, G.money);
  if (loss > 0) bus.emit('money', -loss);
  missions.fail(kind === 'busted' ? 'tertangkap polisi' : 'tumbang');
  if (G.vehicle) {
    detachHeadlights();
    G.vehicle.ai = 'parked';
    G.vehicle = null;
    G.mode = 'foot';
    player.mesh.visible = true;
  }
  G.wanted = 0;
  G.overlay = 'dead';
  input.enabled = false;
  input.releaseLock();
  audio.setEngine(false);
  audio.setSiren(false, 0);
  hud.dead(kind, kind === 'busted'
    ? `Denda $${loss}. Kamu diantar ke Polsek Senja.`
    : `Biaya perawatan $${loss}. Kamu terbangun di Klinik Kota.`);
  setTimeout(() => {
    const sp = kind === 'busted' ? city.spawn.police : city.spawn.hospital;
    player.teleport(sp.x, sp.z);
    G.health = 100;
    G.overlay = null;
    input.enabled = true;
    hud.showOverlay(null);
  }, 3200);
}

/* ---------- pengaturan ---------- */

const $id = (id) => document.getElementById(id);

function syncSettingsUI() {
  $id('set-quality').value = qualityKey;
  $id('set-sound').value = G.sound ? '1' : '0';
  $id('set-radio').value = G.radio ? '1' : '0';
  $id('set-sens').value = G.sens;
}

function applyQuality(key) {
  if (!QUALITY[key]) return;
  G.quality = key;
  const q = QUALITY[key];
  renderer.setPixelRatio(q.pixelRatio === 0 ? Math.min(window.devicePixelRatio, 2) : q.pixelRatio);
  sky.applyQuality(q);
  useBloom = q.bloom;
  traffic.quality = q;
  onResize();
  save();
  hud.toast('Kualitas grafis: ' + { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' }[key]);
}

function wireEvents() {
  input.onLockLost = () => {
    if (!G.started) return;
    if (G.overlay === 'map') closeMap();
    else if (!G.overlay) openPause();
  };

  bus.on('punch', (p) => peds.tryPunch(p.x, p.z, p.yaw));
  bus.on('thud', () => audio.sfx('thud'));
  bus.on('ped-flee', ({ x, z }) => {
    for (const ped of peds.list) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.pos.x - x, ped.pos.z - z) < 12) {
        ped.state = 'flee';
        ped.timer = 4;
        ped.fleeFrom = { x, z };
      }
    }
  });
  bus.on('crime', ({ stars = 1 }) => {
    G.wanted = clamp(G.wanted + stars, 0, 5);
    G.heatTimer = 0;
  });
  bus.on('crash', ({ x, z, strength }) => {
    audio.sfx(strength > 9 ? 'crash' : 'thud');
    fx.sparks(x, 0.8, z);
    if (Math.hypot(player.pos.x - x, player.pos.z - z) < 12) player.shake = Math.min(1, player.shake + strength * 0.03);
  });
  bus.on('hurt', (dmg) => {
    if (G.overlay === 'dead') return;
    G.health -= dmg;
    if (G.health <= 0) { G.health = 0; deadSequence('wasted'); }
  });
  bus.on('vehicle-exploded', ({ v }) => {
    const px = v.pos.x, pz = v.pos.z;
    const wasPlayer = G.vehicle === v;
    fx.explosion(px, 0, pz);
    audio.sfx('explode');
    traffic.removeVehicle(v);
    if (wasPlayer) {
      detachHeadlights();
      G.vehicle = null;
      G.mode = 'foot';
      player.mesh.visible = true;
      bus.emit('hurt', 95);
    } else if (G.mode === 'foot') {
      const d = Math.hypot(player.pos.x - px, player.pos.z - pz);
      if (d < 8) bus.emit('hurt', 75 * (1 - d / 8));
    }
  });

  // tombol menu
  $id('btn-resume').onclick = () => closePause();
  $id('set-quality').onchange = (e) => applyQuality(e.target.value);
  $id('set-sound').onchange = (e) => {
    G.sound = e.target.value === '1';
    audio.setEnabled(G.sound);
    save();
  };
  $id('set-radio').onchange = (e) => { G.radio = e.target.value === '1'; save(); };
  $id('set-sens').oninput = (e) => { G.sens = parseFloat(e.target.value); };

  window.addEventListener('resize', onResize);
  window.addEventListener('beforeunload', save);
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------- overlay ---------- */

function openPause() {
  G.overlay = 'pause';
  input.enabled = false;
  audio.setEngine(false);
  audio.hornOff();
  hud.showOverlay('pause');
}
function closePause() {
  G.overlay = null;
  input.enabled = true;
  hud.showOverlay(null);
  input.requestLock();
}
function openMap() {
  G.overlay = 'map';
  input.enabled = false;
  input.releaseLock();
  hud.showOverlay('map');
  audio.sfx('ui');
}
function closeMap() {
  G.overlay = null;
  input.enabled = true;
  hud.showOverlay(null);
  input.requestLock();
}

/* ---------- loop utama ---------- */

const clock = new THREE.Clock();
let lastHurtT = 99;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!G.started) {
    // kamera sinematik di layar loading
    const t = performance.now() * 0.00005;
    camera.position.set(Math.cos(t) * 130, 65, Math.sin(t) * 130);
    camera.lookAt(0, 10, 0);
    if (sky) {
      sky.update(dt, camera.position, city.nightEmissives);
      city.update(dt);
      traffic.update(dt, player.pos, null);
      peds.update(dt, player.pos, traffic.vehicles);
      fx.update(dt);
    }
  } else if (G.overlay !== 'dead') {
    stepGame(dt);
  }

  if (useBloom) {
    bloomPass.strength = sky ? sky.getBloomStrength() : 0.3;
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
  input.endFrame();
}

function stepGame(dt) {
  const frozen = G.overlay === 'pause';

  // tombol global
  if (!frozen) {
    if (input.once('KeyM')) { if (!G.overlay) openMap(); }
    if (input.once('KeyF')) enterExit();
    if (input.once('KeyR')) {
      G.radio = !G.radio;
      save();
      hud.toast(G.radio ? 'Radio Senja: nyala' : 'Radio Senja: mati');
    }
  }
  if (input.once('KeyP')) {
    if (G.overlay === 'pause') closePause();
    else if (!G.overlay) openPause();
  }

  if (frozen) return;

  lastHurtT += dt;

  // dunia & waktu
  sky.update(dt, camera.position, city.nightEmissives);
  city.update(dt);

  // pemain / kendaraan
  let throttleVal = 0;
  if (G.mode === 'car' && G.vehicle) {
    const v = G.vehicle;
    throttleVal = input.axis('KeyS', 'KeyW');
    const steer = input.axis('KeyA', 'KeyD');
    const hand = input.down('Space');
    v.drive(dt, throttleVal, steer, hand);
    v.integrate(dt);
    v.collideStatic(city, dt);
    v.setTail(throttleVal < 0 && v.vf > 0.5, sky.night);
    v.syncMesh(dt);
    const hl = sky.night > 0.35 ? 280 * sky.night : 0;
    headL.intensity = headR.intensity = hl;
  } else {
    player.update(dt, input);
    headL.intensity = headR.intensity = 0;
    // ditabrak mobil lalu lintas
    for (const v of traffic.vehicles) {
      if (v.speed < 5 || v.dead) continue;
      const d = Math.hypot(v.pos.x - player.pos.x, v.pos.z - player.pos.z);
      if (d < 1.6) {
        bus.emit('hurt', v.speed * 4.5);
        const dx = player.pos.x - v.pos.x, dz = player.pos.z - v.pos.z;
        const dl = Math.hypot(dx, dz) || 1;
        player.pos.x += (dx / dl) * 2.4;
        player.pos.z += (dz / dl) * 2.4;
        player.shake = Math.min(1, player.shake + 0.45);
        v.vf *= 0.55;
      }
    }
  }

  // sistem dunia
  traffic.update(dt, player.pos, G.vehicle);
  peds.update(dt, player.pos, traffic.vehicles);
  missions.update(dt, player.pos);
  fx.update(dt);
  audio.update(dt);

  // audio berkelanjutan
  audio.setEngine(G.mode === 'car', G.vehicle ? G.vehicle.speed : 0, throttleVal);
  audio.setRadio(G.radio && G.mode === 'car');
  if (G.mode === 'car' && input.down('KeyH')) audio.hornOn();
  else audio.hornOff();
  const copNear = traffic.cops.some((c) => Math.hypot(c.v.pos.x - player.pos.x, c.v.pos.z - player.pos.z) < 95);
  audio.setSiren(G.wanted > 0 && copNear, copNear ? 0.09 : 0);

  // pencarian mereda kalau sembunyi lama
  G.heatTimer += dt;
  G.hot = traffic.cops.some((c) => Math.hypot(c.v.pos.x - player.pos.x, c.v.pos.z - player.pos.z) < 65);
  if (G.wanted > 0 && G.heatTimer > 26 && !G.hot) {
    G.wanted--;
    G.heatTimer = 10;
    if (G.wanted === 0) hud.toast('Polisi kehilangan jejakmu');
  }

  // tertangkap
  const pSpeed = G.mode === 'car' ? G.vehicle.speed : player.moveSpeed;
  if (traffic.checkArrest(dt, player.pos, G.vehicle, pSpeed)) deadSequence('busted');

  // regenerasi pelan setelah 8 detik aman
  if (lastHurtT > 8 && G.health > 0 && G.health < 100) {
    G.health = Math.min(100, G.health + 3.5 * dt);
  }

  // kamera & HUD
  player.updateCamera(dt, camera, G.vehicle);
  hud.update(player.pos, missions.blips(), traffic.cops, G.vehicle);
}

boot();
