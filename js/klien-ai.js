// Klien pemeriksaan makna (jenis AI).
// Dua pelaksana berantarmuka sama: `pelaksanaTiruan` (tanpa jaringan) dan `buatPelaksanaWorker` (lewat Worker perantara).
// Kunci API tidak pernah ada di sini; kunci hanya ada sebagai rahasia di Worker.
import { STATUS, butirTerisi } from './aturan.js';

export const STATUS_AI = Object.freeze({
  TERPENUHI: 'terpenuhi',
  BELUM: 'belum',
  TIDAK_YAKIN: 'tidak_yakin'
});

const SKENARIO_TIRUAN = {
  B4: { status: 'terpenuhi', sumber: 'rumusan', alasan: 'Data tiruan: rumusan tampak memuat konsep teori dan objek material.' },
  B5: { status: 'tidak_yakin', sumber: 'rumusan', alasan: 'Data tiruan: hubungan konsep teori dengan objek pada rumusan pertama belum dapat dipastikan.' },
  B6: { status: 'belum', sumber: 'rumusan', alasan: 'Data tiruan: contoh hasil "belum terpenuhi" untuk menguji tampilan.' },
  C3: { status: 'tidak_yakin', sumber: 'tujuan', alasan: 'Data tiruan: kesesuaian tujuan dengan rumusan belum dapat dipastikan.' },
  A1: { status: 'terpenuhi', sumber: 'latar', alasan: 'Data tiruan: konteks umum tampak ada.' },
  A2: { status: 'terpenuhi', sumber: 'latar', alasan: 'Data tiruan: objek material tampak dijelaskan.' },
  A3: { status: 'tidak_yakin', sumber: 'latar', alasan: 'Data tiruan: perspektif teori belum dapat dipastikan.' },
  A4: { status: 'belum', sumber: 'latar', alasan: 'Data tiruan: contoh hasil "belum terpenuhi" untuk menguji tampilan.' },
  A5: { status: 'terpenuhi', sumber: 'latar', alasan: 'Data tiruan: muara kalimat tampak ada.' },
  A6: { status: 'tidak_yakin', sumber: 'latar', alasan: 'Data tiruan: alur makro ke mikro belum dapat dipastikan.' },
  D3: { status: 'terpenuhi', sumber: 'teoretis', alasan: 'Data tiruan: kontribusi keilmuan tampak disebut.' },
  D4: { status: 'tidak_yakin', sumber: 'praktis', alasan: 'Data tiruan: kespesifikan pihak belum dapat dipastikan.' },
  H5: { status: 'terpenuhi', sumber: 'sistematika', alasan: 'Data tiruan: isi bab tampak diterangkan.' },
  H6: { status: 'tidak_yakin', sumber: 'sistematika', alasan: 'Data tiruan: kerunutan alur belum dapat dipastikan.' },
  H7: { status: 'belum', sumber: 'sistematika', alasan: 'Data tiruan: contoh hasil "belum terpenuhi" untuk menguji tampilan.' },
  E3: { status: 'terpenuhi', sumber: 'tinjauan', alasan: 'Data tiruan: pengelompokan literatur tampak ada.' },
  E4: { status: 'tidak_yakin', sumber: 'tinjauan', alasan: 'Data tiruan: perbandingan antar-literatur belum dapat dipastikan.' },
  E5: { status: 'belum', sumber: 'tinjauan', alasan: 'Data tiruan: contoh hasil "belum terpenuhi" untuk menguji tampilan.' },
  E6: { status: 'terpenuhi', sumber: 'tinjauan', alasan: 'Data tiruan: tulisan tampak sintesis.' },
  F3: { status: 'terpenuhi', sumber: 'landasan', alasan: 'Data tiruan: definisi konseptual tampak ada.' },
  F4: { status: 'terpenuhi', sumber: 'landasan', alasan: 'Data tiruan: konsep utama tampak diuraikan.' },
  F5: { status: 'tidak_yakin', sumber: 'landasan', alasan: 'Data tiruan: relevansi dengan objek belum dapat dipastikan.' },
  F6: { status: 'terpenuhi', sumber: 'kerangka', alasan: 'Data tiruan: alur deduktif tampak ada.' },
  F7: { status: 'belum', sumber: 'kerangka', alasan: 'Data tiruan: contoh hasil "belum terpenuhi" untuk menguji tampilan.' }
};

const rapat = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** Bukti contoh dari isian: butir pertama bila daftar, kalimat pertama bila teks panjang. */
function buktiTiruan(nilai) {
  if (Array.isArray(nilai)) {
    const b = butirTerisi(nilai);
    return b.length ? [b[0].teks] : [];
  }
  const kalimat = rapat(nilai).split(/(?<=[.!?])\s+/)[0];
  return kalimat ? [kalimat] : [];
}

/** Pelaksana tiruan: hasil tetap, bukti diambil dari tulisan pengguna agar kontrak "bukti = kutipan" ikut teruji. */
export async function pelaksanaTiruan(entriAi, input) {
  return entriAi.map((e) => {
    const s = SKENARIO_TIRUAN[e.id] ?? { status: 'tidak_yakin', sumber: 'rumusan', alasan: 'Data tiruan: tidak ada skenario.' };
    return { id: e.id, status: s.status, bukti: buktiTiruan(input[s.sumber]), alasan: s.alasan, rujukan: e.rujukan };
  });
}

