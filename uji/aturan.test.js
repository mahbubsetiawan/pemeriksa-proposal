import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS, bersihkan, kataPertama, pecahBab, periksaA7, periksaD1, periksaD2, periksaE1, periksaF1, periksaF2, pecahKonsep, periksaG1, periksaG2, periksaG3, periksaG4, periksaG5, periksaG6, periksaG7, periksaK1, periksaK2, periksaK3, periksaK4, periksaK5, periksaH1, periksaH2, periksaH3, periksaH4, periksaB1, periksaB2, periksaB3, periksaC1, periksaC2, periksaSemua
} from '../js/aturan.js';

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const RUBRIK = ['A-latar', 'B-rumusan', 'C-tujuan', 'D-manfaat', 'E-tinjauan', 'F-landasan', 'G-metode', 'H-sistematika', 'K-koherensi'].flatMap((n) => baca(`../rubrik/${n}.json`));

// Contoh benar dari Panduan Bab I.B dan I.C (kasus Kungkum Pengging - Sartre).
const RM_BENAR = [
  'Bagaimana konstruksi kebebasan radikal dan kesadaran otentik para pelaku Tradisi Kungkum di Umbul Pengging?',
  'Bagaimana dinamika itikad buruk (bad faith) dalam komodifikasi spiritual para pelaku Tradisi Kungkum di Umbul Pengging?'
];
const T_BENAR = [
  'Untuk menganalisis konstruksi kebebasan radikal dan kesadaran otentik pelaku Tradisi Kungkum di Umbul Pengging melalui lensa eksistensialisme Jean-Paul Sartre.',
  'Untuk menginterpretasikan dinamika itikad buruk (bad faith) dalam komodifikasi spiritual para pelaku Tradisi Kungkum di Umbul Pengging.'
];

test('pembersihan penomoran dan kata pertama', () => {
  assert.equal(bersihkan('1. Bagaimana x?'), 'Bagaimana x?');
  assert.equal(bersihkan('RM 2: Mengapa y?'), 'Mengapa y?');
  assert.equal(kataPertama('  “Apakah a?'), 'apakah');
});

test('B1: dua rumusan lolos, tiga gagal, kosong tidak dapat diperiksa', () => {
  assert.equal(periksaB1(RM_BENAR).status, STATUS.TERPENUHI);
  assert.equal(periksaB1(['Bagaimana a?']).status, STATUS.TERPENUHI);
  const tiga = periksaB1([...RM_BENAR, 'Mengapa akal terbatas dalam Misykat al-Anwar?']);
  assert.equal(tiga.status, STATUS.BELUM);
  assert.deepEqual(tiga.nomor, [3]);
  assert.equal(tiga.data.jumlah, 3);
  assert.equal(periksaB1(['', '  ']).status, STATUS.TIDAK_DAPAT);
});

test('B1: baris kosong di tengah tidak dihitung', () => {
  assert.equal(periksaB1(['Bagaimana a?', '', 'Mengapa b?']).status, STATUS.TERPENUHI);
});

test('B2: Bagaimana/Mengapa lolos; kata tanya lain gagal', () => {
  assert.equal(periksaB2(RM_BENAR).status, STATUS.TERPENUHI);
  assert.equal(periksaB2(['mengapa a?']).status, STATUS.TERPENUHI);
  assert.equal(periksaB2(['1. Bagaimana a?']).status, STATUS.TERPENUHI);
  const r = periksaB2(['Bagaimana a?', 'Siapa tokoh yang membahas akal?']);
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.nomor, [2]);
  assert.equal(periksaB2(['Dalam Misykat al-Anwar, bagaimana akal dibahas?']).status, STATUS.BELUM);
});

test('B2: "Apakah" dan "Adakah" gagal', () => {
  assert.equal(periksaB2(['Apakah al-Ghazali meninggalkan akal?']).status, STATUS.BELUM);
  assert.equal(periksaB2(['Adakah peran akal dalam Misykat al-Anwar?']).status, STATUS.BELUM);
});

test('B3: "Apakah" gagal', () => {
  const r = periksaB3(['Apakah al-Ghazali meninggalkan akal dalam Misykat al-Anwar?']);
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.nomor, [1]);
  assert.equal(periksaB3(['apakah tahlilan bid\'ah?']).status, STATUS.BELUM);
});

test('B3: "Adakah" dan -kah lain hanya peringatan', () => {
  const r = periksaB3(['Adakah peran akal dalam Misykat al-Anwar?']);
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.equal(r.data.kata, 'adakah');
  assert.equal(periksaB3(['Bisakah akal mencapai hakikat?']).status, STATUS.PERINGATAN);
});

test('B3: rumusan benar lolos, termasuk Bagaimanakah dan kata "apakah" di tengah', () => {
  assert.equal(periksaB3(RM_BENAR).status, STATUS.TERPENUHI);
  assert.equal(periksaB3(['Bagaimanakah akal dibahas?']).status, STATUS.TERPENUHI);
  assert.equal(periksaB3(['Bagaimana akal dibahas, dan apakah ia unggul?']).status, STATUS.TERPENUHI);
});

