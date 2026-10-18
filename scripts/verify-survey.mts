/**
 * Verifikasi read-only: kelengkapan 130 rating, rata-rata bintang, dan
 * pastikan koleksi lain tidak ikut tersentuh.
 *
 *   node --experimental-strip-types scripts/verify-survey.mts
 */
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './lib/firestore.mts';

const WAJIB = ['nama', 'pekerjaan', 'rating', 'saran', 'createdAt'];
const KOLOM_LAMA = ['kemudahan', 'kegunaan', 'kecepatan', 'keakuratan', 'rekomendasi'];

const db = firestore();
const snap = await getDocs(collection(db, 'survey_kepuasan'));

let fieldKurang = 0, kolomLama = 0, ratingInvalid = 0, adaSaran = 0;
const dist: Record<number, number> = {};
let sum = 0;

for (const d of snap.docs) {
  const x = d.data() as Record<string, unknown> & { rating?: number; saran?: string };
  if (WAJIB.some(k => !(k in x))) fieldKurang++;
  if (KOLOM_LAMA.some(k => k in x)) kolomLama++;
  const r = Number(x.rating);
  if (!(r >= 1 && r <= 5)) ratingInvalid++;
  if (String(x.saran ?? '').trim()) adaSaran++;
  dist[r] = (dist[r] ?? 0) + 1;
  sum += r;
}

const total = snap.docs.length;
console.log('=== KARTU RATING LAYANAN ===');
console.log(`Total Rating   : ${total}`);
console.log(`Rata-rata      : ${(sum / total).toFixed(2)} bintang`);
console.log(`Masukan terisi : ${adaSaran} / ${total}`);

console.log('\n=== KELENGKAHAN ===');
console.log(`Field wajib kurang  : ${fieldKurang}`);
console.log(`Kolom lama tersisa  : ${kolomLama}`);
console.log(`Rating di luar 1–5  : ${ratingInvalid}`);
console.log(`Distribusi bintang  : ${JSON.stringify(dist)}`);

console.log('\n=== KOLEKSI LAIN (harus tetap utuh) ===');
for (const c of ['nowa', 'laporan']) {
  try {
    const lain = await getDocs(collection(db, c));
    console.log(`  ${c}: ${lain.size} dokumen`);
  } catch {
    console.log(`  ${c}: (tidak ada / tidak terbaca)`);
  }
}
process.exit(0);
