// Konstanta dunia, preset kualitas, dan util geometri kota.

export const WORLD = (() => {
  const blocks = 10;      // jumlah blok per sisi
  const block = 36;       // sisi blok (meter)
  const road = 14;        // lebar jalan
  const sidewalk = 3;     // lebar trotoar
  const cell = block + road;
  const size = blocks * cell + road;
  const start = -size / 2;
  return {
    blocks, block, road, sidewalk, cell, size, start,
    lane: 3.5,                                   // offset lajur dari garis tengah
    roadAt: (i) => start + road / 2 + i * cell,  // garis tengah jalan ke-i (0..blocks)
    blockMin: (k) => start + road + k * cell,    // pojok blok ke-k
    bounds: size / 2 - 4,                        // batas gerak pemain
    promenadeX: size / 2,                        // tepi laut sisi +X
  };
})();

export const QUALITY = {
  low:    { pixelRatio: 1,    shadows: false, shadowSize: 512,  bloom: false, fogDensity: 0.0046, aa: false, traffic: 9,  peds: 14 },
  medium: { pixelRatio: 1,    shadows: true,  shadowSize: 1024, bloom: false, fogDensity: 0.0036, aa: true,  traffic: 12, peds: 20 },
  high:   { pixelRatio: 0,    shadows: true,  shadowSize: 2048, bloom: true,  fogDensity: 0.0028, aa: true,  traffic: 15, peds: 26 }, // pixelRatio 0 = pakai devicePixelRatio
};

// Nama hari mulai dari indeks 0 (G.day).
export const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// PRNG deterministik supaya kota yang sama tiap kali dibangkitkan.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.hypot(dx, dz);
}
