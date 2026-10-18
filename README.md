# OpenSA Remastered Engine — GTA: San Andreas (v1.0 US Clean-Room Reconstruction)

Rekonstruksi clean-room dari **Grand Theft Auto: San Andreas (`gta_sa.exe` v1.0 US, RenderWare 3.6.0.3 `0x1803FFFF`)** yang dibangun di atas WebGL2 / Three.js dan TypeScript untuk penggunaan pribadi non-komersial. Proyek ini menggabungkan kemiripan mekanik, fisika, HUD, dan hash biner asli dengan pipeline **Next-Gen Graphics Tuning** (PBR clearcoat vehicle reflection, PS2 2004 dual-pass amber radiosity, wet road reflections, dan soft cascaded shadows).

---

## Struktur Organisasi Studio Engineering (`OpenSA Studio Division`)

Proyek ini dikelola dengan struktur divisi game studio penuh:

| Divisi & Role | Lead / Callsign | Sub-sistem `gta_sa.exe` v1.0 US yang Diawasi | Status |
| :--- | :--- | :--- | :--- |
| **Principal Tech Lead** | M. Vance | `CGame::Process (0x53BEE0)`, `CTimer::Update (0x561B10)`, Frame-rate independent physics (memperbaiki bug limiter 25 FPS di `0x53E94C`) | `VERIFIED` |
| **Lead Reverse Engineer (`morluto/rea`)** | K. Morluto | `CCheat (0x4384D0)`, `CKeyGen::GetKey (0x53CF00)`, `CdStream VER2 .img (0x406340)`, `RpClumpStreamRead (0x749B70)`, `CColStore (0x410EC0)` | `VERIFIED` |
| **Principal Graphics Architect** | R. Kosaka | `CTimeCycle (0x55FEC0)`, `CPostEffects::Radiosity (0x702080)`, `CCustomCarEnvMapPipeline (0x5DA020)` | `ACTIVE_TUNING` |
| **Vehicle Physics & Handling Lead** | D. Torrance | `cHandlingDataMgr (0x6F5330 / 0xC2B9DC)`, `tHandlingData (0xE0 bytes)`, Lowrider Hydraulics, 10x Nitrous, VTOL Hydra | `VERIFIED` |
| **SCM Script VM & AI Lead** | A. Hernandez | `CRunningScript::Process (0x469F00)`, `CWanted (0x562C90)`, `CGangWars (0x446610)` | `VERIFIED` |
| **UI/UX Design Engineer** | J. Krehel | `CHud::Draw (0x58FAE0)`, `CRadar::DrawRadarMap (0x586880)`, `CAERadioTrackManager (0x4EB6E0)` | `VERIFIED` |

---

## Peta Memori & Paritas Biner (`gta_sa.exe` v1.0 US)

Semua sub-sistem utama dipetakan langsung ke alamat virtual (`VA`) dari `gta_sa.exe` v1.0 US (`ImageBase: 0x00400000`, `EntryPoint: 0x00824570`):

1. **JamCRC Cheat Engine (`src/engine/CheatSystem.ts`)**:
   - Mereplikasi `CCheat::AddToCheatString` (`0x4384D0`) dan `CKeyGen::GetKey` (`0x53CF00`) yang menghitung CRC-32 tanpa bitwise-inversion pada buffer terbalik `m_CheatString` (`0x969110`, 30 byte) terhadap array `m_aCheatHashKeys` (`0x8A5CC8`).
   - Contoh paritas hash bit-for-bit:
     - `HESOYAM` $\rightarrow$ `0xEECCEA2B` (`CCheat::MoneyArmourHealthCheat` @ `0x438E40`)
     - `LXGIWYL` $\rightarrow$ `0xDE4B237D` (`CCheat::WeaponCheat1` @ `0x4385B0`)
     - `KJKSZPJ` $\rightarrow$ `0xB22A28D1` (`CCheat::WeaponCheat2` @ `0x438890`)
     - `UZUMYMW` $\rightarrow$ `0x5A783FAE` (`CCheat::WeaponCheat3` @ `0x438B30`)
     - `ROCKETMAN` $\rightarrow$ `0x040CF761` (`CCheat::JetpackCheat` @ `0x439600`)
     - `AIWPRTON` $\rightarrow$ `0x43DB914E` (`CCheat::TankCheat` @ `0x43A4A0`)
