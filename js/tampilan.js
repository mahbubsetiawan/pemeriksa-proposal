// Antarmuka: menu bagian proposal, isian, dan penyajian hasil ringkas per kriteria.
// Teks pengguna selalu dimasukkan lewat textContent. Tidak ada panggilan jaringan selain memuat berkas rubrik sendiri
// dan, bila pengguna menyetujui, memanggil Worker perantara.
import { periksaSemua, STATUS } from './aturan.js';
import { periksaMakna, buatPelaksanaWorker } from './klien-ai.js';
import { URL_WORKER } from './konfigurasi.js';

const LABEL = {
  [STATUS.TERPENUHI]: 'Terpenuhi',
  [STATUS.BELUM]: 'Belum terpenuhi',
  [STATUS.PERINGATAN]: 'Peringatan',
  [STATUS.TIDAK_DAPAT]: 'Belum dapat diperiksa',
  [STATUS.BELUM_DIJALANKAN]: 'Menunggu pemeriksaan AI',
  tidak_yakin: 'Tidak yakin'
};
const IKON = {
  [STATUS.TERPENUHI]: '✓', [STATUS.BELUM]: '!', [STATUS.PERINGATAN]: '!',
  [STATUS.TIDAK_DAPAT]: '?', [STATUS.BELUM_DIJALANKAN]: '…', tidak_yakin: '?'
};
// Kelompok hasil, berurutan dari yang paling perlu perhatian.
const KELOMPOK = [
  { kunci: 'perbaiki', judul: 'Perlu diperbaiki', chip: 'perlu diperbaiki', status: [STATUS.BELUM, STATUS.PERINGATAN], buka: true },
  { kunci: 'periksa', judul: 'Perlu dicek', chip: 'perlu dicek', status: ['tidak_yakin', STATUS.TIDAK_DAPAT], buka: true },
  { kunci: 'baik', judul: 'Sudah baik', chip: 'sudah baik', status: [STATUS.TERPENUHI], buka: false },
  { kunci: 'tunda', judul: 'Menunggu pemeriksaan AI', chip: 'menunggu AI', status: [STATUS.BELUM_DIJALANKAN], buka: false }
];
const JUDUL_BUTIR = { rumusan: 'Rumusan', tujuan: 'Tujuan' };
const SUNGGUHAN = Boolean(URL_WORKER);

const CONTOH = {
  a: { latar: [
    'Di tengah arus modernisasi dan mekanisasi kehidupan perkotaan, manusia sering kali mengalami krisis otentisitas dan keterasingan (alienasi), yang melahirkan kebutuhan ruang spiritual untuk melepaskan diri dari tekanan rutinitas.',
    'Dalam konteks tersebut, Tradisi Kungkum di Umbul Pengging bertahan bukan sekadar sebagai pelestarian budaya, melainkan memperlihatkan anomali di mana ruang sakral tersebut justru bergeser menjadi komoditas spiritual.',
    'Untuk membedah motivasi dan pergulatan batin pelaku tradisi ini, penelitian menggunakan perspektif Eksistensialisme Jean-Paul Sartre, khususnya mengenai konsep kebebasan radikal, otentisitas, dan bad faith (itikad buruk).',
    'Meskipun studi antropologis dan sosiologis terdahulu telah banyak membahas aspek sejarah dan relasi sosial Tradisi Kungkum, belum ada studi yang membedah krisis kesadaran eksistensial individu di balik komodifikasi ritual tersebut.',
    'Oleh karena itu, penelitian ini bertujuan untuk mengungkap dinamika otentisitas dan konstruksi bad faith para pelaku ritual Kungkum di tengah kepungan arus komersialisasi modern.'
  ].join('\n\n') },
  bc: {
    teori: 'Eksistensialisme Jean-Paul Sartre',
    konsep: 'kebebasan radikal, kesadaran otentik, itikad buruk (bad faith)',
    objek: 'Tradisi Kungkum di Umbul Pengging',
    rumusan: [
      'Bagaimana konstruksi kebebasan radikal dan kesadaran otentik para pelaku Tradisi Kungkum di Umbul Pengging?',
      'Bagaimana dinamika itikad buruk (bad faith) dalam komodifikasi spiritual para pelaku Tradisi Kungkum di Umbul Pengging?'
    ],
    tujuan: [
      'Untuk menganalisis konstruksi kebebasan radikal dan kesadaran otentik pelaku Tradisi Kungkum di Umbul Pengging melalui lensa eksistensialisme Jean-Paul Sartre.',
      'Untuk menginterpretasikan dinamika itikad buruk (bad faith) dalam komodifikasi spiritual para pelaku Tradisi Kungkum di Umbul Pengging.'
    ]
  }
};

