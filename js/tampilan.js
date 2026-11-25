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
    if (kelas === 'isi-cincin') {
      if (!baik) continue; // tanpa bagian hijau bila belum ada yang terpenuhi (menghindari titik)
      c.setAttribute('stroke-dasharray', `${(baik / dinilai.length) * keliling} ${keliling}`);
    }
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
const CONTOH_D = {
  teoretis: 'Penelitian ini diharapkan berkontribusi dalam memperkaya khazanah kajian Akidah dan Filsafat Islam, khususnya memberikan pembacaan alternatif menggunakan pisau filsafat eksistensialisme terhadap fenomena budaya dan ritual keagamaan lokal kontemporer, bukan sekadar kajian sosiologis murni.',
  praktis: 'Penelitian ini dapat dijadikan bahan refleksi bagi pengelola Umbul Pengging dan Dinas Pariwisata Kabupaten Boyolali dalam menyusun regulasi zonasi spiritual, agar arus komersialisasi tidak memberangus ruang eksistensial dan kesakralan ritual masyarakat.'
};
const CONTOH_H = [
  'Bab pertama berisi pendahuluan yang memuat latar belakang masalah mengenai pergeseran makna spiritualitas pada Tradisi Kungkum di Umbul Pengging, rumusan masalah yang mengawinkan aspek tradisi dengan konsep eksistensialisme, tujuan penelitian, manfaat penelitian secara teoretis maupun praktis, tinjauan pustaka, metode penelitian, serta sistematika penulisan.',
  'Bab kedua berisi objek material penelitian, yaitu gambaran umum Umbul Pengging di Boyolali beserta deskripsi pelaksanaan Tradisi Kungkum oleh para pelakunya.',
  'Bab ketiga berisi objek formal penelitian, yaitu teori eksistensialisme Jean-Paul Sartre beserta konsep kebebasan radikal, kesadaran otentik, dan itikad buruk yang dipakai sebagai pisau analisis.',
  'Bab keempat berisi temuan penelitian dan pembahasannya, yaitu analisis konstruksi kebebasan radikal dan kesadaran otentik pelaku serta pembahasan dinamika itikad buruk dalam komodifikasi spiritual.',
  'Bab kelima berisi penutup yang memuat kesimpulan teoretis yang menjawab rumusan masalah, serta saran atau rekomendasi bagi peneliti selanjutnya dan pihak terkait.'
].join('\n\n');

const CONTOH_E = 'Secara tematik, literatur mengenai ritual air dan tradisi spiritual di Jawa dalam kurun waktu lima tahun terakhir dapat dikelompokkan ke dalam dua tren kajian utama. Tren pertama berfokus pada fungsi sosiologis-antropologis ritual sebagai alat perekat solidaritas sosial, sedangkan tren kedua dominan menyoroti aspek sinkretisme teologis mistisisme Jawa. Dari segi metode, mayoritas peneliti terdahulu mengandalkan pendekatan etnografi deskriptif, dengan temuan umum yang menempatkan pelaku ritual sekadar sebagai pelestari tradisi yang pasif tanpa otonomi kesadaran penuh.\n\nMeskipun terdapat kesamaan dalam melihat ketahanan Tradisi Kungkum di tengah modernitas, terdapat perbedaan tajam di antara studi-studi tersebut dalam memaknai motivasi pelaku. Penelitian oleh Jurnal A (2024) mengklaim bahwa pelaku ritual melakukan kungkum murni karena tekanan struktur mitos kolektif. Sebaliknya, studi sosiologis oleh Jurnal B (2025) mendapati temuan bahwa tradisi ini bertahan murni karena motif ekonomi (pencarian pesugihan). Studi C (2025) mencoba mengontraskan kedua temuan ini, namun bias tetap terjadi akibat belum adanya peneliti yang menatap ritual dari kacamata kedalaman eksistensial aktor.\n\nDi sinilah posisi penelitian ini berada untuk mengisi celah akademik (research gap) yang luput dari para peneliti terdahulu. Berbeda dengan studi di atas yang bias pada analisis fungsionalisme murni, penelitian ini mempertemukan tindakan lapangan dengan filsafat eksistensial. Melalui Teori Eksistensialisme Jean-Paul Sartre, penelitian ini membedah bagaimana pelaku Tradisi Kungkum mengonstruksi kesadaran, kebebasan, dan krisis identitas mereka di balik ritual tersebut.';
const CONTOH_F = {
  konsep: 'kebebasan radikal, itikad buruk (bad faith), being-for-itself',
  landasan: 'Eksistensialisme merupakan sebuah perspektif filsafat yang menegaskan bahwa "eksistensi mendahului esensi". Jean-Paul Sartre menempatkan manusia sebagai subjek yang "dikutuk untuk bebas", di mana individu memegang tanggung jawab penuh atas pilihan hidupnya tanpa bisa berlindung di balik takdir atau mistisisme yang melumpuhkan kesadaran.\n\nSecara operasional, terdapat tiga konsep pokok Sartre yang akan diturunkan menjadi kategori analitik dan indikator lapangan pada Bab III: (1) Being-in-itself (mekanis/tanpa sadar) vs Being-for-itself (subjek otentik yang sadar); (2) Kebebasan Radikal dan Pilihan; serta (3) Itikad Buruk (Bad Faith), yaitu saat aktor menyalahkan tradisi/mitos atas kegagalannya sendiri.\n\nTeori Sartre merupakan pisau bedah yang tajam untuk menganalisis Tradisi Kungkum di Pengging. Secara sekilas, ritual ini sering dituduh sebagai tindakan mistis fatalistik. Namun melalui lensa eksistensialisme, ruang umbul didekonstruksi sebagai "ruang eksistensial" di mana manusia Jawa merespons krisis modernitas dan menguji kebebasan serta otentisitas hidupnya.',
  kerangka: 'Penelitian ini bermula dari Situation makro, yaitu krisis otentisitas manusia modern akibat kepungan masyarakat industri/modernitas. Krisis ini kemudian ditatap pada sebuah Target konkret, yakni bertahannya Tradisi Kungkum malam hari di Umbul Pengging. Untuk membedah tindakan tersebut, peneliti menggunakan Approach Teori Eksistensialisme Jean-Paul Sartre (konsep: Kebebasan Radikal dan Bad Faith). Setelah melakukan evaluasi melalui Review yang menunjukkan bahwa pendekatan sosiologis/etnografi sebelumnya gagal memotret kedalaman makna eksistensial pelaku, penelitian ini bermuara pada Ends, yakni mengungkap secara kritis konstruksi kebebasan otentik dan dinamika itikad buruk komodifikasi di balik ritual tersebut.'
};

