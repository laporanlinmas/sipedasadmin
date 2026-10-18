# Skrip operasional SIPEDAS Admin

Skrip utilitas untuk mengisi, memeriksa, dan mengosongkan data demo.
Semua berkas memakai TypeScript `.mts` dan **tidak ikut ter-deploy ke Vercel**
(diabaikan lewat `.vercelignore`).

> **Butuh Node.js 22.6+** (type stripping bawaan Node). Kalauversi lokal
> masih 20, jalankan `nvm use 22` lebih dulu.

## Firestore (data demo)

| Perintah | Fungsi |
| --- | --- |
| `npm run seed:aduan` | Tulis ulang 32 aduan (Jan–Okt 2026, tren menurun, 100% `Selesai`) |
| `npm run seed:survey` | Tulis ulang 130 rating (rata-rata tepat 4,6 bintang) |
| `npm run verify:aduan` | Cek kelengkapan aduan + simulasi kartu/grafik Dashboard |
| `npm run verify:survey` | Cek kelengkapan rating + pastikan koleksi lain utuh |
| `npm run purge:firestore` | Kosongkan `aduan` + `survey_kepuasan` (butuh `--delete` + service account admin) |

Opsi tambahan:

```bash
npm run seed:aduan -- --keep     # tambah data baru, jangan hapus yang lama
npm run seed:survey -- --keep
npm run purge:firestore -- --delete
```

Skema dokumen sama persis dengan portal Sapa Pedestrian, jadi dashboard
`SIPEDAS Admin` membaca utuh tanpa konversi:

- **aduan** — `ticket` (ID dokumen), `timestamp` (`DD/MM/YYYY HH:MM:SS`),
  `timestampISO` (`+07:00`), `sortKey` (`YYYYMMDDHHmmss`), `nama`, `kategori`,
  `lokasi`, `deskripsi`, `fotos[]`, `jumlahFoto`, `status`, `catatan`,
  `fotoTindakLanjut`, `updatedAt`, `source`.
- **survey_kepuasan** — `nama`, `pekerjaan`, `rating` (1–5), `saran`,
  `createdAt`.

## Google Workspace

| Perintah | Fungsi |
| --- | --- |
| `npm run check:satlinmas` | Isi sheet "Data Satlinmas" (jumlah baris berisi NAMA) |
| `npm run check:drive` | Daftar spreadsheet di dalam folder Drive utama |

## Struktur

```
scripts/
├── lib/
│   ├── env.mts        # baca .env di root project
│   ├── firestore.mts  # klien Firestore (firebase/app + firebase/firestore)
│   └── wib.mts        # format waktu WIB, parser, RNG ber-seed
├── seed-aduan.mts
├── seed-survey.mts
├── verify-aduan.mts
├── verify-survey.mts
├── check-satlinmas.mts
├── check-drive.mts
└── purge-firestore.mts
```

Kredensial dibaca dari `.env` di root project (tidak pernah ikut ter-commit).