test('C1: jumlah tujuan sama dengan rumusan', () => {
  assert.equal(periksaC1(RM_BENAR, T_BENAR).status, STATUS.TERPENUHI);
  const r = periksaC1(RM_BENAR, [T_BENAR[0]]);
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.data, { jumlah_rumusan: 2, jumlah_tujuan: 1 });
  assert.equal(periksaC1([...RM_BENAR, 'Mengapa x?'], T_BENAR).status, STATUS.BELUM);
  assert.equal(periksaC1(RM_BENAR, []).status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaC1([], T_BENAR).status, STATUS.TIDAK_DAPAT);
});

test('C2: menganalisis/menginterpretasikan lolos', () => {
  assert.equal(periksaC2(T_BENAR).status, STATUS.TERPENUHI);
});

test('C2: "untuk mengetahui" gagal', () => {
  const r = periksaC2([T_BENAR[0], 'Untuk mengetahui validitas pengetahuan akal dalam Misykat al-Anwar.']);
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.nomor, [2]);
});

test('C2: tanpa kata kerja analitis gagal; kata menempel tidak dihitung', () => {
  assert.equal(periksaC2(['Untuk mendeskripsikan akal dalam Misykat al-Anwar.']).status, STATUS.BELUM);
  assert.equal(periksaC2(['Tujuan penelitian ini adalah analisis akal.']).status, STATUS.BELUM);
});

test('C2: "untuk mengetahui" bersama "menganalisis" tetap gagal', () => {
  assert.equal(periksaC2(['Untuk mengetahui dan menganalisis akal dalam Misykat al-Anwar.']).status, STATUS.BELUM);
});

test('periksaSemua: pesan terisi dan jenis AI belum dijalankan', () => {
  const hasil = periksaSemua(RUBRIK, {
    rumusan: ['Apakah al-Ghazali meninggalkan akal?', RM_BENAR[0], 'Mengapa x?'],
    tujuan: ['Untuk mengetahui akal.']
  });
  const per = Object.fromEntries(hasil.map((h) => [h.id, h]));
  assert.equal(per.B1.status, STATUS.BELUM);
  assert.match(per.B1.pesan, /3 rumusan/);
  assert.match(per.B3.pesan, /nomor 1 /);
  assert.match(per.B2.pesan, /nomor 1 /);
  assert.equal(per.C1.status, STATUS.BELUM);
  assert.match(per.C1.pesan, /1 tujuan untuk 3 rumusan/);
  for (const id of ["B4", "B5", "B6", "C3"]) assert.equal(per[id].status, STATUS.BELUM_DIJALANKAN);
  assert.ok(hasil.every((h) => !/\{\w+\}/.test(h.pesan)));
});

test('periksaSemua: contoh benar dari panduan lolos semua kriteria aturan', () => {
  const hasil = periksaSemua(RUBRIK.filter((e) => ['B', 'C'].includes(e.bagian)), { rumusan: RM_BENAR, tujuan: T_BENAR });
  for (const h of hasil.filter((x) => x.jenis === 'aturan')) assert.equal(h.status, STATUS.TERPENUHI, h.id);
});

test('rubrik: bentuk entri dan rujukan panduan', () => {
  const ids = new Set();
  for (const e of RUBRIK) {
    for (const k of ['id', 'bagian', 'jenis', 'kriteria', 'tingkat', 'rujukan', 'pesan_gagal', 'dasar']) {
      assert.ok(e[k], `${e.id} tanpa ${k}`);
    }
    assert.match(e.rujukan, /^Panduan Bab (?:I\.[A-E]|II\.[A-C]|III(?:\.[A-E])?)$/);
    assert.ok(e.bagian_panduan);
    assert.ok(['aturan', 'ai'].includes(e.jenis));
    assert.ok(!ids.has(e.id));
    ids.add(e.id);
  }
});

// Contoh latar belakang benar dari panduan Bab I.A (kasus Kungkum Pengging - Sartre).
const LATAR_BENAR = [
  'Di tengah arus modernisasi dan mekanisasi kehidupan perkotaan, manusia sering kali mengalami krisis otentisitas dan keterasingan (alienasi), yang melahirkan kebutuhan ruang spiritual untuk melepaskan diri dari tekanan rutinitas.',
  'Dalam konteks tersebut, Tradisi Kungkum di Umbul Pengging bertahan bukan sekadar sebagai pelestarian budaya, melainkan memperlihatkan anomali di mana ruang sakral tersebut justru bergeser menjadi komoditas spiritual.',
  'Untuk membedah motivasi dan pergulatan batin pelaku tradisi ini, penelitian menggunakan perspektif Eksistensialisme Jean-Paul Sartre, khususnya mengenai konsep kebebasan radikal, otentisitas, dan bad faith (itikad buruk).',
  'Meskipun studi antropologis dan sosiologis terdahulu telah banyak membahas aspek sejarah dan relasi sosial Tradisi Kungkum, belum ada studi yang membedah krisis kesadaran eksistensial individu di balik komodifikasi ritual tersebut.',
  'Oleh karena itu, penelitian ini bertujuan untuk mengungkap dinamika otentisitas dan konstruksi bad faith para pelaku ritual Kungkum.'
].join('\n\n');

test('A7: latar belakang benar dari panduan lolos', () => {
  assert.equal(periksaA7(LATAR_BENAR).status, STATUS.TERPENUHI);
});

