import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringkasLaporan, formatLaporan, kodeMhs } from './laporan.js';

const rek = (nim, bagian, hasil, waktu = '2026-11-26T01:00:00Z') => ({
  waktu, nim, nama: `NAMA ${nim}`, bagian, hasil: hasil.map(([id, status]) => ({ id, status })), penggunaan: { masukan: 1000, keluaran: 500 }
});
const DATA = [
  rek('241121022', 'A', [['A1', 'terpenuhi'], ['A6', 'tidak_yakin']]),
  rek('241121022', 'G', [['G11', 'tidak_yakin'], ['G12', 'belum']], '2026-11-27T02:00:00Z'),
  rek('241121038', 'A', [['A1', 'terpenuhi'], ['A6', 'tidak_yakin']]),
  rek('000000000', 'A', [['A1', 'belum']])
];

test('ringkasLaporan: hitungan dasar, uji pemilik dilewati kecuali diminta', () => {
  const r = ringkasLaporan(DATA);
  assert.equal(r.total, 3);
  assert.equal(r.mahasiswa.length, 2);
  assert.deepEqual(r.perBagian, { A: 2, G: 1 });
  assert.deepEqual(r.perHari, { '2026-11-26': 2, '2026-11-27': 1 });
  assert.deepEqual(r.perKriteria.A6, { terpenuhi: 0, belum: 0, tidak_yakin: 2, lain: 0 });
  assert.deepEqual(r.token, { masuk: 3000, keluar: 1500 });
  assert.equal(ringkasLaporan(DATA, { sertakanUji: true }).total, 4);
});

test('formatLaporan: tanpa identitas secara bawaan, dengan identitas bila diminta, kriteria urut menurut tidak yakin', () => {
  const r = ringkasLaporan(DATA);
  const polos = formatLaporan(r);
  assert.ok(!polos.includes('241121022') && !polos.includes('NAMA'));
  assert.ok(polos.includes(kodeMhs('241121022')));
  assert.match(formatLaporan(r, { tampilkanNama: true }), /NAMA 241121022 \(241121022\)/);
  assert.ok(polos.indexOf('\nA6 |') < polos.indexOf('\nA1 |'), 'A6 (100% tidak yakin) mendahului A1');
  assert.equal(formatLaporan(ringkasLaporan([])), 'Pemeriksaan AI: 0 dari 0 mahasiswa.\nBelum ada data.');
});
