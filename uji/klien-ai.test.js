import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { periksaMakna, validasiHasil, buatPelaksanaWorker } from '../js/klien-ai.js';

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const RUBRIK = [...baca('../rubrik/B-rumusan.json'), ...baca('../rubrik/C-tujuan.json')];
const RUBRIK_A = baca('../rubrik/A-latar.json');
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
  assert.deepEqual(Object.keys(JSON.parse(dikirim.init.body)).sort(), ['bagian', 'konsep', 'objek', 'rumusan', 'teori', 'tujuan']);
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

const LATAR = 'Di tengah arus modernisasi, manusia mengalami krisis otentisitas.\n\nTradisi Kungkum bertahan sebagai ruang sakral yang bergeser menjadi komoditas.';

test('bagian A: data tiruan memberi satu hasil per kriteria AI dengan bukti dari latar', async () => {
  const h = await periksaMakna(RUBRIK_A, { latar: LATAR });
  assert.deepEqual(h.map((x) => x.id), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  assert.ok(h.every((x) => x.bukti.length === 1 && LATAR.includes(x.bukti[0])));
});

test('bagian A: Worker dipanggil dengan bagian A dan hanya mengirim latar', async () => {
  let dikirim;
  const f = async (url, init) => { dikirim = JSON.parse(init.body); return new Response(JSON.stringify({ hasil: [] }), { status: 200 }); };
  const p = buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', bagian: 'A', fetchFn: f });
  await periksaMakna(RUBRIK_A, { latar: LATAR, rumusan: ['tidak ikut'] }, p);
  assert.deepEqual(Object.keys(dikirim).sort(), ['bagian', 'latar']);
  assert.equal(dikirim.bagian, 'A');
});

test('bagian A: kutipan dengan label [P2] dan spasi berbeda diterima, karangan ditolak', () => {
  const entri = RUBRIK_A.filter((e) => e.id === 'A1');
  const h = validasiHasil(entri, [{ id: 'A1', status: 'terpenuhi', alasan: 'x', bukti: [
    '[P1] Di tengah arus modernisasi, manusia   mengalami krisis otentisitas.',
    'Paragraf 2: Tradisi Kungkum bertahan sebagai ruang sakral',
    'kalimat yang tidak pernah ditulis'] }], { latar: LATAR });
  assert.equal(h[0].bukti.length, 2);
  assert.ok(h[0].bukti[0].startsWith('Di tengah arus'));
});

test('galat jaringan atau CORS ditampilkan sebagai pesan Indonesia, bukan "Failed to fetch"', async () => {
  const f = async () => { throw new TypeError('Failed to fetch'); };
  const p = buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', fetchFn: f });
  const h = await periksaMakna(RUBRIK, INPUT, p);
  assert.ok(h.every((x) => /tidak dapat dihubungi/i.test(x.pesan) && !/Failed to fetch/.test(x.pesan)));
});

const RUBRIK_D = baca('../rubrik/D-manfaat.json');
const RUBRIK_H = baca('../rubrik/H-sistematika.json');

test('bagian D dan H: data tiruan memberi bukti dari isian dan Worker menerima isian yang tepat', async () => {
  const dTiruan = await periksaMakna(RUBRIK_D, { teoretis: 'Memperkaya kajian AFI.', praktis: 'Bahan refleksi bagi pengelola umbul.' });
  assert.deepEqual(dTiruan.map((x) => x.id), ['D3', 'D4']);
  assert.ok(dTiruan.every((x) => x.bukti.length === 1));
  const bodi = {};
  const f = async (url, init) => { Object.assign(bodi, JSON.parse(init.body)); return new Response(JSON.stringify({ hasil: [] }), { status: 200 }); };
  await periksaMakna(RUBRIK_D, { teoretis: 'a', praktis: 'b', latar: 'tidak ikut' },
    buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', bagian: 'D', fetchFn: f }));
  assert.deepEqual(Object.keys(bodi).sort(), ['bagian', 'praktis', 'teoretis']);
  await periksaMakna(RUBRIK_H, { sistematika: 'Bab I berisi x.', teoretis: 'tidak ikut' },
    buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', bagian: 'H', fetchFn: f }));
  assert.ok('sistematika' in bodi);
});

test('bagian D: kutipan berlabel "Manfaat teoretis:" diterima setelah label dibuang', () => {
  const entri = RUBRIK_D.filter((e) => e.id === 'D3');
  const h = validasiHasil(entri, [{ id: 'D3', status: 'terpenuhi', alasan: 'x', bukti: ['Manfaat teoretis: Memperkaya kajian AFI.', 'karangan'] }], { teoretis: 'Memperkaya kajian AFI.', praktis: '' });
  assert.deepEqual(h[0].bukti, ['Memperkaya kajian AFI.']);
});

const RUBRIK_E = baca('../rubrik/E-tinjauan.json');
const RUBRIK_F = baca('../rubrik/F-landasan.json');

test('bagian E dan F: data tiruan memberi bukti, dan Worker menerima isian yang tepat', async () => {
  const eTiruan = await periksaMakna(RUBRIK_E, { tinjauan: 'Paragraf satu tentang tema.\n\nParagraf dua tentang kontras.' });
  assert.deepEqual(eTiruan.map((x) => x.id), ['E2', 'E3', 'E4', 'E5']);
  assert.ok(eTiruan.every((x) => x.bukti.length === 1));
  const fTiruan = await periksaMakna(RUBRIK_F, { konsep: 'a', landasan: 'Definisi teori.', kerangka: 'Alur deduktif.' });
  assert.deepEqual(fTiruan.map((x) => x.id), ['F3', 'F4', 'F5', 'F6', 'F7']);
  const bodi = {};
  const f = async (url, init) => { Object.assign(bodi, JSON.parse(init.body)); return new Response(JSON.stringify({ hasil: [] }), { status: 200 }); };
  await periksaMakna(RUBRIK_E, { tinjauan: 'a', latar: 'tidak ikut' },
    buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', bagian: 'E', fetchFn: f }));
  assert.deepEqual(Object.keys(bodi).sort(), ['bagian', 'tinjauan']);
  for (const k of Object.keys(bodi)) delete bodi[k];
  await periksaMakna(RUBRIK_F, { konsep: 'k', landasan: 'l', kerangka: 'r', tinjauan: 'tidak ikut' },
    buatPelaksanaWorker({ url: 'https://w.example', kodeAkses: 'k', idPerangkat: 'perangkat-1', bagian: 'F', fetchFn: f }));
  assert.deepEqual(Object.keys(bodi).sort(), ['bagian', 'kerangka', 'konsep', 'landasan']);
});

test('bagian F: kutipan dari kolom kerangka dan landasan diterima, karangan ditolak', () => {
  const entri = RUBRIK_F.filter((e) => e.id === 'F6');
  const h = validasiHasil(entri, [{ id: 'F6', status: 'terpenuhi', alasan: 'x', bukti: ['[P1] Definisi teori.', 'Alur deduktif dari makro ke mikro', 'kalimat yang tidak ada'] }],
    { konsep: 'a', landasan: 'Definisi teori.', kerangka: 'Alur deduktif dari makro ke mikro.' });
  assert.equal(h[0].bukti.length, 2);
});
