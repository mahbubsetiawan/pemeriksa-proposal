import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tangani, susunPermintaan, susunPermintaanLatar, susunPermintaanManfaat, susunPermintaanSistematika, susunPermintaanTinjauan, susunPermintaanLandasan, bersihkanMasukanTinjauan, bersihkanMasukanLandasan, bersihkanMasukan, bersihkanMasukanLatar, bersihkanMasukanManfaat, bersihkanMasukanSistematika, MODEL, BATAS } from '../worker/index.js';

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
  assert.match(b.system, /bagian objek material/);
  assert.match(b.system, /Cocokkan istilah teori/);
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

const HASIL_A = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));
const LATAR = 'Paragraf satu tentang konteks.\n\nParagraf dua tentang objek.';

test('bagian A: masukan dibersihkan, dibagi paragraf, dan dibatasi panjangnya', () => {
  const m = bersihkanMasukanLatar({ latar: LATAR });
  assert.equal(m.paragraf.length, 2);
  assert.ok(bersihkanMasukanLatar({ latar: '   ' }).galat);
  assert.equal(bersihkanMasukanLatar({ latar: 'a'.repeat(BATAS.latar + 1) }).status, 413);
});

test('bagian A: prompt memuat kriteria A1-A6, petunjuk STARE, dan paragraf bernomor; tanpa kriteria B dan C', () => {
  const b = susunPermintaanLatar(bersihkanMasukanLatar({ latar: LATAR }));
  assert.equal(b.model, MODEL);
  assert.equal(b.max_tokens, BATAS.maxTokensLatar);
  assert.match(b.system, /Situation/);
  assert.match(b.system, /Jangan menulis ulang/);
  for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']) assert.match(b.messages[0].content, new RegExp(`- ${id}:`));
  assert.doesNotMatch(b.messages[0].content, /- B4:/);
  assert.match(b.messages[0].content, /\[P1\] Paragraf satu/);
  assert.deepEqual(b.output_config.format.schema.properties.hasil.items.properties.id.enum, ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
});

test('bagian A: permintaan sah diteruskan; bagian BC tetap memakai kriteria B dan C', async () => {
  let dikirim;
  const f = async (url, init) => { dikirim = JSON.parse(init.body); return hasilAnthropic(HASIL_A)(); };
  const r = await tangani(req({ bagian: 'A', latar: LATAR }), env(), f);
  assert.equal(r.status, 200);
  assert.match(dikirim.messages[0].content, /- A1:/);
  const r2 = await tangani(req(BADAN), env(), async (u, init) => { dikirim = JSON.parse(init.body); return hasilAnthropic(HASIL)(); });
  assert.equal(r2.status, 200);
  assert.match(dikirim.messages[0].content, /- B4:/);
  assert.doesNotMatch(dikirim.messages[0].content, /- A1:/);
});

test('bagian A: latar kosong atau terlalu besar ditolak sebelum memakai kuota', async () => {
  const e = env();
  assert.equal((await tangani(req({ bagian: 'A', latar: '' }), e, hasilAnthropic(HASIL_A))).status, 400);
  assert.equal((await tangani(req({ bagian: 'A', latar: 'a'.repeat(BATAS.latar + 1) }), e, hasilAnthropic(HASIL_A))).status, 413);
  assert.equal(await e.PEMAKAIAN.get(`p:${new Date().toISOString().slice(0, 10)}:perangkat-0001`), null);
});

test('bagian A: penolakan layanan menghasilkan tidak_yakin untuk A1-A6', async () => {
  const tolak = async () => new Response(JSON.stringify({ stop_reason: 'refusal', content: [] }));
  const j = await (await tangani(req({ bagian: 'A', latar: LATAR }), env(), tolak)).json();
  assert.deepEqual(j.hasil.map((h) => h.id), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
});

const HASIL_D = ['D3', 'D4'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));
const HASIL_H = ['H5', 'H6', 'H7'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));

test('bagian D: masukan dibersihkan, prompt memuat D3-D4 dan petunjuk manfaat, tanpa kriteria lain', () => {
  assert.ok(bersihkanMasukanManfaat({ teoretis: '', praktis: '  ' }).galat);
  assert.equal(bersihkanMasukanManfaat({ teoretis: 'a'.repeat(BATAS.manfaat + 1) }).status, 413);
  const b = susunPermintaanManfaat(bersihkanMasukanManfaat({ teoretis: 'Memperkaya kajian AFI.', praktis: 'Bahan bagi Dinas.' }));
  assert.equal(b.model, MODEL);
  assert.match(b.system, /menambah wawasan/);
  assert.match(b.system, /Jangan menulis ulang/);
  assert.match(b.messages[0].content, /- D3:/);
  assert.match(b.messages[0].content, /Manfaat praktis: Bahan bagi Dinas\./);
  assert.doesNotMatch(b.messages[0].content, /- D1:|- A1:|- B4:/);
  assert.deepEqual(b.output_config.format.schema.properties.hasil.items.properties.id.enum, ['D3', 'D4']);
});

