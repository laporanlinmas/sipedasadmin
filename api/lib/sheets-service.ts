import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import { uploadFoto, deleteFile } from './drive-service';
import { getGoogleAuth, loadEnv } from './google-auth';

// ================================================================
//  CONSTANTS  (sama dengan GAS Code.gs)
// ================================================================
loadEnv();
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID) {
  throw new Error('[sheets-service] Environment variable SPREADSHEET_ID belum di-set. Tambahkan di Vercel Settings → Environment Variables.');
}
const TZ = 'Asia/Jakarta';
const MAX_FOTO = 20;
const NIHIL = 'NIHIL';

const SHEET_USERS = 'Users';
const SHEET_INPUT = 'INPUT';
const SHEET_SATLINMAS = 'Data Satlinmas';
const SHEET_INPUT_FOTO = 'Detail Foto';
const SHEET_LAYER_PETA = 'Layer Peta';
const SHEET_GAMBAR_PETA = 'Gambar Peta';
const SHEET_TEKS_LAPORAN = 'Teks Laporan';

// Column index constants (0-based, sama dengan GAS)
const C = { TS: 0, NOSPT: 1, LOK: 2, HARI: 3, TGL: 4, IDN: 5, PER: 6, DAN: 7, NDAN: 8, KET: 9, URL: 10, JML: 11, F0: 12 };
const CS = { NAMA: 0, TGL_LAHIR: 1, UNIT: 2, WA: 3 };
const CDF = { TS_UPLOAD: 0, TANGGAL: 1, DANRU: 2, NAMA_FILE: 3, SUMBER: 4, ADA_GPS: 5, LAT: 6, LNG: 7, LINK_GMAPS: 8, WAKTU_EXIF: 9, ALAMAT: 10, KET: 11, LINK_DRIVE: 12 };
const CLP = { ID: 0, NAMA: 1, SIMBOL: 2, WARNA: 3, LAT: 4, LNG: 5, KET: 6, AKTIF: 7 };
const CGP = { ID: 0, TIPE: 1, WARNA: 2, NAMA: 3, KET: 4, MEASUREMENT: 5, GEOJSON: 6, TS: 7, USER: 8 };

// ================================================================
//  HELPERS
// ================================================================

export async function getSheets(): Promise<any> {
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Ambil semua nilai dari sebuah sheet
 */
export async function getSheetValues(sheetName: string): Promise<any[][]> {
  const sheets = await getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:ZZ`
    });
    return res.data.values || [];
  } catch (e) {
    // Sheet mungkin belum ada
    return [];
  }
}

/**
 * Append satu atau lebih baris ke sheet
 */
async function appendRows(sheetName: string, rows: any[][]): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows }
  });
}

/**
 * Update baris tertentu (1-indexed row number)
 */
async function updateRow(sheetName: string, rowNum: number, values: any[], colStart: string = 'A'): Promise<void> {
  const sheets = await getSheets();
  // Calculate the startCol offset (A=1, B=2, etc.) to correctly compute colEnd
  const startColNum = colLetterToNumber(colStart);
  const colEnd = columnToLetter(startColNum - 1 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colStart}${rowNum}:${colEnd}${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] }
  });
}

function colLetterToNumber(letter: string): number {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
  }
  return n;
}

/**
 * Update satu sel saja
 */
async function updateCell(sheetName: string, rowNum: number, colNum: number, value: any): Promise<void> {
  const sheets = await getSheets();
  const colLetter = columnToLetter(colNum);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] }
  });
}

/**
 * Hapus baris tertentu (1-indexed row number)
 */
async function deleteRow(sheetName: string, rowNum: number): Promise<void> {
  const sheets = await getSheets();
  // Dapatkan sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find((s: any) => s.properties?.title === sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' tidak ditemukan.`);
  const sheetId = sheet.properties?.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowNum - 1, // 0-indexed
            endIndex: rowNum        // exclusive
          }
        }
      }]
    }
  });
}

/**
 * Hapus semua baris data (kecuali header baris 1), lalu tulis ulang
 */
