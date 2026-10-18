/**
 * Diagnosa data anggota (Satlinmas).
 *
 *   node --experimental-strip-types scripts/check-satlinmas.mts
 *
 * Data anggota yang dipakai aplikasi ada di Firestore (koleksi `satlinmas`).
 * Sheet "Data Satlinmas" di Google Sheets adalah sumber lama (masih dipakai
 * saat migrasi), jadi keduanya dicek di sini.
 */
import { collection, getDocs } from 'firebase/firestore';
import { google } from 'googleapis';
import { firestore } from './lib/firestore.mts';
import { readEnv } from './lib/env.mts';

const env = readEnv();

/* ── 1. Firestore (koleksi `satlinmas`) ───────────────────────────────────── */
const db = firestore();
const snap = await getDocs(collection(db, 'satlinmas'));
const anggota = snap.docs
  .map(d => d.data() as { nama?: string; unit?: string; tglLahir?: string; wa?: string })
  .filter(x => String(x.nama ?? '').trim() !== '');

console.log('=== FIRESTORE · koleksi "satlinmas" ===');
console.log(`Total dokumen   : ${snap.docs.length}`);
console.log(`Nama terisi     : ${anggota.length}`);
const perUnit: Record<string, number> = {};
for (const a of anggota) {
  const unit = String(a.unit ?? '').trim() || '(kosong)';
  perUnit[unit] = (perUnit[unit] ?? 0) + 1;
}
console.log('Per unit        :');
for (const [unit, n] of Object.entries(perUnit).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${unit}: ${n}`);
}
console.log('Contoh           :');
for (const a of anggota.slice(0, 5)) {
  console.log(`  ${a.nama} | ${a.unit ?? '-'} | ${a.tglLahir ?? '-'} | ${a.wa ?? '-'}`);
}

/* ── 2. Google Sheets (sumber lama / migrasi) ────────────────────────────── */
console.log('\n=== GOOGLE SHEETS ===');
const spreadsheetId = env.SPREADSHEET_ID || env.GOOGLE_SHEET_ID;
if (!spreadsheetId) {
  console.log('SPREADSHEET_ID belum diisi di .env — bagian ini dilewati.');
} else {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const sheets = google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    }),
  });

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const judul = meta.data.properties?.title ?? '(tanpa judul)';
  const daftar = (meta.data.sheets ?? []).map(s => s.properties.title);
  console.log(`Spreadsheet     : ${judul}`);
  console.log(`Sheet tersedia : ${daftar.join(' | ')}`);

  if (daftar.includes('Data Satlinmas')) {
    const values = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Data Satlinmas!A2:Z',
    });
    const rows = values.data.values ?? [];
    const terisi = rows.filter(row => String(row[0] ?? '').trim() !== '');
    console.log(`Sheet "Data Satlinmas": ${terisi.length} baris berisi NAMA`);
  } else {
    console.log('Sheet "Data Satlinmas" tidak ada — data anggota disinkron dari Firestore.');
  }
}
process.exit(0);
