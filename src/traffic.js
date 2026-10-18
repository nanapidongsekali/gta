// Manajer lalu lintas: mobil AI mengikuti graf jalan, mobil parkir didaur
// ulang di sekitar pemain, dan mobil polisi yang mengejar saat dicari.

import * as THREE from 'three';
import { Vehicle } from './vehicle.js';
import { CAR_SHAPES } from './models.js';
import { clamp } from './config.js';
import { G, bus } from './state.js';

const CIVIL_TYPES = ['jalak', 'jalak', 'banteng', 'gajah', 'cepuk', 'taksi', 'rangkok'];
const wrapAngle = (a) => {
  let d = a % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export class Traffic {
  constructor(scene, city, fx, audio, quality) {
    this.scene = scene;
    this.city = city;
    this.fx = fx;
    this.audio = audio;
    this.quality = quality;
    this.vehicles = [];   // semua kendaraan di dunia
    this.flows = [];      // entri AI lalu lintas {v, a, b, t, speed}
    this.cops = [];       // {v}
    this.spawnT = 0;
    this.arrestT = 0;
    this.lightbarT = 0;
    this.honkCd = 0;
  }

  /* ----- pemijahan ----- */

  spawnTraffic(px, pz) {
    const p = this.city.randomEdgePoint(px, pz, 55, 150);
    const a = this.city.nearestNode(p.x, p.z);
    const nb = this.city.neighbors(a);
    const b = nb[(Math.random() * nb.length) | 0];
    const type = CIVIL_TYPES[(Math.random() * CIVIL_TYPES.length) | 0];
    const ci = (Math.random() * 4) | 0;
    const v = new Vehicle(this.scene, type, ci, p.x, p.z, 0, this.shared);
    v.ai = 'traffic';
    this.vehicles.push(v);
    this.flows.push({ v, a, b, t: Math.random() * 0.5, speed: 8 + Math.random() * 4 });
  }

  spawnParked(px, pz) {
    const slots = this.city.slots;
    for (let tries = 0; tries < 30; tries++) {
      const s = slots[(Math.random() * slots.length) | 0];
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d < 30 || d > 130) continue;
      if (this.vehicles.some((v) => Math.hypot(v.pos.x - s.x, v.pos.z - s.z) < 5)) continue;
      const type = CIVIL_TYPES[(Math.random() * CIVIL_TYPES.length) | 0];
      const v = new Vehicle(this.scene, type, (Math.random() * 4) | 0, s.x, s.z, s.heading, this.shared);
      v.ai = 'parked';
      this.vehicles.push(v);
      return;
    }
  }

  spawnCop(px, pz) {
    const p = this.city.randomEdgePoint(px, pz, 80, 140);
    const v = new Vehicle(this.scene, 'polisi', 0, p.x, p.z, Math.random() * 6.28, this.shared);
    v.ai = 'police';
    this.vehicles.push(v);
    this.cops.push({ v });
  }

  removeVehicle(v) {
    this.vehicles = this.vehicles.filter((x) => x !== v);
    this.flows = this.flows.filter((f) => f.v !== v);
    this.cops = this.cops.filter((c) => c.v !== v);
    v.dispose();
  }

  /* ----- antarmuka bajak (jack) ----- */

  nearestJackable(pos, radius) {
    let best = null, bestD = radius;
    for (const v of this.vehicles) {
      if (v.dead || v.ai === 'player') continue;
      const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }

  jack(v, playerPos) {
    if (v.ai === 'traffic') {
      this.flows = this.flows.filter((f) => f.v !== v);
      bus.emit('ped-flee', { x: v.pos.x, z: v.pos.z }); // sopir kabur
    }
    if (v.ai === 'police') bus.emit('crime', { stars: 1, label: 'mencuri mobil polisi' });
    v.ai = 'player';
    v.vf = 0; v.vlat = 0;
  }

  /* ----- AI ----- */

  _flowStep(f, dt, px, pz) {
    const city = this.city;
    const pa = city.nodePos(f.a), pb = city.nodePos(f.b);
    const dx = pb.x - pa.x, dz = pb.z - pa.z;
    const len = Math.hypot(dx, dz) || 1;
    const dirx = dx / len, dirz = dz / len;

    // Perlambat dekat persimpangan & kalau ada yang menghalangi
    let target = f.speed;
    if (f.t > 0.82 || f.t < 0.12) target = Math.min(target, 5);
    const probeX = pa.x + dx * (f.t + 7 / len) - dirz * 3.5;
    const probeZ = pa.z + dz * (f.t + 7 / len) + dirx * 3.5;
    let blocked = false;
    for (const o of this.vehicles) {
      if (o === f.v) continue;
      if (Math.hypot(o.pos.x - probeX, o.pos.z - probeZ) < 3.4) { blocked = true; break; }
    }
    if (!blocked && G.mode === 'foot' &&
        Math.hypot(G.vehicle ? -1e9 : 0, 0) === 0) { /* pemain jalan kaki dicek di bawah */ }
    if (!blocked && G.mode === 'foot') {
      const player = G.playerPos;
      if (player && Math.hypot(player.x - probeX, player.z - probeZ) < 2.6) blocked = true;
    }
    f.v.blockedT = blocked ? f.v.blockedT + dt : 0;
    if (blocked) target = 0;
    if (f.v.blockedT > 2.2 && this.honkCd <= 0) {
      this.audio.sfx('honk');
      this.honkCd = 1.6;
      f.v.blockedT = 0;
    }

    const cur = f.v.speed;
    const nv = cur < target ? Math.min(cur + 7 * dt, target) : Math.max(cur - 14 * dt, target);
    f.v.vf = nv;
    f.t += (nv / len) * dt;

    if (f.t >= 1) {
      const nb = city.neighbors(f.b).filter((n) => n !== f.a);
      const next = nb.length ? nb[(Math.random() * nb.length) | 0] : f.a;
      f.a = f.b; f.b = next; f.t = 0;
    }

    const t = clamp(f.t, 0, 1);
    const lx = pa.x + dx * t - dirz * 3.5;
    const lz = pa.z + dz * t + dirx * 3.5;
    f.v.pos.set(lx, 0, lz);
    f.v.heading = Math.atan2(dirx, dirz);
  }

  _driveCop(c, dt, target, obstacles) {
    const v = c.v;
    const dx = target.x - v.pos.x, dz = target.z - v.pos.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz);
    const diff = wrapAngle(desired - v.heading);
    let steer = clamp(diff * 1.7, -1, 1);

    // kumis anti-tembok: kalau titik depan nabrak, belok ke sisi yang bebas
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const hitAt = (ox, oz, m) => {
      for (const b of this.city.aabbs) {
        if (ox > b.minX - m && ox < b.maxX + m && oz > b.minZ - m && oz < b.maxZ + m) return true;
      }
      return false;
    };
    const px = v.pos.x + fx * 7, pz = v.pos.z + fz * 7;
    if (hitAt(px, pz, 1.6)) {
      const lx = px - fz * 3, lz = pz + fx * 3;
      steer = hitAt(lx, lz, 1.6) ? 1 : -1;
    }

    let throttle = 1;
    if (dist < 7) throttle = v.speed > 3 ? -0.8 : 0.2;
    else if (Math.abs(diff) > 2.1) throttle = 0.3;
    const hand = Math.abs(diff) > 1.5 && v.speed > 9;

    // hindari menabrak sesama polisi
    for (const o of obstacles) {
      if (o === v) continue;
      if (Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 4.5) throttle = Math.min(throttle, 0.3);
    }

    v.drive(dt, throttle, steer, hand);
    v.integrate(dt);
    v.collideStatic(this.city, dt);
    v.syncMesh(dt);
  }

  /* ----- loop utama ----- */

  update(dt, player, playerCar) {
    const px = player.x, pz = player.z;
    this.honkCd -= dt;

    // jaga populasi
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.6;
      if (this.flows.length < this.quality.traffic) this.spawnTraffic(px, pz);
      const parkedNear = this.vehicles.filter((v) => v.ai === 'parked').length;
      if (parkedNear < 10) this.spawnParked(px, pz);
    }
    // daur ulang yang jauh
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const d = Math.hypot(v.pos.x - px, v.pos.z - pz);
      if (v.ai === 'traffic' && d > 190) this.removeVehicle(v);
      else if (v.ai === 'parked' && d > 200) this.removeVehicle(v);
    }

    // lalu lintas kinematik
    for (const f of this.flows) {
      this._flowStep(f, dt);
      f.v.syncMesh(dt);
      f.v.setTail(false, G.night);
    }

    // polisi: jumlah mengikuti tingkat pencarian
    const want = clamp(G.wanted, 0, 4);
    while (this.cops.length < want) this.spawnCop(px, pz);
    this.lightbarT += dt;
    const lbPhase = Math.floor(this.lightbarT * 5) % 2;
    for (let i = this.cops.length - 1; i >= 0; i--) {
      const c = this.cops[i];
      if (G.wanted === 0) {
        const d = Math.hypot(c.v.pos.x - px, c.v.pos.z - pz);
        if (d > 90) { this.removeVehicle(c.v); continue; }
        // kabur lurus
        c.v.drive(dt, 1, 0, false);
        c.v.integrate(dt);
        c.v.collideStatic(this.city, dt);
        c.v.syncMesh(dt);
      } else {
        const target = G.mode === 'car' && playerCar ? playerCar.pos : player;
        this._driveCop(c, dt, target, this.cops.map((x) => x.v));
      }
      if (c.v.group.userData.lightbar) {
        const { mR, mB } = c.v.group.userData.lightbar;
        mR.emissiveIntensity = lbPhase ? 6 : 0;
        mB.emissiveIntensity = lbPhase ? 0 : 6;
      }
      c.v.setTail(false, G.night);
    }

    // tabrakan antar kendaraan
    this._vehicleCollisions(dt, playerCar);
  }

  _vehicleCollisions(dt, playerCar) {
    const list = this.vehicles;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const minD = (a.halfL + b.halfL) * 0.82;
        if (d > minD || d < 0.01) continue;
        const nx = dx / d, nz = dz / d;
        const overlap = minD - d;

        const va = a.getVel(), vb = b.getVel();
        const closing = (va.x - vb.x) * nx + (va.z - vb.z) * nz;

        // geser posisi
        if (a.ai !== 'traffic') { a.pos.x -= nx * overlap * 0.5; a.pos.z -= nz * overlap * 0.5; }
        if (b.ai !== 'traffic') { b.pos.x += nx * overlap * 0.5; b.pos.z += nz * overlap * 0.5; }

        if (closing > 2.5) {
          const mid = { x: (a.pos.x + b.pos.x) / 2, z: (a.pos.z + b.pos.z) / 2 };
          if (closing > 4) {
            this.fx.sparks(mid.x, 0.8, mid.z);
            bus.emit('crash', { x: mid.x, z: mid.z, strength: closing });
          }
          const imp = (closing - 2) * 2.4;
          a.damage(imp); b.damage(imp);
          // pantulkan kecepatan
          if (a.ai !== 'traffic') a.impact(-nx, -nz, 0.9);
          else a.vf *= 0.5;
          if (b.ai !== 'traffic') b.impact(nx, nz, 0.9);
          else b.vf *= 0.5;
          // menabrak polisi menambah pencarian
          const playerInvolved = a === playerCar || b === playerCar;
          if (playerInvolved && (a.ai === 'police' || b.ai === 'police') && closing > 6) {
            bus.emit('crime', { stars: 1, label: 'menabrak mobil polisi' });
          }
        }
      }
    }
  }

  /** Pencarian tertangkap: polisi dekat & pemain hampir berhenti. */
  checkArrest(dt, player, playerCar, playerSpeed) {
    if (G.wanted === 0) { this.arrestT = 0; return false; }
    let near = false;
    for (const c of this.cops) {
      const d = Math.hypot(c.v.pos.x - player.x, c.v.pos.z - player.z);
      if (G.mode === 'foot' && d < 4.2) near = true;
      else if (G.mode === 'car' && d < 5.5 && playerSpeed < 1.5) near = true;
    }
    if (near) this.arrestT += dt * (G.mode === 'foot' ? 1.1 : 0.45);
    else this.arrestT = Math.max(0, this.arrestT - dt * 1.6);
    if (this.arrestT > 1.5) { this.arrestT = 0; return true; }
    return false;
  }
}
