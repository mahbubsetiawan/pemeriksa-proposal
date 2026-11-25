#!/usr/bin/env python3
"""Ekstrak proposal skripsi berformat PDF menjadi satu butir data uji (uji/data-uji.json).

Alat bantu pengujian untuk pemilik; bukan bagian aplikasi web. Memerlukan Python 3 dan PyMuPDF
(`pip install pymupdf`). Berjalan sepenuhnya di komputer ini, tanpa jaringan.

Cara kerja: membaca PDF, membuang catatan kaki, penanda catatan kaki, dan nomor halaman (berdasarkan ukuran
huruf: teks isi adalah ukuran yang paling banyak dipakai), lalu memecah teks menurut judul bagian A sampai H.
Huruf bagian dipakai sebagai kunci, jadi judulnya boleh berbeda ("Kajian Pustaka" tetap dibaca sebagai E).

Pemakaian:
  python -I uji/ekstrak_pdf.py proposal.pdf --id mhs-01 --teori "Etika Epictetus" \
      --konsep "dikotomi kendali, ataraxia" --objek "Buku Filosofi Teras" --tambah uji/data-uji.json

Tanpa --tambah, hasil dicetak ke layar. Ringkasan dan peringatan selalu ke stderr; periksa sebelum dipakai.
Tabel (misalnya kisi-kisi) sering tidak terbaca rapi dari PDF; periksa bagian itu secara manual.
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    sys.exit('PyMuPDF belum terpasang. Jalankan: pip install pymupdf')

HURUF_BAGIAN = 'ABCDEFGH'
NAMA_LAZIM = {  # hanya untuk peringatan bila judul tampak tidak cocok dengan huruf
    'A': 'latar', 'B': 'rumusan', 'C': 'tujuan', 'D': 'manfaat', 'E': 'pustaka|terdahulu|tinjauan',
    'F': 'landasan|teori|kerangka', 'G': 'metode', 'H': 'sistematika'
}
RE_JUDUL = re.compile(r'^([A-H])\.\s+(\S.*)$')
RE_BUTIR = re.compile(r'^\s*(?:\d{1,2}[.)]|[-•])\s+')
RE_SUB_G = [
    ('jenis', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*(jenis|pendekatan)\b.*penelitian', re.I)),
    ('sumber', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*sumber\s+data', re.I)),
    ('teknik', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*teknik\s+pengumpulan', re.I)),
    ('kisi', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*kisi', re.I)),
    ('analisis', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*(metode|teknik)?\s*analisis\s+data', re.I)),
    ('triangulasi', re.compile(r'^\s*(?:\d+[.)]|[a-z][.)])?\s*(triangulasi|(uji\s+)?keabsahan|validitas)', re.I)),
]


def baca_baris(pdf):
    """Daftar baris isi: (halaman, x0, x1, teks, tebal). Catatan kaki dan nomor halaman dibuang."""
    ukuran = Counter()
    for h in pdf:
        for b in h.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    ukuran[round(s['size'], 1)] += len(s['text'].strip())
    if not ukuran:
        sys.exit('PDF tidak memiliki lapisan teks (mungkin hasil pindai). Lakukan OCR terlebih dahulu.')
    dasar = ukuran.most_common(1)[0][0]
    baris = []
    for no, h in enumerate(pdf, 1):
        for b in h.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                bagian = [s for s in l['spans'] if s['size'] >= dasar - 0.5]
                teks = ''.join(s['text'] for s in bagian).replace(' ', ' ')
                if not teks.strip() or re.fullmatch(r'\s*\d{1,3}\s*', teks):
                    continue
                tebal = all((s['flags'] & 16) or 'bold' in s['font'].lower() for s in bagian if s['text'].strip())
                baris.append({'h': no, 'x0': l['bbox'][0], 'x1': l['bbox'][2], 'teks': teks.strip(), 'tebal': bool(tebal)})
    return baris


def sambung(a, b):
    """Gabung dua potongan baris; kata yang terpenggal tanda hubung disambung tanpa spasi."""
    if re.search(r'[A-Za-z]-$', a) and b[:1].islower():
        return a + b
    return f'{a} {b}'


def jadikan_paragraf(baris):
    """Kelompokkan baris menjadi paragraf: menjorok atau didahului baris pendek berarti paragraf baru."""
    if not baris:
        return []
    kanan = max(b['x1'] for b in baris)
    hasil, sebelum = [], None
    for b in baris:
        baru = sebelum is None
        if not baru:
            if b['x0'] > sebelum['x0'] + 15:
                baru = True
            elif sebelum['x1'] < kanan - 30 and b['h'] == sebelum['h']:
                baru = True
            elif RE_BUTIR.match(b['teks']) or (b['tebal'] and not sebelum['tebal']):
                baru = True
        if baru:
            hasil.append(b['teks'])
        else:
            hasil[-1] = sambung(hasil[-1], b['teks'])
        sebelum = b
    return [re.sub(r'\s+', ' ', p).strip() for p in hasil if p.strip()]


def pecah_bagian(baris):
    """{huruf: {'judul': str, 'baris': [...]}} berdasarkan judul tebal 'A. ...' sampai 'H. ...'."""
    bagian, sekarang, berikut = {}, None, 0
    for b in baris:
        m = RE_JUDUL.match(b['teks'])
        if m and b['tebal'] and m.group(1) == HURUF_BAGIAN[berikut:berikut + 1]:
            sekarang = m.group(1)
            bagian[sekarang] = {'judul': m.group(2).strip(), 'baris': []}
            berikut += 1
            continue
        if sekarang and not re.fullmatch(r'(DAFTAR PUSTAKA|DAFTAR ISI)\W*', b['teks'], re.I):
            bagian[sekarang]['baris'].append(b)
        elif sekarang and re.fullmatch(r'DAFTAR PUSTAKA\W*', b['teks'], re.I):
            sekarang = None  # daftar pustaka bukan bagian proposal yang diperiksa
    return bagian


def teks_bersih(paragraf):
    return '\n\n'.join(paragraf)


def daftar_butir(paragraf):
    """Rumusan atau tujuan: satu butir per nomor; tanpa nomor, tiap paragraf menjadi satu butir."""
    butir = []
    for p in paragraf:
        if RE_BUTIR.match(p) or not butir:
            butir.append(RE_BUTIR.sub('', p, count=1).strip())
        else:
            butir[-1] = sambung(butir[-1], p)
    return [b for b in butir if b]


def pecah_manfaat(paragraf):
    teoretis, praktis, kini = [], [], None
    for p in paragraf:
        if re.match(r'^\s*(?:\d+[.)])?\s*manfaat\s+teor', p, re.I) and len(p) < 60:
            kini = teoretis
        elif re.match(r'^\s*(?:\d+[.)])?\s*manfaat\s+praktis', p, re.I) and len(p) < 60:
            kini = praktis
        elif kini is not None:
            kini.append(p)
    return teks_bersih(teoretis), teks_bersih(praktis)


def pecah_metode(paragraf):
    hasil = {k: [] for k, _ in RE_SUB_G}
    kini = None
    for p in paragraf:
        if len(p) < 70:
            cocok = next((k for k, r in RE_SUB_G if r.match(p)), None)
            if cocok:
                kini = cocok
                continue
        if kini:
            hasil[kini].append(p)
    return {k: teks_bersih(v) for k, v in hasil.items()}


def pecah_landasan(paragraf):
    landasan, kerangka = [], []
    kini = landasan
    for p in paragraf:
        if len(p) < 60 and re.search(r'kerangka\s+(pemikiran|berpikir|konseptual)', p, re.I):
            kini = kerangka
            continue
        kini.append(p)
    return teks_bersih(landasan), teks_bersih(kerangka)


def ekstrak(jalur, id_butir, teori='', konsep='', objek=''):
    pdf = pymupdf.open(jalur)
    bagian = pecah_bagian(baca_baris(pdf))
    para = {k: jadikan_paragraf(v['baris']) for k, v in bagian.items()}
    peringatan = []
    for k in HURUF_BAGIAN:
        if k not in bagian:
            peringatan.append(f'Bagian {k} tidak ditemukan (judul tebal "{k}. ..." tidak terbaca).')
        elif not para[k]:
            peringatan.append(f'Bagian {k} ("{bagian[k]["judul"]}") kosong.')
        elif not re.search(NAMA_LAZIM[k], bagian[k]['judul'], re.I):
            peringatan.append(f'Judul bagian {k} tidak lazim: "{bagian[k]["judul"]}". Pastikan isinya memang bagian itu.')
    teoretis, praktis = pecah_manfaat(para.get('D', []))
    landasan, kerangka = pecah_landasan(para.get('F', []))
    metode = pecah_metode(para.get('G', []))
    if not (teoretis or praktis) and para.get('D'):
        peringatan.append('Bagian D tidak memuat judul "Manfaat Teoretis/Praktis"; isinya tidak diambil.')
    if para.get('G') and not any(metode.values()):
        peringatan.append('Bagian G tidak memuat judul butir yang dikenal (Jenis, Sumber Data, Teknik Pengumpulan, Analisis Data).')
    if not kerangka:
        peringatan.append('Kerangka pemikiran tidak ditemukan (wajar bila proposal memang tidak memuatnya).')
    butir = {
        'id': id_butir,
        'catatan': f'Diekstrak otomatis dari {Path(jalur).name}. Periksa hasilnya; isi "penilaian" dengan penilaian Anda sendiri.',
        'teori': teori, 'konsep': konsep, 'objek': objek,
        'latar': teks_bersih(para.get('A', [])),
        'rumusan': daftar_butir(para.get('B', [])),
        'tujuan': daftar_butir(para.get('C', [])),
        'teoretis': teoretis, 'praktis': praktis,
        'tinjauan': teks_bersih(para.get('E', [])),
        'landasan': landasan, 'kerangka': kerangka,
        **metode,
        'sistematika': teks_bersih(para.get('H', [])),
        'penilaian': {}
    }
    for k in ('teori', 'konsep', 'objek'):
        if not butir[k]:
            peringatan.append(f'Isian "{k}" kosong; beberapa kriteria B, F, dan K membutuhkannya (--{k}).')
    return butir, bagian, peringatan


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('pdf')
    a.add_argument('--id', required=True, help='pengenal butir tanpa identitas mahasiswa, misalnya mhs-01')
    a.add_argument('--teori', default='')
    a.add_argument('--konsep', default='')
    a.add_argument('--objek', default='')
    a.add_argument('--tambah', help='berkas data uji JSON; butir ditambahkan (id yang sama diganti)')
    arg = a.parse_args()

    butir, bagian, peringatan = ekstrak(arg.pdf, arg.id, arg.teori, arg.konsep, arg.objek)
    print('Judul bagian terbaca:', file=sys.stderr)
    for k in HURUF_BAGIAN:
        print(f'  {k}. {bagian.get(k, {}).get("judul", "(tidak ada)")}', file=sys.stderr)
    print(f'Rumusan: {len(butir["rumusan"])} butir; tujuan: {len(butir["tujuan"])} butir.', file=sys.stderr)
    for kunci in ('latar', 'teoretis', 'praktis', 'tinjauan', 'landasan', 'kerangka', 'jenis', 'sumber', 'teknik', 'kisi', 'analisis', 'triangulasi', 'sistematika'):
        print(f'  {kunci}: {len(butir[kunci])} karakter', file=sys.stderr)
    for p in peringatan:
        print('PERINGATAN:', p, file=sys.stderr)

    if arg.tambah:
        jalur = Path(arg.tambah)
        data = json.loads(jalur.read_text(encoding='utf-8')) if jalur.exists() else []
        data = [d for d in data if d.get('id') != butir['id']] + [butir]
        jalur.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'Butir "{butir["id"]}" ditulis ke {jalur} ({len(data)} butir).', file=sys.stderr)
    else:
        print(json.dumps(butir, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