test('bagian H: masukan dibersihkan, prompt memuat H5-H7, pola kata bilangan, dan larangan nama rumus', () => {
  assert.ok(bersihkanMasukanSistematika({ sistematika: '' }).galat);
  assert.equal(bersihkanMasukanSistematika({ sistematika: 'a'.repeat(BATAS.sistematika + 1) }).status, 413);
  const b = susunPermintaanSistematika(bersihkanMasukanSistematika({ sistematika: 'Bab pertama berisi latar belakang.' }));
  assert.match(b.system, /Bab \[kata bilangan\] berisi/);
  assert.match(b.system, /huruf kapital semua/);
  assert.match(b.system, /Nama rumus penulisan/);
  assert.match(b.system, /bab kedua objek material penelitian; bab ketiga objek formal/);
  assert.match(b.system, /tinjauan pustaka, metode penelitian, dan sistematika penulisan/);
  assert.match(b.messages[0].content, /- H5:/);
  assert.doesNotMatch(b.messages[0].content, /- H1:|- H4:/);
  assert.match(b.messages[0].content, /Bab pertama berisi latar belakang\./);
  assert.deepEqual(b.output_config.format.schema.properties.hasil.items.properties.id.enum, ['H5', 'H6', 'H7']);
});

test('bagian D dan H lewat Worker: kriteria yang dikirim ke model sesuai bagian', async () => {
  let dikirim;
  const f = (hasil) => async (url, init) => { dikirim = JSON.parse(init.body); return hasilAnthropic(hasil)(); };
  assert.equal((await tangani(req({ bagian: 'D', teoretis: 'Memperkaya kajian AFI.', praktis: '' }), env(), f(HASIL_D))).status, 200);
  assert.match(dikirim.messages[0].content, /- D4:/);
  assert.equal((await tangani(req({ bagian: 'H', sistematika: 'Bab I berisi latar belakang.' }), env(), f(HASIL_H))).status, 200);
  assert.match(dikirim.messages[0].content, /- H7:/);
  assert.equal((await tangani(req({ bagian: 'D', teoretis: '', praktis: '' }), env(), f(HASIL_D))).status, 400);
});

const HASIL_E = ['E3', 'E4', 'E5', 'E6'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));
const HASIL_F = ['F3', 'F4', 'F5', 'F6', 'F7'].map((id) => ({ id, status: 'terpenuhi', bukti: [], alasan: 'x' }));

test('bagian E: masukan dibatasi, prompt memuat E3-E6, petunjuk CAP-G, dan paragraf bernomor', () => {
  assert.ok(bersihkanMasukanTinjauan({ tinjauan: ' ' }).galat);
  assert.equal(bersihkanMasukanTinjauan({ tinjauan: 'a'.repeat(BATAS.tinjauan + 1) }).status, 413);
  const b = susunPermintaanTinjauan(bersihkanMasukanTinjauan({ tinjauan: 'Paragraf satu.\n\nParagraf dua.' }));
  assert.match(b.system, /CAP-G/);
  assert.match(b.system, /Jangan menulis ulang/);
  for (const id of ['E3', 'E4', 'E5', 'E6']) assert.match(b.messages[0].content, new RegExp(`- ${id}:`));
  assert.doesNotMatch(b.messages[0].content, /- E1:|- A1:/);
  assert.match(b.messages[0].content, /\[P2\] Paragraf dua/);
  assert.deepEqual(b.output_config.format.schema.properties.hasil.items.properties.id.enum, ['E3', 'E4', 'E5', 'E6']);
});

test('bagian F: masukan dibatasi, prompt memuat F3-F7, konsep, landasan bernomor, dan kerangka', () => {
  assert.ok(bersihkanMasukanLandasan({ landasan: '' }).galat);
  assert.equal(bersihkanMasukanLandasan({ landasan: 'a', kerangka: 'b'.repeat(BATAS.kerangka + 1) }).status, 413);
  const b = susunPermintaanLandasan(bersihkanMasukanLandasan({ konsep: 'kebebasan radikal', landasan: 'Definisi.\n\nKonsep.', kerangka: 'Situation sampai Ends.' }));
  assert.match(b.system, /D-K-R/);
  assert.match(b.system, /biografi/);
  assert.match(b.messages[0].content, /Konsep teori di rumusan: kebebasan radikal/);
  assert.match(b.messages[0].content, /\[P2\] Konsep\./);
  assert.match(b.messages[0].content, /Kerangka pemikiran: Situation sampai Ends\./);
  assert.deepEqual(b.output_config.format.schema.properties.hasil.items.properties.id.enum, ['F3', 'F4', 'F5', 'F6', 'F7']);
  const kosong = susunPermintaanLandasan(bersihkanMasukanLandasan({ landasan: 'Definisi.' }));
  assert.match(kosong.messages[0].content, /Kerangka pemikiran: \(kosong\)/);
});

test('bagian E dan F lewat Worker: kriteria yang dikirim ke model sesuai bagian', async () => {
  let dikirim;
  const f = (hasil) => async (url, init) => { dikirim = JSON.parse(init.body); return hasilAnthropic(hasil)(); };
  assert.equal((await tangani(req({ bagian: 'E', tinjauan: 'Paragraf satu.' }), env(), f(HASIL_E))).status, 200);
  assert.match(dikirim.messages[0].content, /- E5:/);
  assert.equal((await tangani(req({ bagian: 'F', konsep: 'k', landasan: 'Definisi teori.' }), env(), f(HASIL_F))).status, 200);
  assert.match(dikirim.messages[0].content, /- F7:/);
  assert.equal((await tangani(req({ bagian: 'F', landasan: '' }), env(), f(HASIL_F))).status, 400);
});