const $ = (s, akar = document) => akar.querySelector(s);
const el = (tag, kelas, teks) => {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
};

// Identitas perangkat acak (bukan data pribadi), dipakai Worker untuk batas pemakaian harian.
function idPerangkat() {
  let id = localStorage.getItem('id-perangkat');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('id-perangkat', id); }
  return id;
}

/* ---------- isian bertingkat (rumusan, tujuan) ---------- */
let pencacah = 0;

function tambahButir(untuk, nilai = '') {
  const wadah = $(`#daftar-${untuk}`);
  const butir = el('div', 'butir');
  const baris = el('div', 'baris');
  const label = el('label', '', '');
  const id = `${untuk}-${++pencacah}`;
  label.htmlFor = id;
  const hapus = el('button', 'hapus', 'Hapus');
  hapus.type = 'button';
  hapus.addEventListener('click', () => { butir.remove(); nomori(untuk); });
  baris.append(label, hapus);
  const isi = el('textarea');
  isi.id = id;
  isi.dataset.untuk = untuk;
  isi.value = nilai;
  butir.append(baris, isi);
  wadah.append(butir);
  nomori(untuk);
}

function nomori(untuk) {
  [...$(`#daftar-${untuk}`).children].forEach((b, i) => {
    $('label', b).textContent = `${JUDUL_BUTIR[untuk]} ${i + 1}`;
  });
}

function aturDaftar(untuk, nilai) {
  $(`#daftar-${untuk}`).replaceChildren();
  (nilai.length ? nilai : ['']).forEach((v) => tambahButir(untuk, v));
}

const ambilDaftar = (untuk) => [...document.querySelectorAll(`textarea[data-untuk="${untuk}"]`)].map((t) => t.value);

/* ---------- dialog persetujuan dan kode akses ---------- */
const dlgAi = () => $('#dialog-ai');

function bukaDialogAi() {
  return new Promise((selesai) => {
    const dlg = dlgAi();
    $('#galat-dialog').textContent = '';
    $('#kode').value = sessionStorage.getItem('kode-akses') ?? '';
    $('#setuju').checked = sessionStorage.getItem('setuju') === '1';
    const tutup = (hasil) => { dlg.close(); selesai(hasil); };
    $('#form-dialog-ai').onsubmit = (e) => {
      e.preventDefault();
      const kode = $('#kode').value.trim();
      if (!kode) { $('#galat-dialog').textContent = 'Isi kode akses kelas terlebih dahulu.'; return; }
      if (!$('#setuju').checked) { $('#galat-dialog').textContent = 'Centang persetujuan untuk melanjutkan.'; return; }
      sessionStorage.setItem('kode-akses', kode);
      sessionStorage.setItem('setuju', '1');
      tutup(kode);
    };
    $('#batal-dialog').onclick = () => tutup(null);
    dlg.oncancel = () => selesai(null);
    dlg.showModal();
    $('#kode').focus();
  });
}

/** Kode akses bila izin sudah ada di sesi ini; bila belum, minta lewat dialog. */
async function pastikanIzin() {
  const kode = sessionStorage.getItem('kode-akses');
  if (kode && sessionStorage.getItem('setuju') === '1') return kode;
  return bukaDialogAi();
}

/** Konfirmasi di dalam aplikasi (jendela confirm bawaan peramban tidak selalu tampil di panel atau aplikasi terpasang). */
function tanyaKosongkan() {
  return new Promise((selesai) => {
    const dlg = $('#dialog-kosong');
    const tutup = (jawab) => { dlg.close(); selesai(jawab); };
    $('#ya-kosong').onclick = () => tutup(true);
    $('#batal-kosong').onclick = () => tutup(false);
    dlg.oncancel = () => selesai(false);
    dlg.showModal();
  });
}

