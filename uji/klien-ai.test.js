import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { periksaMakna, validasiHasil, buatPelaksanaWorker } from '../js/klien-ai.js';

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const RUBRIK = [...baca('../rubrik/B-rumusan.json'), ...baca('../rubrik/C-tujuan.json')];
const AI = RUBRIK.filter((e) => e.jenis === 'ai').map((e) => e.id);
const INPUT = { rumusan: ['Bagaimana validitas akal dalam Misykat al-Anwar?'], tujuan: ['Untuk menganalisis validitas akal.'] };

test('data tiruan: satu hasil per kriteria AI, bukti berupa kutipan nyata', async () => {
  const h = await periksaMakna(RUBRIK, INPUT);
  assert.deepEqual(h.map((x) => x.id), AI);
  assert.ok(h.every((x) => ['terpenuhi', 'belum', 'tidak_yakin'].includes(x.status)));
  assert.ok(h.some((x) => x.status === 'tidak_yakin'));
  assert.equal(h.find((x) => x.id === 'B4').bukti[0], INPUT.rumusan[0]);
});

test('validasi: bukti rekaan dibuang, status tak sah menjadi "tidak yakin"', () => {
  const entri = RUBRIK.filter((e) => AI.slice(0, 2).includes(e.id));
  const h = validasiHasil(entri, [
    { id: 'B4', status: 'terpenuhi', bukti: ['kalimat yang tidak ada', 'validitas akal'], alasan: 'x' },
    { id: 'B5', status: 'mungkin', bukti: [], alasan: 'y' }
  ], INPUT);
  assert.deepEqual(h[0].bukti, ['validitas akal']);
  assert.equal(h[1].status, 'tidak_yakin');
});

test('pelaksana yang galat tidak merusak hasil', async () => {
  const h = await periksaMakna(RUBRIK, INPUT, async () => { throw new Error('gagal'); });
  assert.equal(h.length, AI.length);
  assert.ok(h.every((x) => x.status === 'tidak_yakin'));
});

test('pelaksana Worker: mengirim isian dan kode, menyaring id, meneruskan sisa', async () => {
  let dikirim;
  const f = async (url, init) => {
    dikirim = { url, init };
    return new Response(JSON.stringify({ hasil: [
      { id: 'B4', status: 'terpenuhi', bukti: ['validitas akal'], alasan: 'ok' },
      { id: 'XX', status: 'belum', bukti: [], alasan: '' }], sisa: 7, penggunaan: { masukan: 900, keluaran: 400 } }), { status: 200 });
  };
  const p = buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'kode-uji', idPerangkat: 'perangkat-1', fetchFn: f });
  const h = await periksaMakna(RUBRIK, { ...INPUT, teori: 'epistemologi', konsep: 'sumber dan batas pengetahuan', objek: 'Misykat al-Anwar' }, p);
  assert.equal(h.sisa, 7);
  assert.deepEqual(h.penggunaan, { masukan: 900, keluaran: 400 });
  assert.equal(h.find((x) => x.id === 'B4').status, 'terpenuhi');
  assert.equal(h.find((x) => x.id === 'B5').status, 'tidak_yakin');
  assert.equal(dikirim.init.headers['X-Kode-Akses'], 'kode-uji');
  assert.deepEqual(Object.keys(JSON.parse(dikirim.init.body)).sort(), ['konsep', 'objek', 'rumusan', 'teori', 'tujuan']);
});

test('pelaksana Worker: galat 429 menampilkan pesan dari Worker', async () => {
  const f = async () => new Response(JSON.stringify({ galat: 'Batas tercapai.' }), { status: 429 });
  const p = buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', fetchFn: f });
  const h = await periksaMakna(RUBRIK, INPUT, p);
  assert.equal(h.galat.status, 429);
  assert.ok(h.every((x) => x.status === 'tidak_yakin' && x.pesan === 'Batas tercapai.'));
});

test('tidak ada kunci API di kode klien, konfigurasi, dan tampilan', () => {
  for (const b of ['../js/klien-ai.js', '../js/konfigurasi.js', '../js/tampilan.js']) {
    assert.doesNotMatch(readFileSync(new URL(b, import.meta.url), 'utf8'), /sk-ant|api[_-]?key|x-api-key/i);
  }
});

test('validasi: kutipan dari isian terstruktur (teori, konsep, objek) diterima', () => {
  const entri = RUBRIK.filter((e) => e.id === 'B6');
  const masukan = { ...INPUT, teori: 'Eksistensialisme Sartre', konsep: 'kebebasan radikal, itikad buruk', objek: 'Tradisi Kungkum' };
  const h = validasiHasil(entri, [{ id: 'B6', status: 'tidak_yakin', bukti: ['kebebasan radikal, itikad buruk', 'kalimat karangan'], alasan: 'x' }], masukan);
  assert.deepEqual(h[0].bukti, ['kebebasan radikal, itikad buruk']);
});

test('validasi: label "Rumusan 1:" atau "Tujuan 2:" di awal kutipan dibuang, bukan membuang kutipannya', () => {
  const entri = RUBRIK.filter((e) => e.id === 'B4');
  const h = validasiHasil(entri, [{ id: 'B4', status: 'terpenuhi', alasan: 'x',
    bukti: ['Rumusan 1: Bagaimana validitas akal dalam Misykat al-Anwar?', 'Tujuan 1: Untuk menganalisis validitas akal.', 'Rumusan 2: kalimat karangan'] }], INPUT);
  assert.deepEqual(h[0].bukti, ['Bagaimana validitas akal dalam Misykat al-Anwar?', 'Untuk menganalisis validitas akal.']);
});