test('A7: detail metode atau daftar penelitian menjadi peringatan dengan kutipan', () => {
  const r1 = periksaA7(LATAR_BENAR + ' Data dikumpulkan dengan teknik pengumpulan data berupa wawancara mendalam dan triangulasi.');
  assert.equal(r1.status, STATUS.PERINGATAN);
  assert.equal(r1.bukti.length, 1);
  assert.match(r1.bukti[0], /triangulasi/);
  const r2 = periksaA7('Penelitian pertama oleh A membahas sejarah. Penelitian kedua oleh B membahas relasi sosial.');
  assert.equal(r2.status, STATUS.PERINGATAN);
  assert.equal(periksaA7('   ').status, STATUS.TIDAK_DAPAT);
});

test('periksaSemua untuk bagian A: aturan A7 jalan, kriteria STARE belum dijalankan', () => {
  const hasil = periksaSemua(RUBRIK.filter((e) => e.bagian === 'A'), { latar: LATAR_BENAR });
  const per = Object.fromEntries(hasil.map((h) => [h.id, h]));
  assert.equal(per.A7.status, STATUS.TERPENUHI);
  for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']) assert.equal(per[id].status, STATUS.BELUM_DIJALANKAN);
});

// Contoh benar dari panduan Bab I.D dan I.E (kasus Kungkum Pengging - Sartre).
const MANFAAT_T = 'Penelitian ini diharapkan berkontribusi dalam memperkaya khazanah kajian Akidah dan Filsafat Islam, khususnya memberikan pembacaan alternatif menggunakan pisau filsafat eksistensialisme terhadap fenomena budaya dan ritual keagamaan lokal kontemporer.';
const MANFAAT_P = 'Penelitian ini dapat dijadikan bahan refleksi bagi pengelola Umbul Pengging dan Dinas Pariwisata Kabupaten Boyolali dalam menyusun regulasi zonasi spiritual.';
const SISTEMATIKA_BENAR = [
  'Bab pertama berisi paparan latar belakang masalah mengenai pergeseran makna spiritualitas pada Tradisi Kungkum di Umbul Pengging, rumusan masalah, dan tujuan penelitian.',
  'Bab kedua berisi telaah penelitian terdahulu untuk memetakan celah akademik serta landasan teori eksistensialisme Jean-Paul Sartre sebagai pisau analisis.',
  'Bab kelima berisi simpulan teoretis yang menjawab pemaknaan eksistensial pelaku Tradisi Kungkum, keterbatasan penelitian, dan saran bagi peneliti selanjutnya.'
].join('\n\n');
const SISTEMATIKA_LAMA = [
  'BAB I: PENDAHULUAN. Bab ini berisi paparan latar belakang masalah mengenai pergeseran makna spiritualitas pada Tradisi Kungkum di Umbul Pengging menggunakan formula STARE.',
  'BAB II: TINJAUAN PUSTAKA DAN LANDASAN TEORI. Bab ini berisi telaah penelitian terdahulu yang disusun dengan metode sintesis CAP-G serta landasan teori Sartre.'
].join('\n\n');

test('D1: manfaat teoretis dan praktis keduanya wajib ada', () => {
  assert.equal(periksaD1(MANFAAT_T, MANFAAT_P).status, STATUS.TERPENUHI);
  const r = periksaD1(MANFAAT_T, '  ');
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.data.kurang, 'praktis');
  assert.equal(periksaD1('', MANFAAT_P).data.kurang, 'teoretis');
  assert.equal(periksaD1('', '').status, STATUS.TIDAK_DAPAT);
});

test('D2: "menambah wawasan" gagal, frasa serupa peringatan, contoh panduan lolos', () => {
  assert.equal(periksaD2(MANFAAT_T, MANFAAT_P).status, STATUS.TERPENUHI);
  const r = periksaD2('Penelitian ini bermanfaat untuk menambah wawasan pembaca.', MANFAAT_P);
  assert.equal(r.status, STATUS.BELUM);
  assert.match(r.bukti[0], /menambah wawasan/);
  assert.equal(periksaD2(MANFAAT_T, 'Hasilnya menambah pengetahuan masyarakat.').status, STATUS.PERINGATAN);
  assert.equal(periksaD2('', '').status, STATUS.TIDAK_DAPAT);
});

test('pecahBab: memecah per bab bernomor kata, mengenali angka Romawi dan angka, dan tidak terkecoh "Bab ini"', () => {
  const bab = pecahBab('Pengantar singkat.\nBab pertama berisi latar belakang.\nBab ini juga memuat tujuan.\nBab kedua berisi teori.');
  assert.deepEqual(bab.map((b) => b.label), ['pertama', 'kedua']);
  assert.ok(bab.every((b) => b.kata));
  const lama = pecahBab('BAB I: PENDAHULUAN. Bab ini berisi x.\n\nBab 3 berisi metode.');
  assert.deepEqual(lama.map((b) => b.label), ['I', '3']);
  assert.ok(lama.every((b) => !b.kata));
  assert.deepEqual(pecahBab('Tanpa kepala bab sama sekali.'), []);
});

