// Efek partikel ringan: asap, percikan, ledakan. Pool sprite biar hemat GC.

import * as THREE from 'three';
import { bus } from './state.js';
import { glowTex } from './models.js';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < 56; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex(), transparent: true, opacity: 0, depthWrite: false,
      }));
      sp.visible = false;
      scene.add(sp);
      this.pool.push(sp);
    }
    this.boomLight = new THREE.PointLight(0xff9040, 0, 40, 2);
    scene.add(this.boomLight);
    this.boomT = 0;
  }

  _grab() {
    const sp = this.pool.pop();
    return sp || null;
  }

  spawn(x, y, z, { color = 0x888888, size = 1.2, life = 1.2, vx = 0, vy = 1.2, vz = 0, grow = 1.4, opacity = 0.55, additive = false }) {
    const sp = this._grab();
    if (!sp) return;
    sp.visible = true;
    sp.position.set(x, y, z);
    sp.scale.setScalar(size);
    sp.material.color.setHex(color);
    sp.material.opacity = opacity;
    sp.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    sp.material.needsUpdate = true;
    this.active.push({ sp, life, maxLife: life, vx, vy, vz, grow, opacity });
  }

  smoke(x, y, z, dark = false) {
    this.spawn(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, {
      color: dark ? 0x2c2c30 : 0x777780,
      size: 0.8 + Math.random() * 0.7,
      life: 1.1 + Math.random() * 0.7,
      vy: 1.4 + Math.random(), vx: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8,
      grow: 2.0, opacity: 0.5,
    });
  }

  sparks(x, y, z) {
    for (let i = 0; i < 6; i++) {
      this.spawn(x, y, z, {
        color: 0xffc860, size: 0.22, life: 0.3 + Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 9, vy: Math.random() * 5, vz: (Math.random() - 0.5) * 9,
        grow: 0, opacity: 0.95,
      });
    }
  }

  explosion(x, y, z) {
    // kilatan utama
    this.spawn(x, y + 1, z, { color: 0xffd080, size: 3, life: 0.3, vy: 0.5, grow: 22, opacity: 1 });
    // bola api
    for (let i = 0; i < 7; i++) {
      this.spawn(x, y + 1 + Math.random(), z, {
        color: 0xff8030, size: 1 + Math.random() * 1.6, life: 0.5 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 7, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 7,
        grow: 3, opacity: 0.9,
      });
    }
    // asap tebal
    for (let i = 0; i < 10; i++) this.smoke(x, y + 1 + Math.random() * 1.5, z, true);
    this.boomLight.position.set(x, y + 3, z);
    this.boomLight.intensity = 60;
    this.boomT = 0.5;
    bus.emit('shake', 0.7);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sp.visible = false;
        p.sp.material.opacity = 0;
        this.pool.push(p.sp);
        this.active.splice(i, 1);
        continue;
      }
      p.sp.position.x += p.vx * dt;
      p.sp.position.y += p.vy * dt;
      p.sp.position.z += p.vz * dt;
      p.sp.scale.addScalar(p.grow * dt);
      const f = p.life / p.maxLife;
      p.sp.material.opacity = p.opacity * Math.min(1, f * 2.5);
    }
    if (this.boomT > 0) {
      this.boomT -= dt;
      this.boomLight.intensity = Math.max(0, (this.boomT / 0.5) * 60);
    }
  }
}
