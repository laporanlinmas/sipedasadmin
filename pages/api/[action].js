// pages/api/[action].js
import { google } from 'googleapis';
import crypto from 'crypto';

/**
 * SENAPATI - Sentral Navigasi Pengelolaan Agenda dan Tata Informasi Bupati Ponorogo
 * Vercel Backend API Routes
 */

const CONFIG = {
  SHEETS: {
    USERS:       'Users',
    SURAT_MASUK: 'Surat Masuk',
    SURAT_KELUAR:'Surat Keluar',
    UNDANGAN:    'Undangan',
    AGENDA:      'Agenda',
    DISPOSISI:   'Disposisi',
    ARSIP:       'Arsip'
  }
};

const ARSIP_SALT = 'ARSIP_SALT_2024';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const payload = req.body.payload || {};

  try {
    const auth     = await getAuthClient();
    const sheets   = google.sheets({ version: 'v4', auth });
    const drive    = google.drive({ version: 'v3', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const rootFolderId  = process.env.FOLDER_UTAMA_ID;

    if (!spreadsheetId) throw new Error('SPREADSHEET_ID is missing');

    let result;
    switch (action) {
      case 'login':
        result = await loginUser(sheets, spreadsheetId, payload.username, payload.password); break;
      case 'getDashboard':
        result = await getDashboardData(sheets, spreadsheetId); break;

      // ── ARSIP ──
      case 'saveArsip':
        result = await saveArsip(sheets, drive, spreadsheetId, rootFolderId, payload.data, payload.fileData); break;
      case 'getArsip':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.ARSIP); break;
      case 'deleteArsip':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.ARSIP, payload.id); break;

      // ── SURAT MASUK ──
      case 'saveSuratMasuk':
        result = await saveSurat(sheets, drive, spreadsheetId, rootFolderId, CONFIG.SHEETS.SURAT_MASUK, 'Surat Masuk', payload.data, payload.fileData); break;
      case 'getSuratMasuk':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_MASUK); break;
      case 'deleteSuratMasuk':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_MASUK, payload.id); break;

      // ── SURAT KELUAR ──
      case 'saveSuratKeluar':
        result = await saveSurat(sheets, drive, spreadsheetId, rootFolderId, CONFIG.SHEETS.SURAT_KELUAR, 'Surat Keluar', payload.data, payload.fileData); break;
      case 'getSuratKeluar':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_KELUAR); break;
      case 'deleteSuratKeluar':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.SURAT_KELUAR, payload.id); break;

      // ── UNDANGAN ──
      case 'saveUndangan':
        result = await saveUndangan(sheets, drive, spreadsheetId, rootFolderId, payload.data, payload.fileData); break;
      case 'getUndangan':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.UNDANGAN); break;
      case 'deleteUndangan':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.UNDANGAN, payload.id); break;

      // ── AGENDA ──
      case 'saveAgenda':
        result = await saveAgenda(sheets, spreadsheetId, payload.data); break;
      case 'getAgenda':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.AGENDA); break;
      case 'deleteAgenda':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.AGENDA, payload.id); break;

      // ── DISPOSISI ──
      case 'saveDisposisi':
        result = await saveDisposisi(sheets, spreadsheetId, payload.data); break;
      case 'getDisposisi':
        result = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.DISPOSISI); break;
      case 'deleteDisposisi':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.DISPOSISI, payload.id); break;

      // ── USERS ──
      case 'getUsers':
        result = await getUsers(sheets, spreadsheetId); break;
      case 'addUser':
        result = await addUser(sheets, spreadsheetId, payload.data); break;
      case 'deleteUser':
        result = await deleteRowById(sheets, spreadsheetId, CONFIG.SHEETS.USERS, payload.id); break;
      case 'changePassword':
        result = await changePassword(sheets, spreadsheetId, payload.username, payload.oldPassword, payload.newPassword); break;

      // ── SYSTEM ──
      case 'setupDb':
        result = await setupDb(sheets, spreadsheetId); break;
      case 'updateRow':
        result = await updateRowAndFile(sheets, drive, spreadsheetId, rootFolderId, payload.sheetName, payload.id, payload.data, payload.fileData); break;
      default:
        return res.status(404).json({ success: false, message: `Unknown action: ${action}` });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getAuthClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/drive']
  });
  return auth.getClient();
}

