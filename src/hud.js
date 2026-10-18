// HUD: DOM untuk uang/jam/bintang/kecepatan, minimap kanvas, peta besar,
// toast, banner, prompt, dan semua overlay.

import { G, bus } from './state.js';
import { DAY_NAMES, clamp } from './config.js';

const STAR_SVG = '<svg viewBox="0 0 24 24" class="st"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z"/></svg>';

const TIPS = [
  'Matahari terbenam di sisi laut — layak ditengok sambil bawa mobil cepat.',
  'Tinju dan tabrak warga bikin bintang pencarian naik. Polisi tidak suka.',
  'Rem tangan (Spasi) bikin mobil drift. Latihan dulu di jalan lurus.',
  'Koin Senja ada 10 tersebar. Monumen di alun-alun cuma salah satunya.',
  'Warung Kurir (K di minimap) punya kerjaan anter paket tiap saat.',
  'Mobil orang bisa "dipinjam". Tekan F dekat mobil mana pun.',
  'Kalau ditangkap, dompetmu menipis. Kabur atau berhenti, pilih satu.',
];

export class HUD {
  constructor(city) {
    this.city = city;
    this.$ = (id) => document.getElementById(id);

    this.el = {
      hud: this.$('hud'),
      money: this.$('money'),
      stars: this.$('stars'),
      time: this.$('clock-time'),
      day: this.$('clock-day'),
      health: this.$('healthfill'),
      speed: this.$('speed'),
      carname: this.$('carname'),
      banner: this.$('banner'),
      bannerTitle: this.$('banner-title'),
      bannerSub: this.$('banner-sub'),
      prompt: this.$('prompt'),
      toasts: this.$('toasts'),
      vignette: this.$('vignette'),
      mini: this.$('minimap'),
      bigmap: this.$('bigmap'),
      loadfill: this.$('loadfill'),
      loadlabel: this.$('loadlabel'),
      btnStart: this.$('btn-start'),
      loadtip: this.$('loadtip'),
      ovLoading: this.$('overlay-loading'),
      ovPause: this.$('overlay-pause'),
      ovMap: this.$('overlay-map'),
      ovDead: this.$('overlay-dead'),
      deadTitle: this.$('dead-title'),
      deadSub: this.$('dead-sub'),
      err: this.$('err'),
    };

    for (let i = 0; i < 5; i++) this.el.stars.insertAdjacentHTML('beforeend', STAR_SVG);
    this.starEls = [...this.el.stars.children];

    this.lastMoney = G.money;
    this.lastWanted = -1;
    this.lastTime = -1;
    this.bannerTimer = null;
    this.tipI = (Math.random() * TIPS.length) | 0;
    this.el.loadtip.textContent = 'Tips: ' + TIPS[this.tipI];

    const mctx = this.el.mini.getContext('2d');
    mctx.scale(2, 2);
    this.mctx = mctx;

    bus.on('toast', (t) => this.toast(t.text, t.kind));
    bus.on('banner', (b) => this.banner(b.title, b.sub));
    bus.on('money', (d) => {
      this.el.money.classList.add(d >= 0 ? 'bump' : 'pain');
      setTimeout(() => this.el.money.classList.remove('bump', 'pain'), 350);
      if (d < 0) this.hurt(0.4);
    });
    bus.on('hurt', () => this.hurt(1));
    bus.on('crash', () => this.hurt(0.25));
  }

  hurt(a) {
    this.el.vignette.classList.add('hurt');
    clearTimeout(this._hurtT);
    this._hurtT = setTimeout(() => this.el.vignette.classList.remove('hurt'), 260 + a * 240);
  }

