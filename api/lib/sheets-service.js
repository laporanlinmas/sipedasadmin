const { google } = require('googleapis');
const { uploadFoto, deleteFile, deleteFolder } = require('./drive-service');
const { getGoogleAuth } = require('./google-auth');

// ================================================================
//  CONSTANTS  (sama dengan GAS Code.gs)
// ================================================================
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const TZ = 'Asia/Jakarta';
const MAX_FOTO = 10;
const NIHIL = 'NIHIL';

const SHEET_USERS = 'Users';
const SHEET_INPUT = 'INPUT';
const SHEET_SATLINMAS = 'Data Satlinmas';
const SHEET_INPUT_FOTO = 'Detail Foto';
const SHEET_LAYER_PETA = 'Layer Peta';
const SHEET_GAMBAR_PETA = 'Gambar Peta';
const SHEET_TEKS_LAPORAN = 'Teks Laporan';

// Column index constants (0-based, sama dengan GAS)
const C = { TS: 0, LOK: 1, HARI: 2, TGL: 3, IDN: 4, PER: 5, DAN: 6, NDAN: 7, KET: 8, URL: 9, JML: 10, F0: 11 };
const CS = { NAMA: 0, TGL_LAHIR: 1, UNIT: 2, WA: 3 };
const CDF = { TS_UPLOAD: 0, TANGGAL: 1, DANRU: 2, NAMA_FILE: 3, SUMBER: 4, ADA_GPS: 5, LAT: 6, LNG: 7, LINK_GMAPS: 8, WAKTU_EXIF: 9, ALAMAT: 10, KET: 11, LINK_DRIVE: 12 };
const CLP = { ID: 0, NAMA: 1, SIMBOL: 2, WARNA: 3, LAT: 4, LNG: 5, KET: 6, AKTIF: 7 };
const CGP = { ID: 0, TIPE: 1, WARNA: 2, NAMA: 3, KET: 4, MEASUREMENT: 5, GEOJSON: 6, TS: 7, USER: 8 };

// ================================================================
//  HELPERS
// ================================================================