function hashPassword(p) { return crypto.createHash('sha256').update(p + ARSIP_SALT).digest('hex'); }
function generateId()    { return 'ID' + Date.now() + Math.floor(Math.random() * 9999); }

// ─────────────────────────────────────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function getSheetData(sheets, spreadsheetId, sheetName) {
  const res  = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  const rows = res.data.values || [];
  if (rows.length === 0) return { success: true, data: [] };
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] || '');
    return obj;
  });
  return { success: true, data };
}

async function deleteRowById(sheets, spreadsheetId, sheetName, id) {
  const res   = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
  const rows  = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Data tidak ditemukan' };
  const ss      = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet   = ss.data.sheets.find(s => s.properties.title === sheetName);
  const sheetId = sheet.properties.sheetId;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: index, endIndex: index + 1 } } }] } });
  return { success: true, message: 'Data berhasil dihapus' };
}

async function uploadToDrive(drive, rootFolderId, folderName, fileData) {
  if (!fileData || !fileData.content) return { url: '', name: '', id: '' };

  if (process.env.APPS_SCRIPT_URL) {
    try {
      const resp = await fetch(process.env.APPS_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ folderId: rootFolderId, folderName, fileData })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      if (data.url && data.url.includes('/view')) data.url = data.url.replace(/\/view.*$/, '/preview');
      return data;
    } catch (e) { throw new Error('Apps Script Upload Failed: ' + e.message); }
  }

  const listRes = await drive.files.list({ q: `name = '${folderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`, fields: 'files(id)', supportsAllDrives: true, includeItemsFromAllDrives: true });
  let folderId;
  if (listRes.data.files && listRes.data.files.length > 0) {
    folderId = listRes.data.files[0].id;
  } else {
    const createRes = await drive.files.create({ resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [rootFolderId] }, fields: 'id', supportsAllDrives: true });
    folderId = createRes.data.id;
  }
  const buffer  = Buffer.from(fileData.content, 'base64');
  const fileRes = await drive.files.create({ resource: { name: fileData.name, parents: [folderId] }, media: { mimeType: fileData.mimeType, body: require('stream').Readable.from(buffer) }, fields: 'id, name, webViewLink', supportsAllDrives: true });
  await drive.permissions.create({ fileId: fileRes.data.id, resource: { role: 'reader', type: 'anyone' }, supportsAllDrives: true });
  return { url: fileRes.data.webViewLink.replace('?usp=drivesdk', '').replace(/\/view.*$/, '/preview'), name: fileRes.data.name, id: fileRes.data.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LOGIC
// ─────────────────────────────────────────────────────────────────────────────
async function loginUser(sheets, spreadsheetId, username, password) {
  const data   = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (!data.success) return data;
  const hashed = hashPassword(password);
  const user   = data.data.find(u => u.Username === username && u.Password === hashed);
  if (user) return { success: true, message: 'Login berhasil', user: { id: user.ID, username: user.Username, nama: user.Nama, role: user.Role } };
  return { success: false, message: 'Username atau password salah.' };
}

async function getDashboardData(sheets, spreadsheetId) {
  const getCount = async (sheetName) => {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:A` });
      return res.data.values ? Math.max(0, res.data.values.length - 1) : 0;
    } catch(e) { return 0; }
  };

  // Arsip category breakdown
  const arsipRes  = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG.SHEETS.ARSIP}!A:K` });
  const arsipRows = arsipRes.data.values || [];
  const arsipHdr  = arsipRows[0] || [];
  const catIdx    = arsipHdr.indexOf('Kategori');
  const arsipData = arsipRows.slice(1);
  const counts    = { KPT:0, INS:0, PERBUP:0, PERDA:0, SEB:0, NDI:0, MEM:0, MISC:0 };
  arsipData.forEach(row => {
    const cat = row[catIdx] || '';
    if (cat === 'Keputusan Bupati')   counts.KPT++;
    else if (cat === 'Instruksi Bupati') counts.INS++;
    else if (cat === 'Peraturan Bupati') counts.PERBUP++;
    else if (cat === 'Peraturan Daerah') counts.PERDA++;
    else if (cat.includes('Surat Edaran')) counts.SEB++;
    else if (cat === 'Nota Dinas')       counts.NDI++;
    else if (cat.includes('Disposisi') || cat.includes('Memo')) counts.MEM++;
    else counts.MISC++;
  });

  return {
    success: true,
    suratMasuk: await getCount(CONFIG.SHEETS.SURAT_MASUK),
    suratKeluar: await getCount(CONFIG.SHEETS.SURAT_KELUAR),
    undangan:   await getCount(CONFIG.SHEETS.UNDANGAN),
    agenda:     await getCount(CONFIG.SHEETS.AGENDA),
    disposisi:  await getCount(CONFIG.SHEETS.DISPOSISI),
    arsip:      arsipData.length,
    countKpt:   counts.KPT,
    countIns:   counts.INS,
    countPerbup:counts.PERBUP,
    countPerda: counts.PERDA,
    countSeb:   counts.SEB,
    countNdi:   counts.NDI,
    countMem:   counts.MEM,
    countMisc:  counts.MISC
  };
}

