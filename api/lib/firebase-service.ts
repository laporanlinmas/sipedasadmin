import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { getSheets, getSheetValues, success, error } from './sheets-service';

// ================================================================
//  SETTINGS (disimpan di Firebase, bukan spreadsheet)
// ================================================================

const SETTINGS_DOC_ID = 'sipedas_settings';

export async function getSettings(): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return success({});
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return success(snap.data());
    }
    return success({});
  } catch (e: any) {
    return error(e.message);
  }
}

export async function saveSettings(payload: any): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, payload);
    } else {
      await setDoc(docRef, payload);
    }
    return success(null, 'Pengaturan disimpan.');
  } catch (e: any) {
    return error(e.message);
  }
}

// Redefine sheets names for migration lookup
const SHEET_USERS = 'Users';
const SHEET_SATLINMAS = 'Data Satlinmas';
const SHEET_LAYER_PETA = 'Layer Peta';
const SHEET_GAMBAR_PETA = 'Gambar Peta';
const SHEET_NOWA = 'NoWA'; // From subproject sheet name

// Firebase Configuration matching the dashboard frontend
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase Client App (Runs on Node serverless backend)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Helper to check if string looks like bcrypt hash
function isBcryptHash(str: string): boolean {
  return typeof str === 'string' && (str.startsWith('$2a$') || str.startsWith('$2b$'));
}

// Decode legacy reversed base64 passwords from sheets
function decodePass(encoded: string): string {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    return decoded.split('').reverse().join('');
  } catch (e) {
    return encoded;
  }
}

// Helper to calculate age (satlinmas)
function hitungUsia(tglLahirStr: any): number {
  if (!tglLahirStr) return 0;
  try {
    const parts = String(tglLahirStr).split('-');
    if (parts.length < 3) return 0;
    const tgl = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const selisihMs = Date.now() - tgl.getTime();
    const usiaDate = new Date(selisihMs);
    return Math.abs(usiaDate.getUTCFullYear() - 1970);
  } catch (e) {
    return 0;
  }
}

// ================================================================
//  USERS & AUTH CRUD
// ================================================================

export async function checkLogin(username?: string, password?: string): Promise<any> {
  try {
    if (typeof username !== 'string' || typeof password !== 'string') {
      return error('Username & password wajib diisi.');
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length > 50 || password.length > 128) {
      return error('Username atau password salah.');
    }
    // Cegah path traversal atau invalid firestore doc key
    if (cleanUsername.includes('/') || cleanUsername.includes('..')) {
      return error('Username atau password salah.');
    }

    const userDocRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      if (allUsersSnap.empty && cleanUsername === 'admin') {
        const hashedPassword = bcrypt.hashSync(password, 10);
        await setDoc(userDocRef, {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          namaLengkap: 'Administrator'
        });
        return success({
          username: 'admin',
          role: 'admin',
          namaLengkap: 'Administrator'
        }, 'Inisiasi admin berhasil.');
      }
      return error('Username atau password salah.');
    }

    const userData = userSnap.data();
    const storedHash = userData.password;

    const isMatch = isBcryptHash(storedHash)
      ? bcrypt.compareSync(password, storedHash)
      : decodePass(storedHash) === password || storedHash === password;

    if (isMatch) {
      // Upgrade plain/legacy passwords to bcrypt automatically on successful login
      if (!isBcryptHash(storedHash)) {
        const newHash = bcrypt.hashSync(password, 10);
        await updateDoc(userDocRef, { password: newHash });
      }
      return success({
        username: userData.username,
        role: String(userData.role || 'user').toLowerCase(),
        namaLengkap: userData.namaLengkap || '',
        permissions: userData.permissions || {},
      }, 'Login berhasil.');
    }
    return error('Username atau password salah.');
  } catch (e: any) {
    console.error('[checkLogin] Auth error:', e?.message);
    return error('Terjadi gangguan saat memverifikasi akun.');
  }
}

