/**
 * Seed data demo ke Firestore — koleksi `survey_kepuasan` (130 dokumen).
 *
 *   node --experimental-strip-types scripts/seed-survey.mts
 *   node --experimental-strip-types scripts/seed-survey.mts --keep
 *
 * Distribusi bintang disetel agar rata-rata tepat 4,6:
 *   5★ = 90 · 4★ = 30 · 3★ = 8 · 2★ = 2  →  598 / 130 = 4,60
 *
 * Skema dokumen sama dengan portal Sapa Pedestrian:
 *   nama, pekerjaan, rating (1–5), saran, createdAt
 * `saran` dikosongkan pada ±25% dokumen (opsional di portal).
 *
 * Opsi:
 *   --keep      jangan hapus rating lama (tambah data baru saja)
 *   --dry-run  hanya susun & tampilkan data, TIDAK menulis ke Firestore
 */
import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from './lib/firestore.mts';
import { createRng, fmtIso, fmtSortKey } from './lib/wib.mts';

const KEEP_OLD = process.argv.includes('--keep');
const DRY_RUN = process.argv.includes('--dry-run');

const SURVEY_PLAN = [
  { rating: 5, count: 90 },
  { rating: 4, count: 30 },
  { rating: 3, count: 8 },
  { rating: 2, count: 2 },
];

const rng = createRng(20261018);

const NAMA = [
  'Ahmad Basith', 'Siti Aminah', 'Budi Santoso', 'Rina Wulandari', 'Agus Setiawan',
  'Dewi Lestari', 'Rizky Firmansyah', 'Nurul Hidayah', 'Eko Prasetyo', 'Lina Marlina',
  'Hendra Gunawan', 'Putri Ayu', 'Wahyu Nugroho', 'Retno Wulandari', 'Fajar Mahmudi',
  'Indah Permata', 'Bambang Sutrisno', 'Sri Handayani', 'Arif Kurniawan', 'Maya Sari',
  'Dian Prakoso', 'Yuni Astuti', 'Teguh Prasada', 'Mega Puspitasari', 'Ilham Nurcahyo',
  'Ratna Kumala', 'Surya Dharma', 'Fitri Handayani', 'Bayu Anggara', 'Wulan Sari',
  'Doni Saputra', 'Elvira Natalia', 'Gilang Ramadhan', 'Hesti Rahmawati', 'Imam Sholihin',
];

const PEKERJAAN = [
  'Warga umum', 'Pedagang kaki lima', 'Guru', 'Karyawan swalayan', 'Pegawai negeri',
  'Mahasiswa', 'Sopir angkot', 'Pedagang Pasar Ponorogo', 'Buruh harian', 'Ibu rumah tangga',
  'Pensiunan', 'Pelajar SMA', 'Driver ojek online', 'Seller online', 'Buruh bangunan',
];

const SARAN: Record<number, string[]> = {
  5: [
    'Petugas sigap dan ramah, kawasan pedestrian jadi lebih aman dan bersih.',
    'Pelayanan memuaskan, petugas cepat membantu saat saya meminta pertolongan.',
    'Trotoar dan lampu penerangan sudah jauh lebih baik dari tahun lalu.',
    'Patroli petugas sering terlihat sehingga saya merasa aman berjalan di sini.',
    'Laporan yang saya kirim langsung ditindaklanjuti dengan cepat.',
    'Fasilitas umum makin rapi, dari tempat duduk sampai saluran air.',
    'Apresiasi tinggi untuk petugas yang menjaga keamanan pedestrian setiap malam.',
    'Layanan chatbot sangat membantu saat saya tidak tahu harus melapor ke mana.',
    'Kondisi kawasan sudah sangat baik dan tidak ada keluhan yang saya temukan.',
    'Saya pasti merekomendasikan layanan ini kepada teman dan tetangga.',
  ],
  4: [
    'Sudah bagus, tapi kadang ada genangan air di dekat saluran air. Mohon dibersihkan rutin.',
    'Pelayanan bagus, hanya kadang lambat merespons laporan melalui WhatsApp.',
    'Petugas cepat dan ramah. Area parkir perlu ditata lebih rapi.',
    'Sudah memuaskan, tombol lampu merah di dekat penyeberangan perlu diperbaiki.',
    'Bagus, tapi beberapa kabel di trotoar perlu dirapikan agar pejalan kaki tidak kesulitan.',
    'Nyaman dan aman. Mohon ditambah tempat duduk di koridor yang panjang.',
    'Sudah baik, tetapi beberapa titik pencahayaan belum diperbarui.',
    'Sudah bagus, hanya beberapa bangku taman yang masih patah.',
  ],
  3: [
    'Lumayan, tapi masih banyak lampu jalan yang mati di sisi timur.',
    'Cukup baik. Trotoar di beberapa titik masih berlubang.',
    'Oke, tetapi masih bisa lebih baik lagi dari sisi kecepatan respon petugas.',
    'Standar. Sudah baik, tapi masih ada ruang untuk peningkatan pelayanan.',
    'Lumayan bagus, kami berharap jumlah petugas di akhir pekan ditambah.',
  ],
  2: [
    'Kurang memuaskan, petugas sering tidak ada saat saya butuh bantuan.',
    'Perlu perbaikan serius, beberapa laporan yang saya kirim belum ditindaklanjuti.',
  ],
};

