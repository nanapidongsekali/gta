// Misi kurir "Anter Paket" + koin koleksi "Koin Senja".

import * as THREE from 'three';
import { makeCoin, makeMarker } from './models.js';
import { dist2D } from './config.js';
import { G, bus, save } from './state.js';

export class Missions {
  constructor(scene, city, audio) {
    this.scene = scene;
    this.city = city;
    this.audio = audio;
    this.cooldown = 2.5;

    this.home = city.spawn.courier;
    this.homeMarker = makeMarker(0xffb454);
    this.homeMarker.position.set(this.home.x, 0, this.home.z);
    scene.add(this.homeMarker);

    this.pickupMarker = makeMarker(0xff5fa2);
    this.pickupMarker.visible = false;
    scene.add(this.pickupMarker);
    this.dropMarker = makeMarker(0x6fe08f);
    this.dropMarker.visible = false;
    scene.add(this.dropMarker);

    this.coins = city.coinSpots.map((s) => {
      const mesh = makeCoin();
      mesh.position.set(s.x, 1.1, s.z);
      mesh.visible = !G.coins.includes(s.id);
      scene.add(mesh);
      return { ...s, mesh, taken: G.coins.includes(s.id) };
    });
  }

  _clear() {
    G.mission = null;
    this.pickupMarker.visible = false;
    this.dropMarker.visible = false;
  }

  start(px, pz) {
    const pickup = this.city.randomEdgePoint(px, pz, 110, 280);
    const drop = this.city.randomEdgePoint(pickup.x, pickup.z, 180, 420);
    const d1 = dist2D(px, pz, pickup.x, pickup.z);
    const d2 = dist2D(pickup.x, pickup.z, drop.x, drop.z);
    G.mission = {
      phase: 'pickup',
      pickup, drop,
      time: d1 / 9 + d2 / 7.5 + 25,
      totalDist: d1 + d2,
    };
    this.pickupMarker.position.set(pickup.x, 0, pickup.z);
    this.pickupMarker.visible = true;
    bus.emit('banner', {
      title: 'MISI: ANTER PAKET',
      sub: 'Ambil paket di penanda merah muda. Tips: pakai mobil — waktunya mepet.',
    });
    this.audio.sfx('ui');
  }

  complete(px, pz) {
    const m = G.mission;
    const d2 = dist2D(m.pickup.x, m.pickup.z, m.drop.x, m.drop.z);
    const reward = 200 + Math.round(d2 * 1.4) + Math.round(m.time * 4);
    bus.emit('money', reward);
    G.missionsDone++;
    G.deliveries++;
    save();
    bus.emit('toast', { text: `Paket sampai! +$${reward} (bonus waktu termasuk)`, kind: 'gold' });
    this.audio.sfx('cash');
    this._clear();
    this.cooldown = 5;
  }

  fail(reason) {
    if (!G.mission) return;
    this._clear();
    this.cooldown = 6;
    bus.emit('toast', { text: `Misi gagal — ${reason}`, kind: 'bad' });
    this.audio.sfx('fail');
  }

  update(dt, player) {
    // marker berputar pelan
    const spin = (m) => { m.userData.spin.rotation.z += dt * 1.6; };
    spin(this.homeMarker);
    spin(this.pickupMarker);
    spin(this.dropMarker);

    // koin
    for (const c of this.coins) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 2.4;
      c.mesh.position.y = 1.1 + Math.sin(performance.now() * 0.002 + c.x) * 0.15;
      if (dist2D(player.x, player.z, c.x, c.z) < 2.3) {
        c.taken = true;
        c.mesh.visible = false;
        G.coins.push(c.id);
        bus.emit('money', 250);
        bus.emit('toast', { text: `Koin Senja ditemukan (${G.coins.length}/10) +$250`, kind: 'gold' });
        this.audio.sfx('coin');
        save();
      }
    }

    // mulai misi di warung kurir
    if (!G.mission) {
      this.cooldown -= dt;
      if (this.cooldown <= 0 && dist2D(player.x, player.z, this.home.x, this.home.z) < 3) {
        this.start(player.x, player.z);
      }
      return;
    }

    // jalankan misi aktif
    const m = G.mission;
    m.time -= dt;
    if (m.time <= 0) { this.fail('waktu habis'); return; }

    if (m.phase === 'pickup') {
      spin(this.pickupMarker);
      if (dist2D(player.x, player.z, m.pickup.x, m.pickup.z) < 3.2) {
        m.phase = 'deliver';
        this.pickupMarker.visible = false;
        this.dropMarker.position.set(m.drop.x, 0, m.drop.z);
        this.dropMarker.visible = true;
        bus.emit('banner', { title: 'PAKET DI TANGAN', sub: 'Anter ke penanda hijau sebelum waktunya habis!' });
        this.audio.sfx('ui');
      }
    } else {
      spin(this.dropMarker);
      if (dist2D(player.x, player.z, m.drop.x, m.drop.z) < 3.2) this.complete(player.x, player.z);
    }
  }

  /** Penanda untuk minimap & peta besar. */
  blips() {
    const out = [{ x: this.home.x, z: this.home.z, color: '#ffb454', char: 'K', label: 'kurir' }];
    if (G.mission) {
      const t = G.mission.phase === 'pickup' ? G.mission.pickup : G.mission.drop;
      out.push({ x: t.x, z: t.z, color: G.mission.phase === 'pickup' ? '#ff5fa2' : '#6fe08f', label: 'misi' });
    }
    for (const c of this.coins) {
      if (!c.taken) out.push({ x: c.x, z: c.z, color: '#ffd700', label: 'koin' });
    }
    return out;
  }
}
