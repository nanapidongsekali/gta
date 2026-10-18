// Pembangkit kota "Senja City" — grid blok dengan distrik berbeda.
// Semua geometri statis digabung per material supaya jumlah draw call minimal.
// Tidak ada satu pun aset dari game komersial; semua dibangkitkan dari kode.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, mulberry32, clamp } from './config.js';
import { windowTex, noiseTex, signTexture } from './models.js';

const R = mulberry32(20251018); // seed tetap → kota identik tiap dimuat

/* ---------- util geometri ---------- */

function tint(geo, hex, variance = 0) {
  const c = new THREE.Color(hex);
  if (variance > 0) {
    c.offsetHSL((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * variance);
  }
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// UV kotak gedung: sisi diskalakan (jendela berulang), atap ke titik dinding polos.
function scaleBoxUV(geo, w, h, d, per = 3) {
  const uv = geo.attributes.uv, n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(n.getY(i)) > 0.5) { uv.setXY(i, 0.02, 0.02); continue; }
    const span = Math.abs(n.getX(i)) > 0.5 ? d : w;
    uv.setXY(i, uv.getX(i) * (span / per), uv.getY(i) * (h / per));
  }
  return geo;
}

const at = (geo, x, y, z) => { geo.translate(x, y, z); return geo; };

/* ---------- distrik blok ---------- */

function districtOf(bi, bj) {
  if (bi === 5 && bj === 5) return 'warung';
  if (bi === 6 && bj === 3) return 'alun';
  if (bi === 2 && bj === 6) return 'taman';
  if (bi === 3 && bj === 2) return 'klinik';
  if (bi === 7 && bj === 7) return 'polisi';
  if (bi === 9) return 'tepilaut';
  if (bj === 9) return 'industri';
  if (bi === 1 && bj === 1) return 'stadion';
  const d = Math.max(Math.abs(bi - 4.5), Math.abs(bj - 4.5));
  if (d <= 1.5) return 'downtown';
  if (d > 3.4) return 'kampung';
  return 'midrise';
}

const BLOCK_COLORS = {
  downtown: '#2c3140', midrise: '#303543', kampung: '#35443a', industri: '#3d372e',
  tepilaut: '#333a46', taman: '#2e5e3c', alun: '#3a4050', klinik: '#3a4652',
  polisi: '#2e3a52', warung: '#3d3a46', stadion: '#3c3540',
};

/* ---------- pembangunan kota ---------- */

