// Laporan ringkas pemakaian dan mutu dari pemeriksaan mahasiswa yang sudah diambil dengan uji/ambil-data.js.
//
// Pemakaian:
//   node uji/laporan.js                 -> membaca uji/privat/pemeriksaan-mentah.json
//   node uji/laporan.js --nama          -> tampilkan nama dan NIM di daftar mahasiswa (bawaan: id acak tanpa identitas)
//   node uji/laporan.js --rekap         -> daftar mahasiswa (No, NIM, Nama, bagian A-H dan K yang dipakai) + berkas CSV untuk Excel
//   node uji/laporan.js --sertakan-uji  -> ikutkan pemeriksaan uji pemilik (NIM 000000000)
//   node uji/laporan.js --berkas jalur  -> berkas lain
// Laporan memuat angka dan, dengan --nama, identitas mahasiswa: jangan dibagikan atau diunggah.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const NIM_PEMILIK = '000000000';
const BERKAS_BAWAAN = fileURLToPath(new URL('./privat/pemeriksaan-mentah.json', import.meta.url));
const TARIF = { masukan: 0.10, keluaran: 0.50 }; // dolar per juta token, Haiku 5.5 (sama dengan bandingkan.js)

const urut = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const persen = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '-');

/** Hitung semua angka laporan. Murni: tidak membaca berkas dan tidak mencetak. */
export function ringkasLaporan(rekaman, { sertakanUji = false } = {}) {
  const data = rekaman.filter((r) => sertakanUji || r.nim !== NIM_PEMILIK);
  const perBagian = {};
  const perKriteria = {};
  const perHari = {};
  const perMhs = new Map();
  let masuk = 0; let keluar = 0;
  for (const r of data) {
    perBagian[r.bagian] = (perBagian[r.bagian] ?? 0) + 1;
    const hari = String(r.waktu ?? '').slice(0, 10);
    perHari[hari] = (perHari[hari] ?? 0) + 1;
    masuk += Number(r.penggunaan?.masukan ?? 0);
    keluar += Number(r.penggunaan?.keluaran ?? 0);
    const m = perMhs.get(r.nim) ?? { nim: r.nim, nama: r.nama, pemeriksaan: 0, bagian: new Set(), terakhir: '' };
    m.pemeriksaan++;
    m.bagian.add(r.bagian);
    if (String(r.waktu) > m.terakhir) m.terakhir = String(r.waktu);
    perMhs.set(r.nim, m);
    for (const h of Array.isArray(r.hasil) ? r.hasil : []) {
      const k = (perKriteria[h.id] ??= { terpenuhi: 0, belum: 0, tidak_yakin: 0, lain: 0 });
      if (h.status in k) k[h.status]++; else k.lain++;
    }
  }
  const biaya = (masuk * TARIF.masukan + keluar * TARIF.keluaran) / 1e6;
  return { total: data.length, mahasiswa: [...perMhs.values()], perBagian, perKriteria, perHari, token: { masuk, keluar }, biaya };
}

/** Kode pendek yang konsisten untuk satu NIM, agar laporan tanpa identitas tetap bisa dirujuk. */
export const kodeMhs = (nim) => `mhs-${createHash('sha256').update(String(nim)).digest('hex').slice(0, 6)}`;

export function formatLaporan(r, { tampilkanNama = false } = {}) {
  const baris = [];
  baris.push(`Pemeriksaan AI: ${r.total} dari ${r.mahasiswa.length} mahasiswa.`);
  if (!r.total) { baris.push('Belum ada data.'); return baris.join('\n'); }
  const hari = Object.keys(r.perHari).sort();
  baris.push(`Rentang: ${hari[0]} sampai ${hari[hari.length - 1]}.`);
  baris.push(`Token: ${r.token.masuk} masuk, ${r.token.keluar} keluar. Perkiraan biaya: $${r.biaya.toFixed(4)}.`);

  baris.push('', '== Per hari ==');
  for (const h of hari) baris.push(`${h}: ${r.perHari[h]}`);

  baris.push('', '== Per bagian ==');
  for (const b of Object.keys(r.perBagian).sort(urut)) baris.push(`${b}: ${r.perBagian[b]}`);

  baris.push('', '== Hasil per kriteria (urut dari yang paling sering "tidak yakin") ==');
  baris.push('Kriteria | terpenuhi | belum | tidak yakin | % tidak yakin | % belum');
  const kriteria = Object.entries(r.perKriteria).map(([id, k]) => ({ id, ...k, n: k.terpenuhi + k.belum + k.tidak_yakin + k.lain }));
  kriteria.sort((a, b) => (b.tidak_yakin / b.n) - (a.tidak_yakin / a.n) || urut(a.id, b.id));
  for (const k of kriteria) {
    baris.push(`${k.id} | ${k.terpenuhi} | ${k.belum} | ${k.tidak_yakin} | ${persen(k.tidak_yakin, k.n)} | ${persen(k.belum, k.n)}`);
  }

  baris.push('', tampilkanNama ? '== Mahasiswa (dengan identitas) ==' : '== Mahasiswa (id acak, tanpa identitas) ==');
  for (const m of [...r.mahasiswa].sort((a, b) => b.pemeriksaan - a.pemeriksaan)) {
    const siapa = tampilkanNama ? `${m.nama} (${m.nim})` : kodeMhs(m.nim);
    baris.push(`${siapa}: ${m.pemeriksaan} pemeriksaan, bagian ${[...m.bagian].sort(urut).join(', ')}, terakhir ${m.terakhir.slice(0, 16).replace('T', ' ')}`);
  }
  return baris.join('\n');
}