test('H1: pola "Bab ... berisi ..." pada contoh benar lolos; bab tanpa "berisi" gagal', () => {
  assert.equal(periksaH1(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const r = periksaH1(SISTEMATIKA_BENAR + '\n\nBab ketiga membahas jenis penelitian dan teknik pengumpulan data yang dipakai peneliti.');
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.nomor, ['ketiga']);
  assert.equal(periksaH1('Pendahuluan, teori, metode.').status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaH1('  ').status, STATUS.TIDAK_DAPAT);
});

test('H2: nomor bab dengan kata lolos; angka Romawi, angka, judul kapital, dan format judul gagal', () => {
  assert.equal(periksaH2(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const lama = periksaH2(SISTEMATIKA_LAMA);
  assert.equal(lama.status, STATUS.BELUM);
  assert.deepEqual(lama.nomor, ['I', 'II']);
  assert.equal(periksaH2('Bab 1 berisi latar belakang masalah dan rumusan masalah penelitian yang dikaji.').status, STATUS.BELUM);
  assert.equal(periksaH2('Bab pertama: Pendahuluan berisi latar belakang masalah dan rumusan masalah penelitian.').status, STATUS.BELUM);
  assert.equal(periksaH2('Bab pertama berisi PENDAHULUAN dan latar belakang masalah serta rumusan masalah penelitian.').status, STATUS.BELUM);
  assert.equal(periksaH2('Bab pertama berisi HASIL PENELITIAN dan pembahasan temuan lapangan secara menyeluruh.').status, STATUS.BELUM);
  assert.equal(periksaH2('Bab kedua berisi telaah pustaka, landasan teori Sartre, dan kerangka pemikiran penelitian ini.').status, STATUS.TERPENUHI);
  assert.equal(periksaH2('Pendahuluan saja.').status, STATUS.TIDAK_DAPAT);
});

test('H3: nama rumus (STARE, CAP-G, D-K-R) gagal; kata "rumus" atau "formula" peringatan; contoh benar lolos', () => {
  assert.equal(periksaH3(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const nama = periksaH3('Bab pertama berisi latar belakang dengan formula STARE dan rumusan masalah penelitian.');
  assert.equal(nama.status, STATUS.BELUM);
  assert.match(nama.bukti[0], /STARE/);
  assert.equal(periksaH3('Bab kedua berisi tinjauan yang disintesis dengan CAP-G dan landasan teori.').status, STATUS.BELUM);
  assert.equal(periksaH3('Bab kedua berisi landasan teori dengan sistematika D-K-R.').status, STATUS.BELUM);
  assert.equal(periksaH3('Bab ketiga berisi uraian yang mengikuti rumus penulisan tertentu.').status, STATUS.PERINGATAN);
  assert.equal(periksaH3('Bab ketiga berisi perumusan masalah dan formulasi tujuan.').status, STATUS.TERPENUHI);
  assert.equal(periksaH3('  ').status, STATUS.TIDAK_DAPAT);
});
test('H4: bab yang hanya berupa judul atau terlalu singkat menjadi peringatan', () => {
  assert.equal(periksaH4(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const r = periksaH4('Bab pertama berisi pendahuluan.\n\nBab kedua berisi landasan teori.\n\nBab ketiga berisi uraian metode penelitian lapangan beserta sumber data primer dan sekunder yang dipakai.');
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['pertama', 'kedua']);
});

test('periksaSemua bagian D dan H: aturan jalan, kriteria makna menunggu AI, pesan terisi', () => {
  const d = periksaSemua(RUBRIK.filter((e) => e.bagian === 'D'), { teoretis: 'Menambah wawasan pembaca.', praktis: '' });
  const pd = Object.fromEntries(d.map((h) => [h.id, h]));
  assert.equal(pd.D1.status, STATUS.BELUM);
  assert.match(pd.D1.pesan, /praktis/);
  assert.equal(pd.D2.status, STATUS.BELUM);
  assert.equal(pd.D3.status, STATUS.BELUM_DIJALANKAN);
  const benar = periksaSemua(RUBRIK.filter((e) => e.bagian === 'H'), { sistematika: SISTEMATIKA_BENAR });
  const pb = Object.fromEntries(benar.map((x) => [x.id, x]));
  for (const id of ['H1', 'H2', 'H3', 'H4']) assert.equal(pb[id].status, STATUS.TERPENUHI, id);
  for (const id of ['H5', 'H6', 'H7']) assert.equal(pb[id].status, STATUS.BELUM_DIJALANKAN, id);
  const lama = periksaSemua(RUBRIK.filter((e) => e.bagian === 'H'), { sistematika: SISTEMATIKA_LAMA });
  const pl = Object.fromEntries(lama.map((x) => [x.id, x]));
  assert.equal(pl.H2.status, STATUS.BELUM);
  assert.match(pl.H2.pesan, /Bab I dan II/);
  assert.equal(pl.H3.status, STATUS.BELUM);
  assert.ok([...d, ...benar, ...lama].every((x) => !/\{\w+\}/.test(x.pesan)));
});

// Contoh benar dari panduan Bab II.A (CAP-G) dan Bab II.B (D-K-R), kasus Kungkum Pengging - Sartre.
const TINJAUAN_BENAR = [
  'Secara tematik, literatur mengenai ritual air dan tradisi spiritual di Jawa dapat dikelompokkan ke dalam dua tren kajian utama. Tren pertama berfokus pada fungsi sosiologis-antropologis ritual, sedangkan tren kedua menyoroti aspek sinkretisme teologis mistisisme Jawa.',
  'Meskipun terdapat kesamaan dalam melihat ketahanan Tradisi Kungkum, terdapat perbedaan tajam dalam memaknai motivasi pelaku. Penelitian oleh Jurnal A (2024) mengklaim tekanan struktur mitos kolektif. Sebaliknya, studi oleh Jurnal B (2025) mendapati motif ekonomi.',
  'Di sinilah posisi penelitian ini berada untuk mengisi celah akademik. Melalui Teori Eksistensialisme Jean-Paul Sartre, penelitian ini membedah bagaimana pelaku mengonstruksi kesadaran dan kebebasan mereka.'
].join('\n\n');
const LANDASAN_BENAR = [
  'Eksistensialisme merupakan sebuah perspektif filsafat yang menegaskan bahwa "eksistensi mendahului esensi". Jean-Paul Sartre menempatkan manusia sebagai subjek yang "dikutuk untuk bebas".',
  'Secara operasional, terdapat tiga konsep pokok Sartre: (1) Being-in-itself vs Being-for-itself; (2) Kebebasan Radikal dan Pilihan; serta (3) Itikad Buruk (Bad Faith), yaitu saat aktor menyalahkan tradisi atas kegagalannya sendiri.',
  'Teori Sartre merupakan pisau bedah yang tajam untuk menganalisis Tradisi Kungkum di Pengging.'
].join('\n\n');
const KONSEP_F = 'kebebasan radikal, itikad buruk (bad faith), being-for-itself';

test('E1: sintesis lolos; daftar "Penelitian pertama oleh A..." gagal', () => {
  assert.equal(periksaE1(TINJAUAN_BENAR).status, STATUS.TERPENUHI);
  const r = periksaE1('Penelitian pertama oleh A membahas tahlilan. Penelitian kedua oleh B membahas kungkum.');
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.bukti.length, 2);
  assert.equal(periksaE1('   ').status, STATUS.TIDAK_DAPAT);
});

test('E: jumlah paragraf bebas, yang dinilai adalah unsur (tidak ada aturan hitung paragraf)', () => {
  const satuParagraf = 'Secara tematik literatur dikelompokkan menjadi dua tren. Meskipun sama-sama membahas kungkum, temuannya berbeda tajam. Di sinilah posisi penelitian ini mengisi celah akademik.';
  const empatParagraf = TINJAUAN_BENAR + '\n\nParagraf tambahan yang menegaskan posisi penelitian.';
  for (const t of [satuParagraf, TINJAUAN_BENAR, empatParagraf]) assert.equal(periksaE1(t).status, STATUS.TERPENUHI);
  const hasil = periksaSemua(RUBRIK.filter((x) => x.bagian === 'E'), { tinjauan: satuParagraf });
  assert.ok(!hasil.some((h) => h.status === STATUS.PERINGATAN));
  assert.deepEqual(hasil.map((h) => h.id), ['E1', 'E2', 'E3', 'E4', 'E5']);
});

test('F1: landasan tanpa biografi lolos; kalimat kelahiran atau pendidikan menjadi peringatan', () => {
  assert.equal(periksaF1(LANDASAN_BENAR).status, STATUS.TERPENUHI);
  const r = periksaF1(LANDASAN_BENAR + ' Sartre lahir di Paris pada tahun 1905 dan bersekolah di Lycée Henri IV.');
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.match(r.bukti[0], /lahir di Paris/);
  assert.equal(periksaF1('Kegagalan itu melahirkan kebutuhan ruang spiritual.').status, STATUS.TERPENUHI);
});

test('F2: tiap konsep di rumusan harus muncul di landasan; alias dalam kurung dan tanda hubung dimaklumi', () => {
  assert.deepEqual(pecahKonsep('a, b;c\nd'), ['a', 'b', 'c', 'd']);
  assert.equal(periksaF2(KONSEP_F, LANDASAN_BENAR).status, STATUS.TERPENUHI);
  const r = periksaF2(KONSEP_F + ', kesadaran otentik', LANDASAN_BENAR);
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['kesadaran otentik']);
  assert.equal(periksaF2('', LANDASAN_BENAR).status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaF2(KONSEP_F, '  ').status, STATUS.TIDAK_DAPAT);
});

test('periksaSemua bagian E dan F: pesan terisi, kriteria makna menunggu AI', () => {
  const e = periksaSemua(RUBRIK.filter((x) => x.bagian === 'E'), { tinjauan: 'Penelitian pertama oleh A membahas X.' });
  const pe = Object.fromEntries(e.map((h) => [h.id, h]));
  assert.equal(pe.E1.status, STATUS.BELUM);
  for (const id of ['E2', 'E3', 'E4', 'E5']) assert.equal(pe[id].status, STATUS.BELUM_DIJALANKAN, id);
  const f = periksaSemua(RUBRIK.filter((x) => x.bagian === 'F'), { konsep: KONSEP_F + ', kesadaran otentik', landasan: LANDASAN_BENAR });
  const pf = Object.fromEntries(f.map((h) => [h.id, h]));
  assert.equal(pf.F1.status, STATUS.TERPENUHI);
  assert.equal(pf.F2.status, STATUS.PERINGATAN);
  assert.match(pf.F2.pesan, /kesadaran otentik/);
  for (const id of ['F3', 'F4', 'F5', 'F6', 'F7']) assert.equal(pf[id].status, STATUS.BELUM_DIJALANKAN);
  assert.ok([...e, ...f].every((x) => !/\{\w+\}/.test(x.pesan)));
});

// Contoh benar dari panduan Bab III (kasus Kungkum Pengging - Sartre), disesuaikan ke bahasa rencana proposal.
const G_JENIS = 'Penelitian ini merupakan penelitian kualitatif lapangan (field research) dengan pendekatan filosofis-fenomenologis. Pendekatan ini dipilih karena peneliti akan mendalami fenomena sosial secara alami di lokasi Umbul Pengging.';
const G_SUMBER = '1. Data primer akan berupa transkrip wawancara mendalam dengan informan kunci serta catatan lapangan hasil observasi.\n2. Data sekunder akan berupa profil monografi dari Kantor Desa serta literatur teoretis mengenai eksistensialisme Sartre.';
const G_TEKNIK = 'Pengumpulan data akan dilakukan melalui observasi non-partisipan, wawancara mendalam, dan dokumentasi. Peneliti akan memedomani matriks kisi-kisi instrumen.';
const G_KISI = 'Fokus masalah (konsep) | Kategori analitik | Indikator | Sumber data | Teknik pengumpulan data\nKonstruksi kebebasan radikal | Kesadaran dan pilihan bebas subjek | Pilihan sadar subjek vs. rutinitas | Pelaku Kungkum | Wawancara, Observasi';
const G_ANALISIS = 'Analisis data akan dilakukan melalui tiga tahapan. Pertama, analisis deskriptif memaparkan temuan secara objektif. Kedua, analisis verifikatif (verstehen) menggali motif dari sudut pandang pelaku. Ketiga, analisis interpretatif membenturkan temuan dengan teori Sartre.';
const G_TRIANG = 'Peneliti akan menerapkan triangulasi sumber, yaitu membandingkan keterangan pelaku dengan keterangan Juru Kunci, serta triangulasi teknik, yaitu mengonfrontasi hasil wawancara dengan observasi dan dokumentasi.';
const G_BENAR = { jenis: G_JENIS, sumber: G_SUMBER, teknik: G_TEKNIK, kisi: G_KISI, analisis: G_ANALISIS, triangulasi: G_TRIANG };

test('G1: sumber data wajib menyebut data primer dan data sekunder', () => {
  assert.equal(periksaG1(G_SUMBER).status, STATUS.TERPENUHI);
  const r = periksaG1('Data primer berupa wawancara dengan lima informan kunci.');
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.data.kurang, 'data sekunder');
  assert.equal(periksaG1('Wawancara dan buku.').data.kurang, 'data primer dan data sekunder');
  assert.equal(periksaG1(' ').status, STATUS.TIDAK_DAPAT);
});

test('G2: tiga baris pertanyaan berderet menjadi peringatan; kisi-kisi dan narasi lolos', () => {
  assert.equal(periksaG2(G_TEKNIK, G_KISI).status, STATUS.TERPENUHI);
  const r = periksaG2('Pertanyaan wawancara:\n1. Mengapa Anda berkungkum?\n2. Sejak kapan Anda berkungkum?\n3. Apa yang Anda rasakan?', '');
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.equal(r.bukti.length, 3);
  assert.equal(periksaG2('Satu pertanyaan saja?\nDua pertanyaan?', '').status, STATUS.TERPENUHI);
  assert.equal(periksaG2('', '').status, STATUS.TIDAK_DAPAT);
});

test('G3: kisi-kisi harus menyebut kelima kolom', () => {
  assert.equal(periksaG3(G_KISI).status, STATUS.TERPENUHI);
  const r = periksaG3('Fokus masalah | Indikator | Sumber data');
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.match(r.data.kurang, /kategori analitik/);
  assert.match(r.data.kurang, /teknik pengumpulan data/);
  assert.equal(periksaG3('').status, STATUS.TIDAK_DAPAT);
});

test('G4 dan G5: tiga tahap analisis wajib; model Miles dan Huberman hanya peringatan', () => {
  assert.equal(periksaG4(G_ANALISIS).status, STATUS.TERPENUHI);
  const r = periksaG4('Analisis data akan memakai tahap deskriptif dan interpretatif.');
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.data.kurang, 'verstehen');
  assert.equal(periksaG4('Hanya analisis biasa.').data.kurang, 'deskriptif, verstehen, interpretatif');
  assert.equal(periksaG5(G_ANALISIS).status, STATUS.TERPENUHI);
  const m = periksaG5('Analisis data akan mengikuti model Miles dan Huberman: reduksi data, penyajian data, dan penarikan kesimpulan.');
  assert.equal(m.status, STATUS.PERINGATAN);
  assert.match(m.bukti[0], /Miles/);
});

test('G6: triangulasi sumber dan triangulasi teknik keduanya wajib disebut', () => {
  assert.equal(periksaG6(G_TRIANG).status, STATUS.TERPENUHI);
  const r = periksaG6('Peneliti akan menerapkan triangulasi sumber.');
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.data.kurang, 'triangulasi teknik');
  assert.equal(periksaG6('Data akan diuji keabsahannya.').data.kurang, 'triangulasi sumber dan triangulasi teknik');
});

test('G7: bahasa rencana lolos; bahasa laporan atau tanpa "akan" menjadi peringatan', () => {
  assert.equal(periksaG7(G_JENIS, G_SUMBER, G_TEKNIK, G_ANALISIS, G_TRIANG).status, STATUS.TERPENUHI);
  const laporan = periksaG7('Wawancara telah dilakukan terhadap lima informan kunci.', G_SUMBER);
  assert.equal(laporan.status, STATUS.PERINGATAN);
  assert.match(laporan.bukti[0], /telah dilakukan/);
  assert.equal(periksaG7('Penelitian ini bersifat kualitatif lapangan.').status, STATUS.PERINGATAN);
  assert.equal(periksaG7('', '').status, STATUS.TIDAK_DAPAT);
});

test('periksaSemua bagian G: contoh benar lolos semua aturan; contoh salah tertangkap; kriteria makna menunggu AI', () => {
  const benar = periksaSemua(RUBRIK.filter((e) => e.bagian === 'G'), G_BENAR);
  const pb = Object.fromEntries(benar.map((h) => [h.id, h]));
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']) assert.equal(pb[id].status, STATUS.TERPENUHI, id);
  for (const id of ['G8', 'G9', 'G10', 'G11', 'G12', 'G13']) assert.equal(pb[id].status, STATUS.BELUM_DIJALANKAN, id);
  const salah = periksaSemua(RUBRIK.filter((e) => e.bagian === 'G'), {
    jenis: 'Wawancara telah dilakukan.', sumber: 'Data primer berupa wawancara.', teknik: '', kisi: 'Indikator saja',
    analisis: 'Analisis memakai model Miles dan Huberman.', triangulasi: 'Triangulasi sumber.'
  });
  const ps = Object.fromEntries(salah.map((h) => [h.id, h]));
  assert.match(ps.G1.pesan, /^Data sekunder belum disebut/);
  assert.equal(ps.G3.status, STATUS.PERINGATAN);
  assert.equal(ps.G4.status, STATUS.BELUM);
  assert.equal(ps.G5.status, STATUS.PERINGATAN);
  assert.match(ps.G6.pesan, /triangulasi teknik/);
  assert.equal(ps.G7.status, STATUS.PERINGATAN);
  assert.ok([...benar, ...salah].every((x) => !/\{\w+\}/.test(x.pesan)));
});

// Satu proposal yang konsisten (kasus Kungkum Pengging - Sartre) untuk pemeriksaan koherensi.
const K_KONSEP = 'kebebasan radikal, itikad buruk (bad faith)';
const K_TEORI = 'Eksistensialisme Jean-Paul Sartre';
const K_OBJEK = 'Tradisi Kungkum di Umbul Pengging';
const K_RUMUSAN = ['Bagaimana konstruksi kebebasan radikal para pelaku Tradisi Kungkum di Umbul Pengging?', 'Bagaimana dinamika itikad buruk (bad faith) dalam komodifikasi spiritual pelaku Tradisi Kungkum?'];
const K_LATAR = 'Tradisi Kungkum di Umbul Pengging bergeser menjadi komoditas spiritual. Penelitian ini memakai perspektif Eksistensialisme Jean-Paul Sartre.';
const K_TINJAUAN = 'Belum ada studi yang membaca Tradisi Kungkum dengan Eksistensialisme Sartre.';
const K_LANDASAN = 'Eksistensialisme Sartre menekankan Kebebasan Radikal dan Itikad Buruk (Bad Faith) sebagai konsep pokok.';
const K_KERANGKA = 'Situation krisis otentisitas, Target Tradisi Kungkum, Approach Eksistensialisme Sartre dengan konsep kebebasan radikal dan bad faith.';
const K_KISI = 'Fokus masalah | Kategori analitik | Indikator\nKebebasan radikal pelaku | Pilihan sadar | Pelaku memilih berendam\nItikad buruk (bad faith) | Penyangkalan tanggung jawab | Pelaku menyalahkan takdir';
const K_BENAR = { latar: K_LATAR, teori: K_TEORI, konsep: K_KONSEP, objek: K_OBJEK, rumusan: K_RUMUSAN, tujuan: [], tinjauan: K_TINJAUAN, landasan: K_LANDASAN, kerangka: K_KERANGKA, kisi: K_KISI, sistematika: '' };

test('K1 sampai K3: konsep di rumusan, kisi-kisi, dan kerangka dicocokkan; alias dalam kurung dimaklumi', () => {
  assert.equal(periksaK1(K_KONSEP, K_RUMUSAN).status, STATUS.TERPENUHI);
  const r = periksaK1(K_KONSEP + ', kesadaran otentik', K_RUMUSAN);
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['kesadaran otentik']);
  assert.equal(periksaK2(K_KONSEP, K_KISI).status, STATUS.TERPENUHI);
  assert.deepEqual(periksaK2(K_KONSEP, 'Fokus masalah | Kategori analitik\nKebebasan radikal | Pilihan sadar').nomor, ['itikad buruk (bad faith)']);
  assert.equal(periksaK3(K_KONSEP, K_KERANGKA).status, STATUS.TERPENUHI);
  assert.equal(periksaK3(K_KONSEP, 'Alur tanpa konsep teori.').status, STATUS.PERINGATAN);
  assert.equal(periksaK1('', K_RUMUSAN).status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaK2(K_KONSEP, '  ').status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaK3(K_KONSEP, '').status, STATUS.TIDAK_DAPAT);
});

