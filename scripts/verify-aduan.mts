/**
 * Verifikasi read-only: kelengkapan 32 aduan + simulasi perhitungan
 * kartu Dashboard dan titik grafik beranda.
 *
 *   node --experimental-strip-types scripts/verify-aduan.mts
 */
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './lib/firestore.mts';
import { parseWIB } from './lib/wib.mts';

const KATEGORI_RESMI = new Set([
  'Ketertiban Umum', 'Kebersihan', 'Kerusakan Fasilitas',
  'Parkir Liar', 'PKL Melanggar', 'Keamanan', 'Lainnya',
]);

const WAJIB = [
  'ticket', 'timestamp', 'timestampISO', 'sortKey', 'nama', 'kategori', 'lokasi',
  'deskripsi', 'fotos', 'jumlahFoto', 'status', 'catatan', 'fotoTindakLanjut',
  'updatedAt', 'source',
];
const KOLOM_LAMA = ['kemudahan', 'kegunaan', 'kecepatan', 'keakuratan', 'rekomendasi'];

const db = firestore();
const snap = await getDocs(collection(db, 'aduan'));

let idOk = 0, statusOk = 0, catatanOk = 0, kategoriOk = 0, tsOk = 0, updatedOk = 0;
let fieldKurang = 0, kolomLama = 0;
const statusCount: Record<string, number> = {};
const kategoriCount: Record<string, number> = {};
const perBulan = Array(12).fill(0);

for (const d of snap.docs) {
  const x = d.data() as Record<string, unknown> & { status?: string; kategori?: string; timestamp?: string; timestampISO?: string };
  if (d.id === x.ticket) idOk++;
  const status = x.status ?? '(kosong)';
  statusCount[status] = (statusCount[status] ?? 0) + 1;
  if (x.status === 'Selesai') statusOk++;
  if (String(x.catatan ?? '').trim()) catatanOk++;
  if (KATEGORI_RESMI.has(String(x.kategori))) kategoriOk++;
  kategoriCount[String(x.kategori)] = (kategoriCount[String(x.kategori)] ?? 0) + 1;
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(String(x.timestamp ?? ''))) tsOk++;
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(String(x.updatedAt ?? ''))) updatedOk++;
  if (WAJIB.some(k => !(k in x))) fieldKurang++;
  if (KOLOM_LAMA.some(k => k in x)) kolomLama++;

  // Simulasi grafik beranda (Dashboard.tsx): parseWIB(timestampISO || timestamp)
  const dt = parseWIB(x.timestampISO || x.timestamp);
  if (dt && dt.getFullYear() === 2026) perBulan[dt.getMonth()]++;
}

const total = snap.docs.length;
const selesai = statusCount.Selesai ?? 0;

console.log('=== KARTU DASHBOARD ===');
console.log(`Total Aduan     : ${total}`);
console.log(`Aduan Baru     : ${statusCount.Baru ?? 0}`);
console.log(`Diproses       : ${statusCount.Diproses ?? 0}`);
console.log(`Selesai        : ${selesai}`);
console.log(`Tertangani     : ${Math.round((selesai / total) * 100)}%`);

console.log('\n=== KELENGKAHAN ===');
console.log(`ID dokumen = ticket    : ${idOk}/${total}`);
console.log(`Status Selesai         : ${statusOk}/${total}`);
console.log(`Punya catatan          : ${catatanOk}/${total}`);
console.log(`Kategori sesuai portal : ${kategoriOk}/${total}`);
console.log(`Format timestamp       : ${tsOk}/${total}`);
console.log(`Format updatedAt       : ${updatedOk}/${total}`);
console.log(`Field wajib kurang     : ${fieldKurang}`);
console.log(`Kolom lama tersisa     : ${kolomLama}`);

console.log('\n=== TITIK GRAFIK BERANDA (Tren Bulanan) ===');
['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'].forEach((n, i) => {
  if (perBulan[i]) console.log(`  ${n}: ${perBulan[i]} ${'█'.repeat(perBulan[i])}`);
});
console.log(`  Total terbaca grafik: ${perBulan.reduce((a, b) => a + b, 0)} dari ${total}`);

console.log('\n=== DISTRIBUSI KATEGORI ===');
Object.entries(kategoriCount).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

const contoh = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  .sort((a, b) => (String(a.sortKey) < String(b.sortKey) ? -1 : 1))[0];
console.log('\n=== CONTOH (paling awal) ===');
console.log(JSON.stringify(contoh, null, 2));
process.exit(0);