/**
 * Pelaksana sungguhan: memanggil Worker perantara. Hanya mengirim isian pengguna, kode akses, dan id perangkat acak.
 * `bagian` memilih jenis pemeriksaan: 'BC' (rumusan dan tujuan) atau 'A' (latar belakang).
 */
export function buatPelaksanaWorker({ url, kodeAkses, idPerangkat, bagian = 'BC', fetchFn = (...a) => fetch(...a) }) {
  return async (entriAi, input) => {
    const badan = {
      A: { bagian: 'A', latar: input.latar },
      D: { bagian: 'D', teoretis: input.teoretis, praktis: input.praktis },
      H: { bagian: 'H', sistematika: input.sistematika },
      E: { bagian: 'E', tinjauan: input.tinjauan },
      F: { bagian: 'F', konsep: input.konsep, landasan: input.landasan, kerangka: input.kerangka },
      BC: { bagian: 'BC', rumusan: input.rumusan, tujuan: input.tujuan, teori: input.teori, konsep: input.konsep, objek: input.objek }
    }[bagian] ?? { bagian: 'BC' };
    let res;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kode-Akses': kodeAkses, 'X-Id-Perangkat': idPerangkat },
        body: JSON.stringify(badan)
      });
    } catch {
      // Kegagalan jaringan atau penolakan asal (CORS) tampil di peramban sebagai "Failed to fetch".
      throw new Error('Layanan pemeriksaan tidak dapat dihubungi. Periksa sambungan internet, dan pastikan aplikasi dibuka dari alamat resminya.');
    }
    let data = {};
    try { data = await res.json(); } catch { /* badan bukan JSON */ }
    if (!res.ok) {
      const e = new Error(data.galat ?? 'Pemeriksaan makna gagal.');
      e.status = res.status;
      throw e;
    }
    const diminta = new Set(entriAi.map((e) => e.id));
    return { hasil: (data.hasil ?? []).filter((h) => diminta.has(h?.id)), sisa: data.sisa, penggunaan: data.penggunaan };
  };
}

/**
 * Validasi keluaran pelaksana terhadap kontrak (RENCANA bagian 6): id dikenal, status sah,
 * bukti berupa kutipan nyata dari tulisan pengguna. Yang melanggar diturunkan menjadi "tidak yakin".
 */
export function validasiHasil(entriAi, mentah, input) {
  const isian = [input.teori, input.konsep, input.objek, input.latar, input.teoretis, input.praktis, input.sistematika, input.tinjauan, input.landasan, input.kerangka];
  const korpus = [...butirTerisi(input.rumusan), ...butirTerisi(input.tujuan)].map((b) => b.teks).concat(isian)
    .map(rapat).filter(Boolean);
  const sah = new Set(Object.values(STATUS_AI));
  const peta = new Map((Array.isArray(mentah) ? mentah : []).map((h) => [h?.id, h]));
  // Model kadang menyalin label dari prompt ("Rumusan 1: ...", "[P2] ..."); label bukan bagian tulisan mahasiswa.
  const tanpaLabel = (b) => rapat(b).replace(/^(?:\[P\d+\]|(?:rumusan|tujuan|paragraf)\s*\d+\s*:|manfaat\s+(?:teoretis|praktis)\s*:)\s*/i, '').trim();
  return entriAi.map((e) => {
    const h = peta.get(e.id);
    const dasar = { id: e.id, bagian: e.bagian, jenis: e.jenis, kriteria: e.kriteria, tingkat: e.tingkat, rujukan: e.rujukan };
    if (!h || !sah.has(h.status)) {
      return { ...dasar, status: STATUS_AI.TIDAK_YAKIN, bukti: [], pesan: 'Keluaran pemeriksaan makna tidak sesuai bentuk yang diharapkan.' };
    }
    const bukti = (Array.isArray(h.bukti) ? h.bukti : [])
      .filter((b) => typeof b === 'string')
      .map(tanpaLabel)
      .filter((b) => b && korpus.some((k) => k.includes(b)));
    return { ...dasar, status: h.status, bukti, pesan: String(h.alasan ?? '') };
  });
}

/** Jalankan pemeriksaan makna untuk entri berjenis AI. Pelaksana dapat diganti. */
export async function periksaMakna(rubrik, input, pelaksana = pelaksanaTiruan) {
  const entriAi = rubrik.filter((e) => e.jenis === 'ai');
  let mentah = [];
  let sisa;
  let penggunaan;
  let galat = null;
  try {
    const r = await pelaksana(entriAi, input);
    if (Array.isArray(r)) mentah = r;
    else { mentah = r.hasil ?? []; sisa = r.sisa; penggunaan = r.penggunaan; }
  } catch (e) {
    galat = { pesan: e?.message || 'Pemeriksaan makna gagal.', status: e?.status };
  }
  const hasil = validasiHasil(entriAi, mentah, input);
  if (galat) hasil.forEach((h) => { h.pesan = galat.pesan; });
  return Object.assign(hasil, { sisa, penggunaan, galat });
}

export { STATUS };