async function clearAndWriteRows(sheetName: string, rows: any[][]): Promise<void> {
  const sheets = await getSheets();
  // Clear dari baris 2 ke bawah
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:ZZ`
  });
  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });
  }
}

/**
 * Konversi angka kolom ke huruf (1 => A, 2 => B, ..., 27 => AA, dst)
 */
function columnToLetter(col: number): string {
  let letter = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * Helper: format date ke string Indonesia
 */
function formatDateID(d?: Date): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

/**
 * Helper: format datetime lengkap
 */
function formatDateTimeID(d?: Date): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

/**
 * Helper: format tanggal utk timestamp spreadsheet (M/d/yyyy HH:mm:ss)
 */
function formatTsSheets(d?: Date): string {
  if (!d) d = new Date();
  const opts = { timeZone: TZ };
  const parts = new Intl.DateTimeFormat('en-US', {
    ...opts,
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Helper: format tanggal panjang (dd/MM/yyyy HH:mm:ss)
 */
function formatTs(d?: Date): string {
  if (!d) d = new Date();
  const opts = { timeZone: TZ };
  const parts = new Intl.DateTimeFormat('id-ID', {
    ...opts,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/** 
 * Helper: parse tanggal Indonesia (misal "Senin, 1 Januari 2024" atau "1 Januari 2024" atau "dd/MM/yyyy")
 */
function parseTgl(s?: string | null): Date | null {
  if (!s) return null;
  const BLN: Record<string, number> = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
  const b = String(s).replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
  const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
  if (m && BLN[m[2]]) {
    const d = new Date(Date.UTC(+m[3], BLN[m[2]] - 1, +m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  const m2 = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(String(s));
  if (m2) {
    const d2 = new Date(Date.UTC(+m2[3], +m2[2] - 1, +m2[1]));
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

/**
 * Helper: parse tanggal ISO (yyyy-MM-dd)
 */
function parseTglISO(s?: string | null): Date | null {
  if (!s) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

/**
 * Helper: escape HTML
 */
function esc(v?: any): string {
  if (!v) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Helper: Drive thumbnail URL dari link Drive
 */
function driveThumb(url?: string): string {
  if (!url) return '';
  const m = /\/file\/d\/([^\/\?]+)/.exec(url);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  const m2 = /[?&]id=([^&]+)/.exec(url);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
  return url;
}

/**
 * Helper: Hitung usia dari tanggal lahir
 */
function hitungUsia(tglLahir?: string): number | string {
  if (!tglLahir) return '';
  let d: Date | null = null;
  const s = String(tglLahir).trim();
  const m = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s);
  if (m) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  else d = new Date(s);
  if (!d || isNaN(d.getTime())) return '';
  const now = new Date();
  let usia = now.getUTCFullYear() - d.getUTCFullYear();
  const bln = now.getUTCMonth() - d.getUTCMonth();
  if (bln < 0 || (bln === 0 && now.getUTCDate() < d.getUTCDate())) usia--;
  return usia;
}

interface LaporanObj {
  _ri: number;
  ts: string;
  noSpt: string;
  lokasi: string;
  hari: string;
  tanggal: string;
  identitas: string;
  personil: string;
  danru: string;
  namaDanru: string;
  keterangan: string;
  urlFolder: string;
  jmlFoto: string;
  fotos: string[];
  fotosThumb?: string[];
}

/**
 * Konversi baris array INPUT ke object laporan
 */
function row2obj(row: any[], ri: number): LaporanObj {
  const fotos: string[] = [];
  for (let f = 0; f < MAX_FOTO; f++) {
    const l = String(row[C.F0 + f] || '').trim();
    if (l) fotos.push(l);
  }
  return {
    _ri: ri,
    ts: String(row[C.TS] || '').trim(),
    noSpt: String(row[C.NOSPT] || '').trim(),
    lokasi: String(row[C.LOK] || '').trim(),
    hari: String(row[C.HARI] || '').trim(),
    tanggal: String(row[C.TGL] || '').trim(),
    identitas: String(row[C.IDN] || '').trim(),
    personil: String(row[C.PER] || '').trim(),
    danru: String(row[C.DAN] || '').trim(),
    namaDanru: String(row[C.NDAN] || '').trim(),
    keterangan: String(row[C.KET] || '').trim(),
    urlFolder: String(row[C.URL] || '').trim(),
    jmlFoto: String(row[C.JML] || '').trim(),
    fotos
  };
}

/**
 * Ambil + konversi semua data INPUT
 */
async function getAllInput(): Promise<LaporanObj[]> {
  const values = await getSheetValues(SHEET_INPUT);
  if (values.length < 2) return [];
  return values.slice(1)
    .map((row, i) => row2obj(row, i + 2))
    .filter(r => r.lokasi !== '' || r.ts !== '');
}

// ================================================================
//  RESPONSE HELPERS
// ================================================================
export function success(data: any, message?: string) {
  return { success: true, message: message || 'OK', data: data !== undefined ? data : null };
}
export function error(message?: string) {
  return { success: false, message: message || 'Terjadi kesalahan.', data: null };
}

// ================================================================
//  6.1  AUTH — with Password Obfuscation
// ================================================================

// ================================================================
//  PASSWORD HASHING  (bcryptjs — one-way hash, tidak bisa di-reverse)
// ================================================================

const BCRYPT_ROUNDS = 10;

/** Hash password baru menggunakan bcrypt. */
async function hashPass(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

/** Verifikasi password terhadap hash bcrypt atau format lama (base64/plaintext). */
async function verifyPass(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false;
  // Hash bcrypt dimulai dengan $2a$ atau $2b$
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy: base64 dari reversed string (format lama) — auto-upgrade saat login
  try {
    const decoded = Buffer.from(stored, 'base64').toString('utf8');
    const reversed = decoded.split('').reverse().join('');
    if (reversed === plain) return true;
  } catch { /* bukan base64 valid */ }
  // Legacy: plaintext
  return stored === plain;
}

export async function checkLogin(username?: string, password?: string): Promise<any> {
  try {
    if (!username || !password) return error('Username & password wajib diisi.');
    const values = await getSheetValues(SHEET_USERS);
    if (values.length < 2) return error('Belum ada data pengguna.');
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[0] || '').toLowerCase() === username.toLowerCase()) {
        const stored = String(row[1] || '');
        const match = await verifyPass(password, stored);
        if (match) {
          // Auto-upgrade: jika hash bukan bcrypt, upgrade ke bcrypt sekarang
          if (!stored.startsWith('$2')) {
            try {
              const newHash = await hashPass(password);
              await updateCell(SHEET_USERS, i + 1, 2, newHash);
            } catch (e2) { /* gagal upgrade — tetap bisa login */ }
          }
          return success({
            username: String(row[0] || ''),
            role: String(row[2] || '').toLowerCase(),
            namaLengkap: String(row[3] || '')
          }, 'Login berhasil.');
        }
      }
    }
    return error('Username atau password salah.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.2  DASHBOARD & REKAP
// ================================================================

export async function getDashboardData(): Promise<any> {
  try {
    const rows = await getAllInput();
    const now = new Date();
    // Today string dalam format dd/MM/yyyy Asia/Jakarta
    const todayStr = now.toLocaleDateString('id-ID', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });

    let tot = 0, totP = 0, hr = 0, hrP = 0;
    const lokMap: Record<string, number> = {};
    const hariMap: Record<string, number> = { Senin: 0, Selasa: 0, Rabu: 0, Kamis: 0, Jumat: 0, Sabtu: 0, Minggu: 0 };

    rows.forEach(r => {
      tot++;
      const tglDate = parseTgl(r.tanggal);
      const tglStr = tglDate
        ? tglDate.toLocaleDateString('id-ID', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const isp = r.identitas.toUpperCase() !== NIHIL && r.identitas !== '';
      if (isp) totP++;
      if (tglStr === todayStr) { hr++; if (isp) hrP++; }
      const lok = r.lokasi || '?';
      lokMap[lok] = (lokMap[lok] || 0) + 1;
      if (hariMap.hasOwnProperty(r.hari)) hariMap[r.hari]++;
    });

    let totalAnggota = 0;
    try {
      const satRows = await getSheetValues(SHEET_SATLINMAS);
      if (satRows.length >= 2) totalAnggota = satRows.length - 1;
    } catch (e2) { }

    return success({
      total: tot, totalP: totP, hariIni: hr, hariIniP: hrP, totalAnggota,
      perHari: Object.keys(hariMap).map(k => ({ hari: k, n: hariMap[k] })),
      perLokasi: Object.keys(lokMap).map(k => ({ lokasi: k, n: lokMap[k] })).sort((a, b) => b.n - a.n)
    });
  } catch (e: any) { return error(e.message); }
}

export async function getRekapData(f: any = {}): Promise<any> {
  try {
    const rows = (await getAllInput()).reverse();

    // Tambah thumbnail
    rows.forEach(r => { r.fotosThumb = r.fotos.map(driveThumb); });

    let filtered = [...rows];

    // Filter: q (pencarian)
    if (f.q && f.q.trim()) {
      const q = f.q.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.lokasi.toLowerCase().includes(q) ||
        r.tanggal.toLowerCase().includes(q) ||
        r.hari.toLowerCase().includes(q) ||
        r.personil.toLowerCase().includes(q) ||
        r.identitas.toLowerCase().includes(q) ||
        r.danru.toLowerCase().includes(q) ||
        r.namaDanru.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q)
      );
    }

    // Filter: tglFrom
    if (f.tglFrom && f.tglFrom.trim()) {
      const df = parseTglISO(f.tglFrom);
      if (df) filtered = filtered.filter(r => { const dt = parseTgl(r.tanggal); return dt && dt >= df; });
    }

    // Filter: tglTo
    if (f.tglTo && f.tglTo.trim()) {
      const dto = parseTglISO(f.tglTo);
      if (dto) {
        dto.setUTCHours(23, 59, 59, 999);
        filtered = filtered.filter(r => { const dt = parseTgl(r.tanggal); return dt && dt <= dto; });
      }
    }

    return success({ rows: filtered, total: filtered.length });
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.3  UPLOAD FOTO (metadata saja - drive diurus drive-service)
// ================================================================

/**
 * Simpan detail foto ke sheet Detail Foto
 * Dipanggil dari drive-service setelah upload berhasil
 */
export async function appendDetailFoto(opts: any): Promise<void> {
  const meta = opts.meta || null;
  const adaGps = (meta && meta.hasGps && meta.lat && meta.lng) ? 'Ya' : 'Tidak';
  const lat = (meta && meta.lat) ? meta.lat : '-';
  const lng = (meta && meta.lng) ? meta.lng : '-';
  const linkMaps = (meta && meta.lat && meta.lng)
    ? `https://www.google.com/maps?q=${meta.lat},${meta.lng}`
    : '-';
  const waktuExif = (meta && meta.datetime) ? meta.datetime : '-';
  const alamat = (meta && meta.address) ? meta.address : '-';
  const tsStr = opts.tsStr || formatTsSheets(new Date());

  await appendRows(SHEET_INPUT_FOTO, [[
    tsStr,
    opts.tanggal || '-',
    opts.danru || '-',
    opts.namaFile || '-',
    opts.sumber || 'DASHBOARD',
    adaGps, lat, lng, linkMaps,
    waktuExif, alamat,
    opts.ket || 'Foto diupload dari Dashboard.',
    opts.linkDrive || ''
  ]]);
}

// ================================================================
//  6.4  CRUD LAPORAN
// ================================================================

export async function addLaporan(payload: any): Promise<any> {
  try {
    const noSptVal = String(payload.noSpt || payload.nomorSpt || payload.nospt || '').trim();

    const req = ['lokasi', 'hari', 'tanggal', 'personil'];
    for (const field of req) {
      if (!payload[field] || !String(payload[field]).trim()) return error(`Field '${field}' wajib diisi.`);
    }

    const now = new Date();
    const tsStr = formatTs(now);
    const tsStrS = formatTsSheets(now);

    const linkFotos = payload.linkFoto || [];
    const urls = linkFotos.map((f: any) => typeof f === 'string' ? f : (f.link || '')).filter(Boolean);
    let folderUrl = '';
    if (linkFotos.length) {
      const firstMeta = typeof linkFotos[0] === 'object' ? linkFotos[0] : {};
      folderUrl = firstMeta.folderUrl || '';
    }

    // Simpan teks laporan
    const teksAsliAkhir = buildFinalTeksLaporan(payload);
    await saveTeksLaporan(tsStrS, teksAsliAkhir);

    const rowData = [
      tsStr, noSptVal, payload.lokasi, payload.hari, payload.tanggal,
      payload.identitas || NIHIL, payload.personil, payload.danru || '',
      payload.namaDanru || '', payload.keterangan || '',
      folderUrl, urls.length
    ];
    for (let k = 0; k < MAX_FOTO; k++) rowData.push(urls[k] || '');

    await appendRows(SHEET_INPUT, [rowData]);
    return success(null, 'Laporan berhasil ditambahkan.');
  } catch (e: any) { return error(e.message); }
}

