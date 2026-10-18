// Kendaraan: fisika arcade (akselerasi, setir, drift dengan rem tangan),
// tabrakan statis, kerusakan, dan ledakan.

import * as THREE from 'three';
import { CAR_SHAPES, makeCarMesh } from './models.js';
import { clamp } from './config.js';
import { bus } from './state.js';

export class Vehicle {
  constructor(scene, typeKey, colorIdx, x, z, heading, shared) {
    this.type = typeKey;
    this.spec = CAR_SHAPES[typeKey];
    const built = makeCarMesh(typeKey, colorIdx, shared);
    this.group = built.group;
    this.wheels = built.wheels;
    this.tailMat = built.tailMat;

    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.vf = 0;        // kecepatan maju (m/s)
    this.vlat = 0;      // kecepatan lateral (drift)
    this.steer = 0;
    this.health = 100;
    this.dead = false;
    this.ai = 'parked'; // parked | player | police | traffic
    this.smokeT = 0;
    this.crashCd = 0;
    this.blockedT = 0;
    this.halfL = this.spec.len / 2;
    this.halfW = this.spec.wid / 2;
    this.wheelBase = this.spec.len * 0.62;

    scene.add(this.group);
    this.scene = scene;
    this.syncMesh(0);
  }

  get speed() { return Math.abs(this.vf); }

  getVel() {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    return { x: fx * this.vf - fz * this.vlat, z: fz * this.vf + fx * this.vlat };
  }
  setVel(vx, vz) {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    this.vf = vx * fx + vz * fz;
    this.vlat = -vx * fz + vz * fx;
  }

  drive(dt, throttle, steerInput, hand) {
    const s = this.spec;
    if (throttle > 0) {
      this.vf += s.accel * throttle * (1 - clamp(this.vf / s.max, 0, 1)) * dt;
    } else if (throttle < 0) {
      if (this.vf > 0.5) this.vf += 30 * throttle * dt; // rem
      else this.vf = Math.max(this.vf + s.accel * 0.55 * throttle * dt, -s.max * 0.28); // mundur
    }
    this.vf -= this.vf * 0.32 * dt; // hambatan gulir + udara
    if (hand) this.vf -= Math.sign(this.vf) * Math.min(Math.abs(this.vf), 13 * dt);

    const steerMax = s.steer * clamp(1 - Math.abs(this.vf) / 95, 0.42, 1);
    this.steer += (steerInput * steerMax - this.steer) * (1 - Math.exp(-9 * dt));
    if (Math.abs(this.vf) > 0.4) {
      this.heading += this.steer * (this.vf / this.wheelBase) * dt;
    }

    const grip = hand ? 1.0 : s.grip;
    this.vlat *= Math.exp(-grip * dt);
  }

  integrate(dt) {
    const v = this.getVel();
    this.pos.x += v.x * dt;
    this.pos.z += v.z * dt;
  }

  impact(nx, nz, mul = 1.25) {
    const v = this.getVel();
    const vn = v.x * nx + v.z * nz;
    if (vn >= 0) return 0;
    v.x -= nx * vn * mul;
    v.z -= nz * vn * mul;
    this.setVel(v.x, v.z);
    const strength = -vn;
    if (strength > 3.5) this.damage((strength - 3.5) * 3.2);
    if (strength > 4 && this.crashCd <= 0) {
      this.crashCd = 0.4;
      bus.emit('crash', { x: this.pos.x, z: this.pos.z, strength });
    }
    return strength;
  }

  _corners() {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const rx = -fz, rz = fx;
    return [
      [this.pos.x + fx * this.halfL + rx * this.halfW, this.pos.z + fz * this.halfL + rz * this.halfW],
      [this.pos.x + fx * this.halfL - rx * this.halfW, this.pos.z + fz * this.halfL - rz * this.halfW],
      [this.pos.x - fx * this.halfL + rx * this.halfW, this.pos.z - fz * this.halfL + rz * this.halfW],
      [this.pos.x - fx * this.halfL - rx * this.halfW, this.pos.z - fz * this.halfL - rz * this.halfW],
    ];
  }

  collideStatic(city, dt) {
    this.crashCd -= dt;
    for (const [px, pz] of this._corners()) {
      for (const b of city.aabbs) {
        if (px <= b.minX || px >= b.maxX || pz <= b.minZ || pz >= b.maxZ) continue;
        const dl = px - b.minX, dr = b.maxX - px, dn = pz - b.minZ, df = b.maxZ - pz;
        const m = Math.min(dl, dr, dn, df);
        if (m === dl) { this.pos.x -= dl; this.impact(-1, 0); }
        else if (m === dr) { this.pos.x += dr; this.impact(1, 0); }
        else if (m === dn) { this.pos.z -= dn; this.impact(0, -1); }
        else { this.pos.z += df; this.impact(0, 1); }
      }
      for (const c of city.circles) {
        const dx = px - c.x, dz = pz - c.z;
        const d = Math.hypot(dx, dz), rr = c.r + 1.1;
        if (d < rr && d > 0.001) {
          const push = (rr - d);
          this.pos.x += (dx / d) * push;
          this.pos.z += (dz / d) * push;
          this.impact(dx / d, dz / d, 1.6);
        }
      }
    }
  }

  damage(d) {
    if (this.dead || d <= 0) return;
    this.health -= d;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      bus.emit('vehicle-exploded', { v: this });
    }
  }

  syncMesh(dt) {
    this.group.position.set(this.pos.x, 0, this.pos.z);
    this.group.rotation.y = this.heading;
    if (dt > 0) {
      const roll = (this.vf / this.spec.wheelR) * dt;
      for (const w of this.wheels) {
        w.roll += roll;
        w.group.children[0].rotation.x = w.roll;
        w.group.children[1].rotation.x = w.roll;
        if (w.front) w.group.rotation.y = this.steer * 0.9;
      }
    }
  }

  setTail(braking, night) {
    this.tailMat.emissiveIntensity = braking ? 3.2 : 0.15 + night * 0.9;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}
