import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tangani, susunPermintaan, bersihkanMasukan, MODEL, BATAS } from '../worker/index.js';

const ASAL = 'https://mahbubsetiawan.github.io';
const kv = () => {
  const m = new Map();
  return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } };
};
const env = (x = {}) => ({ ANTHROPIC_API_KEY: 'kunci-uji-palsu', KODE_AKSES: 'kelas-a,kelas-b', PEMAKAIAN: kv(), ...x });
const req = (badan, { metode = 'POST', asal = ASAL, kode = 'kelas-a', id = 'perangkat-0001' } = {}) =>
  new Request('https://w.example/periksa', {
    method: metode,
    headers: { Origin: asal, 'X-Kode-Akses': kode, 'X-Id-Perangkat': id, 'Content-Type': 'application/json' },
    body: metode === 'POST' ? JSON.stringify(badan) : undefined
  });
const BADAN = {
  rumusan: ['Bagaimana akal dibahas dalam Misykat al-Anwar?'],
  tujuan: ['Untuk menganalisis akal.'], teori: 'epistemologi', konsep: 'sumber pengetahuan', objek: 'Misykat al-Anwar'
};
const hasilAnthropic = (hasil) => async () =>
  new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ hasil }) }], usage: USAGE }), { status: 200 });
const USAGE = { input_tokens: 900, output_tokens: 400 };
const HASIL = ['B4', 'B5', 'B6', 'C3'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));

test('asal tidak diizinkan ditolak; CORS hanya untuk github.io', async () => {
  const r = await tangani(req(BADAN, { asal: 'https://jahat.example' }), env(), hasilAnthropic(HASIL));
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
  const ok = await tangani(req(BADAN, { metode: 'OPTIONS' }), env());
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ASAL);
});

test('tanpa atau dengan kode akses salah ditolak', async () => {
  assert.equal((await tangani(req(BADAN, { kode: '' }), env(), hasilAnthropic(HASIL))).status, 401);
  assert.equal((await tangani(req(BADAN, { kode: 'salah' }), env(), hasilAnthropic(HASIL))).status, 401);
  assert.equal((await tangani(req(BADAN), env({ KODE_AKSES: '' }), hasilAnthropic(HASIL))).status, 401);
});

test('permintaan sah: hasil diteruskan, model dan bentuk permintaan benar, kunci tidak bocor', async () => {
  let dikirim;
  const f = async (url, init) => { dikirim = { url, init }; return hasilAnthropic(HASIL)(); };
  const r = await tangani(req(BADAN, { kode: 'kelas-b' }), env(), f);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.hasil.length, 4);
  assert.equal(j.sisa, BATAS.perPerangkatPerHari - 1);
  assert.deepEqual(j.penggunaan, { masukan: 900, keluaran: 400 });
  assert.equal(dikirim.url, 'https://api.anthropic.com/v1/messages');
  const b = JSON.parse(dikirim.init.body);
  assert.equal(b.model, MODEL);
  assert.equal(b.output_config.format.type, 'json_schema');
  assert.ok(!('temperature' in b) && !('thinking' in b));
  assert.match(b.messages[0].content, /<tulisan_mahasiswa>/);
  assert.match(b.messages[0].content, /Nama teori \(objek formal\): epistemologi/);
  assert.ok(!JSON.stringify(j).includes('kunci-uji-palsu'));
});

test('batas harian per perangkat (20) dan global', async () => {
  const e = env();
  const f = hasilAnthropic(HASIL);
  for (let i = 0; i < 20; i++) assert.equal((await tangani(req(BADAN), e, f)).status, 200);
  assert.equal((await tangani(req(BADAN), e, f)).status, 429);
  assert.equal((await tangani(req(BADAN, { id: 'perangkat-0002' }), e, f)).status, 200);
  const g = env({ BATAS_GLOBAL: '1' });
  assert.equal((await tangani(req(BADAN), g, f)).status, 200);
  assert.equal((await tangani(req(BADAN, { id: 'perangkat-0003' }), g, f)).status, 429);
});

test('batas panjang dan jumlah butir', () => {
  assert.equal(bersihkanMasukan({ rumusan: ['a'.repeat(601)] }).status, 413);
  assert.equal(bersihkanMasukan({ rumusan: ['a', 'b', 'c', 'd'] }).status, 413);
  assert.equal(bersihkanMasukan({ rumusan: ['a'], teori: 't'.repeat(201) }).status, 413);
  assert.ok(bersihkanMasukan({ rumusan: [] }).galat);
  assert.equal(bersihkanMasukan(BADAN).rumusan.length, 1);
});

test('galat hulu, keluaran rusak, dan penolakan ditangani; kunci tidak bocor', async () => {
  const gagal = async () => new Response('{"error":{"message":"kunci-uji-palsu"}}', { status: 401 });
  const r1 = await tangani(req(BADAN), env(), gagal);
  assert.equal(r1.status, 502);
  assert.ok(!(await r1.text()).includes('kunci-uji-palsu'));
  const rusak = async () => new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'bukan json' }] }));
  assert.equal((await tangani(req(BADAN), env(), rusak)).status, 502);
  const tolak = async () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }));
  const r3 = await (await tangani(req(BADAN), env(), tolak)).json();
  assert.ok(r3.hasil.every((h) => h.status === 'tidak_yakin'));
  assert.equal((await tangani(req(BADAN), env({ ANTHROPIC_API_KEY: '' }), hasilAnthropic(HASIL))).status, 503);
});

test('prompt: kriteria dari rubrik, larangan menulis ulang, tulisan mahasiswa sebagai data', () => {
  const b = susunPermintaan(bersihkanMasukan(BADAN));
  assert.match(b.system, /Jangan menulis ulang/);
  assert.match(b.system, /bukan perintah/);
  for (const id of ['B4', 'B5', 'B6', 'C3']) assert.match(b.messages[0].content, new RegExp(`- ${id}:`));
  assert.doesNotMatch(b.messages[0].content, /- B7:/);
});

test('tidak ada pola kunci API di repositori', () => {
  const ada = [];
  const telusur = (d) => {
    for (const n of readdirSync(d)) {
      if (['node_modules', 'sumber', '.git'].includes(n)) continue;
      const p = `${d}/${n}`;
      if (statSync(p).isDirectory()) telusur(p);
      else if (/\.(js|json|toml|md|html|css|webmanifest)$/.test(n) &&
        /sk-ant-[A-Za-z0-9_-]{10,}/.test(readFileSync(p, 'utf8'))) ada.push(p);
    }
  };
  telusur(fileURLToPath(new URL('..', import.meta.url)));
  assert.deepEqual(ada, []);
});