  toast(text, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 420);
    }, 3600);
  }

  banner(title, sub) {
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = sub || '';
    this.el.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.el.banner.classList.remove('show'), 6000);
  }

  prompt(text) {
    if (text === this._lastPrompt) return;
    this._lastPrompt = text;
    if (!text) { this.el.prompt.classList.remove('show'); return; }
    this.el.prompt.innerHTML = text;
    this.el.prompt.classList.add('show');
  }

  setLoading(pct, label) {
    this.el.loadfill.style.width = pct + '%';
    if (label) this.el.loadlabel.textContent = label;
  }

  ready(onStart) {
    this.setLoading(100, 'Kota siap.');
    this.el.btnStart.disabled = false;
    this.el.btnStart.textContent = 'MASUK KOTA';
    this.el.btnStart.onclick = () => onStart();
  }

  showOverlay(name) {
    this.el.ovPause.classList.toggle('hidden', name !== 'pause');
    this.el.ovMap.classList.toggle('hidden', name !== 'map');
    this.el.ovDead.classList.toggle('hidden', name !== 'dead');
    this.el.ovLoading.classList.toggle('hidden', name !== 'loading');
  }

  dead(kind, sub) {
    this.el.ovDead.classList.toggle('busted', kind === 'busted');
    this.el.deadTitle.textContent = kind === 'busted' ? 'TERTANGKAP' : 'TUMBANG';
    this.el.deadSub.textContent = sub;
    this.showOverlay('dead');
  }

  /* ----- minimap ----- */

  _toMap(x, z) {
    return {
      x: (x - this.city.mapOrigin) * this.city.mapScale,
      y: (z - this.city.mapOrigin) * this.city.mapScale,
    };
  }

  drawMinimap(player, blips, cops) {
    const ctx = this.mctx;
    const S = 220, half = S / 2, R = 92; // radius tampilan 92 meter
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, 7);
    ctx.clip();

    const m = this._toMap(player.x, player.z);
    const sw = 2 * R * this.city.mapScale;
    ctx.drawImage(this.city.mapCanvas, m.x - sw / 2, m.y - sw / 2, sw, sw, 0, 0, S, S);

    const blip = (x, z, color, char) => {
      let dx = (x - player.x) / R * half;
      let dy = (z - player.z) / R * half;
      const d = Math.hypot(dx, dy);
      const lim = half - 12;
      if (d > lim) { dx *= lim / d; dy *= lim / d; }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(half + dx, half + dy, char ? 7 : 5.5, 0, 7);
      ctx.fill();
      if (char) {
        ctx.fillStyle = '#1a1508';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, half + dx, half + dy + 0.5);
      }
    };

    for (const b of blips) blip(b.x, b.z, b.color, b.char);
    for (const c of cops) blip(c.v.pos.x, c.v.pos.z, '#4a7dff');

    // panah pemain
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(Math.PI - (G.mode === 'car' && G.vehicle ? G.vehicle.heading : player.yaw));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawBigmap(player, blips, cops) {
    const ctx = this.el.bigmap.getContext('2d');
    const S = 1024;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(this.city.mapCanvas, 0, 0, S, S);
    const k = S / this.city.mapCanvas.width;
    const dot = (x, z, color, r, char) => {
      const m = this._toMap(x, z);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(m.x * k, m.y * k, r, 0, 7);
      ctx.fill();
      ctx.stroke();
      if (char) {
        ctx.fillStyle = '#1a1508';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, m.x * k, m.y * k + 1);
      }
    };
    for (const b of blips) dot(b.x, b.z, b.color, 9, b.char);
    for (const c of cops) dot(c.v.pos.x, c.v.pos.z, '#4a7dff', 8);
    dot(player.x, player.z, '#ffffff', 10);
  }

  /* ----- per-frame ----- */

  update(player, blips, cops, vehicle) {
    // uang
    if (G.money !== this.lastMoney) {
      this.lastMoney = G.money;
      this.el.money.textContent = '$' + G.money.toLocaleString('id-ID');
    }
    // bintang pencarian
    if (G.wanted !== this.lastWanted) {
      this.lastWanted = G.wanted;
      this.starEls.forEach((s, i) => s.classList.toggle('on', i < G.wanted));
    }
    this.el.stars.classList.toggle('hot', G.hot && G.wanted > 0);

    // jam
    const tKey = Math.floor(G.time * 10);
    if (tKey !== this.lastTime) {
      this.lastTime = tKey;
      const hh = Math.floor(G.time), mm = Math.floor((G.time - hh) * 60);
      this.el.time.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      this.el.day.textContent = DAY_NAMES[G.day];
    }

    // kesehatan
    const hp = clamp(G.health, 0, 100);
    this.el.health.style.width = hp + '%';
    this.el.health.classList.toggle('low', hp < 35);

    // kecepatan & nama mobil
    if (G.mode === 'car' && vehicle) {
      this.el.speed.textContent = Math.round(vehicle.speed * 3.6);
      if (this._carShown !== vehicle.type) {
        this._carShown = vehicle.type;
        this.el.carname.textContent = vehicle.spec.name;
        this.el.carname.classList.add('show');
      }
    } else {
      this.el.speed.textContent = '0';
      if (this._carShown !== null) {
        this._carShown = null;
        this.el.carname.classList.remove('show');
      }
    }

    this.drawMinimap(player, blips, cops);
    if (!this.el.ovMap.classList.contains('hidden')) {
      this.drawBigmap(player, blips, cops);
    }
  }
}