async function getSheets() {
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Ambil semua nilai dari sebuah sheet
 */
async function getSheetValues(sheetName) {
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
async function appendRows(sheetName, rows) {
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
async function updateRow(sheetName, rowNum, values, colStart = 'A') {
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

function colLetterToNumber(letter) {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
  }
  return n;
}

/**
 * Update satu sel saja
 */
async function updateCell(sheetName, rowNum, colNum, value) {
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
async function deleteRow(sheetName, rowNum) {
  const sheets = await getSheets();
  // Dapatkan sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' tidak ditemukan.`);
  const sheetId = sheet.properties.sheetId;

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
async function clearAndWriteRows(sheetName, rows) {
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
function columnToLetter(col) {
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
function formatDateID(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

/**
 * Helper: format datetime lengkap
 */
function formatDateTimeID(d) {
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
function formatTsSheets(d) {
  if (!d) d = new Date();
  const opts = { timeZone: TZ };
  const parts = new Intl.DateTimeFormat('en-US', {
    ...opts,
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || '';
  return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Helper: format tanggal panjang (dd/MM/yyyy HH:mm:ss)
 */
function formatTs(d) {
  if (!d) d = new Date();
  const opts = { timeZone: TZ };
  const parts = new Intl.DateTimeFormat('id-ID', {
    ...opts,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/** 
 * Helper: parse tanggal Indonesia (misal "Senin, 1 Januari 2024" atau "1 Januari 2024" atau "dd/MM/yyyy")
 */
function parseTgl(s) {
  if (!s) return null;
  const BLN = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
  const b = String(s).replace(/^[A-Za-z]+,?\s*/, '').trim().toLowerCase();
  const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(b);
  if (m && BLN[m[2]]) {
    const d = new Date(Date.UTC(+m[3], BLN[m[2]] - 1, +m[1]));
    if (!isNaN(d)) return d;
  }
  const m2 = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(String(s));
  if (m2) {
    const d2 = new Date(Date.UTC(+m2[3], +m2[2] - 1, +m2[1]));
    if (!isNaN(d2)) return d2;
  }
  return null;
}

/**
 * Helper: parse tanggal ISO (yyyy-MM-dd)
 */
function parseTglISO(s) {
  if (!s) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

/**
 * Helper: escape HTML
 */
function esc(v) {
  if (!v) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Helper: Drive thumbnail URL dari link Drive
 */
function driveThumb(url) {
  if (!url) return url;
  const m = /\/file\/d\/([^\/\?]+)/.exec(url);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  const m2 = /[?&]id=([^&]+)/.exec(url);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}=w800`;
  return url;
}

/**
 * Helper: Hitung usia dari tanggal lahir
 */
function hitungUsia(tglLahir) {
  if (!tglLahir) return '';
  let d = null;
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

/**
 * Konversi baris array INPUT ke object laporan
 */
function row2obj(row, ri) {
  const fotos = [];
  for (let f = 0; f < MAX_FOTO; f++) {
    const l = String(row[C.F0 + f] || '').trim();
    if (l) fotos.push(l);
  }
  return {
    _ri: ri,
    ts: String(row[C.TS] || '').trim(),
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
async function getAllInput() {
  const values = await getSheetValues(SHEET_INPUT);
  if (values.length < 2) return [];
  return values.slice(1)
    .map((row, i) => row2obj(row, i + 2))
    .filter(r => r.lokasi !== '' || r.ts !== '');
}

// ================================================================
//  RESPONSE HELPERS
// ================================================================
function success(data, message) {
  return { success: true, message: message || 'OK', data: data !== undefined ? data : null };
}
function error(message) {
  return { success: false, message: message || 'Terjadi kesalahan.', data: null };
}



// ================================================================
//  6.2  DASHBOARD & REKAP
// ================================================================

async function getDashboardData() {
  try {
    const rows = await getAllInput();
    const now = new Date();
    // Today string dalam format dd/MM/yyyy Asia/Jakarta
    const todayStr = now.toLocaleDateString('id-ID', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });

    let tot = 0, totP = 0, hr = 0, hrP = 0;
    const lokMap = {};
    const hariMap = { Senin: 0, Selasa: 0, Rabu: 0, Kamis: 0, Jumat: 0, Sabtu: 0, Minggu: 0 };

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
  } catch (e) { return error(e.message); }
}

async function getRekapData(f = {}) {
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
  } catch (e) { return error(e.message); }
}

// ================================================================
//  6.3  UPLOAD FOTO (metadata saja - drive diurus drive-service)
// ================================================================

/**
 * Simpan detail foto ke sheet Detail Foto
 * Dipanggil dari drive-service setelah upload berhasil
 */
async function appendDetailFoto(opts) {
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

async function addLaporan(payload) {
  try {
    const req = ['lokasi', 'hari', 'tanggal', 'personil'];
    for (const field of req) {
      if (!payload[field] || !String(payload[field]).trim()) return error(`Field '${field}' wajib diisi.`);
    }

    const now = new Date();
    const tsStr = formatTs(now);
    const tsStrS = formatTsSheets(now);

    const linkFotos = payload.linkFoto || [];
    const urls = linkFotos.map(f => typeof f === 'string' ? f : (f.link || '')).filter(Boolean);
    let folderUrl = '';
    if (linkFotos.length) {
      const firstMeta = typeof linkFotos[0] === 'object' ? linkFotos[0] : {};
      folderUrl = firstMeta.folderUrl || '';
    }

    // Simpan teks laporan
    const teksAsliAkhir = buildFinalTeksLaporan(payload);
    await saveTeksLaporan(tsStrS, teksAsliAkhir);

    const rowData = [
      tsStr, payload.lokasi, payload.hari, payload.tanggal,
      payload.identitas || NIHIL, payload.personil, payload.danru || '',
      payload.namaDanru || '', payload.keterangan || '',
      folderUrl, urls.length
    ];
    for (let k = 0; k < MAX_FOTO; k++) rowData.push(urls[k] || '');

    await appendRows(SHEET_INPUT, [rowData]);
    return success(null, 'Laporan berhasil ditambahkan.');
  } catch (e) { return error(e.message); }
}

async function updateLaporan(payload) {
  try {
    if (!payload || !payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);

    // Frontend sends payload.fotos — array of URL strings (existing) or {data, mime} (new)
    // We only handle existing URLs here (new photos are uploaded separately in addLaporan flow)
    // For edit, accept URL strings + upload new photos if any
    const fotoPayload = payload.fotos || payload.linkFoto || [];
    let folderUrl = payload.folderUrl || '';

    // Get existing row to compare existing photos
    let tsInput = '';
    const existingPhotos = [];
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

    const keptUrls = [];
    const urls = [];

    // Handle new photos: upload and record in Detail Foto
    for (const f of fotoPayload) {
      if (typeof f === 'string' && f.trim()) {
        keptUrls.push(f.trim());
        urls.push(f.trim());
      } else if (f && typeof f === 'object') {
        if (f.url && typeof f.url === 'string' && f.url.trim()) {
          // Existing photo kept
          keptUrls.push(f.url.trim());
          urls.push(f.url.trim());
        } else if (f.data && f.mime) {
          // New photo — upload to Drive and record in Detail Foto
          try {
            const { uploadFoto } = require('./drive-service');
            const uploadPayload = {
              foto: {
                data: f.data,
                mime: f.mime,
                customFileName: f.customFileName,
                source: 'dashboard'
              },
              laporan: buildFinalTeksLaporan(payload),
              noFoto: urls.length + 1,
              jumlahTotal: fotoPayload.length,
              meta: { hasGps: false }
            };

            const upResult = await uploadFoto(uploadPayload);
            if (upResult && upResult.data && upResult.data.linkFile) {
              urls.push(upResult.data.linkFile);
              if (!folderUrl && upResult.data.folderUrl) folderUrl = upResult.data.folderUrl;
            }
          } catch (upErr) { console.error('[Edit] Error upload foto:', upErr.message); }
        } else if (f.link) {
          keptUrls.push(f.link);
          urls.push(f.link);
        }
      }
    }

    // Determine deleted photos
    const deletedPhotos = existingPhotos.filter(ef => !keptUrls.includes(ef));

    // Delete removed photos from Drive and 'Detail Foto' Sheet
    if (deletedPhotos.length > 0) {
      const { deleteFile } = require('./drive-service');
      for (const dUrl of deletedPhotos) {
        try {
          // 1. Delete from Drive
          const fid = extractFileId(dUrl);
          if (fid) await deleteFile(fid);

          // 2. Delete from Detail Foto sheet — by URL match
          const detailVals = await getSheetValues(SHEET_INPUT_FOTO);
          for (let i = detailVals.length - 1; i >= 1; i--) {
            if (String(detailVals[i][CDF.LINK_DRIVE] || '').trim() === dUrl.trim()) {
              await deleteRow(SHEET_INPUT_FOTO, i + 1);
              break;
            }
          }
        } catch (delErr) { console.error('[Edit] Error delete removed foto:', delErr.message); }
      }
    }

    // Update text fields in INPUT sheet
    const updateValues = [
      payload.lokasi || '', payload.hari || '', payload.tanggal || '',
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
  } catch (e) { return error(e.message); }
}

async function deleteLaporan(ri) {
  try {
    const riInt = parseInt(ri);
    const sheets = await getSheets();

    // 1. Ambil data baris tersebut sebelum dihapus
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_INPUT}!A${riInt}:ZZ${riInt}`
    });
    const row = res.data.values ? res.data.values[0] : null;
    if (!row) return error('Data tidak ditemukan.');

    const tsInput = String(row[C.TS] || '').trim();
    const folderUrl = String(row[C.URL] || '').trim();
    const fotos = [];
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
      } catch (delErr) { console.error('[Delete] Error hapus foto:', delErr.message); }
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
  } catch (e) {
    console.error('[API Error] deleteLaporan failed:', e.message);
    return error(e.message);
  }
}

/**
 * Helper: Hapus semua baris yang memiliki nilai tertentu di kolom tertentu
 */
async function deleteRowsByTimestamp(sheetName, colIdx, tsValue) {
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

function extractFileId(url) {
  if (!url) return null;
  const m = /\/file\/d\/([^\/\?]+)/.exec(url);
  if (m) return m[1];
  const m2 = /[?&]id=([^&]+)/.exec(url);
  if (m2) return m2[1];
  return null;
}

function extractFolderId(url) {
  if (!url) return null;
  const m = /\/folders\/([^\/\?]+)/.exec(url);
  if (m) return m[1];
  return null;
}

function parseTsFormat1(s) {
  // dd/MM/yyyy HH:mm:ss
  const m = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (m) return new Date(m[3], m[2] - 1, m[1], m[4], m[5], m[6]);
  return null;
}

// ================================================================
//  6.5  HTML GENERATOR
// ================================================================

function generateLaporanHtml(payload) {
  try {
    const fotos = payload.fotos || [];
    let fotoHtml = '';
    if (fotos.length) {
      fotoHtml = '<table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed">';
      for (let i = 0; i < fotos.length; i += 2) {
        fotoHtml += '<tr style="page-break-inside:avoid;break-inside:avoid;">';
        for (let j = i; j < Math.min(i + 2, fotos.length); j++) {
          fotoHtml += '<td style="padding:4px;border:1px solid #000;text-align:center;width:50%;vertical-align:top;page-break-inside:avoid;break-inside:avoid;">' +
            `<img src="${driveThumb(fotos[j])}" style="width:100%;max-height:240px;object-fit:contain;display:block;margin:0 auto 2px auto;">` +
            `<div style="font-size:8pt;color:#000;font-weight:800;line-height:1;margin-top:2px;text-transform:uppercase;">FOTO ${j + 1}</div></td>`;
        }
        if (fotos.length % 2 !== 0 && i + 1 >= fotos.length) {
          fotoHtml += '<td style="border:1px solid #000;background:#fdfdfd;"></td>';
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
      '@page{size:A4;margin:0}' +
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
        '<div style="border-top:3px solid #000;border-bottom:1.5px solid #000;height:1.5px;margin-top:10px;margin-bottom:12px;"></div>' +
        '</td></tr></thead>';
    } else {
      headerHtml = '<thead style="border:none;"><tr><td style="border:none;height:2.5cm;"></td></tr></thead>';
    }

    html += headerHtml +
      '<tbody style="border:none;"><tr><td style="border:none;padding:0 2.5cm 0 2cm;vertical-align:top;">' +
      `<h1>${judulUtama}</h1>` +
      '<table class="main-data">' +
      `<tr><td class="lbl">Hari / Tanggal</td><td class="sep">:</td><td class="val">${esc(payload.hari || '')}, ${esc(payload.tanggal || '')}</td></tr>` +
      `<tr><td class="lbl">Tujuan</td><td class="sep">:</td><td class="val">${esc(payload.tujuan || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian')}</td></tr>` +
      `<tr><td class="lbl">Nomor SPT</td><td class="sep">:</td><td class="val">${esc(payload.nomorSpt || '')}</td></tr>` +
      `<tr><td class="lbl">Lokasi</td><td class="sep">:</td><td class="val">${esc(payload.lokasi || '')}</td></tr>` +
      `<tr><td class="lbl">Anggota</td><td class="sep">:</td><td class="val">${esc(payload.anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP')}</td></tr>` +
      `<tr><td class="lbl">Pukul</td><td class="sep">:</td><td class="val">${esc(payload.pukul || '16.00 \u2013 00.00 WIB')}</td></tr>`;

    if (adaPelanggar) {
      html += `<tr><td class="lbl" style="color:#c0392b">Identitas Pelanggar</td><td class="sep" style="color:#c0392b">:</td>` +
        `<td class="val" style="color:#c0392b;font-weight:bold;">${esc(identitas).replace(/\n/g, '<br>')}</td></tr>`;
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
      '<tfoot style="border:none;"><tr><td style="border:none;height:2cm;"></td></tr></tfoot>' +
      '</table></body></html>';

    return success({ html }, 'HTML laporan berhasil digenerate.');
  } catch (e) { return error(e.message); }
}

function generateKolektifHtml(payload) {
  try {
    const rows = payload.rows || [];
    const tglFrom = payload.tglFrom || '';
    const tglTo = payload.tglTo || '';
    const now = new Date();
    const BNAME = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tglCetak = now.getDate() + ' ' + BNAME[now.getMonth() + 1] + ' ' + now.getFullYear();

    let tbody = '';
    rows.forEach((r, i) => {
      const isp = r.identitas && r.identitas.toUpperCase() !== NIHIL && r.identitas !== '';
      const ketVal = r.keterangan || r.teks || '';
      tbody += '<tr>' +
        `<td style='text-align:center'>${i + 1}</td>` +
        `<td>${esc(r.ts)}</td><td>${esc(r.lokasi)}</td>` +
        `<td style='text-align:center'>${esc(r.hari)}</td><td>${esc(r.tanggal)}</td>` +
        `<td style='${isp ? 'color:#c0392b;font-weight:bold' : ''}'>${esc(r.identitas || NIHIL)}</td>` +
        `<td>${esc(r.personil)}</td>` +
        `<td style='text-align:center'>${esc(r.danru)}</td><td>${esc(r.namaDanru)}</td>` +
        `<td>${esc(ketVal)}</td></tr>`;
    });

    if (!tbody) tbody = '<tr><td colspan="10" style="text-align:center;padding:16px;color:#888">Tidak ada data.</td></tr>';

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
      '.tb-data thead th{background:#fff;color:#000;padding:6px 5px;font-size:7.5pt;font-weight:bold;border:1px solid #000;white-space:nowrap}' +
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
      '<table class="tb-data"><thead><tr><th style="width:26px">No</th><th style="width:105px">Timestamp</th>' +
      '<th style="width:15%">Lokasi Patroli</th><th style="width:48px">Hari</th><th style="width:86px">Tanggal</th>' +
      '<th style="width:12%">Identitas / Pelanggaran</th><th>Personil yang Terlibat</th>' +
      '<th style="width:54px">Danru</th><th style="width:12%">Nama Danru</th><th style="width:15%">Keterangan</th></tr></thead><tbody>' +
      tbody + '</tbody></table>' +
      `<div class="ft"><div class="ft-box"><p>Ponorogo, ${tglCetak}</p><p>Mengetahui,</p>` +
      `<p>${esc(payload.jabatanTtd || 'Kepala Bidang SDA dan LINMAS')}</p><div class="ttd"></div>` +
      `<p class="ft-nama">${esc(payload.namaTtd || 'Erry Setiyoso Birowo, SP')}</p><p>${esc(payload.pangkatTtd || 'Pembina')}</p><p>NIP. ${esc(payload.nipTtd || '19751029 200212 1 008')}</p>` +
      '</div></div></td></tr></tbody>' +
      '<tfoot style="border:none;"><tr><td style="border:none;height:1.5cm;padding:0;"></td></tr></tfoot>' +
      '</table></body></html>';

    return success({ html }, 'HTML kolektif berhasil digenerate.');
  } catch (e) { return error(e.message); }
}

// ================================================================
//  6.6  SATLINMAS
// ================================================================

async function getSatlinmasData() {
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
  } catch (e) { return error(e.message); }
}

async function addSatlinmas(payload) {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama wajib diisi.');
    await appendRows(SHEET_SATLINMAS, [[
      payload.nama || '', payload.tglLahir || '', payload.unit || '', payload.wa || ''
    ]]);
    return success(null, 'Anggota berhasil ditambahkan.');
  } catch (e) { return error(e.message); }
}

async function updateSatlinmas(payload) {
  try {
    if (!payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);
    await updateRow(SHEET_SATLINMAS, ri, [
      payload.nama || '', payload.tglLahir || '', payload.unit || '', payload.wa || ''
    ]);
    return success(null, 'Data anggota berhasil diperbarui.');
  } catch (e) { return error(e.message); }
}

async function deleteSatlinmas(ri) {
  try {
    await deleteRow(SHEET_SATLINMAS, parseInt(ri));
    return success(null, 'Anggota berhasil dihapus.');
  } catch (e) { return error(e.message); }
}

// ================================================================
//  6.7  MAPS — Detail Foto Markers
// ================================================================

async function getDetailFotoMarkers() {
  try {
    const values = await getSheetValues(SHEET_INPUT_FOTO);
    if (values.length < 2) return success([]);
    const data = [];
    values.slice(1).forEach((r, i) => {
      const adaGps = String(r[CDF.ADA_GPS] || '').toUpperCase();
      if (adaGps === 'TIDAK' || adaGps === 'FALSE' || adaGps === 'NO') return;
      const lat = parseFloat(String(r[CDF.LAT] || ''));
      const lng = parseFloat(String(r[CDF.LNG] || ''));
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
  } catch (e) { return error(e.message); }
}

// ================================================================
//  6.8  LAYER PETA
// ================================================================

async function getLayerPeta() {
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
        lat: parseFloat(String(r[CLP.LAT] || '')) || 0,
        lng: parseFloat(String(r[CLP.LNG] || '')) || 0,
        ket: String(r[CLP.KET] || '').trim(),
        aktif: String(r[CLP.AKTIF] || '').trim().toUpperCase() === 'TRUE'
      }));
    return success(data);
  } catch (e) { return error(e.message); }
}

async function addLayerPeta(payload) {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama layer wajib diisi.');
    const lat = parseFloat(payload.lat);
    const lng = parseFloat(payload.lng);
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const newId = 'LP' + String(Date.now()).slice(-6);
    await appendRows(SHEET_LAYER_PETA, [[
      newId, payload.nama || '', payload.simbol || 'area', payload.warna || '#1e6fd9',
      lat, lng, payload.ket || '', 'TRUE'
    ]]);
    return success({ id: newId }, 'Layer berhasil ditambahkan.');
  } catch (e) { return error(e.message); }
}

async function updateLayerPeta(payload) {
  try {
    if (!payload._ri) return error('Row index tidak valid.');
    const ri = parseInt(payload._ri);
    const lat = parseFloat(payload.lat);
    const lng = parseFloat(payload.lng);
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const aktif = (payload.aktif === false || payload.aktif === 'FALSE') ? 'FALSE' : 'TRUE';
    // Update kolom 2 dst (ID tidak diubah)
    await updateRow(SHEET_LAYER_PETA, ri, [
      payload.nama || '', payload.simbol || 'area', payload.warna || '#1e6fd9',
      lat, lng, payload.ket || '', aktif
    ], 'B');
    return success(null, 'Layer berhasil diperbarui.');
  } catch (e) { return error(e.message); }
}

async function deleteLayerPeta(ri) {
  try {
    await deleteRow(SHEET_LAYER_PETA, parseInt(ri));
    return success(null, 'Layer berhasil dihapus.');
  } catch (e) { return error(e.message); }
}

async function toggleLayerAktif(ri, aktif) {
  try {
    await updateCell(SHEET_LAYER_PETA, parseInt(ri), CLP.AKTIF + 1, aktif ? 'TRUE' : 'FALSE');
    return success(null, 'Status layer diperbarui.');
  } catch (e) { return error(e.message); }
}

// ================================================================
//  6.9  GAMBAR PETA
// ================================================================

async function saveGambarPeta(drawings) {
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
  } catch (e) { return error(e.message); }
}

async function getGambarPeta() {
  try {
    const values = await getSheetValues(SHEET_GAMBAR_PETA);
    if (values.length < 2) return success([]);
    const data = values.slice(1)
      .filter(r => String(r[CGP.GEOJSON] || '').trim() !== '')
      .map((r, i) => ({
        _ri: i + 2,
        id: String(r[CGP.ID] || '').trim(),
        tipe: String(r[CGP.TIPE] || '').trim(),
        warna: String(r[CGP.WARNA] || '').trim() || '#1e6fd9',
        nama: String(r[CGP.NAMA] || '').trim(),
        ket: String(r[CGP.KET] || '').trim(),
        measurement: String(r[CGP.MEASUREMENT] || '').trim(),
        geojson: String(r[CGP.GEOJSON] || '').trim(),
        ts: String(r[CGP.TS] || '').trim()
      }));
    return success(data);
  } catch (e) { return error(e.message); }
}

async function deleteGambarPeta(ri) {
  try {
    await deleteRow(SHEET_GAMBAR_PETA, parseInt(ri));
    return success(null, 'Gambar berhasil dihapus.');
  } catch (e) { return error(e.message); }
}

// ================================================================
//  7.4  LOGIC TEKS LAPORAN
// ================================================================

async function saveTeksLaporan(waktuSubmit, teksAsli) {
  try {
    await appendRows(SHEET_TEKS_LAPORAN, [[waktuSubmit, teksAsli]]);
  } catch (e) { /* non-critical */ }
}

function buildFinalTeksLaporan(payload) {
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

function buildTeksAsli(payload) {
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
//  EXPORTS
// ================================================================

async function changePassword(oldPass, newPass, currentUn) {
  try {
    const values = await getSheetValues(SHEET_USERS);
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').toLowerCase() === currentUn.toLowerCase()) {
        const stored = String(values[i][1] || '');
        const storedDecoded = decodePass(stored);
        // Accept both plain and encoded
        if (storedDecoded !== oldPass && stored !== oldPass) return error('Password lama salah.');
        await updateCell(SHEET_USERS, i + 1, 2, encodePass(newPass));
        return success(null, 'Password berhasil diperbarui.');
      }
    }
    return error('User tidak ditemukan.');
  } catch (e) { return error(e.message); }
}

async function createAccount(p) {
  try {
    const values = await getSheetValues(SHEET_USERS);
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').toLowerCase() === (p.username || '').toLowerCase()) return error('Username sudah ada.');
    }
    // Store password as encoded
    await appendRows(SHEET_USERS, [[p.username, encodePass(p.password), p.role || 'user', p.namaLengkap || '']]);
    return success(null, 'Akun berhasil dibuat.');
  } catch (e) { return error(e.message); }
}

const SHEET_SETTINGS = 'Settings';
async function getSettings() {
  try {
    const values = await getSheetValues(SHEET_SETTINGS);
    const obj = {};
    values.slice(1).forEach(r => { if (r[0]) obj[r[0]] = r[1] || ''; });
    return success(obj);
  } catch (e) { return success({}); }
}

async function saveSettings(payload) {
  try {
    const values = await getSheetValues(SHEET_SETTINGS);
    const keys = values.map(r => r[0]);
    for (const k in payload) {
      const idx = keys.indexOf(k);
      if (idx > -1) await updateCell(SHEET_SETTINGS, idx + 1, 2, payload[k]);
      else await appendRows(SHEET_SETTINGS, [[k, payload[k]]]);
    }
    return success(null, 'Pengaturan disimpan.');
  } catch (e) { return error(e.message); }
}

const SHEET_HEADER_BLUE = { red: 26 / 255, green: 115 / 255, blue: 232 / 255 };
const SHEET_HEADER_TEXT = { red: 1, green: 1, blue: 1 };

function getSheetInitDefinitions() {
  return [
    { name: SHEET_USERS, head: ['Username', 'Password', 'Role', 'Nama Lengkap'], freeze: 1 },
    { name: SHEET_INPUT, head: ['Timestamp', 'Lokasi Patroli', 'Hari', 'Tanggal', 'Identitas / Nama Pelanggaran', 'Personil yang terlibat', 'Danru', 'Nama Danru', 'Keterangan', 'Folder Drive', 'Jumlah Foto', 'Foto 1', 'Foto 2', 'Foto 3', 'Foto 4', 'Foto 5', 'Foto 6', 'Foto 7', 'Foto 8', 'Foto 9', 'Foto 10'], freeze: 1 },
    { name: SHEET_SATLINMAS, head: ['Nama', 'Tanggal Lahir', 'Unit', 'WhatsApp'], freeze: 1 },
    { name: SHEET_INPUT_FOTO, head: ['Timestamp Upload', 'Tanggal Laporan', 'Danru', 'Nama File', 'Sumber', 'Ada GPS?', 'Lat', 'Lng', 'Link Google Maps', 'Waktu Exif', 'Alamat', 'Keterangan', 'Link Drive'], freeze: 1 },
    { name: SHEET_LAYER_PETA, head: ['ID', 'Nama Layer', 'Simbol', 'Warna', 'Lat', 'Lng', 'Keterangan', 'Aktif'], freeze: 1 },
    { name: SHEET_GAMBAR_PETA, head: ['ID', 'Tipe', 'Warna', 'Nama', 'Keterangan', 'Measurement', 'GeoJSON', 'Timestamp', 'User'], freeze: 1 },
    { name: SHEET_TEKS_LAPORAN, head: ['Timestamp', 'Teks Laporan Original'], freeze: 1 },
    { name: SHEET_SETTINGS, head: ['Key', 'Value'], freeze: 1 }
  ];
}

function sheetHeadersMatch(expected, currentRow) {
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
async function applySheetHeaderStyleAndFreeze(sheetsApi, sheetId, headColCount) {
  const colSpan = Math.max(parseInt(headColCount, 10) || 0, 1);
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
async function initAllSheets(payload) {
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
    let existing = meta.data.sheets.map(s => s.properties.title);

    const summary = [];

    for (const def of DEFS) {
      let sheetId = null;
      if (!existing.includes(def.name)) {
        const add = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: { requests: [{ addSheet: { properties: { title: def.name } } }] }
        });
        sheetId = add.data.replies[0].addSheet.properties.sheetId;
        await appendRows(def.name, [def.head]);
        summary.push(`[NEW] ${def.name} dibuat.`);
        meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        existing = meta.data.sheets.map(s => s.properties.title);
      } else {
        const sObj = meta.data.sheets.find(s => s.properties.title === def.name);
        sheetId = sObj.properties.sheetId;
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
  } catch (e) { return error(e.message); }
}

module.exports = {
  getDashboardData,
  getRekapData,
  addLaporan,
  updateLaporan,
  deleteLaporan,
  generateLaporanHtml,
  generateKolektifHtml,
  getSatlinmasData,
  addSatlinmas,
  updateSatlinmas,
  deleteSatlinmas,
  getDetailFotoMarkers,
  getLayerPeta,
  addLayerPeta,
  updateLayerPeta,
  deleteLayerPeta,
  toggleLayerAktif,
  saveGambarPeta,
  getGambarPeta,
  deleteGambarPeta,
  getSettings,
  saveSettings,
  initAllSheets,
  appendDetailFoto,
  success,
  error
};