async function saveArsip(sheets, drive, spreadsheetId, rootFolderId, data, fileData) {
  const folderName = data.kategori || 'Dokumentasi';
  const file = await uploadToDrive(drive, rootFolderId, folderName, fileData);
  const id   = generateId();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.ARSIP}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.namaFile, data.kategori, folderName, file.url, file.name, file.id, data.deskripsi || '-', fileData.size || '-', new Date().toISOString(), data.tglArsip || new Date().toISOString()]] }
  });
  return { success: true, message: 'Arsip berhasil diunggah', id };
}

async function saveSurat(sheets, drive, spreadsheetId, rootFolderId, sheetName, folderName, data, fileData) {
  const file = await uploadToDrive(drive, rootFolderId, folderName, fileData);
  const id   = generateId();
  let row;
  if (sheetName === CONFIG.SHEETS.SURAT_MASUK) {
    row = [id, data.nomorSurat, data.tanggal, data.pengirim, data.perihal, data.kategori || 'Umum', file.url, file.name, file.id, data.catatan || '-', new Date().toISOString()];
  } else {
    // Surat Keluar
    row = [id, data.nomorSurat, data.tanggal, data.tujuan, data.perihal, data.kategori || 'Umum', file.url, file.name, file.id, data.catatan || '-', new Date().toISOString()];
  }
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${sheetName}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
  return { success: true, message: 'Data berhasil disimpan', id };
}

async function saveUndangan(sheets, drive, spreadsheetId, rootFolderId, data, fileData) {
  const file = await uploadToDrive(drive, rootFolderId, 'Undangan', fileData);
  const id   = generateId();
  // Schema: ID | Nomor Surat | Tanggal Surat | Penyelenggara | Perihal | Penanggung Jawab | Tanggal Pelaksanaan | Waktu | Lokasi | Latitude | Longitude | URL | Nama File | File ID | Catatan | DibuatPada
  const row  = [
    id,
    data.nomorSurat        || '-',
    data.tanggalSurat      || '-',
    data.penyelenggara     || '-',
    data.perihal           || '-',
    data.penanggungJawab   || '-',
    data.tanggalPelaksanaan|| '-',
    data.waktu             || '-',
    data.lokasi            || '-',
    data.latitude          || '',
    data.longitude         || '',
    file.url, file.name, file.id,
    data.catatan           || '-',
    new Date().toISOString()
  ];
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${CONFIG.SHEETS.UNDANGAN}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [row] } });
  return { success: true, message: 'Undangan berhasil disimpan', id };
}

