// Semua model dibuat prosedural dari primitif three.js — tanpa aset eksternal.
// Identitas visual: low-poly bersih dengan jendela menyala saat malam.

import * as THREE from 'three';

/* ---------- Tekstur kanvas ---------- */

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Pola jendela gedung; pinggir kanvas warna dinding supaya UV di atap tetap rapi.
export function windowTex(wall, lit, dark, cols = 6, rows = 6) {
  return canvasTex(128, (ctx, s) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, s, s);
    const m = 10;
    const cw = (s - m * 2) / cols, ch = (s - m * 2) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const on = Math.random() < 0.42;
        ctx.fillStyle = on ? lit : dark;
        ctx.globalAlpha = on ? 0.75 + Math.random() * 0.25 : 0.9;
        ctx.fillRect(m + i * cw + 1.5, m + j * ch + 1.5, cw - 3, ch - 3);
      }
    }
    ctx.globalAlpha = 1;
  });
}

export function noiseTex(base = '#8a8a8a') {
  return canvasTex(128, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const g = 100 + Math.random() * 90;
      ctx.fillStyle = `rgba(${g},${g},${g},0.16)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6);
    }
  });
}

let _glowTex = null;
export function glowTex() {
  if (_glowTex) return _glowTex;
  _glowTex = canvasTex(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  _glowTex.wrapS = _glowTex.wrapT = THREE.ClampToEdgeWrapping;
  return _glowTex;
}

export function signTexture(text, fg = '#ffe8c2', bg = '#141a2c') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fg; ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = fg;
  ctx.font = '900 58px "Arial Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Kendaraan ---------- */

// Spesifikasi tipe mobil dipakai bersama oleh vehicle.js (fisika) dan di sini (bentuk).
export const CAR_SHAPES = {
  jalak:   { name: 'Jalak 90',      len: 4.3, wid: 1.76, bodyH: 0.58, cabL: 2.0, cabH: 0.52, wheelR: 0.34, accel: 9.5,  max: 36, grip: 7.5, steer: 0.62, colors: [0x9c3d2e, 0xd8d5cf, 0x3e5f7a, 0x2e2f33, 0x7a8a5a] },
  banteng: { name: 'Banteng V8',    len: 4.7, wid: 1.94, bodyH: 0.62, cabL: 1.9, cabH: 0.5,  wheelR: 0.37, accel: 12.5, max: 47, grip: 6.2, steer: 0.55, colors: [0x1c1c22, 0x6b1f1f, 0x284a63] },
  rangkok: { name: 'Rangkok GT',    len: 4.1, wid: 1.88, bodyH: 0.46, cabL: 1.8, cabH: 0.42, wheelR: 0.33, accel: 14.5, max: 52, grip: 8.8, steer: 0.66, colors: [0xc23b22, 0xd9a013, 0x22262e] },
  gajah:   { name: 'Gajah Mada',    len: 4.9, wid: 1.96, bodyH: 0.9,  cabL: 2.6, cabH: 0.55, wheelR: 0.36, accel: 8,    max: 32, grip: 6.6, steer: 0.5,  colors: [0xdcd8ce, 0x4a5b6a, 0x6d4a2f], cabFront: true },
  cepuk:   { name: 'Cepuk Pick-up', len: 4.8, wid: 1.86, bodyH: 0.58, cabL: 1.6, cabH: 0.52, wheelR: 0.36, accel: 9.5,  max: 38, grip: 7.0, steer: 0.56, colors: [0x37586b, 0x74563a, 0x50565e], bak: true },
  taksi:   { name: 'Komodo Taksi',  len: 4.3, wid: 1.76, bodyH: 0.58, cabL: 2.0, cabH: 0.52, wheelR: 0.34, accel: 9.8,  max: 37, grip: 7.5, steer: 0.6,  colors: [0xe08a1e], taxi: true },
  polisi:  { name: 'Patroli Senja', len: 4.4, wid: 1.8,  bodyH: 0.58, cabL: 2.0, cabH: 0.52, wheelR: 0.34, accel: 13.5, max: 48, grip: 8.6, steer: 0.62, colors: [0x10131a], police: true },
};

export function makeCarMesh(typeKey, colorIdx = 0, sharedMats = null) {
  const s = CAR_SHAPES[typeKey];
  const color = s.colors[colorIdx % s.colors.length];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.15, metalness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.7, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(s.wid, s.bodyH, s.len), bodyMat);
  body.position.y = 0.42 + s.bodyH / 2 - 0.29;
  body.castShadow = true;
  group.add(body);

  // kabin
  const cabL = s.cabL;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(s.wid - 0.16, s.cabH, cabL), glass);
  const cabZ = s.cabFront ? s.len * 0.18 : -s.len * 0.08;
  cab.position.set(0, body.position.y + s.bodyH / 2 + s.cabH / 2 - 0.03, cabZ);
  cab.castShadow = true;
  group.add(cab);

  if (s.bak) { // bak pikap
    const bak = new THREE.Mesh(new THREE.BoxGeometry(s.wid - 0.1, 0.34, s.len - cabL - 0.7), trim);
    bak.position.set(0, body.position.y + s.bodyH / 2 + 0.1, -s.len / 2 + (s.len - cabL - 0.7) / 2 + 0.2);
    group.add(bak);
  }

  if (s.taxi) { // tanda taksi
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xaa7710, emissiveIntensity: 0.4, roughness: 0.4 }));
    top.position.set(0, cab.position.y + s.cabH / 2 + 0.1, cabZ);
    group.add(top);
    sharedMats?.nightEmissives.push({ mat: top.material, day: 0.15, night: 1.1 });
  }

  if (s.police) { // barik lampu polisi
    const mR = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 0 });
    const mB = new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x3355ff, emissiveIntensity: 0 });
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.3), mR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.3), mB);
    barR.position.set(-0.24, cab.position.y + s.cabH / 2 + 0.09, cabZ);
    barB.position.set(0.24, cab.position.y + s.cabH / 2 + 0.09, cabZ);
    group.add(barR, barB);
    group.userData.lightbar = { mR, mB };
  }

  // lampu depan & belakang (emissive, diseragamkan malam lewat sharedMats)
  const headMat = sharedMats ? sharedMats.head : new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: 0.25 });
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), headMat);
    hl.position.set(sx * (s.wid / 2 - 0.28), body.position.y + 0.05, s.len / 2 + 0.01);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.06), tailMat);
    tl.position.set(sx * (s.wid / 2 - 0.26), body.position.y + 0.05, -s.len / 2 - 0.01);
    group.add(hl, tl);
  }

  // roda
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(s.wheelR, s.wheelR, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14151a, roughness: 0.9 });
  const hubGeo = new THREE.CylinderGeometry(s.wheelR * 0.45, s.wheelR * 0.45, 0.28, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa2b5, roughness: 0.3, metalness: 0.8 });
  const wx = s.wid / 2 - 0.1, wz = s.len / 2 - 0.75;
  for (const [sx, sz, front] of [[-1, 1, 1], [1, 1, 1], [-1, -1, 0], [1, -1, 0]]) {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    wg.add(tire, hub);
    wg.position.set(sx * wx, s.wheelR, sz);
    group.add(wg);
    wheels.push({ group: wg, front: !!front, roll: 0 });
  }

  return { group, wheels, tailMat, s };
}

/* ---------- Karakter ---------- */

const SKIN_TONES = [0xc98d5f, 0xa06a3f, 0x8a5430, 0xd9a06e, 0x6e4526];
const SHIRTS = [0xd8d5cf, 0x3e5f7a, 0x7a3d3d, 0x5a7a4a, 0x8a6ad8, 0xd8a03d, 0x4a4a52, 0xc2705a];
const PANTS = [0x2e3440, 0x3d3630, 0x44506a, 0x4a3d30, 0x22262e];

export function makeHuman(opts = {}) {
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin ?? SKIN_TONES[(Math.random() * SKIN_TONES.length) | 0], roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt ?? SHIRTS[(Math.random() * SHIRTS.length) | 0], roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants ?? PANTS[(Math.random() * PANTS.length) | 0], roughness: 0.9 });

  const group = new THREE.Group();
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

  const torso = box(0.38, 0.5, 0.22, shirt);
  torso.position.y = 1.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skin);
  head.position.y = 1.52;
  const hips = box(0.34, 0.16, 0.22, pants);
  hips.position.y = 0.78;
  torso.castShadow = head.castShadow = true;
  group.add(torso, head, hips);

  const limb = (w, len, m, px, py) => {
    const g = new THREE.Group();
    g.position.set(px, py, 0);
    const mesh = box(w, len, w, m);
    mesh.position.y = -len / 2;
    mesh.castShadow = true;
    g.add(mesh);
    group.add(g);
    return g;
  };
  const lArm = limb(0.1, 0.44, shirt, -0.25, 1.28);
  const rArm = limb(0.1, 0.44, shirt, 0.25, 1.28);
  const lLeg = limb(0.12, 0.72, pants, -0.1, 0.74);
  const rLeg = limb(0.12, 0.72, pants, 0.1, 0.74);

  if (opts.hat) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.09, 10),
      new THREE.MeshStandardMaterial({ color: opts.hat, roughness: 0.7 }));
    hat.position.y = 1.64;
    group.add(hat);
  }

  const parts = { lArm, rArm, lLeg, rLeg };
  group.userData.setWalk = (t, amp) => {
    const s = Math.sin(t) * amp;
    lLeg.rotation.x = s; rLeg.rotation.x = -s;
    lArm.rotation.x = -s * 0.8; rArm.rotation.x = s * 0.8;
  };
  group.userData.parts = parts;
  return group;
}

export function heroLook() {
  return { skin: 0xc98d5f, shirt: 0xe8e4da, pants: 0x2e3440, hat: 0xb03a2e };
}

/* ---------- Koin, marker, sprite ---------- */

export function makeCoin() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xcc8800, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.85 });
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 20);
  geo.rotateX(Math.PI / 2);
  const coin = new THREE.Mesh(geo, mat);
  g.add(coin);
  return g;
}

export function makeMarker(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 7, 24, 1, true), mat);
  beam.position.y = 3.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  g.add(beam, ring);
  g.userData.spin = ring;
  return g;
}

export function makeGlowSprite(color, scale) {
  const m = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  const sp = new THREE.Sprite(m);
  sp.scale.setScalar(scale);
  return sp;
}
