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

const KLISE_GAGAL = /menambah\s+wawasan/i;
const KLISE_PERINGATAN = /menambah\s+(?:pengetahuan|ilmu|referensi)|bermanfaat\s+bagi\s+(?:semua|banyak)\s+pihak/i;
const kalimatDari = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
const terisi = (t) => String(t ?? '').trim().length > 0;

/** D1: manfaat teoretis dan manfaat praktis keduanya ada. */
export function periksaD1(teoretis, praktis) {
  if (!terisi(teoretis) && !terisi(praktis)) return kosong('manfaat penelitian');
  const kurang = [];
  if (!terisi(teoretis)) kurang.push('teoretis');
  if (!terisi(praktis)) kurang.push('praktis');
  return kurang.length ? hasil(STATUS.BELUM, { data: { kurang: kurang.join(' dan ') } }) : hasil(STATUS.TERPENUHI);
}

/** D2: "menambah wawasan" gagal; frasa klise serupa hanya peringatan. */
export function periksaD2(teoretis, praktis) {
  const kalimat = [...kalimatDari(teoretis), ...kalimatDari(praktis)];
  if (!kalimat.length) return kosong('manfaat penelitian');
  const gagal = kalimat.filter((k) => KLISE_GAGAL.test(k));
  if (gagal.length) return hasil(STATUS.BELUM, { bukti: gagal.slice(0, 3) });
  const waspada = kalimat.filter((k) => KLISE_PERINGATAN.test(k));
  if (waspada.length) return hasil(STATUS.PERINGATAN, { bukti: waspada.slice(0, 3) });
  return hasil(STATUS.TERPENUHI);
}

const KEPALA_BAB = /^\s*bab\s+(?:[ivxlc]+|\d+)\b/i;

/** Pecah sistematika menjadi butir per bab: [{ label: 'I', teks }]. Teks sebelum "Bab …" pertama diabaikan. */
export function pecahBab(sistematika) {
  const t = String(sistematika ?? '').replace(/\r/g, '').trim();
  return t.split(/(?=^[ \t]*bab\s+(?:[ivxlc]+|\d+)\b)/im)
    .filter((b) => KEPALA_BAB.test(b))
    .map((b) => ({ label: b.match(/^\s*bab\s+([ivxlc]+|\d+)\b/i)[1].toUpperCase(), teks: b.replace(/\s+/g, ' ').trim() }));
}

const alasanTanpaBab = 'Tulis sistematika per bab, masing-masing diawali "Bab I", "Bab II", dan seterusnya.';

/** H1: tiap bab memakai pola "Bab … berisi …". */
export function periksaH1(sistematika) {
  if (!terisi(sistematika)) return kosong('sistematika penulisan');
  const bab = pecahBab(sistematika);
  if (!bab.length) return hasil(STATUS.TIDAK_DAPAT, { data: { alasan: alasanTanpaBab } });
  const gagal = bab.filter((b) => !/\bberisi\b/i.test(b.teks));
  if (!gagal.length) return hasil(STATUS.TERPENUHI);
  return hasil(STATUS.BELUM, { nomor: gagal.map((b) => b.label), bukti: gagal.map((b) => b.teks.slice(0, 160)) });
}

/** H2: peringatan bila uraian bab kurang dari 12 kata setelah judul bab. */
export function periksaH2(sistematika) {
  if (!terisi(sistematika)) return kosong('sistematika penulisan');
  const bab = pecahBab(sistematika);
  if (!bab.length) return hasil(STATUS.TIDAK_DAPAT, { data: { alasan: alasanTanpaBab } });
  const singkat = bab.filter((b) => b.teks.replace(/^\s*bab\s+(?:[ivxlc]+|\d+)\s*[:.\-–]?\s*/i, '').split(/\s+/).filter(Boolean).length < 12);
  if (!singkat.length) return hasil(STATUS.TERPENUHI);
  return hasil(STATUS.PERINGATAN, { nomor: singkat.map((b) => b.label), bukti: singkat.map((b) => b.teks.slice(0, 160)) });
}