2. **Vehicle Physics & `handling.cfg` (`src/engine/HandlingMgr.ts`)**:
   - Membaca format teks 32 kolom asli `data/handling.cfg` (`cHandlingDataMgr::LoadHandlingData` @ `0x5BD830`) ke dalam struct `tHandlingData` (`sizeof = 0xE0`).
   - Mencakup 14 kendaraan ikonik: **Greenwood**, **Savanna Lowrider** (dengan suspensi hidrolik `H`), **BMX**, **Picador**, **Infernus**, **Sultan RS**, **NRG-500**, **Sanchez**, **LSPD Cruiser**, **Rhino M1A1 Tank**, **Hydra VTOL Jet**, **Maverick Helicopter**, **Taxi**, dan **Ambulance**.
3. **TimeCycle 8-Period Sky & Next-Gen Graphics Tuning (`src/engine/TimeCycle.ts`)**:
   - Interpolasi warna 8 periode waktu harian (`00:00`, `05:00`, `06:00`, `07:00`, `12:00`, `19:00`, `20:00`, `22:00`) dari `CTimeCycle` (`0xB7C3C8` – `0xB7A4E0`).
   - Toggle real-time antara 3 mode visual:
     - **PS2 2004 (Amber Radiosity)**: Mengembalikan glow oranye hangat `CPostEffects::Radiosity` (`0x702080`).
     - **PC v1.0 (2005)**: Warna netral RenderWare 3.6 PC.
     - **Remastered Next-Gen (PBR)**: Cat mobil metalik clearcoat, pantulan aspal basah, bayangan lembut 2048px, dan tone mapping ACES Filmic.
4. **Private Licensed File Inspector (`src/engine/BinaryFormats.ts`)**:
   - Karena lisensi game bersifat pribadi, Anda dapat membuka tab **Studio & REA Binary Lab $\rightarrow$ Private Licensed Asset Inspector** dan melakukan drag-and-drop file lokal dari ekstrak `GTA San Andreas full game.zip` milik Anda (`gta3.img`, `.dff`, `.txd`, `.col`, `LAe.ipl`, `handling.cfg`, atau `gta_sa.exe`).
   - Semua parsing dilakukan 100% secara lokal di memori browser menggunakan `ArrayBuffer` / `DataView` tanpa mengunggah byte berlisensi ke server mana pun.

---

## Kontrol Permainan

- **WASD / Arrow Keys**: Jalan, Lari, atau Kemudikan Kendaraan
- **F / Enter**: Masuk atau Keluar dari Kendaraan terdekat
- **Space**: Lompat (atau Mega Jump `KANGAROO`), Rem Tangan (`Handbrake`), atau Naik dengan Jetpack / Pesawat
- **Shift**: Lari Cepat (`Sprint`) atau Aktifkan **10x Nitrous Oxide** di mobil
- **H**: Pompa Suspensi Hidrolik Lowrider (`Savanna`)
- **Ctrl / Klik Tombol Fire**: Tembak Senjata atau Semprot Tag Grafiti Ballas (`Spray Can`)
- **Q / E**: Ganti Senjata
- **R**: Ganti Stasiun Radio (*Radio Los Santos*, *K-DST*, *K-Rose*, *Bounce FM*, *Playback FM*, *Radio X*, *SF-UR*)
- **Ketik Langsung di Keyboard**: Ketik `HESOYAM`, `ROCKETMAN`, `BAGUVIX`, `AIWPRTON`, `JUMPJET`, `KANGAROO`, `RIPAZHA`, `SPEEDFREAK`, `OFVIAC`, `LJSPQK`, `ASNAEB` kapan saja saat bermain.

---

## Menjalankan Proyek & Verifikasi REA

```bash
# Jalankan unit test & verifikasi paritas biner (JamCRC, handling.cfg, VER2 .img, RenderWare 3.6 .dff)
npm test

# Verifikasi & perbarui REA Reconstruction Obligation Ledger
npm run rea:verify

# Jalankan server development
npm run dev

# Build produksi
npm run build
```