async function saveAgenda(sheets, spreadsheetId, data) {
  const id = generateId();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.AGENDA}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.nomorSuratRef || '-', data.namaKegiatan, data.tanggal || '-', data.lokasi || '-', data.waktu || '-', data.pakaian || '-', data.transit || '-', data.keterangan || '-', data.statusKehadiran || 'Hadir', new Date().toISOString()]] }
  });
  if (data.statusKehadiran === 'Disposisi' && data.disposisiKepada) {
    const dispId = generateId();
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
      resource: { values: [[dispId, id, data.disposisiDari || 'Bupati', data.disposisiKepada, data.instruksi || '-', new Date().toISOString(), 'Menunggu', new Date().toISOString()]] }
    });
  }
  return { success: true, message: 'Agenda berhasil disimpan', id };
}

async function saveDisposisi(sheets, spreadsheetId, data) {
  const id = generateId();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${CONFIG.SHEETS.DISPOSISI}!A1`, valueInputOption: 'USER_ENTERED',
    resource: { values: [[id, data.agendaId || '-', data.dari, data.kepada, data.instruksi, data.tanggal || new Date().toISOString(), data.status || 'Menunggu', new Date().toISOString()]] }
  });
  return { success: true, message: 'Disposisi berhasil disimpan', id };
}

async function updateRowAndFile(sheets, drive, spreadsheetId, rootFolderId, sheetName, id, data, fileData) {
  const res   = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:Z` });
  const rows  = res.data.values || [];
  const index = rows.findIndex(r => String(r[0]) === String(id));
  if (index === -1) return { success: false, message: 'Data tidak ditemukan' };

  const oldRow = rows[index];
  const headers = rows[0] || [];
  const fileIdIdx  = headers.indexOf('File ID');
  const fileUrlIdx = headers.indexOf('URL');

  let fileObj = null;
  if (fileData && fileData.content) {
    if (fileIdIdx !== -1 && oldRow[fileIdIdx] && oldRow[fileIdIdx] !== '-' && !process.env.APPS_SCRIPT_URL) {
      try { await drive.files.delete({ fileId: oldRow[fileIdIdx] }); } catch(e) {}
    }
    fileObj = await uploadToDrive(drive, rootFolderId, data.kategori || sheetName, fileData);
  }

  let newRow = [...oldRow];
  if (fileObj && fileObj.url) {
    if (fileUrlIdx !== -1) newRow[fileUrlIdx] = fileObj.url;
    if (fileIdIdx  !== -1) newRow[fileIdIdx]  = fileObj.id;
  }

  // Update fields by sheet type
  if (sheetName === CONFIG.SHEETS.ARSIP) {
    newRow[1] = data.namaFile  || oldRow[1];
    newRow[2] = data.kategori  || oldRow[2];
    newRow[7] = data.deskripsi || oldRow[7];
    const tglIdx = headers.indexOf('Tanggal Arsip');
    if (tglIdx !== -1) newRow[tglIdx] = data.tglArsip || oldRow[tglIdx];
  } else if (sheetName === CONFIG.SHEETS.SURAT_MASUK) {
    newRow[1] = data.nomorSurat || oldRow[1]; newRow[2] = data.tanggal   || oldRow[2];
    newRow[3] = data.pengirim   || oldRow[3]; newRow[4] = data.perihal   || oldRow[4];
    newRow[5] = data.kategori   || oldRow[5]; newRow[9] = data.catatan   || oldRow[9];
  } else if (sheetName === CONFIG.SHEETS.SURAT_KELUAR) {
    newRow[1] = data.nomorSurat || oldRow[1]; newRow[2] = data.tanggal   || oldRow[2];
    newRow[3] = data.tujuan     || oldRow[3]; newRow[4] = data.perihal   || oldRow[4];
    newRow[5] = data.kategori   || oldRow[5]; newRow[9] = data.catatan   || oldRow[9];
  } else if (sheetName === CONFIG.SHEETS.UNDANGAN) {
    newRow[1]  = data.nomorSurat         || oldRow[1];
    newRow[2]  = data.tanggalSurat       || oldRow[2];
    newRow[3]  = data.penyelenggara      || oldRow[3];
    newRow[4]  = data.perihal            || oldRow[4];
    newRow[5]  = data.penanggungJawab    || oldRow[5];
    newRow[6]  = data.tanggalPelaksanaan || oldRow[6];
    newRow[7]  = data.waktu              || oldRow[7];
    newRow[8]  = data.lokasi             || oldRow[8];
    newRow[9]  = data.latitude           || oldRow[9];
    newRow[10] = data.longitude          || oldRow[10];
    newRow[14] = data.catatan            || oldRow[14];
  } else if (sheetName === CONFIG.SHEETS.AGENDA) {
    newRow[1] = data.nomorSuratRef  || oldRow[1]; newRow[2] = data.namaKegiatan || oldRow[2];
    newRow[3] = data.tanggal        || oldRow[3]; newRow[4] = data.lokasi       || oldRow[4];
    newRow[5] = data.waktu          || oldRow[5]; newRow[6] = data.pakaian      || oldRow[6];
    newRow[7] = data.transit        || oldRow[7]; newRow[8] = data.keterangan   || oldRow[8];
    newRow[9] = data.statusKehadiran|| oldRow[9];
  } else if (sheetName === CONFIG.SHEETS.DISPOSISI) {
    newRow[1] = data.agendaId  || oldRow[1]; newRow[2] = data.dari      || oldRow[2];
    newRow[3] = data.kepada    || oldRow[3]; newRow[4] = data.instruksi || oldRow[4];
    newRow[5] = data.tanggal   || oldRow[5]; newRow[6] = data.status    || oldRow[6];
  }

  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${sheetName}!A${index + 1}`, valueInputOption: 'USER_ENTERED', resource: { values: [newRow] } });
  return { success: true, message: 'Data berhasil diperbarui', id };
}

async function getUsers(sheets, spreadsheetId) {
  const res = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (!res.success) return res;
  return { success: true, data: res.data.map(u => ({ id: u.ID, username: u.Username, nama: u.Nama, role: u.Role, created: u.CreatedAt })) };
}

async function addUser(sheets, spreadsheetId, data) {
  const existing = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  if (existing.data.some(u => u.Username === data.username)) return { success: false, message: 'Username sudah digunakan.' };
  const id = generateId();
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [[id, data.username, hashPassword(data.password), data.nama, data.role || 'ADMIN', new Date().toISOString()]] } });
  return { success: true, message: 'Pengguna berhasil ditambahkan.' };
}

async function changePassword(sheets, spreadsheetId, username, oldPassword, newPassword) {
  const res   = await getSheetData(sheets, spreadsheetId, CONFIG.SHEETS.USERS);
  const index = res.data.findIndex(u => u.Username === username && u.Password === hashPassword(oldPassword));
  if (index === -1) return { success: false, message: 'Password lama salah.' };
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!C${index + 2}`, valueInputOption: 'USER_ENTERED', resource: { values: [[hashPassword(newPassword)]] } });
  return { success: true, message: 'Password berhasil diubah.' };
}

