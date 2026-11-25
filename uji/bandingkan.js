// Skrip uji mutu: membandingkan keluaran aplikasi dengan penilaian pemilik.
//
// Pemakaian:
//   node uji/bandingkan.js                       -> hanya pemeriksaan aturan B dan C (tanpa jaringan, gratis)
//   node uji/bandingkan.js --ai --ulang 3        -> juga pemeriksaan makna B dan C lewat Worker, tiap butir 3 kali
//   node uji/bandingkan.js --semua --rinci       -> semua bagian A sampai H dan K, dengan rincian tiap kriteria
//   Opsi lain: --bagian A,E (batasi ke bagian tertentu), --simpan uji/privat/hasil.json (simpan baris hasil)
// Untuk --ai, atur variabel lingkungan di sesi terminal Anda (jangan ditulis ke berkas):
//   $env:URL_WORKER = "https://..."; $env:KODE_AKSES = "kode-kelas"
// Data: uji/data-uji.json (milik Anda, tidak ikut ke Git). Format: lihat uji/data-uji.contoh.json.
// Butir dari proposal PDF dibuat dengan uji/ekstrak_pdf.py.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { periksaSemua, STATUS } from '../js/aturan.js';
import { validasiHasil, buatPelaksanaWorker } from '../js/klien-ai.js';

const baca = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'));
export const RUBRIK = [...baca('../rubrik/B-rumusan.json'), ...baca('../rubrik/C-tujuan.json')];

const BERKAS = {
  A: 'A-latar', B: 'B-rumusan', C: 'C-tujuan', D: 'D-manfaat', E: 'E-tinjauan',
  F: 'F-landasan', G: 'G-metode', H: 'H-sistematika', K: 'K-koherensi'
};
export const RUBRIK_BAGIAN = Object.fromEntries(Object.entries(BERKAS).map(([h, f]) => [h, baca(`../rubrik/${f}.json`)]));

// Isian butir yang menandakan suatu bagian ada. Koherensi (K) ada bila minimal dua bagian lain terisi.
const KOLOM = {
  A: ['latar'], B: ['rumusan'], C: ['tujuan'], D: ['teoretis', 'praktis'], E: ['tinjauan'], F: ['landasan'],
  G: ['jenis', 'sumber', 'teknik', 'kisi', 'analisis', 'triangulasi'], H: ['sistematika']
};
const KOLOM_K = ['latar', 'rumusan', 'tujuan', 'tinjauan', 'landasan', 'kerangka', 'kisi', 'sistematika'];
const ada = (v) => (Array.isArray(v) ? v.some((x) => String(x ?? '').trim()) : Boolean(String(v ?? '').trim()));

/** Huruf bagian yang isinya ada pada butir ini. */
export function bagianTerisi(butir) {
  const huruf = Object.keys(KOLOM).filter((h) => KOLOM[h].some((k) => ada(butir[k])));
  if (KOLOM_K.filter((k) => ada(butir[k])).length >= 2) huruf.push('K');
  return huruf;
}

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

export function jalankanAturan(data, rubrik = RUBRIK) {
  const baris = [];
  for (const butir of data) {
    const hasil = periksaSemua(rubrik, butir);
    for (const h of hasil.filter((x) => x.jenis === 'aturan')) {
      baris.push({
        butir: butir.id, kriteria: h.id, jenis: 'aturan',
        aplikasi: h.status === STATUS.PERINGATAN ? 'terpenuhi' : h.status,
        pemilik: butir.penilaian?.[h.id], pesan: h.pesan, bukti: h.bukti
      });
    }
  }
  return baris;
}

/** Pemeriksaan aturan untuk semua bagian yang terisi pada tiap butir (atau hanya bagian dalam `huruf`). */
export function jalankanAturanSemua(data, huruf = null) {
  const baris = [];
  for (const butir of data) {
    const pilih = bagianTerisi(butir).filter((h) => !huruf || huruf.includes(h));
    baris.push(...jalankanAturan([butir], pilih.flatMap((h) => RUBRIK_BAGIAN[h])));
  }
  return baris;
}

// Worker mewajibkan identitas dan menyimpan tiap pemeriksaan; uji pemilik diberi NIM 000000000 agar mudah disaring dari data mahasiswa.
const IDENTITAS_UJI = { nama: 'Uji Pemilik', nim: '000000000' };
// Worker hanya menerima permintaan dari asal situs resmi; Node tidak menambahkannya sendiri.
const DENGAN_ASAL = (url, opsi) => fetch(url, { ...opsi, headers: { ...opsi.headers, Origin: 'https://mahbubsetiawan.github.io' } });

