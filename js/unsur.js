// Kotak unsur di atas tiap kolom isian. Isinya diambil dari kotak rumus pada
// Panduan Struktur Penulisan Skripsi (sumber/), dengan label diganti "Unsur yang perlu ada" karena tidak semua
// unsur punya singkatan. Singkatan (STARE, CAP-G, dan seterusnya) tampil sebagai label kecil bila ada.
// Aplikasi hanya menampilkan; tidak ada teks mahasiswa yang diproses di sini.

/** kunci = id kolom isian (textarea) atau id daftar (daftar-rumusan, daftar-tujuan). */
export const UNSUR = {
  latar: {
    label: 'STARE',
    kelompok: [{ baris: [
      ['S', 'Situation (Konteks Umum)', 'Memotret peta besar fenomena keberagamaan, nalar beragama, atau krisis pemikiran kontemporer secara makro.'],
      ['T', 'Target (Urgensi Objek Material)', 'Menjelaskan lokus lapangan atau teks yang menjadi target bidik dan mengapa objek ini mendesak diteliti.'],
      ['A', 'Approach (Objek Formal/Perspektif)', 'Mengenalkan sudut pandang teori atau filsafat sebagai pisau bedah beserta relevansi awalnya.'],
      ['R', 'Review (Intipan Celah)', 'Menampilkan cuplikan singkat keterbatasan fokus peneliti terdahulu (research gap).'],
      ['E', 'Ends (Masalah Pokok/Tujuan)', 'Penegasan akhir berupa muara kalimat yang menjastifikasi tujuan utama penelitian.']
    ] }]
  },
  'daftar-rumusan': {
    kelompok: [{ baris: [
      ['1', 'Kata tanya analitis', '"Bagaimana" atau "Mengapa".'],
      ['+', 'Konsep spesifik objek formal (teori)', 'Konsep dari teori yang dipakai.'],
      ['+', 'Objek material lapangan atau teks', 'Objek yang dikaji.']
    ] }]
  },
  'daftar-tujuan': {
    kelompok: [{ baris: [
      ['1', 'Kata kerja analitis', '"Menganalisis" atau "Menginterpretasikan".'],
      ['+', 'Bunyi rumusan masalah', 'Disalin senada dengan rumusannya.']
    ] }]
  },
  'manfaat-teoretis': {
    kelompok: [{ baris: [['T', 'Manfaat Teoretis', 'Kontribusi bagi pengembangan keilmuan spesifik di Prodi AFI.']] }]
  },
  'manfaat-praktis': {
    kelompok: [{ baris: [['P', 'Manfaat Praktis', 'Rekomendasi atau kegunaan bagi aktor, masyarakat, atau lembaga pemangku kebijakan di lapangan.']] }]
  },
  tinjauan: {
    label: 'CAP-G',
    kelompok: [{ baris: [
      ['C', 'Classification (paragraf 1)', 'Mengelompokkan literatur terdahulu menurut kesamaan tema, metode, dan temuan.'],
      ['A', 'Analysis of Contrast (paragraf 2)', 'Membenturkan dan membandingkan, mencari titik temu dan perbedaan tajam antar-literatur.'],
      ['PG', 'Position and Gap Filling (paragraf 3)', 'Menegaskan celah akademik yang tersisa dan posisi kontribusi orisinal peneliti.']
    ] }],
    catatan: ['Pembagian paragraf bebas. Tulis sebagai sintesis, bukan daftar penelitian satu per satu.']
  },
  landasan: {
    label: 'D-K-R',
    kelompok: [{ baris: [
      ['D', 'Definisi Konseptual', 'Penjelasan teoretis akademis mengenai teori atau paradigma yang dipakai.'],
      ['K', 'Konsep Utama Teori', 'Uraian tiap konsep mendasar (definisi singkat dan aspek pokoknya) yang nanti diturunkan menjadi kategori analitik dan indikator di Bab III.'],
      ['R', 'Relevansi Teori dengan Objek', 'Argumen logis mengapa teori ini alat yang paling tajam untuk objek material.']
    ] }]
  },
  kerangka: {
    label: 'Deduktif',
    kelompok: [{ baris: [
      ['1', 'Situation (kotak atas)', 'Panggung masalah makro atau krisis umum.'],
      ['2', 'Target (kotak tengah)', 'Lokus nyata fenomena tersebut.'],
      ['3', 'Approach (kotak kiri atau kanan)', 'Teori atau konsep yang dibawa peneliti.'],
      ['4', 'Review (kotak sintesis)', 'Kritik kelemahan pendekatan terdahulu untuk menunjukkan celah penelitian.'],
      ['5', 'Ends (kotak bawah)', 'Output atau penyelesaian analitis (jawaban final).']
    ] }],
    catatan: [
      'Menerjemahkan formula STARE dari Latar Belakang menjadi alur visual, dari makro ke mikro.',
      'Pada kotak Review, yang dibenturkan adalah nama pendekatan atau teorinya, bukan detail temuan datanya, agar bagan tetap bersih dan langsung menonjolkan letak kebaruan (novelty) penelitian Anda.'
    ],
    // Contoh dari Panduan Struktur Penulisan Skripsi (kasus Kungkum Pengging dan Sartre).
    bagan: {
      judul: 'Contoh bagan kerangka pemikiran (kasus Kungkum Pengging, Sartre)',
      langkah: [
        { label: 'Situation / Makro', isi: 'Krisis otentisitas manusia modern dan alienasi masyarakat industri' },
        { label: 'Target / Meso', isi: 'Fenomena bertahannya Tradisi Kungkum malam hari di Umbul Pengging, Boyolali' },
        { sejajar: [
          { label: 'Kajian terdahulu (Review)', isi: 'Pendekatan sosiologis dan antropologis', rincian: ['Hanya berfokus pada fungsionalisme mitos dan ekonomi; gagal memotret otonomi eksistensial pelaku'] },
          { label: 'Pisau analisis (Approach)', isi: 'Teori Eksistensialisme Jean-Paul Sartre', rincian: ['Konsep teori:', '1. Kesadaran otentik', '2. Kebebasan radikal', '3. Bad faith (itikad buruk)'] }
        ] },
        { label: 'Ends / Muara', isi: 'Mengungkap konstruksi kebebasan otentik dan dinamika bad faith dalam komodifikasi spiritual pelaku Tradisi Kungkum Pengging' }
      ]
    }
  },
  'metode-jenis': {
    kelompok: [{ baris: [
      ['1', 'Payung metodologis', 'Kualitatif lapangan atau pustaka.'],
      ['+', 'Justifikasi fokus pendekatan', 'Fenomenologis, filosofis, dan sebagainya.']
    ] }],
    catatan: ['Seluruh bagian metode ditulis dalam bahasa rencana ("akan dilakukan"), bukan bahasa laporan.']
  },
  'metode-sumber': {
    kelompok: [{ baris: [
      ['P', 'Data Primer', 'Data utama yang direkam langsung peneliti dari tangan pertama, misalnya informan di lapangan.'],
      ['S', 'Data Sekunder', 'Data pendukung yang sudah diolah atau diterbitkan pihak lain: arsip, monografi desa, buku, jurnal.']
    ] }]
  },
  'metode-teknik': {
    kelompok: [
      { judul: 'Penelitian lapangan', baris: [
        ['1', 'Wawancara', 'Menggali pengalaman, alasan, dan makna langsung dari informan.'],
        ['2', 'Observasi', 'Mengamati dan mencatat tindakan serta praktik di lokasi penelitian.'],
        ['3', 'Dokumentasi', 'Mengumpulkan arsip, foto, buku, atau jurnal sebagai data pendukung.']
      ] },
      { judul: 'Penelitian pustaka', baris: [
        ['1', 'Dokumentasi', 'Membaca dan mengutip buku, jurnal, atau teks sumber sebagai data utama. Biasanya cukup teknik ini saja.']
      ] }
    ]
  },
  'metode-kisi': {
    // Contoh tabel: bentuk yang ditempel mahasiswa ke kolom ini. Isi contoh hanya ilustrasi.
    tabel: {
      kepala: ['Fokus masalah (konsep)', 'Kategori analitik', 'Indikator', 'Sumber data', 'Teknik pengumpulan data'],
      contoh: [
        { judul: 'Contoh penelitian lapangan', baris: [
          ['Konstruksi kebebasan radikal dan kesadaran otentik pelaku Kungkum', 'Kesadaran dan pilihan bebas subjek (being-for-itself)', 'Pilihan sadar subjek, bukan sekadar rutinitas atau mekanis', 'Pelaku Kungkum, Pemandu Ritual', 'Wawancara, Observasi'],
          ['Dinamika itikad buruk (bad faith) dalam komodifikasi spiritual', 'Penyangkalan tanggung jawab atas pilihan (bad faith)', 'Pelaku menyalahkan takdir atau mitos; ritual bergeser menjadi transaksional', 'Juru Kunci, Pelaku', 'Wawancara, Dokumentasi']
        ] },
        { judul: 'Contoh penelitian pustaka', baris: [
          ['Fungsi dan batas akal sebagai sumber pengetahuan', 'Kedudukan akal dalam memperoleh pengetahuan', 'Pernyataan yang menyebut kemampuan akal dan titik ia berhenti', 'Misykat al-Anwar (primer); kajian tentang al-Ghazali (sekunder)', 'Dokumentasi (pembacaan kritis)'],
          ['Peran cahaya (nur) dalam pengetahuan', 'Perumpamaan cahaya untuk menjelaskan pengetahuan', 'Istilah dan perumpamaan cahaya yang dipakai dalam teks', 'Misykat al-Anwar (primer)', 'Dokumentasi (pembacaan kritis)']
        ] }
      ]
    },
    kelompok: [{ baris: [
      ['1', 'Fokus masalah (konsep)', 'Konsep dari rumusan masalah dan landasan teori yang akan ditelusuri datanya.'],
      ['2', 'Kategori analitik', 'Turunan operasional dari konsep: sudut pandang yang mengarahkan pencarian data, bukan alat ukur.'],
      ['3', 'Indikator', 'Ciri yang dicari dalam data: ujaran, tindakan, atau dokumen pada penelitian lapangan; gagasan, proposisi, atau istilah kunci dalam teks pada penelitian pustaka.'],
      ['4', 'Sumber data', 'Dari mana data diperoleh (informan, lokasi, atau teks), sejalan dengan bagian sumber data di atas.'],
      ['5', 'Teknik pengumpulan data', 'Cara memperoleh data itu (wawancara, observasi, dokumentasi), sejalan dengan bagian teknik pengumpulan data di atas.']
    ] }]
  },
  'metode-analisis': {
    kelompok: [
      { judul: 'Penelitian lapangan', label: 'D-V-I', baris: [
        ['D', 'Deskriptif', 'Menyajikan temuan data secara objektif (kutipan verbatim wawancara atau observasi).'],
        ['V', 'Verstehen', 'Mengulas makna asli, motif, atau persepsi murni dari sudut pandang informan tanpa dicampuri asumsi peneliti.'],
        ['I', 'Interpretatif', 'Mengonfrontasi temuan bersih dengan pisau bedah teori dari Bab II untuk menghasilkan jawaban filosofis.']
      ] },
      { judul: 'Penelitian pustaka', baris: [
        ['1', 'Analisis isi (content analysis)', 'Memilah bagian teks yang relevan, mengelompokkannya ke dalam kategori, lalu menafsirkannya dengan teori atau sumber acuan.']
      ] }
    ]
  },
  'metode-triangulasi': {
    kelompok: [{ baris: [
      ['S', 'Triangulasi Sumber', 'Mengecek data yang sama ke narasumber atau informan yang berbeda.'],
      ['T', 'Triangulasi Teknik', 'Mengecek data yang sama dengan alat atau teknik berbeda (wawancara diuji dengan dokumen atau observasi).']
    ] }]
  },
  sistematika: {
    kelompok: [{ baris: [
      ['1', 'BAB [X] berisi', '[Isi spesifik teks atau data objek material]'],
      ['+', 'Kaitan', '[Kaitan dengan analisis atau teori]']
    ] }],
    catatan: ['Tulis tiap bab sebagai narasi isinya ("Bab pertama berisi …"), tanpa judul bab dan tanpa nama rumus.']
  }
};

