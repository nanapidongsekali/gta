# Catatan Legal — kenapa Senja City bukan klon GTA San Andreas

Permintaan awal proyek ini adalah "remake GTA San Andreas dengan kemiripan 99,9%". Kami tidak bisa mengerjakan itu apa pun bentuknya, dan halaman ini menjelaskan alasannya secara jujur, plus apa yang kami kerjakan sebagai gantinya.

## Kenapa tidak bisa

1. **Hak cipta melindungi ekspresi, bukan ide.** Peta kota San Andreas, cerita, karakter (mis. CJ), model 3D, tekstur, musik, missable script, dan kode GTA SA adalah karya berhak cipta milik Rockstar Games / Take-Two Interactive. Menyalinnya — sekalipun lewat reverse engineering — berarti membuat karya turunan tanpa izin.

2. **"Saya punya lisensinya" tidak cukup.** Lisensi yang datang dengan membeli game adalah lisensi *memainkan* salinan itu, bukan lisensi *memperbanyak, memodifikasi untuk didistribusikan, atau membuat ulang* karyanya. EULA Rockstar secara eksplisit melarang reverse engineering dan pembuatan karya turunan.

3. **Tidak untuk monetisasi pun tetap pelanggaran.** Faktor komersial memengaruhi ukuran gugatan, tapi tidak mengubah ada-tidaknya pelanggaran. Preseden nyata: proyek reverse engineering `re3`/`reVC` di GitHub menerima DMCA takedown dari Take-Two pada 2021, meski gratis dan tanpa aset asli.

4. **Repo ini publik di GitHub.** Memuat aset atau kode turunan di sini berarti mendistribusikannya — pemicu paling cepat takedown, dan bisa memberi masalah pada akun repo.

## Garis yang kami tarik

| Boleh (kami lakukan) | Tidak boleh (tidak kami lakukan) |
|---|---|
| Genre & mekanik: dunia terbuka, naik-turun mobil, misi, bintang kejaran, HUD minimap | Menyalin peta, distrik, atau landmark San Andreas |
| Kota fiktif original dengan identitas sendiri (Senja City, nuansa Indonesia) | Nama, karakter, cerita, dialog, atau *look* tokoh GTA |
| Model & tekstur prosedural yang dibangkitkan kode | Model/tekstur/audio yang diekstrak dari file game |
| UI bergaya mirip secara umum (minimap bundar, bintang) — ide fungsional | Font, logo, artwork menu, atau aset UI GTA |

Aturan praktisnya sederhana: **kalau karya kami dihapus, apakah pemain masih bisa mengenali GTA SA di dalamnya?** Kalau ya, berarti terlalu jauh.

## Kalau benar-benar ingin "GTA SA asli tapi grafis lebih bagus"

Jalur yang sah ada, tapi semuanya butuh aset milik sendiri dan tidak lewat repo publik ini:

- **Mod grafis untuk salinan resmi milik pribadi** — pakai mod yang diizinkan (Rockstar punya kebijakan mod single-player tertentu) di salinan game sendiri, tanpa mendistribusikan aset aslinya.
- **Engine re-implementasi clean-room** (seperti OpenRW untuk GTA III) — kode engine ditulis baru, tapi tetap butuh pengguna memasok file aset dari CD/kuota resmi miliknya; repo hanya berisi kode, bukan aset. Proyek tipe ini tetap berisiko takedown seperti re3.
- **Konten fan-made dengan izin resmi** — satu-satunya cara 100% aman: lisensi dari pemilik haknya, yang tidak akan mencakup penggunaan merek GTA untuk proyek pribadi.

Senja City memilih jalan paling sehat: ambil rasa game open-world klasik, bangun semuanya dari nol, dan biarkan tumbuh jadi identitasnya sendiri.