export async function createAccount(payload: any): Promise<any> {
  try {
    if (!payload.username || !payload.password) return error('Username & password wajib diisi.');
    const userDocRef = doc(db, 'users', payload.username.toLowerCase());
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) return error('Username sudah digunakan.');

    const hashedPassword = bcrypt.hashSync(payload.password, 10);
    await setDoc(userDocRef, {
      username: payload.username,
      password: hashedPassword,
      role: payload.role || 'user',
      namaLengkap: payload.namaLengkap || ''
    });
    return success(null, 'Akun berhasil didaftarkan.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function changePassword(oldPass: string, newPass: string, username: string): Promise<any> {
  try {
    if (!oldPass || !newPass || !username) return error('Field wajib diisi.');
    const userDocRef = doc(db, 'users', username.toLowerCase());
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return error('Pengguna tidak ditemukan.');

    const userData = userSnap.data();
    const storedHash = userData.password;

    const isMatch = isBcryptHash(storedHash)
      ? bcrypt.compareSync(oldPass, storedHash)
      : decodePass(storedHash) === oldPass || storedHash === oldPass;

    if (!isMatch) return error('Password lama salah.');

    const newHashed = bcrypt.hashSync(newPass, 10);
    await updateDoc(userDocRef, { password: newHashed });
    return success(null, 'Password berhasil diubah.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  SATLINMAS CRUD
// ================================================================

export async function getSatlinmasData(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'satlinmas'));
    const data = snap.docs.map(d => {
      const r = d.data();
      return {
        _ri: d.id, // Document ID acts as unique identifier
        nama: String(r.nama || '').trim(),
        tglLahir: String(r.tglLahir || '').trim(),
        usia: hitungUsia(r.tglLahir),
        unit: String(r.unit || '').trim(),
        wa: String(r.wa || '').trim()
      };
    }).sort((a, b) => a.nama.localeCompare(b.nama));
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function addSatlinmas(payload: any): Promise<any> {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama wajib diisi.');
    const newDocRef = doc(collection(db, 'satlinmas'));
    await setDoc(newDocRef, {
      nama: payload.nama || '',
      tglLahir: payload.tglLahir || '',
      unit: payload.unit || '',
      wa: payload.wa || ''
    });
    return success(null, 'Anggota berhasil ditambahkan.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function updateSatlinmas(payload: any): Promise<any> {
  try {
    if (!payload._ri) return error('ID anggota tidak valid.');
    const docRef = doc(db, 'satlinmas', payload._ri);
    await updateDoc(docRef, {
      nama: payload.nama || '',
      tglLahir: payload.tglLahir || '',
      unit: payload.unit || '',
      wa: payload.wa || ''
    });
    return success(null, 'Data anggota berhasil diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function deleteSatlinmas(ri: string): Promise<any> {
  try {
    if (!ri) return error('ID anggota tidak valid.');
    await deleteDoc(doc(db, 'satlinmas', ri));
    return success(null, 'Anggota berhasil dihapus.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  MAP LAYER CRUD
// ================================================================

export async function getLayerPeta(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'layer_peta'));
    const data = snap.docs.map(d => {
      const r = d.data();
      const lat = typeof r.lat === 'number' ? r.lat : parseFloat(String(r.lat || '').replace(/,/g, '.')) || 0;
      const lng = typeof r.lng === 'number' ? r.lng : parseFloat(String(r.lng || '').replace(/,/g, '.')) || 0;
      const desc = String(r.deskripsi || r.ket || '').trim();
      return {
        _ri: d.id,
        id: String(r.id || '').trim(),
        nama: String(r.nama || '').trim(),
        simbol: String(r.simbol || '').trim(),
        warna: String(r.warna || '').trim(),
        lat,
        lng,
        ket: desc,
        deskripsi: desc,
        aktif: r.aktif === true || String(r.aktif).toUpperCase() === 'TRUE'
      };
    });
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function addLayerPeta(payload: any): Promise<any> {
  try {
    if (!payload.nama || !String(payload.nama).trim()) return error('Nama layer wajib diisi.');
    const lat = typeof payload.lat === 'number' ? payload.lat : parseFloat(String(payload.lat || '').replace(/,/g, '.'));
    const lng = typeof payload.lng === 'number' ? payload.lng : parseFloat(String(payload.lng || '').replace(/,/g, '.'));
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const newId = 'LP' + String(Date.now()).slice(-6);
    const newDocRef = doc(collection(db, 'layer_peta'));
    const desc = String(payload.deskripsi || payload.ket || '').trim();
    await setDoc(newDocRef, {
      id: newId,
      nama: payload.nama || '',
      simbol: payload.simbol || 'area',
      warna: payload.warna || '#1e6fd9',
      lat,
      lng,
      ket: desc,
      deskripsi: desc,
      aktif: true
    });
    return success({ id: newId }, 'Layer berhasil ditambahkan.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function updateLayerPeta(payload: any): Promise<any> {
  try {
    if (!payload._ri) return error('ID layer tidak valid.');
    const lat = typeof payload.lat === 'number' ? payload.lat : parseFloat(String(payload.lat || '').replace(/,/g, '.'));
    const lng = typeof payload.lng === 'number' ? payload.lng : parseFloat(String(payload.lng || '').replace(/,/g, '.'));
    if (isNaN(lat) || isNaN(lng)) return error('Latitude dan Longitude harus berupa angka valid.');
    const aktif = (payload.aktif === false || payload.aktif === 'FALSE') ? false : true;
    const docRef = doc(db, 'layer_peta', payload._ri);
    const desc = String(payload.deskripsi || payload.ket || '').trim();
    await updateDoc(docRef, {
      nama: payload.nama || '',
      simbol: payload.simbol || 'area',
      warna: payload.warna || '#1e6fd9',
      lat,
      lng,
      ket: desc,
      deskripsi: desc,
      aktif
    });
    return success(null, 'Layer berhasil diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function deleteLayerPeta(ri: string): Promise<any> {
  try {
    if (!ri) return error('ID layer tidak valid.');
    await deleteDoc(doc(db, 'layer_peta', ri));
    return success(null, 'Layer berhasil dihapus.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function toggleLayerAktif(ri: string, aktif: boolean): Promise<any> {
  try {
    if (!ri) return error('ID layer tidak valid.');
    const docRef = doc(db, 'layer_peta', ri);
    await updateDoc(docRef, { aktif: !!aktif });
    return success(null, 'Status layer diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  MAP DRAWINGS CRUD
// ================================================================

export async function saveGambarPeta(drawings: any[]): Promise<any> {
  try {
    if (!drawings || !drawings.length) return error('Tidak ada gambar untuk disimpan.');
    const tsStr = new Date().toISOString();

    // First delete all existing drawings in Firestore to reflect the new set of shapes
    const snap = await getDocs(collection(db, 'gambar_peta'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    // Insert new drawings
    for (let i = 0; i < drawings.length; i++) {
      const d = drawings[i];
      const newId = 'GP' + String(Date.now()).slice(-5) + String(i + 1);
      const newDocRef = doc(collection(db, 'gambar_peta'));
      await setDoc(newDocRef, {
        id: newId,
        type: d.tipe || d.type || 'polyline',
        warna: d.warna || d.properti?.warna || '#1e6fd9',
        nama: d.nama || d.properti?.nama || '',
        ket: d.ket || d.properti?.ket || '',
        measurement: d.measurement || d.properti?.measurement || '',
        geojson: d.geojson || '',
        ts: tsStr,
        user: ''
      });
    }
    return success({ count: drawings.length }, `${drawings.length} gambar berhasil disimpan.`);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function getGambarPeta(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'gambar_peta'));
    const data = snap.docs.map(d => {
      const r = d.data();
      return {
        _ri: d.id,
        id: String(r.id || '').trim(),
        type: String(r.type || '').trim().toLowerCase() === 'polygon' ? 'polygon' : 'polyline',
        geojson: String(r.geojson || '').trim(),
        properti: {
          nama: String(r.nama || '').trim() || 'Coretan',
          ket: String(r.ket || '').trim(),
          warna: String(r.warna || '').trim() || '#1e6fd9',
          measurement: String(r.measurement || '').trim()
        },
        ts: String(r.ts || '').trim()
      };
    });
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function deleteGambarPeta(ri: string): Promise<any> {
  try {
    if (!ri) return error('ID gambar tidak valid.');
    await deleteDoc(doc(db, 'gambar_peta', ri));
    return success(null, 'Gambar berhasil dihapus.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  WA PIKET (NoWA) CRUD (NEW)
// ================================================================

export async function getNoWaList(): Promise<any> {
  try {
    const snap = await getDocs(collection(db, 'nowa'));
    const data = snap.docs.map(d => {
      const r = d.data();
      return {
        _ri: d.id,
        nama: String(r.nama || '').trim(),
        number: String(r.number || '').trim(),
        jadwal: String(r.jadwal || '').trim(),
        keterangan: String(r.keterangan || '').trim()
      };
    });
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function addNoWa(payload: any): Promise<any> {
  try {
    if (!payload.nama || !payload.number) return error('Nama & nomor WhatsApp wajib diisi.');
    const newDocRef = doc(collection(db, 'nowa'));
    await setDoc(newDocRef, {
      nama: payload.nama || '',
      number: payload.number || '',
      jadwal: payload.jadwal || '',
      keterangan: payload.keterangan || ''
    });
    return success(null, 'Jadwal piket WhatsApp berhasil ditambahkan.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function updateNoWa(payload: any): Promise<any> {
  try {
    if (!payload._ri) return error('ID piket tidak valid.');
    const docRef = doc(db, 'nowa', payload._ri);
    await updateDoc(docRef, {
      nama: payload.nama || '',
      number: payload.number || '',
      jadwal: payload.jadwal || '',
      keterangan: payload.keterangan || ''
    });
    return success(null, 'Jadwal piket WhatsApp berhasil diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

export async function deleteNoWa(ri: string): Promise<any> {
  try {
    if (!ri) return error('ID piket tidak valid.');
    await deleteDoc(doc(db, 'nowa', ri));
    return success(null, 'Jadwal piket WhatsApp berhasil dihapus.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  ONE-SHOT MIGRATION SERVICE
// ================================================================

export async function runMigration(): Promise<any> {
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  if (!SPREADSHEET_ID) return error('SPREADSHEET_ID belum dikonfigurasi di environment variables.');

  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = meta.data.sheets?.map((s: any) => s.properties?.title) || [];
  const sheetsToDelete: string[] = [];
  const log: string[] = [];

  try {
    // 1. Migrate Users
    if (existingSheets.includes(SHEET_USERS)) {
      const vals = await getSheetValues(SHEET_USERS);
      if (vals.length > 1) {
        let count = 0;
        for (let i = 1; i < vals.length; i++) {
          const row = vals[i];
          const username = String(row[0] || '').trim();
          const rawPass = String(row[1] || '').trim();
          const role = String(row[2] || 'user').trim().toLowerCase();
          const namaLengkap = String(row[3] || '').trim();

          if (!username) continue;

          // Hashing password dengan bcrypt
          const plainPass = decodePass(rawPass);
          const finalHash = isBcryptHash(rawPass) ? rawPass : bcrypt.hashSync(plainPass, 10);

          await setDoc(doc(db, 'users', username.toLowerCase()), {
            username,
            password: finalHash,
            role,
            namaLengkap
          });
          count++;
        }
        log.push(`Migrasi ${count} pengguna berhasil.`);
      }
      sheetsToDelete.push(SHEET_USERS);
    }

    // 2. Migrate Data Satlinmas
    if (existingSheets.includes(SHEET_SATLINMAS)) {
      const vals = await getSheetValues(SHEET_SATLINMAS);
      if (vals.length > 1) {
        let count = 0;
        for (let i = 1; i < vals.length; i++) {
          const row = vals[i];
          const nama = String(row[0] || '').trim();
          if (!nama) continue;
          await setDoc(doc(collection(db, 'satlinmas')), {
            nama,
            tglLahir: String(row[1] || '').trim(),
            unit: String(row[2] || '').trim(),
            wa: String(row[3] || '').trim()
          });
          count++;
        }
        log.push(`Migrasi ${count} satlinmas berhasil.`);
      }
      sheetsToDelete.push(SHEET_SATLINMAS);
    }

    // 3. Migrate Layer Peta
    if (existingSheets.includes(SHEET_LAYER_PETA)) {
      const vals = await getSheetValues(SHEET_LAYER_PETA);
      if (vals.length > 1) {
        let count = 0;
        for (let i = 1; i < vals.length; i++) {
          const row = vals[i];
          const id = String(row[0] || '').trim();
          const nama = String(row[1] || '').trim();
          if (!nama) continue;
          await setDoc(doc(collection(db, 'layer_peta')), {
            id: id || 'LP' + String(Date.now()).slice(-6) + String(i),
            nama,
            simbol: String(row[2] || 'area').trim(),
            warna: String(row[3] || '#1e6fd9').trim(),
            lat: parseFloat(String(row[4] || '').replace(/,/g, '.')) || 0,
            lng: parseFloat(String(row[5] || '').replace(/,/g, '.')) || 0,
            ket: String(row[6] || '').trim(),
            aktif: String(row[7] || '').trim().toUpperCase() !== 'FALSE'
          });
          count++;
        }
        log.push(`Migrasi ${count} layer peta berhasil.`);
      }
      sheetsToDelete.push(SHEET_LAYER_PETA);
    }

    // 4. Migrate Gambar Peta
    if (existingSheets.includes(SHEET_GAMBAR_PETA)) {
      const vals = await getSheetValues(SHEET_GAMBAR_PETA);
      if (vals.length > 1) {
        let count = 0;
        for (let i = 1; i < vals.length; i++) {
          const row = vals[i];
          const geojson = String(row[6] || '').trim();
          if (!geojson) continue;
          await setDoc(doc(collection(db, 'gambar_peta')), {
            id: String(row[0] || '').trim() || 'GP' + String(Date.now()).slice(-5) + String(i),
            type: String(row[1] || '').trim().toLowerCase() === 'polygon' ? 'polygon' : 'polyline',
            warna: String(row[2] || '#1e6fd9').trim(),
            nama: String(row[3] || '').trim(),
            ket: String(row[4] || '').trim(),
            measurement: String(row[5] || '').trim(),
            geojson,
            ts: String(row[7] || '').trim(),
            user: String(row[8] || '').trim()
          });
          count++;
        }
        log.push(`Migrasi ${count} gambar coretan peta berhasil.`);
      }
      sheetsToDelete.push(SHEET_GAMBAR_PETA);
    }

    // 5. Migrate NoWA (from subproject if available)
    if (existingSheets.includes(SHEET_NOWA)) {
      const vals = await getSheetValues(SHEET_NOWA);
      if (vals.length > 1) {
        let count = 0;
        for (let i = 1; i < vals.length; i++) {
          const row = vals[i];
          const nama = String(row[0] || '').trim();
          const number = String(row[1] || '').trim();
          if (!nama || !number) continue;
          await setDoc(doc(collection(db, 'nowa')), {
            nama,
            number,
            jadwal: String(row[2] || '').trim(),
            keterangan: String(row[3] || '').trim()
          });
          count++;
        }
        log.push(`Migrasi ${count} petugas piket WhatsApp berhasil.`);
      }
      sheetsToDelete.push(SHEET_NOWA);
    }

    // 6. Delete Migrated Sheets from Spreadsheet
    if (sheetsToDelete.length > 0) {
      const requests = [];
      for (const sName of sheetsToDelete) {
        const sObj = meta.data.sheets?.find((s: any) => s.properties?.title === sName);
        if (sObj?.properties?.sheetId !== undefined) {
          requests.push({
            deleteSheet: {
              sheetId: sObj.properties.sheetId
            }
          });
        }
      }

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: { requests }
        });
        log.push(`Sheet ${sheetsToDelete.join(', ')} telah dihapus dari Google Spreadsheet.`);
      }
    }

    return success({ log }, 'Migrasi database berhasil.');
  } catch (err: any) {
    console.error('[Migration Error]:', err);
    return error(`Gagal migrasi data: ${err.message}`);
  }
}

// ================================================================
//  LAPORAN MOBILE (koleksi Firestore `laporan`) — non-pedestrian
// ================================================================
//
// Laporan berkategori selain pedestrian (poskamling, posyandu,
// kebencanaan, yanmas, lainnya) dikirim aplikasi pelaporan ke
// Firestore, bukan ke Spreadsheet. Fungsi ini membaca koleksi tsb
// dan memetakannya ke bentuk Laporan milik admin, disertai field
// `kategori`, agar bisa ikut tampil & dicetak pada Rekap.
// Mengembalikan [] bila Firebase tak dikonfigurasi / gagal dibaca.

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Parse tanggal ISO (yyyy-MM-dd) → epoch (UTC midnight), atau null. */
function isoDayEpoch(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

export async function getFirebaseLaporan(): Promise<any[]> {
  if (!process.env.FIREBASE_PROJECT_ID) return [];
  try {
    const snap = await Promise.race([
      getDocs(collection(db, 'laporan')),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore getDocs timeout (8s)')), 8000)
      ),
    ]);
    if (snap.empty) return [];

    const rows: any[] = [];
    snap.forEach(d => {
      const x: any = d.data() || {};
      const epoch = isoDayEpoch(String(x.tanggal || ''));
      if (epoch == null) return;

      const dt = new Date(epoch);
      const hari = HARI_ID[dt.getUTCDay()];
      const tanggal = `${dt.getUTCDate()} ${BULAN_ID[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;

      const photos: any[] = Array.isArray(x.photos) ? x.photos : [];
      const urls = photos.map(p => (p && p.url) || '').filter(Boolean);

      const lokasi = String(
        x.alamatLengkap ||
        [x.detailAlamat, x.desaKelurahan, x.kecamatan].filter(Boolean).join(', ') ||
        ''
      ).trim();

      const kategori = String(x.kategori || 'lainnya');
      const namaKegiatan = String(x.kegiatan || '').trim();
      const keterangan = String(x.keterangan || '').trim();

      // Ekstrak koordinat GPS jika ada
      let lat: number | undefined = undefined;
      let lng: number | undefined = undefined;
      let koordinatStr = '';
      if (x.koordinat && typeof x.koordinat.lat === 'number' && typeof x.koordinat.lng === 'number') {
        lat = x.koordinat.lat;
        lng = x.koordinat.lng;
        koordinatStr = `${lat}, ${lng}`;
      } else if (typeof x.lat === 'number' && typeof x.lng === 'number') {
        lat = x.lat;
        lng = x.lng;
        koordinatStr = `${lat}, ${lng}`;
      }

      rows.push({
        _ri: d.id,
        ts: '',
        noSpt: String(x.noSpt || '').trim(),
        lokasi,
        hari,
        tanggal,
        identitas: String(x.identitas || 'NIHIL').trim() || 'NIHIL',
        personil: String(x.personil || '').trim(),
        danru: String(x.danru || '').trim(),
        namaDanru: String(x.namaDanru || '').trim(),
        keterangan: keterangan || namaKegiatan,
        urlFolder: '',
        jmlFoto: String(photos.length),
        fotos: urls,
        fotosThumb: urls,
        kategori,
        namaKegiatan,
        _sumber: 'mobile',
        lat,
        lng,
        koordinat: koordinatStr,
      });
    });
    return rows;
  } catch (e) {
    // Firebase belum siap / rules menolak — abaikan agar rekap tetap jalan.
    return [];
  }
}

// ── Util: parse tanggal tampilan ("15 Januari 2025" / "15/01/2025") → ISO ──
const BULAN_IDX: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
function parseTanggalToISO(s: any): string | null {
  const str = String(s || '').trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let m = /(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/.exec(str);
  if (m) {
    const bln = BULAN_IDX[m[2].toLowerCase()];
    if (bln != null) {
      return `${m[3]}-${String(bln + 1).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
    }
  }
  m = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(str);
  if (m) return `${m[3]}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  return null;
}

/**
 * Perbarui laporan mobile (Firestore `laporan`).
 * payload.fotos sudah berupa URL string (foto baru sudah di-upload pemanggil).
 * foto yang URL-nya masih ada dipertahankan metadata-nya.
 */
export async function updateFirebaseLaporan(ri: string, payload: any): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    const ref = doc(db, 'laporan', ri);
    const snap = await getDoc(ref);
    if (!snap.exists()) return error('Laporan tidak ditemukan.');
    const cur: any = snap.data() || {};

    const update: any = {
      noSpt: String(payload.noSpt || '').trim(),
      identitas: String(payload.identitas || '').trim(),
      personil: String(payload.personil || '').trim(),
      danru: String(payload.danru || '').trim(),
      namaDanru: String(payload.namaDanru || '').trim(),
      keterangan: String(payload.keterangan || '').trim(),
      alamatLengkap: String(payload.lokasi || '').trim(),
    };

    const iso = parseTanggalToISO(payload.tanggal);
    if (iso) update.tanggal = iso;

    const fotoPayload = payload.fotos;
    if (Array.isArray(fotoPayload)) {
      const curPhotos: any[] = Array.isArray(cur.photos) ? cur.photos : [];
      const byUrl = new Map(curPhotos.filter(p => p && p.url).map((p: any) => [p.url, p]));
      const next = fotoPayload
        .map((f: any) => {
          if (typeof f === 'string' && f) return byUrl.get(f) || { url: f };
          if (f && typeof f === 'object' && f.url) return byUrl.get(f.url) || { url: f.url };
          return null;
        })
        .filter(Boolean);
      update.photos = next;
      update.jumlahFoto = String(next.length);
    }

    await updateDoc(ref, update);
    return success({}, 'Laporan berhasil diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

/** Hapus laporan mobile (Firestore `laporan`) — SOFT DELETE ke sampah. */
export async function deleteFirebaseLaporan(ri: string): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    const docRef = doc(db, 'laporan', ri);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return error('Laporan tidak ditemukan.');
    
    const data = snap.data();
    const deletedAt = Date.now();
    
    // Simpan ke sampah
    await setDoc(doc(db, 'sampah', ri), {
      ...data,
      _ri: ri,
      _sumber: 'mobile',
      _deletedAt: deletedAt,
      _originalData: data,
    });
    
    // Hapus dari laporan
    await deleteDoc(docRef);
    
    return success({}, 'Laporan dipindahkan ke sampah.');
  } catch (e: any) {
    return error(e.message);
  }
}

/** Pindahkan laporan spreadsheet ke sampah tanpa menghapus data sumbernya. */
export async function moveSheetLaporanToTrash(ri: string): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  const rowIndex = parseInt(ri, 10);
  if (isNaN(rowIndex) || rowIndex < 2) return error('Row index tidak valid.');

  try {
    const rows = await getSheetValues('INPUT');
    const row = rows[rowIndex - 1];
    if (!row) return error('Data tidak ditemukan.');

    const originalData = {
      ts: String(row[0] || '').trim(),
      noSpt: String(row[1] || '').trim(),
      lokasi: String(row[2] || '').trim(),
      hari: String(row[3] || '').trim(),
      tanggal: String(row[4] || '').trim(),
      identitas: String(row[5] || '').trim(),
      personil: String(row[6] || '').trim(),
      danru: String(row[7] || '').trim(),
      namaDanru: String(row[8] || '').trim(),
      keterangan: String(row[9] || '').trim(),
      fotos: row.slice(12, 32).map((foto: any) => String(foto || '').trim()).filter(Boolean),
      kategori: 'pedestrian',
    };
    const deletedAt = Date.now();
    const trashRef = doc(collection(db, 'sampah'));
    await setDoc(trashRef, {
      ...originalData,
      _ri: rowIndex,
      _trashId: trashRef.id,
      _sumber: 'sheet',
      _deletedAt: deletedAt,
      _originalData: originalData,
    });

    return success({}, 'Laporan dipindahkan ke sampah.');
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  SAMPAH (TRASH) SYSTEM
// ================================================================

/** Ambil semua laporan yang ada di sampah. */
export async function getDeletedLaporan(): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return success([]);
  try {
    const snap = await getDocs(collection(db, 'sampah'));
    const data = snap.docs.map(d => {
      const r = d.data();
      return {
        _ri: r._ri ?? d.id,
        _trashId: d.id,
        timestamp: r.timestamp || r.ts || '',
        tanggal: r.tanggal || '',
        hari: r.hari || '',
        kategori: r.kategori || '',
        lokasi: r.lokasi || r.alamatLengkap || '',
        keterangan: r.keterangan || '',
        personil: r.personil || '',
        identitas: r.identitas || '',
        noSpt: r.noSpt || '',
        fotos: r.fotos || r.photos?.map((p: any) => p.url) || [],
        fotosThumb: r.fotosThumb || r.fotos || r.photos?.map((p: any) => p.url) || [],
        lat: r.lat || r.koordinat?.lat,
        lng: r.lng || r.koordinat?.lng,
        _sumber: r._sumber || 'mobile',
        _deletedAt: r._deletedAt || Date.now(),
        _originalData: r._originalData || r,
      };
    });
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

/** Kembalikan laporan dari sampah ke data utama. */
export async function restoreDeletedLaporan(ri: string, _sumber: string, data: any, trashId?: string): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    if (_sumber === 'mobile') {
      // Restore ke koleksi laporan
      const { _ri, _sumber, _deletedAt, _originalData, ...originalData } = data;
      await setDoc(doc(db, 'laporan', ri), originalData);
    } else if (_sumber !== 'sheet') {
      return error('Sumber laporan tidak dikenali.');
    }
    
    // Hapus penanda sampah; laporan spreadsheet tetap tersimpan di sumbernya.
    const trashDocumentId = trashId || (_sumber === 'sheet' ? `sheet_${ri}` : ri);
    await deleteDoc(doc(db, 'sampah', trashDocumentId));
    
    return success({}, 'Laporan berhasil dikembalikan.');
  } catch (e: any) {
    return error(e.message);
  }
}

/** Hapus permanen laporan dari sampah. */
export async function deletePermanentLaporan(ri: string, _sumber: string, fotos: string[], originalData?: any, trashId?: string): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    // 1. Hapus foto dari Cloudinary jika ada (untuk laporan mobile)
    if (fotos && fotos.length > 0) {
      for (const url of fotos) {
        if (url && (url.includes('cloudinary.com') || url.includes('res.cloudinary'))) {
          try {
            // Import dinamis untuk menghindari circular dependency
            const { deleteCloudinary } = await import('../proxy.js');
            await deleteCloudinary(url);
          } catch (e) {
            console.error('[DeletePermanent] Error hapus foto Cloudinary:', e);
          }
        }
      }
    }

    // Hapus dari spreadsheet hanya setelah item dipilih untuk dihapus permanen.
    if (_sumber !== 'mobile') {
      const { deleteLaporan, deleteLaporanBySnapshot } = await import('./sheets-service.js');
      const riInt = parseInt(ri, 10);
      if ((!originalData || !originalData.ts) && (isNaN(riInt) || riInt < 2)) return error('Row index spreadsheet tidak valid.');
      const result = originalData?.ts
        ? await deleteLaporanBySnapshot(originalData)
        : await deleteLaporan(riInt);
      if (!result.success) return result;
    }

    // 2. Hapus dari Firestore (laporan + sampah)
    try {
      await deleteDoc(doc(db, 'laporan', ri));
    } catch (e) { /* mungkin sudah tidak ada */ }
    
    try {
      const trashDocumentId = trashId || (_sumber === 'sheet' ? `sheet_${ri}` : ri);
      await deleteDoc(doc(db, 'sampah', trashDocumentId));
    } catch (e) { /* mungkin sudah tidak ada */ }

    return success({}, 'Laporan dihapus permanen dari semua sumber data.');
  } catch (e: any) {
    return error(e.message);
  }
}

/** Bersihkan sampah yang lebih dari 7 hari. */
export async function cleanupSampah(olderThan: number): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return success({});
  try {
    const now = Date.now();
    const snap = await getDocs(collection(db, 'sampah'));
    let deletedCount = 0;
    
    for (const d of snap.docs) {
      const r = d.data();
      const deletedAt = r._deletedAt || 0;
      if (now - deletedAt > olderThan) {
        // Hapus permanen dari semua sumber data
        const fotos = r.fotos || (r._originalData && r._originalData.photos 
          ? r._originalData.photos.map((p: any) => p.url || p).filter(Boolean) 
          : []);
        await deletePermanentLaporan(String(r._ri ?? d.id), r._sumber || 'mobile', fotos, r._originalData, d.id);
        deletedCount++;
      }
    }
    
    return success({ deletedCount }, `${deletedCount} item dihapus dari sampah.`);
  } catch (e: any) {
    return error(e.message);
  }
}

/** Hapus semua sampah. */
export async function deleteAllSampah(): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return success({});
  try {
    const snap = await getDocs(collection(db, 'sampah'));
    let deletedCount = 0;
    
    for (const d of snap.docs) {
      const r = d.data();
      // Hapus permanen dari semua sumber data
      const fotos = r.fotos || (r._originalData && r._originalData.photos 
        ? r._originalData.photos.map((p: any) => p.url || p).filter(Boolean) 
        : []);
      await deletePermanentLaporan(String(r._ri ?? d.id), r._sumber || 'mobile', fotos, r._originalData, d.id);
      deletedCount++;
    }
    
    return success({ deletedCount }, `${deletedCount} item dihapus dari sampah.`);
  } catch (e: any) {
    return error(e.message);
  }
}

// ================================================================
//  USER MANAGEMENT (RBAC)
// ================================================================

/** Ambil semua user. */
export async function getAllUsers(): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return success([]);
  try {
    const snap = await getDocs(collection(db, 'users'));
    const data = snap.docs.map(d => {
      const r = d.data();
      return {
        username: r.username,
        role: r.role || 'user',
        namaLengkap: r.namaLengkap || '',
        permissions: r.permissions || {},
        _ri: d.id,
      };
    });
    return success(data);
  } catch (e: any) {
    return error(e.message);
  }
}

/** Update user. */
export async function updateUser(payload: any): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    const { username, role, namaLengkap, permissions } = payload;
    if (!username) return error('Username wajib diisi.');
    
    const docRef = doc(db, 'users', username.toLowerCase());
    const snap = await getDoc(docRef);
    if (!snap.exists()) return error('User tidak ditemukan.');
    
    const update: any = {};
    if (role) update.role = role;
    if (namaLengkap) update.namaLengkap = namaLengkap;
    if (permissions) update.permissions = permissions;
    
    await updateDoc(docRef, update);
    return success({}, 'User berhasil diperbarui.');
  } catch (e: any) {
    return error(e.message);
  }
}

/** Hapus user. */
export async function deleteUser(username: string): Promise<any> {
  if (!process.env.FIREBASE_PROJECT_ID) return error('Firebase belum dikonfigurasi.');
  try {
    if (!username) return error('Username wajib diisi.');
    await deleteDoc(doc(db, 'users', username.toLowerCase()));
    return success({}, 'User berhasil dihapus.');
  } catch (e: any) {
    return error(e.message);
  }
}
