// Pemain: kontrol jalan kaki (jalan/lari/loncat/tinju), kamera orang-ketiga,
// dan kamera mengikuti mobil.

import * as THREE from 'three';
import { makeHuman, heroLook } from './models.js';
import { clamp, lerp, lerpAngle } from './config.js';
import { G, bus } from './state.js';

export class Player {
  constructor(scene, city) {
    this.city = city;
    this.mesh = makeHuman(heroLook());
    scene.add(this.mesh);

    const sp = city.spawn.player;
    this.pos = new THREE.Vector3(sp.x, 0, sp.z);
    this.yaw = Math.PI;
    this.vy = 0;
    this.grounded = true;

    this.camYaw = 0;
    this.camPitch = 0.34;
    this.camDist = 4.8;
    this.camPos = new THREE.Vector3(sp.x, 3, sp.z + 5);
    this.fov = 62;

    this.punchT = 0;
    this.punchPending = -1;
    this.walkT = 0;
    this.moveSpeed = 0;
    this.braking = false;
    this.shake = 0;

    bus.on('shake', (amt) => { this.shake = Math.min(1, this.shake + amt); });
  }

  teleport(x, z) {
    this.pos.set(x, 0, z);
    this.vy = 0;
  }

  update(dt, input) {
    const sens = 0.0023 * G.sens;
    this.camYaw -= input.dx * sens;
    this.camPitch = clamp(this.camPitch + input.dy * sens * 0.85, 0.05, 1.15);
    this.camDist = clamp(this.camDist + input.wheel * 0.7, 2.4, 9);

    if (G.mode === 'foot') this._foot(dt, input);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.8);
  }

  _foot(dt, input) {
    const ix = input.axis('KeyA', 'KeyD');
    const iz = input.axis('KeyS', 'KeyW');
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const spd = run ? 6.6 : 3.5;

    if (ix !== 0 || iz !== 0) {
      const cy = this.camYaw;
      // arah "maju" kamera (dari kamera ke pemain)
      const fx = -Math.sin(cy), fz = -Math.cos(cy);
      const rx = -fz, rz = fx;
      let mx = fx * iz + rx * ix;
      let mz = fz * iz + rz * ix;
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml; mz /= ml;
      this.yaw = lerpAngle(this.yaw, Math.atan2(mx, mz), 1 - Math.exp(-11 * dt));
      this._move(city2(this.city), mx * spd * dt, mz * spd * dt);
      this.moveSpeed = spd;
    } else {
      this.moveSpeed = 0;
    }

    // loncat
    if (input.once('Space') && this.grounded) {
      this.vy = 4.6;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= 13 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }
    }

    // tinju
    if (this.punchT > 0) this.punchT -= dt;
    if (this.punchPending >= 0) {
      this.punchPending -= dt;
      if (this.punchPending < 0) {
        bus.emit('punch', { x: this.pos.x, z: this.pos.z, yaw: this.yaw });
      }
    }
    if (input.mouse0Pressed && this.punchT <= 0) {
      this.punchT = 0.4;
      this.punchPending = 0.14;
    }

    // animasi
    this.walkT += this.moveSpeed * dt * 2.3;
    this.mesh.userData.setWalk(this.walkT, clamp(this.moveSpeed * 0.12, 0, 0.7));
    const armR = this.mesh.userData.parts.rArm;
    if (this.punchT > 0.12) armR.rotation.x = -1.7;
    else if (this.punchT > 0) armR.rotation.x = -0.6;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
  }

  _move(city, dx, dz) {
    const r = 0.4;
    // sumbu X dulu, lalu Z — resolusi tabrakan yang stabil
    this.pos.x += dx;
    this._resolve(city, r, true);
    this.pos.z += dz;
    this._resolve(city, r, false);
  }

  _resolve(city, r, xPass) {
    for (const b of city.aabbs) {
      if (this.pos.x > b.minX - r && this.pos.x < b.maxX + r &&
          this.pos.z > b.minZ - r && this.pos.z < b.maxZ + r) {
        if (xPass) {
          const cx = (b.minX + b.maxX) / 2;
          this.pos.x = this.pos.x < cx ? b.minX - r : b.maxX + r;
        } else {
          const cz = (b.minZ + b.maxZ) / 2;
          this.pos.z = this.pos.z < cz ? b.minZ - r : b.maxZ + r;
        }
      }
    }
    for (const c of city.circles) {
      const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
      const d = Math.hypot(dx, dz), rr = c.r + r;
      if (d < rr && d > 0.001) {
        this.pos.x = c.x + (dx / d) * rr;
        this.pos.z = c.z + (dz / d) * rr;
      }
    }
  }

  updateCamera(dt, camera, vehicle) {
    let target, dist;
    if (G.mode === 'car' && vehicle) {
      // kamera otomatis kembali ke belakang mobil
      const desired = vehicle.heading + Math.PI;
      this.camYaw = lerpAngle(this.camYaw, desired, 1 - Math.exp(-1.8 * dt));
      target = new THREE.Vector3(vehicle.pos.x, 1.6, vehicle.pos.z);
      dist = 7.4;
      const targetFov = 62 + clamp(vehicle.speed, 0, 42) * 0.3;
      this.fov = lerp(this.fov, targetFov, 1 - Math.exp(-3 * dt));
    } else {
      target = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
      dist = this.camDist;
      this.fov = lerp(this.fov, 62, 1 - Math.exp(-4 * dt));
    }

    const cp = Math.cos(this.camPitch);
    const want = new THREE.Vector3(
      target.x + Math.sin(this.camYaw) * cp * dist,
      Math.max(target.y + Math.sin(this.camPitch) * dist, 0.7),
      target.z + Math.cos(this.camYaw) * cp * dist
    );
    this.camPos.lerp(want, 1 - Math.exp(-16 * dt));

    camera.position.copy(this.camPos);
    if (this.shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
      camera.position.z += (Math.random() - 0.5) * this.shake * 0.5;
    }
    camera.lookAt(target);

    if (Math.abs(camera.fov - this.fov) > 0.1) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
  }
}
