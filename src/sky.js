// Langit, matahari, bulan, bintang, kabut, dan siklus siang-malam.
// Matahari terbenam di sisi laut (+X) — momen khas kota Senja.

import * as THREE from 'three';
import { G } from './state.js';
import { clamp, lerp } from './config.js';
import { glowTex } from './models.js';

const C = (h) => new THREE.Color(h);

export class Sky {
  constructor(scene, quality) {
    this.scene = scene;

    this.hemi = new THREE.HemisphereLight(0x8fb4e8, 0x3a3630, 0.6);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x40507a, 0.12);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff2e0, 2.4);
    this.sun.castShadow = quality.shadows;
    const sc = this.sun.shadow;
    sc.mapSize.set(quality.shadowSize, quality.shadowSize);
    sc.camera.left = -95; sc.camera.right = 95;
    sc.camera.top = 95; sc.camera.bottom = -95;
    sc.camera.near = 10; sc.camera.far = 420;
    sc.camera.updateProjectionMatrix();
    sc.bias = -0.0006;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.moon = new THREE.DirectionalLight(0x8aa4e8, 0);
    this.moon.position.set(60, 120, -80);
    scene.add(this.moon);

    // kubah langit dengan gradien shader
    this.uniforms = {
      top: { value: C(0x5a8fd0) },
      hor: { value: C(0xcfe0ea) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunGlow: { value: C(0xff9a4a) },
      glowAmt: { value: 0.5 },
    };
    const domeMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir;
        uniform vec3 sunGlow; uniform float glowAmt;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(hor, top, pow(h, 0.55));
          float g = pow(max(dot(vDir, sunDir), 0.0), 6.0);
          col += sunGlow * g * glowAmt;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 14), domeMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // matahari & bulan sebagai sprite glow
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: 0xffe0b0, transparent: true, depthWrite: false, fog: false,
    }));
    scene.add(this.sunSprite);
    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: 0xcfd8ff, transparent: true, depthWrite: false, fog: false,
    }));
    this.moonSprite.scale.setScalar(40);
    scene.add(this.moonSprite);

    // bintang
    const starGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const v = new THREE.Vector3().randomDirection();
      v.y = Math.abs(v.y) + 0.06;
      v.normalize().multiplyScalar(850);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xdfe8ff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
    }));
    this.stars.renderOrder = -9;
    scene.add(this.stars);

    scene.fog = new THREE.FogExp2(0xcfe0ea, quality.fogDensity);
    this.fogDensity = quality.fogDensity;

    this._topNight = C(0x070b1e); this._topDay = C(0x4a7ec2); this._topDusk = C(0x41357d);
    this._horNight = C(0x101828); this._horDay = C(0xbfd2de); this._horDusk = C(0xff8748);
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color();
    this.sunDir = new THREE.Vector3();
    this.elev = 0; this.day = 1; this.night = 0; this.dusk = 0;
  }

  applyQuality(q) {
    this.sun.castShadow = q.shadows;
    if (q.shadows && this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.fogDensity = q.fogDensity;
  }

  // nilai emissive material kota mengikuti waktu (jendela & lampu menyala malam hari)
  _applyNight(cityMats) {
    for (const r of cityMats) {
      const v = lerp(r.day, r.night, this.night);
      if (r.prop) r.mat[r.prop] = v;
      else r.mat.emissiveIntensity = v;
    }
  }

  update(dt, camPos, cityMats) {
    // 24 jam game = 8 menit nyata
    G.time += dt * 0.05;
    if (G.time >= 24) { G.time -= 24; G.day = (G.day + 1) % 7; }

    const th = ((G.time - 6) / 12) * Math.PI;
    const e = Math.sin(th);
    this.elev = e;
    this.sunDir.set(-Math.cos(th), Math.max(e, -0.35), -0.28).normalize();

    this.day = this._smooth(-0.06, 0.18, e);
    this.night = 1 - this.day;
    this.dusk = 1 - Math.min(1, Math.abs(e) * 3.2);
    G.night = this.night;

    // warna langit
    this._c1.lerpColors(this._topNight, this._topDay, this.day).lerp(this._topDusk, this.dusk * 0.55);
    this.uniforms.top.value.copy(this._c1);
    this._c2.lerpColors(this._horNight, this._horDay, this.day).lerp(this._horDusk, this.dusk * 0.85);
    this.uniforms.hor.value.copy(this._c2);
    this.uniforms.sunDir.value.copy(this.sunDir);
    this.uniforms.glowAmt.value = 0.25 + this.dusk * 0.9;

    // kabut mengikuti warna horizon
    this.scene.fog.color.copy(this._c2).lerp(this._c1, 0.25);
    this.scene.fog.density = this.fogDensity;

    // pencahayaan
    this.sun.intensity = clamp(e * 2.2, 0, 1) * 2.5;
    this.sun.color.setHex(0xfff2e0).lerp(C(0xff9a50), this.dusk * 0.85);
    this.moon.intensity = this.night * 0.22;
    this.hemi.intensity = 0.22 + this.day * 0.5;
    this.hemi.color.copy(this._c1).lerp(C(0xffffff), 0.3);

    // posisi mengikuti kamera supaya kubah & bayangan selalu "di sini"
    this.dome.position.copy(camPos);
    this.stars.position.copy(camPos);
    this.stars.material.opacity = clamp(this.night * 1.2 - this.dusk * 0.3, 0, 1);

    this.sun.position.copy(camPos).addScaledVector(this.sunDir, 190);
    this.sun.target.position.copy(camPos);
    this.sun.target.updateMatrixWorld();

    this.sunSprite.position.copy(camPos).addScaledVector(this.sunDir, 800);
    this.sunSprite.scale.setScalar(90 + (1 - clamp(e, 0, 1)) * 150);
    this.sunSprite.material.opacity = clamp(e * 4 + 0.4, 0, 1);

    this.moonSprite.position.copy(camPos).addScaledVector(this.sunDir, -780);
    this.moonSprite.material.opacity = this.night * 0.85;

    if (cityMats) this._applyNight(cityMats);
  }

  getBloomStrength() {
    return 0.06 + this.night * 0.42 + this.dusk * 0.18;
  }

  _smooth(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
}
