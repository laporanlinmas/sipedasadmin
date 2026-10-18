/**
 * Seed data demo ke Firestore — koleksi `aduan` (32 dokumen).
 *
 *   node --experimental-strip-types scripts/seed-aduan.mts
 *   node --experimental-strip-types scripts/seed-aduan.mts --keep
 *
 * Karakteristik data:
 *  • 32 aduan, rentang Januari–Oktober 2026.
 *  • Tren bulanan MENURUN (6 → 2) dengan naik-turun tipis, mengikuti bentuk
 *    kurva laporan: gangguan yang masuk makin berkurang dari bulan ke bulan.
 *  • 100% sudah tertangani: seluruh dokumen status `Selesai` dan sudah punya
 *    `catatan` tindak lanjut.
 *  • Kategori memakai 7 kategori resmi portal Sapa Pedestrian.
 *  • Skema dokumen PERSIS sama dengan portal, sehingga dashboard
 *    sipedasadmin membaca utuh tanpa konversi.
 *
 * Opsi:
 *   --keep      jangan hapus aduan lama (tambah data baru saja)
 *   --dry-run  hanya susun & tampilkan data, TIDAK menulis ke Firestore
 */
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from './lib/firestore.mts';
import { createRng, fmtIso, fmtSortKey, fmtTimestamp, pad, partsOf } from './lib/wib.mts';

const KEEP_OLD = process.argv.includes('--keep');
const DRY_RUN = process.argv.includes('--dry-run');

/* 32 aduan tersebar 10 bulan, tren menurun dengan fluktuasi tipis:
     Jan 6 · Feb 5 · Mar 4 · Apr 3 · Mei 3 · Jun 2 · Jul 3 · Agu 2 · Sep 2 · Okt 2 = 32 */
const PLAN = [
  { month: 1, count: 6 },
  { month: 2, count: 5 },
  { month: 3, count: 4 },
  { month: 4, count: 3 },
  { month: 5, count: 3 },
  { month: 6, count: 2 },
  { month: 7, count: 3 },
  { month: 8, count: 2 },
  { month: 9, count: 2 },
  { month: 10, count: 2 },
];
const YEAR = 2026;

const rng = createRng(20261018);

const NAMA = [
  'Ahmad Basith', 'Siti Aminah', 'Budi Santoso', 'Rina Wulandari', 'Agus Setiawan',
  'Dewi Lestari', 'Rizky Firmansyah', 'Nurul Hidayah', 'Eko Prasetyo', 'Lina Marlina',
  'Hendra Gunawan', 'Putri Ayu', 'Wahyu Nugroho', 'Retno Wulandari', 'Fajar Mahmudi',
  'Indah Permata', 'Bambang Sutrisno', 'Sri Handayani', 'Arif Kurniawan', 'Maya Sari',
  'Dian Prakoso', 'Yuni Astuti', 'Teguh Prasada', 'Mega Puspitasari', 'Ilham Nurcahyo',
];

const KATEGORI = [
  'Ketertiban Umum',
  'Kebersihan',
  'Kerusakan Fasilitas',
  'Parkir Liar',
  'PKL Melanggar',
  'Keamanan',
  'Lainnya',
];

const LOKASI = [
  'Trotoar Jl. Ahmad Yani, Ponorogo',
  'Area Pedestrian Alun-Alun Ponorogo',
  'Trotoar Jl. Sultan Hasanuddin, Ponorogo',
  'Halte Angkutan Umum Jl. Dr. Kartini',
  'Lampu Penerangan Jl. Yos Sudarso',
  'Trotoar Depan Pasar Klewer',
  'Area Pedestrian Samping Masjid Agung',
  'Trotoar Jl. R.A. Kartini',
  'Ramp Difabel Depan Gedung Ptrw',
  'Trotoar Jl. Teuku Umar',
  'Area Car Free Day Jl. Ahmad Yani',
  'Trotoar Depan SDN 2 Ponorogo',
  'Halaman Parkir Pasar Ponorogo',
  'Trotoar Jl. Pangeran Diponegoro',
];

