/**
 * Reversed from gta_sa.exe v1.0 US
 * - CAudioEngine::Service         @ 0x507750
 * - CAERadioTrackManager::Service @ 0x4EB6E0
 * - CAEVehicleAudioEntity         @ 0x4F6420
 * - CAEWeaponAudioEntity          @ 0x5034F0
 */

export interface RadioStationInfo {
  id: string;
  name: string;
  dj: string;
  genre: string;
  freqMhz: string;
  accentColor: string;
  bpm: number;
  notes: number[]; // MIDI frequencies for synthesized station loop
}

export const GTA_SA_RADIO_STATIONS: RadioStationInfo[] = [
  {
    id: 'RADIO_LS',
    name: 'Radio Los Santos',
    dj: 'Julio G',
    genre: 'West Coast G-Funk & Gangsta Rap',
    freqMhz: '97.6 FM',
    accentColor: '#22c55e',
    bpm: 94,
    notes: [110, 130.81, 146.83, 164.81, 587.33, 659.25, 587.33, 440],
  },
  {
    id: 'KDST',
    name: 'K-DST "The Dust"',
    dj: 'Tommy "The Nightmare" Smith',
    genre: '70s Classic Rock',
    freqMhz: '103.5 FM',
    accentColor: '#f59e0b',
    bpm: 118,
    notes: [146.83, 220, 293.66, 261.63, 220, 196, 146.83, 220],
  },
  {
    id: 'KROSE',
    name: 'K-Rose',
    dj: 'Mary-Beth Maybell',
    genre: 'Country & Western Classics',
    freqMhz: '92.1 FM',
    accentColor: '#eab308',
    bpm: 112,
    notes: [130.81, 164.81, 196, 261.63, 220, 196, 164.81, 130.81],
  },
  {
    id: 'BOUNCE_FM',
    name: 'Bounce FM',
    dj: 'The Funktipus',
    genre: 'P-Funk & Disco Groove',
    freqMhz: '101.9 FM',
    accentColor: '#ec4899',
    bpm: 108,
    notes: [98, 116.54, 130.81, 146.83, 196, 174.61, 146.83, 130.81],
  },
  {
    id: 'PLAYBACK_FM',
    name: 'Playback FM',
    dj: 'Forth Right MC',
    genre: 'Golden Era East Coast Hip-Hop',
    freqMhz: '95.4 FM',
    accentColor: '#10b981',
    bpm: 92,
    notes: [82.41, 98, 110, 123.47, 164.81, 146.83, 110, 98],
  },
  {
    id: 'RADIO_X',
    name: 'Radio X',
    dj: 'Sage',
    genre: '90s Alternative Rock & Grunge',
    freqMhz: '91.3 FM',
    accentColor: '#ef4444',
    bpm: 132,
    notes: [82.41, 82.41, 123.47, 110, 98, 87.31, 82.41, 110],
  },
  {
    id: 'SF_UR',
    name: 'SF-UR',
    dj: 'Hans Oberlander',
    genre: 'Chicago House & Underground Techno',
    freqMhz: '106.8 FM',
    accentColor: '#3b82f6',
    bpm: 126,
    notes: [110, 220, 130.81, 261.63, 146.83, 293.66, 164.81, 329.63],
  },
  {
    id: 'RADIO_OFF',
    name: 'Radio Off',
    dj: 'Engine Audio Only',
    genre: 'V8 / V10 / Street Exhaust',
    freqMhz: 'OFF',
    accentColor: '#71717a',
    bpm: 0,
    notes: [],
  },
];

class GtaAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private radioStep = 0;
  private radioInterval: number | null = null;
  private currentStation: RadioStationInfo = GTA_SA_RADIO_STATIONS[0];

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (m) {
      this.stopRadio();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Iconic GTA:SA "Cheat Activated" HUD beep (0x4384D0 -> CAudioEngine::ReportFrontendAudioEvent)
   */
  public playCheatActivated() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5 crisp confirmation chime
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.11, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.15);
    });
  }

  /**
   * Iconic GTA:SA "Mission Passed! Respect +" West Coast G-Funk Fanfare (Opcode 0394)
   */
  public playMissionPassedFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // G-Funk high-lead portamento motif + deep bass notes
    const leadNotes = [
      { f: 440.0, t: 0.0, d: 0.22 },
      { f: 523.25, t: 0.24, d: 0.22 },
      { f: 587.33, t: 0.48, d: 0.35 },
      { f: 659.25, t: 0.88, d: 0.22 },
      { f: 587.33, t: 1.12, d: 0.25 },
      { f: 523.25, t: 1.40, d: 0.55 },
    ];

    leadNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.12, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }

  /**
   * Weapon firing synthesis (Pistol, Micro SMG, AK-47, Shotgun, RPG/Tank Cannon, Spray Can)
   */
  public playWeaponSound(weaponId: string) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (weaponId === 'SPRAYCAN') {
      // Aerosol hiss
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = weaponId === 'RPG' || weaponId === 'TANK_CANNON' ? 'sawtooth' : 'square';
    const startFreq =
      weaponId === 'RPG' || weaponId === 'TANK_CANNON'
        ? 110
        : weaponId === 'SHOTGUN'
        ? 160
        : 240;
    const duration = weaponId === 'RPG' || weaponId === 'TANK_CANNON' ? 0.45 : 0.12;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + duration);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Lowrider hydraulic suspension bounce pump sound
   */
  public playHydraulicBounce() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public startRadio(station: RadioStationInfo) {
    this.currentStation = station;
    this.stopRadio();
    if (station.id === 'RADIO_OFF' || this.muted || station.notes.length === 0) {
      return;
    }

    const stepMs = Math.round((60 / station.bpm) * 500);
    this.radioInterval = window.setInterval(() => {
      const ctx = this.ensureContext();
      if (!ctx || this.muted) return;
      const now = ctx.currentTime;
      const freq = station.notes[this.radioStep % station.notes.length];
      this.radioStep++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = station.id === 'RADIO_LS' ? 'sine' : station.id === 'KDST' || station.id === 'RADIO_X' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.028, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + stepMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + stepMs / 1000);
    }, stepMs);
  }

  public stopRadio() {
    if (this.radioInterval !== null) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }
}

export const audioEngine = new GtaAudioEngine();