test('K4: nama teori harus muncul di tiap bagian yang sudah diisi; bagian kosong dilewati', () => {
  assert.equal(periksaK4(K_TEORI, { latar: K_LATAR, tinjauan: K_TINJAUAN, landasan: K_LANDASAN, kerangka: K_KERANGKA }).status, STATUS.TERPENUHI);
  const r = periksaK4(K_TEORI, { latar: K_LATAR, tinjauan: 'Studi terdahulu membahas ritual air di Jawa.', landasan: K_LANDASAN, kerangka: '' });
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['tinjauan terdahulu']);
  assert.equal(periksaK4('', { latar: K_LATAR }).status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaK4(K_TEORI, {}).status, STATUS.TIDAK_DAPAT);
});

test('K5: objek material harus muncul di latar belakang dan rumusan', () => {
  assert.equal(periksaK5(K_OBJEK, K_LATAR, K_RUMUSAN).status, STATUS.TERPENUHI);
  const r = periksaK5(K_OBJEK, K_LATAR, ['Bagaimana pandangan al-Ghazali tentang akal?']);
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['rumusan masalah']);
  assert.equal(periksaK5('', K_LATAR, K_RUMUSAN).status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaK5(K_OBJEK, '', []).status, STATUS.TIDAK_DAPAT);
});