async function setupDb(sheets, spreadsheetId) {
  const SCHEMA = [
    {
      name: CONFIG.SHEETS.USERS,
      headers: ['ID', 'Username', 'Password', 'Nama', 'Role', 'CreatedAt'],
      defaultAdmin: ['ID-ADMIN123', 'admin', hashPassword('admin123'), 'Administrator Utama', 'ADMIN', new Date().toISOString()]
    },
    { name: CONFIG.SHEETS.SURAT_MASUK,  headers: ['ID', 'Nomor Surat', 'Tanggal', 'Pengirim', 'Perihal', 'Kategori', 'URL', 'Nama File', 'File ID', 'Catatan', 'DibuatPada'] },
    { name: CONFIG.SHEETS.SURAT_KELUAR, headers: ['ID', 'Nomor Surat', 'Tanggal', 'Tujuan', 'Perihal', 'Kategori', 'URL', 'Nama File', 'File ID', 'Catatan', 'DibuatPada'] },
    { name: CONFIG.SHEETS.UNDANGAN,     headers: ['ID', 'Nomor Surat', 'Tanggal Surat', 'Penyelenggara', 'Perihal', 'Penanggung Jawab', 'Tanggal Pelaksanaan', 'Waktu', 'Lokasi', 'Latitude', 'Longitude', 'URL', 'Nama File', 'File ID', 'Catatan', 'DibuatPada'] },
    { name: CONFIG.SHEETS.AGENDA,       headers: ['ID', 'Nomor Surat Ref', 'Nama Kegiatan', 'Tanggal', 'Lokasi', 'Waktu', 'Pakaian', 'Transit', 'Keterangan', 'Status Kehadiran', 'DibuatPada'] },
    { name: CONFIG.SHEETS.DISPOSISI,    headers: ['ID', 'Referensi Agenda ID', 'Dari', 'Kepada', 'Isi Disposisi', 'Tanggal', 'Status', 'DibuatPada'] },
    { name: CONFIG.SHEETS.ARSIP,        headers: ['ID', 'Nama File', 'Kategori', 'Folder', 'URL', 'Nama Drive File', 'File ID', 'Deskripsi', 'Ukuran', 'DibuatPada', 'Tanggal Arsip'] }
  ];

  function buildHeaderFormat(sheetId, numCols) {
    return [
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols }, cell: { userEnteredFormat: { backgroundColor: { red: 0.1, green: 0.435, blue: 0.749 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10 }, horizontalAlignment: 'CENTER', wrapStrategy: 'CLIP' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)' } },
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } }
    ];
  }

  const ssInfo      = await sheets.spreadsheets.get({ spreadsheetId });
  const existingMetas = ssInfo.data.sheets;
  const results     = { created: [], migrated: [], unchanged: [] };
  const fmtRequests = [];

  for (const schema of SCHEMA) {
    const existing = existingMetas.find(s => s.properties.title === schema.name);
    if (!existing) {
      const addRes  = await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ addSheet: { properties: { title: schema.name } } }] } });
      const newShId = addRes.data.replies[0].addSheet.properties.sheetId;
      await sheets.spreadsheets.values.update({ spreadsheetId, range: `${schema.name}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [schema.headers] } });
      if (schema.defaultAdmin) {
        await sheets.spreadsheets.values.append({ spreadsheetId, range: `${CONFIG.SHEETS.USERS}!A2`, valueInputOption: 'USER_ENTERED', resource: { values: [schema.defaultAdmin] } });
      }
      fmtRequests.push(...buildHeaderFormat(newShId, schema.headers.length));
      results.created.push(schema.name);
    } else {
      const sheetId = existing.properties.sheetId;
      const readRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${schema.name}!A:Z` });
      const eRows   = readRes.data.values || [];
      const eHdrs   = eRows[0] || [];
      const dataRows= eRows.slice(1);
      const match   = eHdrs.length === schema.headers.length && schema.headers.every((h, i) => h === eHdrs[i]);
      if (!match) {
        const migratedRows = dataRows.map(row => schema.headers.map(col => { const idx = eHdrs.indexOf(col); return idx !== -1 ? (row[idx] || '') : ''; }));
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${schema.name}!A:Z` });
        await sheets.spreadsheets.values.update({ spreadsheetId, range: `${schema.name}!A1`, valueInputOption: 'USER_ENTERED', resource: { values: [schema.headers, ...migratedRows] } });
        results.migrated.push(schema.name);
      } else {
        results.unchanged.push(schema.name);
      }
      fmtRequests.push(...buildHeaderFormat(sheetId, schema.headers.length));
    }
  }

  if (fmtRequests.length > 0) await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: fmtRequests } });

  const parts = [];
  if (results.created.length)   parts.push(`✅ Dibuat: ${results.created.join(', ')}`);
  if (results.migrated.length)  parts.push(`🔄 Dimigrasi: ${results.migrated.join(', ')}`);
  if (results.unchanged.length) parts.push(`✔️ Sesuai: ${results.unchanged.join(', ')}`);
  return { success: true, message: parts.join(' | ') || 'Database sudah siap.' };
}