interface SurveyRow {
  nama: string;
  pekerjaan: string;
  rating: number;
  saran: string;
  createdAt: string;
  _sort: string;
}

const DAY = 86_400_000;
const NOW = Date.now();

function randomTime(daysBack: number, hours: number[]): Date {
  const base = NOW - rng.int(1, daysBack) * DAY;
  const day = fmtIso(new Date(base)).slice(0, 10);
  return new Date(
    Date.parse(
      `${day}T${String(rng.pick(hours)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}+07:00`,
    ),
  );
}

function buildRows(): SurveyRow[] {
  const rows: SurveyRow[] = [];
  for (const { rating, count } of SURVEY_PLAN) {
    const pool = SARAN[rating] ?? [];
    for (let i = 0; i < count; i++) {
      const t = randomTime(75, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      rows.push({
        nama: rng.pick(NAMA),
        pekerjaan: rng.pick(PEKERJAAN),
        rating,
        // ±25% kolom "Masukan" sengaja dikosongkan (opsional di portal).
        saran: rng.next() < 0.25 ? '' : pool[i % pool.length] ?? '',
        createdAt: new Date(t.getTime() - 7 * 3_600_000).toISOString(),
        _sort: fmtSortKey(t),
      });
    }
  }
  return rows.sort((a, b) => (a._sort < b._sort ? 1 : -1));
}

const rows = buildRows();

if (DRY_RUN) {
  const dist: Record<number, number> = {};
  let sum = 0;
  for (const r of rows) {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    sum += r.rating;
  }
  console.log(`\n=== DRY RUN — ${rows.length} dokumen (tidak ditulis) ===`);
  console.log(`Rata-rata    : ${(sum / rows.length).toFixed(2)} bintang`);
  console.log(`Distribusi   : ${JSON.stringify(dist)}`);
  console.log(`Saran terisi : ${rows.filter(r => r.saran.trim()).length}/${rows.length}`);
  console.log(`\nContoh : ${JSON.stringify(rows[0])}`);
  process.exit(0);
}

const db = firestore();
const COLLECTION = 'survey_kepuasan';

if (!KEEP_OLD) {
  const lama = await getDocs(collection(db, COLLECTION));
  console.log(`Menghapus ${lama.docs.length} rating lama…`);
  for (const d of lama.docs) await deleteDoc(doc(db, COLLECTION, d.id));
  const sisa = await getDocs(collection(db, COLLECTION));
  console.log(`Sisa setelah hapus: ${sisa.size} dokumen`);
  if (sisa.size !== 0) {
    console.error('✗ Koleksi belum kosong — seed dibatalkan.');
    process.exit(1);
  }
}

console.log(`Menulis ${rows.length} rating baru…`);
for (let i = 0; i < rows.length; i += 50) {
  const batch = writeBatch(db);
  for (const row of rows.slice(i, i + 50)) {
    const { _sort, ...data } = row;
    batch.set(doc(collection(db, COLLECTION)), data);
  }
  await batch.commit();
}

/* ── Verifikasi ──────────────────────────────────────────────────────────── */
const snap = await getDocs(collection(db, COLLECTION));
const ratings = snap.docs.map(d => Number((d.data() as { rating?: number }).rating) || 0);
const sum = ratings.reduce((a, b) => a + b, 0);
const dist: Record<number, number> = {};
ratings.forEach(r => { dist[r] = (dist[r] ?? 0) + 1; });

console.log('\n=== VERIFIKASI ===');
console.log(`Total rating  : ${ratings.length}`);
console.log(`Rata-rata     : ${(sum / ratings.length).toFixed(2)} bintang`);
console.log(`Distribusi    : ${JSON.stringify(dist)}`);
console.log(`Saran terisi  : ${snap.docs.filter(d => String((d.data() as { saran?: string }).saran ?? '').trim()).length}/${ratings.length}`);
console.log(`Contoh dokumen: ${JSON.stringify(snap.docs[0]?.data() ?? {})}`);
process.exit(0);
