import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS, bersihkan, kataPertama, pecahBab, periksaA7, periksaD1, periksaD2, periksaE1, periksaE2, periksaF1, periksaF2, pecahKonsep, periksaH1, periksaH2, periksaB1, periksaB2, periksaB3, periksaC1, periksaC2, periksaSemua
} from '../js/aturan.js';

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const RUBRIK = ['A-latar', 'B-rumusan', 'C-tujuan', 'D-manfaat', 'E-tinjauan', 'F-landasan', 'H-sistematika'].flatMap((n) => baca(`../rubrik/${n}.json`));

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
    assert.match(e.rujukan, /^Panduan Bab (?:I\.[A-E]|II\.[A-C])$/);
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
  'BAB I: PENDAHULUAN. Bab ini berisi paparan latar belakang masalah mengenai pergeseran makna spiritualitas pada Tradisi Kungkum di Umbul Pengging menggunakan formula STARE, rumusan masalah, dan tujuan penelitian.',
  'BAB II: TINJAUAN PUSTAKA DAN LANDASAN TEORI. Bab ini berisi telaah terhadap hasil penelitian terdahulu yang disusun menggunakan metode sintesis CAP-G serta landasan teori Eksistensialisme Jean-Paul Sartre sebagai pisau analisis.',
  'BAB V: PENUTUP. Bab ini berisi simpulan final teoretis yang menjawab pemaknaan eksistensial pelaku Tradisi Kungkum, keterbatasan penelitian, dan saran bagi peneliti selanjutnya.'
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

test('pecahBab: memecah per bab dan tidak terkecoh oleh "Bab ini" di awal baris', () => {
  const bab = pecahBab('Pengantar singkat.\nBab I berisi latar belakang.\nBab ini juga memuat tujuan.\nBAB II: TEORI. Bab ini berisi teori.');
  assert.deepEqual(bab.map((b) => b.label), ['I', 'II']);
  assert.deepEqual(pecahBab('Tanpa kepala bab sama sekali.'), []);
  assert.deepEqual(pecahBab('Bab 3 berisi metode.\n\nBab 4 berisi hasil.').map((b) => b.label), ['3', '4']);
});

test('H1: pola "Bab ... berisi ..." pada contoh panduan lolos; bab tanpa "berisi" gagal', () => {
  assert.equal(periksaH1(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const salah = SISTEMATIKA_BENAR + '\n\nBAB III: METODE PENELITIAN. Membahas jenis penelitian dan teknik pengumpulan data yang dipakai peneliti.';
  const r = periksaH1(salah);
  assert.equal(r.status, STATUS.BELUM);
  assert.deepEqual(r.nomor, ['III']);
  assert.equal(periksaH1('Pendahuluan, teori, metode.').status, STATUS.TIDAK_DAPAT);
  assert.equal(periksaH1('  ').status, STATUS.TIDAK_DAPAT);
});

test('H2: bab yang hanya berupa judul menjadi peringatan', () => {
  assert.equal(periksaH2(SISTEMATIKA_BENAR).status, STATUS.TERPENUHI);
  const r = periksaH2('BAB I: PENDAHULUAN\n\nBAB II: LANDASAN TEORI\n\nBab III berisi uraian metode penelitian lapangan beserta sumber data primer dan sekunder yang dipakai.');
  assert.equal(r.status, STATUS.PERINGATAN);
  assert.deepEqual(r.nomor, ['I', 'II']);
});

test('periksaSemua bagian D dan H: aturan jalan, kriteria makna menunggu AI, pesan terisi', () => {
  const d = periksaSemua(RUBRIK.filter((e) => e.bagian === 'D'), { teoretis: 'Menambah wawasan pembaca.', praktis: '' });
  const pd = Object.fromEntries(d.map((h) => [h.id, h]));
  assert.equal(pd.D1.status, STATUS.BELUM);
  assert.match(pd.D1.pesan, /praktis/);
  assert.equal(pd.D2.status, STATUS.BELUM);
  assert.equal(pd.D3.status, STATUS.BELUM_DIJALANKAN);
  const h = periksaSemua(RUBRIK.filter((e) => e.bagian === 'H'), { sistematika: SISTEMATIKA_BENAR });
  const ph = Object.fromEntries(h.map((x) => [x.id, x]));
  assert.equal(ph.H1.status, STATUS.TERPENUHI);
  assert.equal(ph.H2.status, STATUS.TERPENUHI);
  assert.equal(ph.H3.status, STATUS.BELUM_DIJALANKAN);
  assert.ok([...d, ...h].every((x) => !/\{\w+\}/.test(x.pesan)));
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

test('E2: tepat tiga paragraf lolos; selain itu peringatan dengan jumlahnya', () => {
  assert.equal(periksaE2(TINJAUAN_BENAR).status, STATUS.TERPENUHI);
  const satu = periksaE2('Satu paragraf saja yang panjang. Kalimat kedua. Kalimat ketiga.');
  assert.equal(satu.status, STATUS.PERINGATAN);
  assert.equal(satu.data.jumlah, 1);
  assert.equal(periksaE2(TINJAUAN_BENAR + '\n\nParagraf keempat.').data.jumlah, 4);
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
  assert.equal(pe.E2.status, STATUS.PERINGATAN);
  assert.match(pe.E2.pesan, /1 paragraf/);
  assert.equal(pe.E3.status, STATUS.BELUM_DIJALANKAN);
  const f = periksaSemua(RUBRIK.filter((x) => x.bagian === 'F'), { konsep: KONSEP_F + ', kesadaran otentik', landasan: LANDASAN_BENAR });
  const pf = Object.fromEntries(f.map((h) => [h.id, h]));
  assert.equal(pf.F1.status, STATUS.TERPENUHI);
  assert.equal(pf.F2.status, STATUS.PERINGATAN);
  assert.match(pf.F2.pesan, /kesadaran otentik/);
  for (const id of ['F3', 'F4', 'F5', 'F6', 'F7']) assert.equal(pf[id].status, STATUS.BELUM_DIJALANKAN);
  assert.ok([...e, ...f].every((x) => !/\{\w+\}/.test(x.pesan)));
});
