// Skrip uji mutu: membandingkan keluaran aplikasi dengan penilaian pemilik.
//
// Pemakaian:
//   node uji/bandingkan.js                       -> hanya pemeriksaan aturan (tanpa jaringan, gratis)
//   node uji/bandingkan.js --ai --ulang 3        -> juga pemeriksaan makna lewat Worker, tiap butir 3 kali
// Untuk --ai, atur variabel lingkungan di sesi terminal Anda (jangan ditulis ke berkas):
//   $env:URL_WORKER = "https://..."; $env:KODE_AKSES = "kode-kelas"
// Data: uji/data-uji.json (milik Anda, tidak ikut ke Git). Format: lihat uji/data-uji.contoh.json.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { periksaSemua, STATUS } from '../js/aturan.js';
import { validasiHasil } from '../js/klien-ai.js';

const baca = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'));
export const RUBRIK = [...baca('../rubrik/B-rumusan.json'), ...baca('../rubrik/C-tujuan.json')];

/** Bandingkan status aplikasi (a) dengan penilaian pemilik (p). */
export function nilaiPasangan(a, p) {
  if (!p) return 'tanpa_penilaian';
  if (a === 'tidak_yakin') return 'tidak_yakin';
  if (a === p) return 'cocok';
  if (a === 'belum' && p === 'terpenuhi') return 'salah_menyalahkan';
  if (a === 'terpenuhi' && p === 'belum') return 'salah_meloloskan';
  return 'lain';
}

/** Ringkas hasil: per kriteria, hitung tiap jenis pasangan. */
export function ringkas(baris) {
  const per = {};
  for (const b of baris) {
    const r = (per[b.kriteria] ??= { cocok: 0, salah_menyalahkan: 0, salah_meloloskan: 0, tidak_yakin: 0, lain: 0, tanpa_penilaian: 0 });
    r[nilaiPasangan(b.aplikasi, b.pemilik)]++;
  }
  return per;
}

export function jalankanAturan(data) {
  const baris = [];
  for (const butir of data) {
    const hasil = periksaSemua(RUBRIK, butir);
    for (const h of hasil.filter((x) => x.jenis === 'aturan')) {
      baris.push({ butir: butir.id, kriteria: h.id, aplikasi: h.status === STATUS.PERINGATAN ? 'terpenuhi' : h.status, pemilik: butir.penilaian?.[h.id] });
    }
  }
  return baris;
}

async function jalankanAi(data, ulang) {
  const url = process.env.URL_WORKER;
  const kode = process.env.KODE_AKSES;
  if (!url || !kode) throw new Error('Atur URL_WORKER dan KODE_AKSES di sesi terminal Anda.');
  const idPerangkat = process.env.ID_PERANGKAT || randomUUID();
  const entriAi = RUBRIK.filter((e) => e.jenis === 'ai');
  const baris = [];
  let masuk = 0; let keluar = 0;
  for (const butir of data) {
    for (let i = 0; i < ulang; i++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mahbubsetiawan.github.io', 'X-Kode-Akses': kode, 'X-Id-Perangkat': idPerangkat },
        body: JSON.stringify({ rumusan: butir.rumusan, tujuan: butir.tujuan, teori: butir.teori, konsep: butir.konsep, objek: butir.objek })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { console.error(`Berhenti pada butir ${butir.id}: ${j.galat ?? res.status}`); return { baris, masuk, keluar, berhenti: true }; }
      masuk += j.penggunaan?.masukan ?? 0; keluar += j.penggunaan?.keluaran ?? 0;
      for (const h of validasiHasil(entriAi, j.hasil, butir)) {
        baris.push({ butir: butir.id, kriteria: h.id, aplikasi: h.status, pemilik: butir.penilaian?.[h.id] });
      }
    }
  }
  return { baris, masuk, keluar, berhenti: false };
}

function cetak(judul, baris) {
  console.log(`\n== ${judul} ==`);
  console.log('Kriteria | cocok | salah menyalahkan | salah meloloskan | tidak yakin | lain | tanpa penilaian');
  for (const [k, r] of Object.entries(ringkas(baris)).sort()) {
    console.log(`${k} | ${r.cocok} | ${r.salah_menyalahkan} | ${r.salah_meloloskan} | ${r.tidak_yakin} | ${r.lain} | ${r.tanpa_penilaian}`);
  }
}

async function utama() {
  const argumen = process.argv.slice(2);
  const berkas = fileURLToPath(new URL('./data-uji.json', import.meta.url));
  if (!existsSync(berkas)) {
    console.error('uji/data-uji.json belum ada. Salin uji/data-uji.contoh.json lalu isi dengan data nyata tanpa identitas.');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(berkas, 'utf8'));
  console.log(`Jumlah butir: ${data.length}`);
  cetak('Pemeriksaan aturan', jalankanAturan(data));
  if (argumen.includes('--ai')) {
    const i = argumen.indexOf('--ulang');
    const ulang = i >= 0 ? Math.max(1, Number(argumen[i + 1]) || 1) : 1;
    const { baris, masuk, keluar, berhenti } = await jalankanAi(data, ulang);
    cetak(`Pemeriksaan makna (AI), ${ulang}x per butir`, baris);
    const biaya = (masuk * 0.10 + keluar * 0.50) / 1e6;
    console.log(`\nToken: ${masuk} masuk, ${keluar} keluar. Perkiraan biaya: $${biaya.toFixed(4)} (tarif Haiku 5.5: $0,10 dan $0,50 per juta token).`);
    if (berhenti) console.log('Catatan: berhenti sebelum semua butir selesai (lihat pesan di atas).');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama();
