# Senja City

Open-world sandbox 3D yang jalan di browser — kota fiktif ala Indonesia dengan siklus siang-malam, lalu lintas, warga, misi kurir, sistem pencarian polisi, dan mobil yang bisa dibajak. Dibangun dari nol dengan three.js, tanpa satu pun aset dari game komersial.

> **Kenapa bukan klon GTA San Andreas?** Baca singkat di [docs/LEGAL.md](docs/LEGAL.md). Ringkasnya: menyalin peta, cerita, karakter, atau aset GTA SA itu pelanggaran hak cipta — sekalipun untuk proyek pribadi dan tidak dimonetisasi. Jadi kami ambil *genre*-nya, bukan *isenya*: dunia terbuka, mobil, misi, bintang pencarian — semuanya konten original.

---

## Menjalankan

Butuh Node.js 18+.

```bash
npm install
npm run dev        # buka http://localhost:5173
```

Build produksi: `npm run build`, hasilnya di `dist/`.

Paling enak dimainkan di desktop dengan keyboard + mouse. Klik canvas untuk mengunci pointer.

## Kontrol

| Tombol | Aksi |
|---|---|
| `W A S D` | gerak / gas & setir |
| `Shift` | lari |
| `Spasi` | loncat (jalan kaki) / rem tangan (mobil) |
| `F` | masuk / keluar kendaraan (bajak mobil lewat) |
| `Klik kiri` | tinju |
| `H` | klakson |
| `R` | Radio Senja on/off |
| `M` | peta besar |
| `Esc` / `P` | jeda & pengaturan |
| Scroll | zoom kamera |

## Yang sudah ada di v0.1

- **Kota 514×514 m** dengan distrik: pusat gedung tinggi, permukiman kampung, kawasan industri, taman, alun-alun dengan Monumen Senja, stadion, tepi laut dengan dermaga, klinik, dan polsek.
- **Siklus siang-malam 8 menit** — matahari terbenam di sisi laut, jendela gedung & lampu jalan menyala sendiri, lampu depan mobil otomatis.
- **Mobil arcade 7 tipe** (sedan, muscle, sport, van, pikap, taksi, patroli) dengan drift rem-tangan, kerusakan, asap, dan ledakan.
- **Lalu lintas AI** yang mengikuti lajur & lampu merah visual, bisa diklakson, dan **bisa dibajak** (sopirnya kabur).
- **Warga** yang jalan di trotoar, kabur dari mobil ngebut, dan tumbang kalau ditabrak/tinju.
- **Bintang pencarian 1–5**: tabrak warga atau polisi, mobil patroli mengejar dan bisa "TERTANGKAP". Sembunyi 26 detik, pencarian mereda.
- **Misi kurir berulang** dari Warung Kurir (tandai `K` di minimap) dengan bonus waktu, plus **10 Koin Senja** tersembunyi.
- **Minimap bundar + peta besar**, uang, jam & hari, kesehatan dengan regenerasi.
- **Audio prosedural WebAudio**: mesin, tabrakan, sirine, klakson, dan Radio Senja — musik sintetis generatif, bukan lagu berhak cipta.
- **Tiga preset grafis** (Rendah/Sedang/Tinggi) dengan bloom, soft shadow, dan fog yang menyesuaikan.

## "Tuning perbaikan grafis"

Pengaturan renderer modern yang jadi pembeda dari game 2004:

- ACES filmic tone mapping + koreksi sRGB,
- bayangan PCF lembut yang mengikuti pemain,
- bloom malam hari (jendela, lampu jalan, lampu mobil),
- kabut yang warnanya ikut langit, langit gradien shader dengan glow matahari,
- geometri kota digabung per material → ~20 draw call untuk seluruh kota statis.

## Arsitektur

```
src/
  main.js      orkestrator: loop, overlay, event antar sistem
  config.js    konstanta dunia, preset kualitas, util math
  state.js     state global + event bus + save/load localStorage
  input.js     keyboard/mouse + pointer lock
  city.js      pembangkit kota (geometri merged, graf jalan, collider, peta)
  models.js    model prosedural: mobil, karakter, marker, tekstur kanvas
  vehicle.js   fisika mobil arcade + tabrakan statis + kerusakan
  traffic.js   AI lalu lintas, mobil parkir, pengejaran polisi
  peds.js      warga: jalan, kabur, tumbang
  missions.js  misi kurir + koin koleksi
  player.js    kontrol jalan kaki + kamera orang ketiga
  sky.js       siklus waktu, matahari/bulan/bintang, kabut
  effects.js   pool partikel: asap, percikan, ledakan
  audio.js     sintesis suara + radio generatif
  hud.js       DOM HUD, minimap kanvas, peta besar
```

Polanya sederhana: satu event bus (`state.js`) menghubungkan sistem — `crime`, `hurt`, `crash`, `money`, `toast`, `banner` — jadi modul tidak saling impor silang.

## Tim

Dikerjakan seperti studio kecil, dengan pembagian peran:

| Peran | Fokus |
|---|---|
| Tech Lead | arsitektur, event bus, standar kode |
| Engine Engineer | city builder, merged geometry, kualitas render |
| Gameplay Engineer | fisika mobil, AI lalu lintas & polisi, misi |
| UI/UX Designer | HUD, minimap, menu, easing & animasi antarmuka |
| Audio Engineer | sintesis suara & radio prosedural |
| QA | build check CI, smoke test, balancing |

## Skill eksternal yang dipakai

Prinsip dari beberapa repo publik dipakai sebagai "skill" panduan kerja:

- **make-interfaces-feel-better** & **superdesign** → disiplin HUD/menu: easing `cubic-bezier(0.22,1,0.36,1)`, animasi masuk-keluar, focus-visible, hierarki panel, umpan balik mikro (uang naik/menyusut pun ada animasinya).
- **better-icons** → ikon HUD konsisten (bintang pencarian SVG inline satu sumber, bukan emoji campuran).
- **anti-ai-slop-writing** & **humanizer** → semua teks README, toast, banner, dan misi ditulis langsung tanpa klise ("seamless", "revolusioner", dsb.), kalimat pendek, bahasa orang.
- **rea (reverse engineering)** → dipakai hanya sebagai *metode berpikir*: menganalisis **mekanik** game open-world klasik (loop gameplay, sistem wanted, masuk-keluar kendaraan) lalu merancang implementasi original. reverse engineering aset/kode game komersial tidak kami lakukan dan tidak akan dilakukan — lihat [docs/LEGAL.md](docs/LEGAL.md).

## Lisensi

Kode: MIT (lihat [LICENSE](LICENSE)). Aset dibangkitkan oleh kode di repo ini dan ikut lisensi yang sama. Senja City tidak berafiliasi dengan Rockstar Games atau Take-Two Interactive.
