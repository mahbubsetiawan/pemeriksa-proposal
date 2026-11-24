// Antarmuka: isian terstruktur dan penyajian hasil per kriteria.
// Teks pengguna selalu dimasukkan lewat textContent. Tidak ada panggilan jaringan selain memuat berkas rubrik sendiri.
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
const BAGIAN = { B: 'B. Rumusan Masalah', C: 'C. Tujuan Penelitian' };
const JUDUL_BUTIR = { rumusan: 'Rumusan', tujuan: 'Tujuan' };

const $ = (s) => document.querySelector(s);
const el = (tag, kelas, teks) => {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
};

const SUNGGUHAN = Boolean(URL_WORKER);
let pencacah = 0;

// Identitas perangkat acak (bukan data pribadi), dipakai Worker untuk batas pemakaian harian.
function idPerangkat() {
  let id = localStorage.getItem('id-perangkat');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('id-perangkat', id); }
  return id;
}

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
    b.querySelector('label').textContent = `${JUDUL_BUTIR[untuk]} ${i + 1}`;
  });
}

const ambil = (untuk) => [...document.querySelectorAll(`textarea[data-untuk="${untuk}"]`)].map((t) => t.value);

function sajikan(hasil) {
  const isi = $('#isi-hasil');
  isi.replaceChildren();
  for (const bagian of ['B', 'C']) {
    isi.append(el('h3', '', BAGIAN[bagian]));
    for (const h of hasil.filter((x) => x.bagian === bagian)) {
      const k = el('article', `kartu ${h.status}`);
      const judul = el('h3');
      judul.append(el('span', 'id', h.id), document.createTextNode(h.kriteria));
      k.append(judul, el('span', 'lencana', LABEL[h.status]), el('p', '', h.pesan));
      for (const b of h.bukti) k.append(el('blockquote', '', b));
      isi.append(k);
    }
  }
  const aturan = hasil.filter((h) => h.jenis === 'aturan');
  const lolos = aturan.filter((h) => h.status === STATUS.TERPENUHI).length;
  const tunda = hasil.filter((h) => h.status === STATUS.BELUM_DIJALANKAN).length;
  $('#ringkasan').textContent =
    `Pemeriksaan berbasis aturan: ${lolos} dari ${aturan.length} kriteria terpenuhi. ` +
    (tunda ? `${tunda} kriteria makna (AI) belum dijalankan.`
      : SUNGGUHAN ? 'Kriteria makna diperiksa AI; hasilnya bantuan awal dan dapat keliru.'
        : 'Kriteria makna memakai DATA TIRUAN, bukan hasil AI sungguhan.');
  $('#kotak-makna').hidden = false;
  $('#hasil').hidden = false;
  $('#hasil').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function muatRubrik() {
  const [b, c] = await Promise.all(
    ['rubrik/B-rumusan.json', 'rubrik/C-tujuan.json'].map((u) => fetch(u).then((r) => r.json()))
  );
  return [...b, ...c];
}

async function mulai() {
  tambahButir('rumusan');
  tambahButir('tujuan');
  document.querySelectorAll('.tambah').forEach((t) =>
    t.addEventListener('click', () => tambahButir(t.dataset.untuk)));
  let rubrik;
  try {
    rubrik = await muatRubrik();
  } catch {
    $('main').prepend(el('p', 'pernyataan', 'Rubrik gagal dimuat. Buka aplikasi lewat alamat web, bukan langsung dari berkas.'));
    return;
  }
  let terakhir = null;
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = {
      teori: $('#teori').value, konsep: $('#konsep').value, objek: $('#objek').value,
      rumusan: ambil('rumusan'), tujuan: ambil('tujuan')
    };
    terakhir = { input, hasil: periksaSemua(rubrik, input) };
    sajikan(terakhir.hasil);
  });
  $('#isian-ai').hidden = !SUNGGUHAN;
  $('#mode-makna').textContent = SUNGGUHAN
    ? 'Pemeriksaan makna memakai AI lewat server perantara. Hasilnya bantuan awal dan dapat keliru.'
    : 'Layanan AI belum dipasang. Tombol di bawah hanya menampilkan DATA TIRUAN untuk menguji tampilan.';
  $('#kode').value = sessionStorage.getItem('kode-akses') ?? '';
  $('#jalankan-makna').addEventListener('click', async () => {
    if (!terakhir) return;
    const pesan = $('#pesan-makna');
    pesan.textContent = '';
    let pelaksana;
    if (SUNGGUHAN) {
      const kode = $('#kode').value.trim();
      if (!$('#setuju').checked) { pesan.textContent = 'Centang persetujuan terlebih dahulu.'; return; }
      if (!kode) { pesan.textContent = 'Isi kode akses kelas terlebih dahulu.'; return; }
      sessionStorage.setItem('kode-akses', kode);
      pelaksana = buatPelaksanaWorker({ url: URL_WORKER, kodeAkses: kode, idPerangkat: idPerangkat() });
    }
    $('#jalankan-makna').disabled = true;
    pesan.textContent = 'Memeriksa...';
    const hasil = await periksaMakna(rubrik, terakhir.input, pelaksana);
    $('#jalankan-makna').disabled = false;
    const makna = new Map(hasil.map((h) => [h.id, h]));
    terakhir.hasil = terakhir.hasil.map((h) => makna.get(h.id) ?? h);
    sajikan(terakhir.hasil);
    $('#pesan-makna').textContent = hasil.galat ? hasil.galat.pesan
      : [hasil.sisa !== undefined ? `Sisa pemeriksaan hari ini di perangkat ini: ${hasil.sisa}.` : '',
         hasil.penggunaan ? `Token: ${hasil.penggunaan.masukan} masuk, ${hasil.penggunaan.keluaran} keluar.` : ''].filter(Boolean).join(' ');
  });
}

mulai();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
