// Pejalan kaki: jalan santai di trotoar, kabur kalau bahaya, tumbang kalau ditabrak.

import * as THREE from 'three';
import { makeHuman } from './models.js';
import { clamp } from './config.js';
import { G, bus } from './state.js';

export class Peds {
  constructor(scene, city, count) {
    this.scene = scene;
    this.city = city;
    this.list = [];
    this.count = count;
    for (let i = 0; i < count; i++) this.list.push(this._spawn(2000 + i * 37));
  }

  _randomEdge() {
    const city = this.city;
    const a = (Math.random() * city.graphSize * city.graphSize) | 0;
    const nb = city.neighbors(a);
    const b = nb[(Math.random() * nb.length) | 0];
    return { a, b, t: Math.random() };
  }

  _edgePos(e) {
    const pa = this.city.nodePos(e.a), pb = this.city.nodePos(e.b);
    const dx = pb.x - pa.x, dz = pb.z - pa.z;
    const len = Math.hypot(dx, dz) || 1;
    const dirx = dx / len, dirz = dz / len;
    return {
      x: pa.x + dx * e.t - dirz * 8.6,
      z: pa.z + dz * e.t + dirx * 8.6,
      dirx, dirz, len,
    };
  }

  _spawn() {
    const group = makeHuman();
    this.scene.add(group);
    const p = {
      group,
      state: 'walk', // walk | flee | down
      edge: this._randomEdge(),
      yaw: 0,
      speed: 1.3 + Math.random() * 0.7,
      walkT: Math.random() * 10,
      timer: 0,
      fleeFrom: null,
      pos: new THREE.Vector3(),
    };
    const ep = this._edgePos(p.edge);
    p.pos.set(ep.x, 0, ep.z);
    p.yaw = Math.atan2(ep.dirx, ep.dirz);
    return p;
  }

  knock(ped, duration = 3.5) {
    if (ped.state === 'down') return;
    ped.state = 'down';
    ped.timer = duration;
    ped.group.rotation.z = Math.PI / 2;
    ped.group.position.y = 0.32;
  }

  _revive(ped) {
    ped.state = 'flee';
    ped.timer = 4;
    ped.group.rotation.z = 0;
    ped.group.position.y = 0;
  }

  tryPunch(px, pz, yaw) {
    for (const ped of this.list) {
      if (ped.state === 'down') continue;
      const d = Math.hypot(ped.pos.x - px, ped.pos.z - pz);
      if (d > 1.9) continue;
      const toYaw = Math.atan2(ped.pos.x - px, ped.pos.z - pz);
      let diff = Math.abs(((toYaw - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 1.1) {
        this.knock(ped, 2.6);
        bus.emit('crime', { stars: 1, label: 'meninju warga' });
        return true;
      }
    }
    return false;
  }

  update(dt, playerPos, vehicles) {
    for (const ped of this.list) {
      // daur ulang yang terlalu jauh
      const pd = Math.hypot(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
      if (pd > 130) {
        ped.edge = this._randomEdge();
        // cari titik yang cukup dekat pemain
        for (let i = 0; i < 8; i++) {
          const ep = this._edgePos(ped.edge);
          const d = Math.hypot(ep.x - playerPos.x, ep.z - playerPos.z);
          if (d > 25 && d < 95) { ped.pos.set(ep.x, 0, ep.z); break; }
          ped.edge = this._randomEdge();
        }
        ped.state = 'walk';
        ped.group.rotation.z = 0;
      }

      if (ped.state === 'down') {
        ped.timer -= dt;
        if (ped.timer <= 0) this._revive(ped);
        continue;
      }

      // tabrakan kendaraan
      for (const v of vehicles) {
        if (v.speed < 4.5 || v.dead) continue;
        const d = Math.hypot(v.pos.x - ped.pos.x, v.pos.z - ped.pos.z);
        if (d < 1.9) {
          this.knock(ped, 4);
          bus.emit('thud', { x: ped.pos.x, z: ped.pos.z });
          if (v.ai === 'player') bus.emit('crime', { stars: 1, label: 'menabrak warga' });
          break;
        }
        // kabur dari mobil yang melaju kencang di dekatnya
        if (v.speed > 9 && d < 7 && ped.state === 'walk') {
          ped.state = 'flee';
          ped.timer = 2.2;
          ped.fleeFrom = { x: v.pos.x, z: v.pos.z };
        }
      }
      if (ped.state === 'down') continue;

      if (ped.state === 'flee') {
        ped.timer -= dt;
        if (ped.timer <= 0) { ped.state = 'walk'; ped.edge = this._randomEdge(); }
        const f = ped.fleeFrom || playerPos;
        const ax = ped.pos.x - f.x, az = ped.pos.z - f.z;
        const al = Math.hypot(ax, az) || 1;
        const runSpeed = 3.6;
        this._move(ped, ax / al, az / al, runSpeed, dt);
        ped.walkT += runSpeed * dt * 2.4;
        ped.group.userData.setWalk(ped.walkT, 0.75);
        continue;
      }

      // jalan normal di trotoar
      const e = ped.edge;
      const prevT = e.t;
      e.t += (ped.speed / e.len) * dt;
      if (e.t >= 1) {
        const nb = this.city.neighbors(e.b).filter((n) => n !== e.a);
        const next = nb.length ? nb[(Math.random() * nb.length) | 0] : e.a;
        e.a = e.b; e.b = next; e.t = 0;
      }
      const ep = this._edgePos(e);
      ped.pos.set(ep.x, 0, ep.z);
      const movingForward = e.t > prevT;
      ped.yaw = Math.atan2(movingForward ? ep.dirx : -ep.dirx, movingForward ? ep.dirz : -ep.dirz);
      ped.walkT += ped.speed * dt * 2.4;
      ped.group.userData.setWalk(ped.walkT, 0.5);
    }
  }

  _move(ped, dx, dz, speed, dt) {
    const nx = ped.pos.x + dx * speed * dt;
    const nz = ped.pos.z + dz * speed * dt;
    // hindari bangunan secara kasar: kalau di dalam AABB, putar arah
    let blocked = false;
    for (const b of this.city.aabbs) {
      if (nx > b.minX - 0.4 && nx < b.maxX + 0.4 && nz > b.minZ - 0.4 && nz < b.maxZ + 0.4) { blocked = true; break; }
    }
    ped.yaw = Math.atan2(dx, dz);
    if (blocked) {
      // putar 90 derajat
      const tdx = -dz, tdz = dx;
      ped.pos.x += tdx * speed * dt;
      ped.pos.z += tdz * speed * dt;
      ped.yaw = Math.atan2(tdx, tdz);
    } else {
      ped.pos.x = nx;
      ped.pos.z = nz;
    }
    ped.group.position.set(ped.pos.x, 0, ped.pos.z);
    ped.group.rotation.y = ped.yaw;
  }
}
