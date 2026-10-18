// Audio prosedural pake WebAudio — tanpa file audio sama sekali.
// Ada: suara mesin, klakson, sirine, efek tabrakan/ambil, dan "Radio Senja"
// (musik sintetis generatif, bukan lagu berhak cipta).

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.engineOn = false;
    this.radioOn = false;
    this.sirenOn = false;
    this._sirenT = 0;
    this._radioT = 0;
    this._nextNote = 0;
    this._step = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);

      // --- rantai mesin: osc gigi -> filter -> gain
      this.engOsc = this.ctx.createOscillator();
      this.engOsc.type = 'sawtooth';
      this.engOsc.frequency.value = 55;
      this.engSub = this.ctx.createOscillator();
      this.engSub.type = 'square';
      this.engSub.frequency.value = 27;
      this.engFilter = this.ctx.createBiquadFilter();
      this.engFilter.type = 'lowpass';
      this.engFilter.frequency.value = 320;
      this.engGain = this.ctx.createGain();
      this.engGain.gain.value = 0;
      this.engOsc.connect(this.engFilter);
      this.engSub.connect(this.engFilter);
      this.engFilter.connect(this.engGain);
      this.engGain.connect(this.master);
      this.engOsc.start();
      this.engSub.start();

      // --- sirine
      this.sirOsc = this.ctx.createOscillator();
      this.sirOsc.type = 'triangle';
      this.sirOsc.frequency.value = 700;
      this.sirGain = this.ctx.createGain();
      this.sirGain.gain.value = 0;
      this.sirOsc.connect(this.sirGain);
      this.sirGain.connect(this.master);
      this.sirOsc.start();

      // --- bus radio
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0;
      this.radioGain.connect(this.master);

      // noise buffer untuk hat/gedebuk
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(b) {
    this.enabled = b;
    if (this.master) this.master.gain.value = b ? 0.9 : 0;
  }

  setEngine(on, speed = 0, throttle = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const target = on ? 0.035 + 0.05 * Math.abs(throttle) + Math.min(speed, 40) * 0.0012 : 0;
    this.engGain.gain.setTargetAtTime(target, t, 0.08);
    const f = 50 + speed * 3.1 + Math.abs(throttle) * 24;
    this.engOsc.frequency.setTargetAtTime(f, t, 0.06);
    this.engSub.frequency.setTargetAtTime(f / 2, t, 0.06);
    this.engFilter.frequency.setTargetAtTime(260 + speed * 32, t, 0.1);
  }

  setSiren(on, vol = 0.1) {
    if (on === this.sirenOn && on === false) return;
    this.sirenOn = on;
    if (this.ctx) this.sirGain.gain.setTargetAtTime(on ? vol : 0, this.ctx.currentTime, 0.15);
  }

  setRadio(on) {
    if (on === this.radioOn) return;
    this.radioOn = on;
    if (this.ctx) this.radioGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.2);
  }

  _blip(freq, dur, type = 'triangle', vol = 0.2, dest = null, when = 0) {
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, freq = 800, when = 0) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'crash': this._noise(0.35, 0.5, 300); this._blip(70, 0.25, 'square', 0.3); break;
      case 'thud': this._noise(0.18, 0.35, 180); break;
      case 'punch': this._noise(0.1, 0.3, 500); this._blip(140, 0.08, 'square', 0.2); break;
      case 'coin': this._blip(880, 0.1, 'triangle', 0.22); this._blip(1320, 0.22, 'triangle', 0.22, null, 0.09); break;
      case 'cash': this._blip(660, 0.09, 'triangle', 0.2); this._blip(990, 0.09, 'triangle', 0.2, null, 0.08); this._blip(1320, 0.3, 'triangle', 0.22, null, 0.16); break;
      case 'fail': this._blip(320, 0.3, 'sawtooth', 0.16); this._blip(210, 0.5, 'sawtooth', 0.16, null, 0.18); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this._blip(f, 0.24, 'triangle', 0.2, null, i * 0.09)); break;
      case 'ui': this._blip(500, 0.06, 'triangle', 0.12); break;
      case 'explode': this._noise(0.9, 0.9, 120); this._blip(46, 0.8, 'square', 0.5); this._noise(0.5, 0.5, 700, 0.05); break;
      case 'door': this._noise(0.08, 0.2, 900); break;
      case 'horn': break; // dikontrol terus-menerus lewat hornOn()
    }
  }

  hornOn() {
    if (!this.ctx || this._horn) return;
    this._horn = [this.ctx.createOscillator(), this.ctx.createOscillator()];
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    this._horn[0].type = 'square'; this._horn[0].frequency.value = 370;
    this._horn[1].type = 'square'; this._horn[1].frequency.value = 466;
    this._horn.forEach((o) => { o.connect(g); o.start(); });
    g.connect(this.master);
    this._hornGain = g;
  }
  hornOff() {
    if (this._horn) {
      this._hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      const h = this._horn;
      setTimeout(() => h.forEach((o) => o.stop()), 150);
      this._horn = null;
    }
  }

  // Musik generatif "Radio Senja": pluck pentatonik + bass + hat, 100 BPM.
  _radioStep(step) {
    const scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    const bass = [55, 55, 73.4, 65.4];
    const t = this.ctx.currentTime;
    const pluck = (f, when, vol, dur = 0.4) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t + when);
      g.gain.exponentialRampToValueAtTime(0.001, t + when + dur);
      o.connect(g); g.connect(this.radioGain);
      o.start(t + when); o.stop(t + when + dur + 0.05);
    };
    const s16 = step % 16;
    const bar = Math.floor(step / 16) % 4;
    // bass di beat 1 & 3
    if (s16 === 0 || s16 === 8) pluck(bass[bar], 0, 0.5, 0.5);
    // melodi pluck
    if (s16 % 2 === 0 && Math.random() < 0.6) {
      const n = scale[(Math.random() * scale.length) | 0];
      pluck(n * 2, 0, 0.16 + Math.random() * 0.1, 0.5);
    }
    // arpeggio lembut tiap 4 langkah
    if (s16 % 4 === 2) pluck(scale[(s16 / 2 + bar) % scale.length] * 4, 0, 0.06, 0.3);
    // hat
    if (s16 % 2 === 1) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(f); f.connect(g); g.connect(this.radioGain);
      src.start(t); src.stop(t + 0.08);
    }
  }

  update(dt) {
    if (!this.ctx) return;
    // sirine: dua nada bergantian
    if (this.sirenOn) {
      this._sirenT += dt;
      const hi = Math.floor(this._sirenT / 0.45) % 2 === 0;
      this.sirOsc.frequency.setTargetAtTime(hi ? 960 : 660, this.ctx.currentTime, 0.03);
    }
    // radio: penjadwal langkah sederhana
    if (this.radioOn) {
      this._radioT += dt;
      const stepDur = 60 / 100 / 4; // 16th note @100bpm
      while (this._radioT >= stepDur) {
        this._radioT -= stepDur;
        this._radioStep(this._step++);
      }
    }
  }
}