async function jalankanAi(data, ulang, huruf) {
  const url = process.env.URL_WORKER;
  const kode = process.env.KODE_AKSES;
  if (!url || !kode) throw new Error('Atur URL_WORKER dan KODE_AKSES di sesi terminal Anda.');
  const idPerangkat = process.env.ID_PERANGKAT || randomUUID();
  const baris = [];
  let masuk = 0; let keluar = 0;
  for (const butir of data) {
    const input = { ...butir, rumusan: butir.rumusan ?? [], tujuan: butir.tujuan ?? [] };
    for (const h of bagianTerisi(butir).filter((x) => !huruf || huruf.includes(x))) {
      const entriAi = RUBRIK_BAGIAN[h].filter((e) => e.jenis === 'ai');
      if (!entriAi.length) continue;
      const pelaksana = buatPelaksanaWorker({ url, kodeAkses: kode, idPerangkat, identitas: IDENTITAS_UJI, bagian: h, fetchFn: DENGAN_ASAL });
      for (let i = 0; i < ulang; i++) {
        let r;
        try {
          r = await pelaksana(entriAi, input);
        } catch (e) {
          console.error(`Butir ${butir.id}, bagian ${h}: ${e.message}`);
          if ([401, 403, 429].includes(e.status)) return { baris, masuk, keluar, berhenti: true };
          break; // galat khusus bagian ini (misalnya terlalu panjang): lanjut ke bagian berikutnya
        }
        masuk += r.penggunaan?.masukan ?? 0; keluar += r.penggunaan?.keluaran ?? 0;
        for (const x of validasiHasil(entriAi, r.hasil, input)) {
          baris.push({ butir: butir.id, kriteria: x.id, jenis: 'ai', aplikasi: x.status, pemilik: butir.penilaian?.[x.id], pesan: x.pesan, bukti: x.bukti });
        }
      }
    }
  }
  return { baris, masuk, keluar, berhenti: false };
}

function cetak(judul, baris) {
  console.log(`\n== ${judul} ==`);
  console.log('Kriteria | cocok | salah menyalahkan | salah meloloskan | tidak yakin | lain | tanpa penilaian');
  const urut = (a, b) => a.localeCompare(b, 'en', { numeric: true });
  for (const [k, r] of Object.entries(ringkas(baris)).sort(([a], [b]) => urut(a, b))) {
    console.log(`${k} | ${r.cocok} | ${r.salah_menyalahkan} | ${r.salah_meloloskan} | ${r.tidak_yakin} | ${r.lain} | ${r.tanpa_penilaian}`);
  }
}

/** Rincian tiap kriteria per butir, agar pemilik dapat menilai sendiri benar atau salahnya aplikasi. */
function cetakRinci(judul, baris) {
  console.log(`\n== Rincian: ${judul} ==`);
  const urut = (a, b) => a.butir.localeCompare(b.butir) || a.kriteria.localeCompare(b.kriteria, 'en', { numeric: true });
  for (const b of [...baris].sort(urut)) {
    const pembanding = b.pemilik ? ` [penilaian Anda: ${b.pemilik} -> ${nilaiPasangan(b.aplikasi, b.pemilik)}]` : '';
    console.log(`${b.butir} ${b.kriteria}: ${b.aplikasi}${pembanding}`);
    if (b.pesan && b.aplikasi !== 'terpenuhi') console.log(`    alasan: ${b.pesan}`);
    if (b.bukti?.length) console.log(`    bukti: "${String(b.bukti[0]).slice(0, 160)}"`);
  }
}

async function utama() {
  const argumen = process.argv.slice(2);
  const nilaiOpsi = (nama) => { const i = argumen.indexOf(nama); return i >= 0 ? argumen[i + 1] : undefined; };
  const berkas = fileURLToPath(new URL('./data-uji.json', import.meta.url));
  if (!existsSync(berkas)) {
    console.error('uji/data-uji.json belum ada. Salin uji/data-uji.contoh.json lalu isi dengan data nyata tanpa identitas.');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(berkas, 'utf8'));
  console.log(`Jumlah butir: ${data.length}`);
  const huruf = nilaiOpsi('--bagian')?.toUpperCase().split(',').filter(Boolean) ?? null;
  const luas = argumen.includes('--semua') || Boolean(huruf);
  const rinci = argumen.includes('--rinci');
  const hasilAkhir = [];

  const aturan = luas ? jalankanAturanSemua(data, huruf) : jalankanAturan(data);
  hasilAkhir.push(...aturan);
  cetak('Pemeriksaan aturan', aturan);
  if (rinci) cetakRinci('pemeriksaan aturan', aturan);

  if (argumen.includes('--ai')) {
    const ulang = Math.max(1, Number(nilaiOpsi('--ulang')) || 1);
    const { baris, masuk, keluar, berhenti } = await jalankanAi(data, ulang, luas ? huruf : ['B', 'C']);
    hasilAkhir.push(...baris);
    cetak(`Pemeriksaan makna (AI), ${ulang}x per butir`, baris);
    if (rinci) cetakRinci('pemeriksaan makna (AI)', baris);
    const biaya = (masuk * 0.10 + keluar * 0.50) / 1e6;
    console.log(`\nToken: ${masuk} masuk, ${keluar} keluar. Perkiraan biaya: $${biaya.toFixed(4)} (tarif Haiku 5.5: $0,10 dan $0,50 per juta token).`);
    if (berhenti) console.log('Catatan: berhenti sebelum semua butir selesai (lihat pesan di atas).');
  }

  const simpan = nilaiOpsi('--simpan');
  if (simpan) {
    writeFileSync(simpan, `${JSON.stringify(hasilAkhir, null, 2)}\n`, 'utf8');
    console.log(`\nBaris hasil disimpan ke ${simpan}.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama();
