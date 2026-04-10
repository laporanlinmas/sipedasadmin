const { google } = require('googleapis');
const { getGoogleAuth } = require('./google-auth');

const FOLDER_UTAMA_ID = process.env.FOLDER_UTAMA_ID;
const TZ = 'Asia/Jakarta';

// ================================================================
//  HELPERS
// ================================================================

async function getDrive() {
  const auth = await getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Dapatkan atau buat sub-folder di dalam parentFolderId
 * Returns folder ID (string)
 */
async function getOrCreateFolder(parentFolderId, folderName) {
  const drive = await getDrive();
  const escaped = folderName.replace(/'/g, "\\'");
  const q = `'${parentFolderId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive', supportsAllDrives: true, includeItemsFromAllDrives: true });
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Buat baru
  const folder = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    },
    fields: 'id',
    supportsAllDrives: true
  });
  const folderId = folder.data.id;

  // Beri akses publik (anyone with link = viewer) - sama dgn GAS
  await drive.permissions.create({
    fileId: folderId,
    resource: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true
  });

  return folderId;
}

/**
 * Ekstensi mime type (sama dgn fungsi _mimeToExt di GAS)
 */
function mimeToExt(mime) {
  const m = {
    'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
    'image/gif': '.gif', 'image/webp': '.webp', 'image/heic': '.heic',
    'image/heif': '.heif', 'image/bmp': '.bmp'
  };
  return m[(mime || '').toLowerCase()] || '.jpg';
}

/**
 * Format tanggal panjang (d MMMM yyyy) untuk nama folder/file
 * Misal: "1 Januari 2024"
 */
function formatTanggalPanjang(d) {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const dJkt = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  return `${dJkt.getDate()} ${months[dJkt.getMonth()]} ${dJkt.getFullYear()}`;
}

/**
 * Format bulan tahun (MMMM yyyy) untuk nama folder bulan
 * Misal: "Januari 2024"
 */
function formatBulanTahun(d) {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const dJkt = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  return `${months[dJkt.getMonth()]} ${dJkt.getFullYear()}`;
}

/**
 * Parse tanggal Indonesia untuk menentukan folder tujuan
 */
function parseTanggalIndonesia(str) {
  if (!str) return null;
  const BULAN = { januari:1, februari:2, maret:3, april:4, mei:5, juni:6, juli:7, agustus:8, september:9, oktober:10, november:11, desember:12 };
  const bersih = str.replace(/^[A-Za-z]+,?\s*/i, '').trim().toLowerCase();
  const m = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(bersih);
  if (m) {
    const bln = BULAN[m[2]];
    if (bln) {
      const d = new Date(Date.UTC(parseInt(m[3], 10), bln - 1, parseInt(m[1], 10)));
      if (!isNaN(d.getTime())) return d;
    }
  }
  const m2 = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(str);
  if (m2) {
    const d2 = new Date(Date.UTC(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10)));
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

/**
 * Parse teks laporan (sama dgn _parseLaporan di GAS)
 */
function parseLaporan(teks) {
  function ambil(pattern, str) {
    const r = new RegExp(pattern, 'is').exec(str);
    return r && r[1] ? r[1].trim() : '';
  }
  let danru = ambil('(Danru\\s*\\d+)', teks);
  if (!danru) { const dm = /Danru\s*\d+/i.exec(teks); danru = dm ? dm[0].trim() : ''; }
  let namaDanru = ambil('Danru\\s*\\d+\\s*\\(\\s*(.*?)\\s*\\)', teks);
  if (!namaDanru) { namaDanru = ambil('Danru\\s+(?:\\d+\\s*)?([A-Za-z\\s\\.]+)', teks); }
  return {
    lokasi    : ambil('Patroli\\s*Linmas\\s*Pedestrian\\s*di\\s+(.*?)\\s+Sebagai', teks),
    hari      : ambil('Hari\\s*:\\s*(.*?)\\s+Tanggal', teks),
    tanggal   : ambil('Tanggal\\s*:\\s*(.*?)\\s+Identitas', teks),
    identitas : ambil('Identitas\\s*\\/\\s*Nama\\s*Pelanggaran\\s*(.*?)\\s+Personil', teks),
    personil  : ambil('Personil\\s*yang\\s*terlibat\\s*:\\s*\\((.*?)\\)\\s*(?:Pelaksanaan|Keterangan)', teks),
    danru,
    namaDanru,
    keterangan: ambil('(?:Pelaksanaan|Keterangan)\\s*:\\s*(.*?)\\s*(?=Demikian)', teks)
  };
}

function bersihkanTeks(teks) {
  return teks.replace(/[\*\_\~]/g, '').trim();
}

function buatKeteranganFoto(source, meta) {
  if (source === 'camera' && meta && meta.hasGps) return 'Foto kamera dengan GPS. Koordinat terverifikasi.';
  else if (source === 'camera') return 'Foto kamera tanpa data GPS EXIF.';
  else return 'Foto dari galeri. Lokasi dari input manual.';
}

function formatTsSheets(d) {
  if (!d) d = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || '';
  return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// ================================================================
//  UPLOAD FOTO  (sama dgn fungsi uploadFoto di GAS)
// ================================================================

async function uploadFoto(data) {
  if (!data || !data.foto) throw new Error('Data foto tidak ada.');

  const foto     = data.foto;
  const meta     = data.meta || null;
  const noFoto   = data.noFoto || 1;
  const total    = data.jumlahTotal || 1;
  const teksAsli = (data.laporan || '').trim();
  const parsed   = teksAsli ? parseLaporan(bersihkanTeks(teksAsli)) : {};

  const waktuNow = new Date();
  const tanggalDate = parseTanggalIndonesia(parsed.tanggal);

  let labelBulan, labelTanggal;
  if (tanggalDate) {
    labelBulan   = formatBulanTahun(tanggalDate);
    labelTanggal = formatTanggalPanjang(tanggalDate);
  } else {
    labelBulan   = formatBulanTahun(waktuNow);
    labelTanggal = formatTanggalPanjang(waktuNow);
  }

  // Nama file (sama dgn GAS)
  const noSuffix  = total === 1 ? '' : '_' + noFoto;
  let namaFile = '';
  if (foto.customFileName) {
    namaFile = `${foto.customFileName}${noSuffix}${mimeToExt(foto.mime)}`.replace(/[\/?<>\\:*|"]/g, '');
  } else {
    const prefix    = (foto.source === 'camera') ? '[KAMERA]' : '[GALERI]';
    const danruSlug = parsed.namaDanru
      ? '_' + parsed.namaDanru.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
      : '';
    namaFile  = `${prefix}_${labelTanggal}${danruSlug}${noSuffix}${mimeToExt(foto.mime)}`;
  }

  const b64 = foto.data.indexOf(',') !== -1 ? foto.data.split(',')[1] : foto.data;
  if (!b64 || b64.length < 10) throw new Error('Data base64 kosong untuk file: ' + namaFile);

  let linkFile = '';
  let folderUrl = '';

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  if (APPS_SCRIPT_URL) {
    // --- GAS BRIDGE ---
    const bridgePayload = {
      action: 'upload',
      fileData: { content: b64, mimeType: foto.mime || 'image/jpeg', name: namaFile },
      folderId: FOLDER_UTAMA_ID,
      folderBulan: labelBulan,
      folderName: labelTanggal
    };
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(bridgePayload),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const textRes = await response.text();
    let result;
    try { result = JSON.parse(textRes); } catch(e) { throw new Error("GAS Bridge return non-JSON: " + textRes); }
    
    if (!result.success) throw new Error("GAS Bridge Error: " + (result.message || result.error));
    
    linkFile = result.linkFile || result.url;
    folderUrl = result.folderUrl;

  } else {
    // --- DIRECT NATIVE API ---
    // Buat/dapatkan folder hierarki: FOLDER_UTAMA → Bulan → Tanggal
    const folderBulanId   = await getOrCreateFolder(FOLDER_UTAMA_ID, labelBulan);
    const folderTanggalId = await getOrCreateFolder(folderBulanId, labelTanggal);

    const drive = await getDrive();
    const buffer = Buffer.from(b64, 'base64');
    const { Readable } = require('stream');
    const file = await drive.files.create({
      resource: { name: namaFile, parents: [folderTanggalId] },
      media: { mimeType: foto.mime || 'image/jpeg', body: Readable.from(buffer) },
      fields: 'id, webViewLink', supportsAllDrives: true
    });

    // Beri akses publik
    await drive.permissions.create({
      fileId: file.data.id, resource: { role: 'reader', type: 'anyone' }, supportsAllDrives: true
    });

    linkFile = `https://drive.google.com/file/d/${file.data.id}/view?usp=sharing`;
    folderUrl = `https://drive.google.com/drive/folders/${folderTanggalId}`;
  }

  const tsStrS = formatTsSheets(waktuNow);

  // Simpan ke sheet Detail Foto (lazy require untuk hindari circular dependency warning)
  const { appendDetailFoto } = require('./sheets-service');
  await appendDetailFoto({
    tsStr    : tsStrS,
    tanggal  : parsed.tanggal || '-',
    danru    : parsed.namaDanru || '-',
    namaFile,
    sumber   : foto.source === 'camera' ? 'KAMERA' : 'GALERI',
    meta,
    linkDrive: linkFile,
    ket      : buatKeteranganFoto(foto.source, meta)
  });

  return {
    success : true,
    message : `Foto ${noFoto} berhasil diupload.`,
    data    : {
      linkFile,
      namaFile,
      folderUrl,
      noFoto
    }
  };
}

/**
 * Hapus file dari Drive
 */
async function deleteFile(fileId) {
  if (!fileId) return;
  try {
    const drive = await getDrive();
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (e) {
    console.error(`[Drive Error] Gagal hapus file ${fileId}:`, e.message);
  }
}

/**
 * Hapus folder dari Drive
 */
async function deleteFolder(folderId) {
  if (!folderId) return;
  try {
    const drive = await getDrive();
    await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
  } catch (e) {
    console.error(`[Drive Error] Gagal hapus folder ${folderId}:`, e.message);
  }
}

module.exports = { uploadFoto, deleteFile, deleteFolder };
