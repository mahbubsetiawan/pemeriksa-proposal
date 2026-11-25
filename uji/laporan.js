// Laporan ringkas pemakaian dan mutu dari pemeriksaan mahasiswa yang sudah diambil dengan uji/ambil-data.js.
//
// Pemakaian:
//   node uji/laporan.js                 -> membaca uji/privat/pemeriksaan-mentah.json
//   node uji/laporan.js --nama          -> tampilkan nama dan NIM di daftar mahasiswa (bawaan: id acak tanpa identitas)
//   node uji/laporan.js --sertakan-uji  -> ikutkan pemeriksaan uji pemilik (NIM 000000000)
//   node uji/laporan.js --berkas jalur  -> berkas lain
// Laporan memuat angka dan, dengan --nama, identitas mahasiswa: jangan dibagikan atau diunggah.
import { readFileSync, existsSync } from 'node:fs';
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

function utama() {
  const argumen = process.argv.slice(2);
  const i = argumen.indexOf('--berkas');
  const berkas = i >= 0 ? argumen[i + 1] : BERKAS_BAWAAN;
  if (!existsSync(berkas)) {
    console.error('Data belum ada. Jalankan dulu: node uji/ambil-data.js');
    process.exit(1);
  }
  const rekaman = JSON.parse(readFileSync(berkas, 'utf8'));
  console.log(formatLaporan(ringkasLaporan(rekaman, { sertakanUji: argumen.includes('--sertakan-uji') }), { tampilkanNama: argumen.includes('--nama') }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama();
