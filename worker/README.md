# Worker perantara

Menyimpan kunci API sebagai rahasia dan meneruskan pemeriksaan makna ke Claude API. Kode di sini tidak memuat kunci apa pun.

## Pemasangan (dikerjakan pemilik sendiri)

Jalankan dari folder `worker/`. Pemasangan memerlukan akun Cloudflare.

```powershell
npx wrangler login
```

```powershell
npx wrangler kv namespace create PEMAKAIAN
```

Salin `id` yang muncul ke `kv_namespaces` di `wrangler.toml`.

```powershell
npx wrangler secret put ANTHROPIC_API_KEY
```

```powershell
npx wrangler secret put KODE_AKSES
```

Kedua perintah rahasia meminta nilai langsung di terminal Anda; nilainya tidak melewati Claude Code. Gunakan kunci khusus aplikasi ini, matikan isi ulang otomatis, dan pasang batas pengeluaran bulanan di konsol Anthropic.

```powershell
npx wrangler deploy
```

Setelah terpasang, isi `URL_WORKER` di `js/konfigurasi.js` dengan alamat Worker. Selama kosong, aplikasi memakai data tiruan.

## Pengamanan yang berlaku
- Kode akses kelas wajib (`KODE_AKSES`, boleh beberapa, dipisah koma).
- Batas 20 pemeriksaan per perangkat per hari dan 300 per hari untuk seluruh kelas (`BATAS_GLOBAL`).
- CORS hanya untuk `https://mahbubsetiawan.github.io`. Untuk uji lokal, tambahkan `http://localhost:8765` ke `ASAL_DIIZINKAN` sementara.
- Batas panjang teks, paling banyak 3 butir per bagian.
- Isi permintaan tidak disimpan dan tidak dicatat.

## Catatan batas paket gratis (diperiksa 24 November 2026)
- Workers Free: 100.000 permintaan per hari, 10 ms waktu CPU per permintaan, 50 subrequest.
- KV Free: 1.000 penulisan per hari. Tiap pemeriksaan memakai 2 penulisan (perangkat dan global), sehingga kapasitas praktisnya sekitar 500 pemeriksaan per hari.
- Model: `claude-haiku-5-5` ($0,10 masukan dan $0,50 keluaran per juta token pada daftar harga yang dimuat dalam sesi ini).