export async function updateLaporan(payload: any): Promise<any> {
  try {
    const noSptVal = String(payload.noSpt || payload.nomorSpt || payload.nospt || '').trim();

    if (!payload || !payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);
    if (isNaN(ri) || ri < 2) return error('Row index tidak valid (minimal baris 2).');

    // Frontend sends payload.fotos — array of URL strings (existing) or {data, mime} (new)
    // We only handle existing URLs here (new photos are uploaded separately in addLaporan flow)
    // For edit, accept URL strings + upload new photos if any
    const fotoPayload = payload.fotos || payload.linkFoto || [];
    let folderUrl = payload.folderUrl || '';

    // Get existing row to compare existing photos
    let tsInput = '';
    const existingPhotos: string[] = [];
    try {
      const sheets = await getSheets();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_INPUT}!A${ri}:ZZ${ri}`
      });
      const existingRow = res.data.values ? res.data.values[0] : null;
      if (existingRow) {
        if (!folderUrl && existingRow[C.URL]) folderUrl = existingRow[C.URL];
        tsInput = String(existingRow[C.TS] || '').trim();
        for (let i = 0; i < MAX_FOTO; i++) {
          const f = String(existingRow[C.F0 + i] || '').trim();
          if (f) existingPhotos.push(f);
        }
      }
    } catch (e2) { /* ignore */ }

    const keptUrls: string[] = [];
    const urls: string[] = [];

    // Hitung total foto baru untuk suffix nomor file yang akurat
    const totalNewFotos = fotoPayload.filter(
      (f: any) => f && typeof f === 'object' && f.data && f.mime && !f.url
    ).length;
    let newFotoCounter = 0;

    // Handle foto sesuai urutan yang dikirim frontend (urutan = urutan final di Sheets)
    for (const f of fotoPayload) {
      if (typeof f === 'string' && f.trim()) {
        // Foto existing berupa URL string
        keptUrls.push(f.trim());
        urls.push(f.trim());
      } else if (f && typeof f === 'object') {
        if (f.url && typeof f.url === 'string' && f.url.trim()) {
          // Foto existing berupa { url: '...' }
          keptUrls.push(f.url.trim());
          urls.push(f.url.trim());
        } else if (f.data && f.mime) {
          // Foto baru — upload ke Drive lalu record di Detail Foto
          newFotoCounter++;
          try {
            const uploadPayload = {
              foto: {
                data: f.data,
                mime: f.mime,
                customFileName: f.customFileName || '',
                source: f.source || 'dashboard',
              },
              laporan: buildFinalTeksLaporan(payload),
              noFoto: newFotoCounter,
              jumlahTotal: totalNewFotos,
              meta: { hasGps: false },
            };

            const upResult = await uploadFoto(uploadPayload);
            if (upResult && upResult.data && upResult.data.linkFile) {
              urls.push(upResult.data.linkFile);
              if (!folderUrl && upResult.data.folderUrl) folderUrl = upResult.data.folderUrl;
            } else {
              console.error('[Edit] Upload foto gagal, tidak ada linkFile:', upResult?.message);
            }
          } catch (upErr: any) {
            console.error('[Edit] Error upload foto baru:', upErr.message);
          }
        } else if (f.link) {
          keptUrls.push(f.link);
          urls.push(f.link);
        }
      }
    }

    // Tentukan foto yang dihapus user (ada di existing, tapi tidak ada di keptUrls)
    const deletedPhotos = existingPhotos.filter(ef => !keptUrls.includes(ef));

    // Hapus foto yang dihapus dari Drive + baris di sheet Detail Foto
    if (deletedPhotos.length > 0) {
      console.log(`[Edit] Menghapus ${deletedPhotos.length} foto dari Drive...`);
      for (const dUrl of deletedPhotos) {
        try {
          // 1. Hapus file dari Drive
          const fid = extractFileId(dUrl);
          if (fid) {
            await deleteFile(fid);
            console.log(`[Edit] Foto dihapus dari Drive: ${fid}`);
          }

          // 2. Hapus baris di sheet Detail Foto berdasarkan URL
          const detailVals = await getSheetValues(SHEET_INPUT_FOTO);
          for (let i = detailVals.length - 1; i >= 1; i--) {
            if (String(detailVals[i][CDF.LINK_DRIVE] || '').trim() === dUrl.trim()) {
              await deleteRow(SHEET_INPUT_FOTO, i + 1);
              console.log(`[Edit] Baris Detail Foto dihapus (row ${i + 1})`);
              break;
            }
          }
        } catch (delErr: any) {
          console.error('[Edit] Error hapus foto dari Drive/Sheet:', dUrl, delErr.message);
        }
      }
    }

    // Update text fields in INPUT sheet
    const updateValues = [
      noSptVal, payload.lokasi || '', payload.hari || '', payload.tanggal || '',
      payload.identitas || '', payload.personil || '', payload.danru || '',
      payload.namaDanru || '', payload.keterangan || '',
      folderUrl, urls.length
    ];
    for (let k = 0; k < MAX_FOTO; k++) updateValues.push(urls[k] || '');

    await updateRow(SHEET_INPUT, ri, updateValues, 'B');

    // Also update Teks Laporan sheet if timestamp found
    if (tsInput) {
      try {
        const dObj2 = parseTsFormat1(tsInput);
        const tsSheets2 = dObj2 ? formatTsSheets(dObj2) : null;
        if (tsSheets2) {
          const teksVals = await getSheetValues(SHEET_TEKS_LAPORAN);
          for (let i = teksVals.length - 1; i >= 1; i--) {
            if (String(teksVals[i][0] || '').trim() === tsSheets2) {
              const newTeks = buildFinalTeksLaporan(payload);
              await updateCell(SHEET_TEKS_LAPORAN, i + 1, 2, newTeks);
              break;
            }
          }
        }
      } catch (e3) { /* non-critical */ }
    }

    return success(null, 'Laporan berhasil diperbarui.');
  } catch (e: any) { return error(e.message); }
}

export async function deleteLaporan(ri: any): Promise<any> {
  try {
    const riInt = parseInt(ri);
    if (isNaN(riInt) || riInt < 2) return error('Row index tidak valid (minimal baris 2).');
    const sheets = await getSheets();

    // 1. Ambil data baris tersebut sebelum dihapus
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_INPUT}!A${riInt}:ZZ${riInt}`
    });
    const row = res.data.values ? res.data.values[0] : null;
    if (!row) return error('Data tidak ditemukan.');

    const tsInput = String(row[C.TS] || '').trim();
    const fotos: string[] = [];
    for (let i = 0; i < MAX_FOTO; i++) {
      const f = String(row[C.F0 + i] || '').trim();
      if (f) fotos.push(f);
    }

    // 2. Hapus setiap file foto dari Google Drive
    //    + hapus row di sheet Detail Foto berdasarkan link URL
    for (const url of fotos) {
      try {
        // Hapus file dari Drive
        const fid = extractFileId(url);
        if (fid) await deleteFile(fid);

        // Hapus row di Detail Foto berdasarkan kolom Link Drive (kolom M / CDF.LINK_DRIVE)
        const detailVals = await getSheetValues(SHEET_INPUT_FOTO);
        for (let i = detailVals.length - 1; i >= 1; i--) {
          if (String(detailVals[i][CDF.LINK_DRIVE] || '').trim() === url.trim()) {
            await deleteRow(SHEET_INPUT_FOTO, i + 1);
            break;
          }
        }
      } catch (delErr: any) { console.error('[Delete] Error hapus foto:', delErr.message); }
    }

    // 3. Hapus baris di Teks Laporan berdasarkan timestamp
    const dObj = parseTsFormat1(tsInput);
    const tsSheets = dObj ? formatTsSheets(dObj) : null;
    if (tsSheets) {
      await deleteRowsByTimestamp(SHEET_TEKS_LAPORAN, 0, tsSheets);
    }

    // 4. Akhirnya hapus baris di sheet INPUT
    await deleteRow(SHEET_INPUT, riInt);

    return success(null, 'Laporan dan semua data terkait (foto & teks) berhasil dihapus.');
  } catch (e: any) {
    console.error('[API Error] deleteLaporan failed:', e.message);
    return error(e.message);
  }
}

/**
 * Helper: Hapus semua baris yang memiliki nilai tertentu di kolom tertentu
 */
async function deleteRowsByTimestamp(sheetName: string, colIdx: number, tsValue: string): Promise<void> {
  try {
    const values = await getSheetValues(sheetName);
    if (values.length < 2) return;

    const rowsToDelete = [];
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][colIdx] || '').trim() === tsValue) {
        rowsToDelete.push(i + 1);
      }
    }

    // Hapus dari bawah ke atas agar index tidak bergeser
    for (const ri of rowsToDelete) {
      await deleteRow(sheetName, ri);
    }
  } catch (e) { }
}

function extractFileId(url?: string): string | null {
  if (!url) return null;
  const m = /\/file\/d\/([^\/\?]+)/.exec(url);
  if (m) return m[1];
  const m2 = /[?&]id=([^&]+)/.exec(url);
  if (m2) return m2[1];
  return null;
}

function extractFolderId(url?: string): string | null {
  if (!url) return null;
  const m = /\/folders\/([^\/\?]+)/.exec(url);
  if (m) return m[1];
  return null;
}

function parseTsFormat1(s: string): Date | null {
  // dd/MM/yyyy HH:mm:ss
  const m = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]), parseInt(m[4]), parseInt(m[5]), parseInt(m[6]));
  return null;
}

// ================================================================
//  6.5  HTML GENERATOR
// ================================================================