export function buildCity(scene) {
  const W = WORLD;
  const group = new THREE.Group();
  scene.add(group);

  const nightEmissives = []; // {mat, day, night} diseragamkan Sky tiap frame
  const aabbs = [];          // {minX,maxX,minZ,maxZ}
  const circles = [];        // {x,z,r}
  const slots = [];          // tempat parkir {x,z,heading}
  const buckets = {};        // material-key -> geometri[]

  const B = (key) => (buckets[key] ??= []);
  let cityBlink = null;      // material lampu menara radio (diisi saat blok industri dibangun)

  const addBox = (key, w, h, d, x, y, z, color = null, variance = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (color !== null) tint(g, color, variance);
    B(key).push(at(g, x, y, z));
  };

  const addCollider = (x, z, w, d, m = 0.15) =>
    aabbs.push({ minX: x - w / 2 - m, maxX: x + w / 2 + m, minZ: z - d / 2 - m, maxZ: z + d / 2 + m });

  function addBuilding(x, z, w, d, h, key) {
    const g = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(g, w, h, d, key.startsWith('glass') ? 2.4 : 3.2);
    B(key).push(at(g, x, h / 2, z));
    addBox('roof', w + 0.12, 0.18, d + 0.12, x, h + 0.09, z, 0x23262c, 0.06);
    addCollider(x, z, w, d);
  }

  function houseRoof(x, z, w, d, h) {
    const r = Math.hypot(w, d) / 2 + 0.35;
    const g = new THREE.ConeGeometry(r, 1.9, 4);
    g.rotateY(Math.PI / 4);
    tint(g, 0x6e3a2e, 0.1);
    B('roofC').push(at(g, x, h + 0.95, z));
  }

  function addTree(x, z, palm = false) {
    const trunkH = palm ? 5 + R() * 2 : 1.6 + R() * 0.8;
    const tg = new THREE.CylinderGeometry(palm ? 0.09 : 0.14, palm ? 0.13 : 0.2, trunkH, 6);
    tint(tg, 0x5a4030, 0.12);
    B('trunk').push(at(tg, x, trunkH / 2, z));
    if (palm) {
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.ConeGeometry(0.28, 2.6, 4);
        leaf.rotateX(Math.PI / 2.2);
        leaf.rotateY((i / 5) * Math.PI * 2);
        tint(leaf, 0x3d7a44, 0.15);
        B('leaf').push(at(leaf, x, trunkH + 0.4, z));
      }
    } else {
      // sphere low-poly (indexed) — wajib satu tipe indexing dengan cone agar merge valid
      const cg = new THREE.SphereGeometry(0.95 + R() * 0.7, 6, 5);
      tint(cg, 0x3f8a4a, 0.22);
      B('leaf').push(at(cg, x, trunkH + 0.85, z));
    }
    circles.push({ x, z, r: 0.45 });
  }

  function addLamp(x, z) {
    const pg = new THREE.CylinderGeometry(0.06, 0.08, 4.4, 6);
    tint(pg, 0x2a2e36);
    B('dark').push(at(pg, x, 2.2, z));
    const hg = new THREE.SphereGeometry(0.14, 8, 6);
    B('lampHead').push(at(hg, x, 4.5, z));
    const pool = new THREE.CircleGeometry(4.6, 14);
    pool.rotateX(-Math.PI / 2);
    B('pool').push(at(pool, x, 0.06, z));
    circles.push({ x, z, r: 0.2 });
  }

  function addTrafficLight(x, z, axis) { // axis 'NS' | 'EW'
    const pg = new THREE.CylinderGeometry(0.07, 0.09, 4.8, 6);
    tint(pg, 0x22262e);
    B('dark').push(at(pg, x, 2.4, z));
    const box = new THREE.BoxGeometry(0.26, 0.72, 0.26);
    tint(box, 0x1c1f26);
    B('dark').push(at(box, x, 4.6, z));
    const suffix = axis === 'NS' ? 'A' : 'B';
    const bulb = (key, y) => {
      const g = new THREE.SphereGeometry(0.085, 8, 6);
      B(key).push(at(g, x, y, z));
    };
    bulb('tlR' + suffix, 4.82);
    bulb('tlY', 4.6);
    bulb('tlG' + suffix, 4.38);
    circles.push({ x, z, r: 0.22 });
  }

  function addSign(text, x, y, z, ry, color = '#ffd9a0', w = 5) {
    const tex = signTexture(text, color);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.12,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.25), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
    nightEmissives.push({ mat, day: 0.12, night: 1.25 });
  }

  /* ----- tanah, laut, promenade ----- */

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W.size + 60, W.size + 60),
    new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.96, map: noiseTex() })
  );
  ground.material.map.repeat.set(46, 46);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(360, W.size + 420),
    new THREE.MeshStandardMaterial({ color: 0x16405c, roughness: 0.12, metalness: 0.7 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(W.promenadeX + 30 + 180 - 60, -0.32, 0);
  group.add(water);

  addBox('slab', 32, 0.22, W.size + 30, W.promenadeX + 14, 0.11, 0, 0x8f8a80, 0.05);
  for (let z = -W.size / 2; z <= W.size / 2; z += 18) {
    addTree(W.promenadeX + 26, z, true);
    if (R() < 0.5) addBox('dark', 1.7, 0.5, 0.55, W.promenadeX + 9, 0.55, z + 9, 0x3a3028, 0.1);
  }
  // pagar promenade dengan celah di dermaga
  aabbs.push({ minX: W.promenadeX + 27, maxX: W.promenadeX + 28.2, minZ: -W.size, maxZ: -50 });
  aabbs.push({ minX: W.promenadeX + 27, maxX: W.promenadeX + 28.2, minZ: -30, maxZ: W.size });
  // pagar visual: tiang + rel, dua segmen mengikuti celah
  for (let z = -W.size / 2; z <= W.size / 2; z += 6) {
    if (z > -52 && z < -28) continue;
    addBox('dark', 0.14, 1, 0.14, W.promenadeX + 27.6, 0.7, z, 0x3a3f48);
  }
  for (const [z1, z2] of [[-W.size / 2, -50], [-30, W.size / 2]]) {
    const mid = (z1 + z2) / 2, len = z2 - z1;
    addBox('metal', 0.12, 0.12, len, W.promenadeX + 27.6, 1.15, mid, 0x8a929e);
  }

  // dermaga kecil
  addBox('roofC', 26, 0.4, 6, W.promenadeX + 40, 0.1, -40, 0x6b6458);
  for (const [px, pz] of [[W.promenadeX + 28, -42], [W.promenadeX + 28, -38], [W.promenadeX + 52, -42], [W.promenadeX + 52, -38]]) {
    addBox('dark', 0.5, 2.4, 0.5, px, 0.6, pz, 0x4a3d30);
  }

  /* ----- blok demi blok ----- */

  const midriseSigns = ['TOKO BAROKAH', 'WARNET SENJA', 'LAUNDRY KILAT', 'KOPI PAGI', 'BENGKEL PAK MIN', 'PASAR MURAH', 'TOKO BANGUNAN', 'GADAI CEPAK'];

  for (let bi = 0; bi < W.blocks; bi++) {
    for (let bj = 0; bj < W.blocks; bj++) {
      const x0 = W.blockMin(bi), z0 = W.blockMin(bj);
      const cx = x0 + W.block / 2, cz = z0 + W.block / 2;
      const dist = districtOf(bi, bj);

      // pelat trotoar blok
      addBox('slab', W.block, 0.18, W.block, cx, 0.09, cz, dist === 'taman' ? 0x8a8a84 : 0x9a978f, 0.05);

      if (dist === 'downtown') {
        const nTowers = R() < 0.5 ? 1 : 2;
        if (nTowers === 1) {
          const w = 16 + R() * 8, d = 16 + R() * 8, h = 42 + R() * 46;
          addBuilding(cx, cz, w, d, h, R() < 0.55 ? 'glassA' : 'glassB');
          const w2 = w * 0.6, d2 = d * 0.6;
          addBuilding(cx, cz, w2, d2, h + 8 + R() * 14, 'glassA');
          if (h > 66) addBox('dark', 2, 3, 2, cx, h + 14, cz, 0x2a2e36);
        } else {
          const h1 = 34 + R() * 30, h2 = 28 + R() * 36;
          addBuilding(cx - 8.5, cz, 15, 30, h1, R() < 0.5 ? 'glassA' : 'coolA');
          addBuilding(cx + 8.5, cz, 15, 30, h2, R() < 0.5 ? 'glassB' : 'coolB');
        }
      } else if (dist === 'midrise' || dist === 'warung') {
        if (dist === 'warung') {
          // bangunan hanya di sisi timur-laut; pojok barat-daya untuk warung
          addBuilding(cx + 8, cz + 8, 17, 17, 10 + R() * 6, R() < 0.5 ? 'warmA' : 'warmB');
          addBuilding(cx + 8, cz - 9, 17, 12, 8 + R() * 5, 'warmA');
        } else {
          const vert = R() < 0.5;
          const w1 = vert ? 14 + R() * 2 : 30, d1 = vert ? 30 : 14 + R() * 2;
          addBuilding(vert ? cx - 8.5 : cx, cz, w1, d1, 11 + R() * 15, R() < 0.5 ? 'warmA' : 'coolA');
          addBuilding(vert ? cx + 8.5 : cx, cz, vert ? 14 + R() * 2 : 30, vert ? 30 : 14 + R() * 2, 11 + R() * 17, R() < 0.5 ? 'warmB' : 'coolB');
        }
        // warung di blok khusus
        if (dist === 'warung') {
          addBox('warmA', 5.4, 2.7, 4.2, 12.5, 1.53, 12, null); // tanpa tint: jaga atribut merge konsisten
          addCollider(12.5, 12, 5.4, 4.2);
          const awn = new THREE.BoxGeometry(5.8, 0.12, 2.2);
          tint(awn, 0x9c3d2e, 0.05);
          const awnMesh = new THREE.Mesh(awn, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
          awnMesh.position.set(10.4, 2.9, 12);
          awnMesh.rotation.z = -0.28;
          group.add(awnMesh);
          addSign('WARUNG KURIR', 9.75, 4.4, 12, -Math.PI / 2, '#ffce7a', 4.4);
        }
        // rambu toko pada sisi menghadap jalan (acak)
        if (dist === 'midrise' && R() < 0.5 && midriseSigns.length) {
          const t = midriseSigns.splice((R() * midriseSigns.length) | 0, 1)[0];
          const north = R() < 0.5;
          addSign(t, cx, 6.4, north ? z0 + 0.12 : z0 + W.block - 0.12, north ? 0 : Math.PI, '#ffd9a0');
        }
      } else if (dist === 'kampung') {
        for (let li = 0; li < 2; li++) {
          for (let lj = 0; lj < 2; lj++) {
            if (R() < 0.18) continue;
            const hx = x0 + 9.5 + li * 17 + (R() - 0.5) * 2;
            const hz = z0 + 9.5 + lj * 17 + (R() - 0.5) * 2;
            const w = 5.5 + R() * 3, d = 5 + R() * 3, h = 3.4 + R() * 1.8;
            addBuilding(hx, hz, w, d, h, R() < 0.6 ? 'warmA' : 'warmB');
            houseRoof(hx, hz, w, d, h);
          }
        }
        for (let i = 0; i < 3; i++) addTree(x0 + 3 + R() * 30, z0 + 3 + R() * 30);
      } else if (dist === 'industri') {
        addBuilding(cx, cz, 26, 15, 7 + R() * 3, 'coolB');
        for (let i = 0; i < 2; i++) {
          const tx = x0 + 8 + i * 10, tz = z0 + 28;
          const tg = new THREE.CylinderGeometry(3, 3, 9, 14);
          tint(tg, 0x9aa2ac, 0.08);
          B('metal').push(at(tg, tx, 4.5, tz));
          circles.push({ x: tx, z: tz, r: 3.2 });
        }
        if (bi === 5) { // menara radio di blok industri ini
          const mx = x0 + 30, mz = z0 + 7;
          const mg = new THREE.CylinderGeometry(0.7, 1.6, 44, 8);
          tint(mg, 0xb04a3a, 0.05);
          B('metal').push(at(mg, mx, 22, mz));
          for (let yy = 12; yy <= 36; yy += 12) addBox('dark', 3.4, 0.22, 0.22, mx, yy, mz, 0x33363e);
          const blink = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff3030, emissiveIntensity: 2 })
          );
          blink.position.set(mx, 44.6, mz);
          group.add(blink);
          cityBlink = blink.material;
          circles.push({ x: mx, z: mz, r: 2 });
        }
      } else if (dist === 'tepilaut') {
        addBuilding(cx, cz, 20 + R() * 8, 20 + R() * 8, 6 + R() * 8, R() < 0.5 ? 'warmB' : 'coolA');
        for (let i = 0; i < 2; i++) addTree(x0 + 4 + R() * 28, z0 + 4 + R() * 28, true);
      } else if (dist === 'taman') {
        addBox('grass', W.block - 5, 0.06, W.block - 5, cx, 0.2, cz, 0x4a8a52, 0.1);
        const pond = new THREE.CircleGeometry(6.5, 22);
        pond.rotateX(-Math.PI / 2);
        B('waterDisc').push(at(pond, cx + 4, 0.26, cz + 4));
        circles.push({ x: cx + 4, z: cz + 4, r: 6.7 });
        for (let i = 0; i < 20; i++) {
          const tx = x0 + 3 + R() * 30, tz = z0 + 3 + R() * 30;
          if (Math.hypot(tx - cx - 4, tz - cz - 4) < 9) continue;
          addTree(tx, tz);
        }
        for (let i = 0; i < 4; i++) addBox('dark', 1.7, 0.5, 0.55, x0 + 6 + i * 8, 0.55, z0 + 4.5, 0x3a3028, 0.1);
      } else if (dist === 'alun') {
        addBox('slab', W.block - 4, 0.05, W.block - 4, cx, 0.2, cz, 0xb0a89a, 0.04);
        // monumen senja: menara + cincin menyala
        addBox('roofC', 9, 1.1, 9, cx, 0.75, cz, 0x8a8478);
        const spire = new THREE.ConeGeometry(2.3, 26, 6);
        tint(spire, 0xc9b896, 0.05);
        B('metal').push(at(spire, cx, 14, cz));
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.TorusGeometry(3.2 - i * 0.55, 0.14, 8, 28);
          ring.rotateX(Math.PI / 2);
          B('lampRing').push(at(ring, cx, 6.5 + i * 4.5, cz));
        }
        circles.push({ x: cx, z: cz, r: 4.2 });
        for (let i = 0; i < 6; i++) addTree(x0 + 3.5, z0 + 5 + i * 5.2);
        for (let i = 0; i < 6; i++) addTree(x0 + 32.5, z0 + 5 + i * 5.2);
        for (let i = 0; i < 3; i++) addBox('dark', 1.7, 0.5, 0.55, x0 + 8 + i * 10, 0.55, z0 + 31.5, 0x3a3028, 0.1);
      } else if (dist === 'klinik' || dist === 'polisi') {
        const isClinic = dist === 'klinik';
        addBuilding(cx, cz, 20, 14, isClinic ? 18 : 12, isClinic ? 'coolB' : 'coolA');
        addSign(isClinic ? 'KLINIK KOTA' : 'POLSEK SENJA', cx, isClinic ? 14.6 : 9.8, cz - 7.15, Math.PI, isClinic ? '#ff8a8a' : '#9ec2ff', 7);
        // palang klinik menyala
        if (isClinic) {
          addBox('redlight', 2.6, 0.6, 0.3, cx, 12.5, cz - 7.1, 0xffffff);
          addBox('redlight', 0.6, 2.6, 0.3, cx, 12.5, cz - 7.1, 0xffffff);
        }
      } else if (dist === 'stadion') {
        const ring = new THREE.CylinderGeometry(15, 15.5, 7.5, 26, 1, true);
        tint(ring, 0xa8a094, 0.06);
        ring.material = null;
        B('roofC').push(at(ring, cx, 3.75, cz));
        const field = new THREE.CircleGeometry(13, 24);
        field.rotateX(-Math.PI / 2);
        tint(field, 0x4a8a52, 0.1);
        B('grass').push(at(field, cx, 0.3, cz));
        circles.push({ x: cx, z: cz, r: 15.8 });
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          addBox('dark', 0.4, 11, 0.4, cx + sx * 13, 5.5, cz + sz * 13, 0x2a2e36);
          const headG = new THREE.BoxGeometry(2.2, 1, 0.4);
          B('lampHead').push(at(headG, cx + sx * 13, 11.2, cz + sz * 13));
        }
      }
    }
  }

  /* ----- lampu jalan, lampu lalu lintas, slot parkir ----- */

  for (let i = 0; i <= W.blocks; i++) {
    const c = W.roadAt(i);
    for (let p = W.start + 14; p < W.start + W.size - 14; p += 26) {
      const nearInt = (p - W.start) % W.cell;
      if (nearInt < 8 || nearInt > W.cell - 8) continue;
      addLamp(p, c - 8.2);
      addLamp(p + 13, c + 8.2);
      addLamp(c - 8.2, p + 13);
      addLamp(c + 8.2, p);
      // slot parkir pinggir jalan
      if (R() < 0.3) slots.push({ x: p, z: c - 5.6, heading: Math.PI / 2 });
      if (R() < 0.3) slots.push({ x: c + 5.6, z: p, heading: 0 });
      if (R() < 0.3) slots.push({ x: p + 13, z: c + 5.6, heading: -Math.PI / 2 });
    }
  }

  for (let i = 0; i <= W.blocks; i++) {
    for (let j = 0; j <= W.blocks; j++) {
      const x = W.roadAt(i), z = W.roadAt(j);
      const edge = Math.min(i === 0 || i === W.blocks, j === 0 || j === W.blocks);
      if (edge && (i === 0 || i === W.blocks) && (j === 0 || j === W.blocks)) continue;
      if (i % 2 === j % 2) {
        addTrafficLight(x + 8.2, z + 8.2, 'NS');
        addTrafficLight(x - 8.2, z - 8.2, 'EW');
      }
    }
  }

  /* ----- batas dunia (tembok tak terlihat) ----- */

  const e = W.size / 2 + 30;
  aabbs.push({ minX: -e, maxX: -W.bounds - 1, minZ: -e, maxZ: e });
  aabbs.push({ minX: W.bounds + 27, maxX: e, minZ: -e, maxZ: e }); // sisi laut: pagar promenade
  aabbs.push({ minX: -W.bounds - 1, maxX: W.bounds + 27, minZ: -e, maxZ: -W.bounds - 1 });
  aabbs.push({ minX: -W.bounds - 1, maxX: W.bounds + 27, minZ: W.bounds + 1, maxZ: e });

  /* ----- material & merge ----- */

  const winA = windowTex('#8a7a62', '#ffd9a0', '#181a20');
  const winB = windowTex('#6a7488', '#cfe0ff', '#14161c');
  const winC = windowTex('#7c6a52', '#ffcf8e', '#191a1f');
  const glassTexA = windowTex('#233240', '#bcd8f0', '#101c26', 10, 14);
  const glassTexB = windowTex('#1e2c3a', '#ffe2b0', '#0e161e', 8, 12);
  for (const t of [winA, winB, winC, glassTexA, glassTexB]) {
    t.emissiveMap = t; // pakai peta yang sama: jendela yang menyala ikut emissive
  }

  const std = (opts) => new THREE.MeshStandardMaterial(opts);
  const mats = {
    slab: std({ vertexColors: true, roughness: 0.92 }),
    grass: std({ vertexColors: true, roughness: 0.95 }),
    roof: std({ vertexColors: true, roughness: 0.85 }),
    roofC: std({ vertexColors: true, roughness: 0.8 }),
    warmA: std({ map: winA, emissiveMap: winA, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.85 }),
    warmB: std({ map: winC, emissiveMap: winC, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.85 }),
    coolA: std({ map: winB, emissiveMap: winB, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.8 }),
    coolB: std({ map: winB, emissiveMap: winB, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.8 }),
    glassA: std({ map: glassTexA, emissiveMap: glassTexA, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.25, metalness: 0.6 }),
    glassB: std({ map: glassTexB, emissiveMap: glassTexB, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.25, metalness: 0.6 }),
    dark: std({ vertexColors: true, roughness: 0.7, metalness: 0.3 }),
    metal: std({ vertexColors: true, roughness: 0.35, metalness: 0.7 }),
    trunk: std({ vertexColors: true, roughness: 0.95 }),
    leaf: std({ vertexColors: true, roughness: 0.9 }),
    paint: std({ color: 0xcfd4dd, roughness: 0.85 }),
    lampHead: std({ color: 0xfff2cf, emissive: 0xffdf9e, emissiveIntensity: 0.15, roughness: 0.4 }),
    lampRing: std({ color: 0xffe2ae, emissive: 0xffc26e, emissiveIntensity: 0.3, roughness: 0.4 }),
    pool: new THREE.MeshBasicMaterial({ map: null, color: 0xffca7a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    waterDisc: std({ color: 0x2e6a8a, roughness: 0.15, metalness: 0.6 }),
    redlight: std({ color: 0x882222, emissive: 0xff4040, emissiveIntensity: 0.8, roughness: 0.5 }),
    tlRA: std({ color: 0x400000, emissive: 0xff2020, emissiveIntensity: 0.05 }),
    tlRB: std({ color: 0x400000, emissive: 0xff2020, emissiveIntensity: 0.05 }),
    tlY: std({ color: 0x403800, emissive: 0xffcc20, emissiveIntensity: 0.05 }),
    tlGA: std({ color: 0x003300, emissive: 0x30ff50, emissiveIntensity: 0.05 }),
    tlGB: std({ color: 0x003300, emissive: 0x30ff50, emissiveIntensity: 0.05 }),
  };
  mats.pool.map = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  nightEmissives.push(
    { mat: mats.warmA, day: 0.1, night: 1.15 },
    { mat: mats.warmB, day: 0.1, night: 1.15 },
    { mat: mats.coolA, day: 0.1, night: 1.1 },
    { mat: mats.coolB, day: 0.1, night: 1.1 },
    { mat: mats.glassA, day: 0.08, night: 0.95 },
    { mat: mats.glassB, day: 0.08, night: 0.95 },
    { mat: mats.lampHead, day: 0.12, night: 2.6 },
    { mat: mats.lampRing, day: 0.25, night: 1.8 },
    { mat: mats.pool, day: 0, night: 0.5, prop: 'opacity' },
  );

  for (const [key, geos] of Object.entries(buckets)) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos, false);
    if (!merged) {
      const ref = Object.keys(geos[0].attributes).sort().join(',');
      geos.forEach((g, i) => {
        const k = Object.keys(g.attributes).sort().join(',');
        if (k !== ref) console.error(`[city] bucket "${key}" geo#${i}: attrs=${k} != ref=${ref}`);
      });
      throw new Error(`mergeGeometries gagal di bucket "${key}"`);
    }
    const mesh = new THREE.Mesh(merged, mats[key]);
    mesh.castShadow = ['warmA', 'warmB', 'coolA', 'coolB', 'glassA', 'glassB', 'roof', 'roofC', 'trunk', 'leaf', 'metal', 'dark'].includes(key);
    mesh.receiveShadow = true;
    group.add(mesh);
    geos.forEach((g) => g.dispose());
  }

  /* ----- graf jalan untuk AI ----- */

  const GN = W.blocks + 1;
  const nodePos = (id) => ({ x: W.roadAt((id / GN) | 0), z: W.roadAt(id % GN) });
  const neighbors = (id) => {
    const i = (id / GN) | 0, j = id % GN, out = [];
    if (i > 0) out.push(id - GN);
    if (i < W.blocks) out.push(id + GN);
    if (j > 0) out.push(id - 1);
    if (j < W.blocks) out.push(id + 1);
    return out;
  };
  const nearestNode = (x, z) => {
    const i = clamp(Math.round((x - W.roadAt(0)) / W.cell), 0, W.blocks);
    const j = clamp(Math.round((z - W.roadAt(0)) / W.cell), 0, W.blocks);
    return i * GN + j;
  };
  const randomEdgePoint = (px, pz, minD, maxD) => {
    for (let tries = 0; tries < 60; tries++) {
      const a = (Math.random() * GN * GN) | 0;
      const nb = neighbors(a);
      const b = nb[(Math.random() * nb.length) | 0];
      const t = 0.1 + Math.random() * 0.8;
      const pa = nodePos(a), pb = nodePos(b);
      const x = pa.x + (pb.x - pa.x) * t, z = pa.z + (pb.z - pa.z) * t;
      const d = Math.hypot(x - px, z - pz);
      if (d >= minD && d <= maxD) return { x, z };
    }
    return { x: nodePos(0).x, z: nodePos(0).z };
  };

  /* ----- titik penting & koin ----- */

  const spawn = {
    player: { x: 9.2, z: 24 },
    firstCar: { x: 5.6, z: 30, heading: 0, type: 'rangkok', color: 0 },
    courier: { x: 8.8, z: 16 },
    hospital: { x: -75, z: -104 },
    police: { x: 125, z: 140 },
  };

  const coinSpots = [
    { id: 'c1', x: 75, z: -68 },
    { id: 'c2', x: -121, z: 116 },
    { id: 'c3', x: -175, z: -156 },
    { id: 'c4', x: W.promenadeX + 49, z: -40 },
    { id: 'c5', x: W.promenadeX + 10, z: 170 },
    { id: 'c6', x: 219, z: 68 },
    { id: 'c7', x: -75, z: -106 },
    { id: 'c8', x: 125, z: 142 },
    { id: 'c9', x: -136, z: 141 },
    { id: 'c10', x: 75, z: 241 },
  ];

  /* ----- kanvas peta (untuk minimap & peta besar) ----- */

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapCanvas.height = 768;
  {
    const ctx = mapCanvas.getContext('2d');
    const span = W.size + 80;
    const sc = 768 / span;
    const ox = -W.size / 2 - 40, oz = -W.size / 2 - 40;
    const px = (x) => (x - ox) * sc, pz = (z) => (z - oz) * sc;
    ctx.fillStyle = '#22262e';
    ctx.fillRect(0, 0, 768, 768);
    // laut
    ctx.fillStyle = '#1c3a52';
    ctx.fillRect(px(W.promenadeX + 28), 0, 768, 768);
    // promenade
    ctx.fillStyle = '#55504a';
    ctx.fillRect(px(W.promenadeX - 2), 0, 30 * sc, 768);
    for (let bi = 0; bi < W.blocks; bi++) {
      for (let bj = 0; bj < W.blocks; bj++) {
        ctx.fillStyle = BLOCK_COLORS[districtOf(bi, bj)];
        ctx.fillRect(px(W.blockMin(bi)), pz(W.blockMin(bj)), W.block * sc, W.block * sc);
      }
    }
    // penanda landmark
    const dot = (x, z, col, r = 5) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px(x), pz(z), r, 0, 7); ctx.fill(); };
    dot(75, -75, '#ffca7a', 6);           // monumen
    dot(-175, -175, '#c9b8d8', 6);        // stadion
    dot(-125, 125, '#5da86a', 5);         // taman
    dot(37, 214, '#d86a5a', 4);          // menara radio
  }


  /* ----- animasi kota (lampu lalu lintas, lampu berkedip) ----- */

  let tlClock = 0;
  function update(dt) {
    tlClock = (tlClock + dt) % 16;
    const p = tlClock;
    const on = (m, v) => { m.emissiveIntensity = v; };
    // fase: NS hijau 0-7 -> kuning 7-8.5 -> EW hijau 8.5-15.5 -> kuning 15.5-16
    if (p < 7) {
      on(mats.tlGA, 2.4); on(mats.tlRA, 0.05); on(mats.tlY, 0.05);
      on(mats.tlGB, 0.05); on(mats.tlRB, 2.4);
    } else if (p < 8.5) {
      on(mats.tlGA, 0.05); on(mats.tlRA, 0.05); on(mats.tlY, 2.6);
      on(mats.tlGB, 0.05); on(mats.tlRB, 2.4);
    } else if (p < 15.5) {
      on(mats.tlGA, 0.05); on(mats.tlRA, 2.4); on(mats.tlY, 0.05);
      on(mats.tlGB, 2.4); on(mats.tlRB, 0.05);
    } else {
      on(mats.tlGA, 0.05); on(mats.tlRA, 2.4); on(mats.tlY, 2.6);
      on(mats.tlGB, 0.05); on(mats.tlRB, 0.05);
    }
    if (cityBlink) cityBlink.emissiveIntensity = Math.sin(performance.now() * 0.004) > 0 ? 2.5 : 0.15;
  }

  return {
    group, aabbs, circles, slots, spawn, coinSpots,
    nightEmissives, mapCanvas, mapScale: 768 / (W.size + 80), mapOrigin: -W.size / 2 - 40,
    nodePos, neighbors, nearestNode, randomEdgePoint,
    graphSize: GN,
    update,
  };
}