const DESKRIPSI: Record<string, string[]> = {
  'Ketertiban Umum': [
    'Terduga mabuk berteriak dan mengganggu pejalan kaki di trotoar. Mohon ditertibkan.',
    'Ada kelompok berjudi dan minum miras di area pedestrian hingga dini hari.',
    'Sekelompok pemuda berjudi di dekat pos satgas sampai larut malam. Mohon ditertibkan.',
  ],
  'Kebersihan': [
    'Pembuangan sampah sembarangan di dekat tempat duduk sehingga berbau busuk.',
    'Saluran air tersumbat dan menyebabkan genangan air yang tidak kering.',
    'Sampah plastik dari warung dibuang ke selokan. Mohon penyapuan rutin pagi dan sore.',
  ],
  'Kerusakan Fasilitas': [
    'Trotoar pecah dan berlubang besar, berbahaya bagi pengguna kursi roda dan anak kecil.',
    'Lampu jalan mati sejak seminggu lalu di sisi timur sehingga area gelap saat malam.',
    'Papan petunjuk jalan miring dan tiangnya hilang sehingga membingungkan pengunjung.',
  ],
  'Parkir Liar': [
    'Mobil parkir liar di atas trotoar sehingga pejalan kaki harus berjalan di tepi jalan.',
    'Motor dan mobil meparkir di depan trotoar sehingga jalur pejalan kaki tertutup.',
    'Parkir sembarangan di dekat persimpangan yang membuat lalu lintas menjadi kacau.',
  ],
  'PKL Melanggar': [
    'PKL berjualan di dalam area pedestrian di luar titik yang telah ditetapkan.',
    'Kios dagang berdiri di atas trotoar dan menutup jalur akses difabel.',
    'PKL masih berjualan di trotoar jalan sehingga mengganggu pejalan kaki.',
  ],
  'Keamanan': [
    'Terjadi keributan antara dua kelompok di dekat area pedestrian. Mohon segera merespons.',
    'Dugaan pemerasan oleh parkir liar di sekitar area pedestrian. Mohon ditertibkan.',
    'Ribut antar pedagang yang meningkat menjadi perkelahian. Mohon segera ditertibkan.',
  ],
  'Lainnya': [
    'Suara musik dari karaoke yang keras sampai jauh, mengganggu penghuni sekitar.',
    'Lampu jalan berkedip terus-menerus sepanjang malam sehingga mengganggu warga.',
    'Toilet umum dalam kondisi hygiene buruk dan tidak tersedia air.',
  ],
};

/* Tindak lanjut petugas — dipakai seluruh dokumen karena 100% sudah tertangani */
const TINDAK_LANJUT = [
  'Selesai. Lokasi sudah dibersihkan dan dijadwalkan penyapuan rutin dua kali sehari.',
  'Selesai. Petugas telah menertibkan pelaku pelanggaran dan lokasi sudah ditata.',
  'Telah ditangani. Laporan telah diverifikasi dan tindak lanjut lapangan.',
  'Selesai. Trotoar sudah diperbaiki dan akses difabel kembali normal.',
  'Selesai ditindaklanjuti. Pelanggaran sudah ditertibkan dan lokasi dalam kendali.',
  'Telah selesai. Patroli malam dilanjutkan dan jalur pejalan kaki kembali normal.',
  'Selesai. Lampu jalan telah diperbaiki dan pencahayaan kembali optimal.',
  'Telah ditangani. Kios yang berjualan di lokasi terlarang sudah dipindahkan dan ditata.',
  'Selesai. Jalur pejalan kaki sudah kembali bebas hambatan.',
  'Selesai. Toilet umum sudah dibersihkan dan air tersedia kembali.',
];

const STATUS = 'Selesai';

interface AduanRow {
  ticket: string;
  timestamp: string;
  timestampISO: string;
  sortKey: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  fotos: string[];
  jumlahFoto: number;
  status: string;
  catatan: string;
  fotoTindakLanjut: string;
  updatedAt: string;
  source: string;
}

