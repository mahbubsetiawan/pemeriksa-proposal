import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jalankanAturan, ringkas, nilaiPasangan } from './bandingkan.js';

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