const CONTOH_G = {
  jenis: 'Penelitian ini merupakan penelitian kualitatif lapangan (field research) dengan pendekatan filosofis-fenomenologis. Pendekatan ini dipilih karena peneliti akan mendalami fenomena sosial secara alami, memahami makna, dan mengamati interaksi pelaku secara langsung di lokasi Umbul Pengging. Melalui pendekatan ini, peneliti akan bertindak sebagai instrumen kunci (human instrument) untuk mendapatkan data yang mendalam dan kontekstual mengenai kesadaran eksistensial para pelaku ritual.',
  sumber: '1. Data primer akan berupa transkrip wawancara mendalam dengan informan kunci yang berjumlah 5 orang (terdiri dari Juru Kunci Umbul, Pemandu Ritual, dan Pelaku Kungkum reguler), serta catatan lapangan (field notes) hasil observasi tindakan pelaku di Umbul Pengging pada waktu malam hari.\n2. Data sekunder akan berupa profil monografi dan laporan kunjungan wisata dari Kantor Desa atau Pengelola Umbul Pengging, serta literatur teoretis mengenai eksistensialisme Jean-Paul Sartre dari berbagai buku dan jurnal ilmiah.',
  teknik: 'Pengumpulan data di lapangan akan dilakukan secara terpadu melalui observasi non-partisipan, wawancara mendalam, dan dokumentasi. Untuk menjaga arah pencarian data, peneliti akan memedomani matriks kisi-kisi instrumen. Daftar pertanyaan wawancara akan disusun terpisah dan diletakkan di lampiran.',
  kisi: 'Fokus masalah (konsep) | Kategori analitik | Indikator | Sumber data | Teknik pengumpulan data\nKonstruksi kebebasan radikal dan kesadaran otentik pelaku Kungkum | Kesadaran dan pilihan bebas subjek (being-for-itself) | Pilihan sadar subjek (being-for-itself) vs. sekadar mekanis/rutinitas | Pelaku Kungkum, Pemandu Ritual | Wawancara, Observasi\nDinamika itikad buruk (bad faith) dalam komodifikasi spiritual | Penyangkalan tanggung jawab atas pilihan (bad faith) | Pelaku menyalahkan takdir/mitos ekonomi; pergeseran ritual menjadi transaksional | Juru Kunci, Pelaku | Wawancara, Dokumentasi',
  analisis: 'Analisis data akan dilakukan melalui tiga tahapan bertingkat. Pertama, analisis deskriptif, yakni memaparkan temuan data lapangan secara objektif apa adanya, seperti kutipan wawancara alasan ekonomi pelaku dan pengamatan transaksional di umbul. Kedua, analisis verifikatif (verstehen), yakni menggali motif batin dari sudut pandang para pelaku kungkum tanpa bias subjektif peneliti, untuk memahami bagaimana mereka memaknai keheningan air umbul. Ketiga, analisis interpretatif, yakni melakukan penafsiran akhir dengan membenturkan temuan tersebut menggunakan teori Eksistensialisme Sartre (konsep kebebasan radikal dan bad faith) guna mengungkap kontradiksi eksistensial pelaku komodifikasi spiritual tersebut.',
  triangulasi: 'Untuk menjamin bahwa data dan hasil penafsiran eksistensial bersifat sahih dan bebas dari bias subjektivitas, peneliti akan menerapkan: (1) triangulasi sumber, yaitu membandingkan keterangan motif ritual dari pelaku kungkum dengan keterangan pembanding dari Juru Kunci Umbul Pengging serta tokoh adat setempat; dan (2) triangulasi teknik, yaitu mengonfrontasi klaim lisan pelaku bahwa mereka murni mencari keheningan spiritual dengan hasil observasi peneliti dan bukti dokumentasi papan tarif pemandu ritual di lokasi.'
};
const KOLOM_G = ['jenis', 'sumber', 'teknik', 'kisi', 'analisis', 'triangulasi'];