function buildRows(): AduanRow[] {
  const rows: AduanRow[] = [];
  const used = new Set<string>();
  const today = new Date();

  for (const { month, count } of PLAN) {
    // Oktober: batas hari = tanggal hari ini.
    const maxDay = month === 10 ? Math.min(28, Number(fmtIso(today).slice(8, 10))) : 28;
    const days = new Set<number>();
    while (days.size < count) days.add(rng.int(1, maxDay));

    for (const day of days) {
      const hour = rng.pick([16, 17, 18, 19, 20, 21]);
      const t = new Date(
        Date.parse(`${YEAR}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(rng.int(0, 59))}:${pad(rng.int(0, 59))}+07:00`),
      );

      let ticket: string;
      do {
        ticket = `ADU-${String(YEAR).slice(-2)}${pad(month)}${pad(day)}-${String(rng.int(0, 9999)).padStart(4, '0')}`;
      } while (used.has(ticket));
      used.add(ticket);

      const kategori = rng.pick(KATEGORI);
      // Ditindaklanjuti 1–3 hari setelah laporan masuk.
      const done = new Date(t.getTime() + rng.int(1, 3) * 86_400_000 + rng.int(1, 6) * 3_600_000);

      rows.push({
        ticket,
        timestamp: fmtTimestamp(t),
        timestampISO: fmtIso(t),
        sortKey: fmtSortKey(t),
        nama: rng.pick(NAMA),
        kategori,
        lokasi: rng.pick(LOKASI),
        deskripsi: rng.pick(DESKRIPSI[kategori] ?? []),
        fotos: [],
        jumlahFoto: 0,
        status: STATUS,
        catatan: rng.pick(TINDAK_LANJUT),
        fotoTindakLanjut: '',
        updatedAt: fmtTimestamp(done),
        source: rng.next() < 0.25 ? 'Chatbot' : 'Website',
      });
    }
  }

  return rows.sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));
}

const rows = buildRows();

if (DRY_RUN) {
  const statusCount: Record<string, number> = {};
  const perBulan: Record<number, number> = {};
  for (const r of rows) {
    statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
    const bulan = Number(r.timestamp.slice(3, 5));
    perBulan[bulan] = (perBulan[bulan] ?? 0) + 1;
  }
  const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt'];
  console.log(`\n=== DRY RUN — ${rows.length} dokumen (tidak ditulis) ===`);
  console.log(`Status : ${JSON.stringify(statusCount)}`);
  NAMA_BULAN.forEach((n, i) => {
    const c = perBulan[i + 1] ?? 0;
    console.log(`  ${n}: ${String(c).padStart(2)} ${'█'.repeat(c)}`);
  });
  console.log(`\nContoh : ${JSON.stringify(rows[0])}`);
  process.exit(0);
}

const db = firestore();

/* ── 1. Kosongkan koleksi lama (kecuali --keep) ─────────────────────────── */
if (!KEEP_OLD) {
  const lama = await getDocs(collection(db, 'aduan'));
  console.log(`Menghapus ${lama.docs.length} aduan lama…`);
  for (const d of lama.docs) await deleteDoc(doc(db, 'aduan', d.id));
  const sisa = await getDocs(collection(db, 'aduan'));
  console.log(`Sisa setelah hapus: ${sisa.size} dokumen`);
  if (sisa.size !== 0) {
    console.error('✗ Koleksi belum kosong — seed dibatalkan.');
    process.exit(1);
  }
}

/* ── 2. Tulis 32 aduan baru ──────────────────────────────────────────────── */
console.log(`Menulis ${rows.length} aduan baru…`);
for (let i = 0; i < rows.length; i += 50) {
  const batch = writeBatch(db);
  for (const r of rows.slice(i, i + 50)) batch.set(doc(db, 'aduan', r.ticket), r);
  await batch.commit();
}

/* ── 3. Verifikasi ───────────────────────────────────────────────────────── */
const snap = await getDocs(collection(db, 'aduan'));
const statusCount: Record<string, number> = {};
const perBulan: Record<number, number> = {};
for (const d of snap.docs) {
  const x = d.data() as { status?: string; timestamp?: string };
  const status = x.status ?? '(kosong)';
  statusCount[status] = (statusCount[status] ?? 0) + 1;
  const bulan = Number(String(x.timestamp ?? '').slice(3, 5));
  perBulan[bulan] = (perBulan[bulan] ?? 0) + 1;
}

const total = snap.docs.length;
const selesai = statusCount.Selesai ?? 0;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt'];

console.log('\n=== VERIFIKASI ===');
console.log(`Total aduan     : ${total}`);
console.log(`Status          : ${JSON.stringify(statusCount)}`);
console.log(`Tertangani      : ${selesai}/${total} (${Math.round((selesai / total) * 100)}%)`);
console.log(`Punya catatan   : ${snap.docs.filter(d => String((d.data() as { catatan?: string }).catatan ?? '').trim()).length}/${total}`);
console.log('\nTren bulanan (grafik beranda):');
NAMA_BULAN.forEach((n, i) => {
  const c = perBulan[i + 1] ?? 0;
  console.log(`  ${n}: ${String(c).padStart(2)} ${'█'.repeat(c)}`);
});
console.log(`\nContoh dokumen  : ${JSON.stringify(snap.docs[0]?.data() ?? {})}`);
process.exit(0);