/* ---------- hasil ---------- */
function barisHasil(h, terbuka) {
  const d = el('details', `baris ${h.status}`);
  d.open = terbuka;
  const s = el('summary');
  s.append(
    el('span', 'ikon', IKON[h.status]),
    el('span', 'idk', h.id),
    el('span', 'judul', h.kriteria),
    el('span', 'sr', ` (${LABEL[h.status]})`)
  );
  s.firstChild.setAttribute('aria-hidden', 'true');
  const isi = el('div', 'isi');
  if (h.pesan) isi.append(el('p', '', h.pesan));
  for (const b of h.bukti) isi.append(el('blockquote', '', b));
  d.append(s, isi);
  return d;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Cincin skor: bagian kriteria terpenuhi dari kriteria yang sudah dinilai. */
function gambarSkor(wadah, hasil) {
  wadah.replaceChildren();
  const dinilai = hasil.filter((h) => h.status !== STATUS.BELUM_DIJALANKAN);
  if (!dinilai.length) { wadah.hidden = true; return; }
  wadah.hidden = false;
  const baik = dinilai.filter((h) => h.status === STATUS.TERPENUHI).length;
  const keliling = 2 * Math.PI * 32;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 76 76');
  svg.setAttribute('aria-hidden', 'true');
  for (const kelas of ['dasar', 'isi-cincin']) {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('cx', '38'); c.setAttribute('cy', '38'); c.setAttribute('r', '32');
    c.setAttribute('class', kelas);
    if (kelas === 'isi-cincin') c.setAttribute('stroke-dasharray', `${(baik / dinilai.length) * keliling} ${keliling}`);
    svg.append(c);
  }
  const angka = el('div', 'angka');
  angka.append(el('b', '', `${baik}/${dinilai.length}`), el('small', '', 'baik'));
  wadah.append(svg, angka);
  wadah.setAttribute('role', 'img');
  wadah.setAttribute('aria-label', `${baik} dari ${dinilai.length} kriteria yang sudah dinilai terpenuhi`);
}

/** Langkah 1 Isi, 2 Periksa, 3 Lihat hasil. */
function setLangkah(akar, n) {
  [...akar.querySelectorAll('.langkah li')].forEach((li, i) => {
    li.classList.toggle('selesai', i < n - 1);
    li.classList.toggle('aktif', i === n - 1);
  });
}

function sajikan(akar, hasil, { pesan = '', gulir = true } = {}) {
  const isi = $('.isi-hasil', akar);
  isi.replaceChildren();
  const chip = $('.chip-wadah', akar);
  chip.replaceChildren();
  for (const k of KELOMPOK) {
    const butir = hasil.filter((h) => k.status.includes(h.status));
    if (!butir.length) continue;
    chip.append(el('span', `chip ${k.kunci}`, `${butir.length} ${k.chip}`));
    const bag = el('section', 'kelompok');
    bag.append(el('h3', '', k.judul));
    butir.forEach((h) => bag.append(barisHasil(h, k.buka)));
    isi.append(bag);
  }
  gambarSkor($('.skor', akar), hasil);
  setLangkah(akar, 3);
  const tombol = $('.jalankan-makna', akar);
  $('span', tombol).textContent = hasil.some((h) => h.status === STATUS.BELUM_DIJALANKAN) ? 'Periksa makna (AI)' : 'Ulangi pemeriksaan AI';
  $('.pesan-makna', akar).textContent = pesan;
  const bagianHasil = $('.hasil', akar);
  bagianHasil.hidden = false;
  if (gulir) bagianHasil.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- panel ---------- */
const PANEL = {
  a: {
    berkas: ['rubrik/A-latar.json'],
    bagian: 'A',
    ambil: () => ({ latar: $('#latar').value }),
    isiContoh: () => {
      $('#latar').value = CONTOH.a.latar;
      $('#latar').dispatchEvent(new Event('input'));
    },
    ada: () => $('#latar').value.trim().length > 0,
    kosongkan: () => {
      $('#latar').value = '';
      $('#latar').dispatchEvent(new Event('input'));
    }
  },
  bc: {
    berkas: ['rubrik/B-rumusan.json', 'rubrik/C-tujuan.json'],
    bagian: 'BC',
    ambil: () => ({
      teori: $('#teori').value, konsep: $('#konsep').value, objek: $('#objek').value,
      rumusan: ambilDaftar('rumusan'), tujuan: ambilDaftar('tujuan')
    }),
    isiContoh: () => {
      $('#teori').value = CONTOH.bc.teori;
      $('#konsep').value = CONTOH.bc.konsep;
      $('#objek').value = CONTOH.bc.objek;
      aturDaftar('rumusan', CONTOH.bc.rumusan);
      aturDaftar('tujuan', CONTOH.bc.tujuan);
    },
    ada: () => ['#teori', '#konsep', '#objek'].some((i) => $(i).value.trim()) ||
      [...ambilDaftar('rumusan'), ...ambilDaftar('tujuan')].some((t) => t.trim()),
    kosongkan: () => {
      for (const i of ['#teori', '#konsep', '#objek']) $(i).value = '';
      aturDaftar('rumusan', []);
      aturDaftar('tujuan', []);
    }
  }
};

async function muatRubrik(berkas) {
  const daftar = await Promise.all(berkas.map((u) => fetch(u).then((r) => r.json())));
  return daftar.flat();
}

function pasangPanel(nama, rubrik) {
  const cfg = PANEL[nama];
  const akar = $(`#panel-${nama}`);
  let terakhir = null;

  $(`#form-${nama}`).addEventListener('submit', (e) => {
    e.preventDefault();
    const input = cfg.ambil();
    terakhir = { input, hasil: periksaSemua(rubrik, input) };
    sajikan(akar, terakhir.hasil);
  });

  const tombol = $('.jalankan-makna', akar);
  tombol.addEventListener('click', async () => {
    if (!terakhir) return;
    let pelaksana;
    if (SUNGGUHAN) {
      const kode = await pastikanIzin();
      if (!kode) return;
      pelaksana = buatPelaksanaWorker({ url: URL_WORKER, kodeAkses: kode, idPerangkat: idPerangkat(), bagian: cfg.bagian });
    }
    tombol.disabled = true;
    tombol.classList.add('memuat');
    $('.pesan-makna', akar).textContent = 'Memeriksa…';
    const hasil = await periksaMakna(rubrik, terakhir.input, pelaksana);
    tombol.disabled = false;
    tombol.classList.remove('memuat');
    const makna = new Map(hasil.map((h) => [h.id, h]));
    terakhir.hasil = terakhir.hasil.map((h) => makna.get(h.id) ?? h);
    let pesan = '';
    if (hasil.galat) pesan = hasil.galat.pesan;
    else if (!SUNGGUHAN) pesan = 'Mode contoh: hasil AI di atas hanya data tiruan.';
    else if (hasil.sisa !== undefined) pesan = `Sisa pemeriksaan AI hari ini di perangkat ini: ${hasil.sisa}.`;
    sajikan(akar, terakhir.hasil, { pesan, gulir: false });
  });
}

/* ---------- menu, dialog, hitung ---------- */
function pasangMenu() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const pilih = (nama) => {
    for (const t of tabs) {
      const aktif = t.dataset.panel === nama;
      t.setAttribute('aria-selected', String(aktif));
      $(`#panel-${t.dataset.panel}`).hidden = !aktif;
    }
  };
  tabs.forEach((t) => t.addEventListener('click', () => pilih(t.dataset.panel)));
}

function pasangDialog() {
  $('#buka-tentang').addEventListener('click', () => $('#dialog-tentang').showModal());
  $('#tutup-tentang').addEventListener('click', () => $('#dialog-tentang').close());
  if (SUNGGUHAN) {
    const b = $('#buka-kode');
    b.hidden = false;
    b.addEventListener('click', () => { sessionStorage.removeItem('setuju'); bukaDialogAi(); });
  }
}

function pasangHitungLatar() {
  const isi = $('#latar');
  const perbarui = () => {
    const t = isi.value;
    const paragraf = t.split(/\n\s*\n+/).filter((p) => p.trim()).length;
    $('#hitung-latar').textContent = t ? `${t.length} karakter · ${paragraf} paragraf (maks. 12.000 karakter)` : '';
  };
  isi.addEventListener('input', perbarui);
  perbarui();
}

async function mulai() {
  aturDaftar('rumusan', []);
  aturDaftar('tujuan', []);
  document.querySelectorAll('.tambah').forEach((t) =>
    t.addEventListener('click', () => tambahButir(t.dataset.untuk)));
  pasangMenu();
  pasangDialog();
  pasangHitungLatar();
  // Pasang segera, sebelum rubrik selesai dimuat, agar formulir tidak pernah terkirim secara bawaan (memuat ulang halaman).
  for (const [nama, cfg] of Object.entries(PANEL)) {
    $(`#form-${nama}`).addEventListener('submit', (e) => e.preventDefault());
    $('.contoh', $(`#panel-${nama}`)).addEventListener('click', cfg.isiContoh);
    $('.kosongkan', $(`#panel-${nama}`)).addEventListener('click', async () => {
      if (cfg.ada() && !(await tanyaKosongkan())) return;
      cfg.kosongkan();
      const akar = $(`#panel-${nama}`);
      $('.isi-hasil', akar).replaceChildren();
      $('.pesan-makna', akar).textContent = '';
      $('.hasil', akar).hidden = true;
      setLangkah(akar, 1);
    });
  }
  try {
    for (const nama of Object.keys(PANEL)) pasangPanel(nama, await muatRubrik(PANEL[nama].berkas));
  } catch {
    $('main').prepend(el('p', 'pernyataan', 'Rubrik gagal dimuat. Buka aplikasi lewat alamat web, bukan langsung dari berkas.'));
  }
}

mulai();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
