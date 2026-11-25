// Ambil semua pemeriksaan mahasiswa yang tersimpan di Worker, lalu (opsional) ubah menjadi butir data uji.
//
// Pemakaian (di terminal Anda; nilai rahasia diketik sendiri, jangan ditulis ke berkas):
//   $env:URL_WORKER = "https://pemeriksa-proposal.mahbub-afi-uinrms.workers.dev"; $env:KUNCI_ADMIN = "..."
//   node uji/ambil-data.js                 -> simpan mentah ke uji/privat/pemeriksaan-mentah.json
//   node uji/ambil-data.js --ke-data-uji   -> juga tambahkan satu butir per mahasiswa ke uji/data-uji.json
// KUNCI_ADMIN adalah rahasia KODE_ADMIN di Worker (npx wrangler secret put KODE_ADMIN).
// Hasil memuat nama dan NIM mahasiswa: hanya simpan di uji/privat/ (tidak ikut ke Git).
// Pemeriksaan dengan NIM 000000000 adalah uji pemilik dan dilewati saat membuat butir.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const jalur = (p) => fileURLToPath(new URL(p, import.meta.url));
const MENTAH = jalur('./privat/pemeriksaan-mentah.json');
const DATA_UJI = jalur('./data-uji.json');
const NIM_PEMILIK = '000000000';

export async function ambilSemua(url, kunci, fetchFn = fetch) {
  const semua = [];
  let kursor = null;
  do {
    const alamat = `${url.replace(/\/+$/, '')}/ekspor${kursor ? `?kursor=${encodeURIComponent(kursor)}` : ''}`;
    const res = await fetchFn(alamat, { headers: { 'X-Kunci-Admin': kunci } });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.galat ?? `Gagal mengambil data (${res.status}).`);
    semua.push(...j.data);
    kursor = j.kursor;
  } while (kursor);
  return semua;
}

const KOLOM = ['teori', 'konsep', 'objek', 'latar', 'rumusan', 'tujuan', 'teoretis', 'praktis', 'tinjauan', 'landasan', 'kerangka', 'jenis', 'sumber', 'teknik', 'kisi', 'analisis', 'triangulasi', 'sistematika'];
const berisi = (v) => (Array.isArray(v) ? v.some((x) => String(x ?? '').trim()) : Boolean(String(v ?? '').trim()));

/** Satu butir per NIM: isian terbaru tiap kolom menang; kolom kosong tidak menimpa yang berisi. Id butir tanpa identitas. */
export function jadikanButir(rekaman) {
  const perNim = new Map();
  for (const r of [...rekaman].sort((a, b) => a.waktu.localeCompare(b.waktu))) {
    if (r.nim === NIM_PEMILIK) continue;
    const b = perNim.get(r.nim) ?? { id: `mhs-${createHash('sha256').update(r.nim).digest('hex').slice(0, 6)}`, catatan: 'Diambil dari pemeriksaan mahasiswa di aplikasi.', penilaian: {} };
    for (const k of KOLOM) if (berisi(r.masukan?.[k])) b[k] = r.masukan[k];
    perNim.set(r.nim, b);
  }
  return [...perNim.values()];
}

async function utama() {
  const url = process.env.URL_WORKER;
  const kunci = process.env.KUNCI_ADMIN;
  if (!url || !kunci) throw new Error('Atur URL_WORKER dan KUNCI_ADMIN di sesi terminal Anda.');
  const rekaman = await ambilSemua(url, kunci);
  mkdirSync(jalur('./privat'), { recursive: true });
  writeFileSync(MENTAH, `${JSON.stringify(rekaman, null, 2)}\n`, 'utf8');
  const mhs = new Set(rekaman.filter((r) => r.nim !== NIM_PEMILIK).map((r) => r.nim));
  console.log(`${rekaman.length} pemeriksaan dari ${mhs.size} mahasiswa disimpan ke uji/privat/pemeriksaan-mentah.json.`);
  if (process.argv.includes('--ke-data-uji')) {
    const baru = jadikanButir(rekaman);
    const lama = existsSync(DATA_UJI) ? JSON.parse(readFileSync(DATA_UJI, 'utf8')) : [];
    // Butir dengan id yang sama diganti isiannya, tetapi penilaian Anda dipertahankan.
    const peta = new Map(lama.map((d) => [d.id, d]));
    for (const b of baru) peta.set(b.id, { ...b, penilaian: peta.get(b.id)?.penilaian ?? {} });
    writeFileSync(DATA_UJI, `${JSON.stringify([...peta.values()], null, 2)}\n`, 'utf8');
    console.log(`${baru.length} butir mahasiswa ditambahkan atau diperbarui di uji/data-uji.json.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) utama().catch((e) => { console.error(e.message); process.exit(1); });