const KUNCI_TUTUP = 'unsur-tutup-v1';
const el = (tag, kelas, teks) => {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
};

function bacaTutup() {
  try { return JSON.parse(localStorage.getItem(KUNCI_TUTUP)) ?? {}; } catch { return {}; }
}

/** Bangun satu kotak. Seluruh teks lewat textContent. */
export function buatKotak(kunci, data = UNSUR[kunci]) {
  const kotak = el('div', 'unsur');
  const kepala = el('div', 'unsur-kepala');
  // Satu kalimat saja sebagai judul kotak: tulisan harus memuat unsurnya. Bila unsur bercabang menurut jenis penelitian,
  // yang dipenuhi adalah cabang yang sesuai.
  const bercabang = data.kelompok.some((k) => k.judul);
  kepala.append(el('span', 'unsur-judul', bercabang
    ? 'Tulisan di bagian ini harus memuat unsur berikut, sesuai jenis penelitian Anda.'
    : 'Tulisan di bagian ini harus memuat semua unsur berikut.'));
  if (data.label) kepala.append(el('span', 'unsur-label', data.label));
  const tombol = el('button', 'sekunder kecil unsur-tombol');
  tombol.type = 'button';
  const isi = el('div', 'unsur-isi');
  const idIsi = `unsur-${kunci}`;
  isi.id = idIsi;
  tombol.setAttribute('aria-controls', idIsi);

  for (const k of data.kelompok) {
    if (k.judul) {
      const grup = el('p', 'unsur-grup', k.judul);
      if (k.label) grup.append(el('span', 'unsur-label', k.label));
      isi.append(grup);
    }
    for (const [huruf, judul, uraian] of k.baris) {
      const baris = el('div', 'unsur-baris');
      const teks = el('div');
      teks.append(el('strong', '', judul), document.createElement('br'), document.createTextNode(uraian));
      baris.append(el('span', 'unsur-huruf', huruf), teks);
      isi.append(baris);
    }
  }
  for (const c of data.catatan ?? []) isi.append(el('p', 'unsur-catatan', c));
  if (data.tabel) {
    for (const c of data.tabel.contoh) {
      isi.append(el('p', 'unsur-grup', c.judul));
      const bungkus = el('div', 'unsur-tabel');
      bungkus.tabIndex = 0; // dapat digulir dengan papan ketik bila tabel melebihi lebar layar
      bungkus.setAttribute('role', 'region');
      bungkus.setAttribute('aria-label', `${c.judul}, tabel kisi-kisi instrumen`);
      const tabel = el('table');
      const kepala = el('tr');
      for (const h of data.tabel.kepala) { const th = el('th', '', h); th.scope = 'col'; kepala.append(th); }
      const thead = el('thead');
      thead.append(kepala);
      tabel.append(thead);
      const badan = el('tbody');
      for (const b of c.baris) {
        const tr = el('tr');
        for (const sel of b) tr.append(el('td', '', sel));
        badan.append(tr);
      }
      tabel.append(badan);
      bungkus.append(tabel);
      isi.append(bungkus);
    }
  }
  if (data.bagan) {
    isi.append(el('p', 'unsur-grup', data.bagan.judul));
    const bagan = el('div', 'unsur-bagan');
    bagan.setAttribute('role', 'group');
    bagan.setAttribute('aria-label', data.bagan.judul);
    const kotakBagan = (b) => {
      const k = el('div', 'bagan-kotak');
      k.append(el('span', 'bagan-label', b.label), el('strong', '', b.isi));
      for (const r of b.rincian ?? []) k.append(el('span', 'bagan-rincian', r));
      return k;
    };
    data.bagan.langkah.forEach((l, i) => {
      if (i) bagan.append(el('span', 'bagan-panah', '↓'));
      if (l.sejajar) {
        const dua = el('div', 'bagan-sejajar');
        for (const b of l.sejajar) dua.append(kotakBagan(b));
        bagan.append(dua);
      } else {
        bagan.append(kotakBagan(l));
      }
    });
    isi.append(bagan);
  }

  const atur = (tutup) => {
    isi.hidden = tutup;
    tombol.textContent = tutup ? 'Buka' : 'Tutup';
    tombol.setAttribute('aria-expanded', String(!tutup));
  };
  atur(Boolean(bacaTutup()[kunci]));
  tombol.addEventListener('click', () => {
    const tutup = !isi.hidden;
    atur(tutup);
    const s = bacaTutup();
    if (tutup) s[kunci] = 1; else delete s[kunci];
    try { localStorage.setItem(KUNCI_TUTUP, JSON.stringify(s)); } catch { /* penyimpanan penuh atau dimatikan */ }
  });
  kepala.append(tombol);
  kotak.append(kepala, isi);
  return kotak;
}

/**
 * Pasang semua kotak. Kotak diletakkan tepat di bawah judul kolomnya (label atau kepala daftar), sebelum isian,
 * dan judul itu diberi kelas `sub-unsur` agar menonjol sebagai penanda bagian yang punya unsur.
 * Kolom tanpa judul yang terlihat (bagian satu kolom seperti A, E, H) mendapat kotak di awal kartu.
 */
export function pasangUnsur(akar = document) {
  for (const kunci of Object.keys(UNSUR)) {
    const sasaran = akar.querySelector(`#${kunci}`);
    const kartu = sasaran?.closest('.kartu-isian');
    if (!kartu || kartu.querySelector(`#unsur-${kunci}`)) continue;
    const kotak = buatKotak(kunci);
    const judul = kartu.querySelector(':scope > label:not(.sr), :scope > .kepala-daftar');
    if (judul) {
      judul.classList.add('sub-unsur');
      judul.after(kotak);
    } else {
      kartu.prepend(kotak);
    }
  }
}