const PANEL = {
  g: {
    berkas: ['rubrik/G-metode.json'],
    bagian: 'G',
    ambil: () => Object.fromEntries(KOLOM_G.map((k) => [k, $(`#metode-${k}`).value])),
    isiContoh: () => { for (const k of KOLOM_G) $(`#metode-${k}`).value = CONTOH_G[k]; },
    ada: () => KOLOM_G.some((k) => $(`#metode-${k}`).value.trim()),
    kosongkan: () => { for (const k of KOLOM_G) $(`#metode-${k}`).value = ''; }
  },
  e: {
    berkas: ['rubrik/E-tinjauan.json'],
    bagian: 'E',
    ambil: () => ({ tinjauan: $('#tinjauan').value }),
    isiContoh: () => { $('#tinjauan').value = CONTOH_E; $('#tinjauan').dispatchEvent(new Event('input')); },
    ada: () => $('#tinjauan').value.trim().length > 0,
    kosongkan: () => { $('#tinjauan').value = ''; $('#tinjauan').dispatchEvent(new Event('input')); }
  },
  f: {
    berkas: ['rubrik/F-landasan.json'],
    bagian: 'F',
    ambil: () => ({ konsep: $('#konsep-f').value, landasan: $('#landasan').value, kerangka: $('#kerangka').value }),
    isiContoh: () => { $('#konsep-f').value = CONTOH_F.konsep; $('#landasan').value = CONTOH_F.landasan; $('#kerangka').value = CONTOH_F.kerangka; },
    ada: () => ['#konsep-f', '#landasan', '#kerangka'].some((i) => $(i).value.trim()),
    kosongkan: () => { for (const i of ['#konsep-f', '#landasan', '#kerangka']) $(i).value = ''; }
  },
  d: {
    berkas: ['rubrik/D-manfaat.json'],
    bagian: 'D',
    ambil: () => ({ teoretis: $('#manfaat-teoretis').value, praktis: $('#manfaat-praktis').value }),
    isiContoh: () => { $('#manfaat-teoretis').value = CONTOH_D.teoretis; $('#manfaat-praktis').value = CONTOH_D.praktis; },
    ada: () => $('#manfaat-teoretis').value.trim().length > 0 || $('#manfaat-praktis').value.trim().length > 0,
    kosongkan: () => { $('#manfaat-teoretis').value = ''; $('#manfaat-praktis').value = ''; }
  },
  h: {
    berkas: ['rubrik/H-sistematika.json'],
    bagian: 'H',
    ambil: () => ({ sistematika: $('#sistematika').value }),
    isiContoh: () => { $('#sistematika').value = CONTOH_H; },
    ada: () => $('#sistematika').value.trim().length > 0,
    kosongkan: () => { $('#sistematika').value = ''; }
  },
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
  const tabs = [...document.querySelectorAll('[role="tab"][data-panel]')];
  const pilih = (nama) => {
    for (const t of tabs) {
      const aktif = t.dataset.panel === nama;
      t.setAttribute('aria-selected', String(aktif));
      $(`#panel-${t.dataset.panel}`).hidden = !aktif;
      if (aktif) t.scrollIntoView({ inline: 'center', block: 'nearest' }); // bilah menu di ponsel ikut bergulir
    }
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    pilih(t.dataset.panel);
    // Koherensi ringan: konsep teori dari tab B–C ikut terisi di tab F bila kolomnya masih kosong.
    if (t.dataset.panel === 'f' && !$('#konsep-f').value.trim() && $('#konsep').value.trim()) $('#konsep-f').value = $('#konsep').value;
  }));
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

function pasangHitungTinjauan() {
  const isi = $('#tinjauan');
  const perbarui = () => {
    const t = isi.value;
    const paragraf = t.split(/\n\s*\n+/).filter((p) => p.trim()).length;
    $('#hitung-tinjauan').textContent = t ? `${t.length} karakter · ${paragraf} paragraf (maks. 8.000 karakter)` : '';
  };
  isi.addEventListener('input', perbarui);
  perbarui();
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
  pasangHitungTinjauan();
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
