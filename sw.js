// Service worker: cakupan otomatis hanya folder tempat berkas ini berada.
// Hanya menyimpan berkas aplikasi sendiri; tidak ada panggilan jaringan lain.
const NAMA_CACHE = 'pemeriksa-proposal-v52';
const BERKAS = [
  './', './index.html', './manifest.webmanifest', './gaya.css',
  './js/aturan.js', './js/klien-ai.js', './js/konfigurasi.js', './rubrik/A-latar.json', './rubrik/D-manfaat.json', './rubrik/H-sistematika.json', './rubrik/E-tinjauan.json', './rubrik/F-landasan.json', './rubrik/G-metode.json', './rubrik/K-koherensi.json', './fonts/Inter-latin.woff2', './fonts/SourceSerif4-latin.woff2', './fonts/SourceSerif4-italic-latin.woff2', './js/tampilan.js',
  './rubrik/B-rumusan.json', './rubrik/C-tujuan.json',
  './ikon/ikon-192.png', './ikon/ikon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(NAMA_CACHE).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((n) => n !== NAMA_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Jaringan lebih dulu agar pembaruan langsung terlihat; cache hanya cadangan saat luring.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }) // validasi ulang agar pembaruan tidak tertahan cache peramban
      .then((r) => {
        if (r.ok) { const salinan = r.clone(); caches.open(NAMA_CACHE).then((c) => c.put(e.request, salinan)); }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