export function generateLaporanHtml(payload: any): any {
  try {
    const fotos = payload.fotos || [];
    let fotoHtml = '';
    if (fotos.length) {
      fotoHtml = '<table class="foto-table" style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">';
      for (let i = 0; i < fotos.length; i += 2) {
        fotoHtml += '<tr style="page-break-inside:avoid;break-inside:avoid;">';
        for (let j = i; j < Math.min(i + 2, fotos.length); j++) {
          fotoHtml += '<td class="foto-td" style="padding:4px;border:1px solid #000;text-align:center;width:50%;vertical-align:top;page-break-inside:avoid;break-inside:avoid;">' +
            `<img src="${driveThumb(fotos[j])}" style="width:100%;max-height:240px;object-fit:contain;display:block;margin:0 auto 2px auto;">` +
            `<div style="font-size:8pt;color:#000;font-weight:800;line-height:1;margin-top:2px;text-transform:uppercase;">FOTO ${j + 1}</div></td>`;
        }
        if (fotos.length % 2 !== 0 && i + 1 >= fotos.length) {
          fotoHtml += '<td class="foto-td" style="border:1px solid #000;background:#fdfdfd;"></td>';
        }
        fotoHtml += '</tr>';
      }
      fotoHtml += '</table>';
    } else {
      fotoHtml = '<p style="font-style:italic;color:#888;font-size:9pt;margin-top:6px">Tidak ada foto dokumentasi.</p>';
    }

    const identitas = payload.identitas || '';
    const adaPelanggar = identitas.trim() !== '' && identitas.toUpperCase() !== 'NIHIL';
    const keterangan = payload.keterangan || payload.uraian || '';
    const uraianHtml = (keterangan && keterangan.trim())
      ? esc(keterangan).replace(/\n/g, '<br>')
      : '<span style="color:#bbb;font-style:italic">— belum diisi —</span>';

    // Title: single line with KABUPATEN PONOROGO at end
    const judulUtama = payload.judulUtama || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO';

    let html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Patroli</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Times New Roman",serif;font-size:11pt;color:#000;background:#fff}' +
      '@page{size:A4 portrait}' +
      'h1{font-size:11.5pt;font-weight:bold;text-align:center;text-transform:uppercase;margin-bottom:14px;line-height:1.5}' +
      'table.main-data{width:100%;border-collapse:collapse;table-layout:fixed;border:none;}' +
      'table.main-data td{padding:7px 10px;vertical-align:top;font-size:10.5pt;line-height:1.6;border-top:1px solid #000;border-bottom:1px solid #000;}' +
      '.lbl{font-weight:bold;width:4.2cm;border-left:1px solid #000;border-right:none !important;}' +
      '.sep{width:25px;text-align:center;padding-left:0 !important;padding-right:0 !important;border-left:none !important;border-right:1px solid #000 !important;}' +
      '.val{border-left:none !important;border-right:1px solid #000;background:#fff;}' +
      '.uraian-cell{min-height:180px;line-height:1.75}' +
      '.ttd-wrap{margin-top:20px;display:flex;justify-content:flex-end;page-break-inside:avoid;break-inside:avoid}' +
      '.ttd-box{text-align:left;min-width:240px}.ttd-space{height:64px}.ttd-nama{font-weight:bold;text-decoration:underline}' +
      '.lamp-judul{font-size:11pt;font-weight:bold;margin:20px 0 8px;text-decoration:underline}' +
      'tr{page-break-inside:avoid;break-inside:avoid;}' +
      /* Spacer thead/tfoot rows - pastikan tidak punya border apapun */
      '.spc-td,.spc-row td{border:none !important;background:transparent !important;}' +
      /* Garis pembatas kop surat - bisa dikontrol via CSS override */
      '.kop-divider{border-top:3px solid #000;border-bottom:1.5px solid #000;height:1.5px;margin-top:10px;margin-bottom:12px;}' +
      /* Tabel foto dan selnya */
      '.foto-table{width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed;}' +
      '.foto-td{padding:4px;border:1px solid #000;text-align:center;vertical-align:top;page-break-inside:avoid;break-inside:avoid;}' +
      /* Tabel nested di dalam .val (identitas pelanggar) - hapus semua border */
      '.val table,.val table td,.val table th,.val table tr{border:none !important;background:transparent !important;}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' +
      '<table style="width:100%;border:none;border-collapse:collapse;">';

    let headerHtml = '';
    if (payload.kopAktif) {
      const logoKiri = (payload.kopLogoKiri && String(payload.kopLogoKiri).startsWith('data:'))
        ? `<img src="${payload.kopLogoKiri}" style="position:absolute;left:2.5cm;top:15px;height:4.5cm;max-width:3cm;object-fit:contain;">`
        : '';
      const logoKanan = (payload.kopLogoKanan && String(payload.kopLogoKanan).startsWith('data:'))
        ? `<img src="${payload.kopLogoKanan}" style="position:absolute;right:2.5cm;top:15px;height:4.5cm;max-width:3cm;object-fit:contain;">`
        : '';

      headerHtml = '<thead style="border:none;"><tr><td style="border:none;text-align:center;padding:15px 2cm 0;position:relative;">' +
        logoKiri +
        `<div style="font-size:14pt;font-family:Arial,sans-serif;line-height:1.2;margin:0 3cm;">${esc(payload.kopInstansi || '')}</div>` +
        `<div style="font-size:16pt;font-family:Arial,sans-serif;font-weight:bold;line-height:1.2;margin:0 3cm;">${esc(payload.kopDinas || '')}</div>` +
        `<div style="font-size:10pt;font-family:Arial,sans-serif;margin-top:2px;margin:0 3cm;">${esc(payload.kopJalan || '')}</div>` +
        logoKanan +
        '<div class="kop-divider" style="border-top:3px solid #000;border-bottom:1.5px solid #000;height:1.5px;margin-top:10px;margin-bottom:12px;"></div>' +
        '</td></tr></thead>';
    } else {
      headerHtml = '<thead class="spc-thead" style="border:none;"><tr class="spc-row"><td class="spc-td" style="border:none !important;height:0;padding:0;"></td></tr></thead>';
    }

    html += headerHtml +
      '<tbody style="border:none;"><tr><td style="border:none;padding:0;vertical-align:top;">' +
      `<h1>${judulUtama}</h1>` +
      '<table class="main-data">' +
      `<tr><td class="lbl">Hari / Tanggal</td><td class="sep">:</td><td class="val">${esc(payload.hari || '')}, ${esc(payload.tanggal || '')}</td></tr>` +
      `<tr><td class="lbl">Tujuan</td><td class="sep">:</td><td class="val">${esc(payload.tujuan || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian')}</td></tr>` +
      `<tr><td class="lbl">Nomor SPT</td><td class="sep">:</td><td class="val">${esc(payload.nomorSpt || '')}</td></tr>` +
      `<tr><td class="lbl">Lokasi</td><td class="sep">:</td><td class="val">${esc(payload.lokasi || '')}</td></tr>` +
      `<tr><td class="lbl">Anggota</td><td class="sep">:</td><td class="val">${esc(payload.anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP')}</td></tr>` +
      `<tr><td class="lbl">Pukul</td><td class="sep">:</td><td class="val">${esc(payload.pukul || '16.00 \u2013 00.00 WIB')}</td></tr>`;

    if (adaPelanggar) {
      let identitasFormatted = '';
      const lines = identitas.split('\n');
      const hasColon = lines.some((l: string) => l.includes(':'));
      if (hasColon) {
        identitasFormatted = '<table style="width:100%; border:none; margin:0; padding:0; border-collapse:collapse; table-layout:auto;">';
        lines.forEach((l: string) => {
          let idx = l.indexOf(':');
          if (idx !== -1) {
            let k = esc(l.substring(0, idx).trim());
            let v = esc(l.substring(idx + 1).trim());
            identitasFormatted += `<tr><td style="width:1%; white-space:nowrap; padding:0 8px 0 0; border:none; vertical-align:top; background:transparent;">${k}</td><td style="width:1%; padding:0 4px 0 0; border:none; vertical-align:top; background:transparent;">:</td><td style="padding:0; border:none; vertical-align:top; background:transparent; word-break:break-word; white-space:normal;">${v}</td></tr>`;
          } else {
            identitasFormatted += `<tr><td colspan="3" style="padding:0; border:none; vertical-align:top; background:transparent;">${esc(l.trim())}</td></tr>`;
          }
        });
        identitasFormatted += '</table>';
      } else {
        identitasFormatted = esc(identitas).replace(/\n/g, '<br>');
      }

      html += `<tr><td class="lbl">Identitas Pelanggar</td><td class="sep">:</td>` +
        `<td class="val">${identitasFormatted}</td></tr>`;
    }

    html += `<tr><td class="lbl">Uraian Laporan</td><td class="sep">:</td><td class="val uraian-cell">${uraianHtml}</td></tr>` +
      '</table><p class="lamp-judul">LAMPIRAN DOKUMENTASI</p>' + fotoHtml +
      `<div class="ttd-wrap"><div class="ttd-box"><p>Ponorogo, ${esc(payload.tglSurat || '')}</p>` +
      `<p>${esc(payload.jabatanTtd || 'Kepala Bidang SDA dan Linmas')}</p>` +
      '<div class="ttd-space"></div>' +
      `<p class="ttd-nama">${esc(payload.namaTtd || 'Erry Setiyoso Birowo, SP')}</p>` +
      `<p>${esc(payload.pangkatTtd || 'Pembina')}</p>` +
      `<p>NIP. ${esc(payload.nipTtd || '19751029 200212 1 008')}</p>` +
      '</div></div>' +
      '</td></tr></tbody>' +
      '<tfoot class="spc-tfoot" style="border:none;"><tr class="spc-row"><td class="spc-td" style="border:none !important;height:0;padding:0;"></td></tr></tfoot>' +
      '</table></body></html>';

    return success({ html }, 'HTML laporan berhasil digenerate.');
  } catch (e: any) { return error(e.message); }
}

