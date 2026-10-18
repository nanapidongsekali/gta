// State game global + event bus sederhana + simpan/muat localStorage.

export const G = {
  money: 350,
  health: 100,
  wanted: 0,          // 0..5 bintang
  heatTimer: 0,       // detik sejak kejahatan terakhir
  hot: false,         // true kalau polisi sedang dekat mengejar
  time: 16.5,         // jam game (0..24), mulai sore menuju senja
  day: 4,             // indeks hari (Jumat)
  mode: 'foot',       // 'foot' | 'car'
  vehicle: null,      // Vehicle yang sedang dikendarai
  paused: false,
  overlay: 'loading', // null | 'loading' | 'pause' | 'map' | 'dead'
  quality: 'high',
  sound: true,
  radio: true,
  sens: 1.0,
  missionsDone: 0,
  deliveries: 0,
  coins: [],          // id koin yang sudah diambil
  deaths: 0,
  busts: 0,
  mission: null,      // diisi Missions
  started: false,
  night: 0,           // 0=siang .. 1=malem, diisi Sky
};

// Event bus mini: bus.emit('crime', {...}) / bus.on('crime', fn)
export const bus = {
  _m: {},
  on(e, fn) { (this._m[e] ??= new Set()).add(fn); return this; },
  off(e, fn) { this._m[e]?.delete(fn); },
  emit(e, data) { this._m[e]?.forEach((fn) => fn(data)); },
};

const KEY = 'senja-city-v1';

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      money: G.money,
      quality: G.quality,
      sound: G.sound,
      radio: G.radio,
      sens: G.sens,
      missionsDone: G.missionsDone,
      deliveries: G.deliveries,
      coins: G.coins,
      deaths: G.deaths,
      busts: G.busts,
    }));
  } catch (e) { /* localStorage bisa saja diblokir iframe */ }
}

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d) {
      G.money = d.money ?? G.money;
      G.quality = d.quality ?? G.quality;
      G.sound = d.sound ?? G.sound;
      G.radio = d.radio ?? G.radio;
      G.sens = d.sens ?? G.sens;
      G.missionsDone = d.missionsDone ?? 0;
      G.deliveries = d.deliveries ?? 0;
      G.coins = Array.isArray(d.coins) ? d.coins : [];
      G.deaths = d.deaths ?? 0;
      G.busts = d.busts ?? 0;
    }
  } catch (e) { /* abaikan */ }
}
