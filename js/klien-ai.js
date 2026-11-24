// Klien pemeriksaan makna (jenis AI).
// Dua pelaksana dengan antarmuka sama: `pelaksanaTiruan` (tanpa jaringan) dan `buatPelaksanaWorker` (lewat Worker perantara).
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
  C3: { status: 'tidak_yakin', sumber: 'tujuan', alasan: 'Data tiruan: kesesuaian tujuan dengan rumusan belum dapat dipastikan.' }
};

/** Pelaksana tiruan: hasil tetap, bukti diambil dari tulisan pengguna agar kontrak "bukti = kutipan" ikut teruji. */
export async function pelaksanaTiruan(entriAi, input) {
  return entriAi.map((e) => {
    const s = SKENARIO_TIRUAN[e.id] ?? { status: 'tidak_yakin', sumber: 'rumusan', alasan: 'Data tiruan: tidak ada skenario.' };
    const butir = butirTerisi(input[s.sumber]);
    return {
      id: e.id,
      status: s.status,
      bukti: butir.length ? [butir[0].teks] : [],
      alasan: s.alasan,
      rujukan: e.rujukan
    };
  });
}

/** Pelaksana sungguhan: memanggil Worker perantara. Hanya mengirim isian pengguna, kode akses, dan id perangkat acak. */
export function buatPelaksanaWorker({ url, kodeAkses, idPerangkat, fetchFn = (...a) => fetch(...a) }) {
  return async (entriAi, input) => {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kode-Akses': kodeAkses, 'X-Id-Perangkat': idPerangkat },
      body: JSON.stringify({ rumusan: input.rumusan, tujuan: input.tujuan, teori: input.teori, konsep: input.konsep, objek: input.objek })
    });
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
  const isian = [input.teori, input.konsep, input.objek].map((t) => String(t ?? '').trim()).filter(Boolean);
  const korpus = [...butirTerisi(input.rumusan), ...butirTerisi(input.tujuan)].map((b) => b.teks).concat(isian);
  const sah = new Set(Object.values(STATUS_AI));
  const peta = new Map((Array.isArray(mentah) ? mentah : []).map((h) => [h?.id, h]));
  return entriAi.map((e) => {
    const h = peta.get(e.id);
    const dasar = { id: e.id, bagian: e.bagian, jenis: e.jenis, kriteria: e.kriteria, tingkat: e.tingkat, rujukan: e.rujukan };
    if (!h || !sah.has(h.status)) {
      return { ...dasar, status: STATUS_AI.TIDAK_YAKIN, bukti: [], pesan: 'Keluaran pemeriksaan makna tidak sesuai bentuk yang diharapkan.' };
    }
    // Model kadang menyalin label dari prompt ("Rumusan 1: ..."); label bukan bagian tulisan mahasiswa.
    const tanpaLabel = (b) => b.replace(/^\s*(?:rumusan|tujuan)\s*\d+\s*:\s*/i, '').trim();
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
