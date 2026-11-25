import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jalankanAturan, jalankanAturanSemua, bagianTerisi, ringkas, nilaiPasangan } from './bandingkan.js';

const contoh = JSON.parse(readFileSync(new URL('./data-uji.contoh.json', import.meta.url), 'utf8'));

test('nilaiPasangan: jenis selisih aplikasi dan pemilik', () => {
  assert.equal(nilaiPasangan('terpenuhi', 'terpenuhi'), 'cocok');
  assert.equal(nilaiPasangan('belum', 'terpenuhi'), 'salah_menyalahkan');
  assert.equal(nilaiPasangan('terpenuhi', 'belum'), 'salah_meloloskan');
  assert.equal(nilaiPasangan('tidak_yakin', 'belum'), 'tidak_yakin');
  assert.equal(nilaiPasangan('belum', undefined), 'tanpa_penilaian');
});

test('data contoh: pemeriksaan aturan cocok dengan penilaian pemilik pada semua kriteria aturan', () => {
  const baris = jalankanAturan(contoh);
  assert.equal(baris.length, contoh.length * 5);
  const per = ringkas(baris);
  for (const [k, r] of Object.entries(per)) {
    assert.equal(r.cocok, contoh.length, `${k}: ${JSON.stringify(r)}`);
  }
});

test('bagianTerisi: hanya bagian yang isinya ada, K bila minimal dua bagian terisi', () => {
  assert.deepEqual(bagianTerisi({ latar: 'a' }), ['A']);
  assert.deepEqual(bagianTerisi({ latar: 'a', rumusan: ['x', ''] }), ['A', 'B', 'K']);
  assert.deepEqual(bagianTerisi({ teoretis: '  ', praktis: 'p', jenis: 'j' }), ['D', 'G']);
});

test('jalankanAturanSemua: bagian kosong dilewati dan hasil memuat pesan', () => {
  const baris = jalankanAturanSemua([{ id: 'x', rumusan: ['Bagaimana konstruksi kebebasan radikal pelaku?'], sistematika: 'Bab pertama berisi pendahuluan.' }]);
  const huruf = new Set(baris.map((b) => b.kriteria[0]));
  assert.deepEqual([...huruf].sort(), ['B', 'H', 'K']);
  assert.ok(baris.every((b) => b.jenis === 'aturan' && 'pesan' in b));
  assert.deepEqual(jalankanAturanSemua([{ id: 'x', latar: 'a', rumusan: ['y'] }], ['A']).map((b) => b.kriteria), ['A7']);
});

import { jadikanButir, ambilSemua } from './ambil-data.js';

test('jadikanButir: satu butir per NIM, isian terbaru menang, kosong tidak menimpa, uji pemilik dilewati', () => {
  const rekaman = [
    { waktu: '2026-11-26T01:00:00Z', nim: '111111111', masukan: { bagian: 'A', latar: 'latar lama' } },
    { waktu: '2026-11-26T02:00:00Z', nim: '111111111', masukan: { bagian: 'A', latar: 'latar baru' } },
    { waktu: '2026-11-26T03:00:00Z', nim: '111111111', masukan: { bagian: 'B', rumusan: ['r1'], latar: '' } },
    { waktu: '2026-11-26T04:00:00Z', nim: '000000000', masukan: { bagian: 'A', latar: 'x' } }
  ];
  const butir = jadikanButir(rekaman);
  assert.equal(butir.length, 1);
  assert.equal(butir[0].latar, 'latar baru');
  assert.deepEqual(butir[0].rumusan, ['r1']);
  assert.match(butir[0].id, /^mhs-[0-9a-f]{6}$/);
  assert.ok(!JSON.stringify(butir).includes('111111111'));
});

test('ambilSemua: mengikuti kursor sampai selesai dan melaporkan penolakan', async () => {
  const halaman = [{ data: [{ id: 1 }], kursor: 'k2' }, { data: [{ id: 2 }], kursor: null }];
  let i = 0;
  const f = async (u, o) => { assert.equal(o.headers['X-Kunci-Admin'], 'kunci'); return new Response(JSON.stringify(halaman[i++]), { status: 200 }); };
  assert.equal((await ambilSemua('https://w.example/', 'kunci', f)).length, 2);
  await assert.rejects(() => ambilSemua('https://w.example', 'x', async () => new Response('{"galat":"Tidak diizinkan."}', { status: 401 })), /Tidak diizinkan/);
});