test('periksaSemua bagian K: proposal konsisten lolos; isian sebagian tidak disalahkan; kriteria makna menunggu AI', () => {
  const rubrikK = RUBRIK.filter((e) => e.bagian === 'K');
  const penuh = Object.fromEntries(periksaSemua(rubrikK, K_BENAR).map((h) => [h.id, h]));
  for (const id of ['K1', 'K2', 'K3', 'K4', 'K5']) assert.equal(penuh[id].status, STATUS.TERPENUHI, id);
  for (const id of ['K6', 'K7', 'K8', 'K9', 'K10']) assert.equal(penuh[id].status, STATUS.BELUM_DIJALANKAN, id);
  const sebagian = periksaSemua(rubrikK, { latar: K_LATAR, teori: K_TEORI, konsep: K_KONSEP, objek: K_OBJEK, rumusan: K_RUMUSAN, tujuan: [] });
  const ps = Object.fromEntries(sebagian.map((h) => [h.id, h]));
  assert.equal(ps.K1.status, STATUS.TERPENUHI);
  assert.equal(ps.K2.status, STATUS.TIDAK_DAPAT);
  assert.match(ps.K2.pesan, /tab G/);
  assert.equal(ps.K3.status, STATUS.TIDAK_DAPAT);
  const salah = periksaSemua(rubrikK, { ...K_BENAR, konsep: K_KONSEP + ', kesadaran otentik', tinjauan: 'Studi ritual air di Jawa.' });
  const pz = Object.fromEntries(salah.map((h) => [h.id, h]));
  assert.match(pz.K2.pesan, /kesadaran otentik/);
  assert.match(pz.K4.pesan, /tinjauan terdahulu/);
  assert.ok([...periksaSemua(rubrikK, K_BENAR), ...sebagian, ...salah].every((x) => !/\{\w+\}/.test(x.pesan)));
});

