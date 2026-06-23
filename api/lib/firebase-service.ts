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
    if (!username || !password) return error('Username & password wajib diisi.');
    const userDocRef = doc(db, 'users', username.toLowerCase());
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      if (allUsersSnap.empty && username.toLowerCase() === 'admin') {
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
        namaLengkap: userData.namaLengkap || ''
      }, 'Login berhasil.');
    }
    return error('Username atau password salah.');
  } catch (e: any) {
    return error(e.message);
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