const POLA_URUT = /penelitian\s+(?:pertama|kedua|ketiga|keempat|kelima)\b/i;
const paragrafDari = (t) => String(t ?? '').split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

/** E1: dilarang mendaftar penelitian berurutan ("Penelitian pertama oleh A..., kedua oleh B..."). */
export function periksaE1(tinjauan) {
  const kalimat = kalimatDari(tinjauan);
  if (!kalimat.length) return kosong('tinjauan penelitian terdahulu');
  const daftar = kalimat.filter((k) => POLA_URUT.test(k));
  return daftar.length ? hasil(STATUS.BELUM, { bukti: daftar.slice(0, 3) }) : hasil(STATUS.TERPENUHI);
}

/** E2: rumus CAP-G meminta tiga paragraf; selain itu peringatan (hanya menghitung paragraf). */
export function periksaE2(tinjauan) {
  const jumlah = paragrafDari(tinjauan).length;
  if (!jumlah) return kosong('tinjauan penelitian terdahulu');
  return jumlah === 3 ? hasil(STATUS.TERPENUHI, { data: { jumlah } }) : hasil(STATUS.PERINGATAN, { data: { jumlah } });
}

const POLA_BIOGRAFI = /\b(?:lahir|dilahirkan)\s+(?:di|pada|tahun)\b|\bbersekolah\b|\bmenempuh\s+pendidikan\b|\b(?:wafat|meninggal)\s+(?:di|pada|tahun)\b/i;

/** F1: peringatan bila ada kalimat biografis (kelahiran, pendidikan, wafat). */
export function periksaF1(landasan) {
  const kalimat = kalimatDari(landasan);
  if (!kalimat.length) return kosong('landasan teori');
  const bio = kalimat.filter((k) => POLA_BIOGRAFI.test(k));
  return bio.length ? hasil(STATUS.PERINGATAN, { bukti: bio.slice(0, 3) }) : hasil(STATUS.TERPENUHI);
}

const normal = (t) => String(t ?? '').toLowerCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();

/** Pecah isian konsep teori: pemisah koma, titik koma, atau baris baru. */
export function pecahKonsep(konsep) {
  return String(konsep ?? '').split(/[,;\n]+/).map((k) => k.trim()).filter(Boolean);
}

/** F2: tiap konsep di rumusan harus ditemukan (istilah utama atau alias dalam kurung) di landasan teori. */
export function periksaF2(konsep, landasan) {
  const daftar = pecahKonsep(konsep);
  if (!daftar.length) return hasil(STATUS.TIDAK_DAPAT, { data: { alasan: 'Isi konsep teori di rumusan terlebih dahulu.' } });
  if (!terisi(landasan)) return kosong('landasan teori');
  const isi = normal(landasan);
  const hilang = daftar.filter((k) => {
    const utama = k.replace(/\(.*?\)/g, '').trim();
    const alias = (k.match(/\(([^)]+)\)/) ?? [])[1];
    return ![utama, alias].filter(Boolean).some((c) => isi.includes(normal(c)));
  });
  return hilang.length ? hasil(STATUS.PERINGATAN, { nomor: hilang }) : hasil(STATUS.TERPENUHI);
}

export const PEMERIKSA = {
  E1: (i) => periksaE1(i.tinjauan),
  E2: (i) => periksaE2(i.tinjauan),
  F1: (i) => periksaF1(i.landasan),
  F2: (i) => periksaF2(i.konsep, i.landasan),
  D1: (i) => periksaD1(i.teoretis, i.praktis),
  D2: (i) => periksaD2(i.teoretis, i.praktis),
  H1: (i) => periksaH1(i.sistematika),
  H2: (i) => periksaH2(i.sistematika),
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
