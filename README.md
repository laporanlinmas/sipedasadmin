# 🛡️ SI-PEDAS
### Sistem Informasi Pedestrian Satlinmas

> Dashboard monitoring resmi untuk kegiatan patroli pedestrian Satuan Perlindungan Masyarakat (Satlinmas) — Bidang SDA dan Linmas.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📊 **Dashboard** | Statistik & grafik data patroli real-time |
| 📋 **Rekap Laporan** | Tabel rekap seluruh laporan kegiatan |
| ✏️ **Input & Edit Laporan** | Form input dan edit data laporan patroli |
| 👥 **Data Satlinmas** | Manajemen data anggota Satlinmas |
| 🗺️ **Peta Pedestrian** | Visualisasi peta area patroli dengan layer interaktif |
| 🖨️ **Cetak Laporan** | Generate PDF laporan individual & kolektif dengan kop surat resmi |

---

## ⚙️ Konfigurasi Environment Variables

Sebelum deploy, buka **Vercel Dashboard → Project → Settings → Environment Variables** dan tambahkan dua variabel berikut:

### 1. `GAS_URL`
URL deploy dari Google Apps Script yang menjadi backend/API.

```
GAS_URL = https://script.google.com/macros/s/XXXXX.../exec
```

---

### 2. `API_KEY`
Kunci autentikasi untuk keamanan request ke GAS backend.

```
API_KEY = BASITH
```

---

## 🗂️ Struktur Project

```
si-pedas/
├── index.html          # Halaman utama (SPA)
├── sw.js               # Service Worker (PWA Offline)
├── manifest.json       # PWA Manifest
├── vercel.json         # Konfigurasi Vercel
├── css/
│   └── style.css       # Gabungan seluruh stylesheet
├── js/
│   ├── ui.js           # Core UI, Config, API & State
│   ├── laporan.js      # Fitur Rekap, Edit & Cetak PDF
│   └── peta.js         # Fitur Peta Interaktif & Layer
└── assets/             # Aset gambar dan icon
```

---

## 🔗 Integrasi Portal
Sistem ini telah dimodifikasi untuk integrasi sebagai menu mandiri dalam portal utama:
- **Tanpa Login**: Fitur login internal dihapus, akses langsung diberikan sebagai Admin.
- **Tombol Kembali**: Navigasi logout diganti menjadi tombol "Kembali" ke menu utama portal.
- **Optimasi Aset**: Seluruh CSS dan JS digabung menjadi 3 file JS utama (`ui.js`, `laporan.js`, `peta.js`) dan 1 file CSS (`style.css`).

---

## 🚀 Deploy ke Vercel

```bash
# 1. Clone / download project
git clone https://github.com/username/si-pedas.git
cd si-pedas

# 2. Deploy
vercel --prod
```

---

## 🔐 Keamanan

Project ini dilengkapi security headers lengkap via `vercel.json`:

- `Strict-Transport-Security` — paksa HTTPS
- `X-Frame-Options: SAMEORIGIN` — cegah clickjacking
- `X-Content-Type-Options: nosniff` — cegah MIME sniffing
- `Content-Security-Policy` — batasi sumber resource yang diizinkan
- `Referrer-Policy` — kontrol data referrer
- `Permissions-Policy` — batasi akses kamera/mikrofon

---

## 🛠️ Teknologi

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: [Chart.js](https://www.chartjs.org/) v4.4
- **Icons**: [Font Awesome](https://fontawesome.com/) 6.5
- **Fonts**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) + JetBrains Mono
- **Maps**: Leaflet.js
- **Backend**: Google Apps Script (GAS)
- **Hosting**: [Vercel](https://vercel.com)

---

## 📄 Lisensi

© 2026 **Bidang SDA dan Linmas**. Sistem ini dikembangkan untuk keperluan internal instansi. Dilarang menggunakan, mendistribusikan, atau memodifikasi tanpa izin.

---

<p align="center">
  Dikembangkan dengan ❤️ untuk Satlinmas
</p>