export function generateKolektifHtml(payload: any): any {
  try {
    const rows = payload.rows || [];
    const tglFrom = payload.tglFrom || '';
    const tglTo = payload.tglTo || '';
    const now = new Date();
    const BNAME = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tglCetak = now.getDate() + ' ' + BNAME[now.getMonth() + 1] + ' ' + now.getFullYear();

    let tbody = '';
    rows.forEach((r: any, i: number) => {
      const isp = r.identitas && r.identitas.toUpperCase() !== NIHIL && r.identitas !== '';
      const ketVal = r.keterangan || r.teks || '';
      tbody += '<tr>' +
        `<td style='text-align:center'>${i + 1}</td>` +
        `<td>${esc(r.ts)}</td><td>${esc(r.lokasi)}</td>` +
        `<td>${esc(r.noSpt || '')}</td>` +
        `<td style='text-align:center'>${esc(r.hari)}</td><td>${esc(r.tanggal)}</td>` +
        `<td style='${isp ? 'color:#c0392b;font-weight:bold' : ''}'>${esc(r.identitas || NIHIL)}</td>` +
        `<td>${esc(r.personil)}</td>` +
        `<td style='text-align:center'>${esc(r.danru)}</td><td>${esc(r.namaDanru)}</td>` +
        `<td>${esc(ketVal)}</td></tr>`;
    });

    if (!tbody) tbody = '<tr><td colspan="11" style="text-align:center;padding:16px;color:#888">Tidak ada data.</td></tr>';

    const periodeRow = (tglFrom || tglTo)
      ? `<p style='font-size:8.5pt;color:#444;margin:0 0 8px'>Periode: <b>${tglFrom || '—'}</b> s/d <b>${tglTo || '—'}</b> Total: <b>${rows.length}</b> laporan</p>`
      : '';

    let html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan Kolektif</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:8.5pt;color:#000;background:#fff}' +
      '@page{size:A4 landscape;margin:0}' +
      '.judul{text-align:center;margin-bottom:6px;line-height:1.5}' +
      '.judul h2{font-size:11.5pt;font-weight:bold;text-transform:uppercase}.judul h3{font-size:10pt;font-weight:bold;text-transform:uppercase}' +
      'hr.garis{border:none;border-top:2px solid #000;margin:7px 0 9px}' +
      '.tb-data{width:100%;border-collapse:collapse}' +
      '.tb-data thead th{background:#fff;color:#000;padding:6px 5px;font-size:7.5pt;font-weight:bold;border:1px solid #000;white-space:normal;word-break:break-word;vertical-align:middle;text-align:center}' +
      '.tb-data tbody td{padding:3.5px 5px;border:1px solid #000;font-size:8pt;vertical-align:top}' +
      '.ft{margin-top:16px;display:flex;justify-content:flex-end;page-break-inside:avoid;break-inside:avoid}' +
      '.ft-box{text-align:left;min-width:200px}.ft-box p{font-size:8.5pt;margin-bottom:2px}' +
      '.ft-nama{font-weight:bold;text-decoration:underline;font-size:9pt}.ttd{height:64px}' +
      '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' +
      '<table style="width:100%;border:none;border-collapse:collapse;">';

    const logoKiri = (payload.kopLogoKiri && String(payload.kopLogoKiri).startsWith('data:'))
      ? `<img src="${payload.kopLogoKiri}" style="position:absolute;left:1.5cm;top:10px;height:2.6cm;max-width:2cm;object-fit:contain;">`
      : '';
    const logoKanan = (payload.kopLogoKanan && String(payload.kopLogoKanan).startsWith('data:'))
      ? `<img src="${payload.kopLogoKanan}" style="position:absolute;right:1.5cm;top:10px;height:2.6cm;max-width:2cm;object-fit:contain;">`
      : '';
    const hasKop = payload.kopAktif && (payload.kopInstansi || payload.kopDinas);

    html += '<thead style="border:none;"><tr><td style="border:none;position:relative;' + (hasKop ? 'text-align:center;padding:10px 1.5cm;' : 'height:1.5cm;padding:0;') + '">' +
      (hasKop ? (
        logoKiri +
        `<div style="font-size:12pt;font-family:Arial,sans-serif;line-height:1.2;margin:0 2.5cm;">${esc(payload.kopInstansi || '')}</div>` +
        `<div style="font-size:14pt;font-family:Arial,sans-serif;font-weight:bold;line-height:1.2;margin:0 2.5cm;">${esc(payload.kopDinas || '')}</div>` +
        `<div style="font-size:9pt;font-family:Arial,sans-serif;margin-top:2px;margin:0 2.5cm;">${esc(payload.kopJalan || '')}</div>` +
        logoKanan +
        '<div style="border-top:2px solid #000;border-bottom:0.8px solid #000;height:0.8px;margin-top:6px;margin-bottom:8px;"></div>'
      ) : '') +
      '</td></tr></thead>';

    html += '<tbody style="border:none;"><tr><td style="border:none;padding:0 1.5cm;vertical-align:top;">' +
      `<div class="judul"><h2>${esc(payload.judul || 'LAPORAN PATROLI WILAYAH PEDESTRIAN')}</h2><h3>${esc(payload.subjudul || 'SATGAS LINMAS PEDESTRIAN')}</h3><h3>KABUPATEN PONOROGO</h3></div>` +
      '<hr class="garis">' + periodeRow +
      '<table class="tb-data"><thead><tr><th style="width:24px">No</th><th style="width:90px">Timestamp</th>' +
      '<th style="width:11%">Lokasi Patroli</th><th style="width:10%">No SPT</th><th style="width:42px">Hari</th><th style="width:76px">Tanggal</th>' +
      '<th style="width:11%">Identitas / Nama Pelanggar</th><th style="width:13%">Personil yang Terlibat</th>' +
      '<th style="width:46px">Danru</th><th style="width:10%">Nama Danru</th><th>Keterangan</th></tr></thead><tbody>' +
      tbody + '</tbody></table>' +
      `<div class="ft"><div class="ft-box"><p>Ponorogo, ${tglCetak}</p><p>Mengetahui,</p>` +
      `<p>${esc(payload.jabatanTtd || 'Kepala Bidang SDA dan LINMAS')}</p><div class="ttd"></div>` +
      `<p class="ft-nama">${esc(payload.namaTtd || 'Erry Setiyoso Birowo, SP')}</p><p>${esc(payload.pangkatTtd || 'Pembina')}</p><p>NIP. ${esc(payload.nipTtd || '19751029 200212 1 008')}</p>` +
      '</div></div></td></tr></tbody>' +
      '<tfoot style="border:none;"><tr><td style="border:none;height:1.5cm;padding:0;"></td></tr></tfoot>' +
      '</table></body></html>';

    return success({ html }, 'HTML kolektif berhasil digenerate.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.6  SATLINMAS
// ================================================================

export async function getSatlinmasData(): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_SATLINMAS);
    if (values.length < 2) return success([], 'Tidak ada data.');
    const data = values.slice(1)
      .filter(r => String(r[CS.NAMA] || '').trim() !== '')
      .map((r, i) => ({
        _ri: i + 2,
        nama: String(r[CS.NAMA] || '').trim(),
        tglLahir: String(r[CS.TGL_LAHIR] || '').trim(),
        usia: hitungUsia(r[CS.TGL_LAHIR]),
        unit: String(r[CS.UNIT] || '').trim(),
        wa: String(r[CS.WA] || '').trim()
      }));
    return success(data);
  } catch (e: any) { return error(e.message); }
}

export async function addSatlinmas(payload: any): Promise<any> {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama wajib diisi.');
    await appendRows(SHEET_SATLINMAS, [[
      payload.nama || '', payload.tglLahir || '', payload.unit || '', payload.wa || ''
    ]]);
    return success(null, 'Anggota berhasil ditambahkan.');
  } catch (e: any) { return error(e.message); }
}

export async function updateSatlinmas(payload: any): Promise<any> {
  try {
    if (!payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);
    await updateRow(SHEET_SATLINMAS, ri, [
      payload.nama || '', payload.tglLahir || '', payload.unit || '', payload.wa || ''
    ]);
    return success(null, 'Data anggota berhasil diperbarui.');
  } catch (e: any) { return error(e.message); }
}

