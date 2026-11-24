# Pemeriksa Proposal Skripsi AFI

Alat bantu belajar untuk memeriksa rumusan masalah (bagian B) dan tujuan penelitian (bagian C) pada proposal skripsi model analisis-teoretis. Aplikasi menyebut kriteria yang sudah dan belum terpenuhi, disertai kutipan tulisan sebagai bukti. Aplikasi tidak menulis ulang tulisan Anda.

Aplikasi ini bantuan awal, bukan penilaian final. Acuannya panduan struktur penulisan skripsi yang disusun Dr. Mahbub Setiawan sebagai alat bantu belajar; panduan itu bukan dokumen resmi fakultas atau program studi, dan pembimbing tetap menjadi rujukan akhir.

## Cara kerja

- Pemeriksaan berbasis aturan (jumlah rumusan, kata tanya, jumlah tujuan, kata kerja tujuan) berjalan di perangkat, tanpa internet dan tanpa AI.
- Pemeriksaan makna oleh AI dikirim lewat Worker perantara (`worker/`) ke Claude API. Pemeriksaan ini memerlukan kode akses kelas dan persetujuan pengguna. Server perantara tidak menyimpan tulisan.
- Aplikasi dapat dipasang di layar utama (PWA).

## Menjalankan di komputer sendiri

```
python -m http.server 8080
```

Buka `http://localhost:8080/`. Service worker memerlukan alamat web, bukan `file://`. Untuk memakai layanan AI dari alamat lokal, Worker harus mengizinkan asal tersebut (lihat `worker/README.md`).

## Pengujian

```
npm test
```

Memakai pelari uji bawaan Node; tanpa dependensi.

## Struktur

- `index.html`, `gaya.css`, `js/`: antarmuka dan pemeriksaan.
- `rubrik/`: kriteria sebagai data (`B-rumusan.json`, `C-tujuan.json`). `ditangguhkan.json` memuat kriteria yang belum punya dasar di panduan.
- `worker/`: kode Worker Cloudflare tanpa rahasia. Panduan pemasangan ada di `worker/README.md`.
- `uji/`: pengujian otomatis dan skrip uji mutu.

## Catatan pemeliharaan

- Ubah `NAMA_CACHE` di `sw.js` setiap berkas aplikasi berubah, agar pemasangan lama diperbarui.
- Kunci API dan kode akses tidak pernah ada di repositori ini; keduanya hanya tersimpan sebagai rahasia di Cloudflare.
