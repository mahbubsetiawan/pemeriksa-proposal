import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STATUS, bersihkan, kataPertama, periksaB1, periksaB2, periksaB3, periksaC1, periksaC2, periksaSemua
} from '../js/aturan.js';

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const RUBRIK = [...baca('../rubrik/B-rumusan.json'), ...baca('../rubrik/C-tujuan.json')];

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
  const hasil = periksaSemua(RUBRIK, { rumusan: RM_BENAR, tujuan: T_BENAR });
  for (const h of hasil.filter((x) => x.jenis === 'aturan')) assert.equal(h.status, STATUS.TERPENUHI, h.id);
});

test('rubrik: bentuk entri dan rujukan panduan', () => {
  const ids = new Set();
  for (const e of RUBRIK) {
    for (const k of ['id', 'bagian', 'jenis', 'kriteria', 'tingkat', 'rujukan', 'pesan_gagal', 'dasar']) {
      assert.ok(e[k], `${e.id} tanpa ${k}`);
    }
    assert.match(e.rujukan, /^Panduan Bab I\.[BC]$/);
    assert.ok(e.bagian_panduan);
    assert.ok(['aturan', 'ai'].includes(e.jenis));
    assert.ok(!ids.has(e.id));
    ids.add(e.id);
  }
});