const KOLOM_BAGIAN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'];

/** Satu baris per mahasiswa, urut NIM: nomor, NIM, nama, bagian yang dipakai (✓), jumlah pemeriksaan. */
export function rekapMahasiswa(rekaman, { sertakanUji = false } = {}) {
  const { mahasiswa } = ringkasLaporan(rekaman, { sertakanUji });
  return [...mahasiswa].sort((a, b) => a.nim.localeCompare(b.nim)).map((m, i) => ({
    no: i + 1, nim: m.nim, nama: m.nama,
    bagian: Object.fromEntries(KOLOM_BAGIAN.map((k) => [k, m.bagian.has(k) ? '✓' : ''])),
    jumlah: m.pemeriksaan
  }));
}

export function formatRekap(baris) {
  if (!baris.length) return 'Belum ada mahasiswa yang memakai aplikasi.';
  const kepala = ['No', 'NIM', 'Nama', ...KOLOM_BAGIAN, 'Jumlah'];
  const isi = baris.map((r) => [String(r.no), r.nim, r.nama, ...KOLOM_BAGIAN.map((k) => r.bagian[k]), String(r.jumlah)]);
  const lebar = kepala.map((k, i) => Math.max(k.length, ...isi.map((b) => b[i].length)));
  const cetak = (b) => b.map((c, i) => c.padEnd(lebar[i])).join(' | ').trimEnd();
  return [cetak(kepala), lebar.map((l) => '-'.repeat(l)).join('-+-'), ...isi.map(cetak)].join('\n');
}

/** CSV berpenanda UTF-8 (BOM) agar tanda ✓ dan huruf Indonesia terbaca benar di Excel. Pemisah titik koma untuk pengaturan Excel Indonesia. */
export function csvRekap(baris) {
  const sel = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const kepala = ['No', 'NIM', 'Nama', ...KOLOM_BAGIAN, 'Jumlah pemeriksaan'];
  const garis = baris.map((r) => [r.no, r.nim, r.nama, ...KOLOM_BAGIAN.map((k) => r.bagian[k]), r.jumlah].map(sel).join(';'));
  return `﻿${[kepala.map(sel).join(';'), ...garis].join('\r\n')}\r\n`;
}

function utama() {
  const argumen = process.argv.slice(2);
  const i = argumen.indexOf('--berkas');
  const berkas = i >= 0 ? argumen[i + 1] : BERKAS_BAWAAN;
  if (!existsSync(berkas)) {
    console.error('Data belum ada. Jalankan dulu: node uji/ambil-data.js');
    process.exit(1);
  }
  const rekaman = JSON.parse(readFileSync(berkas, 'utf8'));
  if (argumen.includes('--rekap')) {
    const baris = rekapMahasiswa(rekaman, { sertakanUji: argumen.includes('--sertakan-uji') });
    console.log(formatRekap(baris));
    if (baris.length) {
      const csv = fileURLToPath(new URL('./privat/rekap-mahasiswa.csv', import.meta.url));
      writeFileSync(csv, csvRekap(baris), 'utf8');
      console.log(`\nDisimpan juga sebagai uji\\privat\\rekap-mahasiswa.csv (bisa dibuka di Excel).`);
    }
    return;
  }
  console.log(formatLaporan(ringkasLaporan(rekaman, { sertakanUji: argumen.includes('--sertakan-uji') }), { tampilkanNama: argumen.includes('--nama') }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama();
