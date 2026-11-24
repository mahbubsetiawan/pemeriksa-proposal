// Antarmuka: tab per bagian proposal, isian, dan penyajian hasil per kriteria.
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
  [STATUS.BELUM_DIJALANKAN]: 'Belum dijalankan',
  tidak_yakin: 'Tidak yakin'
};
const JUDUL_BUTIR = { rumusan: 'Rumusan', tujuan: 'Tujuan' };
const SUNGGUHAN = Boolean(URL_WORKER);

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

function tambahButir(untuk) {
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
  butir.append(baris, isi);
  wadah.append(butir);
  nomori(untuk);
}

function nomori(untuk) {
  [...$(`#daftar-${untuk}`).children].forEach((b, i) => {
    $('label', b).textContent = `${JUDUL_BUTIR[untuk]} ${i + 1}`;
  });
}

const ambilDaftar = (untuk) => [...document.querySelectorAll(`textarea[data-untuk="${untuk}"]`)].map((t) => t.value);

/* ---------- panel ---------- */
const PANEL = {
  a: {
    judulBagian: { A: 'A. Latar Belakang Masalah' },
    berkas: ['rubrik/A-latar.json'],
    bagian: 'A',
    ambil: () => ({ latar: $('#latar').value })
  },
  bc: {
    judulBagian: { B: 'B. Rumusan Masalah', C: 'C. Tujuan Penelitian' },
    berkas: ['rubrik/B-rumusan.json', 'rubrik/C-tujuan.json'],
    bagian: 'BC',
    ambil: () => ({
      teori: $('#teori').value, konsep: $('#konsep').value, objek: $('#objek').value,
      rumusan: ambilDaftar('rumusan'), tujuan: ambilDaftar('tujuan')
    })
  }
};

function sajikan(akar, cfg, hasil) {
  const isi = $('.isi-hasil', akar);
  isi.replaceChildren();
  for (const [bagian, judul] of Object.entries(cfg.judulBagian)) {
    isi.append(el('h3', '', judul));
    for (const h of hasil.filter((x) => x.bagian === bagian)) {
      const k = el('article', `kartu ${h.status}`);
      const judulKartu = el('h3');
      judulKartu.append(el('span', 'id', h.id), document.createTextNode(h.kriteria));
      k.append(judulKartu, el('span', 'lencana', LABEL[h.status]), el('p', '', h.pesan));
      for (const b of h.bukti) k.append(el('blockquote', '', b));
      isi.append(k);
    }
  }
  const aturan = hasil.filter((h) => h.jenis === 'aturan');
  const lolos = aturan.filter((h) => h.status === STATUS.TERPENUHI).length;
  const tunda = hasil.filter((h) => h.status === STATUS.BELUM_DIJALANKAN).length;
  $('.ringkasan', akar).textContent =
    `Pemeriksaan berbasis aturan: ${lolos} dari ${aturan.length} kriteria terpenuhi. ` +
    (tunda ? `${tunda} kriteria makna (AI) belum dijalankan.`
      : SUNGGUHAN ? 'Kriteria makna diperiksa AI; hasilnya bantuan awal dan dapat keliru.'
        : 'Kriteria makna memakai DATA TIRUAN, bukan hasil AI sungguhan.');
  $('.kotak-makna', akar).hidden = false;
  const bagianHasil = $('.hasil', akar);
  bagianHasil.hidden = false;
  bagianHasil.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
    sajikan(akar, cfg, terakhir.hasil);
  });

  $('.mode-makna', akar).textContent = SUNGGUHAN
    ? 'Pemeriksaan makna memakai AI lewat server perantara. Hasilnya bantuan awal dan dapat keliru.'
    : 'Layanan AI belum dipasang. Tombol di bawah hanya menampilkan DATA TIRUAN untuk menguji tampilan.';

  $('.jalankan-makna', akar).addEventListener('click', async () => {
    if (!terakhir) return;
    const pesan = $('.pesan-makna', akar);
    const tombol = $('.jalankan-makna', akar);
    pesan.textContent = '';
    let pelaksana;
    if (SUNGGUHAN) {
      const kode = $('#kode').value.trim();
      if (!$('#setuju').checked) { pesan.textContent = 'Centang persetujuan terlebih dahulu (di bagian Layanan AI).'; return; }
      if (!kode) { pesan.textContent = 'Isi kode akses kelas terlebih dahulu (di bagian Layanan AI).'; return; }
      sessionStorage.setItem('kode-akses', kode);
      pelaksana = buatPelaksanaWorker({ url: URL_WORKER, kodeAkses: kode, idPerangkat: idPerangkat(), bagian: cfg.bagian });
    }
    tombol.disabled = true;
    pesan.textContent = 'Memeriksa...';
    const hasil = await periksaMakna(rubrik, terakhir.input, pelaksana);
    tombol.disabled = false;
    const makna = new Map(hasil.map((h) => [h.id, h]));
    terakhir.hasil = terakhir.hasil.map((h) => makna.get(h.id) ?? h);
    sajikan(akar, cfg, terakhir.hasil);
    $('.pesan-makna', akar).textContent = hasil.galat ? hasil.galat.pesan
      : [hasil.sisa !== undefined ? `Sisa pemeriksaan hari ini di perangkat ini: ${hasil.sisa}.` : '',
         hasil.penggunaan ? `Token: ${hasil.penggunaan.masukan} masuk, ${hasil.penggunaan.keluaran} keluar.` : ''].filter(Boolean).join(' ');
  });
}

/* ---------- tab ---------- */
function pasangTab() {
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

function pasangHitungLatar() {
  const isi = $('#latar');
  const perbarui = () => {
    const t = isi.value;
    const paragraf = t.split(/\n\s*\n+/).filter((p) => p.trim()).length;
    $('#hitung-latar').textContent = `${t.length} karakter, ${paragraf} paragraf.`;
  };
  isi.addEventListener('input', perbarui);
  perbarui();
}

async function mulai() {
  tambahButir('rumusan');
  tambahButir('tujuan');
  document.querySelectorAll('.tambah').forEach((t) =>
    t.addEventListener('click', () => tambahButir(t.dataset.untuk)));
  pasangTab();
  pasangHitungLatar();
  $('#layanan-ai').hidden = !SUNGGUHAN;
  $('#kode').value = sessionStorage.getItem('kode-akses') ?? '';
  try {
    for (const nama of Object.keys(PANEL)) pasangPanel(nama, await muatRubrik(PANEL[nama].berkas));
  } catch {
    $('main').prepend(el('p', 'pernyataan', 'Rubrik gagal dimuat. Buka aplikasi lewat alamat web, bukan langsung dari berkas.'));
  }
}

mulai();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
