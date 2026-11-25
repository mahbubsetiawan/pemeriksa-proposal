# Ambil data pemeriksaan mahasiswa dari Worker, lalu tampilkan laporan ringkas.
# Dijalankan lewat "Ambil Laporan.bat" (klik dua kali). Berpindah ke folder proyek sendiri, jadi tidak bergantung folder terminal.
# Kata sandi admin hanya ditanyakan sekali per jalan, diketik tersembunyi, dan tidak ditulis ke berkas mana pun.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$env:URL_WORKER = 'https://pemeriksa-proposal.mahbub-afi-uinrms.workers.dev'
if (-not $env:KUNCI_ADMIN) {
  $aman = Read-Host 'Kata sandi admin (tidak tampil saat diketik)' -AsSecureString
  $env:KUNCI_ADMIN = [System.Net.NetworkCredential]::new('', $aman).Password
}

Write-Host ''
Write-Host 'Mengambil data dari Worker...'
node uji/ambil-data.js --ke-data-uji
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Pengambilan data gagal. Periksa kata sandi admin, lalu coba lagi.' -ForegroundColor Red
  exit 1
}

Write-Host ''
node uji/laporan.js

Write-Host ''
Write-Host '== Rekap mahasiswa yang memakai aplikasi ==' -ForegroundColor Cyan
node uji/laporan.js --rekap

Write-Host ''
Write-Host 'Data mentah: uji\privat\pemeriksaan-mentah.json. Rekap untuk Excel: uji\privat\rekap-mahasiswa.csv'