export async function deleteSatlinmas(ri: any): Promise<any> {
  try {
    await deleteRow(SHEET_SATLINMAS, parseInt(ri));
    return success(null, 'Anggota berhasil dihapus.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.7  MAPS — Detail Foto Markers
// ================================================================

export async function getDetailFotoMarkers(): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_INPUT_FOTO);
    if (values.length < 2) return success([]);
    const data: any[] = [];
    values.slice(1).forEach((r, i) => {
      const adaGps = String(r[CDF.ADA_GPS] || '').toUpperCase();
      if (adaGps === 'TIDAK' || adaGps === 'FALSE' || adaGps === 'NO') return;
      const latStr = String(r[CDF.LAT] || '').replace(/,/g, '.').trim();
      const lngStr = String(r[CDF.LNG] || '').replace(/,/g, '.').trim();
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;
      const linkDrive = String(r[CDF.LINK_DRIVE] || '').trim();
      data.push({
        _ri: i + 2,
        tsUpload: String(r[CDF.TS_UPLOAD] || '').trim(),
        tanggalFoto: String(r[CDF.TANGGAL] || '').trim(),
        danru: String(r[CDF.DANRU] || '').trim(),
        namaFile: String(r[CDF.NAMA_FILE] || '').trim(),
        sumber: String(r[CDF.SUMBER] || '').trim(),
        lat, lng,
        linkGmaps: String(r[CDF.LINK_GMAPS] || '').trim(),
        waktuExif: String(r[CDF.WAKTU_EXIF] || '').trim(),
        alamat: String(r[CDF.ALAMAT] || '').trim(),
        ket: String(r[CDF.KET] || '').trim(),
        linkDrive,
        thumbUrl: linkDrive ? driveThumb(linkDrive) : ''
      });
    });
    return success(data);
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.8  LAYER PETA
// ================================================================

export async function getLayerPeta(): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_LAYER_PETA);
    if (values.length < 2) return success([]);
    const data = values.slice(1)
      .filter(r => String(r[CLP.NAMA] || '').trim() !== '')
      .map((r, i) => ({
        _ri: i + 2,
        id: String(r[CLP.ID] || '').trim(),
        nama: String(r[CLP.NAMA] || '').trim(),
        simbol: String(r[CLP.SIMBOL] || '').trim(),
        warna: String(r[CLP.WARNA] || '').trim(),
        lat: parseFloat(String(r[CLP.LAT] || '').replace(/,/g, '.')) || 0,
        lng: parseFloat(String(r[CLP.LNG] || '').replace(/,/g, '.')) || 0,
        ket: String(r[CLP.KET] || '').trim(),
        aktif: String(r[CLP.AKTIF] || '').trim().toUpperCase() === 'TRUE'
      }));
    return success(data);
  } catch (e: any) { return error(e.message); }
}

export async function addLayerPeta(payload: any): Promise<any> {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama layer wajib diisi.');
    const lat = parseFloat(String(payload.lat || '').replace(/,/g, '.'));
    const lng = parseFloat(String(payload.lng || '').replace(/,/g, '.'));
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const newId = 'LP' + String(Date.now()).slice(-6);
    await appendRows(SHEET_LAYER_PETA, [[
      newId, payload.nama || '', payload.simbol || 'area', payload.warna || '#1e6fd9',
      lat, lng, payload.ket || '', 'TRUE'
    ]]);
    return success({ id: newId }, 'Layer berhasil ditambahkan.');
  } catch (e: any) { return error(e.message); }
}

export async function updateLayerPeta(payload: any): Promise<any> {
  try {
    if (!payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);
    const lat = parseFloat(String(payload.lat || '').replace(/,/g, '.'));
    const lng = parseFloat(String(payload.lng || '').replace(/,/g, '.'));
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const aktif = (payload.aktif === false || payload.aktif === 'FALSE') ? 'FALSE' : 'TRUE';
    // Update kolom 2 dst (ID tidak diubah)
    await updateRow(SHEET_LAYER_PETA, ri, [
      payload.nama || '', payload.simbol || 'area', payload.warna || '#1e6fd9',
      lat, lng, payload.ket || '', aktif
    ], 'B');
    return success(null, 'Layer berhasil diperbarui.');
  } catch (e: any) { return error(e.message); }
}

export async function deleteLayerPeta(ri: any): Promise<any> {
  try {
    await deleteRow(SHEET_LAYER_PETA, parseInt(ri));
    return success(null, 'Layer berhasil dihapus.');
  } catch (e: any) { return error(e.message); }
}

export async function toggleLayerAktif(ri: any, aktif: any): Promise<any> {
  try {
    await updateCell(SHEET_LAYER_PETA, parseInt(ri), CLP.AKTIF + 1, aktif ? 'TRUE' : 'FALSE');
    return success(null, 'Status layer diperbarui.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.9  GAMBAR PETA
// ================================================================

export async function saveGambarPeta(drawings: any[]): Promise<any> {
  try {
    if (!drawings || !drawings.length) return error('Tidak ada gambar untuk disimpan.');
    const tsStr = formatTs(new Date());
    const rows = drawings.map((d, i) => [
      'GP' + String(Date.now()).slice(-5) + String(i + 1),
      d.tipe || 'Unknown', d.warna || '#1e6fd9',
      d.nama || '', d.ket || '', d.measurement || '',
      d.geojson || '', tsStr, ''
    ]);
    await clearAndWriteRows(SHEET_GAMBAR_PETA, rows);
    return success({ count: rows.length }, `${rows.length} gambar berhasil disimpan.`);
  } catch (e: any) { return error(e.message); }
}

export async function getGambarPeta(): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_GAMBAR_PETA);
    if (values.length < 2) return success([]);
    const data = values.slice(1)
      .filter(r => String(r[CGP.GEOJSON] || '').trim() !== '')
      .map((r, i) => ({
        _ri: i + 2,
        id: String(r[CGP.ID] || '').trim(),
        type: String(r[CGP.TIPE] || '').trim().toLowerCase() === 'polygon' ? 'polygon' : 'polyline',
        geojson: String(r[CGP.GEOJSON] || '').trim(),
        properti: {
          nama: String(r[CGP.NAMA] || '').trim() || 'Coretan',
          ket: String(r[CGP.KET] || '').trim(),
          warna: String(r[CGP.WARNA] || '').trim() || '#1e6fd9',
          measurement: String(r[CGP.MEASUREMENT] || '').trim()
        },
        ts: String(r[CGP.TS] || '').trim()
      }));
    return success(data);
  } catch (e: any) { return error(e.message); }
}

export async function deleteGambarPeta(ri: any): Promise<any> {
  try {
    await deleteRow(SHEET_GAMBAR_PETA, parseInt(ri));
    return success(null, 'Gambar berhasil dihapus.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  7.4  LOGIC TEKS LAPORAN
// ================================================================

async function saveTeksLaporan(waktuSubmit: string, teksAsli: string): Promise<void> {
  try {
    await appendRows(SHEET_TEKS_LAPORAN, [[waktuSubmit, teksAsli]]);
  } catch (e) { /* non-critical */ }
}

export function buildFinalTeksLaporan(payload: any): string {
  if (payload.teksWAAsli) {
    let res = payload.teksWAAsli;
    res = res.replace(/(Patroli\s*Linmas\s*Pedestrian\s*di\s+)(.+?)(\s+Sebagai)/i, '$1' + (payload.lokasi || '') + '$3');
    res = res.replace(/(Hari\s*:\s*)([^\n]+)/i, '$1' + (payload.hari || ''));
    res = res.replace(/(Tanggal\s*:\s*)([^\n]+)/i, '$1' + (payload.tanggal || ''));
    res = res.replace(/(Identitas\s*[\/\\]\s*Nama\s*Pelanggaran[^\n]*\n)(.+)/i, '$1' + (payload.identitas || NIHIL));
    res = res.replace(/(Personil\s*yang\s*terlibat\s*:\s*\(?)([^)\n]+)(\)?)/i, '$1' + (payload.personil || '') + '$3');
    res = res.replace(/(Pelaksanaan|Keterangan)\s*:\s*([\s\S]+?)(?=\n\s*(Danru|Demikian|$))/i, '$1 : ' + (payload.keterangan || '') + '\n');
    if (payload.danru) res = res.replace(/(Danru\s*\d+)/i, payload.danru);
    if (payload.namaDanru) res = res.replace(/(Danru\s*\d+\s*\(\s*)([^)]+)(\s*\))/i, '$1' + payload.namaDanru + '$3');
    return res;
  }
  return buildTeksAsli(payload);
}

function buildTeksAsli(payload: any): string {
  return [
    'Patroli ' + (payload.lokasi || '') + ' Sebagai',
    'Hari    : ' + (payload.hari || ''),
    'Tanggal : ' + (payload.tanggal || ''),
    'Identitas / Nama Pelanggaran',
    payload.identitas || NIHIL,
    'Personil yang terlibat : ' + (payload.personil || ''),
    'Keterangan: ' + (payload.keterangan || 'Pelaksanaan berjalan aman dan lancar.'),
    (payload.danru || '') + (payload.namaDanru ? ' (' + payload.namaDanru + ')' : '')
  ].join('\n');
}

// ================================================================
//  EXPORTS & MISC
// ================================================================

export async function changePassword(oldPass?: string, newPass?: string, currentUn?: string): Promise<any> {
  try {
    if (!currentUn) return error('Username tidak valid.');
    if (!newPass || newPass.trim().length < 6) return error('Password baru minimal 6 karakter.');
    const values = await getSheetValues(SHEET_USERS);
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').toLowerCase() === currentUn.toLowerCase()) {
        const stored = String(values[i][1] || '');
        const match = await verifyPass(oldPass || '', stored);
        if (!match) return error('Password lama salah.');
        const newHash = await hashPass(newPass);
        await updateCell(SHEET_USERS, i + 1, 2, newHash);
        return success(null, 'Password berhasil diperbarui.');
      }
    }
    return error('User tidak ditemukan.');
  } catch (e: any) { return error(e.message); }
}

