// Pemeriksaan berbasis aturan (tanpa AI, tanpa jaringan).
// Aturan bersumber dari Panduan Struktur Penulisan Skripsi (model analisis-teoretis); lihat rubrik/*.json.

export const STATUS = Object.freeze({
  TERPENUHI: 'terpenuhi',
  BELUM: 'belum',
  PERINGATAN: 'peringatan',
  TIDAK_DAPAT: 'tidak_dapat_diperiksa',
  BELUM_DIJALANKAN: 'belum_dijalankan'
});

const KATA_TANYA_ANALITIS = ['bagaimana', 'mengapa'];
// Bentuk bagaimanakah/mengapakah dianggap setara kata tanya analitis (lihat daftar pertanyaan).
const VARIAN_ANALITIS = ['bagaimanakah', 'mengapakah'];
const KATA_KERJA_ANALITIS = ['menganalisis', 'menginterpretasikan'];

/** Buang penomoran/label di awal ("1.", "2)", "RM 1:", "Tujuan 2 -") dan kutip pembuka. */
export function bersihkan(teks) {
  let t = String(teks ?? '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(?:(?:rumusan(?:\s+masalah)?|rm|tujuan|t)\s*\d+\s*[:.)\-–]?\s*|\d+\s*[.)]\s*|[-–•*]\s+)/i, '');
  t = t.replace(/^["“”'‘’(\[]+/, '').trim();
  return t;
}

/** Daftar isian -> daftar butir yang terisi, dengan nomor urut asli (mulai 1). */
export function butirTerisi(daftar) {
  return (daftar ?? [])
    .map((teks, i) => ({ nomor: i + 1, asli: String(teks ?? '').trim(), teks: bersihkan(teks) }))
    .filter((b) => b.teks.length > 0);
}

export function kataPertama(teks) {
  const m = bersihkan(teks).match(/^[\p{L}\p{M}'’-]+/u);
  return m ? m[0].toLowerCase().replace(/['’-]+$/, '') : '';
}

function mengandungKata(teks, kata) {
  const re = new RegExp(`(^|[^\p{L}])${kata}(?![\p{L}])`, 'iu');
  return re.test(teks);
}

function hasil(status, extra = {}) {
  return { status, nomor: [], bukti: [], data: {}, ...extra };
}

const kosong = (apa) => hasil(STATUS.TIDAK_DAPAT, { data: { alasan: `Belum ada ${apa} yang diisi.` } });

/** B1: paling banyak dua rumusan. */
export function periksaB1(rumusan) {
  const b = butirTerisi(rumusan);
  if (!b.length) return kosong('rumusan masalah');
  const data = { jumlah: b.length };
  if (b.length <= 2) return hasil(STATUS.TERPENUHI, { data });
  return hasil(STATUS.BELUM, { nomor: b.slice(2).map((x) => x.nomor), bukti: b.slice(2).map((x) => x.teks), data });
}

/** B2: diawali "Bagaimana" atau "Mengapa". */
export function periksaB2(rumusan) {
  const b = butirTerisi(rumusan);
  if (!b.length) return kosong('rumusan masalah');
  const gagal = b.filter((x) => {
    const k = kataPertama(x.teks);
    return !KATA_TANYA_ANALITIS.includes(k) && !VARIAN_ANALITIS.includes(k);
  });
  if (!gagal.length) return hasil(STATUS.TERPENUHI);
  return hasil(STATUS.BELUM, { nomor: gagal.map((x) => x.nomor), bukti: gagal.map((x) => x.teks) });
}

/** B3: tidak diawali "Apakah"; kata tanya berakhiran -kah lain hanya peringatan. */
export function periksaB3(rumusan) {
  const b = butirTerisi(rumusan);
  if (!b.length) return kosong('rumusan masalah');
  const apakah = b.filter((x) => kataPertama(x.teks) === 'apakah');
  if (apakah.length) {
    return hasil(STATUS.BELUM, { nomor: apakah.map((x) => x.nomor), bukti: apakah.map((x) => x.teks) });
  }
  const kah = b.filter((x) => {
    const k = kataPertama(x.teks);
    return k.length > 4 && k.endsWith('kah') && !VARIAN_ANALITIS.includes(k);
  });
  if (kah.length) {
    return hasil(STATUS.PERINGATAN, {
      nomor: kah.map((x) => x.nomor),
      bukti: kah.map((x) => x.teks),
      data: { kata: [...new Set(kah.map((x) => kataPertama(x.teks)))].join(', ') }
    });
  }
  return hasil(STATUS.TERPENUHI);
}

/** C1: jumlah tujuan sama dengan jumlah rumusan. */
export function periksaC1(rumusan, tujuan) {
  const r = butirTerisi(rumusan);
  const t = butirTerisi(tujuan);
  if (!r.length) return kosong('rumusan masalah');
  if (!t.length) return kosong('tujuan penelitian');
  const data = { jumlah_rumusan: r.length, jumlah_tujuan: t.length };
  return r.length === t.length ? hasil(STATUS.TERPENUHI, { data }) : hasil(STATUS.BELUM, { data });
}

/** C2: memakai "menganalisis"/"menginterpretasikan"; tanpa "untuk mengetahui". */
export function periksaC2(tujuan) {
  const t = butirTerisi(tujuan);
  if (!t.length) return kosong('tujuan penelitian');
  const gagal = t.filter((x) => {
    const ada = KATA_KERJA_ANALITIS.some((k) => mengandungKata(x.teks, k));
    const mengetahui = /(^|[^\p{L}])untuk\s+mengetahui(?![\p{L}])/iu.test(x.teks);
    return !ada || mengetahui;
  });
  if (!gagal.length) return hasil(STATUS.TERPENUHI);
  return hasil(STATUS.BELUM, { nomor: gagal.map((x) => x.nomor), bukti: gagal.map((x) => x.teks) });
}

const POLA_METODE = /teknik pengumpulan data|kisi-kisi|triangulasi|purposive|snowball|wawancara mendalam|observasi (?:non-?)?partisipan|instrumen penelitian|sumber data (?:primer|sekunder)|analisis data (?:dilakukan|akan)/i;
const POLA_DAFTAR_PENELITIAN = /penelitian (?:pertama|kedua|ketiga|keempat)\s+(?:oleh|dari|dilakukan)/i;

/** A7: peringatan bila ada kalimat yang tampak memuat detail metode atau daftar penelitian terdahulu. */
export function periksaA7(latar) {
  const teks = String(latar ?? '').replace(/\s+/g, ' ').trim();
  if (!teks) return kosong('latar belakang');
  const kalimat = teks.split(/(?<=[.!?])\s+/);
  const curiga = kalimat.filter((k) => POLA_METODE.test(k) || POLA_DAFTAR_PENELITIAN.test(k));
  if (!curiga.length) return hasil(STATUS.TERPENUHI);
  return hasil(STATUS.PERINGATAN, { bukti: curiga.slice(0, 3) });
}

export const PEMERIKSA = {
  A7: (i) => periksaA7(i.latar),
  B1: (i) => periksaB1(i.rumusan),
  B2: (i) => periksaB2(i.rumusan),
  B3: (i) => periksaB3(i.rumusan),
  C1: (i) => periksaC1(i.rumusan, i.tujuan),
  C2: (i) => periksaC2(i.tujuan)
};

export function gabungNomor(nomor) {
  if (nomor.length <= 1) return nomor.join('');
  if (nomor.length === 2) return `${nomor[0]} dan ${nomor[1]}`;
  return `${nomor.slice(0, -1).join(', ')}, dan ${nomor[nomor.length - 1]}`;
}

export function isiTemplat(templat, h) {
  const nilai = { n: gabungNomor(h.nomor), ...h.data };
  return String(templat ?? '').replace(/\{(\w+)\}/g, (_, k) => (nilai[k] ?? `{${k}}`));
}

/** Jalankan seluruh rubrik; entri berjenis AI ditandai "belum dijalankan". */
export function periksaSemua(rubrik, input) {
  return rubrik.map((entri) => {
    const dasar = { id: entri.id, bagian: entri.bagian, jenis: entri.jenis, kriteria: entri.kriteria, tingkat: entri.tingkat, rujukan: entri.rujukan };
    if (entri.jenis !== 'aturan') {
      return { ...dasar, status: STATUS.BELUM_DIJALANKAN, bukti: [], pesan: 'Pemeriksaan makna oleh AI belum dijalankan.' };
    }
    const fn = PEMERIKSA[entri.id];
    if (!fn) {
      return { ...dasar, status: STATUS.TIDAK_DAPAT, bukti: [], pesan: `Belum ada pemeriksa untuk kriteria ${entri.id}.` };
    }
    const h = fn(input);
    let pesan = '';
    if (h.status === STATUS.BELUM) pesan = isiTemplat(entri.pesan_gagal, h);
    else if (h.status === STATUS.PERINGATAN) pesan = isiTemplat(entri.pesan_peringatan ?? entri.pesan_gagal, h);
    else if (h.status === STATUS.TIDAK_DAPAT) pesan = h.data.alasan;
    else pesan = 'Kriteria ini terpenuhi.';
    return { ...dasar, status: h.status, bukti: h.bukti, pesan };
  });
}