test('C1: tujuan tanpa rumusan di tab B menunjuk ke tab B, bukan menyalahkan', () => {
  const r = periksaC1([], T_BENAR);
  assert.equal(r.status, STATUS.TIDAK_DAPAT);
  assert.match(r.data.alasan, /tab B/);
  const hasil = periksaSemua(RUBRIK.filter((e) => e.bagian === 'C'), { rumusan: [], tujuan: T_BENAR });
  const pc = Object.fromEntries(hasil.map((h) => [h.id, h]));
  assert.equal(pc.C1.status, STATUS.TIDAK_DAPAT);
  assert.match(pc.C1.pesan, /tab B/);
  assert.equal(pc.C2.status, STATUS.TERPENUHI);
  assert.equal(pc.C3.status, STATUS.BELUM_DIJALANKAN);
});

test('bagian B dan C terpisah: B hanya memuat B1-B6, C hanya C1-C3', () => {
  const idB = periksaSemua(RUBRIK.filter((e) => e.bagian === 'B'), { rumusan: RM_BENAR }).map((h) => h.id);
  const idC = periksaSemua(RUBRIK.filter((e) => e.bagian === 'C'), { rumusan: RM_BENAR, tujuan: T_BENAR }).map((h) => h.id);
  assert.deepEqual(idB, ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);
  assert.deepEqual(idC, ['C1', 'C2', 'C3']);
});

test('G4: penelitian pustaka menuntut analisis isi, bukan tiga tahap lapangan', () => {
  const pustaka = 'Penelitian ini menggunakan pendekatan kualitatif dengan jenis penelitian kepustakaan (library research).';
  const isi = 'Analisis data memakai metode deskriptif dan analisis isi kualitatif (qualitative content analysis).';
  assert.equal(periksaG4(isi, pustaka).status, STATUS.TERPENUHI);
  const r = periksaG4('Analisis data memakai metode deskriptif saja.', pustaka);
  assert.equal(r.status, STATUS.BELUM);
  assert.equal(r.data.kurang, 'analisis isi (content analysis)');
  // Penelitian lapangan, atau jenis tidak diisi: aturan tiga tahap tetap berlaku.
  assert.equal(periksaG4(isi, G_JENIS).status, STATUS.BELUM);
  assert.equal(periksaG4(isi).status, STATUS.BELUM);
  assert.equal(periksaG4(isi, 'Tinjauan pustaka dipakai sebagai data sekunder.').status, STATUS.BELUM);
  assert.equal(periksaG4('', pustaka).status, STATUS.TIDAK_DAPAT);
});