export async function createAccount(p: any): Promise<any> {
  try {
    if (!p.username || !p.password) return error('Username dan password wajib diisi.');
    if (String(p.password).length < 6) return error('Password minimal 6 karakter.');
    const values = await getSheetValues(SHEET_USERS);
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').toLowerCase() === (p.username || '').toLowerCase()) return error('Username sudah ada.');
    }
    // Hash password sebelum disimpan
    const hashedPass = await hashPass(String(p.password));
    await appendRows(SHEET_USERS, [[p.username, hashedPass, p.role || 'user', p.namaLengkap || '']]);
    return success(null, 'Akun berhasil dibuat.');
  } catch (e: any) { return error(e.message); }
}

const SHEET_SETTINGS = 'Settings';
export async function getSettings(): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_SETTINGS);
    const obj: Record<string, string> = {};
    values.slice(1).forEach(r => { if (r[0]) obj[r[0]] = r[1] || ''; });
    return success(obj);
  } catch (e) { return success({}); }
}

export async function saveSettings(payload: any): Promise<any> {
  try {
    const values = await getSheetValues(SHEET_SETTINGS);
    const keys = values.map(r => r[0]);
    for (const k in payload) {
      const idx = keys.indexOf(k);
      if (idx > -1) await updateCell(SHEET_SETTINGS, idx + 1, 2, payload[k]);
      else await appendRows(SHEET_SETTINGS, [[k, payload[k]]]);
    }
    return success(null, 'Pengaturan disimpan.');
  } catch (e: any) { return error(e.message); }
}

const SHEET_HEADER_BLUE = { red: 26 / 255, green: 115 / 255, blue: 232 / 255 };
const SHEET_HEADER_TEXT = { red: 1, green: 1, blue: 1 };

function getSheetInitDefinitions() {
  return [
    { name: SHEET_INPUT, head: ['Timestamp', 'No SPT', 'Lokasi Patroli', 'Hari', 'Tanggal', 'Identitas / Nama Pelanggaran', 'Personil yang terlibat', 'Danru', 'Nama Danru', 'Keterangan', 'Folder Drive', 'Jumlah Foto', 'Foto 1', 'Foto 2', 'Foto 3', 'Foto 4', 'Foto 5', 'Foto 6', 'Foto 7', 'Foto 8', 'Foto 9', 'Foto 10', 'Foto 11', 'Foto 12', 'Foto 13', 'Foto 14', 'Foto 15', 'Foto 16', 'Foto 17', 'Foto 18', 'Foto 19', 'Foto 20'], freeze: 1 },
    { name: SHEET_INPUT_FOTO, head: ['Timestamp Upload', 'Tanggal Laporan', 'Danru', 'Nama File', 'Sumber', 'Ada GPS?', 'Lat', 'Lng', 'Link Google Maps', 'Waktu Exif', 'Alamat', 'Keterangan', 'Link Drive'], freeze: 1 },
    { name: SHEET_TEKS_LAPORAN, head: ['Timestamp', 'Teks Laporan Original'], freeze: 1 },
    { name: SHEET_SETTINGS, head: ['Key', 'Value'], freeze: 1 }
  ];
}

function sheetHeadersMatch(expected: string[], currentRow: any[]): boolean {
  if (!currentRow || currentRow.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (String(currentRow[i] || '').trim().toLowerCase() !== String(expected[i]).trim().toLowerCase()) return false;
  }
  return true;
}

/**
 * Baris 1: freeze + background biru + teks putih tebal.
 * Lebar format = jumlah kolom header template saja (tidak menambah kolom kosong).
 */
async function applySheetHeaderStyleAndFreeze(sheetsApi: any, sheetId: number, headColCount: number): Promise<void> {
  const colSpan = Math.max(parseInt(headColCount as any, 10) || 0, 1);
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: colSpan
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: SHEET_HEADER_BLUE,
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
                textFormat: {
                  bold: true,
                  foregroundColor: SHEET_HEADER_TEXT,
                  fontSize: 10
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)'
          }
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        }
      ]
    }
  });
}

/**
 * @param {object} payload - optional { onlySheet: 'Users' } untuk satu sheet saja
 */
export async function initAllSheets(payload?: any): Promise<any> {
  try {
    const only = payload && payload.onlySheet ? String(payload.onlySheet).trim() : '';
    let DEFS = getSheetInitDefinitions();
    if (only) {
      DEFS = DEFS.filter(d => d.name === only);
      if (DEFS.length === 0) {
        const all = getSheetInitDefinitions().map(d => d.name).join(', ');
        return error(`Nama sheet tidak valid. Gunakan: ${all}`);
      }
    }

    const sheets = await getSheets();
    let meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    let existing = meta.data.sheets?.map((s: any) => s.properties?.title) || [];

    const summary: string[] = [];

    for (const def of DEFS) {
      let sheetId: number | null = null;
      if (!existing.includes(def.name)) {
        const add = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: { requests: [{ addSheet: { properties: { title: def.name } } }] }
        });
        sheetId = add.data.replies[0].addSheet.properties.sheetId;
        await appendRows(def.name, [def.head]);
        summary.push(`[NEW] ${def.name} dibuat.`);
        meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        existing = meta.data.sheets?.map((s: any) => s.properties?.title) || [];
      } else {
        const sObj = meta.data.sheets?.find((s: any) => s.properties?.title === def.name);
        sheetId = sObj.properties?.sheetId;
        const currentVals = await getSheetValues(def.name);
        const currentHead = currentVals.length > 0 ? currentVals[0] : [];
        const match = sheetHeadersMatch(def.head, currentHead);

        if (!match) {
          if (currentVals.length === 0) {
            await appendRows(def.name, [def.head]);
            summary.push(`[REPAIR] ${def.name} header ditulis (sheet kosong).`);
          } else {
            await sheets.spreadsheets.values.clear({
              spreadsheetId: SPREADSHEET_ID,
              range: `${def.name}!A1:ZZ1`
            });
            await updateRow(def.name, 1, def.head);
            summary.push(`[REPAIR] ${def.name} header disesuaikan dengan template (baris 1). Data baris 2+ tidak dihapus.`);
          }
        } else {
          summary.push(`[OK] ${def.name} header sudah sesuai.`);
        }
      }

      if (sheetId !== null) {
        await applySheetHeaderStyleAndFreeze(sheets, sheetId, def.head.length);
      }
    }

    return success(summary, 'Proses inisiasi selesai.');
  } catch (e: any) { return error(e.message); }
}

// ================================================================
//  6.5b  REKAP PERIODIK (BULANAN / TRIWULANAN)
// ================================================================

/**
 * Generate HTML rekap laporan periodik (bulanan atau triwulanan)
 * dengan kop surat resmi, tabel rekap lengkap, statistik, dan TTD pejabat.
 *
 * payload:
 *   mode: 'bulanan' | 'triwulanan'
 *   bulan: number (1-12, hanya mode bulanan)
 *   tahun: number
 *   triwulan: 1 | 2 | 3 | 4 (hanya mode triwulanan)
 *   rows: LaporanObj[]        — data laporan yang sudah difilter frontend
 *   judulInstansi, judulDinas, judulJalan — kop surat
 *   kopAktif: boolean
 *   kopLogoKiri, kopLogoKanan — base64 logo
 *   jabatanTtd, namaTtd, pangkatTtd, nipTtd — data pejabat
 *   kota: string              — nama kota untuk TTD (default Ponorogo)
 */
