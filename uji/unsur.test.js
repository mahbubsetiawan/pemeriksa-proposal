import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNSUR } from '../js/unsur.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('tiap kotak unsur menunjuk kolom isian yang ada di index.html dan berada dalam kartu isian', () => {
  for (const kunci of Object.keys(UNSUR)) {
    assert.match(html, new RegExp(`id="${kunci}"`), `kolom #${kunci} tidak ada`);
  }
});

test('isi unsur lengkap: baris berisi huruf, judul, uraian; kisi-kisi berupa alur lima kolom', () => {
  for (const [kunci, d] of Object.entries(UNSUR)) {
    const baris = d.kelompok.flatMap((k) => k.baris);
    assert.ok(baris.length || d.tabel, `${kunci} kosong`);
    for (const b of baris) assert.ok(b.length === 3 && b.every((x) => String(x).trim()), `${kunci}: baris tidak lengkap`);
  }
  const kisi = UNSUR['metode-kisi'].tabel;
  assert.equal(kisi.kepala.length, 5);
  assert.deepEqual(kisi.contoh.map((c) => c.judul), ['Contoh penelitian lapangan', 'Contoh penelitian pustaka']);
  for (const c of kisi.contoh) {
    assert.ok(c.baris.length >= 2);
    for (const b of c.baris) assert.equal(b.length, 5, 'tiap baris contoh memuat lima kolom');
  }
});

test('semua bagian A sampai H punya kotak, label singkatan sesuai panduan, dan teknik membedakan lapangan dan pustaka', () => {
  const label = Object.fromEntries(Object.entries(UNSUR).filter(([, d]) => d.label).map(([k, d]) => [k, d.label]));
  assert.deepEqual(label, { latar: 'STARE', tinjauan: 'CAP-G', landasan: 'D-K-R', kerangka: 'Deduktif' });
  const teknik = UNSUR['metode-teknik'].kelompok;
  assert.deepEqual(teknik.map((k) => k.judul), ['Penelitian lapangan', 'Penelitian pustaka']);
  assert.deepEqual(teknik[0].baris.map((b) => b[1]), ['Wawancara', 'Observasi', 'Dokumentasi']);
  assert.deepEqual(teknik[1].baris.map((b) => b[1]), ['Dokumentasi']);
});

test('berkas unsur.js ikut di-cache service worker dan istilah "rumus" tidak tampil di kotak', () => {
  assert.match(sw, /\.\/js\/unsur\.js/);
  assert.ok(!/rumus/i.test(JSON.stringify(Object.values(UNSUR).map((d) => d.label ?? ''))));
  const kode = readFileSync(new URL('../js/unsur.js', import.meta.url), 'utf8');
  assert.equal((kode.match(/harus memuat semua unsur berikut/g) ?? []).length, 1, 'satu kalimat judul saja, tanpa keterangan ganda');
  assert.ok(!kode.includes('unsur-ket'));
  assert.match(kode, /harus memuat semua unsur berikut/);
  assert.match(kode, /sesuai jenis penelitian Anda/);
});

test('analisis data dipecah lapangan dan pustaka; tahap kedua bernama Verstehen, bukan Verifikatif', () => {
  const g = UNSUR['metode-analisis'].kelompok;
  assert.deepEqual(g.map((k) => k.judul), ['Penelitian lapangan', 'Penelitian pustaka']);
  assert.equal(g[0].label, 'D-V-I');
  assert.deepEqual(g[0].baris.map((b) => b[1]), ['Deskriptif', 'Verstehen', 'Interpretatif']);
  assert.match(g[1].baris[0][1], /Analisis isi/);
  assert.ok(!/verifikatif/i.test(JSON.stringify(UNSUR)));
});

test('kisi-kisi: unsur naratif lima kolom di atas, lalu tabel contoh; catatan M-3P dihapus', () => {
  const d = UNSUR['metode-kisi'];
  assert.deepEqual(d.kelompok[0].baris.map((b) => b[1]), ['Fokus masalah (konsep)', 'Kategori analitik', 'Indikator', 'Sumber data', 'Teknik pengumpulan data']);
  assert.equal(JSON.stringify(UNSUR).includes('M-3P'), false);
  assert.equal((d.catatan ?? []).length, 0);
});

test('kerangka pemikiran: contoh bagan empat tahap dari panduan, dengan catatan kotak Review', () => {
  const d = UNSUR.kerangka;
  assert.equal(d.bagan.langkah.length, 4);
  assert.equal(d.bagan.langkah[2].sejajar.length, 2);
  const semua = JSON.stringify(d.bagan);
  for (const kata of ['Situation', 'Target', 'Review', 'Approach', 'Ends', 'Kesadaran otentik', 'Kebebasan radikal', 'Bad faith']) assert.ok(semua.includes(kata), kata);
  assert.equal(d.narasi, undefined, 'contoh narasi tidak ditampilkan; mahasiswa memakai tombol Isi contoh');
  assert.ok(d.catatan.some((c) => /nama pendekatan atau teorinya/.test(c)));
});