export function generateRekapPeriodeHtml(payload: any): any {
  try {
    const BNAME = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const TW_LABEL = ['', 'I (Januari–Maret)', 'II (April–Juni)', 'III (Juli–September)', 'IV (Oktober–Desember)'];
    const TW_MONTHS: Record<number, number[]> = { 1: [1,2,3], 2: [4,5,6], 3: [7,8,9], 4: [10,11,12] };

    const mode    = payload.mode || 'bulanan';
    const tahun   = parseInt(payload.tahun) || new Date().getFullYear();
    const bulan   = parseInt(payload.bulan) || (new Date().getMonth() + 1);
    const triwulan = parseInt(payload.triwulan) || 1;
    const rows: any[] = payload.rows || [];
    const kota    = payload.kota || 'Ponorogo';

    const now = new Date();
    const tglCetak = `${now.getDate()} ${BNAME[now.getMonth() + 1]} ${now.getFullYear()}`;

    // ── Label periode ──────────────────────────────────────────────────────
    let periodeLabel = '';
    let periodeSubLabel = '';
    if (mode === 'triwulanan') {
      periodeLabel  = `Triwulan ${TW_LABEL[triwulan] || ''} Tahun ${tahun}`;
      const tw = TW_MONTHS[triwulan] || [1,2,3];
      periodeSubLabel = `${BNAME[tw[0]]} – ${BNAME[tw[tw.length-1]]} ${tahun}`;
    } else {
      periodeLabel  = `Bulan ${BNAME[bulan]} Tahun ${tahun}`;
      periodeSubLabel = `${BNAME[bulan]} ${tahun}`;
    }

    // ── Statistik ──────────────────────────────────────────────────────────
    const total = rows.length;
    const pelanggaran = rows.filter((r: any) => r.identitas && r.identitas.toUpperCase() !== 'NIHIL' && r.identitas.trim() !== '').length;
    const nihil = total - pelanggaran;

    // ── Tabel baris laporan ────────────────────────────────────────────────
    let tbody = '';
    rows.forEach((r: any, i: number) => {
      const isp = r.identitas && r.identitas.toUpperCase() !== 'NIHIL' && r.identitas.trim() !== '';

      let firstFoto = '';
      if (Array.isArray(r.fotos) && r.fotos.length > 0 && r.fotos[0]) {
        firstFoto = String(r.fotos[0]).trim();
      } else if (Array.isArray(r.fotosThumb) && r.fotosThumb.length > 0 && r.fotosThumb[0]) {
        firstFoto = String(r.fotosThumb[0]).trim();
      } else if (typeof r.fotos === 'string' && r.fotos.trim()) {
        try {
          const parsed = JSON.parse(r.fotos);
          if (Array.isArray(parsed) && parsed[0]) firstFoto = String(parsed[0]).trim();
          else firstFoto = r.fotos.trim();
        } catch {
          firstFoto = r.fotos.trim();
        }
      }

      const fotoHtml = firstFoto
        ? `<img src="${driveThumb(firstFoto)}" alt="Foto" style="width:46px;height:46px;object-fit:cover;border-radius:2px;display:block;margin:0 auto;border:1px solid #ccc;">`
        : '<span style="color:#aaa;font-size:7pt">—</span>';

      tbody += `<tr class="${i % 2 === 1 ? 'tr-alt' : ''}">` +
        `<td style="text-align:center">${i + 1}</td>` +
        `<td style="text-align:center">${esc(r.hari || '')}</td>` +
        `<td style="text-align:center">${esc(r.tanggal || '')}</td>` +
        `<td style="font-size:7.5pt;text-align:center">${esc(r.noSpt || '—')}</td>` +
        `<td>${esc(r.lokasi || '')}</td>` +
        `<td style="font-size:7.5pt">${esc(r.danru || '')}${r.namaDanru ? '<br><span style="color:#555">(' + esc(r.namaDanru) + ')</span>' : ''}</td>` +
        `<td style="font-size:7.5pt">${esc(r.personil || '')}</td>` +
        `<td style="${isp ? 'color:#c0392b;font-weight:bold' : 'color:#555'}">${isp ? esc(r.identitas).replace(/\n/g, '<br>') : '<em>Nihil</em>'}</td>` +
        `<td class="td-ket">${esc(r.keterangan || '').replace(/\n/g, '<br>')}</td>` +
        `<td style="text-align:center;vertical-align:middle;padding:2px">${fotoHtml}</td>` +
        '</tr>';
    });
    if (!tbody) tbody = '<tr><td colspan="10" style="text-align:center;padding:16px;color:#888;font-style:italic">Tidak ada data laporan untuk periode ini.</td></tr>';

    // ── KOP SURAT ──────────────────────────────────────────────────────────
    const hasKop = payload.kopAktif && (payload.kopInstansi || payload.kopDinas);
    const logoKiri = (payload.kopLogoKiri && String(payload.kopLogoKiri).startsWith('data:'))
      ? `<img src="${payload.kopLogoKiri}" style="position:absolute;left:1.2cm;top:8px;height:2.8cm;max-width:2.2cm;object-fit:contain;">`
      : '';
    const logoKanan = (payload.kopLogoKanan && String(payload.kopLogoKanan).startsWith('data:'))
      ? `<img src="${payload.kopLogoKanan}" style="position:absolute;right:1.2cm;top:8px;height:2.8cm;max-width:2.2cm;object-fit:contain;">`
      : '';

    let kopHtml = '';
    if (hasKop) {
      kopHtml = `<div class="kop" style="position:relative;text-align:center;padding:8px 2.5cm 4px;border-bottom:3px solid #000;">` +
        logoKiri + logoKanan +
        `<div style="font-size:11pt;font-family:'Times New Roman',serif;font-weight:normal;line-height:1.3;margin:0 2.5cm">${esc(payload.kopInstansi || '')}</div>` +
        `<div style="font-size:14pt;font-family:'Times New Roman',serif;font-weight:bold;line-height:1.3;margin:0 2.5cm">${esc(payload.kopDinas || '')}</div>` +
        `<div style="font-size:9pt;font-family:'Times New Roman',serif;line-height:1.3;margin:0 2.5cm">${esc(payload.kopJalan || '')}</div>` +
        `</div>` +
        `<div style="border-bottom:1.5px solid #000;margin-bottom:14px;"></div>`;
    }

    // ── FULL HTML ──────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Rekap Laporan ${periodeLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 9.5pt;
    color: #000;
    background: #fff;
  }
  @page {
    size: A4 landscape;
    margin: 1.2cm 1cm 1.5cm 1cm;
  }
  .page-wrap {
    max-width: 100%;
  }
  h1 {
    font-size: 12.5pt;
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: .02em;
    margin-bottom: 2px;
  }
  h2 {
    font-size: 11pt;
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .sub-title {
    text-align: center;
    font-size: 9pt;
    margin-bottom: 6px;
    color: #222;
  }
  .divider {
    border: none;
    border-top: 1.8px solid #000;
    margin: 4px 0 8px;
  }
  .nomor-surat {
    width: 100%;
    font-size: 8.5pt;
    margin-bottom: 8px;
    line-height: 1.5;
  }
  .nomor-surat td {
    padding: 1px 4px 1px 0;
    vertical-align: top;
  }
  /* ── TABEL UTAMA ─────────────────────────────────────── */
  .tb-rekap {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin-bottom: 12px;
    table-layout: fixed;
  }
  .tb-rekap thead th {
    background: #f2f2f2;
    color: #000;
    padding: 5px 3px;
    border: 1px solid #333;
    font-size: 7.5pt;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    line-height: 1.2;
  }
  .tb-rekap tbody td {
    padding: 3px 4px;
    border: 1px solid #555;
    vertical-align: top;
    line-height: 1.3;
    word-break: break-word;
  }
  .tr-alt td { background: #fafafa; }
  .td-ket {
    font-size: 7pt !important;
    line-height: 1.25 !important;
  }
  /* ── TTD ─────────────────────────────────────────────── */
  .ttd-section {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .ttd-box {
    min-width: 220px;
    text-align: center;
    font-size: 9pt;
    line-height: 1.5;
  }
  .ttd-space { height: 55px; }
  .ttd-nama { font-weight: bold; text-decoration: underline; font-size: 9.5pt; }
  .ttd-nip  { font-size: 8.5pt; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tb-rekap thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .ttd-section { page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page-wrap">

${kopHtml}

<h1>LAPORAN REKAPITULASI PATROLI DAN PENGAMANAN</h1>
<h2>AREA PEDESTRIAN KABUPATEN PONOROGO</h2>
<p class="sub-title">Periode: <strong>${periodeLabel}</strong></p>
<hr class="divider">

<!-- METADATA RESMI -->
<table class="nomor-surat">
  <tr>
    <td style="width:115px">Periode Laporan</td>
    <td style="width:8px">:</td>
    <td><strong>${periodeLabel}</strong> (${periodeSubLabel})</td>
    <td style="width:105px">Tanggal Cetak</td>
    <td style="width:8px">:</td>
    <td>${tglCetak}</td>
  </tr>
  <tr>
    <td>Total Kegiatan</td>
    <td>:</td>
    <td><strong>${total} Laporan</strong> (${pelanggaran} Pelanggaran, ${nihil} Nihil)</td>
    <td>Wilayah Patroli</td>
    <td>:</td>
    <td>Kabupaten Ponorogo</td>
  </tr>
</table>

<!-- TABEL DATA LAPORAN -->
<table class="tb-rekap">
  <thead>
    <tr>
      <th style="width:26px">No</th>
      <th style="width:50px">Hari</th>
      <th style="width:72px">Tanggal</th>
      <th style="width:75px">No SPT</th>
      <th style="width:110px">Lokasi</th>
      <th style="width:85px">Danru</th>
      <th style="width:120px">Personil</th>
      <th style="width:115px">Pelanggaran</th>
      <th style="width:120px">Keterangan</th>
      <th style="width:60px">Foto</th>
    </tr>
  </thead>
  <tbody>
    ${tbody}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="10" style="text-align:right;font-weight:bold;border:1px solid #333;padding:4px 8px;background:#f2f2f2;">
        Total: ${total} Laporan &nbsp;|&nbsp; ${pelanggaran} Pelanggaran &nbsp;|&nbsp; ${nihil} Nihil
      </td>
    </tr>
  </tfoot>
</table>

<!-- TTD -->
<div class="ttd-section">
  <div class="ttd-box">
    <p>${kota}, ${tglCetak}</p>
    <p>${esc(payload.jabatanTtd || 'Kepala Bidang SDA dan Linmas')}</p>
    <div class="ttd-space"></div>
    <p class="ttd-nama">${esc(payload.namaTtd || 'Erry Setiyoso Birowo, SP')}</p>
    <p>${esc(payload.pangkatTtd || 'Pembina')}</p>
    <p class="ttd-nip">NIP. ${esc(payload.nipTtd || '19751029 200212 1 008')}</p>
  </div>
</div>

</div>
</body>
</html>`;

    return success({ html }, 'HTML rekap periode berhasil digenerate.');
  } catch (e: any) {
    return error(e.message);
  }
}

